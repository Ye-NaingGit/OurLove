/* ============================================================
   media-picker.js
   Shared "choose a photo" modal used by the Home and Us pages for
   the couple/profile photos. Lists everything already in the
   `media` table (the same one Gallery, Memories, and Gifts all
   write into) so anything uploaded anywhere on the site can be
   picked here — or upload a brand new photo directly from here.

   Usage from another page's script:
     openMediaPicker(({ id, url }) => { ...use the chosen photo... });
============================================================ */

let mediaPickerOnSelect = null;

function ensureMediaPickerDom() {
  if (document.getElementById('mediaPickerBackdrop')) return;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="modal-backdrop" id="mediaPickerBackdrop">
      <div class="modal media-picker-modal">
        <h2>Choose a photo</h2>
        <button type="button" class="btn btn-secondary" id="mediaPickerUploadBtn" style="width:100%; margin-bottom:16px;">Upload a new photo instead</button>
        <input type="file" id="mediaPickerUploadInput" accept="image/*" style="display:none;">
        <div class="media-picker-grid" id="mediaPickerGrid"></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="mediaPickerCancel" style="flex:1;">Cancel</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper.firstElementChild);

  document.getElementById('mediaPickerCancel').addEventListener('click', closeMediaPicker);
  document.getElementById('mediaPickerBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'mediaPickerBackdrop') closeMediaPicker();
  });
  document.getElementById('mediaPickerUploadBtn').addEventListener('click', () => {
    document.getElementById('mediaPickerUploadInput').click();
  });
  document.getElementById('mediaPickerUploadInput').addEventListener('change', handleMediaPickerUpload);
}

async function openMediaPicker(onSelect) {
  ensureMediaPickerDom();
  mediaPickerOnSelect = onSelect;
  await renderMediaPickerGrid();
  document.getElementById('mediaPickerBackdrop').classList.add('is-open');
}

function closeMediaPicker() {
  const backdrop = document.getElementById('mediaPickerBackdrop');
  if (backdrop) backdrop.classList.remove('is-open');
  mediaPickerOnSelect = null;
}

async function renderMediaPickerGrid() {
  const grid = document.getElementById('mediaPickerGrid');
  grid.innerHTML = '<p class="empty-state">Loading&hellip;</p>';

  const media = await loadTable('media', [], { order: 'created_at', ascending: false });

  if (!media.length) {
    grid.innerHTML = '<p class="empty-state">No photos uploaded yet — upload one above.</p>';
    return;
  }

  grid.innerHTML = media.map((m) => `
    <button type="button" class="media-picker-item" data-id="${m.id}" data-url="${m.url}">
      <img src="${m.url}" alt="${m.title || ''}">
    </button>
  `).join('');

  grid.querySelectorAll('.media-picker-item').forEach((item) => {
    item.addEventListener('click', () => {
      const { id, url } = item.dataset;
      const callback = mediaPickerOnSelect;
      closeMediaPicker();
      if (callback) callback({ id, url });
    });
  });
}

async function handleMediaPickerUpload() {
  const input = document.getElementById('mediaPickerUploadInput');
  const file = input.files[0];
  if (!file) return;

  if (db) {
    try {
      const path = `profile/${Date.now()}-${file.name}`;
      const { error: uploadError } = await db.storage.from('media').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = db.storage.from('media').getPublicUrl(path);
      const { data: mediaRow, error: mediaError } = await db.from('media').insert({ url: publicUrlData.publicUrl }).select().single();
      if (mediaError) throw mediaError;

      const callback = mediaPickerOnSelect;
      closeMediaPicker();
      if (callback) callback({ id: mediaRow.id, url: mediaRow.url });
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
  } else {
    // Demo fallback: preview locally, won't persist after refresh.
    const url = URL.createObjectURL(file);
    const callback = mediaPickerOnSelect;
    closeMediaPicker();
    if (callback) callback({ id: 'local-' + Date.now(), url });
  }

  input.value = '';
}
