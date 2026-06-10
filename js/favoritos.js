/* =====================================================
   favoritos.js — Me Visto Como Quiero
   Favorites page: render grid, remove, add to cart
   ===================================================== */

const FAV_ENVIO_THRESHOLD = 15000;

function esc(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatARS(n) {
  const v = Number(n);
  if (isNaN(v)) return 'Consultar';
  return v.toLocaleString('es-AR', {
    style: 'currency', currency: 'ARS',
    minimumFractionDigits: 0, maximumFractionDigits: 0
  });
}

/* ── Toast ── */
function favToast(msg, type = 'success', icon = 'fa-check') {
  const stack = document.getElementById('toastStack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = `toast-item toast-item--${type}`;
  el.innerHTML = `<span class="toast-icon"><i class="fas ${icon}"></i></span><span>${esc(msg)}</span>`;
  stack.prepend(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-visible')));
  setTimeout(() => {
    el.classList.remove('is-visible');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  }, 3000);
}

/* ── Card builder ── */
function buildFavCard(product, idx) {
  const id = esc(product.productId || '');
  const nombre = esc(product.name || 'Producto');
  const cat = esc(product.categoria || '');
  const imgSrc = esc(product.image || '../img/aestethic.jpg');
  const price = Number(product.price) || 0;
  const tieneOferta = product.precioOriginal && Number(product.precioOriginal) > price;
  const pct = tieneOferta ? Math.round((1 - price / Number(product.precioOriginal)) * 100) : 0;
  const envioGratis = price >= FAV_ENVIO_THRESHOLD;

  return `
    <article class="fav-card" style="--card-delay:${idx * 60}ms" data-product-id="${id}">
      <div class="fav-card-img">
        <img src="${imgSrc}" alt="${nombre}" loading="lazy" onerror="this.src='../img/aestethic.jpg'" />
        <button class="fav-remove-btn" aria-label="Quitar de favoritos" data-action="remove" title="Quitar de favoritos">
          <i class="fas fa-heart-crack"></i>
        </button>
        ${tieneOferta ? `<span class="fav-badge-sale">−${pct}%</span>` : ''}
      </div>
      <div class="fav-card-info">
        ${cat ? `<span class="fav-card-cat">${cat}</span>` : ''}
        <h3 class="fav-card-name">${nombre}</h3>
        <div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap">
          <span class="fav-card-price">${formatARS(price)}</span>
          ${tieneOferta ? `<span class="fav-card-price-old">${formatARS(product.precioOriginal)}</span>` : ''}
        </div>
        ${envioGratis ? `<span class="fav-envio-gratis"><i class="fas fa-truck"></i> Envío gratis</span>` : ''}
        <div class="fav-card-actions">
          <button class="fav-add-btn" data-action="add-to-cart" aria-label="Agregar al carrito">
            <i class="fas fa-shopping-bag me-1"></i>Agregar
          </button>
        </div>
      </div>
    </article>`;
}

/* ── Render ── */
function renderEmpty() {
  const grid = document.getElementById('favGrid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="favoritos-empty" style="grid-column:1/-1">
      <div class="favoritos-empty-icon"><i class="far fa-heart"></i></div>
      <h3>Tu lista está vacía</h3>
      <p>Guardá las prendas que más te gusten<br>tocando el corazón en cada producto.</p>
      <a href="productos.html" class="btn-ir-tienda">
        <i class="fas fa-arrow-right me-1"></i>Explorar productos
      </a>
    </div>`;
  const clearBtn = document.getElementById('clearFavsBtn');
  if (clearBtn) clearBtn.style.display = 'none';
}

function updateCountUI(count) {
  const heroCount = document.getElementById('favHeroCount');
  const countEl = document.getElementById('favCount');
  const clearBtn = document.getElementById('clearFavsBtn');
  const label = `${count} ${count === 1 ? 'prenda guardada' : 'prendas guardadas'}`;
  if (heroCount) heroCount.textContent = label;
  if (countEl) countEl.textContent = label.toUpperCase();
  if (clearBtn) clearBtn.style.display = count > 0 ? '' : 'none';
}

function renderFavorites() {
  const favs = getLocalFavorites();
  const grid = document.getElementById('favGrid');
  if (!grid) return;

  updateCountUI(favs.items.length);

  if (!favs.items.length) {
    renderEmpty();
    return;
  }
  grid.innerHTML = favs.items.map((item, i) => buildFavCard(item, i)).join('');
  attachGridEvents();
}

/* ── Event delegation ── */
function attachGridEvents() {
  const grid = document.getElementById('favGrid');
  if (!grid) return;

  grid.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const card = btn.closest('.fav-card');
    if (!card) return;
    const productId = card.dataset.productId;
    const action = btn.dataset.action;

    if (action === 'remove') {
      removeFromFavorites(productId);
      favToast('Eliminado de favoritos', 'info', 'fa-heart-crack');
      renderFavorites();
      return;
    }

    if (action === 'add-to-cart') {
      const favs = getLocalFavorites();
      const product = favs.items.find(i => i.productId === productId);
      if (!product) return;

      /* Open a simple size prompt or add without size */
      const size = prompt('¿Qué talle necesitás? (XS / S / M / L / XL / XXL)', 'M');
      if (!size) return;

      await addToCart({
        productId: product.productId,
        name: product.name,
        categoria: product.categoria,
        price: product.price,
        image: product.image,
        size: size.toUpperCase().trim(),
        qty: 1
      });

      favToast(`${product.name || 'Prenda'} agregada al carrito`, 'success', 'fa-shopping-bag');
    }
  });
}

/* ── Clear all ── */
function initClearFavsBtn() {
  document.getElementById('clearFavsBtn')?.addEventListener('click', () => {
    if (!confirm('¿Eliminar todos tus favoritos?')) return;
    saveLocalFavorites({ items: [] });
    favToast('Lista de favoritos vaciada', 'info', 'fa-trash-alt');
    renderFavorites();
  });
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  renderFavorites();
  initClearFavsBtn();
});
