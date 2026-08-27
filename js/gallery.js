/* ============================================================
   gallery.js
   Renders every item in the `media` table as a grid, grouped by
   year, and handles both uploading new media and a "select
   several, delete them all" mode.
============================================================ */

// ---- Demo data ------------------------------------------------------
const demoMedia = [
  { id: 'demo-1', title: 'Our Rings', url: 'https://placehold.co/400x300/e8b4c0/4a1f2b?text=Our+Rings', created_at: '2026-07-24' },
  { id: 'demo-2', title: 'First Anniversary', url: 'https://placehold.co/400x300/e8b4c0/4a1f2b?text=First+Anniversary', created_at: '2026-06-06' },
  { id: 'demo-3', title: null, url: 'https://placehold.co/400x300/e8b4c0/4a1f2b?text=Us', created_at: '2026-03-15' },
  { id: 'demo-4', title: null, url: 'https://placehold.co/400x300/e8b4c0/4a1f2b?text=Us', created_at: '2025-12-31' },
  { id: 'demo-5', title: null, url: 'https://placehold.co/400x300/e8b4c0/4a1f2b?text=Us', created_at: '2025-09-10' },
];

const galleryRoot = document.getElementById('galleryRoot');

let deleteMode = false;
let selectedIds = new Set();

function renderGallery(items) {
  if (!items.length) {
    galleryRoot.innerHTML = '<p class="empty-state">No photos yet — add your first with the + button.</p>';
    return;
  }

  const sorted = [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const byYear = new Map();
  sorted.forEach((m) => {
    const year = new Date(m.created_at).getFullYear();
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
      if (!deleteMode) return;
      const id = item.dataset.id;
      if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
      item.classList.toggle('is-selected');
      updateSelectionBar();
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
        url: URL.createObjectURL(file),
        created_at: new Date().toISOString(),
      });
    });
  }

  uploadInput.value = '';
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
