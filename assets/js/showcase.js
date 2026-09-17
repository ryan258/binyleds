(() => {
  "use strict";
  const workshop = document.querySelector("[data-showcase]");
  if (!workshop) return;
  const input = workshop.querySelector("[data-module-filter]");
  const samples = [...workshop.querySelectorAll("[data-showcase-sample]")];
  const status = workshop.querySelector("[data-showcase-count]");
  const empty = workshop.querySelector("[data-showcase-empty]");
  const filter = () => {
    const terms = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let visible = 0;
    samples.forEach((sample) => {
      sample.hidden = !terms.every((term) => sample.dataset.search.toLowerCase().includes(term));
      if (!sample.hidden) visible += 1;
    });
    status.textContent = `${visible} of ${samples.length} sections shown`;
    empty.hidden = visible !== 0;
  };
  workshop.querySelector("[data-showcase-controls]").hidden = false;
  input.addEventListener("input", filter);
  // A menu link must still reach its target after a filter hid that section.
  workshop.querySelectorAll('.showcase-links a').forEach((link) => {
    link.addEventListener("click", () => {
      input.value = "";
      filter();
    });
  });
  filter();
})();
