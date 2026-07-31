/* ═══════════════════════════════════════════════════
   ADMIN PANEL JS – Me Visto Como Quiero
   ═══════════════════════════════════════════════════ */

const API = "https://web-vd8s1gd9atgj.up-de-fra1-k8s-1.apps.run-on-seenode.com";
const STORAGE_USERS = "mvcq-admin-users";
const FALLBACK_IMG = "../img/aestethic.jpg";
const LOOKBOOK_FALLBACKS = [
  "../img/ropa-alta.jpg",
  "../img/ropa-clara.jpg",
  "../img/aestethic2.jpg",
  "../img/vintage2.jpg",
  "../img/vintage5.jpg",
  "../img/vintage8.jpg",
];

/* ── Size systems per category ── */
const SIZE_SYSTEMS = {
  ropa: {
    hint: 'Ropa',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    defaults: ['M', 'L', 'XL'],
  },
  pantalones: {
    hint: 'Cintura (pulgadas)',
    sizes: ['26', '28', '30', '32', '34', '36', '38', '40', '42'],
    defaults: ['28', '30', '32', '34'],
  },
  calzado: {
    hint: 'Calzado (AR)',
    sizes: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
    defaults: ['37', '38', '39', '40', '41'],
  },
  unico: {
    hint: 'Talla única',
    sizes: ['Único'],
    defaults: ['Único'],
  },
};

const CATEGORY_TO_SYSTEM = {
  'Remeras':    'ropa',
  'Buzos':      'ropa',
  'Camisas':    'ropa',
  'Camperas':   'ropa',
  'Vestidos':   'ropa',
  'Polleras':   'ropa',
  'Shorts':     'ropa',
  'Pantalones': 'pantalones',
  'Calzado':    'calzado',
  'Accesorios': 'unico',
  'Otro':       'ropa',
};

function updateSizeGrid(category, preselectSizes = null) {
  const grid = document.getElementById('sizeGrid');
  const tag  = document.getElementById('sizeSystemTag');
  if (!grid) return;

  const systemKey = CATEGORY_TO_SYSTEM[category] || 'ropa';
  const system    = SIZE_SYSTEMS[systemKey];
  const toCheck   = preselectSizes?.length ? preselectSizes : system.defaults;

  if (tag) tag.textContent = system.hint;

  const chips = `${system.sizes.map(size => `
      <label class="pf-size-chip">
        <input type="checkbox" name="sizes" value="${size}" ${toCheck.includes(size) ? 'checked' : ''} />
        <span>${size}</span>
      </label>`).join('')}`;

  if (grid.children.length > 0) {
    grid.classList.add('is-updating');
    setTimeout(() => { grid.innerHTML = chips; grid.classList.remove('is-updating'); }, 130);
  } else {
    grid.innerHTML = chips;
  }
}

/* ── Helpers ── */
function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildAdminPriceHTML(prod) {
  const price = Number(prod.price);
  const orig = Number(prod.originalPrice);
  if (orig && orig > price) {
    const pct = Math.round((1 - price / orig) * 100);
    return `
      <span class="admin-card-price-row">
        <span class="admin-card-price">${fmtPrice(price)}</span>
        <span class="admin-card-price-old">${fmtPrice(orig)}</span>
        <span class="admin-card-discount-badge">-${pct}%</span>
      </span>`;
  }
  return `<span class="admin-card-price">${fmtPrice(price)}</span>`;
}

function fmtPrice(p) {
  const n = Number(p);
  if (Number.isNaN(n)) return "Consultar";
  return n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function getImg(prod) {
  const raw =
    prod.imageUrl || prod.imagen || prod.image || prod.thumbnail || prod.img;
  if (!raw) return FALLBACK_IMG;
  if (raw.startsWith("http")) return raw;
  return `${API}/${raw.replace(/^\//, "")}`;
}

function getImgHover(prod, index = 0) {
  const raw =
    prod.secondImageUrl ||
    prod.imageUrlHover ||
    prod.imagenHover ||
    prod.hoverImage ||
    prod.secondaryImage ||
    (Array.isArray(prod.images) && prod.images[1]) ||
    null;
  if (raw) {
    if (raw.startsWith("http")) return raw;
    return `${API}/${raw.replace(/^\//, "")}`;
  }
  return LOOKBOOK_FALLBACKS[index % LOOKBOOK_FALLBACKS.length];
}

function getName(prod) {
  return prod.title || prod.name || "Producto sin nombre";
}

function getCat(prod) {
  return prod.category || prod.categoria || "General";
}

function getId(prod) {
  return prod._id || prod.id || prod.productId;
}

function extractList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.payload)) return data.payload;
  if (Array.isArray(data?.docs)) return data.docs;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

/* ── Published state (from product.isActive in DB) ── */
function isPublished(id) {
  const prod = allProducts.find((p) => getId(p) === id);
  return prod ? !!prod.isActive : false;
}

async function togglePublished(id) {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API}/product/${id}/toggle-active`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + token,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const updated = await res.json();
    // Update local data
    const prod = allProducts.find((p) => getId(p) === id);
    if (prod) prod.isActive = updated.isActive;
    return updated.isActive;
  } catch (err) {
    console.error("Error al cambiar estado del producto:", err);
    showToast("Error al cambiar estado del producto", "error");
    return null;
  }
}

/* ── Mock users (localStorage) ── */
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_USERS)) || [];
  } catch {
    return [];
  }
}

function saveUsers(list) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(list));
}

function seedUsersIfEmpty() {
  if (getUsers().length) return;
  const seed = [
    {
      id: crypto.randomUUID(),
      username: localStorage.getItem("username") || "Admin",
      email: "admin@mvcq.com",
      role: "admin",
      createdAt: new Date().toISOString(),
    },
  ];
  saveUsers(seed);
}

/* ── Fetch real users from backend and merge into localStorage ── */
async function fetchBackendUsers() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API}/users/all`, {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + token,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = extractList(data);
    if (!list.length) return;

    const localUsers = getUsers();
    const localEmails = new Set(localUsers.map((u) => u.email));

    const mapped = list
      .filter((u) => u.email && !localEmails.has(u.email))
      .map((u) => ({
        id: u._id || u.id || crypto.randomUUID(),
        username: u.username || u.name || u.email,
        email: u.email,
        role: (u.role || u.userRole || u.rol || "user").toLowerCase(),
        createdAt: u.createdAt || u.created_at || new Date().toISOString(),
      }));

    if (mapped.length) {
      saveUsers([...localUsers, ...mapped]);
    }
  } catch (err) {
    console.warn("No se pudieron obtener usuarios del backend:", err);
  }
}

/* ── State ── */
let allProducts = [];
let currentSection = "dashboard";
let editingProductId = null;

/* ── DOM refs ── */
const sidebar = document.getElementById("adminSidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const navBtns = document.querySelectorAll(".admin-nav-btn");
const sections = document.querySelectorAll(".admin-section");
const quickBtns = document.querySelectorAll("[data-goto]");

// Dashboard
const statTotal = document.getElementById("statTotal");
const statPublicados = document.getElementById("statPublicados");
const statSinPublicar = document.getElementById("statSinPublicar");
const statUsuarios = document.getElementById("statUsuarios");
const recentProducts = document.getElementById("recentProducts");
const almacenCount = document.getElementById("almacenCount");
const publicadosCount = document.getElementById("publicadosCount");

// Almacén
const almacenGrid = document.getElementById("almacenGrid");
const almacenSearch = document.getElementById("almacenSearch");

// Publicados
const publicadosGrid = document.getElementById("publicadosGrid");

// Usuarios
const usersBody = document.getElementById("usersBody");
const btnNuevoUsuario = document.getElementById("btnNuevoUsuario");
const userModalBackdrop = document.getElementById("userModalBackdrop");
const userModalTitle = document.getElementById("userModalTitle");
const userModalClose = document.getElementById("userModalClose");
const userModalCancel = document.getElementById("userModalCancel");
const userForm = document.getElementById("userForm");
const userFormId = document.getElementById("userFormId");
const userFormName = document.getElementById("userFormName");
const userFormEmail = document.getElementById("userFormEmail");
const userFormPassword = document.getElementById("userFormPassword");

/* ══════════════════════════════════════
     SECTION NAVIGATION
     ══════════════════════════════════════ */
function switchSection(name) {
  currentSection = name;
  navBtns.forEach((b) =>
    b.classList.toggle("is-active", b.dataset.section === name),
  );
  sections.forEach((s) => {
    s.classList.toggle("is-visible", s.id === `section-${name}`);
  });
  // Close mobile sidebar
  sidebar.classList.remove("is-open");
  sidebarOverlay.classList.remove("is-open");

  // Refresh section data
  if (name === "almacen") renderAlmacen();
  if (name === "publicados") renderPublicados();
  if (name === "usuarios") renderUsuarios();
  if (name === "dashboard") refreshDashboard();
}

navBtns.forEach((b) =>
  b.addEventListener("click", () => switchSection(b.dataset.section)),
);

quickBtns.forEach((b) =>
  b.addEventListener("click", () => switchSection(b.dataset.goto)),
);

/* Mobile sidebar */
if (sidebarToggle) {
  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("is-open");
    sidebarOverlay.classList.toggle("is-open");
  });
}
if (sidebarOverlay) {
  sidebarOverlay.addEventListener("click", () => {
    sidebar.classList.remove("is-open");
    sidebarOverlay.classList.remove("is-open");
  });
}

/* ══════════════════════════════════════
     FETCH ALL PRODUCTS
     ══════════════════════════════════════ */
async function fetchAllProducts() {
  allProducts = [];

  try {
    // Admin: fetch ALL products (including inactive)
    const token = localStorage.getItem("token");
    const res = await fetch(`${API}/product/all`, {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + token,
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const list = extractList(data);
    allProducts = list;

    // DEBUG: ver qué campos tienen los productos
    if (list.length) {
      console.log("PRODUCTO EJEMPLO (campos):", Object.keys(list[0]));
      console.log(
        "PRODUCTO EJEMPLO (completo):",
        JSON.parse(JSON.stringify(list[0])),
      );
    }

    // If the response had pagination info, fetch remaining pages
    const totalPages = data.totalPages || data.total_pages || 1;
    if (totalPages > 1) {
      for (let page = 2; page <= totalPages; page++) {
        const url = new URL("/product/products", API);
        url.searchParams.set("page", String(page));
        url.searchParams.set("limit", "50");
        const pageRes = await fetch(url.toString(), {
          headers: { Accept: "application/json" },
        });
        if (!pageRes.ok) break;
        const pageData = await pageRes.json();
        allProducts.push(...extractList(pageData));
      }
    }
  } catch (err) {
    console.error("Error fetching products:", err);
  }

  return allProducts;
}

/* ══════════════════════════════════════
     DASHBOARD
     ══════════════════════════════════════ */
function refreshDashboard() {
  const pubCount = allProducts.filter((p) => !!p.isActive).length;
  const total = allProducts.length;

  statTotal.textContent = total;
  statPublicados.textContent = pubCount;
  statSinPublicar.textContent = total - pubCount;
  statUsuarios.textContent = getUsers().length;
  almacenCount.textContent = total;
  publicadosCount.textContent = pubCount;

  // Recent 5 — sorted by sales (top sellers)
  const sales = getSalesData();
  const sorted = [...allProducts].sort((a, b) => {
    const sa = (sales[getId(a)] || {}).sold || 0;
    const sb = (sales[getId(b)] || {}).sold || 0;
    return sb - sa;
  });
  const recent = sorted.slice(0, 5);
  if (!recent.length) {
    recentProducts.innerHTML =
      '<p class="admin-empty-hint">No hay productos cargados</p>';
    return;
  }

  recentProducts.innerHTML = recent
    .map((p) => {
      const s = sales[getId(p)] || { sold: 0 };
      const stock = getStock(p);
      const level = getStockLevel(stock);
      return `
      <div class="admin-recent-row">
        <img class="admin-recent-thumb" src="${esc(getImg(p))}" alt="" loading="lazy"
             onerror="this.src='${FALLBACK_IMG}'">
        <div class="admin-recent-info">
          <div class="admin-recent-name">${esc(getName(p))}</div>
          <div class="admin-recent-meta">${esc(getCat(p))} · ${s.sold} vendidos · <span class="stock-${level.cls}">${stock} en stock</span> ${p.isActive ? '· <span style="color:#27ae60">Pub.</span>' : ""}</div>
        </div>
        <span class="admin-recent-price">${fmtPrice(p.price)}</span>
      </div>
    `;
    })
    .join("");
}

/* ══════════════════════════════════════
     ALMACÉN (all products)
     ══════════════════════════════════════ */

/* ── Sales analytics (real data from backend orders) ── */
let salesStats = {};

function getSalesData() {
  return salesStats;
}

async function fetchSalesStats() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API}/orders/stats/products`, {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + token,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    salesStats = await res.json();
  } catch (err) {
    console.warn("No se pudieron obtener estadísticas de ventas:", err);
    salesStats = {};
  }
  return salesStats;
}

function getStock(prod) {
  return Number(prod.stock) || 0;
}

function getStockLevel(stock) {
  if (stock <= 0) return { label: "Sin stock", cls: "out", pct: 0 };
  if (stock <= 5)
    return {
      label: "Crítico",
      cls: "critical",
      pct: Math.min((stock / 50) * 100, 10),
    };
  if (stock <= 15)
    return { label: "Bajo", cls: "low", pct: (stock / 50) * 100 };
  return { label: "OK", cls: "ok", pct: Math.min((stock / 50) * 100, 100) };
}

function buildProductCard(prod, index = 0) {
  const id = getId(prod);
  const pub = isPublished(id);
  const stock = getStock(prod);
  const level = getStockLevel(stock);
  const sales = getSalesData();
  const s = sales[id] || { sold: 0, revenue: 0 };
  const revenue = s.revenue || 0;
  const isTrending = s.sold >= 20;

  return `
      <div class="admin-product-card ${level.cls === "out" ? "is-out-of-stock" : ""}" data-id="${esc(id)}">
        <div class="admin-card-img">
          <img src="${esc(getImg(prod))}" alt="${esc(getName(prod))}" loading="lazy"
               onerror="this.src='${FALLBACK_IMG}'">
          <span class="admin-card-status ${pub ? "is-published" : "is-draft"}">
            <i class="fas ${pub ? "fa-eye" : "fa-eye-slash"}"></i>
            ${pub ? "Publicado" : "Almacén"}
          </span>
          ${isTrending ? '<span class="admin-card-trending"><i class="fas fa-fire"></i> Trending</span>' : ""}
        </div>
        <div class="admin-card-body">
          <div class="admin-card-top">
            <span class="admin-card-cat">${esc(getCat(prod))}</span>
            <span class="admin-card-sku">${esc(prod.sku || "—")}</span>
          </div>
          <h3 class="admin-card-name" title="${esc(getName(prod))}">${esc(getName(prod))}</h3>
          ${buildAdminPriceHTML(prod)}

          <!-- Stock meter -->
          <div class="admin-card-stock">
            <div class="admin-stock-header">
              <span class="admin-stock-label">Stock</span>
              <span class="admin-stock-qty stock-${level.cls}">${stock} unidades · ${level.label}</span>
            </div>
            <div class="admin-stock-bar">
              <div class="admin-stock-fill stock-${level.cls}" style="width:${level.pct}%"></div>
            </div>
          </div>

          <!-- Sales metrics -->
          <div class="admin-card-metrics">
            <div class="admin-metric">
              <i class="fas fa-shopping-cart"></i>
              <div>
                <strong>${s.sold}</strong>
                <small>vendidos</small>
              </div>
            </div>
            <div class="admin-metric">
              <i class="fas fa-dollar-sign"></i>
              <div>
                <strong>${fmtPrice(revenue)}</strong>
                <small>ingresos</small>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="admin-card-actions">
            <button class="admin-btn-publish ${pub ? "is-published" : ""}" data-publish="${esc(id)}">
              <i class="fas ${pub ? "fa-store-slash" : "fa-store"} me-1"></i>${pub ? "Retirar" : "Publicar"}
            </button>
            <button class="admin-btn-edit" data-edit="${esc(id)}" title="Editar producto">
              <i class="fas fa-pen me-1"></i>Editar
            </button>
            <button class="admin-btn-delete" data-delete="${esc(id)}" title="Eliminar producto">
              <i class="fas fa-trash-alt me-1"></i>Eliminar
            </button>
          </div>
        </div>
      </div>
    `;
}

function renderAlmacen(filter = "") {
  const q = filter.toLowerCase().trim();
  const filtered = q
    ? allProducts.filter(
        (p) =>
          getName(p).toLowerCase().includes(q) ||
          getCat(p).toLowerCase().includes(q),
      )
    : allProducts;

  if (!filtered.length) {
    almacenGrid.innerHTML =
      '<p class="admin-empty-hint">No se encontraron productos</p>';
    return;
  }

  almacenGrid.innerHTML = filtered.map(buildProductCard).join("");
  bindPublishButtons(almacenGrid);
  bindEditButtons(almacenGrid);
  bindDeleteButtons(almacenGrid);
}

if (almacenSearch) {
  let debounce;
  almacenSearch.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => renderAlmacen(almacenSearch.value), 250);
  });
}

/* ══════════════════════════════════════
     PUBLICADOS
     ══════════════════════════════════════ */
function renderPublicados() {
  const published = allProducts.filter((p) => !!p.isActive);

  if (!published.length) {
    publicadosGrid.innerHTML =
      '<p class="admin-empty-hint"><i class="fas fa-store" style="font-size:2rem;display:block;margin-bottom:0.5rem;opacity:0.3"></i>Todavía no publicaste ningún producto</p>';
    return;
  }

  publicadosGrid.innerHTML = published.map(buildProductCard).join("");
  bindPublishButtons(publicadosGrid);
  bindEditButtons(publicadosGrid);
  bindDeleteButtons(publicadosGrid);
}

/* ── Publish toggle handler ── */
function bindPublishButtons(container) {
  container.querySelectorAll("[data-publish]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.publish;
      await togglePublished(id);

      // Refresh current section
      if (currentSection === "almacen")
        renderAlmacen(almacenSearch?.value || "");
      if (currentSection === "publicados") renderPublicados();
      refreshDashboard();
    });
  });
}

/* ── Edit product handler ── */
function bindEditButtons(container) {
  container.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.edit;
      const product = allProducts.find((p) => getId(p) === id);
      if (!product) return;
      openProductForm(product);
    });
  });
}

/* ── Delete product handler ── */
function bindDeleteButtons(container) {
  container.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.delete;
      const product = allProducts.find((p) => getId(p) === id);
      const name = product ? getName(product) : "este producto";
      if (
        !confirm(
          `¿Estás seguro de eliminar "${name}"? Esta acción no se puede deshacer.`,
        )
      )
        return;

      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/product/delete/${id}`, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            Authorization: "Bearer " + token,
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        await fetchAllProducts();
        if (currentSection === "almacen")
          renderAlmacen(almacenSearch?.value || "");
        if (currentSection === "publicados") renderPublicados();
        refreshDashboard();
        showToast("Producto eliminado exitosamente", "success");
      } catch (err) {
        console.error("Error al eliminar producto:", err);
        showToast("Error al eliminar el producto", "error");
      }
    });
  });
}

/* ══════════════════════════════════════
     USUARIOS
     ══════════════════════════════════════ */
function renderUsuarios() {
  const users = getUsers();

  if (!users.length) {
    usersBody.innerHTML =
      '<tr><td colspan="5" class="admin-empty-hint">No hay usuarios registrados</td></tr>';
    return;
  }

  usersBody.innerHTML = users
    .map(
      (u) => `
      <tr>
        <td>
          <div class="admin-user-cell">
            <img class="admin-user-avatar"
                 src="https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=${u.role === "admin" ? "7a2b3b" : "2980b9"}&color=fff&size=36"
                 alt="${esc(u.username)}" />
            <strong>${esc(u.username)}</strong>
          </div>
        </td>
        <td>${esc(u.email)}</td>
        <td>
          <span class="admin-role-badge role-${u.role}">
            <i class="fas ${u.role === "admin" ? "fa-user-shield" : "fa-user"}"></i>
            ${u.role}
          </span>
        </td>
        <td>${new Date(u.createdAt).toLocaleDateString("es-AR")}</td>
        <td>
          <div class="admin-table-actions">
            <button title="Editar" data-edit-user="${esc(u.id)}"><i class="fas fa-pen"></i></button>
            <button title="Cambiar rol" data-toggle-role="${esc(u.id)}"><i class="fas fa-user-shield"></i></button>
            <button title="Eliminar" class="btn-delete" data-delete-user="${esc(u.id)}"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>
    `,
    )
    .join("");

  bindUserActions();
}

function bindUserActions() {
  // Edit
  usersBody.querySelectorAll("[data-edit-user]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const user = getUsers().find((u) => u.id === btn.dataset.editUser);
      if (!user) return;
      openUserModal(user);
    });
  });

  // Toggle role
  usersBody.querySelectorAll("[data-toggle-role]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const users = getUsers();
      const user = users.find((u) => u.id === btn.dataset.toggleRole);
      if (!user) return;
      user.role = user.role === "admin" ? "user" : "admin";
      saveUsers(users);
      renderUsuarios();
      refreshDashboard();
    });
  });

  // Delete
  usersBody.querySelectorAll("[data-delete-user]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const users = getUsers();
      const user = users.find((u) => u.id === btn.dataset.deleteUser);
      if (!user) return;
      if (!confirm(`¿Eliminar al usuario "${user.username}"?`)) return;
      saveUsers(users.filter((u) => u.id !== user.id));
      renderUsuarios();
      refreshDashboard();
    });
  });
}

/* ── User modal ── */
function openUserModal(user = null) {
  userModalTitle.textContent = user ? "Editar usuario" : "Nuevo usuario";
  userFormId.value = user?.id || "";
  userFormName.value = user?.username || "";
  userFormEmail.value = user?.email || "";
  userFormPassword.value = "";
  userFormPassword.placeholder = user
    ? "Dejar vacío para no cambiar"
    : "Mínimo 6 caracteres";
  userFormPassword.required = !user;

  if (user) {
    document.querySelector(
      `input[name="userRole"][value="${user.role}"]`,
    ).checked = true;
  } else {
    document.querySelector('input[name="userRole"][value="user"]').checked =
      true;
  }

  userModalBackdrop.classList.add("is-open");
}

function closeUserModal() {
  userModalBackdrop.classList.remove("is-open");
  userForm.reset();
}

if (btnNuevoUsuario)
  btnNuevoUsuario.addEventListener("click", () => openUserModal());
if (userModalClose) userModalClose.addEventListener("click", closeUserModal);
if (userModalCancel) userModalCancel.addEventListener("click", closeUserModal);

userModalBackdrop.addEventListener("click", (e) => {
  if (e.target === userModalBackdrop) closeUserModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && userModalBackdrop.classList.contains("is-open")) {
    closeUserModal();
  }
  if (
    e.key === "Escape" &&
    newProductForm &&
    newProductForm.classList.contains("is-open")
  ) {
    closeProductFormFn();
  }
});

userForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const users = getUsers();
  const id = userFormId.value;
  const role = document.querySelector('input[name="userRole"]:checked').value;

  if (id) {
    // Edit existing
    const user = users.find((u) => u.id === id);
    if (user) {
      user.username = userFormName.value.trim();
      user.email = userFormEmail.value.trim();
      user.role = role;
      if (userFormPassword.value) {
        user.passwordHash = "updated";
      }
    }
  } else {
    // New user
    if (!userFormPassword.value || userFormPassword.value.length < 6) {
      userFormPassword.setCustomValidity(
        "La contraseña debe tener al menos 6 caracteres",
      );
      userFormPassword.reportValidity();
      return;
    }
    users.push({
      id: crypto.randomUUID(),
      username: userFormName.value.trim(),
      email: userFormEmail.value.trim(),
      role,
      createdAt: new Date().toISOString(),
    });
  }

  saveUsers(users);
  closeUserModal();
  renderUsuarios();
  refreshDashboard();
});

/* ══════════════════════════════════════
     ADMIN GUARD
     ══════════════════════════════════════ */
function checkAdmin() {
  const role = localStorage.getItem("userRole");
  const auth = localStorage.getItem("isAuthenticated");
  if (auth !== "true" || role !== "admin") {
    window.location.href = "../index.html";
    return false;
  }
  return true;
}

/* ══════════════════════════════════════
     PRODUCT FORM LOGIC
     ══════════════════════════════════════ */

const newProductForm = document.getElementById("newProductForm");
const btnAgregarProducto = document.getElementById("btnAgregarProducto");
const closeProductForm = document.getElementById("closeProductForm");
const cancelProductForm = document.getElementById("cancelProductForm");
const productFormSubmit = document.getElementById("productFormSubmit");
const productFormBackdrop = document.getElementById("productFormBackdrop");

function openProductForm(product = null) {
  editingProductId = product ? getId(product) : null;

  // Update form title and button text
  const pfTitle = document.querySelector(".pf-title");
  const pfSubtitle = document.querySelector(".pf-subtitle");
  const btnLabel = document.querySelector(".pf-btn-label");
  if (pfTitle)
    pfTitle.textContent = product ? "Editar Producto" : "Nuevo Producto";
  if (pfSubtitle)
    pfSubtitle.textContent = product
      ? "Modificá los datos del artículo"
      : "Completá los datos para agregar un artículo al almacén";
  if (btnLabel)
    btnLabel.innerHTML = product
      ? '<i class="fas fa-save me-1"></i> Guardar cambios'
      : '<i class="fas fa-save me-1"></i> Guardar producto';

  // Pre-populate form fields if editing
  if (product) {
    const nameInput = document.getElementById("productName");
    const skuInput = document.getElementById("productSku");
    const descInput = document.getElementById("productDescription");
    const catInput = document.getElementById("productCategory");
    const priceInput = document.getElementById("productPrice");
    const stockInput = document.getElementById("productStock");
    const activeInput = document.getElementById("productIsActive");
    const origPriceInput = document.getElementById("productOriginalPrice");
    const discountInput = document.getElementById("productDiscount");

    if (nameInput) nameInput.value = product.name || "";
    if (skuInput) skuInput.value = product.sku || "";
    if (descInput) descInput.value = product.description || "";
    if (catInput) catInput.value = product.category || "";
    if (priceInput) priceInput.value = product.price || "";
    if (stockInput)
      stockInput.value = product.stock != null ? product.stock : "";
    if (activeInput) activeInput.checked = product.isActive !== false;

    // Descuento existente: precargar precio original + % calculado
    const origPrice = Number(product.originalPrice);
    const curPrice = Number(product.price);
    if (origPriceInput) {
      origPriceInput.value =
        origPrice && origPrice > curPrice ? origPrice : "";
    }
    if (discountInput) {
      discountInput.value =
        origPrice && origPrice > curPrice
          ? Math.round((1 - curPrice / origPrice) * 100)
          : "";
    }
    updateDiscountHint();

    updateSizeGrid(product.category || '', product.sizes || null);

    // Show existing images as previews
    const mainPreview = document.getElementById("previewMain");
    const mainPlaceholder = document.getElementById("mainPlaceholder");
    const secPreview = document.getElementById("previewSecond");
    const secPlaceholder = document.getElementById("secondPlaceholder");

    const mainSrc = getImg(product);
    if (mainSrc && mainSrc !== FALLBACK_IMG && mainPreview && mainPlaceholder) {
      mainPreview.src = mainSrc;
      mainPreview.style.display = "block";
      mainPlaceholder.style.display = "none";
    }

    const secSrc = product.secondImageUrl
      ? product.secondImageUrl.startsWith("http")
        ? product.secondImageUrl
        : `${API}/${product.secondImageUrl.replace(/^\//, "")}`
      : null;
    if (secSrc && secPreview && secPlaceholder) {
      secPreview.src = secSrc;
      secPreview.style.display = "block";
      secPlaceholder.style.display = "none";
    }
  }

  if (newProductForm) {
    newProductForm.style.display = "flex";
    requestAnimationFrame(() => newProductForm.classList.add("is-open"));
  }
}

function closeProductFormFn() {
  if (newProductForm) {
    newProductForm.classList.remove("is-open");
    setTimeout(() => {
      newProductForm.style.display = "none";
      if (productFormSubmit) productFormSubmit.reset();
      editingProductId = null;
      updateSizeGrid('');   // reset to ropa defaults
      // Reset previews
      document.querySelectorAll(".pf-upload-preview").forEach((img) => {
        img.style.display = "none";
        img.src = "";
      });
      document
        .querySelectorAll(".pf-upload-placeholder")
        .forEach((el) => (el.style.display = ""));
      // Reset submit button
      const btnLabel = document.querySelector(".pf-btn-label");
      const btnLoading = document.querySelector(".pf-btn-loading");
      if (btnLabel) {
        btnLabel.style.display = "";
        btnLabel.innerHTML =
          '<i class="fas fa-save me-1"></i> Guardar producto';
      }
      if (btnLoading) btnLoading.style.display = "none";
      // Reset title
      const pfTitle = document.querySelector(".pf-title");
      const pfSubtitle = document.querySelector(".pf-subtitle");
      if (pfTitle) pfTitle.textContent = "Nuevo Producto";
      if (pfSubtitle)
        pfSubtitle.textContent =
          "Completá los datos para agregar un artículo al almacén";
    }, 300);
  }
}

if (btnAgregarProducto)
  btnAgregarProducto.addEventListener("click", () => {
    openProductForm();
    updateSizeGrid('');  // init with ropa defaults for new product
  });
if (closeProductForm)
  closeProductForm.addEventListener("click", closeProductFormFn);

/* ── Size grid: update when category changes ── */
const catSelectForSize = document.getElementById('productCategory');
if (catSelectForSize) {
  catSelectForSize.addEventListener('change', function () {
    updateSizeGrid(this.value);
  });
}
if (cancelProductForm)
  cancelProductForm.addEventListener("click", closeProductFormFn);
if (productFormBackdrop)
  productFormBackdrop.addEventListener("click", closeProductFormFn);

/* ── Image upload & preview ── */
function setupImageUpload(zoneId, inputId, previewId, placeholderId) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const placeholder = document.getElementById(placeholderId);
  if (!zone || !input || !preview || !placeholder) return;

  zone.addEventListener("click", () => input.click());

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("pf-upload-dragover");
  });
  zone.addEventListener("dragleave", () =>
    zone.classList.remove("pf-upload-dragover"),
  );
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("pf-upload-dragover");
    if (e.dataTransfer.files.length) {
      input.files = e.dataTransfer.files;
      showPreview(input.files[0], preview, placeholder);
    }
  });

  input.addEventListener("change", () => {
    if (input.files.length) showPreview(input.files[0], preview, placeholder);
  });
}

function showPreview(file, previewEl, placeholderEl) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    previewEl.src = e.target.result;
    previewEl.style.display = "block";
    placeholderEl.style.display = "none";
  };
  reader.readAsDataURL(file);
}

setupImageUpload(
  "mainUploadZone",
  "mainImageInput",
  "previewMain",
  "mainPlaceholder",
);
setupImageUpload(
  "secondUploadZone",
  "secondImageInput",
  "previewSecond",
  "secondPlaceholder",
);

/* ── Discount calculator: Precio original + % → Precio de venta ──
   El precio de venta sigue siendo editable a mano; esto solo lo
   autocompleta como ayuda cuando cargan un precio original y un %. */
function updateDiscountHint() {
  const hint = document.getElementById("discountHint");
  if (!hint) return;
  const origVal = Number(document.getElementById("productOriginalPrice")?.value);
  const pctVal = Number(document.getElementById("productDiscount")?.value);

  if (origVal > 0 && pctVal > 0) {
    const final = origVal * (1 - pctVal / 100);
    hint.textContent = `Con ${pctVal}% de descuento sobre ${fmtPrice(origVal)}, el precio de venta queda en ${fmtPrice(final)}. En la tienda se va a ver el precio original tachado.`;
    hint.classList.add("is-active");
  } else if (origVal > 0) {
    hint.textContent = `Cargá el % de descuento para calcular el precio de venta, o escribilo vos mismo/a en "Precio de venta".`;
    hint.classList.remove("is-active");
  } else {
    hint.textContent =
      "Cargá un precio original y un % de descuento para calcular el precio de venta automáticamente. Si dejás el precio original vacío, el producto se publica sin oferta.";
    hint.classList.remove("is-active");
  }
}

function recalcDiscountPrice() {
  const origInput = document.getElementById("productOriginalPrice");
  const pctInput = document.getElementById("productDiscount");
  const priceInput = document.getElementById("productPrice");
  const origVal = Number(origInput?.value);
  const pctVal = Number(pctInput?.value);

  if (origVal > 0 && pctVal > 0 && priceInput) {
    priceInput.value = (origVal * (1 - pctVal / 100)).toFixed(2);
  }
  updateDiscountHint();
}

const productOriginalPriceInput = document.getElementById("productOriginalPrice");
const productDiscountInput = document.getElementById("productDiscount");
if (productOriginalPriceInput)
  productOriginalPriceInput.addEventListener("input", recalcDiscountPrice);
if (productDiscountInput)
  productDiscountInput.addEventListener("input", recalcDiscountPrice);

/* ── SKU Generator ── */
const btnGenerateSKU = document.getElementById("btnGenerateSKU");
if (btnGenerateSKU) {
  btnGenerateSKU.addEventListener("click", () => {
    const sku =
      "MVCQ-" + Math.random().toString(36).substring(2, 7).toUpperCase();
    const skuInput = document.getElementById("productSku");
    if (skuInput) skuInput.value = sku;
  });
}

/* ── Form Submit → POST /product/generate-product ── */
if (productFormSubmit) {
  productFormSubmit.addEventListener("submit", async (e) => {
    e.preventDefault();

    // ── Validation ──
    const nameVal = document.getElementById("productName").value.trim();
    const categoryVal = document.getElementById("productCategory").value;
    const genderVal = document.getElementById("productGender").value;
    const priceVal = document.getElementById("productPrice").value;
    const mainImg = document.getElementById("mainImageInput");

    const errors = [];
    if (!nameVal) errors.push("Nombre del producto es obligatorio");
    if (!categoryVal) errors.push("Seleccioná una categoría");
    if (!genderVal) errors.push("Seleccioná un género");
    if (!priceVal || Number(priceVal) <= 0)
      errors.push("Ingresá un precio válido");
    if (!editingProductId && !mainImg.files[0])
      errors.push("Subí al menos la imagen principal");

    if (errors.length) {
      showToast(errors[0], "error");
      return;
    }

    const btnLabel = document.querySelector(".pf-btn-label");
    const btnLoading = document.querySelector(".pf-btn-loading");
    const submitBtn = document.getElementById("btnSubmitProduct");

    // Collect sizes
    const sizes = [
      ...document.querySelectorAll('input[name="sizes"]:checked'),
    ].map((cb) => cb.value);

    // Build FormData — fields must match CreateProductDto
    const fd = new FormData();
    fd.append("name", nameVal);
    fd.append("price", priceVal);
    // Siempre se envía (aunque sea vacío) para que, al editar, borrar el
    // precio original también borre el descuento en el backend.
    const origPriceVal = document.getElementById("productOriginalPrice").value;
    fd.append("originalPrice", origPriceVal || "");
    fd.append("category", categoryVal);
    fd.append("gender", genderVal);
    sizes.forEach((s) => fd.append("sizes[]", s));

    const skuVal = document.getElementById("productSku").value.trim();
    if (skuVal) fd.append("sku", skuVal);

    const descVal = document.getElementById("productDescription").value.trim();
    if (descVal) fd.append("description", descVal);

    const stockVal = document.getElementById("productStock").value;
    fd.append("stock", stockVal || "0");

    // isActive is @IsOptional — skip it to avoid string/boolean mismatch.
    // To send it, add to the backend DTO:
    //   @Transform(({ value }) => value === 'true' || value === true)

    // Images — handled by Multer on the backend, not part of DTO
    if (mainImg.files[0]) fd.append("image", mainImg.files[0]);
    const secImg = document.getElementById("secondImageInput");
    if (secImg.files[0]) fd.append("image", secImg.files[0]);

    // UI loading
    if (btnLabel) btnLabel.style.display = "none";
    if (btnLoading) btnLoading.style.display = "inline-flex";
    if (submitBtn) submitBtn.disabled = true;

    const token = localStorage.getItem("token");
    if (!token) {
      showToast("Sesión sin token. Cerrá sesión e iniciá de nuevo.", "error");
      console.error(
        "TOKEN VACÍO. Revisá la respuesta de /auth/login en la consola del navegador al iniciar sesión.",
      );
      if (btnLabel) btnLabel.style.display = "";
      if (btnLoading) btnLoading.style.display = "none";
      if (submitBtn) submitBtn.disabled = false;
      return;
    }
    console.log("Token enviado:", token.substring(0, 30) + "...");

    try {
      const headers = {};
      if (token) headers["Authorization"] = "Bearer " + token;

      const isEditing = !!editingProductId;
      const url = isEditing
        ? `${API}/product/update/${editingProductId}`
        : `${API}/product/generate`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers,
        body: fd,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        let errMsg = `Error ${res.status}`;
        try {
          const errData = JSON.parse(errText);
          console.error("Backend error detail:", errData);
          errMsg = Array.isArray(errData.message)
            ? errData.message.join(", ")
            : errData.message || errMsg;
        } catch {
          console.error("Backend error (raw):", errText);
        }
        throw new Error(errMsg);
      }

      // Success — refresh products
      await fetchAllProducts();
      renderAlmacen(almacenSearch?.value || "");
      refreshDashboard();
      closeProductFormFn();
      showToast(
        isEditing
          ? "Producto actualizado exitosamente"
          : "Producto creado exitosamente",
        "success",
      );
    } catch (err) {
      showToast(err.message || "Error al crear el producto", "error");
    } finally {
      if (btnLabel) btnLabel.style.display = "";
      if (btnLoading) btnLoading.style.display = "none";
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

/* ── Toast notification ── */
function showToast(msg, type = "success") {
  const existing = document.querySelector(".admin-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `admin-toast admin-toast-${type}`;
  toast.innerHTML = `<i class="fas ${type === "success" ? "fa-check-circle" : "fa-exclamation-circle"} me-2"></i>${esc(msg)}`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

/* ══════════════════════════════════════
     INIT
     ══════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", async () => {
  if (!checkAdmin()) return;

  seedUsersIfEmpty();

  // Show loading state
  statTotal.textContent = "…";
  statPublicados.textContent = "…";
  statSinPublicar.textContent = "…";
  statUsuarios.textContent = "…";

  await Promise.all([
    fetchAllProducts(),
    fetchBackendUsers(),
    fetchSalesStats(),
  ]);
  refreshDashboard();
  renderAlmacen();

  // If the URL has a hash, switch to that section
  const hash = window.location.hash.replace("#", "");
  if (hash && document.getElementById(`section-${hash}`)) {
    switchSection(hash);
  }
});
