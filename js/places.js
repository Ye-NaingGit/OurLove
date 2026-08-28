/* ============================================================
   places.js
   Renders the Leaflet map with a pin per located place, plus a
   side panel listing any place with no coordinates yet ("Unpinned
   Locations" — these are created automatically when you add a
   Memory with a location name from the Memories page). Drag one
   onto the map, or tap it then tap the map, to set its spot.

   A place's popup photo/link comes from whichever Memory has its
   location_id pointing at that place — the `places` table itself
   has no photo column, by design (see README).
============================================================ */

// ---- Demo data (used until Supabase is configured) ----------------
// Centered on Singapore since that's where the real pins will start.
const demoPlaces = [
  { id: 'demo-1', name: 'CapitaSpring', latitude: 1.2836, longitude: 103.8497 },
  { id: 'demo-2', name: 'Gardens by the Bay', latitude: 1.2816, longitude: 103.8636 },
  { id: 'demo-3', name: 'Bugis', latitude: 1.3006, longitude: 103.8560 },
  { id: 'demo-4', name: 'Marina Barrage', latitude: 0, longitude: 0 }, // unpinned, for demoing the side panel
];

const demoMemoriesForPlaces = [
  { id: 'dm-1', title: 'CapitaSpring', date: '2025-04-29', location_id: 'demo-1', media: { url: 'https://placehold.co/300x200/e8b4c0/4a1f2b?text=CapitaSpring' } },
  { id: 'dm-2', title: 'Our Rings', date: '2026-07-24', location_id: 'demo-3', media: null },
  { id: 'dm-3', title: 'Coffee Date', date: '2025-08-10', location_id: 'demo-3', media: null },
];

let map;
let placingMode = false;       // true while waiting for a map click to CREATE a new place
let placingForExistingId = null; // set while waiting for a map click to REPOSITION an existing place
let pendingLatLng = null;
let currentPlaces = [];
let markersById = new Map();

function heartDivIcon() {
  return L.divIcon({
    className: 'heart-pin',
    html: `<svg viewBox="0 0 24 24" width="30" height="30" style="filter:drop-shadow(0 3px 4px rgba(0,0,0,0.4))"><path fill="#E8637A" d="M12 21s-7.5-4.6-10.2-9.2C.3 9.1 1 5.6 4 4.2 6.4 3 9 4 12 7 15-4 17.6 3 19.6 4.2c3 1.4 3.7 4.9 2.2 7.6C19.5 16.4 12 21 12 21z"/></svg>`,
    iconSize: [30, 30],
    iconAnchor: [15, 28],
    popupAnchor: [0, -26],
  });
}

function popupHtml(place) {
  const photo = place.photo_url
    ? `<img src="${place.photo_url}" alt="${place.name}">`
    : '';
  const memories = place.linked_memories || [];
  const memoryLines = memories
    .map((m) => `<p class="place-date">${m.title} (${formatDate(m.date)})</p>`)
    .join('');
  const link = memories.length
    ? `<a href="memories.html">See ${memories.length > 1 ? 'these memories' : 'the memory'} &rarr;</a>`
    : '';
  return `
    <div class="place-popup" data-place-id="${place.id}">
      ${photo}
      <p class="place-name">${place.name}</p>
      ${memoryLines}
      ${link}
      <div class="popup-actions">
        <button type="button" class="popup-edit" data-id="${place.id}">Edit</button>
        <button type="button" class="popup-delete" data-id="${place.id}">Delete</button>
      </div>
    </div>
  `;
}

function isUnpinned(place) {
  // 0,0 (off the coast of Africa) is used as the "not placed yet" sentinel —
  // see the note in memories.js where these get created.
  return !place.latitude || !place.longitude;
}

function plotPlaces(places) {
  markersById.forEach((m) => map.removeLayer(m));
  markersById.clear();

  places.filter((p) => !isUnpinned(p)).forEach((place) => {
    const marker = L.marker([place.latitude, place.longitude], { icon: heartDivIcon() })
      .addTo(map)
      .bindPopup(popupHtml(place));
    markersById.set(place.id, marker);
  });
}

function renderUnpinnedPanel(places) {
  const panel = document.getElementById('unpinnedPanel');
  const list = document.getElementById('unpinnedList');
  const unpinned = places.filter(isUnpinned);

  if (!unpinned.length) {
    panel.style.display = 'none';
    return;
  }

  panel.style.display = 'block';
  list.innerHTML = unpinned.map((p) => `
    <div class="unpinned-item" draggable="true" data-id="${p.id}" data-name="${p.name}">
      ${p.name}
    </div>
  `).join('');

  list.querySelectorAll('.unpinned-item').forEach((item) => {
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', item.dataset.id);
    });
    // Tap-to-place alternative for touch/keyboard: tap the item, then tap the map.
    item.addEventListener('click', () => {
      placingForExistingId = item.dataset.id;
      setPlacingMode(true, `Tap the map to place "${item.dataset.name}"`);
    });
  });
}

// Combines places with every memory that links to them, so the popup
// can show photos/dates without the `places` table needing its own
// media column. A place can have any number of linked memories.
function attachMemoryInfo(places, memories) {
  const memoriesByLocationId = new Map();
  memories.forEach((m) => {
    if (!m.location_id) return;
    if (!memoriesByLocationId.has(m.location_id)) memoriesByLocationId.set(m.location_id, []);
    memoriesByLocationId.get(m.location_id).push(m);
  });

  return places.map((p) => {
    const linked = memoriesByLocationId.get(p.id) || [];
    const withPhoto = linked.find((m) => m.media?.url);
    return {
      ...p,
      linked_memories: linked,
      photo_url: withPhoto?.media?.url ?? null,
    };
  });
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

async function loadAndRender() {
  const [places, memories] = await Promise.all([
    loadTable('places', demoPlaces),
    loadTable('memories', demoMemoriesForPlaces, { select: 'id, title, date, location_id, media(url)' }),
  ]);

  currentPlaces = attachMemoryInfo(places, memories);
  plotPlaces(currentPlaces);
  renderUnpinnedPanel(currentPlaces);
}

async function initMap() {
  map = L.map('map').setView([1.29, 103.85], 11); // defaults to Singapore

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  await loadAndRender();

  // Click handling covers three modes: placing a brand-new pin,
  // repositioning an existing unpinned place, or (neither) doing nothing.
  map.on('click', async (e) => {
    if (placingForExistingId) {
      await repositionPlace(placingForExistingId, e.latlng);
      placingForExistingId = null;
      setPlacingMode(false);
      return;
    }
    if (placingMode) {
      pendingLatLng = e.latlng;
      resetPlaceModalForCreate();
      document.getElementById('coordsPreview').textContent =
        `Pin location: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
      document.getElementById('addPlaceBackdrop').classList.add('is-open');
      setPlacingMode(false);
    }
  });

  // Drag-and-drop from the Unpinned Locations panel onto the map.
  const mapEl = document.getElementById('map');
  mapEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    mapEl.classList.add('drop-target');
  });
  mapEl.addEventListener('dragleave', () => mapEl.classList.remove('drop-target'));
  mapEl.addEventListener('drop', async (e) => {
    e.preventDefault();
    mapEl.classList.remove('drop-target');
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    const rect = mapEl.getBoundingClientRect();
    const point = L.point(e.clientX - rect.left, e.clientY - rect.top);
    const latlng = map.containerPointToLatLng(point);
    await repositionPlace(id, latlng);
  });

  // Event delegation for popup Edit/Delete buttons, since Leaflet
  // (re)creates popup DOM each time one opens.
  mapEl.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.popup-edit');
    const deleteBtn = e.target.closest('.popup-delete');
    if (editBtn) {
      const place = currentPlaces.find((p) => p.id === editBtn.dataset.id);
      if (place) openPlaceModal(place);
    } else if (deleteBtn) {
      deletePlace(deleteBtn.dataset.id);
    }
  });
}

async function repositionPlace(id, latlng) {
  if (db && !String(id).startsWith('local-') && !String(id).startsWith('demo-')) {
    try {
      const { error } = await db.from('places').update({ latitude: latlng.lat, longitude: latlng.lng }).eq('id', id);
      if (error) throw error;
    } catch (err) {
      alert('Could not save position: ' + err.message);
      return;
    }
  } else {
    const place = demoPlaces.find((p) => p.id === id);
    if (place) { place.latitude = latlng.lat; place.longitude = latlng.lng; }
  }
  loadAndRender();
}

function setPlacingMode(on, hintText) {
  placingMode = on;
  const hint = document.getElementById('placingHint');
  hint.style.display = on ? 'block' : 'none';
  if (on && hintText) hint.textContent = hintText;
  document.getElementById('map').style.cursor = on ? 'crosshair' : '';
}

initMap();

// Populates the "related memories" checklist, checking off whichever
// memories are already linked to this place (selectedIds is an array —
// a place can now link any number of memories).
async function populateMemoryChecklist(selectedIds = []) {
  const memories = await loadTable('memories', demoMemoriesForPlaces, { select: 'id, title', order: 'date', ascending: false });
  const container = document.getElementById('placeMemoryChecklist');

  if (!memories.length) {
    container.innerHTML = '<p class="form-note" style="margin:0;">No memories yet.</p>';
    return;
  }

  container.innerHTML = memories.map((m) => `
    <label class="checklist-item">
      <input type="checkbox" value="${m.id}" ${selectedIds.includes(m.id) ? 'checked' : ''}>
      <span>${m.title}</span>
    </label>
  `).join('');
}

// ---- Add / edit place modal ------------------------------------------------
const openBtn = document.getElementById('openAddPlace');
const backdrop = document.getElementById('addPlaceBackdrop');
const cancelBtn = document.getElementById('cancelAddPlace');
const form = document.getElementById('addPlaceForm');
const modalTitle = document.getElementById('placeModalTitle');
const submitBtn = document.getElementById('placeSubmitBtn');
const deleteBtn = document.getElementById('deletePlaceBtn');

// Opens the modal for editing an existing place. Adding a *new* place
// instead goes through the "click the map" flow (see map.on('click')
// above), since a new place needs coordinates before the form makes sense.
async function openPlaceModal(place) {
  form.reset();
  document.getElementById('placeId').value = place.id;
  document.getElementById('placeName').value = place.name;
  document.getElementById('coordsPreview').textContent =
    `Current location: ${Number(place.latitude).toFixed(4)}, ${Number(place.longitude).toFixed(4)}`;

  const allMemories = await loadTable('memories', demoMemoriesForPlaces, { select: 'id, title, location_id' });
  const linkedIds = allMemories.filter((m) => m.location_id === place.id).map((m) => m.id);
  await populateMemoryChecklist(linkedIds);

  modalTitle.textContent = 'Edit place';
  submitBtn.textContent = 'Update';
  deleteBtn.style.display = 'inline-block';
  pendingLatLng = null; // editing uses the place's existing coords, not a fresh click

  backdrop.classList.add('is-open');
}

// Resets the modal to a blank "add new place" state — used right before
// showing it after a map click, so it never carries over a previous
// edit's title/fields.
function resetPlaceModalForCreate() {
  form.reset();
  document.getElementById('placeId').value = '';
  modalTitle.textContent = 'Add new place';
  submitBtn.textContent = 'Save';
  deleteBtn.style.display = 'none';
  populateMemoryChecklist([]);
}

openBtn.addEventListener('click', () => {
  setPlacingMode(true, 'Click anywhere on the map to drop a pin there.');
});
cancelBtn.addEventListener('click', () => {
  backdrop.classList.remove('is-open');
  pendingLatLng = null;
});
backdrop.addEventListener('click', (e) => {
  if (e.target === backdrop) backdrop.classList.remove('is-open');
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const editingId = document.getElementById('placeId').value || null;
  const name = document.getElementById('placeName').value.trim();
  const selectedMemoryIds = Array.from(
    document.querySelectorAll('#placeMemoryChecklist input:checked')
  ).map((cb) => cb.value);
  if (!name) return;
  if (!editingId && !pendingLatLng) return; // shouldn't happen, but guards against a stray submit

  if (db) {
    try {
      let placeId = editingId;
      if (editingId) {
        const { error } = await db.from('places').update({ name }).eq('id', editingId);
        if (error) throw error;
      } else {
        const { data: newPlace, error } = await db.from('places').insert({
          name, latitude: pendingLatLng.lat, longitude: pendingLatLng.lng,
        }).select().single();
        if (error) throw error;
        placeId = newPlace.id;
      }

      // Reconcile against whichever memories are currently linked: unlink
      // any that were unchecked, link any newly checked ones. This is what
      // lets one place have several memories instead of just one.
      const { data: currentlyLinked } = await db.from('memories').select('id').eq('location_id', placeId);
      const currentlyLinkedIds = (currentlyLinked || []).map((m) => m.id);

      const toUnlink = currentlyLinkedIds.filter((id) => !selectedMemoryIds.includes(id));
      const toLink = selectedMemoryIds.filter((id) => !currentlyLinkedIds.includes(id));

      if (toUnlink.length) await db.from('memories').update({ location_id: null }).in('id', toUnlink);
      if (toLink.length) await db.from('memories').update({ location_id: placeId }).in('id', toLink);
    } catch (err) {
      alert('Could not save to Supabase: ' + err.message);
      return;
    }
  } else {
    let placeId = editingId;
    if (editingId) {
      const place = demoPlaces.find((p) => p.id === editingId);
      if (place) place.name = name;
    } else {
      placeId = 'local-' + Date.now();
      demoPlaces.push({ id: placeId, name, latitude: pendingLatLng.lat, longitude: pendingLatLng.lng });
    }
    demoMemoriesForPlaces.forEach((m) => {
      if (selectedMemoryIds.includes(m.id)) m.location_id = placeId;
      else if (m.location_id === placeId) m.location_id = null;
    });
  }

  form.reset();
  backdrop.classList.remove('is-open');
  pendingLatLng = null;
  loadAndRender();
});

deleteBtn.addEventListener('click', () => {
  const id = document.getElementById('placeId').value;
  if (id) deletePlace(id, () => backdrop.classList.remove('is-open'));
});

async function deletePlace(id, afterDelete) {
  if (!confirm('Delete this place? Any memory linking to it will keep its date/photo but lose the map pin.')) return;

  if (db && !String(id).startsWith('local-') && !String(id).startsWith('demo-')) {
    try {
      const { error } = await db.from('places').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      alert('Could not delete: ' + err.message);
      return;
    }
  } else {
    const idx = demoPlaces.findIndex((p) => p.id === id);
    if (idx !== -1) demoPlaces.splice(idx, 1);
  }

  if (afterDelete) afterDelete();
  loadAndRender();
}
