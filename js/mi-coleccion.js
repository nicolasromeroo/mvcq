/* ═══════════════════════════════════════════════════════
   MI COLECCIÓN / VESTIDOR VIRTUAL — Me Visto Como Quiero
   ═══════════════════════════════════════════════════════ */

'use strict';

const API            = 'https://web-vd8s1gd9atgj.up-de-fra1-k8s-1.apps.run-on-seenode.com';
const STORAGE_KEY    = 'mvcq-colecciones-v2';
const STORAGE_OUTFIT = 'mvcq-vestidor-draft';
const FALLBACK_IMG   = '../img/aestethic.jpg';

/* ── Slot configuration ── */
const SLOTS = [
  { id: 'outer',  label: 'Outer',   icon: 'fa-wind',         zone: '.outfit-zone--outer'  },
  { id: 'top',    label: 'Top',     icon: 'fa-tshirt',       zone: '.outfit-zone--top'    },
  { id: 'bottom', label: 'Bottom',  icon: 'fa-socks',        zone: '.outfit-zone--bottom' },
  { id: 'full',   label: 'Vestido', icon: 'fa-person-dress', zone: '.outfit-zone--full'   },
];

const SLOT_LABELS  = { outer:'Outer', top:'Top', bottom:'Bottom', full:'Vestido' };
const TILE_PATTERN = ['col-tile--large','','col-tile--tall','','col-tile--wide',''];
const CAT_DISPLAY  = { all:'Todas', top:'Tops', outer:'Outerwear', bottom:'Bottoms', full:'Vestidos' };

/* ── App state ── */
let allProducts    = [];
let filteredProds  = [];
let activeSlot     = 'top';
let outfit         = {};
let activeCat      = 'all';
let searchQuery    = '';
let draggedProductId = null;

/* ═══════════════════════════════
   UTILITIES
═══════════════════════════════ */

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtPrice(p) {
  const n = Number(p);
  if (Number.isNaN(n) || n === 0) return '';
  return n.toLocaleString('es-AR', { style:'currency', currency:'ARS', minimumFractionDigits:0, maximumFractionDigits:0 });
}

function getProductImg(prod) {
  const raw = prod?.imageUrl || prod?.imagen || prod?.image || '';
  if (!raw) return FALLBACK_IMG;
  if (raw.startsWith('http')) return raw;
  return `${API}/${raw.replace(/^\//,'')}`;
}

function detectSlot(prod) {
  const c = ((prod.category||'') + ' ' + (prod.name||'')).toLowerCase();
  /* Exclude footwear and accessories — they don't belong on the mannequin zones */
  if (/zapato|zapatilla|sandalia|bota|alpargata|calzado|mocasin|tacón|tacon|chancleta|ojotas?|pantufla|sneaker|shoe|boot/.test(c)) return null;
  if (/bolso|cartera|cinturon|cinturón|accesori|collar|pulsera|arete|aro|anillo|reloj|sombrero|gorro|cap\b|hat\b|belt\b|bag\b|purse|medias\b|calcetin/.test(c)) return null;
  /* Full-body garments */
  if (/vestido|mono\b|enterizo|jumpsuit|overall|catsuit/.test(c)) return 'full';
  /* Outerwear */
  if (/campera|abrigo|saco\b|blazer|hoodie|chompa|polar|tapado|buzo|sweat|cardigan|chaqueta|sobretodo|impermeable|parka/.test(c)) return 'outer';
  /* Bottoms */
  if (/jean|pantalon|pantaloneta|short\b|falda|pollera|leggin|calza|bermuda/.test(c)) return 'bottom';
  /* Default: top (remeras, blusas, camisas, etc.) */
  return 'top';
}

/* ═══════════════════════════════
   PRODUCT LOADING
═══════════════════════════════ */

async function loadProducts() {
  const listEl = document.getElementById('browserList');
  if (!listEl) return;
  listEl.innerHTML = Array(6).fill('<div class="browser-skeleton"></div>').join('');
  try {
    const res  = await fetch(`${API}/product/products`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    allProducts = Array.isArray(data) ? data : (data.data || data.products || []);
  } catch (_) { allProducts = []; }
  buildCategoryPills();
  applyFilter();
}

function buildCategoryPills() {
  const el = document.getElementById('catPills');
  if (!el) return;
  const cats = ['all', ...new Set(allProducts.map(detectSlot))];
  el.innerHTML = cats.map(c => `
    <button class="cat-pill${c===activeCat?' is-active':''}" data-cat="${c}">
      ${esc(CAT_DISPLAY[c]||c)}
    </button>`).join('');
  el.querySelectorAll('.cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCat = btn.dataset.cat;
      el.querySelectorAll('.cat-pill').forEach(b => b.classList.toggle('is-active', b===btn));
      applyFilter();
    });
  });
}

function applyFilter() {
  const q = searchQuery.toLowerCase();
  filteredProds = allProducts.filter(p => {
    const slot = detectSlot(p);
    if (slot === null) return false; // exclude footwear/accessories
    const matchCat = activeCat==='all' || slot===activeCat;
    const matchQ   = !q || (p.name||'').toLowerCase().includes(q);
    return matchCat && matchQ && p.isActive!==false;
  });
  renderBrowserList();
}

function renderBrowserList() {
  const listEl = document.getElementById('browserList');
  if (!listEl) return;
  if (!filteredProds.length) {
    listEl.innerHTML = `<div class="browser-empty"><i class="fas fa-search"></i>Sin resultados</div>`;
    return;
  }
  listEl.innerHTML = filteredProds.map(p => {
    const slot     = detectSlot(p);
    const equipped = outfit[slot]?.id === p.id;
    return `
      <div class="browser-card${equipped?' is-equipped':''}" data-id="${esc(String(p.id))}" draggable="true">
        <span class="browser-card-slot-badge">${esc(SLOT_LABELS[slot]||slot)}</span>
        <img class="browser-card-img" src="${esc(getProductImg(p))}" alt="${esc(p.name||'')}"
             loading="lazy" onerror="this.src='${FALLBACK_IMG}'" />
        <div class="browser-card-info">
          <p class="browser-card-name">${esc(p.name||'Producto')}</p>
          <p class="browser-card-price">${fmtPrice(p.price)}</p>
        </div>
      </div>`;
  }).join('');
  listEl.querySelectorAll('.browser-card').forEach(card => {
    const prod = allProducts.find(p => String(p.id)===card.dataset.id);
    if (!prod) return;
    card.addEventListener('click', () => equipProduct(detectSlot(prod), prod));
    card.addEventListener('dragstart', e => {
      draggedProductId = String(prod.id);
      e.dataTransfer.setData('text/plain', String(prod.id));
      e.dataTransfer.effectAllowed = 'copy';
      card.classList.add('is-dragging');
    });
    card.addEventListener('dragend', () => {
      draggedProductId = null;
      card.classList.remove('is-dragging');
    });
  });
}

/* ═══════════════════════════════
   OUTFIT MANAGEMENT
═══════════════════════════════ */

function equipProduct(slot, product) {
  if (slot==='full') { delete outfit.top; delete outfit.bottom; }
  else if (slot==='top'||slot==='bottom') { delete outfit.full; }
  outfit[slot] = product;
  saveOutfitDraft(); renderMannequin(); renderOutfitPanel(); renderBrowserList(); updateProgress();
}

function unequipSlot(slot) {
  delete outfit[slot];
  saveOutfitDraft(); renderMannequin(); renderOutfitPanel(); renderBrowserList(); updateProgress();
}

function clearOutfit() {
  outfit = {};
  saveOutfitDraft(); renderMannequin(); renderOutfitPanel(); renderBrowserList(); updateProgress();
}

function saveOutfitDraft() {
  try { localStorage.setItem(STORAGE_OUTFIT, JSON.stringify(outfit)); } catch(_){}
}

function loadOutfitDraft() {
  try { const raw=localStorage.getItem(STORAGE_OUTFIT); if(raw) outfit=JSON.parse(raw); }
  catch(_){ outfit={}; }
}

/* ═══════════════════════════════
   OUTFIT PROGRESS
═══════════════════════════════ */

function updateProgress() {
  const count = Object.keys(outfit).length;
  const fill  = document.getElementById('outfitProgressFill');
  const label = document.getElementById('outfitProgressLabel');
  if (fill)  fill.style.width = `${(count / 4) * 100}%`;
  if (label) {
    if (count === 0)      label.textContent = 'Armá tu look';
    else if (count === 4) label.textContent = '¡Outfit completo!';
    else                  label.textContent = `${count} prenda${count!==1?'s':''} seleccionada${count!==1?'s':''}`;
  }
}

/* ═══════════════════════════════
   FULLSCREEN VIEW
═══════════════════════════════ */

function openFullscreenView() {
  const backdrop = document.getElementById('stageFullscreen');
  if (!backdrop) return;

  const fsMannequin = document.getElementById('fsMannequin');
  if (fsMannequin) {
    const src = document.querySelector('.mannequin-wrap');
    if (src) fsMannequin.innerHTML = src.outerHTML;
  }

  const fsPanel = document.getElementById('fsPanel');
  if (fsPanel) {
    const items = Object.entries(outfit);
    const total = items.reduce((s,[,p]) => s + Number(p?.price||0), 0);
    fsPanel.innerHTML = `
      <h3>Tu Look</h3>
      ${!items.length ? `<p class="fs-empty-msg">Sin prendas seleccionadas</p>` : ''}
      ${items.map(([slot,p]) => `
        <div class="fs-item">
          <span class="fs-item-label">${esc(SLOT_LABELS[slot]||slot)}</span>
          <span class="fs-item-name">${esc(p.name||'Producto')}</span>
          <span class="fs-item-price">${fmtPrice(p.price)}</span>
        </div>`).join('')}
      ${items.length ? `
        <div class="fs-total">
          <span class="fs-total-label">Total outfit</span>
          <span class="fs-total-value">${fmtPrice(total)}</span>
        </div>
        <div class="fs-actions">
          <button class="fs-btn fs-btn--cart" onclick="showToast('Función de carrito próximamente')">
            <i class="fas fa-shopping-bag"></i> Agregar al carrito
          </button>
          <button class="fs-btn fs-btn--save" onclick="openSaveModal();closeFullscreenView()">
            <i class="fas fa-bookmark"></i> Guardar outfit
          </button>
        </div>` : ''}
    `;
  }

  backdrop.style.display = '';
  document.body.style.overflow = 'hidden';
}

function closeFullscreenView() {
  const backdrop = document.getElementById('stageFullscreen');
  if (backdrop) backdrop.style.display = 'none';
  document.body.style.overflow = '';
}

/* ═══════════════════════════════
   MANNEQUIN RENDERING
═══════════════════════════════ */

function renderMannequin() {
  SLOTS.forEach(({ id, zone }) => {
    const zoneEl = document.querySelector(zone);
    if (!zoneEl) return;
    const img = zoneEl.querySelector('img');
    if (!img) return;
    const prod = outfit[id];
    if (prod) {
      const isNew = img.dataset.loadedId !== String(prod.id);
      img.dataset.loadedId = String(prod.id);
      img.style.display = '';
      img.src = getProductImg(prod);
      img.alt = prod.name || '';
      zoneEl.style.opacity = '1';
      zoneEl.classList.remove('is-empty');
      if (isNew) {
        zoneEl.classList.remove('item-entering');
        void zoneEl.offsetWidth;
        zoneEl.classList.add('item-entering');
        setTimeout(() => zoneEl.classList.remove('item-entering'), 500);
      }
    } else {
      zoneEl.style.opacity = '0';
      zoneEl.classList.add('is-empty');
      delete img.dataset.loadedId;
      setTimeout(() => { img.src = ''; img.style.display = ''; }, 350);
    }
  });

  document.querySelectorAll('.outfit-slot').forEach(btn => {
    const id      = btn.dataset.slot;
    const prod    = outfit[id];
    const preview = btn.querySelector('.outfit-slot-preview');
    if (!preview) return;
    if (prod) {
      btn.classList.add('has-item');
      preview.innerHTML = `<img src="${esc(getProductImg(prod))}" alt="${esc(prod.name||'')}"
        onerror="this.src='${FALLBACK_IMG}'" />
        <button class="slot-clear-btn" data-slot="${id}" title="Quitar"><i class="fas fa-times"></i></button>`;
      preview.querySelector('.slot-clear-btn')?.addEventListener('click', e => {
        e.stopPropagation(); unequipSlot(id);
      });
    } else {
      btn.classList.remove('has-item');
      const icon = SLOTS.find(s=>s.id===id)?.icon||'fa-plus';
      preview.innerHTML = `<i class="fas ${icon}"></i>`;
    }
  });
}

/* ═══════════════════════════════
   ACTIVE SLOT
═══════════════════════════════ */

function setActiveSlot(id) {
  activeSlot = id;
  document.querySelectorAll('.outfit-slot').forEach(b => b.classList.toggle('is-active', b.dataset.slot===id));
  document.querySelectorAll('.panel-slot-row').forEach(r => r.classList.toggle('is-active', r.dataset.slot===id));
  SLOTS.forEach(({ id:sid, zone }) => {
    const z = document.querySelector(zone);
    if (!z) return;
    z.querySelector('.zone-active-ring')?.remove();
    z.classList.toggle('is-active-zone', sid===id);
    if (sid===id) { const ring=document.createElement('div'); ring.className='zone-active-ring'; z.appendChild(ring); }
  });
  const labelEl = document.getElementById('activeSlotLabel');
  if (labelEl) {
    const slotDef = SLOTS.find(s => s.id === id);
    labelEl.innerHTML = `Editando: <strong>${slotDef ? slotDef.label : id}</strong>`;
  }
}

/* ═══════════════════════════════
   OUTFIT PANEL
═══════════════════════════════ */

function renderOutfitPanel() {
  const container = document.getElementById('panelSlots');
  if (!container) return;
  container.innerHTML = SLOTS.map(({ id, label, icon }) => {
    const prod = outfit[id];
    return `
      <div class="panel-slot-row${prod?' has-item':''}${activeSlot===id?' is-active':''}" data-slot="${id}">
        <div class="panel-slot-thumb">
          ${prod
            ? `<img src="${esc(getProductImg(prod))}" alt="${esc(prod.name||'')}" onerror="this.src='${FALLBACK_IMG}'">`
            : `<i class="fas ${icon}"></i>`}
        </div>
        <div class="panel-slot-info">
          <p class="panel-slot-cat">${esc(label)}</p>
          <p class="panel-slot-name${prod?'':' empty'}">${prod ? esc(prod.name||'Producto') : 'Sin prenda'}</p>
          ${prod ? `<p class="panel-slot-price">${fmtPrice(prod.price)}</p>` : ''}
        </div>
        ${prod ? `<button class="panel-slot-del" data-slot="${id}" title="Quitar"><i class="fas fa-times"></i></button>` : ''}
      </div>`;
  }).join('');

  container.querySelectorAll('.panel-slot-row').forEach(r => {
    r.addEventListener('click', e => { if(!e.target.closest('.panel-slot-del')) setActiveSlot(r.dataset.slot); });
  });
  container.querySelectorAll('.panel-slot-del').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); unequipSlot(btn.dataset.slot); });
  });

  const total = Object.values(outfit).reduce((s,p) => s+Number(p?.price||0), 0);
  const el = document.getElementById('outfitTotal');
  if (el) el.textContent = fmtPrice(total) || '—';

  const saveBtn = document.getElementById('btnSaveOutfit');
  if (saveBtn) saveBtn.disabled = !Object.keys(outfit).length;
}

/* ═══════════════════════════════
   SAVE OUTFIT MODAL
═══════════════════════════════ */

function openSaveModal() {
  if (!Object.keys(outfit).length) return;
  const m = document.getElementById('saveOutfitModal');
  if (m) { m.style.display='flex'; m.querySelector('input')?.focus(); }
}
function closeSaveModal() {
  const m = document.getElementById('saveOutfitModal');
  if (m) m.style.display='none';
}
function confirmSaveOutfit() {
  const input = document.querySelector('#saveOutfitModal input');
  const name  = input?.value.trim() || 'Mi Outfit';
  const prendas = Object.entries(outfit).map(([slot,p]) => ({
    slot, id:p.id, name:p.name, price:p.price, image:getProductImg(p)
  }));
  const cols = getColecciones();
  const coverImg = prendas.find(p => p.slot==='full' || p.slot==='top')?.image || prendas[0]?.image || FALLBACK_IMG;
  cols.push({ id:Date.now(), nombre:name, descripcion:`${prendas.length} prenda${prendas.length!==1?'s':''} · Guardado desde el vestidor`,
    cover: coverImg, prendas, createdAt: new Date().toISOString() });
  saveColecciones(cols);
  closeSaveModal();
  showToast('¡Outfit guardado en tus colecciones!');
  setTimeout(() => switchTab('colecciones'), 900);
}

/* ═══════════════════════════════
   COLLECTIONS TAB
═══════════════════════════════ */

function getColecciones() {
  try { const r=localStorage.getItem(STORAGE_KEY); return r?JSON.parse(r):[]; }
  catch(_){ return []; }
}
function saveColecciones(cols) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cols)); } catch(_){}
}

function renderColecciones() {
  const grid  = document.getElementById('coleccionesGrid');
  const empty = document.getElementById('coleccionesEmpty');
  const cols  = getColecciones();
  if (!grid) return;
  if (!cols.length) {
    grid.style.display='none';
    if (empty) empty.style.display='block';
    return;
  }
  if (empty) empty.style.display='none';
  grid.style.display='grid';
  grid.innerHTML = cols.map((col,i) => {
    const pat  = TILE_PATTERN[i % TILE_PATTERN.length];
    const date = new Date(col.createdAt).toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'numeric'});
    const cnt  = col.prendas?.length || 0;
    return `
      <div class="col-tile ${pat}" style="--tile-delay:${i*80}ms">
        <img src="${esc(col.cover||FALLBACK_IMG)}" alt="${esc(col.nombre)}" loading="lazy" onerror="this.src='${FALLBACK_IMG}'"/>
        <div class="col-tile-overlay">
          <h3 class="col-tile-name">${esc(col.nombre)}</h3>
          <div class="col-tile-meta">
            <span><i class="fas fa-tshirt me-1"></i>${cnt} prenda${cnt!==1?'s':''}</span>
            <span>${esc(date)}</span>
          </div>
        </div>
        <div class="col-tile-actions">
          ${cnt>0?`<button class="col-tile-btn btn-load-col" data-col-id="${col.id}" title="Volver a poner en vestidor"><i class="fas fa-rotate-left"></i></button>`:''}
          <button class="col-tile-btn btn-del-col" data-col-id="${col.id}" title="Eliminar outfit"><i class="fas fa-trash"></i></button>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('.btn-del-col').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (!confirm('¿Eliminar esta colección?')) return;
      saveColecciones(getColecciones().filter(c=>c.id!==Number(btn.dataset.colId)));
      renderColecciones();
    });
  });
  grid.querySelectorAll('.btn-load-col').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const col = getColecciones().find(c=>c.id===Number(btn.dataset.colId));
      if (!col?.prendas?.length) return;
      outfit={};
      col.prendas.forEach(p => {
        const prod=allProducts.find(ap=>String(ap.id)===String(p.id));
        if (prod) outfit[p.slot]=prod;
      });
      switchTab('vestidor');
      renderMannequin(); renderOutfitPanel(); renderBrowserList();
    });
  });
}


/* ═══════════════════════════════
   TAB MANAGER
═══════════════════════════════ */

function switchTab(tabId) {
  document.querySelectorAll('.mc-tab').forEach(t => t.classList.toggle('is-active', t.dataset.tab===tabId));
  document.querySelectorAll('.mc-tab-panel').forEach(p => p.classList.toggle('is-active', p.dataset.panel===tabId));
  if (tabId==='colecciones') renderColecciones();
}

/* ═══════════════════════════════
   TOAST
═══════════════════════════════ */

function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText='position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:#0a0a0a;color:#fff;padding:.7rem 1.5rem;border-radius:999px;font-size:.82rem;font-weight:600;letter-spacing:.05em;z-index:2000;box-shadow:0 8px 24px rgba(0,0,0,.2);white-space:nowrap';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 3000);
}

/* ═══════════════════════════════
   INIT
═══════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  loadOutfitDraft();

  /* Tabs */
  document.querySelectorAll('.mc-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  /* Search */
  document.getElementById('browserSearch')?.addEventListener('input', function() {
    searchQuery = this.value; applyFilter();
  });

  /* Slot buttons */
  document.querySelectorAll('.outfit-slot').forEach(btn => {
    btn.addEventListener('click', () => setActiveSlot(btn.dataset.slot));
  });

  /* Mannequin zone clicks + drag-and-drop targets */
  document.querySelectorAll('.outfit-zone').forEach(zone => {
    const slotId = zone.dataset.zone;
    if (!slotId) return;
    zone.style.pointerEvents = 'auto';
    zone.style.cursor = 'pointer';
    zone.addEventListener('click', () => setActiveSlot(slotId));

    zone.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', e => {
      if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over');
    });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const pid  = e.dataTransfer.getData('text/plain') || draggedProductId;
      const prod = allProducts.find(p => String(p.id) === pid);
      if (prod) { setActiveSlot(slotId); equipProduct(slotId, prod); }
    });
  });

  /* Keyboard: Backspace / Delete → quitar prenda activa */
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if ((e.key === 'Backspace' || e.key === 'Delete') && outfit[activeSlot]) {
      unequipSlot(activeSlot);
    }
  });

  /* Fullscreen view */
  document.getElementById('btnZoomOutfit')?.addEventListener('click', openFullscreenView);
  document.getElementById('btnCloseFullscreen')?.addEventListener('click', closeFullscreenView);
  document.getElementById('stageFullscreen')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeFullscreenView();
  });

  /* Action buttons */
  document.getElementById('btnSaveOutfit')?.addEventListener('click', openSaveModal);
  document.getElementById('btnClearOutfit')?.addEventListener('click', () => {
    if (!Object.keys(outfit).length) return;
    if (confirm('¿Limpiar el outfit?')) clearOutfit();
  });
  document.getElementById('btnAddAllToCart')?.addEventListener('click', () => {
    showToast('Función de carrito próximamente');
  });

  /* Save modal */
  document.getElementById('btnConfirmSave')?.addEventListener('click', confirmSaveOutfit);
  document.getElementById('btnCancelSave')?.addEventListener('click',  closeSaveModal);
  document.getElementById('saveOutfitModal')?.addEventListener('click', e => {
    if (e.target===e.currentTarget) closeSaveModal();
  });
  document.querySelector('#saveOutfitModal input')?.addEventListener('keydown', e => {
    if (e.key==='Enter') confirmSaveOutfit();
  });

  /* Colecciones tab: "Armar outfit" and empty-state buttons both go to vestidor */
  document.getElementById('btnGoToVestidor')?.addEventListener('click', () => switchTab('vestidor'));
  document.getElementById('btnNewColEmpty')?.addEventListener('click', () => switchTab('vestidor'));

  /* Initial render */
  setActiveSlot('top');
  renderMannequin();
  renderOutfitPanel();
  updateProgress();
  loadProducts();

  /* First-visit drag hint */
  if (!localStorage.getItem('mvcq-drag-hint')) {
    setTimeout(() => {
      showToast('Tip: podés arrastrar prendas directo al maniquí');
      localStorage.setItem('mvcq-drag-hint', '1');
    }, 2200);
  }

  /* Hash routing */
  if (window.location.hash==='#colecciones') switchTab('colecciones');
});
