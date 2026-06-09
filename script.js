/* ══════════════════════════════════════════════════════
   SMART-FLIP 5.0 — script.js  v0.7.2
   Lazy PDF renderer — no IndexedDB, in-memory Map cache
   ══════════════════════════════════════════════════════ */

'use strict';

/* ─── CONSTANTS ─── */
const SCALE     = 1.8;   // render quality (lower = faster initial load)
const BUFFER    = 4;     // pages pre-rendered ahead/behind current spread
const FLIP_MS   = 480;
const ZOOM_MIN  = 0.5;
const ZOOM_MAX  = 3.0;
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
let pdfDoc      = null;          // PDFDocumentProxy
let pageCache   = new Map();     // 1-based page num → dataURL string
let totalPages  = 0;
let currentPage = 0;             // 0-based; desktop always even
let currentPath = '';
let isFlipping  = false;
let thumbsShown = false;
let bgRunning   = false;
let zoom        = 1;
let panX        = 0;
let panY        = 0;
let isDragging  = false;
let dragStart   = { x: 0, y: 0, px: 0, py: 0 };
let lastPinch   = 0;
let hintTimer   = null;

function isMobile() { return window.innerWidth < 640; }
function pageStep()  { return isMobile() ? 1 : 2; }

/* ─── CATALOG ─── */
async function loadCatalog() {
  try {
    const res = await fetch('config.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const cfg = await res.json();
    const books = (cfg.pdfs || []).map(f => ({
      path: `${cfg.booksFolder || 'books'}/${f}`,
      title: f.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')
    }));
    if (cfg.subtitle) siteName.textContent = cfg.subtitle;
    renderCatalog(books);
  } catch(e) {
    cpLoading.style.display = 'none';
    cpError.style.display   = 'flex';
    stateHint.textContent   = e.message.includes('404') || e.message.includes('fetch')
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
      btnLanjut._selectedBook = { path: b.path, title: b.title };
    });
    bookGrid.appendChild(card);
    renderCover(b.path, i);
  });

  // Auto-open via URL param ?book=PATH
  const urlBook = new URLSearchParams(location.search).get('book');
  if (urlBook) {
    const match = [...bookGrid.querySelectorAll('.book-card')]
      .find(c => c.dataset.path === urlBook);
    if (match) {
      setTimeout(() => {
        match.click();
        if (typeof closeCatalog === 'function') closeCatalog();
        openBook(urlBook, match.dataset.title);
      }, 300);
    }
  }
}

/* ─── COVER THUMBNAIL ─── */
async function renderCover(path, idx) {
  try {
    const pdf  = await pdfjsLib.getDocument(path).promise;
    const page = await pdf.getPage(1);
    const vp   = page.getViewport({ scale: 0.4 });
    const canvas = document.getElementById(`cover-${idx}`);
    if (!canvas) return;
    canvas.width  = vp.width;
    canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    canvas.style.display = 'block';
    const icon = document.getElementById(`icon-${idx}`);
    if (icon) icon.style.display = 'none';
  } catch(e) { /* cover tidak tersedia */ }
}

/* ─── OPEN BOOK ─── */
async function openBook(path, title) {
  // Reset semua state buku sebelumnya
  bgRunning   = false;   // sinyal ke preRenderAll loop yang berjalan agar berhenti
  pdfDoc      = null;
  pageCache   = new Map();
  totalPages  = 0;
  currentPage = 0;
  currentPath = path;
  isFlipping  = false;
  thumbList.innerHTML = '';
  thumbRow.classList.remove('active');
  thumbsShown = false;
  resetZoom(false);

  welcome.style.display   = 'none';
  stage.classList.remove('active');
  toolbar.classList.remove('active');
  flLoader.classList.add('active');
  flTitle.textContent  = title;
  flDetail.textContent = 'Membuka PDF…';
  flFill.style.width   = '0%';

  if (isMobile()) flipPane.classList.add('active');

  try {
    pdfDoc     = await pdfjsLib.getDocument(path).promise;
    totalPages = pdfDoc.numPages;

    // Render halaman awal sebelum menampilkan buku
    const initCount = Math.min(BUFFER * 2, totalPages);
    for (let i = 1; i <= initCount; i++) {
      await doRenderPage(i);
      flFill.style.width   = `${(i / initCount) * 100}%`;
      flDetail.textContent = `Halaman ${i} / ${totalPages}…`;
    }

    showBook();
    preRenderAll(path);   // background: render sisa halaman

  } catch(e) {
    flLoader.classList.remove('active');
    welcome.style.display = '';
    const msg = e.message.includes('404') || e.message.includes('fetch') || e.message.includes('Missing')
      ? 'PDF modul ini belum tersedia.\nFile akan ditambahkan segera. 📂'
      : 'Gagal memuat buku: ' + e.message;
    alert(msg);
    currentPath = '';
  }
}

/* ─── RENDER SINGLE PAGE (cached) ─── */
async function doRenderPage(num) {
  if (pageCache.has(num)) return pageCache.get(num);
  if (!pdfDoc || num < 1 || num > totalPages) return null;
  try {
    const page = await pdfDoc.getPage(num);
    const vp   = page.getViewport({ scale: SCALE });
    const canvas = document.createElement('canvas');
    canvas.width  = vp.width;
    canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    const url = canvas.toDataURL('image/jpeg', 0.92);
    pageCache.set(num, url);

    // Auto-refresh tampilan jika halaman ini sedang ditampilkan
    if (stage.classList.contains('active')) {
      const l = currentPage + 1;
      const r = currentPage + 2;
      if (num === l || num === r) renderView();
      if (thumbsShown) updateThumbSrc(num - 1, url);
    }
    return url;
  } catch(e) { return null; }
}

/* ─── BACKGROUND PRE-RENDER SEMUA HALAMAN ─── */
async function preRenderAll(forPath) {
  if (bgRunning) return;
  bgRunning = true;
  bgProgress.style.display = 'flex';
  bgText.textContent = 'Memuat…';

  for (let i = 1; i <= totalPages; i++) {
    // Berhenti jika buku sudah berganti (atau reset)
    if (!bgRunning || currentPath !== forPath) break;
    await doRenderPage(i);
    bgText.textContent = `Memuat ${i}/${totalPages}…`;
  }

  if (bgRunning && currentPath === forPath) {
    bgText.textContent = `✓ ${totalPages} halaman siap`;
  }
  bgRunning = false;
}

/* ─── SHOW BOOK ─── */
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
  const src = pageCache.get(1) || [...pageCache.values()].find(Boolean);
  if (!src) return;

  const mobile = isMobile();
  const stageW = stage.offsetWidth  - (mobile ? 16 : 48);
  const stageH = stage.offsetHeight - 32;
  const img    = new Image();
  img.src = src;
  img.onload = () => {
    const pgW0  = img.naturalWidth  / SCALE;
    const pgH0  = img.naturalHeight / SCALE;
    const ratio = pgH0 / pgW0;
    let w, h;
    if (mobile) {
      w = stageW; h = w * ratio;
      if (h > stageH) { h = stageH; w = h / ratio; }
      pgR.style.display     = 'none';
      spineEl.style.display = 'none';
    } else {
      const maxW = Math.floor(stageW / 2) - 6;
      w = maxW; h = w * ratio;
      if (h > stageH) { h = stageH; w = h / ratio; }
      pgR.style.display     = '';
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
function renderView() {
  const mobile = isMobile();
  const left   = currentPage;
  const right  = mobile ? -1 : left + 1;

  setPageImg(pgL, pageCache.get(left + 1) || null);
  setPageImg(pgR, right >= 0 ? (pageCache.get(right + 1) || null) : null);

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
  saveProgress();
}

function setPageImg(el, src) {
  if (!src) {
    el.style.background = 'var(--bg3,#FAF7F0)';
    el.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;
      justify-content:center;flex-direction:column;gap:10px;opacity:.45;user-select:none">
      <div style="width:28px;height:28px;border:3px solid #D4A373;border-top-color:transparent;
        border-radius:50%;animation:pgSpin .8s linear infinite"></div>
      <span style="font-size:11px;font-family:'DM Sans',sans-serif;font-weight:500;
        color:#6B5D4F">Memuat…</span>
    </div>`;
    return;
  }
  el.style.background = '';
  el.innerHTML = `<img src="${src}" alt="" draggable="false">`;
}

/* ─── NAVIGATION ─── */
function navigate(targetPage) {
  if (isFlipping || !pdfDoc) return;
  const mobile = isMobile();

  targetPage = Math.max(0, Math.min(totalPages - 1, targetPage));
  if (!mobile && targetPage % 2 !== 0) targetPage--;
  if (targetPage === currentPage) return;

  const forward = targetPage > currentPage;
  isFlipping = true;

  if (!mobile) {
    // 3D flip animation
    if (forward) {
      setFaceImg(fFront, pageCache.get(currentPage + 2) || null);
      setFaceImg(fBack,  pageCache.get(targetPage + 1)  || null);
      flipper.style.transition = 'none';
      flipper.style.transform  = 'none';
      void flipper.offsetWidth;
      flipper.style.transition = `transform ${FLIP_MS}ms cubic-bezier(.645,.045,.355,1)`;
      flipper.style.transform  = 'rotateY(-180deg)';
    } else {
      setFaceImg(fFront, pageCache.get(targetPage + 2)  || null);
      setFaceImg(fBack,  pageCache.get(currentPage + 1) || null);
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
  for (let i = 0; i < totalPages; i++) {
    appendThumb(i, pageCache.get(i + 1) || null);
  }
  updateThumbActive();
}
function appendThumb(i, src) {
  if (thumbList.querySelector(`[data-idx="${i}"]`)) { updateThumbSrc(i, src); return; }
  const item = document.createElement('div');
  item.className = 'thumb-item';
  item.dataset.idx = i;
  item.innerHTML = src
    ? `<img src="${src}" alt=""><div class="tn-num">${i + 1}</div>`
    : `<div style="height:72px;width:50px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#9B8B7A">${i + 1}</div>`;
  item.addEventListener('click', () => navigate(isMobile() ? i : Math.floor(i / 2) * 2));
  thumbList.appendChild(item);
}
function updateThumbSrc(i, src) {
  if (!src) return;
  const el = thumbList.querySelector(`[data-idx="${i}"]`);
  if (!el) return;
  if (!el.querySelector('img')) {
    el.innerHTML = `<img src="${src}" alt=""><div class="tn-num">${i + 1}</div>`;
  }
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

/* ─── PROGRESS ─── */
function saveProgress() {
  if (!currentPath || totalPages <= 0) return;
  try {
    localStorage.setItem('sfp_' + currentPath, JSON.stringify({
      page: currentPage, total: totalPages,
      pct: Math.min(100, Math.round(((currentPage + pageStep()) / totalPages) * 100)),
      lastOpened: new Date().toISOString().split('T')[0]
    }));
  } catch(e) {}
}

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
  dragStart  = { x: e.clientX, y: e.clientY, px: panX, py: panY };
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

// Pinch zoom (touch)
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

// Swipe to navigate (single touch)
let touchStartX = 0;
zoomOuter.addEventListener('touchstart', e => {
  if (e.touches.length === 1) touchStartX = e.touches[0].clientX;
}, { passive: true });
zoomOuter.addEventListener('touchend', e => {
  if (zoom > 1) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) dx < 0
    ? navigate(currentPage + pageStep())
    : navigate(currentPage - pageStep());
}, { passive: true });

/* ─── TOOLBAR ─── */
btnFirst.addEventListener('click',   () => navigate(0));
btnPrev.addEventListener('click',    () => navigate(currentPage - pageStep()));
btnNext.addEventListener('click',    () => navigate(currentPage + pageStep()));
btnLast.addEventListener('click',    () => navigate(isMobile() ? totalPages - 1 : Math.floor((totalPages - 1) / 2) * 2));
btnThumb.addEventListener('click',   toggleThumbs);
btnZoomIn.addEventListener('click',  () => applyZoom(zoom + ZOOM_STEP));
btnZoomOut.addEventListener('click', () => applyZoom(zoom - ZOOM_STEP));
btnExpand.addEventListener('click',  () => {
  app.classList.toggle('expanded');
  btnExpand.textContent = app.classList.contains('expanded') ? '⤡' : '⤢';
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
  document.querySelectorAll('.book-card').forEach(c => c.classList.remove('active'));
});

/* ─── KEYBOARD ─── */
document.addEventListener('keydown', e => {
  if (!pdfDoc) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigate(currentPage + pageStep());
  if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   navigate(currentPage - pageStep());
  if (e.key === '+' || e.key === '=') applyZoom(zoom + ZOOM_STEP);
  if (e.key === '-')                   applyZoom(zoom - ZOOM_STEP);
  if (e.key === '0')                   resetZoom();
  if (e.key === 'f' || e.key === 'F') { app.classList.toggle('expanded'); setTimeout(buildBook, 60); }
});

/* ─── RESIZE ─── */
let lastMobile = isMobile();
window.addEventListener('resize', () => {
  const nowMobile = isMobile();
  if (nowMobile !== lastMobile) {
    lastMobile = nowMobile;
    if (pdfDoc) {
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

/* ─── INIT ─── */
(async () => { await loadCatalog(); })();
