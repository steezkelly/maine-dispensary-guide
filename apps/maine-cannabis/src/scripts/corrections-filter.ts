// Filter behavior for the editorial corrections log.
//
// Bundled into the corrections page via Astro's inline-script processor.
// Lives in a .ts file so the file-scoped type checker can resolve every
// identifier (the inline <script> block form loses function-scope context
// and produces false "Cannot find name" diagnostics in astro check).
//
// Two-axis (severity x category) interactive filter. No framework, no
// build step beyond Astro's bundler. State is two strings — current
// severity + current category — kept on the root element as data-active-*
// so URLs can be deep-linked and the DOM stays the source of truth.
// Entries are hidden via the standard [hidden] attribute so they remain
// in the DOM (and screen-reader-accessible when re-shown) without layout
// flicker.

type FilterState = { severity: string; category: string };

function readState(root: HTMLElement): FilterState {
  return {
    severity: root.dataset.activeSeverity ?? '',
    category: root.dataset.activeCategory ?? '',
  };
}

function applyFilter(root: HTMLElement): void {
  const state = readState(root);
  const entries = root.querySelectorAll<HTMLElement>('.correction-entry');
  let visible = 0;
  entries.forEach((entry) => {
    const matchSeverity = !state.severity || entry.dataset.severity === state.severity;
    const matchCategory = !state.category || entry.dataset.category === state.category;
    const show = matchSeverity && matchCategory;
    entry.hidden = !show;
    if (show) visible++;
  });

  const empty = document.querySelector<HTMLElement>('[data-corrections-empty]');
  if (empty) empty.hidden = visible !== 0;

  // Reflect pressed state on every chip so keyboard focus + visual
  // state are in sync.
  root.querySelectorAll<HTMLButtonElement>('[data-filter-severity]').forEach((btn) => {
    const v = btn.dataset.filterSeverity ?? '';
    btn.setAttribute('aria-pressed', String(v === state.severity));
  });
  root.querySelectorAll<HTMLButtonElement>('[data-filter-category]').forEach((btn) => {
    const v = btn.dataset.filterCategory ?? '';
    btn.setAttribute('aria-pressed', String(v === state.category));
  });

  // Announce the resulting view count for screen-reader users. The
  // empty-state <p> already has aria-live=polite and is toggled via
  // the [hidden] attribute above, so when no entries match the
  // announcement is automatic.
  if (visible > 0) {
    const activeSeverity = state.severity ? `severity=${state.severity}` : 'all severities';
    const activeCategory = state.category ? `topic=${state.category}` : 'all topics';
    // Set a status message that screen readers will announce on the
    // next focus, without polluting the visible DOM.
    const status = document.getElementById('corrections-filter-status');
    if (status) {
      status.textContent = `Showing ${visible} of ${entries.length} corrections (${activeSeverity}, ${activeCategory}).`;
    }
  }
}

function init(): void {
  const root = document.querySelector<HTMLElement>('[data-corrections-filter-root]');
  if (!root) return;

  // Initialize active state from pressed-default chips (the "All"
  // chips are pressed in markup).
  const allSevBtn = root.querySelector<HTMLButtonElement>('[data-filter-severity][aria-pressed="true"]');
  const allCatBtn = root.querySelector<HTMLButtonElement>('[data-filter-category][aria-pressed="true"]');
  root.dataset.activeSeverity = allSevBtn?.dataset.filterSeverity ?? '';
  root.dataset.activeCategory = allCatBtn?.dataset.filterCategory ?? '';
  applyFilter(root);

  root.addEventListener('click', (e: MouseEvent) => {
    const target = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>('button');
    if (!target) return;

    // Severity chip
    if (target.hasAttribute('data-filter-severity')) {
      root.dataset.activeSeverity = target.dataset.filterSeverity ?? '';
      applyFilter(root);
      return;
    }
    // Category chip
    if (target.hasAttribute('data-filter-category')) {
      root.dataset.activeCategory = target.dataset.filterCategory ?? '';
      applyFilter(root);
      return;
    }
    // Reset (in the empty-state row)
    if (target.hasAttribute('data-corrections-reset')) {
      root.dataset.activeSeverity = '';
      root.dataset.activeCategory = '';
      applyFilter(root);
      return;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}