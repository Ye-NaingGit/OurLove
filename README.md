# You & Me — relationship website

Static site (HTML/CSS/JS, no build step) for GitHub Pages, backed by
Supabase for everything dynamic. Built from your Figma design.

**Supabase is already connected** — `js/supabase-client.js` has your
project's URL and publishable key filled in, so every page reads and
writes your real data as soon as you open it (see "Connect Supabase"
below for the one thing to double check).

## Pages

| Page | What it does |
|---|---|
| **Home** (`index.html`) | Heart-framed photo, live "days together" counter from 6 June 2025 |
| **Memories** (`pages/memories.html`) | Reverse-chronological timeline branching off a central spine, milestone memories get a gold glow + shine, click a card to expand it with **Edit**/**Delete**, **+** adds a new one |
| **Places** (`pages/places.html`) | World map (Leaflet) with heart pins; click a pin for **Edit**/**Delete**; a side panel lists any **Unpinned Locations** (auto-created when a Memory names a place) — drag one onto the map, or tap it then tap the map, to set its spot |
| **Gallery** (`pages/gallery.html`) | Photo/video grid grouped by year; upload button adds media, a second button switches to **select mode** to delete several at once |
| **Gifts** (`pages/gifts.html`) | Present boxes that open on hover/click, with **Edit**/**Delete** inside once open |
| **Our Firsts** (`pages/firsts.html`) | Corkboard of pinned notes — click any note to **edit or delete** it; link a note to a Memory and its date/photo fill in automatically |
| **Future Plans** (`pages/future.html`) | Notebook list — click a line to strike it through; the eraser button switches to **erase mode**, where tapping a line deletes it; pen button adds a new one-sentence plan |
| **Us** (`pages/us.html`) | Two profile cards side by side, plus the love-notes carousel (arrows to browse) below them |

Every page also works with realistic **demo data** if Supabase is ever
unreachable (e.g. you haven't run the schema yet) — it just falls back
automatically, so the site never looks broken.

## Run it locally

**VS Code Live Server (recommended)**
1. Install the "Live Server" extension.
2. Right-click `index.html` → "Open with Live Server".

**Or plain Python**
```bash
cd love-website
python3 -m http.server 5500
```
Then open `http://localhost:5500`. Use a local server rather than
double-clicking the file — browsers block Supabase's requests from
`file://` origins.

## Connect Supabase

You've already run the schema once, so most of this is done. Two things
worth checking:

1. **Run the migration at the bottom of `supabase/schema.sql`.** It's a
   single `create policy` statement added after your first run, needed
   for the Gallery's new "delete selected" feature to also remove the
   file from storage (not just its database row). Everything above that
   line already exists in your project, so only run that last block —
   re-running the whole file will error on tables that already exist.

2. **The URL you gave me needed a small correction.** You shared
   `https://kpmblhjxpqhzqcognpys.supabase.co/rest/v1/`, which is the
   *REST API* URL — but the JS client wants just the project URL
   without the `/rest/v1/` part, since it appends that itself. I've
   already set `js/supabase-client.js` to:
   ```js
   const SUPABASE_URL = 'https://kpmblhjxpqhzqcognpys.supabase.co';
   const SUPABASE_ANON_KEY = 'sb_publishable_h0zKEZjYtubWu7KSbYHEug_NB-ndojo';
   ```
   (Your key is in Supabase's newer `sb_publishable_...` format rather
   than the older anon JWT — that's fine, it works exactly the same way
   here, just double-check in Project Settings → API that this is still
   the current publishable key if anything stops loading.)

**On security:** the schema's starter policies allow anyone with this
key (i.e. anyone with your site URL) to read *and write* every table.
Fine for a two-person private site nobody else knows the URL to, but it
isn't locked to just the two of you. The straightforward upgrade later
is to keep the read policies, drop the write policies, and write
through a Supabase Edge Function that checks a shared passphrase first
— not needed to use the site today.

## Deploy to GitHub Pages

1. Push this folder to a GitHub repo.
2. Repo → Settings → Pages → Source: deploy from branch → `main`, `/ (root)`.
3. Live at `https://<username>.github.io/<repo-name>/`.

(Cloudflare Pages is the other free option worth knowing about — slightly
faster global loads and instant rollbacks — but GitHub Pages is simpler
to set up and plenty for this site.)

## How editing and deleting works

Every page follows the same underlying pattern, so once you've used one
the rest should feel familiar:

- **Memories, Gifts, Our Firsts** — the "add new" modal doubles as the
  "edit" modal. Opening it from an existing card/box/note pre-fills the
  form and adds a Delete button; opening it fresh (the **+** button)
  starts blank with no Delete button.
- **Places** — same idea, but you open the edit modal from a pin's
  popup instead of a card.
- **Gallery** — deleting is bulk-only (tap several, then confirm),
  since photos don't have individual detail views.
- **Future Plans** — deleting is a mode (eraser button), not a per-line
  button, to keep the notebook visually simple.

All deletes ask for confirmation first (a plain `confirm()` dialog) —
there's no undo, so that's the only safety net.

## Editing things yourself

- **Colors, fonts, spacing** — all in `css/style.css`, organized by
  section with comments.
- **Nav links** — edit the `NAV_LINKS` array at the top of `js/nav.js`
  once; every page picks it up automatically.
- **Anniversary date** — `js/main.js`, the `ANNIVERSARY` constant.
- **Demo data** — each page's `.js` file has a `demo___` array near the
  top; edit it directly to preview different content offline.

## Adding real photos to the Home page

Drop files into `assets/photos/` using these names (or edit the `src`
paths in `index.html`):
- `us.jpg` — the couple photo in the heart frame
- `person1.jpg`, `person2.jpg` — the two profile circles

Until real files exist, placeholder images show automatically so
nothing looks broken.

## What I'd extend first

1. **Lock down write access** once the site is live and she's found it
   — see the security note above.
2. **Us page profile photos** aren't wired to an upload button yet
   (your design just showed default gray avatars). The `us` table has
   a `photo_id` column ready for it — say the word and I'll add an
   upload control there matching the others.
3. **Gallery delete removes the storage file too**, but only for files
   uploaded after you run the migration above — anything already
   uploaded before that will have its database row deleted cleanly, but
   may leave an orphaned file in storage. Harmless (just uses a little
   storage space), but worth knowing.
