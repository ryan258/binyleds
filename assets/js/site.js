(() => {
  "use strict";

  const root = document.documentElement;
  const header = document.querySelector("[data-site-header]");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const menuPanel = document.querySelector("[data-menu-panel]");
  const themeToggle = document.querySelector("[data-theme-toggle]");
  const topLink = document.getElementById("top-link");

  const setMenu = (open) => {
    if (!menuToggle || !menuPanel) return;
    menuPanel.classList.toggle("is-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.querySelector(".menu-toggle__label").textContent = open ? "Close" : "Menu";
  };

  if (menuToggle && menuPanel) {
    menuToggle.addEventListener("click", () => {
      setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
    });

    menuPanel.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenu(false));
    });
  }

  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } },
  };
  const colorScheme = window.matchMedia('(prefers-color-scheme: light)');
  let themeChoice = storage.get('pref-theme');
  if (!['light', 'dark', 'system'].includes(themeChoice)) themeChoice = 'system';
  const nextThemeChoice = () => {
    if (themeChoice === 'system') return colorScheme.matches ? 'dark' : 'light';
    if (themeChoice === 'light') return colorScheme.matches ? 'dark' : 'system';
    return colorScheme.matches ? 'system' : 'light';
  };
  const applyTheme = () => {
    root.dataset.theme = themeChoice === 'system' ? (colorScheme.matches ? 'light' : 'dark') : themeChoice;
    if (themeToggle) {
      const next = nextThemeChoice();
      themeToggle.textContent = `Theme: ${themeChoice}`;
      themeToggle.setAttribute('aria-label', `Theme: ${themeChoice}. Switch to ${next}.`);
    }
  };
  applyTheme();
  colorScheme.addEventListener('change', applyTheme);
  themeToggle?.addEventListener('click', () => {
    themeChoice = nextThemeChoice();
    storage.set('pref-theme', themeChoice); applyTheme();
  });
  const receipt = document.querySelector('[data-receipt]');
  if (receipt) {
    const id = new URLSearchParams(window.location.hash.slice(1)).get('receipt');
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id || '')) {
      receipt.textContent = `Reference from your submission: ${id}. Keep it if you need to follow up.`;
    }
  }

  const updateScrollState = () => {
    const scrolled = window.scrollY > 48;
    if (header) header.classList.toggle("is-compact", scrolled);
    if (topLink) topLink.classList.toggle("hidden", window.scrollY < window.innerHeight);
  };

  updateScrollState();
  window.addEventListener("scroll", updateScrollState, { passive: true });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle?.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      menuToggle.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1180) setMenu(false);
  });

  const guide = document.querySelector("[data-brand-guide]");
  if (!guide) return;

  const search = guide.querySelector("[data-guide-search]");
  const sections = [...guide.querySelectorAll("[data-guide-section]")];
  const empty = guide.querySelector("[data-guide-empty]");
  const results = guide.querySelector("[data-guide-results]");
  const expandButton = guide.querySelector("[data-expand-guide]");
  const printButton = guide.querySelector("[data-print-guide]");
  const normalize = (value) => value.toLowerCase().replace(/\s+/g, " ").trim();

  const applyGuideSearch = () => {
    const query = normalize(search?.value || "");
    let visible = 0;

    sections.forEach((section) => {
      const match = !query || normalize(section.textContent).includes(query);
      section.hidden = !match;
      if (match) visible += 1;
    });

    if (empty) empty.hidden = visible !== 0;
    if (results) {
      results.textContent = query
        ? `${visible} ${visible === 1 ? "section" : "sections"} found`
        : "All sections";
    }
  };

  search?.addEventListener("input", applyGuideSearch);
  search?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      search.value = "";
      applyGuideSearch();
      search.blur();
    }
  });

  const revealGuideTarget = () => {
    let id; try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target || !guide.contains(target)) return;
    if (search) search.value = '';
    applyGuideSearch();
    let ancestor = target;
    while (ancestor && ancestor !== guide) { if (ancestor.tagName === 'DETAILS') ancestor.open = true; ancestor = ancestor.parentElement; }
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start' });
  };
  guide.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', () => {
    if (search) search.value = ''; applyGuideSearch();
  }));
  window.addEventListener('hashchange', revealGuideTarget);
  revealGuideTarget();

  expandButton?.addEventListener("click", () => {
    const details = [...guide.querySelectorAll("details")];
    const shouldOpen = details.some((detail) => !detail.open);
    details.forEach((detail) => { detail.open = shouldOpen; });
    expandButton.textContent = shouldOpen ? "Collapse all" : "Expand all";
  });

  printButton?.addEventListener("click", () => {
    if (search) search.value = "";
    applyGuideSearch();
    guide.querySelectorAll("details").forEach((detail) => { detail.open = true; });
    window.print();
  });

  const copyText = async (value, button) => {
    const original = button.textContent;
    let copied = false;
    try {
      await navigator.clipboard.writeText(value); copied = true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try { copied = document.execCommand("copy"); } catch { copied = false; }
      textarea.remove();
    }
    button.textContent = copied ? "Copied" : "Copy unavailable — select the text";
    window.setTimeout(() => { button.textContent = original; }, 1600);
  };

  guide.querySelectorAll("[data-copy-text]").forEach((button) => {
    button.addEventListener("click", () => copyText(button.dataset.copyText, button));
  });

  const checks = [...guide.querySelectorAll("[data-brand-check]")];
  const progress = guide.querySelector("[data-checklist-progress]");
  const storageKey = "storyscape-brand-checklist-v1";

  let savedChecks = {};
  try {
    savedChecks = JSON.parse(localStorage.getItem(storageKey) || "{}");
  } catch {
    savedChecks = {};
  }

  if (!savedChecks || typeof savedChecks !== "object" || Array.isArray(savedChecks)) savedChecks = {};

  const updateChecklist = () => {
    const state = {};
    checks.forEach((check) => { state[check.dataset.brandCheck] = check.checked; });
    const persisted = storage.set(storageKey, JSON.stringify(state));
    const complete = checks.filter((check) => check.checked).length;
    if (progress) progress.textContent = `${complete} of ${checks.length} complete${persisted ? "" : " · saved for this page only"}`;
  };

  checks.forEach((check) => {
    check.checked = savedChecks[check.dataset.brandCheck] === true;
    check.addEventListener("change", updateChecklist);
  });
  updateChecklist();
})();
