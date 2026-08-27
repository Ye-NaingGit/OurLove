/* ============================================================
   nav.js
   One shared nav, injected into every page.
   Edit NAV_LINKS here and every page updates automatically —
   you never need to touch the nav markup in individual HTML files.
============================================================ */

const NAV_LINKS = [
  { file: 'index.html',    label: 'Home',          isRoot: true },
  { file: 'memories.html', label: 'Memories' },
  { file: 'places.html',   label: 'Places' },
  { file: 'gallery.html',  label: 'Gallery' },
  { file: 'gifts.html',    label: 'Gifts' },
  { file: 'firsts.html',   label: 'Our Firsts' },
  { file: 'future.html',   label: 'Future Plans' },
  { file: 'us.html',       label: 'Us' },
];

(function renderNav() {
  const root = document.getElementById('navRoot');
  if (!root) return;

  // Pages inside /pages/ need "../index.html" for Home and bare filenames
  // for siblings; the root index.html needs "pages/xxx.html" for everything else.
  const inPagesFolder = window.location.pathname.includes('/pages/');
  const currentFile = window.location.pathname.split('/').filter(Boolean).pop() || 'index.html';

  const linksHtml = NAV_LINKS.map(({ file, label, isRoot }) => {
    let href;
    if (isRoot) {
      href = inPagesFolder ? '../index.html' : 'index.html';
    } else {
      href = inPagesFolder ? file : `pages/${file}`;
    }
    const isActive = currentFile === file;
    return `<a href="${href}"${isActive ? ' class="active"' : ''}>${label}</a>`;
  }).join('');

  root.innerHTML = `
    <div class="floaties" aria-hidden="true">
      <span class="floaty f1">&#10084;</span>
      <span class="floaty f2">&#10084;</span>
      <span class="floaty f3">&#10084;</span>
      <span class="floaty f4">&#10084;</span>
    </div>
    <button id="navToggle" class="nav-toggle" aria-expanded="false" aria-controls="siteNav" aria-label="Open menu">
      <svg viewBox="0 0 24 24" class="heart-icon"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    </button>
    <nav id="siteNav" class="site-nav">${linksHtml}</nav>
  `;

  const navToggle = document.getElementById('navToggle');
  const siteNav = document.getElementById('siteNav');

  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Click anywhere outside the panel/button to close it.
  document.addEventListener('click', (e) => {
    const clickedInside = siteNav.contains(e.target) || navToggle.contains(e.target);
    if (!clickedInside && siteNav.classList.contains('is-open')) {
      siteNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Escape key also closes it.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && siteNav.classList.contains('is-open')) {
      siteNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
})();
