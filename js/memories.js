/* ============================================================
   memories.js
   Renders the reverse-chronological timeline and handles the
   "add new memory" form — which doubles as the "edit memory"
   form when opened from an expanded card's Edit button.

   DATA SHAPE expected per memory (matches the `memories` table
   in supabase/schema.sql, with `places` joined in for the name):
   { id, title, date, description, is_milestone, location_id,
     media: { url }, places: { name } }
============================================================ */

// ---- Demo data (used until Supabase is configured) ----------------
const demoMemories = [
  {
    id: 'demo-1',
    title: 'Our Rings',
    date: '2026-07-24',
    description: 'Our first rings together. Gift for our first anniversary.',
    is_milestone: false,
    location_id: null,
    media: { id: 'demo-media-1', url: 'https://placehold.co/400x300/e8b4c0/4a1f2b?text=Our+Rings' },
    places: { name: 'Bugis' },
  },
  {
    id: 'demo-2',
    title: 'Koko Graduation',
    date: '2026-07-11',
    description: 'Celebrating a big milestone together.',
    is_milestone: false,
    location_id: null,
    media: null,
    places: null,
  },
  {
    id: 'demo-3',
    title: 'First Anniversary',
    date: '2026-06-06',
    description: 'One whole year with you, and still choosing you every day.',
    is_milestone: true,
    location_id: null,
    media: { id: 'demo-media-3', url: 'https://placehold.co/400x300/e8b4c0/4a1f2b?text=First+Anniversary' },
    places: null,
  },
  {
    id: 'demo-4',
    title: 'New Year',
    date: '2025-12-31',
    description: 'Counting down to midnight together.',
    is_milestone: false,
    location_id: null,
    media: null,
    places: null,
  },
];

const timelineRoot = document.getElementById('timelineRoot');

// Keep the last-loaded list around so Edit buttons can look up full
// record data by id without a fresh network call.
let currentMemories = [];

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function renderTimeline(memories) {
  currentMemories = memories;

  if (!memories.length) {
    timelineRoot.innerHTML = '<p class="empty-state">No memories yet — add your first one with the + button.</p>';
    return;
  }

  // Newest first.
  const sorted = [...memories].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Group by year.
  const byYear = new Map();
  sorted.forEach((m) => {
    const year = new Date(m.date + 'T00:00:00').getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(m);
  });

  let html = '';
  let rowIndex = 0;

  byYear.forEach((items, year) => {
    html += `<div class="timeline-year">${year}</div>`;
    items.forEach((m) => {
      const align = rowIndex % 2 === 0 ? 'align-right' : 'align-left';
      rowIndex++;

      const photoHtml = m.media?.url
        ? `<img src="${m.media.url}" alt="${m.title}">`
        : '';

      const locationHtml = m.places?.name
        ? `<p class="memory-location">Location: ${m.places.name}</p>`
        : '';

      const descHtml = m.description
        ? `<p class="memory-desc">&ldquo;${m.description}&rdquo;</p>`
        : '';

      const milestoneClass = m.is_milestone ? ' is-milestone' : '';
      const milestoneBadge = m.is_milestone
        ? `<span class="milestone-badge" title="Milestone"><svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8L5.7 21l1.7-7L2 9.2l7.1-.6L12 2z"/></svg></span>`
        : '';

      html += `
        <div class="timeline-row ${align}">
          ${align === 'align-right' ? `<div class="timeline-date">${formatDateLabel(m.date)}</div>` : ''}
          <div class="memory-card${milestoneClass}" data-id="${m.id}" tabindex="0" role="button" aria-expanded="false">
            ${milestoneBadge}
            ${photoHtml}
            <div class="memory-title">${m.title}</div>
            <div class="memory-details">
              ${locationHtml}
              ${descHtml}
              <div class="card-actions">
                <button type="button" class="card-action-btn" data-action="edit" data-id="${m.id}">Edit</button>
                <button type="button" class="card-action-btn card-action-danger" data-action="delete" data-id="${m.id}">Delete</button>
              </div>
            </div>
          </div>
          ${align === 'align-left' ? `<div class="timeline-date">${formatDateLabel(m.date)}</div>` : ''}
        </div>
      `;
    });
  });

  timelineRoot.innerHTML = html;

  // Click (and Enter/Space for keyboard users) toggles the expanded state.
  timelineRoot.querySelectorAll('.memory-card').forEach((card) => {
    const toggle = () => {
      const isOpen = card.classList.toggle('is-open');
      card.setAttribute('aria-expanded', String(isOpen));
      setTimeout(updateMobileConnector, 320); // after the expand/collapse transition
    };
    card.addEventListener('click', (e) => {
      // Ignore clicks that landed on Edit/Delete — those have their own handlers.
      if (e.target.closest('.card-action-btn')) return;
      toggle();
    });
    card.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.card-action-btn')) {
        e.preventDefault();
        toggle();
      }
    });
  });

  // Edit / Delete buttons.
  timelineRoot.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const memory = currentMemories.find((m) => m.id === btn.dataset.id);
      if (memory) openMemoryModal(memory);
    });
  });
  timelineRoot.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteMemory(btn.dataset.id);
    });
  });

  updateMobileConnector();
}

// ---- Mobile: connecting curve between cards -------------------------------
// On narrow screens the timeline drops its central spine (see the
// max-width: 720px block in style.css) and instead draws one meandering
// line through the actual rendered card positions, computed here rather
// than hand-drawn, so it stays correct for any number of memories.
function updateMobileConnector() {
  const existing = document.getElementById('mobileTimelineSvg');

  const isMobile = window.matchMedia('(max-width: 720px)').matches;
  const cards = Array.from(timelineRoot.querySelectorAll('.memory-card'));

  if (!isMobile || cards.length < 2) {
    if (existing) existing.remove();
    return;
  }

  const rootRect = timelineRoot.getBoundingClientRect();
  const points = cards.map((card) => {
    const r = card.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - rootRect.left,
      y: r.top + r.height / 2 - rootRect.top,
    };
  });

  // A cubic bezier between each pair of points, with both control points
  // pinned to the vertical midpoint — this naturally produces a gentle
  // S-curve wherever consecutive cards sit on alternating sides.
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const midY = (p0.y + p1.y) / 2;
    d += ` C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`;
  }

  let svg = existing;
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'mobileTimelineSvg');
    svg.setAttribute('class', 'mobile-timeline-svg');
    timelineRoot.prepend(svg);
  }
  svg.setAttribute('width', rootRect.width);
  svg.setAttribute('height', rootRect.height);
  svg.setAttribute('viewBox', `0 0 ${rootRect.width} ${rootRect.height}`);
  svg.innerHTML = `<path d="${d}"></path>`;
}

// Recompute on resize (debounced) — both because the curve's pixel
// positions change, and because crossing the 720px breakpoint should
// add/remove it entirely.
let mobileConnectorResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(mobileConnectorResizeTimer);
  mobileConnectorResizeTimer = setTimeout(updateMobileConnector, 200);
});

async function init() {
  const memories = await loadTable('memories', demoMemories, {
    select: '*, media(id, url), places(name)',
    order: 'date',
    ascending: false,
  });
  renderTimeline(memories);
}
init();

// ---- Add / Edit memory form ------------------------------------------------
const openBtn = document.getElementById('openAddMemory');
const backdrop = document.getElementById('addMemoryBackdrop');
const cancelBtn = document.getElementById('cancelAddMemory');
const form = document.getElementById('addMemoryForm');
const modalTitle = document.getElementById('memoryModalTitle');
const submitBtn = document.getElementById('memorySubmitBtn');
const photoNote = document.getElementById('memPhotoNote');
const photoPreview = document.getElementById('memPhotoPreview');
const photoFileInput = document.getElementById('memPhoto');
const mediaIdField = document.getElementById('memMediaId');

function setMemPhotoPreview(url) {
  photoPreview.innerHTML = url ? `<img src="${url}" alt="">` : '';
}

// Opens the modal. Pass a memory object to pre-fill it for editing;
// call with no argument for the normal "add new" flow.
function openMemoryModal(memory = null) {
  form.reset();
  document.getElementById('memId').value = memory?.id ?? '';
  document.getElementById('memTitle').value = memory?.title ?? '';
  document.getElementById('memDate').value = memory?.date ?? '';
  document.getElementById('memLocation').value = memory?.places?.name ?? '';
  document.getElementById('memDesc').value = memory?.description ?? '';
  document.getElementById('memMilestone').checked = !!memory?.is_milestone;
  mediaIdField.value = memory?.media?.id ?? '';
  setMemPhotoPreview(memory?.media?.url ?? null);

  modalTitle.textContent = memory ? 'Edit memory' : 'Add new memory';
  submitBtn.textContent = memory ? 'Update' : 'Save';
  photoNote.style.display = memory ? 'block' : 'none';

  backdrop.classList.add('is-open');
}

openBtn.addEventListener('click', () => openMemoryModal());
cancelBtn.addEventListener('click', () => backdrop.classList.remove('is-open'));
backdrop.addEventListener('click', (e) => {
  if (e.target === backdrop) backdrop.classList.remove('is-open');
});

// "Choose from gallery" opens the shared media picker; picking a photo
// there sets the hidden media-id field directly (no upload needed) and
// clears any file staged in the upload input, so only one wins at submit.
document.getElementById('memChooseExisting').addEventListener('click', () => {
  openMediaPicker(({ id, url }) => {
    mediaIdField.value = id;
    photoFileInput.value = '';
    setMemPhotoPreview(url);
  });
});

// Picking a new file to upload instead should override any gallery choice.
photoFileInput.addEventListener('change', () => {
  const file = photoFileInput.files[0];
  if (!file) return;
  mediaIdField.value = '';
  setMemPhotoPreview(URL.createObjectURL(file));
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const editingId = document.getElementById('memId').value || null;
  const title = document.getElementById('memTitle').value.trim();
  const date = document.getElementById('memDate').value;
  const location = document.getElementById('memLocation').value.trim();
  const description = document.getElementById('memDesc').value.trim();
  const isMilestone = document.getElementById('memMilestone').checked;
  const photoFile = document.getElementById('memPhoto').files[0];
  const chosenMediaId = document.getElementById('memMediaId').value || null;

  if (!title || !date) return;

  if (db) {
    // ---- Real Supabase path ----
    try {
      let mediaId = undefined; // undefined = don't touch the existing media_id

      if (photoFile) {
        // A freshly uploaded file always wins over a gallery pick.
        const path = `memories/${Date.now()}-${photoFile.name}`;
        const { error: uploadError } = await db.storage.from('media').upload(path, photoFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = db.storage.from('media').getPublicUrl(path);

        const { data: mediaRow, error: mediaError } = await db
          .from('media')
          .insert({ title, url: publicUrlData.publicUrl })
          .select()
          .single();
        if (mediaError) throw mediaError;
        mediaId = mediaRow.id;
      } else if (chosenMediaId) {
        // Picked an existing photo from the gallery — no upload needed.
        mediaId = chosenMediaId;
      }

      // Keep the photo's own gallery date in sync with this memory's date,
      // so it doesn't have to be set separately on the Gallery page too.
      // mediaId is set here in every case where there's a linked photo to
      // sync — new upload, a gallery pick, or an unchanged existing link
      // (chosenMediaId still holds it) — and stays undefined only when
      // there's no photo at all.
      if (mediaId !== undefined) {
        await db.from('media').update({ date }).eq('id', mediaId);
      }

      let locationId = undefined; // undefined = don't touch existing location_id
      if (location) {
        const { data: existingPlace } = await db.from('places').select('id').eq('name', location).maybeSingle();
        if (existingPlace) {
          locationId = existingPlace.id;
        } else {
          const { data: newPlace, error: placeError } = await db
            .from('places')
            .insert({ name: location, latitude: 0, longitude: 0 }) // reposition later on the Places page
            .select()
            .single();
          if (placeError) throw placeError;
          locationId = newPlace.id;
        }
      } else if (editingId) {
        locationId = null; // location field was cleared during an edit
      }

      const payload = { title, date, description, is_milestone: isMilestone };
      if (mediaId !== undefined) payload.media_id = mediaId;
      if (locationId !== undefined) payload.location_id = locationId;

      if (editingId) {
        const { error } = await db.from('memories').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await db.from('memories').insert(payload);
        if (error) throw error;
      }
    } catch (err) {
      alert('Could not save to Supabase: ' + err.message);
      return;
    }
  } else {
    // ---- Demo fallback ----
    // A freshly uploaded file wins; otherwise, if a gallery photo was
    // chosen, reuse whatever the preview is currently showing (already
    // set to that photo's URL by the picker/file-input handlers above).
    const previewImg = photoPreview.querySelector('img');
    const newPhoto = photoFile
      ? { id: 'local-' + Date.now(), url: URL.createObjectURL(photoFile) }
      : (chosenMediaId && previewImg ? { id: chosenMediaId, url: previewImg.src } : undefined);
    const newPlace = location ? { name: location } : null;

    if (editingId) {
      const existing = demoMemories.find((m) => m.id === editingId);
      if (existing) {
        existing.title = title;
        existing.date = date;
        existing.description = description;
        existing.is_milestone = isMilestone;
        existing.places = newPlace;
        if (newPhoto) existing.media = newPhoto;
      }
    } else {
      demoMemories.push({
        id: 'local-' + Date.now(),
        title, date, description, is_milestone: isMilestone,
        media: newPhoto ?? null,
        places: newPlace,
      });
    }
  }

  form.reset();
  backdrop.classList.remove('is-open');
  init();
});

// ---- Delete ------------------------------------------------
async function deleteMemory(id) {
  if (!confirm('Delete this memory? This cannot be undone.')) return;

  if (db) {
    try {
      const { error } = await db.from('memories').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      alert('Could not delete: ' + err.message);
      return;
    }
  } else {
    const idx = demoMemories.findIndex((m) => m.id === id);
    if (idx !== -1) demoMemories.splice(idx, 1);
  }

  init();
}
