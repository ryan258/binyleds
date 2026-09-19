(() => {
  'use strict';
  const form = document.querySelector('[data-cloudflare-intake]');
  if (!form) return;
  const status = form.querySelector('[data-intake-status]');
  const submit = form.querySelector('[type=submit]');
  const separate = form.querySelector('[data-new-request]');
  const retryVerification = form.querySelector('[data-retry-verification]');
  const idField = form.elements.namedItem('submission-id');
  const storageKey = 'storyscape-intake-request-v1';
  let state; let widget; let busy = false; let verified = false; let storageWorks = true; let completed = false;
  let verificationTimer; let currentScript; let loadEpoch = 0;
  const message = text => { status.textContent = text; };
  try { state = JSON.parse(sessionStorage.getItem(storageKey)); } catch { storageWorks = false; }
  if (!state || !/^[0-9a-f-]{36}$/i.test(state.id || '') || (state.hash && !/^[0-9a-f]{64}$/.test(state.hash))) {
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
    state = { id: crypto.randomUUID(), hash: null }; persist();
    separate.hidden = true; resetVerification();
    message('A separate request is ready. Your entries remain here. Please verify before sending.');
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || completed || !verified || !form.reportValidity()) return;
    busy = true; submit.disabled = true; separate.hidden = true;
    form.setAttribute('aria-busy', 'true');
    try {
      const data = new FormData(form);
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
        if (response.status === 409) separate.hidden = true;
        throw new Error(body.error || 'Receipt could not be confirmed. Retry this request or email us.');
      }
      message('Your request is saved. Opening the next steps…');
      try { sessionStorage.removeItem(storageKey); } catch { /* no sensitive data was stored */ }
      completed = true;
      window.location.assign(form.dataset.successUrl);
    } catch (error) {
      const networkError = ['TimeoutError', 'AbortError', 'TypeError', 'SyntaxError'].includes(error.name);
      message(networkError
        ? 'Receipt could not be confirmed. Your entries are still here. Verify again and retry this same request, or email us.'
        : error.message);
      status.focus();
    } finally {
      busy = false; form.removeAttribute('aria-busy');
      if (!completed) resetVerification();
    }
  });
  const renderVerification = () => {
    widget = window.turnstile.render(form.querySelector('[data-verification]'), {
      sitekey: form.dataset.sitekey, action: 'consultation', theme: 'auto', size: 'flexible',
      callback: () => {
        clearTimeout(verificationTimer); retryVerification.hidden = true;
        verified = true; submit.disabled = busy || completed;
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
