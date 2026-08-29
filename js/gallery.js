/* ============================================================
   gallery.js
   Renders every item in the `media` table as a grid, grouped by
   year, and handles uploading, editing (title/date/photo), and a
   "select several, delete them all" mode.

   Grouping/sorting uses each item's `date` (when you've set one)
   and falls back to `created_at` (always set, from upload time)
   otherwise — so older photos without a manually-set date still
   sort sensibly.
============================================================ */

// ---- Demo data ------------------------------------------------------
const demoMedia = [
  { id: 'demo-1', title: 'Our Rings', url: 'https://placehold.co/400x300/e8b4c0/4a1f2b?text=Our+Rings', date: '2026-07-24', created_at: '2026-07-24' },
  { id: 'demo-2', title: 'First Anniversary', url: 'https://placehold.co/400x300/e8b4c0/4a1f2b?text=First+Anniversary', date: '2026-06-06', created_at: '2026-06-06' },
  { id: 'demo-3', title: null, url: 'https://placehold.co/400x300/e8b4c0/4a1f2b?text=Us', date: null, created_at: '2026-03-15' },
  { id: 'demo-4', title: null, url: 'https://placehold.co/400x300/e8b4c0/4a1f2b?text=Us', date: null, created_at: '2025-12-31' },
  { id: 'demo-5', title: null, url: 'https://placehold.co/400x300/e8b4c0/4a1f2b?text=Us', date: null, created_at: '2025-09-10' },
];

const galleryRoot = document.getElementById('galleryRoot');

let deleteMode = false;
let selectedIds = new Set();
let currentMedia = [];

function effectiveDate(m) {
  return m.date || m.created_at;
}

function renderGallery(items) {
  currentMedia = items;

  if (!items.length) {
    galleryRoot.innerHTML = '<p class="empty-state">No photos yet — add your first with the + button.</p>';
    return;
  }

  const sorted = [...items].sort((a, b) => new Date(effectiveDate(b)) - new Date(effectiveDate(a)));
  const byYear = new Map();
  sorted.forEach((m) => {
    const year = new Date(effectiveDate(m)).getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(m);
  });

  let html = '';
  byYear.forEach((items, year) => {
    html += `<div class="timeline-year" style="margin:0 0 18px;">${year}</div><div class="gallery-grid" style="margin-bottom:44px;">`;
    items.forEach((m) => {
      const isSelected = selectedIds.has(m.id);
      html += `
        <div class="gallery-item${deleteMode ? ' selectable' : ''}${isSelected ? ' is-selected' : ''}" data-id="${m.id}">
          <span class="select-check"><svg viewBox="0 0 24 24" fill="none" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>
          <img src="${m.url}" alt="${m.title || 'A photo from our gallery'}" loading="lazy">
          ${m.title ? `<div class="gallery-caption">${m.title}</div>` : ''}
        </div>
      `;
    });
    html += `</div>`;
  });

  galleryRoot.innerHTML = html;

  galleryRoot.querySelectorAll('.gallery-item').forEach((item) => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      if (deleteMode) {
        if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
        item.classList.toggle('is-selected');
        updateSelectionBar();
      } else {
        const media = currentMedia.find((m) => m.id === id);
        if (media) openEditMediaModal(media);
      }
    });
  });
}

async function init() {
  const media = await loadTable('media', demoMedia, { order: 'created_at', ascending: false });
  renderGallery(media);
}
init();

// ---- Upload flow ------------------------------------------------
const openUploadBtn = document.getElementById('openUpload');
const uploadInput = document.getElementById('uploadInput');

openUploadBtn.addEventListener('click', () => uploadInput.click());

uploadInput.addEventListener('change', async () => {
  const files = Array.from(uploadInput.files);
  if (!files.length) return;

  if (db) {
    try {
      for (const file of files) {
        const path = `gallery/${Date.now()}-${file.name}`;
        const { error: uploadError } = await db.storage.from('media').upload(path, file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = db.storage.from('media').getPublicUrl(path);
        const { error: insertError } = await db.from('media').insert({ url: publicUrlData.publicUrl });
        if (insertError) throw insertError;
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
  } else {
    files.forEach((file) => {
      demoMedia.push({
        id: 'local-' + Date.now() + Math.random(),
        title: null,
        date: null,
        url: URL.createObjectURL(file),
        created_at: new Date().toISOString(),
      });
    });
  }

  uploadInput.value = '';
  init();
});

// ---- Edit media (title / date / replace photo) ------------------------------------------------
const editBackdrop = document.getElementById('editMediaBackdrop');
const editForm = document.getElementById('editMediaForm');
const editPreview = document.getElementById('editMediaPreview');
const cancelEditBtn = document.getElementById('cancelEditMedia');
const deleteMediaBtn = document.getElementById('deleteMediaBtn');

function openEditMediaModal(media) {
  document.getElementById('editMediaId').value = media.id;
  document.getElementById('editMediaTitle').value = media.title || '';
  document.getElementById('editMediaDate').value = media.date || '';
  document.getElementById('editMediaReplace').value = '';
  editPreview.innerHTML = `<img src="${media.url}" alt="">`;
  editBackdrop.classList.add('is-open');
}

cancelEditBtn.addEventListener('click', () => editBackdrop.classList.remove('is-open'));
editBackdrop.addEventListener('click', (e) => { if (e.target === editBackdrop) editBackdrop.classList.remove('is-open'); });

document.getElementById('editMediaReplace').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) editPreview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="">`;
});

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('editMediaId').value;
  const title = document.getElementById('editMediaTitle').value.trim() || null;
  const date = document.getElementById('editMediaDate').value || null;
  const replaceFile = document.getElementById('editMediaReplace').files[0];

  if (db) {
    try {
      const payload = { title, date };
      if (replaceFile) {
        const path = `gallery/${Date.now()}-${replaceFile.name}`;
        const { error: uploadError } = await db.storage.from('media').upload(path, replaceFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = db.storage.from('media').getPublicUrl(path);
        payload.url = publicUrlData.publicUrl;
      }
      const { error } = await db.from('media').update(payload).eq('id', id);
      if (error) throw error;
    } catch (err) {
      alert('Could not save: ' + err.message);
      return;
    }
  } else {
    const media = demoMedia.find((m) => m.id === id);
    if (media) {
      media.title = title;
      media.date = date;
      if (replaceFile) media.url = URL.createObjectURL(replaceFile);
    }
  }

  editBackdrop.classList.remove('is-open');
  init();
});

deleteMediaBtn.addEventListener('click', async () => {
  const id = document.getElementById('editMediaId').value;
  if (!confirm('Delete this photo? This cannot be undone.')) return;

  if (db) {
    try {
      const { data: row } = await db.from('media').select('url').eq('id', id).single();
      const { error } = await db.from('media').delete().eq('id', id);
      if (error) throw error;

      if (row?.url) {
        const marker = '/object/public/media/';
        const idx = row.url.indexOf(marker);
        if (idx !== -1) await db.storage.from('media').remove([row.url.slice(idx + marker.length)]);
      }
    } catch (err) {
      alert('Could not delete: ' + err.message);
      return;
    }
  } else {
    const idx = demoMedia.findIndex((m) => m.id === id);
    if (idx !== -1) demoMedia.splice(idx, 1);
  }

  editBackdrop.classList.remove('is-open');
  init();
});

// ---- Delete-selection flow ------------------------------------------------
const toggleDeleteBtn = document.getElementById('toggleDeleteMode');
const selectionBar = document.getElementById('selectionBar');
const selectionCount = document.getElementById('selectionCount');
const cancelSelectionBtn = document.getElementById('cancelSelection');
const confirmDeleteBtn = document.getElementById('confirmDeleteSelection');

function updateSelectionBar() {
  selectionCount.textContent = `${selectedIds.size} selected`;
  selectionBar.classList.toggle('is-active', deleteMode && selectedIds.size > 0);
}

function exitDeleteMode() {
  deleteMode = false;
  selectedIds.clear();
  toggleDeleteBtn.classList.remove('fab-active');
  selectionBar.classList.remove('is-active');
  init();
}

toggleDeleteBtn.addEventListener('click', () => {
  deleteMode = !deleteMode;
  selectedIds.clear();
  toggleDeleteBtn.classList.toggle('fab-active', deleteMode);
  updateSelectionBar();
  init();
});

cancelSelectionBtn.addEventListener('click', exitDeleteMode);

confirmDeleteBtn.addEventListener('click', async () => {
  if (!selectedIds.size) return;
  if (!confirm(`Delete ${selectedIds.size} photo(s)? This cannot be undone.`)) return;

  const ids = [...selectedIds];

  if (db) {
    try {
      // Look up storage paths before deleting the rows, so we can also
      // remove the underlying files (not just the database records).
      const { data: rows } = await db.from('media').select('id, url').in('id', ids);
      const { error: deleteError } = await db.from('media').delete().in('id', ids);
      if (deleteError) throw deleteError;

      const paths = (rows || [])
        .map((r) => {
          const marker = '/object/public/media/';
          const idx = r.url.indexOf(marker);
          return idx === -1 ? null : r.url.slice(idx + marker.length);
        })
        .filter(Boolean);
      if (paths.length) await db.storage.from('media').remove(paths);
    } catch (err) {
      alert('Could not delete: ' + err.message);
      return;
    }
  } else {
    ids.forEach((id) => {
      const idx = demoMedia.findIndex((m) => m.id === id);
      if (idx !== -1) demoMedia.splice(idx, 1);
    });
  }

  exitDeleteMode();
});
