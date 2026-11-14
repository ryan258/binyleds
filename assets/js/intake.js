(() => {
  'use strict';
  const form = document.querySelector('[data-cloudflare-intake]');
  if (!form) return;
  const status = form.querySelector('[data-intake-status]');
  const submit = form.querySelector('[type=submit]');
  const separate = form.querySelector('[data-new-request]');
  const retryVerification = form.querySelector('[data-retry-verification]');
  const idField = form.elements.namedItem('submission-id');
  const fields = form.querySelector('[data-intake-fields]');
  const errors = form.querySelector('[data-intake-errors]');
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const storageKey = 'storyscape-intake-request-v1';
  let state; let widget; let busy = false; let verified = false; let storageWorks = true; let completed = false;
  let verificationTimer; let currentScript; let loadEpoch = 0; let requestEpoch = 0;
  const message = text => { status.textContent = text; };
  try { state = JSON.parse(sessionStorage.getItem(storageKey)); } catch { storageWorks = false; }
  if (!state || !uuid.test(state.id || '') || (state.hash !== null && !/^[0-9a-f]{64}$/.test(state.hash || ''))) {
    state = { id: crypto.randomUUID(), hash: null };
  }
  const persist = () => {
    idField.value = state.id;
    try { sessionStorage.setItem(storageKey, JSON.stringify(state)); } catch { storageWorks = false; }
  };
  persist();
  if (state.hash) {
    message('An earlier send attempt is remembered. Your entries are not stored in this browser. Restore the same details to retry, or contact us before starting another request.');
    separate.hidden = false;
  }
  const draftFields = ['name', 'email', 'phone', 'city', 'preferred-date', 'guest-count', 'experience-level', 'occasion', 'desired-feeling', 'vision', 'boundaries'];
  form.querySelector('[data-download-draft]')?.addEventListener('click', () => {
    const values = Object.fromEntries(draftFields.map(key => [key, form.elements.namedItem(key).value]));
    const draft = { format: 'storyscape-draft-v1', state, consentVersion: form.elements.namedItem('consent-version').value, values };
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'consultation-draft.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    message('Draft download requested. It contains your private notes. Keep it somewhere private; restore it here after a reload.');
  });
  form.querySelector('[data-restore-draft]')?.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file || busy || completed) return;
    const readingEpoch = requestEpoch;
    try {
      if (file.size > 65536) throw new Error('Draft is too large.');
      const text = await file.text();
      // A send may have ended without a confirmed receipt while this read waited.
      if (busy || completed || requestEpoch !== readingEpoch) return;
      const draft = JSON.parse(text);
      if (draft.format !== 'storyscape-draft-v1' || !uuid.test(draft.state?.id || '') ||
          (draft.state.hash !== null && !/^[0-9a-f]{64}$/.test(draft.state.hash || '')) ||
          draft.consentVersion !== form.elements.namedItem('consent-version').value ||
          !draft.values || Object.keys(draft.values).length !== draftFields.length ||
          draftFields.some(key => typeof draft.values[key] !== 'string' || draft.values[key].length > 4000)) {
        throw new Error('This draft is invalid or uses an older privacy note. Its text remains readable in the downloaded file; contact us to reconcile an earlier send before starting again.');
      }
      if (!window.confirm('Replace this form with the downloaded draft? An earlier send may already be saved; retrying unchanged details uses its original request ID.')) return;
      draftFields.forEach(key => { form.elements.namedItem(key).value = draft.values[key]; });
      state = { id: draft.state.id, hash: draft.state.hash }; persist();
      form.elements.namedItem('privacy-consent').checked = false;
      separate.hidden = !state.hash; resetVerification();
      message('Draft restored. Review the details and privacy note, then verify and retry.');
    } catch (error) {
      if (busy || completed || requestEpoch !== readingEpoch) return;
      message(error.message); status.focus();
    } finally { event.target.value = ''; }
  });
  const watchVerification = () => {
    clearTimeout(verificationTimer);
    verificationTimer = setTimeout(() => {
      if (!verified && !completed) {
        message('Verification is taking longer than expected. Your entries remain here. Retry verification or use the email address below.');
        retryVerification.hidden = false;
      }
    }, 12000);
  };
  const resetVerification = () => {
    verified = false; submit.disabled = true;
    if (widget !== undefined) { window.turnstile.reset(widget); watchVerification(); }
  };
  separate.addEventListener('click', () => {
    if (!window.confirm('An earlier request may already be saved. Start a separate inquiry only if you intend to send another.')) return;
    requestEpoch++;
    state = { id: crypto.randomUUID(), hash: null }; persist();
    separate.hidden = true; resetVerification();
    message('A separate request is ready. Your entries remain here. Please verify before sending.');
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || completed || !verified || !form.reportValidity()) return;
    requestEpoch++;
    busy = true; submit.disabled = true; separate.hidden = true;
    if (errors) { errors.replaceChildren(); errors.hidden = true; }
    form.querySelectorAll('[aria-invalid]').forEach(control => control.removeAttribute('aria-invalid'));
    form.setAttribute('aria-busy', 'true');
    try {
      const data = new FormData(form);
      if (fields) fields.disabled = true;
      const content = [...data].filter(([key]) => !['submission-id', 'cf-turnstile-response', 'company-website'].includes(key))
        .map(([key, value]) => [key, String(value).trim()]).sort(([a], [b]) => a.localeCompare(b));
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(content)));
      const hash = [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
      if (state.hash && state.hash !== hash) {
        message('These details changed after an earlier send attempt. Restore the earlier details to retry, email us to resolve it, or intentionally start a separate request.');
        separate.hidden = false;
        return;
      }
      state.hash = hash; persist();
      message('Sending your request. Please keep this page open.');
      const response = await fetch(form.action, {
        method: 'POST', body: data, headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(20000), redirect: 'error',
      });
      const body = await response.json();
      if (!response.ok || body.ok !== true) {
        // These failures happen before storage; edits can safely reuse the ID.
        if ([400, 403, 413, 415].includes(response.status)) { state.hash = null; persist(); }
        if (body.code === 'consent_changed') { state.hash = null; persist(); }
        if (body.code === 'request_conflict') separate.hidden = false;
        const field = typeof body.field === 'string' ? form.elements.namedItem(body.field) : null;
        if (field && field.id && errors) {
          field.setAttribute('aria-invalid', 'true');
          const link = document.createElement('a'); link.href = '#' + field.id;
          link.textContent = body.error || 'Check this field.';
          errors.replaceChildren(link); errors.hidden = false;
        }
        throw new Error(body.error || 'Receipt could not be confirmed. Retry this request or email us.');
      }
      if (!uuid.test(body.id || '') || body.id.toLowerCase() !== state.id.toLowerCase()) {
        throw new Error('Receipt could not be confirmed. Keep your draft and retry the same request, or email us.');
      }
      message('Your request is saved. Opening the next steps…');
      try { sessionStorage.removeItem(storageKey); } catch { /* no sensitive data was stored */ }
      completed = true;
      window.location.assign(form.dataset.successUrl + '#receipt=' + encodeURIComponent(body.id));
    } catch (error) {
      const networkError = ['TimeoutError', 'AbortError', 'TypeError', 'SyntaxError'].includes(error.name);
      message(networkError
        ? 'Receipt could not be confirmed. Your entries are still here. Verify again and retry this same request, or email us.'
        : error.message);
      if (errors && !errors.hidden) errors.focus(); else status.focus();
    } finally {
      busy = false; form.removeAttribute('aria-busy');
      if (fields) fields.disabled = completed;
      if (!completed) resetVerification();
    }
  });
  const renderVerification = () => {
    widget = window.turnstile.render(form.querySelector('[data-verification]'), {
      sitekey: form.dataset.sitekey, action: 'consultation', theme: 'auto', size: 'flexible',
      callback: () => {
        clearTimeout(verificationTimer); retryVerification.hidden = true;
        verified = true; submit.disabled = busy || completed;
        if (state.hash && !busy && !completed) message('Verified again. Retry this same request with its original details, or email us.');
        if (!state.hash) message(storageWorks
          ? 'Ready to send. A receipt means your request has been saved.'
          : 'Ready to send. Keep this page open if you need to retry; this browser cannot remember your request ID after reload.');
      },
      'expired-callback': () => { verified = false; submit.disabled = true; retryVerification.hidden = false; message('Verification expired. Please verify again; your entries remain here.'); },
      'error-callback': () => { verified = false; submit.disabled = true; retryVerification.hidden = false; message('Verification is unavailable. Please retry verification or use the email address below.'); return true; },
    });
  };
  const loadVerification = () => {
    retryVerification.hidden = true; watchVerification();
    if (window.turnstile) {
      if (widget === undefined) renderVerification(); else resetVerification();
      return;
    }
    const epoch = ++loadEpoch;
    if (currentScript) currentScript.remove();
    const script = document.createElement('script'); currentScript = script;
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onerror = () => {
      if (epoch !== loadEpoch) return;
      clearTimeout(verificationTimer); retryVerification.hidden = false;
      message('Verification could not load. Your entries remain here; retry verification or use the email address below.');
    };
    script.onload = () => { if (epoch === loadEpoch) renderVerification(); };
    document.head.append(script);
  };
  retryVerification.addEventListener('click', () => {
    message('Retrying verification. Your entries remain here.'); loadVerification();
  });
  loadVerification();
})();
