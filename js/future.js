/* ============================================================
   future.js
   Renders the notebook list of future plans. Normally, clicking
   a line toggles it between open and completed (struck through).
   The eraser button switches to "erase mode", where tapping a
   line deletes it instead.
============================================================ */

// ---- Demo data ------------------------------------------------------
const demoPlans = [
  { id: 'demo-1', title: 'Go to Oversee Trip together', completed: false },
  { id: 'demo-2', title: 'Be together for the graduation', completed: false },
  { id: 'demo-3', title: 'Introduce with YN family', completed: true },
];

const notebookRoot = document.getElementById('notebookRoot');
let eraseMode = false;

function renderNotebook(plans) {
  if (!plans.length) {
    notebookRoot.innerHTML = '<p class="empty-state">No plans written yet — add one with the pen button.</p>';
    notebookRoot.classList.remove('erase-mode');
    return;
  }

  const sorted = [...plans].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

  notebookRoot.innerHTML = sorted.map((p) => `
    <div class="plan-line ${p.completed ? 'completed' : ''}" data-id="${p.id}" tabindex="0" role="button" aria-pressed="${p.completed}">
      <span class="plan-check"></span>
      <span>${p.title}</span>
      <svg class="erase-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 20H8.5L3 14.5a1 1 0 0 1 0-1.4l9-9a1 1 0 0 1 1.4 0l6 6a1 1 0 0 1 0 1.4L13 18"/></svg>
    </div>
  `).join('');

  notebookRoot.classList.toggle('erase-mode', eraseMode);

  notebookRoot.querySelectorAll('.plan-line').forEach((line) => {
    const handleActivate = () => {
      if (eraseMode) {
        deletePlan(line.dataset.id);
      } else {
        toggleCompleted(line);
      }
    };
    line.addEventListener('click', handleActivate);
    line.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleActivate(); }
    });
  });
}

async function toggleCompleted(line) {
  const id = line.dataset.id;
  const nowCompleted = !line.classList.contains('completed');

  line.classList.toggle('completed');
  line.setAttribute('aria-pressed', String(nowCompleted));

  if (db && !id.startsWith('local-') && !id.startsWith('demo-')) {
    try {
      const { error } = await db.from('future_plans').update({ completed: nowCompleted }).eq('id', id);
      if (error) throw error;
    } catch (err) {
      // Revert the visual toggle if the save failed, so the UI never
      // shows a state that isn't actually saved.
      line.classList.toggle('completed');
      line.setAttribute('aria-pressed', String(!nowCompleted));
      alert('Could not save to Supabase: ' + err.message);
    }
  } else {
    const plan = demoPlans.find((p) => p.id === id);
    if (plan) plan.completed = nowCompleted;
  }
}

async function deletePlan(id) {
  if (!confirm('Erase this plan? This cannot be undone.')) return;

  if (db && !id.startsWith('local-') && !id.startsWith('demo-')) {
    try {
      const { error } = await db.from('future_plans').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      alert('Could not delete: ' + err.message);
      return;
    }
  } else {
    const idx = demoPlans.findIndex((p) => p.id === id);
    if (idx !== -1) demoPlans.splice(idx, 1);
  }

  init();
}

async function init() {
  const plans = await loadTable('future_plans', demoPlans, { order: 'created_at', ascending: true });
  renderNotebook(plans);
}
init();

// ---- Erase mode toggle ------------------------------------------------
const toggleEraseBtn = document.getElementById('toggleEraseMode');
toggleEraseBtn.addEventListener('click', () => {
  eraseMode = !eraseMode;
  toggleEraseBtn.classList.toggle('fab-active', eraseMode);
  notebookRoot.classList.toggle('erase-mode', eraseMode);
});

// ---- Add plan form ------------------------------------------------
const openBtn = document.getElementById('openAddPlan');
const backdrop = document.getElementById('addPlanBackdrop');
const cancelBtn = document.getElementById('cancelAddPlan');
const form = document.getElementById('addPlanForm');

openBtn.addEventListener('click', () => backdrop.classList.add('is-open'));
cancelBtn.addEventListener('click', () => backdrop.classList.remove('is-open'));
backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.classList.remove('is-open'); });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('planTitle').value.trim();
  if (!title) return;

  if (db) {
    try {
      const { error } = await db.from('future_plans').insert({ title, completed: false });
      if (error) throw error;
    } catch (err) {
      alert('Could not save to Supabase: ' + err.message);
      return;
    }
  } else {
    demoPlans.push({ id: 'local-' + Date.now(), title, completed: false });
  }

  form.reset();
  backdrop.classList.remove('is-open');
  init();
});
