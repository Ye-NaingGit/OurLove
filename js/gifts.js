/* ============================================================
   gifts.js
   Renders each gift as a box with the photo peeking out of the
   lid. Hovering (desktop) or tapping (touch) opens the lid; once
   open, Edit/Delete buttons appear alongside the details.
============================================================ */

// ---- Demo data ------------------------------------------------------
const demoGifts = [
  { id: 'demo-1', name: 'Our Rings', date: '2026-07-24', message: 'Our first rings together. Gift for our first anniversary.', given_by: 'Ye Naing', media: { id: 'demo-media-1', url: 'https://placehold.co/400x300/e8b4c0/4a1f2b?text=Our+Rings' } },
  { id: 'demo-2', name: 'Sony Earphone', date: '2026-02-14', message: 'For your commute playlists.', given_by: 'Thaddar', media: { id: 'demo-media-2', url: 'https://placehold.co/400x300/e8b4c0/4a1f2b?text=Sony+Earphone' } },
  { id: 'demo-3', name: 'Lipstick', date: '2025-12-25', message: 'Your favorite shade.', given_by: 'Ye Naing', media: { id: 'demo-media-3', url: 'https://placehold.co/400x300/e8b4c0/4a1f2b?text=Lipstick' } },
];

const giftsRoot = document.getElementById('giftsRoot');
let currentGifts = [];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function renderGifts(gifts) {
  currentGifts = gifts;

  if (!gifts.length) {
    giftsRoot.innerHTML = '<p class="empty-state">No gifts logged yet — add your first with the + button.</p>';
    return;
  }

  const sorted = [...gifts].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  const byYear = new Map();
  sorted.forEach((g) => {
    const year = g.date ? new Date(g.date).getFullYear() : 'Undated';
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(g);
  });

  let html = '';
  byYear.forEach((items, year) => {
    html += `<div class="timeline-year" style="margin:0 0 18px;">${year}</div><div class="gifts-grid" style="margin-bottom:44px;">`;
    items.forEach((g) => {
      const photo = g.media?.url || 'https://placehold.co/400x300/e8b4c0/4a1f2b?text=Gift';
      html += `
        <div class="gift-box" data-id="${g.id}" tabindex="0" role="button" aria-expanded="false">
          <div class="gift-box-inner">
            <div class="gift-lid"><img src="${photo}" alt="${g.name}"></div>
            <div class="gift-body">
              <p class="gift-name">${g.name}</p>
              ${g.date ? `<p class="gift-date">${formatDate(g.date)}</p>` : ''}
            </div>
            <div class="gift-details">
              <div class="gift-details-heading">
                <p class="gift-name">${g.name}</p>
                ${g.date ? `<p class="gift-date">${formatDate(g.date)}</p>` : ''}
              </div>
              ${g.message ? `<p class="gift-message">&ldquo;${g.message}&rdquo;</p>` : ''}
              ${g.given_by ? `<p class="gift-by">From ${g.given_by}</p>` : ''}
              <div class="gift-actions">
                <button type="button" class="card-action-btn" data-action="edit" data-id="${g.id}">Edit</button>
                <button type="button" class="card-action-btn card-action-danger" data-action="delete" data-id="${g.id}">Delete</button>
              </div>
            </div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  });

  giftsRoot.innerHTML = html;

  giftsRoot.querySelectorAll('.gift-box').forEach((box) => {
    const toggle = () => {
      const isOpen = box.classList.toggle('is-open');
      box.setAttribute('aria-expanded', String(isOpen));
    };
    box.addEventListener('click', (e) => {
      if (e.target.closest('.card-action-btn')) return;
      toggle();
    });
    box.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.card-action-btn')) {
        e.preventDefault();
        toggle();
      }
    });
  });

  giftsRoot.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const gift = currentGifts.find((g) => g.id === btn.dataset.id);
      if (gift) openGiftModal(gift);
    });
  });
  giftsRoot.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteGift(btn.dataset.id);
    });
  });
}

async function init() {
  const gifts = await loadTable('gifts', demoGifts, { select: '*, media(id, url)', order: 'date', ascending: false });
  renderGifts(gifts);
}
init();

// ---- Add / edit gift form ------------------------------------------------
const openBtn = document.getElementById('openAddGift');
const backdrop = document.getElementById('addGiftBackdrop');
const cancelBtn = document.getElementById('cancelAddGift');
const form = document.getElementById('addGiftForm');
const modalTitle = document.getElementById('giftModalTitle');
const submitBtn = document.getElementById('giftSubmitBtn');
const photoNote = document.getElementById('giftPhotoNote');
const deleteBtn = document.getElementById('deleteGiftBtn');
const photoPreview = document.getElementById('giftPhotoPreview');
const photoFileInput = document.getElementById('giftPhoto');
const mediaIdField = document.getElementById('giftMediaId');

function setGiftPhotoPreview(url) {
  photoPreview.innerHTML = url ? `<img src="${url}" alt="">` : '';
}

function openGiftModal(gift = null) {
  form.reset();
  document.getElementById('giftId').value = gift?.id ?? '';
  document.getElementById('giftName').value = gift?.name ?? '';
  document.getElementById('giftDate').value = gift?.date ?? '';
  document.getElementById('giftMessage').value = gift?.message ?? '';
  document.getElementById('giftBy').value = gift?.given_by ?? '';
  mediaIdField.value = gift?.media?.id ?? '';
  setGiftPhotoPreview(gift?.media?.url ?? null);

  modalTitle.textContent = gift ? 'Edit gift' : 'Add new gift';
  submitBtn.textContent = gift ? 'Update' : 'Save';
  photoNote.style.display = gift ? 'block' : 'none';
  deleteBtn.style.display = gift ? 'inline-block' : 'none';

  backdrop.classList.add('is-open');
}

openBtn.addEventListener('click', () => openGiftModal());
cancelBtn.addEventListener('click', () => backdrop.classList.remove('is-open'));
backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.classList.remove('is-open'); });

document.getElementById('giftChooseExisting').addEventListener('click', () => {
  openMediaPicker(({ id, url }) => {
    mediaIdField.value = id;
    photoFileInput.value = '';
    setGiftPhotoPreview(url);
  });
});

photoFileInput.addEventListener('change', () => {
  const file = photoFileInput.files[0];
  if (!file) return;
  mediaIdField.value = '';
  setGiftPhotoPreview(URL.createObjectURL(file));
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const editingId = document.getElementById('giftId').value || null;
  const name = document.getElementById('giftName').value.trim();
  const date = document.getElementById('giftDate').value || null;
  const message = document.getElementById('giftMessage').value.trim();
  const givenBy = document.getElementById('giftBy').value.trim();
  const photoFile = document.getElementById('giftPhoto').files[0];
  const chosenMediaId = document.getElementById('giftMediaId').value || null;
  if (!name) return;

  if (db) {
    try {
      let mediaId; // undefined = don't touch existing media_id
      if (photoFile) {
        const path = `gifts/${Date.now()}-${photoFile.name}`;
        const { error: uploadError } = await db.storage.from('media').upload(path, photoFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = db.storage.from('media').getPublicUrl(path);
        const { data: mediaRow, error: mediaError } = await db.from('media').insert({ title: name, url: publicUrlData.publicUrl }).select().single();
        if (mediaError) throw mediaError;
        mediaId = mediaRow.id;
      } else if (chosenMediaId) {
        mediaId = chosenMediaId;
      }

      const payload = { name, date, message, given_by: givenBy };
      if (mediaId !== undefined) payload.media_id = mediaId;

      if (editingId) {
        const { error } = await db.from('gifts').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await db.from('gifts').insert(payload);
        if (error) throw error;
      }
    } catch (err) {
      alert('Could not save to Supabase: ' + err.message);
      return;
    }
  } else {
    const previewImg = photoPreview.querySelector('img');
    const newPhoto = photoFile
      ? { id: 'local-' + Date.now(), url: URL.createObjectURL(photoFile) }
      : (chosenMediaId && previewImg ? { id: chosenMediaId, url: previewImg.src } : undefined);
    if (editingId) {
      const existing = demoGifts.find((g) => g.id === editingId);
      if (existing) {
        existing.name = name; existing.date = date; existing.message = message; existing.given_by = givenBy;
        if (newPhoto) existing.media = newPhoto;
      }
    } else {
      demoGifts.push({ id: 'local-' + Date.now(), name, date, message, given_by: givenBy, media: newPhoto ?? null });
    }
  }

  form.reset();
  backdrop.classList.remove('is-open');
  init();
});

deleteBtn.addEventListener('click', () => {
  const id = document.getElementById('giftId').value;
  if (id) deleteGift(id, () => backdrop.classList.remove('is-open'));
});

async function deleteGift(id, afterDelete) {
  if (!confirm('Delete this gift? This cannot be undone.')) return;

  if (db) {
    try {
      const { error } = await db.from('gifts').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      alert('Could not delete: ' + err.message);
      return;
    }
  } else {
    const idx = demoGifts.findIndex((g) => g.id === id);
    if (idx !== -1) demoGifts.splice(idx, 1);
  }

  if (afterDelete) afterDelete();
  init();
}
