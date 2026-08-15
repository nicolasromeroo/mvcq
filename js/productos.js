/* =========================================
   PRODUCTOS — meVistoComoQuiero
   ========================================= */

const contenedor = document.getElementById("productsList");
const paginacion = document.getElementById("pagination");

const API_BASE = window.MVCQ_API;
const LIMIT = 9;
const IMG_FALLBACK = "../img/aestethic.jpg";
const LOOKBOOK = [
  "../img/ropa-alta.jpg",
  "../img/ropa-clara.jpg",
  "../img/aestethic2.jpg",
  "../img/vintage2.jpg",
  "../img/vintage5.jpg",
  "../img/vintage8.jpg",
];

let paginaActual = 1;
let ordenActual = "relevancia";

/* ─────────────────────────────
   HELPERS
───────────────────────────── */
function esc(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPrecio(n) {
  const v = Number(n);
  if (isNaN(v)) return "Consultar";
  return v.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/* Storewide payment perks (matches copy on pages/promociones.html
   and pages/carrito.html) — shown as a compact line on every card. */
const DESCUENTO_TRANSFERENCIA = 0.1; // 10% OFF, igual que "10% OFF abonando en EFECTIVO"
const CUOTAS_SIN_INTERES = 12; // igual que "Hasta 12 cuotas sin interés" en el carrito

function formatPrecioTransferencia(precio) {
  const v = Number(precio);
  if (isNaN(v)) return null;
  return formatPrecio(v * (1 - DESCUENTO_TRANSFERENCIA));
}

function resolveImg(producto) {
  const img =
    producto.imageUrl ||
    producto.imagen ||
    producto.image ||
    producto.thumbnail ||
    producto.img;
  if (!img) return IMG_FALLBACK;
  if (img.startsWith("http") || img.startsWith("../")) return img;
  return `${API_BASE}/${img.replace(/^\//, "")}`;
}

function resolveHoverImg(producto, index, principal) {
  const candidates = [
    producto.secondImageUrl,
    producto.imageUrlHover,
    producto.imagenHover,
    producto.hoverImage,
    producto.secondaryImage,
    producto.modelImage,
    Array.isArray(producto.images) ? producto.images[1] : null,
    Array.isArray(producto.gallery) ? producto.gallery[1] : null,
    Array.isArray(producto.imagenes) ? producto.imagenes[1] : null,
  ].filter(Boolean);

  const toUrl = (url) => {
    if (!url) return principal;
    if (url.startsWith("http") || url.startsWith("../")) return url;
    return `${API_BASE}/${url.replace(/^\//, "")}`;
  };

  const hover = toUrl(
    candidates[0] || LOOKBOOK[index % LOOKBOOK.length]
  );
  return hover === principal
    ? toUrl(LOOKBOOK[(index + 1) % LOOKBOOK.length])
    : hover;
}

function getProductList(data) {
  for (const key of ["products", "payload", "docs", "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return Array.isArray(data) ? data : [];
}

function renderStars(rating = 0) {
  const r = Math.round(rating * 2) / 2;
  let html = "";
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(r)) html += '<i class="fas fa-star"></i>';
    else if (i - 0.5 === r) html += '<i class="fas fa-star-half-alt"></i>';
    else html += '<i class="far fa-star"></i>';
  }
  return html;
}

/* ─────────────────────────────
   SKELETON LOADING
───────────────────────────── */
function mostrarSkeletons(n = LIMIT) {
  contenedor.innerHTML = Array.from({ length: n }, (_, i) => `
    <article class="producto-card is-skeleton" style="--card-delay:${i * 40}ms">
      <div class="producto-imagen"></div>
      <div class="producto-info" style="gap:8px; padding-top:12px">
        <div class="sk-line sk-line--s"></div>
        <div class="sk-line"></div>
        <div class="sk-line sk-line--m"></div>
        <div class="sk-line sk-line--p"></div>
      </div>
    </article>`
  ).join("");
}

/* ─────────────────────────────
   CARD BUILDER
───────────────────────────── */
function buildCard(producto, index) {
  const id = esc(producto._id || producto.id || producto.productId || "");
  const nombre = esc(producto.title || producto.name || "Producto sin nombre");
  const categoria = esc(producto.category || producto.categoria || "Capsule drop");
  const desc = esc(
    producto.description || producto.descripcion || ""
  );
  const imgPrincipal = resolveImg(producto);
  const imgHover = resolveHoverImg(producto, index, imgPrincipal);
  const precioOrig = producto.originalPrice || producto.precioOriginal;
  const tieneOferta =
    precioOrig && Number(precioOrig) > Number(producto.price);
  const pctDesc = tieneOferta
    ? Math.round((1 - Number(producto.price) / Number(precioOrig)) * 100)
    : 0;
  const esNuevo = producto.isNew || producto.nuevo || false;
  const agotado = producto.stock === 0 || producto.agotado === true;
  const rating = Number(producto.rating || producto.calificacion || 0);
  const reviewCount = Number(
    producto.reviewCount || producto.cantidadResenas || 0
  );

  const precioNum = Number(producto.price) || 0;
  const envioGratis = precioNum >= 15000;
  const colors = (producto.colors || producto.colores || []).slice(0, 5);
  const colorDotsHTML = colors
    .map(
      (c) =>
        `<span class="prod-color-dot" style="background:${esc(
          c.hex || c.color || c
        )}" title="${esc(c.name || c)}"></span>`
    )
    .join("");

  const badges = [
    esNuevo ? '<span class="prod-badge prod-badge--new">Nuevo</span>' : "",
    tieneOferta
      ? `<span class="prod-badge prod-badge--sale">-${pctDesc}%</span>`
      : "",
    agotado
      ? '<span class="prod-badge prod-badge--sold">Agotado</span>'
      : "",
  ]
    .filter(Boolean)
    .join("");

  return `
    <article
      class="producto-card${agotado ? " is-soldout" : ""}"
      style="--card-delay:${index * 70}ms"
      data-product-id="${id}"
      data-nombre="${nombre}"
      data-categoria="${categoria}"
      data-descripcion="${desc}"
      data-precio="${esc(String(producto.price ?? ""))}"
      data-precio-orig="${tieneOferta ? esc(String(precioOrig)) : ""}"
      data-pct-desc="${pctDesc}"
      data-img="${imgPrincipal}"
      data-img-hover="${imgHover}"
      data-rating="${rating}"
      data-reviews="${reviewCount}"
    >
      <div class="producto-imagen">
        ${badges ? `<div class="prod-badges">${badges}</div>` : ""}
        <img
          class="producto-imagen-principal"
          src="${imgPrincipal}"
          alt="${nombre}"
          loading="lazy"
        />
        <img
          class="producto-imagen-hover"
          src="${imgHover}"
          alt="${nombre} — look"
          loading="lazy"
        />
        <button class="producto-wishlist" aria-label="Guardar en favoritos" data-product-id="${id}">
          <i class="far fa-heart"></i>
        </button>
        ${
          !agotado
            ? `<button class="prod-quickview-btn" aria-label="Ver detalle de ${nombre}">
                <i class="fas fa-expand-alt me-1"></i>Ver detalle
               </button>`
            : ""
        }
      </div>
      <div class="producto-info">
        <span class="producto-cat">${categoria}</span>
        <h3 class="producto-nombre">${nombre}</h3>
        <div class="prod-rating${rating > 0 ? "" : " is-hidden"}">
          <span class="prod-stars">${renderStars(rating)}</span>
          ${reviewCount > 0 ? `<span class="prod-review-cnt">(${reviewCount})</span>` : ""}
        </div>
        <div class="prod-colors${colors.length ? "" : " is-hidden"}">${colorDotsHTML}</div>
        <div class="producto-precio-row">
          <span class="producto-precio">${formatPrecio(producto.price)}</span>
          ${
            tieneOferta
              ? `<span class="producto-precio-old">${formatPrecio(precioOrig)}</span>`
              : ""
          }
        </div>
        <div class="producto-financiacion">
          <span class="producto-fin-line">${formatPrecioTransferencia(producto.price)} con transferencia</span>
          <span class="producto-fin-line producto-fin-cuotas">Hasta ${CUOTAS_SIN_INTERES} cuotas sin interés</span>
        </div>
        <span class="prod-envio-gratis${envioGratis ? "" : " is-hidden"}"><i class="fas fa-truck"></i> Envío gratis</span>
        <div class="producto-card-actions">
          <button
            class="producto-add-btn${agotado ? " is-disabled" : ""}"
            ${agotado ? "disabled" : ""}
            aria-label="Agregar al carrito"
          >
            <i class="fas fa-shopping-bag me-1"></i>Agregar
          </button>
        </div>
      </div>
    </article>`;
}

/* ─────────────────────────────
   LOAD PRODUCTS
───────────────────────────── */
async function cargarProductos(page = 1, sort = ordenActual) {
  paginaActual = page;
  ordenActual = sort;
  mostrarSkeletons();

  try {
    const url = new URL("/product/products", API_BASE);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(LIMIT));
    if (sort && sort !== "relevancia") {
      url.searchParams.set("sort", sort);
    }

    // TODO: forward active filter state to API when backend supports it
    // e.g. url.searchParams.set("category", [...state.categorias].join(","));
    //      url.searchParams.set("minPrice", state.precioMin);
    //      url.searchParams.set("maxPrice", state.precioMax);
    //      url.searchParams.set("size", [...state.tallas].join(","));
    //      url.searchParams.set("color", [...state.colores].join(","));
    //      url.searchParams.set("q", state.busqueda);

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(
        `Error ${res.status}: ${errData?.message || "Error desconocido"}`
      );
    }

    const data = await res.json();
    const productos = getProductList(data);

    if (!productos.length) {
      renderEmptyState();
      paginacion.innerHTML = "";
      updateCount(0);
      return;
    }

    contenedor.innerHTML = productos.map(buildCard).join("");
    attachCardEvents();
    renderPaginacion(data.totalPages || 1, data.page || page);
    applyClientFilters();
    if (page > 1) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  } catch (err) {
    console.error("Error al cargar productos:", err);
    renderError(err.message);
  }
}

function updateCount(total) {
  const el = document.getElementById("productos-count");
  if (el) {
    el.textContent = total
      ? `${Number(total).toLocaleString("es-AR")} productos`
      : "";
  }
}

function renderEmptyState() {
  contenedor.innerHTML = `
    <div class="productos-empty">
      <div class="productos-empty-icon"><i class="fas fa-magnifying-glass"></i></div>
      <h3>Sin resultados</h3>
      <p>No encontramos productos con los filtros aplicados.<br>Probá ajustando o limpiando los filtros.</p>
      <button class="btn-empty-action" onclick="document.getElementById('filtros-clear-all')?.click()">
        <i class="fas fa-filter-circle-xmark me-1"></i>Limpiar filtros
      </button>
    </div>`;
}

function renderError(msg) {
  contenedor.innerHTML = `
    <div class="productos-empty">
      <div class="productos-empty-icon"><i class="fas fa-triangle-exclamation"></i></div>
      <h3>No se pudo cargar</h3>
      <p>${esc(msg)}</p>
      <button class="btn-empty-action" onclick="cargarProductos()">
        <i class="fas fa-rotate-right me-1"></i>Reintentar
      </button>
    </div>`;
}

/* ─────────────────────────────
   CLIENT-SIDE FILTER
───────────────────────────── */
const AUDIENCIA_KEYWORDS = {
  mujer:        ['mujer', 'femenin', 'dama', 'chica', 'woman', 'fem'],
  hombre:       ['hombre', 'masculin', 'caballero', 'varon', 'man', 'masc'],
  ninos:        ['niño', 'niña', 'nino', 'nina', 'infant', 'bebe', 'bebé', 'kids', 'child', 'nena', 'nene'],
  adolescentes: ['adolescente', 'teen', 'junior', 'joven'],
  tradicional:  ['tradicional', 'clasico', 'clásico', 'classic'],
};

/* Match a filter token against text, handling singular/plural automatically */
function tokenMatches(filterVal, text) {
  const f = filterVal.toLowerCase().trim();
  const t = text.toLowerCase();
  if (!f) return true;
  if (t.includes(f)) return true;
  /* Try stem: strip trailing 's' or 'es' to handle singular/plural */
  const stem = f.endsWith('es') && f.length > 4
    ? f.slice(0, -2)
    : f.endsWith('s') && f.length > 3
      ? f.slice(0, -1)
      : f;
  if (stem !== f && t.includes(stem)) return true;
  return false;
}

function applyClientFilters() {
  const state = window.mvcqFilterState;
  if (!state) return;

  const checkedCats = [...state.categorias];
  const checkedAuds = [...state.audiencias];

  /* Nothing active → restore all cards */
  if (!checkedCats.length && !checkedAuds.length) {
    contenedor.querySelectorAll('.producto-card').forEach((c) => (c.style.display = ''));
    contenedor.querySelector('.js-filter-empty')?.remove();
    return;
  }

  const cards = contenedor.querySelectorAll('.producto-card:not(.is-skeleton)');
  let visible = 0;

  cards.forEach((card) => {
    /* Use name + category (fallback) for matching */
    const cardText = [
      card.dataset.nombre     || '',
      card.dataset.categoria  || '',
      card.dataset.descripcion || '',
    ].join(' ').toLowerCase();

    const catMatch = !checkedCats.length ||
      checkedCats.some((c) => tokenMatches(c, cardText));

    const audMatch = !checkedAuds.length ||
      checkedAuds.some((aud) => {
        const kws = AUDIENCIA_KEYWORDS[aud] || [aud];
        return kws.some((kw) => cardText.includes(kw));
      });

    const show = catMatch && audMatch;
    card.style.display = show ? '' : 'none';
    if (show) visible++;
  });

  const countEl = document.getElementById('productos-count');
  if (countEl) {
    countEl.textContent = visible
      ? `${visible.toLocaleString('es-AR')} producto${visible !== 1 ? 's' : ''}`
      : '';
  }

  if (visible === 0 && cards.length > 0) {
    if (!contenedor.querySelector('.js-filter-empty')) {
      const div = document.createElement('div');
      div.className = 'productos-empty js-filter-empty';
      div.innerHTML = `
        <div class="productos-empty-icon"><i class="fas fa-magnifying-glass"></i></div>
        <h3>Sin resultados</h3>
        <p>No encontramos productos con los filtros aplicados.<br>Probá ajustando o limpiando los filtros.</p>
        <button class="btn-empty-action" onclick="document.getElementById('filtros-clear-all')?.click()">
          <i class="fas fa-filter-circle-xmark me-1"></i>Limpiar filtros
        </button>`;
      contenedor.appendChild(div);
    }
  } else {
    contenedor.querySelector('.js-filter-empty')?.remove();
  }
}

/* ─────────────────────────────
   PAGINATION
───────────────────────────── */
function renderPaginacion(totalPages, currentPage) {
  paginacion.innerHTML = "";
  if (totalPages <= 1) return;

  const prevLi = makePageItem(
    '<i class="fas fa-chevron-left"></i>',
    "Anterior",
    currentPage > 1,
    false,
    () => cargarProductos(currentPage - 1)
  );
  paginacion.appendChild(prevLi);

  buildPageNums(currentPage, totalPages).forEach((p) => {
    if (p === "…") {
      const li = document.createElement("li");
      li.className = "page-item disabled";
      li.innerHTML = `<span class="page-link">…</span>`;
      paginacion.appendChild(li);
    } else {
      paginacion.appendChild(
        makePageItem(
          String(p),
          String(p),
          true,
          p === currentPage,
          () => cargarProductos(p)
        )
      );
    }
  });

  const nextLi = makePageItem(
    '<i class="fas fa-chevron-right"></i>',
    "Siguiente",
    currentPage < totalPages,
    false,
    () => cargarProductos(currentPage + 1)
  );
  paginacion.appendChild(nextLi);
}

function makePageItem(html, label, enabled, isActive, onClick) {
  const li = document.createElement("li");
  li.className = `page-item${!enabled ? " disabled" : ""}${isActive ? " active" : ""}`;
  li.innerHTML = `<a class="page-link" href="#" aria-label="${esc(label)}">${html}</a>`;
  if (enabled && !isActive) {
    li.querySelector("a").addEventListener("click", (e) => {
      e.preventDefault();
      onClick();
    });
  }
  return li;
}

function buildPageNums(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

/* ─────────────────────────────
   GRID DENSITY TOGGLE
───────────────────────────── */
function initGridToggle() {
  const btns = document.querySelectorAll("#grid-toggle .grid-btn");
  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      btns.forEach((b) => b.classList.remove("grid-btn--active"));
      btn.classList.add("grid-btn--active");
      contenedor.dataset.cols = btn.dataset.cols;
    });
  });
}

/* ─────────────────────────────
   TOPBAR SEARCH
───────────────────────────── */
function initSearch() {
  const trigger = document.getElementById("topbar-search-trigger");
  const box = document.getElementById("topbar-search-box");
  const input = document.getElementById("topbar-search-input");
  const clearBtn = document.getElementById("topbar-search-clear");
  if (!trigger || !box || !input) return;

  let searchTimer = null;

  trigger.addEventListener("click", () => {
    const isOpen = box.classList.toggle("is-open");
    trigger.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) input.focus();
  });

  clearBtn?.addEventListener("click", () => {
    input.value = "";
    input.focus();
    // TODO: trigger search with empty query when backend supports it
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      box.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });

  input.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const q = input.value.trim();
      // TODO: POST /product/search?q=... or GET /product/products?q=...
      // cargarProductos(1, ordenActual, q);
      console.info("[Search] query:", q);
    }, 420);
  });

  document.addEventListener("click", (e) => {
    if (
      box.classList.contains("is-open") &&
      !box.contains(e.target) &&
      e.target !== trigger
    ) {
      box.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });
}

/* ─────────────────────────────
   TOAST SYSTEM
───────────────────────────── */
function toast(msg, type = "success", icon = "fa-check") {
  const stack = document.getElementById("toastStack");
  if (!stack) return;
  const el = document.createElement("div");
  el.className = `toast-item toast-item--${type}`;
  el.innerHTML = `
    <span class="toast-icon"><i class="fas ${icon}"></i></span>
    <span class="toast-msg">${esc(msg)}</span>`;
  stack.prepend(el);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => el.classList.add("is-visible"))
  );
  setTimeout(() => {
    el.classList.remove("is-visible");
    el.addEventListener("transitionend", () => el.remove(), { once: true });
  }, 3000);
}

/* ─────────────────────────────
   QUICK VIEW SYSTEM
───────────────────────────── */
const QV = {
  qty: 1,
  selectedSize: null,
  selectedColor: null,
  productId: null,
  _fetchAbort: null,

  open(card) {
    const modal = document.getElementById("qvModal");
    const backdrop = document.getElementById("qvBackdrop");
    if (!modal) return;

    this.qty = 1;
    this.selectedSize = null;
    this.selectedColor = null;
    this.productId = card.dataset.productId || null;
    this._card = card;

    /* Reset color group */
    const colorGroup = document.getElementById("qvColorGroup");
    if (colorGroup) {
      colorGroup.style.display = "none";
      const colorRow = document.getElementById("qvColorRow");
      if (colorRow) colorRow.innerHTML = "";
      document.getElementById("qvColorLabel").textContent = "—";
    }

    /* Populate text */
    document.getElementById("qvProductName").textContent =
      card.dataset.nombre || "";
    document.getElementById("qvCat").textContent =
      card.dataset.categoria || "";
    document.getElementById("qvDesc").textContent =
      card.dataset.descripcion || "";

    /* Price */
    const price = card.dataset.precio;
    const priceOrig = card.dataset.precioOrig;
    const pct = card.dataset.pctDesc;
    document.getElementById("qvPrice").textContent = formatPrecio(price);

    const origEl = document.getElementById("qvPriceOrig");
    const discEl = document.getElementById("qvDiscBadge");
    if (priceOrig && Number(priceOrig) > 0) {
      origEl.textContent = formatPrecio(priceOrig);
      origEl.style.display = "";
      discEl.textContent = `-${pct}%`;
      discEl.style.display = "";
    } else {
      origEl.style.display = "none";
      discEl.style.display = "none";
    }

    /* Gallery */
    const imgMain = card.dataset.img || IMG_FALLBACK;
    const imgHover = card.dataset.imgHover || imgMain;
    const mainEl = document.getElementById("qvMainImg");
    mainEl.src = imgMain;
    mainEl.alt = card.dataset.nombre || "";

    const thumbsEl = document.getElementById("qvThumbs");
    thumbsEl.innerHTML = [imgMain, imgHover]
      .map(
        (src, i) => `
        <button class="qv-thumb${i === 0 ? " is-active" : ""}" data-src="${esc(src)}">
          <img src="${src}" alt="Vista ${i + 1}" loading="lazy" />
        </button>`
      )
      .join("");

    thumbsEl.querySelectorAll(".qv-thumb").forEach((t) => {
      t.addEventListener("click", () => {
        thumbsEl
          .querySelectorAll(".qv-thumb")
          .forEach((x) => x.classList.remove("is-active"));
        t.classList.add("is-active");
        mainEl.style.opacity = "0";
        setTimeout(() => {
          mainEl.src = t.dataset.src;
          mainEl.style.opacity = "1";
        }, 150);
      });
    });

    /* Rating */
    const rating = parseFloat(card.dataset.rating || 0);
    const reviews = parseInt(card.dataset.reviews || 0);
    const ratingRow = document.getElementById("qvRatingRow");
    if (rating > 0) {
      document.getElementById("qvStars").innerHTML = renderStars(rating);
      document.getElementById("qvReviewCount").textContent =
        reviews > 0 ? `${reviews} reseñas` : "";
      ratingRow.style.display = "";
    } else {
      ratingRow.style.display = "none";
    }

    /* Reset quantity + size */
    document.getElementById("qvQtyVal").textContent = "1";
    document
      .querySelectorAll(".qv-sz-btn")
      .forEach((b) => b.classList.remove("is-active"));
    document.getElementById("qvSizeLabel").textContent = "Seleccionar";
    const sizeErr = document.getElementById("qvSizeError");
    if (sizeErr) sizeErr.style.display = "none";

    /* Async enrichment — fires after modal is visible */
    if (this.productId) this._enrich(this.productId);

    /* Restore heart state in modal */
    const heartBtn = document.getElementById("qvHeartBtn");
    if (heartBtn && typeof isFavorited === "function") {
      const liked = isFavorited(this.productId);
      heartBtn.classList.toggle("is-liked", liked);
      const icon = heartBtn.querySelector("i");
      if (icon) icon.className = liked ? "fas fa-heart" : "far fa-heart";
    }

    /* Show */
    modal.style.display = "flex";
    backdrop.classList.add("is-visible");
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() =>
      requestAnimationFrame(() => modal.classList.add("is-open"))
    );
  },

  async _enrich(id) {
    if (this._fetchAbort) this._fetchAbort.abort();
    const ctrl = new AbortController();
    this._fetchAbort = ctrl;

    const sizeRow = document.getElementById("qvSizeRow");
    if (sizeRow) sizeRow.style.opacity = "0.45";

    try {
      const res = await fetch(`${API_BASE}/product/products/${id}`, {
        signal: ctrl.signal,
      });
      if (!res.ok) return;
      const data = await res.json();

      if (this.productId !== id) return; // user switched product mid-flight

      if (data.description) {
        document.getElementById("qvDesc").textContent = data.description;
      }

      if (data.variants?.length) {
        /* Size availability: aggregate stock per size */
        const sizeStock = {};
        data.variants.forEach(({ attributes: a, stock }) => {
          if (!a?.size) return;
          sizeStock[a.size] = (sizeStock[a.size] || 0) + (stock || 0);
        });
        document.querySelectorAll(".qv-sz-btn").forEach((btn) => {
          const sz = btn.dataset.size;
          if (sz in sizeStock) {
            btn.classList.toggle("is-unavailable", sizeStock[sz] === 0);
          }
        });

        /* Color swatches: deduplicate by color name */
        const colorMap = new Map();
        data.variants.forEach(({ attributes: a }) => {
          if (a?.color && !colorMap.has(a.color)) colorMap.set(a.color, a.hex || null);
        });
        if (colorMap.size > 0) {
          const colorRow = document.getElementById("qvColorRow");
          const colorGroup = document.getElementById("qvColorGroup");
          colorRow.innerHTML = [...colorMap.entries()]
            .map(
              ([color, hex]) =>
                `<button class="qv-color-swatch" data-color="${esc(color)}" title="${esc(color)}"` +
                (hex ? ` style="background:${esc(hex)}"` : "") +
                `></button>`
            )
            .join("");
          colorRow.querySelectorAll(".qv-color-swatch").forEach((dot) => {
            dot.addEventListener("click", () => {
              colorRow
                .querySelectorAll(".qv-color-swatch")
                .forEach((d) => d.classList.remove("is-active"));
              dot.classList.add("is-active");
              QV.selectedColor = dot.dataset.color;
              document.getElementById("qvColorLabel").textContent =
                dot.dataset.color;
            });
          });
          colorGroup.style.display = "";
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") console.warn("[QV] enrich failed", e);
    } finally {
      if (this.productId === id && sizeRow) sizeRow.style.opacity = "";
    }
  },

  close() {
    const modal = document.getElementById("qvModal");
    const backdrop = document.getElementById("qvBackdrop");
    if (!modal) return;
    modal.classList.remove("is-open");
    backdrop.classList.remove("is-visible");
    document.body.style.overflow = "";
    modal.querySelector(".qv-panel").addEventListener(
      "transitionend",
      () => { modal.style.display = "none"; },
      { once: true }
    );
  },

  init() {
    const modal = document.getElementById("qvModal");
    if (!modal) return;

    document.getElementById("qvClose")?.addEventListener("click", () => this.close());
    document.getElementById("qvBackdrop")?.addEventListener("click", () => this.close());

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) {
        this.close();
      }
    });

    /* Quantity */
    document.getElementById("qvQtyMinus")?.addEventListener("click", () => {
      const el = document.getElementById("qvQtyVal");
      const v = Math.max(1, parseInt(el.textContent) - 1);
      el.textContent = v;
      this.qty = v;
    });
    document.getElementById("qvQtyPlus")?.addEventListener("click", () => {
      const el = document.getElementById("qvQtyVal");
      const v = Math.min(10, parseInt(el.textContent) + 1);
      el.textContent = v;
      this.qty = v;
    });

    /* Size selection */
    document.querySelectorAll(".qv-sz-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.classList.contains("is-unavailable")) return;
        document
          .querySelectorAll(".qv-sz-btn")
          .forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        this.selectedSize = btn.dataset.size;
        document.getElementById("qvSizeLabel").textContent = this.selectedSize;
        const sizeErr = document.getElementById("qvSizeError");
        if (sizeErr) sizeErr.style.display = "none";
      });
    });

    /* Add to cart */
    document.getElementById("qvCartBtn")?.addEventListener("click", () => {
      if (!this.selectedSize) {
        const row = document.getElementById("qvSizeRow");
        row?.classList.add("shake");
        row?.addEventListener(
          "animationend",
          () => row.classList.remove("shake"),
          { once: true }
        );
        const sizeErr = document.getElementById("qvSizeError");
        if (sizeErr) sizeErr.style.display = "";
        return;
      }
      const item = {
        productId: this.productId,
        name: document.getElementById("qvProductName")?.textContent || "",
        categoria: document.getElementById("qvCat")?.textContent || "",
        price: parseFloat(this._card?.dataset?.precio) || 0,
        image: this._card?.dataset?.img || "",
        size: this.selectedSize,
        qty: this.qty,
      };
      if (typeof addToCart === "function") addToCart(item);
      toast(
        `Talle ${this.selectedSize} × ${this.qty} agregado al carrito`,
        "success",
        "fa-shopping-bag"
      );
      this.close();
    });

    /* Wishlist in modal */
    document.getElementById("qvHeartBtn")?.addEventListener("click", () => {
      const btn = document.getElementById("qvHeartBtn");
      btn.classList.toggle("is-liked");
      const liked = btn.classList.contains("is-liked");
      btn.querySelector("i").className = liked ? "fas fa-heart" : "far fa-heart";
      if (typeof toggleFavorite === "function" && this._card) {
        const product = {
          productId: this.productId,
          name: this._card.dataset.nombre || "",
          categoria: this._card.dataset.categoria || "",
          price: parseFloat(this._card.dataset.precio) || 0,
          precioOriginal: parseFloat(this._card.dataset.precioOrig) || 0,
          image: this._card.dataset.img || "",
          imageHover: this._card.dataset.imgHover || "",
        };
        toggleFavorite(product);
      }
      toast(
        liked ? "Guardado en favoritos" : "Eliminado de favoritos",
        liked ? "heart" : "info",
        liked ? "fa-heart" : "fa-heart-crack"
      );
    });

    /* Size guide */
    document.getElementById("qvSizeGuideBtn")?.addEventListener("click", () => {
      SG.open();
    });
  },
};

/* ─────────────────────────────
   SIZE GUIDE MODAL
───────────────────────────── */
const SG = {
  open() {
    const modal = document.getElementById("sgModal");
    const backdrop = document.getElementById("sgBackdrop");
    if (!modal) return;
    modal.style.display = "flex";
    backdrop.classList.add("is-visible");
    requestAnimationFrame(() =>
      requestAnimationFrame(() => modal.classList.add("is-open"))
    );
  },
  close() {
    const modal = document.getElementById("sgModal");
    const backdrop = document.getElementById("sgBackdrop");
    if (!modal) return;
    modal.classList.remove("is-open");
    backdrop.classList.remove("is-visible");
    modal.querySelector(".sg-panel").addEventListener(
      "transitionend",
      () => { modal.style.display = "none"; },
      { once: true }
    );
  },
  init() {
    document.getElementById("sgClose")?.addEventListener("click", () => this.close());
    document.getElementById("sgBackdrop")?.addEventListener("click", () => this.close());
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        document.getElementById("sgModal")?.classList.contains("is-open")
      ) {
        this.close();
      }
    });
  },
};

/* ─────────────────────────────
   CARD EVENT DELEGATION
───────────────────────────── */
function attachCardEvents() {
  contenedor.querySelectorAll(".prod-quickview-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const card = btn.closest(".producto-card");
      if (card) QV.open(card);
    });
  });

  contenedor.querySelectorAll(".producto-nombre").forEach((el) => {
    el.addEventListener("click", () => {
      const card = el.closest(".producto-card");
      if (card) QV.open(card);
    });
  });

  /* Restore heart/favorites state */
  if (typeof isFavorited === "function") {
    contenedor.querySelectorAll(".producto-wishlist[data-product-id]").forEach((btn) => {
      const liked = isFavorited(btn.dataset.productId);
      btn.classList.toggle("is-liked", liked);
      const icon = btn.querySelector("i");
      if (icon) icon.className = liked ? "fas fa-heart" : "far fa-heart";
    });
  }
}

/* ─────────────────────────────
   INIT
───────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  /* Read URL params and pre-apply filters */
  const urlParams = new URLSearchParams(window.location.search);
  const audienciaParam = urlParams.get("audiencia");

  if (audienciaParam) {
    /* Pre-check the checkbox — productos-filtros.js listens for change events */
    const cb = document.querySelector(`input[name="audiencia"][value="${audienciaParam}"]`);
    if (cb) {
      cb.checked = true;
      cb.dispatchEvent(new Event("change", { bubbles: true }));
    }
    /* Update breadcrumb */
    const LABELS = { mujer: "Mujer", hombre: "Hombre", ninos: "Niños", adolescentes: "Adolescentes", tradicional: "Tradicional" };
    const crumb = document.querySelector(".breadcrumb-item.active");
    if (crumb) crumb.textContent = LABELS[audienciaParam] || audienciaParam;
  }

  cargarProductos(paginaActual);

  /* Re-apply client filters whenever sidebar state changes */
  document.addEventListener("filtros:changed", applyClientFilters);

  QV.init();
  SG.init();
  initGridToggle();
  initSearch();

  /* Wishlist toggle on cards (delegation) */
  contenedor.addEventListener("click", (e) => {
    const btn = e.target.closest(".producto-wishlist");
    if (!btn) return;
    e.preventDefault();
    const card = btn.closest(".producto-card");
    if (typeof toggleFavorite === "function" && card) {
      const product = {
        productId: card.dataset.productId || "",
        name: card.dataset.nombre || "",
        categoria: card.dataset.categoria || "",
        price: parseFloat(card.dataset.precio) || 0,
        precioOriginal: parseFloat(card.dataset.precioOrig) || 0,
        image: card.dataset.img || "",
        imageHover: card.dataset.imgHover || "",
      };
      const liked = toggleFavorite(product);
      btn.classList.toggle("is-liked", liked);
      const icon = btn.querySelector("i");
      if (icon) { icon.className = liked ? "fas fa-heart" : "far fa-heart"; }
      toast(
        liked ? "Guardado en favoritos" : "Eliminado de favoritos",
        liked ? "heart" : "info",
        liked ? "fa-heart" : "fa-heart-crack"
      );
    } else {
      btn.classList.toggle("is-liked");
      const icon = btn.querySelector("i");
      if (icon) { icon.classList.toggle("far"); icon.classList.toggle("fas"); }
    }
  });

  /* Add to cart on cards → opens Quick View for size selection */
  contenedor.addEventListener("click", (e) => {
    const btn = e.target.closest(".producto-add-btn");
    if (!btn || btn.disabled) return;
    e.preventDefault();
    const card = btn.closest(".producto-card");
    if (card) QV.open(card);
  });

  /* Sort change */
  document.getElementById("ordenar")?.addEventListener("change", (e) => {
    cargarProductos(1, e.target.value);
  });
});
