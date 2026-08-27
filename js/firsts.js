/* ============================================================
   firsts.js
   Renders the corkboard of "firsts" notes. Each note can either
   stand alone (title + message you type directly) or link to a
   memory, in which case its date and photo are pulled from that
   memory automatically. Clicking any note reopens the same form
   for editing, with a Delete option.
============================================================ */

// ---- Demo data ------------------------------------------------------
const demoFirsts = [
  { id: 'demo-1', title: 'First Anniversary', description: 'A whole year, and it still feels like the beginning.', memory_id: null, memories: { date: '2026-06-06', media: { url: 'https://placehold.co/300x200/e8b4c0/4a1f2b?text=First+Anniversary' } } },
  { id: 'demo-2', title: 'First', description: 'Message', memory_id: null, memories: { date: '2025-06-06', media: { url: 'https://placehold.co/300x200/e8b4c0/4a1f2b?text=First' } } },
  { id: 'demo-3', title: 'First Date', description: 'Message', memory_id: null, memories: { date: '2025-06-07', media: null } },
];

const corkboardRoot = document.getElementById('corkboardRoot');
let currentFirsts = [];

// Small deterministic "randomness" so notes look hand-pinned but don't
// reshuffle their tilt every time the page re-renders.
function tiltForIndex(i) {
  const angles = [-6, 4, -3, 7, -8, 3, -5, 6];
  return angles[i % angles.length];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function renderCorkboard(firsts) {
  currentFirsts = firsts;

  if (!firsts.length) {
    corkboardRoot.innerHTML = '<p class="empty-state" style="color:#fff;">No firsts pinned yet — add one with the + button.</p>';
    return;
  }

  corkboardRoot.innerHTML = firsts.map((f, i) => {
    const date = f.memories?.date ? formatDate(f.memories.date) : '';
    const photoUrl = f.memories?.media?.url;
    const rotate = f.rotation ?? tiltForIndex(i);

    return `
      <div class="first-note" style="transform: rotate(${rotate}deg);" data-id="${f.id}" tabindex="0" role="button">
        <span class="pin">&#128204;</span>
        <span class="edit-hint" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></span>
        ${photoUrl ? `<img src="${photoUrl}" alt="${f.title}">` : ''}
        <p class="first-title">${f.title}</p>
        ${date ? `<p class="first-date">${date}</p>` : ''}
        ${f.description ? `<p class="first-desc">&ldquo;${f.description}&rdquo;</p>` : ''}
      </div>
    `;
  }).join('');

  corkboardRoot.querySelectorAll('.first-note').forEach((note) => {
    const openForEdit = () => {
      const first = currentFirsts.find((f) => f.id === note.dataset.id);
      if (first) openFirstModal(first);
    };
    note.addEventListener('click', openForEdit);
    note.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openForEdit(); }
    });
  });
}

async function init() {
  const firsts = await loadTable('firsts', demoFirsts, { select: '*, memories(date, media(url))' });
  renderCorkboard(firsts);
}
init();

async function populateMemoryDropdown(selectedId) {
  const memories = await loadTable('memories', [], { select: 'id, title', order: 'date', ascending: false });
  const select = document.getElementById('firstMemory');
  select.innerHTML = '<option value="">None — use the fields above only</option>';
  memories.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.title;
    if (m.id === selectedId) opt.selected = true;
    select.appendChild(opt);
  });
}
populateMemoryDropdown();

// ---- Add / edit first form ------------------------------------------------
const openBtn = document.getElementById('openAddFirst');
const backdrop = document.getElementById('addFirstBackdrop');
const cancelBtn = document.getElementById('cancelAddFirst');
const form = document.getElementById('addFirstForm');
const modalTitle = document.getElementById('firstModalTitle');
const submitBtn = document.getElementById('firstSubmitBtn');
const deleteBtn = document.getElementById('deleteFirstBtn');

function openFirstModal(first = null) {
  form.reset();
  document.getElementById('firstId').value = first?.id ?? '';
  document.getElementById('firstTitle').value = first?.title ?? '';
  document.getElementById('firstDesc').value = first?.description ?? '';
  populateMemoryDropdown(first?.memory_id ?? null);

  modalTitle.textContent = first ? 'Edit first' : 'Add new first';
  submitBtn.textContent = first ? 'Update' : 'Pin it';
  deleteBtn.style.display = first ? 'inline-block' : 'none';

  backdrop.classList.add('is-open');
}

openBtn.addEventListener('click', () => openFirstModal());
cancelBtn.addEventListener('click', () => backdrop.classList.remove('is-open'));
backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.classList.remove('is-open'); });

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const editingId = document.getElementById('firstId').value || null;
  const title = document.getElementById('firstTitle').value.trim();
  const description = document.getElementById('firstDesc').value.trim();
  const memoryId = document.getElementById('firstMemory').value || null;
  if (!title) return;

  if (db) {
    try {
      const payload = { title, description, memory_id: memoryId };
      if (editingId) {
        const { error } = await db.from('firsts').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        payload.rotation = Math.round((Math.random() * 16 - 8) * 10) / 10;
        const { error } = await db.from('firsts').insert(payload);
        if (error) throw error;
      }
    } catch (err) {
      alert('Could not save to Supabase: ' + err.message);
      return;
    }
  } else {
    if (editingId) {
      const existing = demoFirsts.find((f) => f.id === editingId);
      if (existing) { existing.title = title; existing.description = description; existing.memory_id = memoryId; }
    } else {
      demoFirsts.push({
        id: 'local-' + Date.now(), title, description, memory_id: memoryId,
        rotation: Math.round((Math.random() * 16 - 8) * 10) / 10,
        memories: null,
      });
    }
  }

  form.reset();
  backdrop.classList.remove('is-open');
  init();
});

deleteBtn.addEventListener('click', () => {
  const id = document.getElementById('firstId').value;
  if (id) deleteFirst(id, () => backdrop.classList.remove('is-open'));
});

async function deleteFirst(id, afterDelete) {
  if (!confirm('Delete this pinned first? This cannot be undone.')) return;

  if (db) {
    try {
      const { error } = await db.from('firsts').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      alert('Could not delete: ' + err.message);
      return;
    }
  } else {
    const idx = demoFirsts.findIndex((f) => f.id === id);
    if (idx !== -1) demoFirsts.splice(idx, 1);
  }

  if (afterDelete) afterDelete();
  init();
}
