/* ══════════════════════════════════════
   PERPUSTAKAAN DIGITAL — script.js
   ══════════════════════════════════════ */

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/* ── INDEXEDDB CACHE ── */
const DB_NAME = 'FlipbookCache', DB_VER = 1;

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pages')) db.createObjectStore('pages');
      if (!db.objectStoreNames.contains('meta'))  db.createObjectStore('meta');
    };
    r.onsuccess = e => res(e.target.result);
    r.onerror   = e => rej(e.target.error);
  });
}
function dbGet(db, store, key) {
  return new Promise((res, rej) => {
    const r = db.transaction(store,'readonly').objectStore(store).get(key);
    r.onsuccess = e => res(e.target.result);
    r.onerror   = e => rej(e.target.error);
  });
}
function dbPut(db, store, key, val) {
  return new Promise((res, rej) => {
    const r = db.transaction(store,'readwrite').objectStore(store).put(val, key);
    r.onsuccess = e => res(e.target.result);
    r.onerror   = e => rej(e.target.error);
  });
}
async function loadCache(relPath) {
  try {
    const db   = await openDB();
    const meta = await dbGet(db, 'meta', relPath);
    if (!meta || meta.scale !== SCALE) return null;
    const head = await fetch(relPath, { method:'HEAD' }).catch(() => null);
    const size = head ? head.headers.get('content-length') : null;
    if (size && meta.size && size !== meta.size) return null;
    return await dbGet(db, 'pages', relPath) || null;
  } catch { return null; }
}
async function saveCache(relPath, pdfSize, pagesArr) {
  try {
    const db = await openDB();
    await dbPut(db, 'meta', relPath, { scale: SCALE, size: pdfSize, ts: Date.now() });
    await dbPut(db, 'pages', relPath, pagesArr);
  } catch(e) { console.warn('Cache save failed:', e); }
}

/* ── CONSTANTS ── */
const SCALE   = 1.5;
const INITIAL = 6;
const FLIP    = 550;
const ZOOM_MIN = 1, ZOOM_MAX = 4, ZOOM_STEP = 0.25;

/* ── STATE ── */
let pages = [], pdfDoc = null, cur = 0, total = 0;
let busy = false, thumbOpen = false, bgRunning = false;

/* ── ZOOM STATE ── */
let zoomLevel = 1, panX = 0, panY = 0;
let isDragging = false, dragMoved = false;
let dragStartX = 0, dragStartY = 0, panStartX = 0, panStartY = 0;
let pinchDist = 0, zoomHintTimer = null;

/* ── DOM REFS ── */
const $ = id => document.getElementById(id);

const catalogView  = $('catalogView');
const readerView   = $('readerView');
const openLoader   = $('openLoader');
const stateLoading = $('stateLoading');
const stateError   = $('stateError');
const stateHint    = $('stateHint');
const bookGrid     = $('bookGrid');
const catSub       = $('catSub');
const siteName     = $('siteName');
const topTitle     = $('topTitle');
const btnBack      = $('btnBack');
const pgL          = $('pgL');
const pgR          = $('pgR');
const pgCounter    = $('pgCounter');
const olFill       = $('olFill');
const olDetail     = $('olDetail');
const olText       = $('olText');
const btnFirst     = $('btnFirst');
const btnPrev      = $('btnPrev');
const btnNext      = $('btnNext');
const btnLast      = $('btnLast');
const btnThumb     = $('btnThumb');
const thumbRow     = $('thumbRow');
const thumbList    = $('thumbList');
const flipper      = $('flipper');
const fFront       = $('fFront');
const fBack        = $('fBack');
const book         = $('book');
const bgProgress   = $('bgProgress');
const bgText       = $('bgText');
const stage        = $('stage');
const zoomOuter    = $('zoomOuter');
const btnZoomIn    = $('btnZoomIn');
const btnZoomOut   = $('btnZoomOut');
const zoomLabel    = $('zoomLabel');
const zoomHintEl   = $('zoomHint');

/* ── TOPBAR SCROLL EFFECT ── */
window.addEventListener('scroll', () => {
  document.getElementById('topbar').classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

/* ── HAMBURGER MENU ── */
$('hamburger').addEventListener('click', () => {
  const ham = $('hamburger'), menu = $('mobileMenu');
  ham.classList.toggle('open');
  menu.classList.toggle('open');
});

/* ══════════════════════════════════════
   ZOOM SYSTEM
   ══════════════════════════════════════ */
function applyZoom(animate) {
  if (animate) {
    zoomOuter.style.transition = 'transform .2s cubic-bezier(.4,0,.2,1)';
    clearTimeout(applyZoom._t);
    applyZoom._t = setTimeout(() => { zoomOuter.style.transition = ''; }, 250);
  }
  zoomOuter.style.transform = `translate(${panX}px,${panY}px) scale(${zoomLevel})`;
  zoomLabel.textContent = Math.round(zoomLevel * 100) + '%';
  btnZoomIn.disabled  = zoomLevel >= ZOOM_MAX;
  btnZoomOut.disabled = zoomLevel <= ZOOM_MIN;
  btnZoomIn.classList.toggle('active', zoomLevel > 1);
  btnZoomOut.classList.toggle('active', zoomLevel > 1);
  stage.style.cursor = zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : '';
}

function resetZoom(animate) {
  zoomLevel = 1; panX = 0; panY = 0;
  applyZoom(animate !== false);
}

function clampPan() {
  const lim = 380 * (zoomLevel - 1);
  panX = Math.max(-lim, Math.min(lim, panX));
  panY = Math.max(-lim, Math.min(lim, panY));
}

function showZoomHint() {
  clearTimeout(zoomHintTimer);
  zoomHintEl.classList.add('show');
  zoomHintTimer = setTimeout(() => zoomHintEl.classList.remove('show'), 2200);
}

/* Zoom buttons */
btnZoomIn.addEventListener('click', e => {
  e.stopPropagation();
  zoomLevel = Math.min(ZOOM_MAX, parseFloat((zoomLevel + ZOOM_STEP).toFixed(2)));
  applyZoom(true); showZoomHint();
});
btnZoomOut.addEventListener('click', e => {
  e.stopPropagation();
  zoomLevel = Math.max(ZOOM_MIN, parseFloat((zoomLevel - ZOOM_STEP).toFixed(2)));
  if (zoomLevel <= ZOOM_MIN) { panX = 0; panY = 0; zoomHintEl.classList.remove('show'); }
  applyZoom(true);
  if (zoomLevel > ZOOM_MIN) showZoomHint();
});
zoomLabel.addEventListener('dblclick', e => {
  e.stopPropagation();
  resetZoom(); zoomHintEl.classList.remove('show');
});

/* Scroll wheel zoom */
stage.addEventListener('wheel', e => {
  if (!readerView.classList.contains('show')) return;
  e.preventDefault();
  const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
  const newZ  = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, parseFloat((zoomLevel + delta).toFixed(2))));
  if (newZ === zoomLevel) return;
  const rect = stage.getBoundingClientRect();
  const cx = e.clientX - rect.left  - rect.width  / 2;
  const cy = e.clientY - rect.top   - rect.height / 2;
  panX = cx + (panX - cx) * (newZ / zoomLevel);
  panY = cy + (panY - cy) * (newZ / zoomLevel);
  zoomLevel = newZ;
  if (zoomLevel <= ZOOM_MIN) { panX = 0; panY = 0; }
  else clampPan();
  applyZoom();
  if (zoomLevel > ZOOM_MIN) showZoomHint();
  else zoomHintEl.classList.remove('show');
}, { passive: false });

/* Drag to pan */
stage.addEventListener('mousedown', e => {
  if (zoomLevel <= 1 || e.target.closest('.tb, .btn-tb, .zoom-label')) return;
  isDragging = true; dragMoved = false;
  dragStartX = e.clientX; dragStartY = e.clientY;
  panStartX = panX; panStartY = panY;
  stage.style.cursor = 'grabbing';
  e.preventDefault();
});
window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  const dx = e.clientX - dragStartX, dy = e.clientY - dragStartY;
  if (Math.abs(dx) + Math.abs(dy) > 4) dragMoved = true;
  panX = panStartX + dx; panY = panStartY + dy;
  clampPan(); applyZoom();
});
window.addEventListener('mouseup', () => {
  if (!isDragging) return;
  isDragging = false;
  stage.style.cursor = zoomLevel > 1 ? 'grab' : '';
});

/* Pinch to zoom */
stage.addEventListener('touchstart', e => {
  if (e.touches.length === 2) {
    pinchDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
  }
}, { passive: true });
stage.addEventListener('touchmove', e => {
  if (e.touches.length !== 2) return;
  e.preventDefault();
  const d = Math.hypot(
    e.touches[0].clientX - e.touches[1].clientX,
    e.touches[0].clientY - e.touches[1].clientY
  );
  if (pinchDist > 0) {
    const newZ = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX,
      parseFloat((zoomLevel * (d / pinchDist)).toFixed(2))
    ));
    if (newZ !== zoomLevel) {
      zoomLevel = newZ;
      if (zoomLevel <= ZOOM_MIN) { panX = 0; panY = 0; }
      else clampPan();
      applyZoom();
    }
  }
  pinchDist = d;
}, { passive: false });

/* Double-click: zoom 2× / reset */
stage.addEventListener('dblclick', e => {
  if (!readerView.classList.contains('show')) return;
  if (e.target.closest('.tb, .btn-tb, .zoom-label')) return;
  if (zoomLevel > 1) {
    resetZoom(); zoomHintEl.classList.remove('show');
  } else {
    const rect = stage.getBoundingClientRect();
    const cx = e.clientX - rect.left  - rect.width  / 2;
    const cy = e.clientY - rect.top   - rect.height / 2;
    zoomLevel = 2;
    panX = cx + (panX - cx) * (2 / 1);
    panY = cy + (panY - cy) * (2 / 1);
    clampPan(); applyZoom(true); showZoomHint();
  }
});

/* ══════════════════════════════════════
   BOOT & CATALOG
   ══════════════════════════════════════ */
async function boot() {
  const cfg = await fetch('config.json').then(r => r.json()).catch(() => ({}));
  if (cfg.subtitle) {
    siteName.textContent = cfg.subtitle;
    document.title = cfg.subtitle;
  }
  const folder  = cfg.booksFolder || 'books';
  const pdfList = cfg.pdfs;

  if (pdfList && pdfList.length) {
    showGrid(folder, pdfList);
  } else {
    await apiScan(folder);
  }
}

function showGrid(folder, names) {
  stateLoading.style.display = 'none';
  bookGrid.style.display = 'grid';
  catSub.textContent = `${names.length} buku tersedia`;
  names.forEach((name, idx) => {
    const relPath = `${folder}/${name}`;
    const title   = name.replace(/\.pdf$/i,'').replace(/[-_]/g,' ');
    addCard(name, relPath, title, idx === 0);
  });
}

async function apiScan(folder) {
  try {
    const host  = location.hostname;
    const owner = host.endsWith('.github.io') ? host.split('.')[0] : 'JIAkbar';
    const repo  = location.pathname.split('/').filter(Boolean)[0] || 'Flipbook';
    const res   = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${folder}`);
    if (!res.ok) throw new Error('API ' + res.status);
    const files = await res.json();
    const pdfs  = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (!pdfs.length) throw new Error('empty');
    showGrid(folder, pdfs.map(f => f.name));
  } catch (e) {
    stateLoading.style.display = 'none';
    stateError.style.display   = 'flex';
    stateHint.textContent = `Tidak ada PDF di folder "${folder}". Upload PDF ke books/ lalu push — Actions akan update config.json otomatis.`;
  }
}

/* ── BOOK CARD ── */
function addCard(filename, relPath, title, featured) {
  const card = document.createElement('div');
  card.className = 'book-card' + (featured ? ' featured' : '');
  card.dataset.path = relPath;
  card.innerHTML = `
    <div class="card-cover"><div class="cover-spin"><div class="spinner"></div></div></div>
    <div class="card-body">
      <div class="card-name">${title}</div>
      <div class="card-meta">…</div>
      <button class="btn-buka"><i class="fas fa-book-open" style="font-size:11px"></i> Buka</button>
    </div>`;
  const coverEl = card.querySelector('.card-cover');
  const metaEl  = card.querySelector('.card-meta');
  renderCover(relPath, coverEl, metaEl);
  card.querySelector('.btn-buka').addEventListener('click', e => {
    e.stopPropagation();
    openBook(relPath, title);
  });
  card.addEventListener('click', () => openBook(relPath, title));
  bookGrid.appendChild(card);
}

async function renderCover(relPath, el, metaEl) {
  try {
    const buf = await fetch(relPath).then(r => {
      if (!r.ok) throw new Error(r.status);
      return r.arrayBuffer();
    });
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    metaEl.textContent = `${pdf.numPages} halaman`;
    const page = await pdf.getPage(1);
    const vp   = page.getViewport({ scale: 0.8 });
    const c    = document.createElement('canvas');
    c.width = vp.width; c.height = vp.height;
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    el.innerHTML = ''; el.appendChild(c);
    el._pdf = pdf; el._buf = buf;
  } catch {
    el.innerHTML = '<div class="pg-blank"></div>';
  }
}

/* ══════════════════════════════════════
   OPEN BOOK
   ══════════════════════════════════════ */
async function openBook(relPath, title) {
  readerView.classList.add('show');
  openLoader.classList.remove('hide');
  topTitle.textContent = title;
  document.title = title;
  resetZoom(false);
  setOL(5, 'Membuka PDF…');
  pages = []; pdfDoc = null; bgRunning = false;

  try {
    const card = bookGrid.querySelector(`[data-path="${relPath}"] .card-cover`);
    let   pdf  = card?._pdf || null;

    if (!pdf) {
      setOL(10, 'Mengunduh PDF…');
      const buf = await fetch(relPath).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.arrayBuffer();
      });
      setOL(25, 'Membuka PDF…');
      pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    } else {
      setOL(25, 'Menggunakan cover cache…');
    }

    pdfDoc = pdf;
    const n = pdf.numPages;

    setOL(30, 'Memeriksa cache…');
    const pdfSize = card?._buf ? String(card._buf.byteLength) : null;
    const cached  = await loadCache(relPath);

    if (cached && cached.length === n + 1) {
      pages = cached; total = pages.length; cur = 0;
      buildThumbs();
      openLoader.classList.add('hide');
      renderSpread();
      showCacheBadge();
      return;
    }

    // Lazy render
    pages = new Array(n + 1).fill(null);
    total = n + 1;
    const first = Math.min(INITIAL, n);
    for (let i = 1; i <= first; i++) {
      pages[i] = await renderPage(pdf, i);
      setOL(30 + Math.round((i / first) * 65), `Halaman ${i} dari ${n}…`);
    }
    cur = 0;
    buildThumbs();
    openLoader.classList.add('hide');
    renderSpread();

    if (n > first) renderBackground(pdf, first + 1, n, relPath, pdfSize);

  } catch (e) {
    olText.textContent = '⚠ ' + e.message;
  }
}

async function renderPage(pdf, i) {
  const page = await pdf.getPage(i);
  const vp   = page.getViewport({ scale: SCALE });
  const c    = document.createElement('canvas');
  c.width = vp.width; c.height = vp.height;
  await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
  return c.toDataURL('image/jpeg', 0.85);
}

async function renderBackground(pdf, from, to, relPath, pdfSize) {
  bgRunning = true; bgProgress.classList.add('show');
  for (let i = from; i <= to; i++) {
    if (!bgRunning) break;
    pages[i] = await renderPage(pdf, i);
    bgText.textContent = `${i} / ${to}`;
    const t = thumbList.querySelector(`[data-idx="${i}"]`);
    if (t) t.innerHTML = `<img src="${pages[i]}" loading="lazy">`;
    if (i === cur || i === cur + 1) renderSpread();
    if (i % 8 === 0) await new Promise(r => setTimeout(r, 5));
  }
  bgProgress.classList.remove('show'); bgRunning = false;
  if (relPath && pages.every(p => p === null || typeof p === 'string')) {
    bgText.textContent = 'Menyimpan…';
    bgProgress.classList.add('show');
    await saveCache(relPath, pdfSize, pages);
    bgProgress.classList.remove('show');
    showCacheBadge();
  }
}

function showCacheBadge() {
  const b = document.createElement('div');
  b.style.cssText = [
    'position:fixed;bottom:72px;right:18px;z-index:500',
    'font-family:"DM Sans",sans-serif;font-size:11px;font-weight:500',
    'background:rgba(143,162,135,.15);border:1.5px solid rgba(143,162,135,.35)',
    'color:#6B7E64;padding:5px 12px;border-radius:100px',
    'box-shadow:0 2px 10px rgba(62,54,46,.1);transition:opacity .5s'
  ].join(';');
  b.textContent = '⚡ Tersimpan di cache';
  document.body.appendChild(b);
  setTimeout(() => { b.style.opacity = '0'; setTimeout(() => b.remove(), 500); }, 2800);
}

function setOL(pct, msg) {
  olFill.style.width   = pct + '%';
  olDetail.textContent = msg;
}

/* ══════════════════════════════════════
   RENDER SPREAD
   ══════════════════════════════════════ */
function setPage(el, idx) {
  el.innerHTML = '';
  if (idx < 0 || idx >= total) { el.innerHTML = '<div class="pg-blank"></div>'; return; }
  if (idx === 0 || pages[idx] === null) {
    if (idx === 0) { el.innerHTML = '<div class="pg-blank"></div>'; }
    else {
      el.innerHTML = '<div class="pg-loading"><div class="spinner"></div></div>';
      renderOnDemand(idx, el);
    }
    return;
  }
  const img = document.createElement('img');
  img.src = pages[idx]; el.appendChild(img);
}

async function renderOnDemand(idx, el) {
  if (!pdfDoc || pages[idx]) return;
  pages[idx] = await renderPage(pdfDoc, idx);
  if (idx === cur || idx === cur + 1) renderSpread();
}

function renderSpread() {
  const mobile = window.innerWidth < 768;
  if (mobile) {
    // Single-page: show cur+1 on pgR only
    setPage(pgR, cur + 1);
    const num = cur + 1;
    pgCounter.innerHTML = num < total
      ? `<b>${num}</b> / ${total - 1}`
      : `<b>${total - 1}</b> / ${total - 1}`;
  } else {
    setPage(pgL, cur);
    setPage(pgR, cur + 1);
    const lNum = cur === 0 ? 'Cover' : String(cur);
    const rNum = cur + 1 < total ? (cur + 1 === 1 ? 'Cover' : String(cur + 1)) : null;
    pgCounter.innerHTML = rNum
      ? `<b>${lNum} – ${rNum}</b> / ${total - 1}`
      : `<b>${lNum}</b> / ${total - 1}`;
  }
  btnFirst.disabled = cur <= 0;
  btnPrev.disabled  = cur <= 0;
  btnNext.disabled  = cur + 2 >= total;
  btnLast.disabled  = cur + 2 >= total;
  syncThumbs();
}

/* ══════════════════════════════════════
   FLIP
   ══════════════════════════════════════ */
function flip(dir) {
  if (busy) return;
  if (dir > 0 && cur + 2 >= total) return;
  if (dir < 0 && cur <= 0) return;
  busy = true;
  const pgW     = (book.clientWidth - 22) / 2;
  const frontSrc = dir > 0 ? pages[cur+1] : pages[cur];
  const backSrc  = dir > 0 ? pages[cur+2] : pages[cur-1];
  fFront.innerHTML = frontSrc ? `<img src="${frontSrc}">` : '<div class="pg-blank"></div>';
  fBack.innerHTML  = backSrc  ? `<img src="${backSrc}">` : '<div class="pg-blank"></div>';

  if (dir > 0) {
    Object.assign(flipper.style, {
      display:'block', right:'0', left:'auto',
      width: pgW + 'px', transformOrigin:'left center',
      transform:'rotateY(0deg)', transition:'none'
    });
  } else {
    Object.assign(flipper.style, {
      display:'block', left:'0', right:'auto',
      width: pgW + 'px', transformOrigin:'right center',
      transform:'rotateY(0deg)', transition:'none'
    });
  }
  requestAnimationFrame(() => requestAnimationFrame(() => {
    flipper.style.transition = `transform ${FLIP}ms cubic-bezier(.4,0,.2,1)`;
    flipper.style.transform  = dir > 0 ? 'rotateY(-180deg)' : 'rotateY(180deg)';
  }));
  setTimeout(() => {
    cur += dir * 2;
    renderSpread();
    Object.assign(flipper.style, { display:'none', transition:'none', left:'auto', right:'0' });
    busy = false;
  }, FLIP + 40);
}

function jumpTo(idx) {
  let s = Math.floor(idx / 2) * 2;
  s = Math.max(0, Math.min(s, total - 1));
  if (s !== cur) { cur = s; renderSpread(); }
}

/* ══════════════════════════════════════
   THUMBNAILS
   ══════════════════════════════════════ */
function buildThumbs() {
  thumbList.innerHTML = '';
  for (let i = 1; i < total; i++) {
    const d = document.createElement('div');
    d.className = 'thumb'; d.dataset.idx = i;
    d.innerHTML = pages[i]
      ? `<img src="${pages[i]}" loading="lazy">`
      : '<div class="thumb-blank"></div>';
    d.addEventListener('click', () => jumpTo(i));
    thumbList.appendChild(d);
  }
}

function syncThumbs() {
  thumbList.querySelectorAll('.thumb').forEach(t => {
    const i = +t.dataset.idx;
    t.classList.toggle('active', i === cur || i === cur+1);
  });
  const a = thumbList.querySelector('.thumb.active');
  if (a) a.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
}

/* ══════════════════════════════════════
   EVENTS
   ══════════════════════════════════════ */
btnNext.addEventListener ('click', () => flip(+1));
btnPrev.addEventListener ('click', () => flip(-1));
btnFirst.addEventListener('click', () => jumpTo(0));
btnLast.addEventListener ('click', () => jumpTo(total - 1));
btnThumb.addEventListener('click', () => {
  thumbOpen = !thumbOpen;
  thumbRow.classList.toggle('show', thumbOpen);
  btnThumb.classList.toggle('active', thumbOpen);
});

btnBack.addEventListener('click', () => {
  bgRunning = false;
  readerView.classList.remove('show');
  thumbRow.classList.remove('show');
  bgProgress.classList.remove('show');
  zoomHintEl.classList.remove('show');
  thumbOpen = false; pages = []; pdfDoc = null;
  resetZoom(false);
  document.title = siteName.textContent;
});

/* Book area click — only flip if not dragging */
book.addEventListener('click', e => {
  if (dragMoved) { dragMoved = false; return; }
  flip(e.clientX - book.getBoundingClientRect().left < book.clientWidth / 2 ? -1 : +1);
});

/* Keyboard */
document.addEventListener('keydown', e => {
  if (!readerView.classList.contains('show')) return;
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); flip(+1); }
  if (e.key === 'ArrowLeft')                   { e.preventDefault(); flip(-1); }
  if (e.key === 'Home')  jumpTo(0);
  if (e.key === 'End')   jumpTo(total - 1);
  if (e.key === '+' || e.key === '=') { e.preventDefault(); btnZoomIn.click(); }
  if (e.key === '-')                  { e.preventDefault(); btnZoomOut.click(); }
  if (e.key === '0')                  { e.preventDefault(); resetZoom(); zoomHintEl.classList.remove('show'); }
  if (e.key === 'Escape') {
    if (zoomLevel > 1) { resetZoom(); zoomHintEl.classList.remove('show'); }
    else btnBack.click();
  }
});

/* Touch swipe */
let tx = 0;
book.addEventListener('touchstart', e => {
  if (e.touches.length === 1) tx = e.changedTouches[0].clientX;
}, { passive: true });
book.addEventListener('touchend', e => {
  if (e.changedTouches.length === 1 && zoomLevel <= 1) {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 44) flip(dx < 0 ? +1 : -1);
  }
});

/* ── GO ── */
boot();
