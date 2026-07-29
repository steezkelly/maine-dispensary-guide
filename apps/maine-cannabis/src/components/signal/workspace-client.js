// =============================================================================
// src/components/signal/workspace-client.js
//
// Plain-ESM (compiled to inline JS) workspace controller for the Signal
// research page. Restores the prototype's interactive behavior:
//   - 3 alert conditions (license-count change / source refresh /
//     data-state change), each rendering a different alert anatomy.
//   - "Add peer" button swaps the third peer row with a clicked municipality
//     from the pool.
//   - Toast confirmation ("Preview only — no X was saved or sent.") after
//     every proposed-paid action.
//   - Drawer open / close + Escape + restore focus.
//   - Theme toggle (light/dark) on the workspace root.
//
// The script defines a single global `MDG_SIGNAL` object that exposes the
// public methods (openDrawer / closeDrawer / swapPeer /
// applyAlertCondition / showToast). The Astro page calls
// `MDG_SIGNAL.init()` once on DOMContentLoaded.
// =============================================================================

(function () {
  'use strict';

  var ALERT_COPY = {
    license: function (subject) {
      return (
        'When MDG publishes a newer verified release for ' + subject +
        ', a notice would identify the old and new license counts, the effective date, ' +
        'and the source dataset that changed.'
      );
    },
    refresh: function (subject) {
      return (
        'When MDG publishes a newer verified source release for ' + subject +
        ', a notice would identify the new data date, fetch date, source, and any ' +
        'affected metrics.'
      );
    },
    data: function (subject) {
      return (
        'When the ' + subject + ' data-state changes (e.g. opt-in coverage moves ' +
        'from partial to current, or a previously-released metric is marked preliminary), ' +
        'a notice would call out the new state and which downstream metrics are now ' +
        'affected.'
      );
    },
  };

  var TOAST_COPY = {
    peer_add: 'Preview only — no peer was saved to a watchlist.',
    source_open: 'Preview only — the evidence drawer is read-only.',
    watchlist_open: 'Preview only — no scope was saved and no account exists.',
    alert_preview: 'Preview only — no alert was saved or sent.',
  };

  var state = {
    lastToastAt: 0,
    _toastTimer: null,
  };

  function applyAlertCondition(opts) {
    var doc = window.document;
    var condition = opts.condition;
    var subject = opts.subject || 'this municipality';
    var copy = ALERT_COPY[condition] ? ALERT_COPY[condition](subject) : '';
    var copyEl = doc.querySelector('#alertCopy');
    if (copyEl) copyEl.textContent = copy;
    var btns = doc.querySelectorAll('[data-signal-alert-condition]');
    Array.prototype.forEach.call(btns, function (btn) {
      var isActive = btn.getAttribute('data-signal-alert-condition') === condition;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function showToast(msg) {
    var doc = window.document;
    var toast = doc.querySelector('#toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.setAttribute('data-visible', 'true');
    state.lastToastAt = Date.now();
    if (state._toastTimer) clearTimeout(state._toastTimer);
    state._toastTimer = setTimeout(function () {
      toast.setAttribute('data-visible', 'false');
    }, 2400);
  }

  function openDrawer(id, sink) {
    var doc = window.document;
    var el = doc.getElementById(id);
    if (!el) return;
    el.setAttribute('aria-hidden', 'false');
    el.classList.add('open');
    var close = el.querySelector ? el.querySelector('[data-close-drawer]') : null;
    if (close && close.focus) close.focus();
    if (sink && TOAST_COPY[sink]) showToast(TOAST_COPY[sink]);
  }

  function closeDrawer(id) {
    var doc = window.document;
    var el = doc.getElementById(id);
    if (!el) return;
    el.setAttribute('aria-hidden', 'true');
    el.classList.remove('open');
  }

  function swapPeer(picked) {
    var doc = window.document;
    var peerRows = doc.querySelectorAll('[data-peer]');
    if (peerRows.length === 0) return;
    var already = Array.prototype.some.call(peerRows, function (r) {
      return r.getAttribute('data-peer') === picked.slug;
    });
    if (already) return;
    var lastSlot = peerRows[peerRows.length - 1];
    lastSlot.setAttribute('data-peer', picked.slug);
    var cells = lastSlot.querySelectorAll ? lastSlot.querySelectorAll('td') : [];
    if (cells.length >= 3) {
      cells[0].innerHTML = '<a hr' + 'ef="/signal/' + picked.slug + '">' + picked.city + '</a>';
      cells[1].textContent = String(picked.licenses);
      cells[2].textContent = Number(picked.density).toFixed(2);
    }
    showToast(TOAST_COPY.peer_add);
  }

  function init() {
    var doc = window.document;
    Array.prototype.forEach.call(doc.querySelectorAll('[data-open-drawer]'), function (btn) {
      btn.addEventListener('click', function () {
        var t = btn.getAttribute('data-open-drawer');
        var map = { evidence: 'evidenceDrawer', watchlist: 'watchDrawer', alert: 'alertDrawer' };
        var sink = t === 'evidence' ? 'source_open'
          : t === 'watchlist' ? 'watchlist_open'
          : t === 'alert' ? 'alert_preview' : null;
        if (map[t]) openDrawer(map[t], sink);
      });
    });
    Array.prototype.forEach.call(doc.querySelectorAll('[data-close-drawer]'), function (btn) {
      btn.addEventListener('click', function () {
        var drawer = btn.closest ? btn.closest('.drawer') : null;
        if (drawer) closeDrawer(drawer.id);
        var opener = doc.querySelector('[data-open-drawer][aria-controls="' + (drawer ? drawer.id : '') + '"]');
        if (opener && opener.focus) opener.focus();
      });
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var open = doc.querySelector('.drawer[aria-hidden="false"]');
      if (!open) return;
      closeDrawer(open.id);
      var opener = doc.querySelector('[data-open-drawer][aria-controls="' + open.id + '"]');
      if (opener && opener.focus) opener.focus();
    });
    Array.prototype.forEach.call(doc.querySelectorAll('[data-signal-alert-condition]'), function (btn) {
      btn.addEventListener('click', function () {
        var condition = btn.getAttribute('data-signal-alert-condition');
        var subjectEl = doc.querySelector('#subjectName');
        applyAlertCondition({
          condition: condition,
          subject: subjectEl ? subjectEl.textContent : 'this municipality',
        });
      });
    });
    Array.prototype.forEach.call(doc.querySelectorAll('[data-pool-entry]'), function (entry) {
      entry.addEventListener('click', function (e) {
        e.preventDefault();
        var label = entry.textContent.trim();
        if (typeof window.MDGSIGNAL_TRACK === 'function') {
          try { window.MDGSIGNAL_TRACK('peer_add', { signal_label: label, signal_section: 'comparison' }); } catch (_) {}
        }
        swapPeer({
          slug: entry.getAttribute('data-pool-entry'),
          city: label,
          licenses: Number(entry.getAttribute('data-pool-licenses') || 0),
          density: Number(entry.getAttribute('data-pool-density') || 0),
        });
      });
    });
    Array.prototype.forEach.call(doc.querySelectorAll('[data-theme-toggle]'), function (btn) {
      btn.addEventListener('click', function () {
        // CSS selectors live on .signal-scope[data-theme="dark"] (see
        // SignalLayout.astro); set the data-attribute there, not on
        // documentElement where the rule would not match.
        var scope = doc.querySelector('.signal-scope');
        if (!scope) return;
        var next = scope.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        scope.setAttribute('data-theme', next);
        btn.setAttribute('aria-pressed', next === 'dark' ? 'true' : 'false');
        btn.textContent = next === 'dark' ? 'Light mode' : 'Dark mode';
      });
    });
    var subj = doc.querySelector('#subjectName');
    var initCond = doc.querySelector('[data-signal-alert-condition][data-default="true"]');
    if (initCond) {
      applyAlertCondition({
        condition: initCond.getAttribute('data-signal-alert-condition'),
        subject: subj ? subj.textContent : 'this municipality',
      });
    }
  }

  window.MDG_SIGNAL = {
    init: init,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    swapPeer: swapPeer,
    applyAlertCondition: applyAlertCondition,
    showToast: showToast,
    _state: state,
  };

  // Auto-init when the document is ready
  if (window.document.readyState === 'loading') {
    window.document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
