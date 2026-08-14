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

  const updateThemeLabel = () => {
    if (!themeToggle) return;
    const current = root.dataset.theme === "light" ? "light" : "dark";
    const next = current === "dark" ? "light" : "dark";
    themeToggle.setAttribute("aria-label", `Switch to ${next} theme`);
    themeToggle.setAttribute("title", `Switch to ${next} theme`);
  };

  if (themeToggle) {
    updateThemeLabel();
    themeToggle.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      localStorage.setItem("pref-theme", next);
      updateThemeLabel();
    });
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
    if (window.innerWidth > 980) setMenu(false);
  });

  const preferredDate = document.getElementById("preferred-date");
  if (preferredDate) {
    const today = new Date();
    const localDate = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0")
    ].join("-");
    preferredDate.min = localDate;
  }

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
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    button.textContent = "Copied";
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

  const updateChecklist = () => {
    const state = {};
    checks.forEach((check) => { state[check.dataset.brandCheck] = check.checked; });
    localStorage.setItem(storageKey, JSON.stringify(state));
    const complete = checks.filter((check) => check.checked).length;
    if (progress) progress.textContent = `${complete} of ${checks.length} complete`;
  };

  checks.forEach((check) => {
    check.checked = Boolean(savedChecks[check.dataset.brandCheck]);
    check.addEventListener("change", updateChecklist);
  });
  updateChecklist();
})();
