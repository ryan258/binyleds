import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const script = readFileSync(new URL('../assets/js/site.js', import.meta.url), 'utf8');

function element(extra = {}) {
  return { dataset: {}, attrs: {}, events: {}, textContent: '', hidden: false,
    addEventListener(type, callback) { this.events[type] = callback; },
    setAttribute(key, value) { this.attrs[key] = value; },
    removeAttribute(key) { delete this.attrs[key]; },
    focus() { this.focused = true; }, scrollIntoView() {}, ...extra };
}
function browser({ blocked = false, saved = {}, light = true, guideEnabled = true, hash = '' } = {}) {
  const root = element(); const theme = element();
  const color = element({ matches: light });
  const search = element({ value: '' }); const progress = element(); const link = element();
  const sections = [element({ id: 'foundation', textContent: 'Foundation', tagName: 'SECTION' }), element({ id: 'type', textContent: 'Manrope', tagName: 'SECTION' })];
  const check = element({ dataset: { brandCheck: 'one' }, checked: false });
  const guide = element({
    querySelector(selector) { return { '[data-guide-search]': search, '[data-checklist-progress]': progress }[selector] || null; },
    querySelectorAll(selector) { return { '[data-guide-section]': sections, '[data-brand-check]': [check], 'a[href^="#"]': [link] }[selector] || []; },
    contains(target) { return sections.includes(target); },
  });
  sections.forEach(section => { section.parentElement = guide; });
  const window = element({ scrollY: 0, innerHeight: 800, innerWidth: 1200, location: { hash },
    matchMedia() { return color; } });
  vm.runInNewContext(script, {
    document: { documentElement: root,
      querySelector(selector) { return { '[data-theme-toggle]': theme, '[data-brand-guide]': guideEnabled ? guide : null }[selector] || null; },
      getElementById(id) { return sections.find(section => section.id === id) || null; }, addEventListener() {} },
    window, URLSearchParams,
    localStorage: { getItem(key) { if (blocked) throw new Error('blocked'); return saved[key] || null; },
      setItem(key, value) { if (blocked) throw new Error('blocked'); saved[key] = value; } },
  });
  return { root, theme, color, search, progress, check, sections, link, window };
}
test('theme works without storage, follows system, and preserves an explicit choice', () => {
  const page = browser({ blocked: true, guideEnabled: false });
  assert.equal(page.root.dataset.theme, 'light');
  page.color.matches = false; page.color.events.change(); assert.equal(page.root.dataset.theme, 'dark');
  page.theme.events.click(); assert.equal(page.root.dataset.theme, 'light');
  page.color.events.change(); assert.equal(page.root.dataset.theme, 'light');
});
test('theme toggle flips the visible theme on the first click when system matches light', () => {
  const page = browser({ light: true, guideEnabled: false });
  assert.equal(page.root.dataset.theme, 'light');
  page.theme.events.click(); assert.equal(page.root.dataset.theme, 'dark');
  page.theme.events.click(); assert.equal(page.root.dataset.theme, 'light');
});
for (const value of ['null', '[]', 'invalid', '42']) {
  test(`checklist tolerates saved ${value}`, () => {
    const page = browser({ saved: { 'storyscape-brand-checklist-v1': value } });
    assert.equal(page.check.checked, false);
    page.check.checked = true; page.check.events.change(); assert.match(page.progress.textContent, /1 of 1 complete/);
  });
}
test('blocked checklist storage keeps same-page progress', () => {
  const page = browser({ blocked: true });
  page.check.checked = true; page.check.events.change();
  assert.match(page.progress.textContent, /1 of 1 complete.*this page only/);
});
test('guide navigation clears a filter and reveals/focuses the hash target', () => {
  const page = browser(); page.search.value = 'Manrope'; page.search.events.input();
  assert.equal(page.sections[0].hidden, true);
  page.link.events.click(); page.window.location.hash = '#foundation'; page.window.events.hashchange();
  assert.equal(page.search.value, ''); assert.equal(page.sections[0].hidden, false);
  assert.equal(page.sections[0].focused, true);
});
test('direct guide fragments reveal and focus their section', () => {
  const page = browser({ hash: '#foundation' }); assert.equal(page.sections[0].focused, true);
});
