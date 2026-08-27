/* ============================================================
   us.js
   Renders the two profile cards from the `us` table, and the
   love-notes carousel (one note at a time, arrows to browse).
============================================================ */

// ---- Demo data ------------------------------------------------------
const demoUs = [
  { id: 'demo-1', name: 'Ye Naing', birthday: '2002-10-09', zodiac: 'Libra', blood: 'AB', favorite_food: 'Shan Noodles', favorite_color: 'Black', photo: null },
  { id: 'demo-2', name: 'Thaddar Ye Naing Khit', birthday: '2002-08-30', zodiac: 'Virgo', blood: 'O', favorite_food: null, favorite_color: 'Baby Pink', photo: null },
];

const demoLoveNotes = [
  { id: 'demo-1', number: 1, description: 'I like how you always take care of me' },
];

const personIconSvg = `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>`;

function formatBirthday(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

function renderProfiles(people) {
  const root = document.getElementById('profilesRoot');
  if (!people.length) {
    root.innerHTML = '<p class="empty-state">Profile info not set up yet.</p>';
    return;
  }

  const cards = people.map((p) => {
    const facts = [
      p.birthday ? `Birthday: ${formatBirthday(p.birthday)}` : null,
      p.zodiac ? `Zodiac: ${p.zodiac}` : null,
      p.blood ? `Blood: ${p.blood}` : null,
      p.favorite_food ? `Favorite Food: ${p.favorite_food}` : null,
      p.favorite_color ? `Favorite Color: ${p.favorite_color}` : null,
    ].filter(Boolean).map((line) => `<p>${line}</p>`).join('');

    const avatar = p.photo?.url
      ? `<img src="${p.photo.url}" alt="${p.name}">`
      : personIconSvg;

    return `
      <div class="profile-card">
        <div class="profile-avatar">${avatar}</div>
        <h2>${p.name}</h2>
        <div class="profile-facts">${facts}</div>
      </div>
    `;
  });

  // Heart divider between the two cards (only makes sense for exactly 2 people).
  const withDivider = cards.length === 2
    ? [cards[0], '<span class="profile-heart">&#10084;</span>', cards[1]]
    : cards;

  root.innerHTML = withDivider.join('');
}

async function initProfiles() {
  const people = await loadTable('us', demoUs, { select: '*, photo:media(url)' });
  renderProfiles(people);
}
initProfiles();

// ---- Love notes carousel ------------------------------------------
let loveNotes = [];
let currentNoteIndex = 0;

function renderCurrentNote() {
  const content = document.getElementById('loveNoteContent');
  const prevBtn = document.getElementById('prevNote');
  const nextBtn = document.getElementById('nextNote');

  if (!loveNotes.length) {
    content.innerHTML = '<p class="love-note-text">No notes written yet.</p>';
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  const note = loveNotes[currentNoteIndex];
  content.innerHTML = `
    <p class="love-note-number">#${note.number}</p>
    <p class="love-note-text">&ldquo;${note.description}&rdquo;</p>
  `;
  prevBtn.disabled = currentNoteIndex === 0;
  nextBtn.disabled = currentNoteIndex === loveNotes.length - 1;
}

async function initLoveNotes() {
  loveNotes = await loadTable('love_notes', demoLoveNotes, { order: 'number', ascending: true });
  currentNoteIndex = 0;
  renderCurrentNote();
}
initLoveNotes();

document.getElementById('prevNote').addEventListener('click', () => {
  if (currentNoteIndex > 0) { currentNoteIndex--; renderCurrentNote(); }
});
document.getElementById('nextNote').addEventListener('click', () => {
  if (currentNoteIndex < loveNotes.length - 1) { currentNoteIndex++; renderCurrentNote(); }
});
