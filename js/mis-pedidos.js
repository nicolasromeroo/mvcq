/* ══════════════════════════════════════════════════════
   mis-pedidos.js — Me Visto Como Quiero
   Dual-role: ADMIN → gestión · USER → historial + factura
   ══════════════════════════════════════════════════════ */

const MP_API = 'https://web-vd8s1gd9atgj.up-de-fra1-k8s-1.apps.run-on-seenode.com';

/* ── Helpers ── */
function mpEsc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtARS(n) {
  const v = Number(n);
  if (isNaN(v)) return '$0';
  return v.toLocaleString('es-AR', {
    style: 'currency', currency: 'ARS',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_MAP = {
  pending:         { label: 'Pendiente',       cls: 'mp-badge--pending',   icon: 'fa-clock' },
  awaiting_payment:{ label: 'Esperando pago',  cls: 'mp-badge--awaiting',  icon: 'fa-hourglass-half' },
  paid:            { label: 'Pagado',           cls: 'mp-badge--paid',      icon: 'fa-check-circle' },
  processing:      { label: 'En proceso',       cls: 'mp-badge--processing',icon: 'fa-cog' },
  shipped:         { label: 'Enviado',          cls: 'mp-badge--shipped',   icon: 'fa-truck' },
  delivered:       { label: 'Entregado',        cls: 'mp-badge--delivered', icon: 'fa-box-check' },
  cancelled:       { label: 'Cancelado',        cls: 'mp-badge--cancelled', icon: 'fa-times-circle' },
  refunded:        { label: 'Reembolsado',      cls: 'mp-badge--refunded',  icon: 'fa-undo' },
};

function statusBadge(status) {
  const s = STATUS_MAP[status] || { label: status, cls: 'mp-badge--pending', icon: 'fa-question' };
  return `<span class="mp-badge ${s.cls}"><i class="fas ${s.icon}"></i> ${s.label}</span>`;
}

function mpToast(msg, type = 'success', icon = 'fa-check') {
  const stack = document.getElementById('mpToastStack');
  if (!stack) return;
  const el = document.createElement('div');
  el.style.cssText = `
    background:${type === 'success' ? '#27ae60' : type === 'error' ? '#e63946' : '#e67e22'};
    color:#fff;padding:.7rem 1.1rem;border-radius:10px;font-size:.85rem;
    display:flex;align-items:center;gap:.6rem;box-shadow:0 4px 16px rgba(0,0,0,.15);
    opacity:0;transition:opacity .25s;max-width:320px;`;
  el.innerHTML = `<i class="fas ${icon}"></i><span>${mpEsc(msg)}</span>`;
  stack.prepend(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.style.opacity = '1'));
  setTimeout(() => {
    el.style.opacity = '0';
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  }, 3500);
}

/* ══ AUTH check ══ */
function getAuthState() {
  const token  = localStorage.getItem('token');
  const isAuth = localStorage.getItem('isAuthenticated') === 'true';
  const role   = (localStorage.getItem('userRole') || '').toLowerCase();
  return { token, isAuth, role, isAdmin: role === 'admin' };
}

/* ══ ADMIN VIEW ══════════════════════════════════════════ */

let allAdminOrders = [];

async function initAdminView() {
  const { token } = getAuthState();
  const loadingEl = document.getElementById('adminLoading');
  const tableEl   = document.getElementById('adminTable');
  const emptyEl   = document.getElementById('adminEmpty');

  try {
    const res = await fetch(`${MP_API}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allAdminOrders = await res.json();
  } catch (err) {
    console.error('[admin orders]', err);
    allAdminOrders = [];
    mpToast('Error al cargar pedidos', 'error', 'fa-exclamation-circle');
  }

  loadingEl.style.display = 'none';
  renderAdminStats(allAdminOrders);
  renderAdminTable(allAdminOrders);

  if (allAdminOrders.length) {
    tableEl.style.display = '';
  } else {
    emptyEl.style.display = '';
  }

  // Search + filter
  document.getElementById('adminSearch').addEventListener('input', filterAdminOrders);
  document.getElementById('adminStatusFilter').addEventListener('change', filterAdminOrders);
}

function renderAdminStats(orders) {
  const paid = orders.filter(o => ['paid','processing','shipped','delivered'].includes(o.status));
  const pending = orders.filter(o => ['pending','awaiting_payment'].includes(o.status));
  const revenue = paid.reduce((s, o) => s + Number(o.total), 0);

  document.getElementById('statTotal').textContent     = orders.length;
  document.getElementById('statPagados').textContent   = paid.length;
  document.getElementById('statPendientes').textContent = pending.length;
  document.getElementById('statFacturado').textContent = fmtARS(revenue);
}

function filterAdminOrders() {
  const q      = (document.getElementById('adminSearch').value || '').toLowerCase();
  const status = document.getElementById('adminStatusFilter').value;
  const filtered = allAdminOrders.filter(o => {
    const client = `${o.user?.firstName ?? ''} ${o.user?.lastName ?? ''} ${o.user?.email ?? ''}`.toLowerCase();
    const matchQ = !q || o.id.toLowerCase().includes(q) || client.includes(q);
    const matchS = !status || o.status === status;
    return matchQ && matchS;
  });
  renderAdminTable(filtered);
  document.getElementById('adminTable').style.display = filtered.length ? '' : 'none';
  document.getElementById('adminEmpty').style.display = filtered.length ? 'none' : '';
}

function renderAdminTable(orders) {
  const tbody = document.getElementById('adminTableBody');
  tbody.innerHTML = orders.map(o => {
    const clientName = o.user
      ? `${o.user.firstName ?? ''} ${o.user.lastName ?? ''}`.trim() || o.user.email
      : 'Cliente desconocido';
    const itemCount = o.items?.length ?? 0;
    return `
      <tr data-order-id="${mpEsc(o.id)}">
        <td class="td-id">#${mpEsc(o.id.slice(-6).toUpperCase())}</td>
        <td class="td-client">
          <strong>${mpEsc(clientName)}</strong>
          <span>${mpEsc(o.user?.email ?? '')}</span>
        </td>
        <td>
          <div style="font-size:.85rem">${fmtDate(o.createdAt)}</div>
          <div style="font-size:.75rem;color:#8a7a74">${fmtTime(o.createdAt)}</div>
        </td>
        <td style="font-size:.85rem">${itemCount} prenda${itemCount !== 1 ? 's' : ''}</td>
        <td class="td-total">${fmtARS(o.total)}</td>
        <td>
          <select class="mp-status-select" data-order-id="${mpEsc(o.id)}" onchange="updateOrderStatus('${mpEsc(o.id)}', this.value)">
            ${Object.entries(STATUS_MAP).map(([val, { label }]) =>
              `<option value="${val}" ${o.status === val ? 'selected' : ''}>${label}</option>`
            ).join('')}
          </select>
        </td>
        <td class="td-actions">
          <button class="mp-btn-icon" onclick="openOrderModal('${mpEsc(o.id)}')" title="Ver detalle">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      </tr>`;
  }).join('');
}

async function updateOrderStatus(orderId, newStatus) {
  const { token } = getAuthState();
  try {
    const res = await fetch(`${MP_API}/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // Update local data
    const order = allAdminOrders.find(o => o.id === orderId);
    if (order) order.status = newStatus;
    renderAdminStats(allAdminOrders);
    mpToast('Estado actualizado', 'success', 'fa-check');
  } catch (err) {
    console.error('[update status]', err);
    mpToast('Error al actualizar estado', 'error', 'fa-exclamation-circle');
    // Revert select
    initAdminView();
  }
}

function openOrderModal(orderId) {
  const order = allAdminOrders.find(o => o.id === orderId);
  if (!order) return;

  const clientName = order.user
    ? `${order.user.firstName ?? ''} ${order.user.lastName ?? ''}`.trim() || order.user.email
    : 'Cliente desconocido';

  const itemsHTML = (order.items || []).map(item => `
    <div class="mp-order-item">
      <img class="mp-order-item-img"
        src="${mpEsc(item.product?.imageUrl || '../img/aestethic.jpg')}"
        alt="${mpEsc(item.titleSnapshot)}"
        onerror="this.src='../img/aestethic.jpg'" />
      <div class="mp-order-item-info">
        <div class="mp-order-item-name">${mpEsc(item.titleSnapshot)}</div>
        <div class="mp-order-item-meta">Cant: ${item.quantity} · ${fmtARS(item.unitPrice)} c/u</div>
      </div>
      <div class="mp-order-item-price">${fmtARS(item.subtotal)}</div>
    </div>`).join('');

  document.getElementById('modalBody').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem">
      <div>
        <div style="font-size:.75rem;color:#8a7a74;font-weight:700;text-transform:uppercase;letter-spacing:.06em">Cliente</div>
        <div style="font-weight:700;font-size:.95rem">${mpEsc(clientName)}</div>
        <div style="font-size:.8rem;color:#8a7a74">${mpEsc(order.user?.email ?? '')}</div>
      </div>
      <div style="text-align:right">
        ${statusBadge(order.status)}
        <div style="font-size:.78rem;color:#8a7a74;margin-top:.4rem">${fmtDate(order.createdAt)} ${fmtTime(order.createdAt)}</div>
      </div>
    </div>
    ${order.shippingAddress ? `<div style="background:#f5f0ed;border-radius:8px;padding:.7rem 1rem;font-size:.83rem;margin-bottom:1rem"><i class="fas fa-map-marker-alt me-2" style="color:#7a2b3b"></i>${mpEsc(order.shippingAddress)}</div>` : ''}
    <div style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8a7a74;margin-bottom:.6rem">Artículos</div>
    <div class="mp-order-items-grid">${itemsHTML}</div>
    <div class="mp-invoice">
      <div class="mp-invoice-row is-total">
        <span>Total</span>
        <span>${fmtARS(order.total)}</span>
      </div>
      ${order.stripePaymentIntent ? `<div style="font-size:.72rem;color:#8a7a74;margin-top:.5rem"><i class="fab fa-stripe me-1"></i>PI: ${mpEsc(order.stripePaymentIntent)}</div>` : ''}
    </div>`;

  document.getElementById('orderModal').classList.add('is-open');
}

/* ══ USER VIEW ═══════════════════════════════════════════ */

let allUserOrders = [];

async function initUserView() {
  const { token } = getAuthState();
  const loadingEl  = document.getElementById('userLoading');
  const listEl     = document.getElementById('userOrdersList');
  const emptyEl    = document.getElementById('userEmpty');
  const toolbarEl  = document.getElementById('userToolbar');

  try {
    const res = await fetch(`${MP_API}/orders/my`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allUserOrders = await res.json();
  } catch (err) {
    console.error('[user orders]', err);
    allUserOrders = [];
    mpToast('Error al cargar tus pedidos', 'error', 'fa-exclamation-circle');
  }

  loadingEl.style.display = 'none';

  if (!allUserOrders.length) {
    emptyEl.style.display = '';
    return;
  }

  toolbarEl.style.display = '';
  renderUserOrders(allUserOrders);

  document.getElementById('userSearch').addEventListener('input', filterUserOrders);
  document.getElementById('userStatusFilter').addEventListener('change', filterUserOrders);
}

function filterUserOrders() {
  const q      = (document.getElementById('userSearch').value || '').toLowerCase();
  const status = document.getElementById('userStatusFilter').value;
  const filtered = allUserOrders.filter(o => {
    const matchQ = !q || o.id.toLowerCase().includes(q) ||
      (o.items || []).some(i => i.titleSnapshot?.toLowerCase().includes(q));
    const matchS = !status || o.status === status;
    return matchQ && matchS;
  });
  renderUserOrders(filtered);
}

function renderUserOrders(orders) {
  const listEl  = document.getElementById('userOrdersList');
  const emptyEl = document.getElementById('userEmpty');

  if (!orders.length) {
    listEl.innerHTML = '';
    emptyEl.style.display = '';
    return;
  }
  emptyEl.style.display = 'none';

  listEl.innerHTML = orders.map(o => buildOrderCard(o)).join('');

  // Accordion toggle
  listEl.querySelectorAll('.mp-order-head').forEach(head => {
    head.addEventListener('click', () => {
      head.closest('.mp-order-card').classList.toggle('is-open');
    });
  });

  // Print invoice buttons
  listEl.querySelectorAll('[data-print-order]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      printInvoice(btn.dataset.printOrder);
    });
  });
}

function buildOrderCard(order) {
  const orderNum   = order.id.slice(-6).toUpperCase();
  const itemsHTML  = (order.items || []).map(item => `
    <div class="mp-order-item">
      <img class="mp-order-item-img"
        src="${mpEsc(item.product?.imageUrl || '../img/aestethic.jpg')}"
        alt="${mpEsc(item.titleSnapshot)}"
        onerror="this.src='../img/aestethic.jpg'" />
      <div class="mp-order-item-info">
        <div class="mp-order-item-name">${mpEsc(item.titleSnapshot)}</div>
        <div class="mp-order-item-meta">
          Talle: ${mpEsc(item.variant?.attributes?.size || '—')} ·
          Cant: ${item.quantity} · ${fmtARS(item.unitPrice)} c/u
        </div>
      </div>
      <div class="mp-order-item-price">${fmtARS(item.subtotal)}</div>
    </div>`).join('');

  const subtotal = (order.items || []).reduce((s, i) => s + Number(i.subtotal), 0);
  const envio    = Number(order.total) - subtotal;

  return `
    <div class="mp-order-card" data-order-id="${mpEsc(order.id)}">
      <div class="mp-order-head">
        <div class="mp-order-head-left">
          <span class="mp-order-num">#${mpEsc(orderNum)}</span>
          ${statusBadge(order.status)}
          <span class="mp-order-date">
            <i class="far fa-calendar-alt me-1"></i>${fmtDate(order.createdAt)}
          </span>
        </div>
        <div class="mp-order-head-right">
          <span class="mp-order-total">${fmtARS(order.total)}</span>
          <i class="fas fa-chevron-down mp-order-chevron"></i>
        </div>
      </div>

      <div class="mp-order-body">
        <div class="mp-order-items-grid">${itemsHTML}</div>

        <!-- Factura -->
        <div class="mp-invoice">
          <div class="mp-invoice-title"><i class="fas fa-file-invoice me-2"></i>Resumen de compra</div>
          <div class="mp-invoice-row">
            <span>Subtotal</span>
            <span>${fmtARS(subtotal)}</span>
          </div>
          ${envio > 0 ? `<div class="mp-invoice-row"><span>Envío</span><span>${fmtARS(envio)}</span></div>` : ''}
          ${envio <= 0 && subtotal > 0 ? `<div class="mp-invoice-row" style="color:#27ae60"><span>Envío</span><span>Gratis 🎉</span></div>` : ''}
          <div class="mp-invoice-row is-total">
            <span>Total pagado</span>
            <span>${fmtARS(order.total)}</span>
          </div>
        </div>

        <div class="mp-invoice-actions">
          <button class="mp-btn mp-btn--outline" data-print-order="${mpEsc(order.id)}">
            <i class="fas fa-print"></i> Imprimir factura
          </button>
          ${order.status === 'delivered' ? `
          <a href="productos.html" class="mp-btn mp-btn--primary">
            <i class="fas fa-redo-alt"></i> Volver a comprar
          </a>` : ''}
          ${['pending','awaiting_payment'].includes(order.status) ? `
          <button class="mp-btn mp-btn--outline" style="color:#e63946;border-color:#e63946"
            onclick="cancelMyOrder('${mpEsc(order.id)}', this)">
            <i class="fas fa-times"></i> Cancelar pedido
          </button>` : ''}
        </div>
      </div>
    </div>`;
}

function printInvoice(orderId) {
  const order = allUserOrders.find(o => o.id === orderId);
  if (!order) return;

  const orderNum = order.id.slice(-6).toUpperCase();
  const items = (order.items || []).map(i =>
    `<tr><td>${mpEsc(i.titleSnapshot)}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">${fmtARS(i.unitPrice)}</td><td style="text-align:right">${fmtARS(i.subtotal)}</td></tr>`
  ).join('');

  const html = `<!doctype html><html lang="es"><head>
    <meta charset="UTF-8"/>
    <title>Factura #${orderNum} - Me Visto Como Quiero</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:13px;color:#1a1614;margin:0;padding:2rem}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2rem;border-bottom:2px solid #7a2b3b;padding-bottom:1rem}
      .brand{font-size:1.4rem;font-weight:700;color:#7a2b3b}
      table{width:100%;border-collapse:collapse;margin-top:1.5rem}
      th{background:#7a2b3b;color:#fff;padding:.5rem .75rem;text-align:left;font-size:.82rem}
      td{padding:.5rem .75rem;border-bottom:1px solid #e8ddd6}
      .total-row{font-weight:700;font-size:1rem;border-top:2px solid #7a2b3b}
      .footer{margin-top:2rem;font-size:.78rem;color:#8a7a74;text-align:center}
    </style>
  </head><body>
    <div class="header">
      <div><div class="brand">Me Visto Como Quiero</div><div style="color:#8a7a74;font-size:.85rem">Tienda de ropa online</div></div>
      <div style="text-align:right">
        <div><strong>Pedido #${orderNum}</strong></div>
        <div style="color:#8a7a74;font-size:.85rem">${fmtDate(order.createdAt)}</div>
        <div style="margin-top:.5rem;padding:.2rem .6rem;background:#e8f5e9;border-radius:4px;font-size:.78rem;color:#2e7d32;display:inline-block">${STATUS_MAP[order.status]?.label ?? order.status}</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Artículo</th><th style="text-align:center">Cant.</th><th style="text-align:right">P. Unit.</th><th style="text-align:right">Subtotal</th></tr></thead>
      <tbody>${items}<tr class="total-row"><td colspan="3">TOTAL</td><td style="text-align:right">${fmtARS(order.total)}</td></tr></tbody>
    </table>
    <div class="footer">Este documento es un comprobante de compra electrónico. Me Visto Como Quiero — © ${new Date().getFullYear()}</div>
  </body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.print();
}

async function cancelMyOrder(orderId, btn) {
  if (!confirm('¿Cancelar este pedido? Esta acción no se puede deshacer.')) return;
  const { token } = getAuthState();
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  try {
    const res = await fetch(`${MP_API}/orders/${orderId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    mpToast('Pedido cancelado', 'success', 'fa-check');
    await initUserView();
  } catch (err) {
    console.error('[cancel order]', err);
    mpToast('Error al cancelar el pedido', 'error', 'fa-exclamation-circle');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-times"></i> Cancelar pedido';
  }
}

/* ══ INIT ════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  const { isAuth, isAdmin, token } = getAuthState();

  // Show a status banner if redirected back from Stripe or MercadoPago
  const params = new URLSearchParams(window.location.search);
  const checkoutStatus = params.get('checkout');
  if (checkoutStatus === 'success') {
    document.getElementById('successBanner').style.display = '';
    history.replaceState({}, '', window.location.pathname);
  } else if (checkoutStatus === 'pending') {
    document.getElementById('pendingBanner').style.display = '';
    history.replaceState({}, '', window.location.pathname);
  }

  if (!isAuth || !token) {
    document.getElementById('unauthView').style.display = '';
    return;
  }

  if (isAdmin) {
    document.getElementById('adminView').style.display = '';
    initAdminView();
  } else {
    document.getElementById('userView').style.display = '';
    initUserView();
  }

  // Admin modal close
  document.getElementById('closeModal')?.addEventListener('click', () => {
    document.getElementById('orderModal').classList.remove('is-open');
  });
  document.getElementById('orderModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('orderModal')) {
      document.getElementById('orderModal').classList.remove('is-open');
    }
  });
});
