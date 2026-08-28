/* ============================================================
   home-photos.js
   Loads the couple photo (from `settings.couple_photo_id`) and
   each person's photo (from `us.photo_id`, matched by name) for
   the Home page, and wires up click-to-change on all three using
   the shared media picker (js/media-picker.js).
============================================================ */

const COUPLE_PLACEHOLDER = 'https://placehold.co/300x300/e8b4c0/4a1f2b?text=You+%26+Me';
const PERSON_PLACEHOLDER = 'https://placehold.co/208x208/f4dde5/4a1f2b?text=%F0%9F%91%A4';

// Maps each Home-page avatar to the matching row in the `us` table by
// name — the Us page's profile cards read the exact same photo_id, so
// changing it here updates both pages.
const PERSON_NAMES = {
  person1: 'Ye Naing',
  person2: 'Thaddar Ye Naing Khit',
};

async function loadHomePhotos() {
  const settingsRows = await loadTable('settings', [{ id: true, media: null }], { select: '*, media(url)' });
  const settings = settingsRows[0];
  document.getElementById('couplePhotoImg').src = settings?.media?.url || COUPLE_PLACEHOLDER;

  const people = await loadTable('us', [], { select: '*, media(url)' });
  Object.entries(PERSON_NAMES).forEach(([key, name]) => {
    const person = people.find((p) => p.name === name);
    document.getElementById(key + 'Img').src = person?.media?.url || PERSON_PLACEHOLDER;
  });
}
loadHomePhotos();

// ---- Couple photo: click to change ------------------------------------------------
document.getElementById('couplePhotoFrame').addEventListener('click', () => {
  openMediaPicker(async ({ id, url }) => {
    document.getElementById('couplePhotoImg').src = url;
    if (db) {
      try {
        const { error } = await db.from('settings').update({ couple_photo_id: id }).eq('id', true);
        if (error) throw error;
      } catch (err) {
        alert('Could not save: ' + err.message);
      }
    }
  });
});

// ---- Person photos: click to change ------------------------------------------------
Object.entries(PERSON_NAMES).forEach(([key, name]) => {
  document.getElementById(key + 'Avatar').addEventListener('click', () => {
    openMediaPicker(async ({ id, url }) => {
      document.getElementById(key + 'Img').src = url;
      if (db) {
        try {
          const { error } = await db.from('us').update({ photo_id: id }).eq('name', name);
          if (error) throw error;
        } catch (err) {
          alert('Could not save: ' + err.message);
        }
      }
    });
  });
});
