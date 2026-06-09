/* ══════════════════════════════════════════════════════
   SMART-FLIP 5.0 — script.js  v0.4.1
   Split-Layout Flipbook Reader
   ══════════════════════════════════════════════════════ */

'use strict';

/* ─── CONSTANTS ─── */
const DB_NAME   = 'FlipbookCache3';  // bumped: SCALE changed
const DB_VER    = 1;
const STORE     = 'pages';
const SCALE     = 2.0;       // higher = sharper at zoom, more memory
const INITIAL   = 6;         // pages rendered before showing book
const FLIP_MS   = 480;
const ZOOM_MIN  = 0.5;
const ZOOM_MAX  = 2;         // max 200%
const ZOOM_STEP = 0.25;
const HINT_MS   = 2200;

/* ─── DOM ─── */
const app        = document.getElementById('app');
const topbar     = document.getElementById('topbar');
const siteName   = document.getElementById('siteName');
const flipPane   = document.getElementById('flipPane');
const welcome    = document.getElementById('welcome');
const flLoader   = document.getElementById('flLoader');
const flTitle    = document.getElementById('flTitle');
const flFill     = document.getElementById('flFill');
const flDetail   = document.getElementById('flDetail');
const stage      = document.getElementById('stage');
const zoomOuter  = document.getElementById('zoomOuter');
const bookEl     = document.getElementById('book');
const pgL        = document.getElementById('pgL');
const pgR        = document.getElementById('pgR');
const spineEl    = bookEl.querySelector('.spine');
const flipper    = document.getElementById('flipper');
const fFront     = document.getElementById('fFront');
const fBack      = document.getElementById('fBack');
const toolbar    = document.getElementById('toolbar');
const btnFirst   = document.getElementById('btnFirst');
const btnPrev    = document.getElementById('btnPrev');
const pgCounter  = document.getElementById('pgCounter');
const btnNext    = document.getElementById('btnNext');
const btnLast    = document.getElementById('btnLast');
const btnThumb   = document.getElementById('btnThumb');
const btnZoomOut = document.getElementById('btnZoomOut');
const zoomLabel  = document.getElementById('zoomLabel');
const btnZoomIn  = document.getElementById('btnZoomIn');
const btnExpand  = document.getElementById('btnExpand');
const bgProgress = document.getElementById('bgProgress');
const bgText     = document.getElementById('bgText');
const mobileBack = document.getElementById('mobileBack');
const catPane    = document.getElementById('catPane');
const catSub     = document.getElementById('catSub');
const cpLoading  = document.getElementById('cpLoading');
const cpError    = document.getElementById('cpError');
const stateHint  = document.getElementById('stateHint');
const bookGrid   = document.getElementById('bookGrid');
const btnLanjut  = document.getElementById('btnLanjut');
const thumbRow   = document.getElementById('thumbRow');
const thumbList  = document.getElementById('thumbList');
const zoomHintEl = document.getElementById('zoomHint');

/* ─── STATE ─── */
let pages       = [];        // dataURLs, 0-based
let totalPages  = 0;
let currentPage = 0;         // 0-based; on desktop always even
let isFlipping  = false;
let thumbsShown = false;
let zoom        = 1;
let panX        = 0;
let panY        = 0;
let isDragging  = false;
let dragStart   = { x: 0, y: 0, px: 0, py: 0 };
let lastPinch   = 0;
let hintTimer   = null;
let bgDone      = 0;
let currentPath = '';

function isMobile() { return window.innerWidth < 640; }
function pageStep()  { return isMobile() ? 1 : 2; }

/* ─── IndexedDB ─── */
let idb;
function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => e.target.result.createObjectStore(STORE);
    req.onsuccess  = e => { idb = e.target.result; res(idb); };
    req.onerror    = e => rej(e.target.error);
  });
}
function idbGet(key) {
  return new Promise((res, rej) => {
    const tx = idb.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e.target.error);
  });
}
function idbPut(key, val) {
  return new Promise((res, rej) => {
    const tx = idb.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(val, key);
    req.onsuccess = () => res();
    req.onerror   = e => rej(e.target.error);
  });
}

/* ─── CATALOG ─── */
async function loadCatalog() {
  try {
    const res = await fetch('config.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const cfg = await res.json();
    const books = (cfg.pdfs || []).map(f => ({
      path: `${cfg.booksFolder || 'books'}/${f}`,
      title: f.replace(/\.pdf$/i,'').replace(/[-_]/g,' ')
    }));
    if (cfg.subtitle) siteName.textContent = cfg.subtitle;
    renderCatalog(books);
  } catch(e) {
    cpLoading.style.display = 'none';
    cpError.style.display = 'flex';
    stateHint.textContent = e.message.includes('404') || e.message.includes('fetch')
      ? 'config.json tidak ditemukan. Jalankan scan_books.py atau GitHub Actions.'
      : e.message;
  }
}

function renderCatalog(books) {
  cpLoading.style.display = 'none';
  catSub.textContent = `${books.length} buku tersedia`;
  if (!books.length) {
    cpError.style.display = 'flex';
    stateHint.textContent = 'Belum ada buku di folder books/.';
    return;
  }
  bookGrid.innerHTML = '';
  books.forEach((b, i) => {
    const card = document.createElement('div');
    card.className = 'book-card';
    card.style.animationDelay = `${i * 0.04}s`;
    card.dataset.path  = b.path;
    card.dataset.title = b.title;
    card.innerHTML = `<div class="bc-thumb" id="thumb-${i}">
        <canvas class="bc-cover" id="cover-${i}" style="display:none"></canvas>
        <span class="bc-thumb-icon" id="icon-${i}">📄</span>
      </div>
      <div class="bc-body"><div class="bc-title">${escHtml(b.title)}</div></div>`;
    card.addEventListener('click', () => {
      document.querySelectorAll('.book-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      openBook(b.path, b.title);
    });
    bookGrid.appendChild(card);
    // Render cover async
    renderCover(b.path, i);
  });
  // Auto-open first book on desktop
  if (!isMobile() && books.length) {
    setTimeout(() => bookGrid.firstElementChild.click(), 300);
  }
}

/* ─── RENDER PDF COVER ─── */
async function renderCover(path, idx) {
  try {
    const pdf = await pdfjsLib.getDocument(path).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.4 });
    const canvas = document.getElementById(`cover-${idx}`);
    if (!canvas) return;
    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    canvas.style.display = 'block';
    const icon = document.getElementById(`icon-${idx}`);
    if (icon) icon.style.display = 'none';
  } catch(e) { /* cover tidak tersedia, tetap tampilkan ikon */ }
}

/* ─── OPEN BOOK ─── */
async function openBook(path, title) {
  if (path === currentPath) return;
  currentPath = path;

  welcome.style.display   = 'none';
  stage.classList.remove('active');
  toolbar.classList.remove('active');
  flLoader.classList.add('active');
  flTitle.textContent = title;
  flDetail.textContent = 'Mempersiapkan…';
  flFill.style.width = '0%';

  if (isMobile()) flipPane.classList.add('active');
  btnLanjut.disabled = false;

  pages = []; currentPage = 0; bgDone = 0; isFlipping = false;
  resetZoom(false);
  thumbList.innerHTML = '';
  thumbRow.classList.remove('active');
  thumbsShown = false;

  try {
    await openDB();
    const headRes = await fetch(path, { method: 'HEAD' }).catch(() => null);
    const cLen    = headRes ? (headRes.headers.get('Content-Length') || '0') : '0';
    const cached  = await idbGet(`meta:${path}`);
    const hitCache = cached && cached.cLen === cLen && cached.total > 0
                     && cached.scale === SCALE; // invalidate if scale changed

    if (hitCache) {
      totalPages = cached.total;
      await loadFromCache(path);
    } else {
      await renderPDF(path, cLen);
    }
  } catch(e) {
    flLoader.classList.remove('active');
    welcome.style.display = '';
    alert('Gagal memuat buku: ' + e.message);
    currentPath = '';
    btnLanjut.disabled = true;
  }
}

/* ─── RENDER PDF ─── */
async function renderPDF(path, cLen) {
  const pdf = await pdfjsLib.getDocument(path).promise;
  totalPages = pdf.numPages;
  await idbPut(`meta:${path}`, { cLen, total: totalPages, scale: SCALE });

  pages = new Array(totalPages).fill(null);
  const initCount = Math.min(INITIAL, totalPages);

  for (let i = 1; i <= initCount; i++) {
    const url = await renderPage(pdf, i);
    pages[i - 1] = url;
    await idbPut(`${path}:${i}`, url);
    flFill.style.width = `${(i / initCount) * 100}%`;
    flDetail.textContent = `Memuat halaman ${i} / ${totalPages}…`;
  }

  showBook();

  bgText.textContent = `Memuat ${initCount + 1}/${totalPages}…`;
  for (let i = initCount + 1; i <= totalPages; i++) {
    const url = await renderPage(pdf, i);
    pages[i - 1] = url;
    await idbPut(`${path}:${i}`, url);
    bgDone = i;
    bgText.textContent = `Memuat ${i}/${totalPages}…`;
    if (thumbsShown) appendThumb(i - 1, url);
  }
  bgText.textContent = `✓ ${totalPages} halaman siap`;
}

async function renderPage(pdf, num) {
  const page = await pdf.getPage(num);
  const vp   = page.getViewport({ scale: SCALE });
  const canvas = document.createElement('canvas');
  canvas.width  = vp.width;
  canvas.height = vp.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  return canvas.toDataURL('image/jpeg', 0.92);
}

async function loadFromCache(path) {
  flDetail.textContent = 'Memuat dari cache…';
  pages = new Array(totalPages).fill(null);
  const initCount = Math.min(INITIAL, totalPages);

  for (let i = 1; i <= initCount; i++) {
    pages[i - 1] = await idbGet(`${path}:${i}`);
    flFill.style.width = `${(i / initCount) * 100}%`;
    flDetail.textContent = `Cache ${i} / ${totalPages}…`;
  }

  showBook();

  for (let i = initCount + 1; i <= totalPages; i++) {
    pages[i - 1] = await idbGet(`${path}:${i}`);
    bgDone = i;
    bgText.textContent = `Cache ${i}/${totalPages}…`;
    if (thumbsShown) appendThumb(i - 1, pages[i - 1]);
  }
  bgText.textContent = `✓ ${totalPages} halaman siap`;
}

function showBook() {
  flLoader.classList.remove('active');
  stage.classList.add('active');
  toolbar.classList.add('active');
  buildBook();
  renderView();
  showHint();
}

/* ─── BOOK LAYOUT ─── */
function buildBook() {
  const mobile = isMobile();
  const stageW = stage.offsetWidth  - (mobile ? 16 : 48);
  const stageH = stage.offsetHeight - 32;
  const img = new Image();
  img.src = pages[0] || pages.find(p => p);
  if (!img.src) return;

  img.onload = () => {
    // Natural page size in CSS pixels
    const pgW0  = img.naturalWidth  / SCALE;
    const pgH0  = img.naturalHeight / SCALE;
    const ratio = pgH0 / pgW0;

    let w, h;
    if (mobile) {
      // Single-page: fill the full stage width
      w = stageW;
      h = w * ratio;
      if (h > stageH) { h = stageH; w = h / ratio; }
      // Hide right page + spine for mobile
      pgR.style.display    = 'none';
      spineEl.style.display = 'none';
    } else {
      // Two-page spread: each page is half the stage
      const maxW = Math.floor(stageW / 2) - 6;
      w = maxW; h = w * ratio;
      if (h > stageH) { h = stageH; w = h / ratio; }
      pgR.style.display    = '';
      spineEl.style.display = '';
    }

    w = Math.floor(w); h = Math.floor(h);
    pgL.style.width  = pgR.style.width  = `${w}px`;
    pgL.style.height = pgR.style.height = `${h}px`;
    flipper.style.width  = fFront.style.width  = fBack.style.width  = `${w}px`;
    flipper.style.height = fFront.style.height = fBack.style.height = `${h}px`;
  };
}

/* ─── RENDER VIEW ─── */
// currentPage is always the 0-based index of the page shown on the LEFT (or only, on mobile)
function renderView() {
  const mobile = isMobile();
  const left   = currentPage;
  const right  = mobile ? -1 : left + 1;

  setPageImg(pgL, pages[left]);
  setPageImg(pgR, right >= 0 ? (pages[right] || null) : null);

  if (mobile) {
    pgCounter.textContent = `${left + 1} / ${totalPages}`;
    btnFirst.disabled = btnPrev.disabled = left === 0;
    btnLast.disabled  = btnNext.disabled = left >= totalPages - 1;
  } else {
    const showRight = right < totalPages;
    pgCounter.textContent = `${left + 1}${showRight ? '–' + (right + 1) : ''} / ${totalPages}`;
    btnFirst.disabled = btnPrev.disabled = left === 0;
    btnLast.disabled  = btnNext.disabled = right >= totalPages - 1;
  }
  updateThumbActive();
}

function setPageImg(el, src) {
  if (!src) { el.innerHTML = ''; el.style.background = 'var(--bg3)'; return; }
  el.style.background = '';
  el.innerHTML = `<img src="${src}" alt="" draggable="false">`;
}

/* ─── NAVIGATION ─── */
function navigate(targetPage) {
  if (isFlipping) return;
  const mobile = isMobile();

  // Clamp
  targetPage = Math.max(0, Math.min(totalPages - 1, targetPage));
  // On desktop snap to even (left pages are always even-indexed)
  if (!mobile && targetPage % 2 !== 0) targetPage--;
  if (targetPage === currentPage) return;

  const forward = targetPage > currentPage;
  isFlipping = true;

  if (!mobile) {
    // 3D flip animation
    if (forward) {
      setFaceImg(fFront, pages[currentPage + 1] || null);
      setFaceImg(fBack,  pages[targetPage]);
      flipper.style.transition = 'none';
      flipper.style.transform  = 'none';
      void flipper.offsetWidth;
      flipper.style.transition = `transform ${FLIP_MS}ms cubic-bezier(.645,.045,.355,1)`;
      flipper.style.transform  = 'rotateY(-180deg)';
    } else {
      setFaceImg(fFront, pages[targetPage + 1] || null);
      setFaceImg(fBack,  pages[currentPage]);
      flipper.style.transition = 'none';
      flipper.style.transform  = 'rotateY(-180deg)';
      void flipper.offsetWidth;
      flipper.style.transition = `transform ${FLIP_MS}ms cubic-bezier(.645,.045,.355,1)`;
      flipper.style.transform  = 'none';
    }
    setTimeout(() => {
      flipper.style.transition = 'none';
      flipper.style.transform  = 'none';
      currentPage = targetPage;
      isFlipping  = false;
      renderView();
    }, FLIP_MS);
  } else {
    // Mobile: simple fade / instant
    currentPage = targetPage;
    isFlipping  = false;
    renderView();
  }
}

function setFaceImg(el, src) {
  if (!src) { el.innerHTML = ''; return; }
  el.innerHTML = `<img src="${src}" alt="" draggable="false">`;
}

/* ─── THUMBNAILS ─── */
function toggleThumbs() {
  thumbsShown = !thumbsShown;
  thumbRow.classList.toggle('active', thumbsShown);
  if (thumbsShown && thumbList.children.length === 0) buildThumbs();
  btnThumb.style.background = thumbsShown ? 'var(--terra)' : '';
  btnThumb.style.color      = thumbsShown ? '#fff' : '';
}
function buildThumbs() {
  thumbList.innerHTML = '';
  for (let i = 0; i < totalPages; i++) appendThumb(i, pages[i]);
  updateThumbActive();
}
function appendThumb(i, src) {
  if (thumbList.querySelector(`[data-idx="${i}"]`)) {
    const el = thumbList.querySelector(`[data-idx="${i}"] img`);
    if (el && src) el.src = src;
    return;
  }
  const item = document.createElement('div');
  item.className = 'thumb-item'; item.dataset.idx = i;
  item.innerHTML = src
    ? `<img src="${src}" alt=""><div class="tn-num">${i + 1}</div>`
    : `<div style="height:72px;width:50px;display:flex;align-items:center;justify-content:center;font-size:10px">${i+1}</div>`;
  item.addEventListener('click', () => navigate(isMobile() ? i : Math.floor(i / 2) * 2));
  thumbList.appendChild(item);
}
function updateThumbActive() {
  const left  = currentPage;
  const right = isMobile() ? -1 : left + 1;
  thumbList.querySelectorAll('.thumb-item').forEach(el => {
    const idx = parseInt(el.dataset.idx);
    el.classList.toggle('active', idx === left || idx === right);
  });
  const act = thumbList.querySelector('.thumb-item.active');
  if (act) act.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
}

/* ─── ZOOM ─── */
function applyZoom(newZoom, cx, cy) {
  const prev = zoom;
  zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
  if (cx !== undefined) {
    const ratio = zoom / prev;
    panX = cx - ratio * (cx - panX);
    panY = cy - ratio * (cy - panY);
  }
  clampPan();
  updateTransform();
  zoomLabel.textContent = Math.round(zoom * 100) + '%';
  btnZoomIn.disabled  = zoom >= ZOOM_MAX;
  btnZoomOut.disabled = zoom <= ZOOM_MIN;
}
function resetZoom(animate = true) {
  zoom = 1; panX = 0; panY = 0;
  if (!animate) {
    const bw = bookEl.parentElement;
    bw.style.transition = 'none';
    void bw.offsetWidth;
  }
  updateTransform();
  zoomLabel.textContent = '100%';
  btnZoomIn.disabled  = false;
  btnZoomOut.disabled = false;
  zoomOuter.classList.remove('zoomed');
}
function updateTransform() {
  bookEl.parentElement.style.transform =
    `translate(${panX}px,${panY}px) scale(${zoom})`;
  zoomOuter.classList.toggle('zoomed', zoom > 1);
}
function clampPan() {
  const ex = Math.max(0, zoom - 1);
  const sw = stage.offsetWidth  * ex * 0.5;
  const sh = stage.offsetHeight * ex * 0.5;
  panX = Math.max(-sw, Math.min(sw, panX));
  panY = Math.max(-sh, Math.min(sh, panY));
}

/* ─── EVENTS: ZOOM + PAN ─── */
zoomOuter.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = zoomOuter.getBoundingClientRect();
  applyZoom(zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP),
    e.clientX - rect.left, e.clientY - rect.top);
  showHint();
}, { passive: false });

zoomOuter.addEventListener('dblclick', e => {
  if (zoom > 1) resetZoom();
  else {
    const rect = zoomOuter.getBoundingClientRect();
    applyZoom(2, e.clientX - rect.left, e.clientY - rect.top);
  }
});

zoomOuter.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  isDragging = true;
  dragStart = { x: e.clientX, y: e.clientY, px: panX, py: panY };
  zoomOuter.classList.add('panning');
});
window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  panX = dragStart.px + (e.clientX - dragStart.x);
  panY = dragStart.py + (e.clientY - dragStart.y);
  clampPan(); updateTransform();
});
window.addEventListener('mouseup', () => {
  isDragging = false;
  zoomOuter.classList.remove('panning');
});

// Pinch zoom (mobile)
zoomOuter.addEventListener('touchstart', e => {
  if (e.touches.length === 2) {
    lastPinch = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY);
  }
}, { passive: true });
zoomOuter.addEventListener('touchmove', e => {
  if (e.touches.length === 2) {
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY);
    const mid  = {
      x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
      y: (e.touches[0].clientY + e.touches[1].clientY) / 2
    };
    const rect = zoomOuter.getBoundingClientRect();
    applyZoom(zoom * (dist / lastPinch), mid.x - rect.left, mid.y - rect.top);
    lastPinch = dist;
    e.preventDefault();
  }
}, { passive: false });

// Touch swipe for page navigation (single-touch, no zoom)
let touchStartX = 0;
zoomOuter.addEventListener('touchstart', e => {
  if (e.touches.length === 1) touchStartX = e.touches[0].clientX;
}, { passive: true });
zoomOuter.addEventListener('touchend', e => {
  if (zoom > 1) return; // don't swipe when zoomed
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) dx < 0 ? navigate(currentPage + pageStep()) : navigate(currentPage - pageStep());
}, { passive: true });

/* ─── TOOLBAR EVENTS ─── */
btnFirst.addEventListener('click',  () => navigate(0));
btnPrev.addEventListener('click',   () => navigate(currentPage - pageStep()));
btnNext.addEventListener('click',   () => navigate(currentPage + pageStep()));
btnLast.addEventListener('click',   () => navigate(isMobile() ? totalPages - 1 : Math.floor((totalPages - 1) / 2) * 2));
btnThumb.addEventListener('click',  toggleThumbs);
btnZoomIn.addEventListener('click', () => applyZoom(zoom + ZOOM_STEP));
btnZoomOut.addEventListener('click',() => applyZoom(zoom - ZOOM_STEP));
btnExpand.addEventListener('click', () => {
  app.classList.toggle('expanded');
  btnExpand.textContent = app.classList.contains('expanded') ? '⤡' : '⤢';
  setTimeout(buildBook, 60);
});
btnLanjut.addEventListener('click', () => {
  app.classList.add('expanded');
  btnExpand.textContent = '⤡';
  setTimeout(buildBook, 60);
});

/* ─── MOBILE BACK ─── */
mobileBack.addEventListener('click', () => {
  flipPane.classList.remove('active');
  welcome.style.display = '';
  stage.classList.remove('active');
  toolbar.classList.remove('active');
  flLoader.classList.remove('active');
  currentPath = '';
  btnLanjut.disabled = true;
  document.querySelectorAll('.book-card').forEach(c => c.classList.remove('active'));
});

/* ─── KEYBOARD ─── */
document.addEventListener('keydown', e => {
  if (!pages.length) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigate(currentPage + pageStep());
  if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   navigate(currentPage - pageStep());
  if (e.key === '+' || e.key === '=') applyZoom(zoom + ZOOM_STEP);
  if (e.key === '-')                  applyZoom(zoom - ZOOM_STEP);
  if (e.key === '0')                  resetZoom();
  if (e.key === 'f' || e.key === 'F') { app.classList.toggle('expanded'); setTimeout(buildBook, 60); }
});

/* ─── WINDOW RESIZE ─── */
// Rebuild book if switching between mobile/desktop
let lastMobile = isMobile();
window.addEventListener('resize', () => {
  const nowMobile = isMobile();
  if (nowMobile !== lastMobile) {
    lastMobile = nowMobile;
    if (pages.length) {
      // Snap currentPage to even if switching to desktop
      if (!nowMobile && currentPage % 2 !== 0) currentPage--;
      buildBook();
      renderView();
    }
  }
}, { passive: true });

/* ─── SCROLL TOPBAR ─── */
window.addEventListener('scroll', () => {
  topbar.classList.toggle('scrolled', window.scrollY > 4);
}, { passive: true });

/* ─── ZOOM HINT ─── */
function showHint() {
  zoomHintEl.classList.add('show');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => zoomHintEl.classList.remove('show'), HINT_MS);
}

/* ─── HELPERS ─── */
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─── INIT ─── */
(async () => { await loadCatalog(); })();
