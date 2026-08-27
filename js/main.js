/* ============================================================
   main.js
   Home-page-only logic: the live "days together" counter.
   Nav behaviour now lives in nav.js (shared across every page).
============================================================ */

// Edit ANNIVERSARY below if the start date ever needs to change —
// everything else recalculates automatically.
const ANNIVERSARY = new Date('2025-06-06T00:00:00');

function daysTogether() {
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((now - ANNIVERSARY) / msPerDay);
}

const dayCountEl = document.getElementById('dayCount');
if (dayCountEl) {
  dayCountEl.textContent = daysTogether();
}
