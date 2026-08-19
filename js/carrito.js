/* =====================================================
   carrito.js — Me Visto Como Quiero
   Cart page: render items, qty controls, totals, checkout
   ===================================================== */

const CARRITO_API = (['127.0.0.1','localhost'].includes(location.hostname) ? 'http://localhost:3000' : 'https://web-vd8s1gd9atgj.up-de-fra1-k8s-1.apps.run-on-seenode.com');
// El costo de envío ya no vive acá: lo cotiza el backend según el CP de destino
// (POST /shipping/quote) y se vuelve a calcular al crear la orden.

/* ── Formatters ── */
function formatARS(n) {
  const v = Number(n);
  if (isNaN(v)) return '$0';
  return v.toLocaleString('es-AR', {
    style: 'currency', currency: 'ARS',
    minimumFractionDigits: 0, maximumFractionDigits: 0
  });
}

function esc(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ── Toast ── */
function carritoToast(msg, type = 'success', icon = 'fa-check') {
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

/* ── Render ── */
function buildItemHTML(item, idx) {
  const imgSrc = esc(item.image || '../img/aestethic.jpg');
  const nombre = esc(item.name || 'Producto');
  const cat = esc(item.categoria || '');
  const size = esc(item.size || '');
  const unitPrice = formatARS(item.price);
  const totalPrice = formatARS((item.price || 0) * item.qty);
  const qty = Number(item.qty) || 1;

  return `
    <article class="carrito-item" data-product-id="${esc(item.productId)}" data-size="${size}" data-idx="${idx}">
      <div class="item-img-wrap">
        <img src="${imgSrc}" alt="${nombre}" loading="lazy" onerror="this.src='../img/aestethic.jpg'" />
      </div>
      <div class="item-info">
        ${cat ? `<span class="item-cat">${cat}</span>` : ''}
        <h3 class="item-nombre" title="${nombre}">${nombre}</h3>
        ${size ? `<span class="item-variante"><i class="fas fa-ruler-horizontal me-1" style="font-size:0.6rem"></i>Talle ${size}</span>` : ''}
        <button class="item-remove" aria-label="Eliminar artículo" data-action="remove">
          <i class="fas fa-trash-alt"></i> Eliminar
        </button>
      </div>
      <div class="carrito-item-bottom">
        <div class="qty-stepper">
          <button class="qty-btn" data-action="minus" aria-label="Restar" ${qty <= 1 ? 'disabled' : ''}>−</button>
          <span class="qty-val">${qty}</span>
          <button class="qty-btn" data-action="plus" aria-label="Sumar" ${qty >= 10 ? 'disabled' : ''}>+</button>
        </div>
        <div class="item-precio-col">
          <span class="item-precio-unit">${unitPrice} c/u</span>
          <span class="item-precio-total">${totalPrice}</span>
        </div>
      </div>
    </article>`;
}

function renderEmptyCart() {
  const section = document.getElementById('carritoItemsSection');
  if (!section) return;
  section.innerHTML = `
    <div class="carrito-empty">
      <div class="carrito-empty-icon"><i class="fas fa-shopping-bag"></i></div>
      <h3>Tu carrito está vacío</h3>
      <p>Todavía no agregaste ninguna prenda.<br>¡Explorá nuestra colección y encontrá algo que te encante!</p>
      <a href="productos.html" class="btn-ir-productos">
        <i class="fas fa-arrow-right me-1"></i>Ver productos
      </a>
    </div>`;
  document.getElementById('clearCartBtn').style.display = 'none';
}

function renderCartItems(items) {
  const itemsEl = document.getElementById('carritoItems');
  const clearBtn = document.getElementById('clearCartBtn');
  if (!items.length) { renderEmptyCart(); return; }
  itemsEl.innerHTML = items.map((item, i) => buildItemHTML(item, i)).join('');
  if (clearBtn) clearBtn.style.display = '';
  attachItemEvents();
}

function updateTotals() {
  const cart = getLocalCart();
  const subtotal = cart.items.reduce((s, i) => s + (i.price * i.qty), 0);
  // Hasta que el cliente no dé su CP no sabemos el costo real, así que no
  // inventamos un número: el envío se muestra recién cuando el backend lo cotiza.
  const envio = _shippingQuote ? _shippingQuote.cost : 0;
  const total = subtotal + envio;

  const subtotalEl = document.getElementById('subtotalVal');
  const envioEl = document.getElementById('envioVal');
  const totalEl = document.getElementById('totalVal');
  const countEl = document.getElementById('carritoCount');
  const checkoutBtn = document.getElementById('checkoutBtn');

  if (subtotalEl) subtotalEl.textContent = formatARS(subtotal);
  if (envioEl) {
    envioEl.textContent =
      subtotal === 0 ? '—'
      : !_shippingQuote ? 'A calcular'
      : _shippingQuote.freeShipping ? 'Gratis 🎉'
      : formatARS(envio);
  }
  if (totalEl) totalEl.textContent = formatARS(total);

  const totalItems = cart.items.reduce((s, i) => s + i.qty, 0);
  if (countEl) countEl.textContent = totalItems > 0 ? `(${totalItems} ${totalItems === 1 ? 'artículo' : 'artículos'})` : '';
  if (checkoutBtn) checkoutBtn.disabled = totalItems === 0;
}

function reRender() {
  const cart = getLocalCart();
  renderCartItems(cart.items);
  updateTotals();
}

/* ── Item event delegation ── */
function attachItemEvents() {
  const itemsEl = document.getElementById('carritoItems');
  if (!itemsEl) return;

  itemsEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const article = btn.closest('.carrito-item');
    if (!article) return;

    const productId = article.dataset.productId;
    const size = article.dataset.size;
    const qtyEl = article.querySelector('.qty-val');
    const action = btn.dataset.action;

    if (action === 'remove') {
      await removeFromCart(productId, size);
      carritoToast('Artículo eliminado', 'info', 'fa-trash-alt');
      reRender();
      return;
    }

    let qty = parseInt(qtyEl?.textContent || '1');
    if (action === 'minus') qty--;
    if (action === 'plus') qty++;

    await updateCartQty(productId, size, qty);
    reRender();
  });
}

/* ── Clear cart ── */
function initClearBtn() {
  document.getElementById('clearCartBtn')?.addEventListener('click', async () => {
    if (!confirm('¿Vaciar el carrito? Esta acción no se puede deshacer.')) return;
    await clearCart();
    carritoToast('Carrito vaciado', 'info', 'fa-trash-alt');
    reRender();
  });
}

/* ══════════════════════════════════════════════
   Envío — paso previo al pago
   ══════════════════════════════════════════════ */

/** Última cotización del backend. Es la única fuente del costo mostrado. */
let _shippingQuote = null;
/** Dirección validada que se manda al crear la preferencia. */
let _shippingData = null;
let _deliveryMode = 'home';

const SHIP_REQUIRED = ['recipientName', 'dni', 'phone', 'street', 'number', 'postalCode', 'city', 'province'];

function readShipForm() {
  const form = document.getElementById('shipForm');
  if (!form) return {};
  const data = Object.fromEntries(new FormData(form).entries());
  Object.keys(data).forEach((k) => { data[k] = String(data[k] ?? '').trim(); });
  data.deliveryMode = _deliveryMode;
  if (_deliveryMode !== 'branch') delete data.branchName;
  // Los opcionales vacíos no se mandan: el DTO los espera ausentes, no en "".
  ['floor', 'apartment', 'reference', 'branchName'].forEach((k) => {
    if (!data[k]) delete data[k];
  });
  return data;
}

function setShipQuoteMsg(text, kind = '') {
  const box = document.getElementById('shipQuote');
  const txt = document.getElementById('shipQuoteText');
  if (txt) txt.textContent = text;
  if (box) box.className = `ship-quote${kind ? ' ' + kind : ''}`;
}

/** Pide la cotización al backend. El costo nunca se calcula en el navegador. */
async function fetchShippingQuote() {
  const cart = getLocalCart();
  const subtotal = cart.items.reduce((s, i) => s + (i.price * i.qty), 0);
  const cp = (document.querySelector('#shipForm [name="postalCode"]')?.value || '').trim();

  if (cp.replace(/\D/g, '').length < 4) {
    _shippingQuote = null;
    setShipQuoteMsg('Completá el código postal para ver el costo');
    updateTotals();
    return;
  }

  setShipQuoteMsg('Calculando envío…');
  try {
    const res = await fetch(`${CARRITO_API}/shipping/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postalCode: cp, subtotal, deliveryMode: _deliveryMode })
    });
    const data = await res.json();

    if (!res.ok) {
      _shippingQuote = null;
      const msg = Array.isArray(data?.message) ? data.message[0] : data?.message;
      setShipQuoteMsg(msg || 'No pudimos cotizar ese código postal', 'is-error');
      updateTotals();
      return;
    }

    _shippingQuote = data;
    setShipQuoteMsg(
      data.freeShipping
        ? `¡Envío gratis a ${data.zone}! · Llega en ${data.etaBusinessDays}`
        : `Envío a ${data.zone}: ${formatARS(data.cost)} · Llega en ${data.etaBusinessDays}`,
      data.freeShipping ? 'is-free' : ''
    );
  } catch (err) {
    console.error('[shipping quote]', err);
    _shippingQuote = null;
    setShipQuoteMsg('No pudimos calcular el envío. Reintentá en un momento.', 'is-error');
  }
  updateTotals();
}

function validateShipForm() {
  const data = readShipForm();
  let firstBad = null;

  const required = [...SHIP_REQUIRED, ...(_deliveryMode === 'branch' ? ['branchName'] : [])];
  required.forEach((name) => {
    const input = document.querySelector(`#shipForm [name="${name}"]`);
    if (!input) return;
    const ok = String(data[name] || '').length > 0;
    input.classList.toggle('is-invalid', !ok);
    if (!ok && !firstBad) firstBad = input;
  });

  const dniInput = document.querySelector('#shipForm [name="dni"]');
  const dniDigits = String(data.dni || '').replace(/\D/g, '');
  if (dniInput && (dniDigits.length < 7 || dniDigits.length > 9)) {
    dniInput.classList.add('is-invalid');
    if (!firstBad) firstBad = dniInput;
  }

  if (firstBad) {
    firstBad.focus();
    carritoToast('Revisá los campos marcados', 'warn', 'fa-triangle-exclamation');
    return null;
  }
  if (!_shippingQuote) {
    carritoToast('Esperá a que calculemos el envío', 'warn', 'fa-truck-fast');
    return null;
  }
  return data;
}

function openShippingModal() {
  const overlay = document.getElementById('shipModalOverlay');
  if (!overlay) return;
  overlay.classList.add('is-open');
  document.body.classList.add('pm-modal-open');
  document.querySelector('#shipForm [name="recipientName"]')?.focus();
}

function closeShippingModal() {
  document.getElementById('shipModalOverlay')?.classList.remove('is-open');
  document.body.classList.remove('pm-modal-open');
}

function initShippingModal() {
  const overlay = document.getElementById('shipModalOverlay');
  const form = document.getElementById('shipForm');
  if (!overlay || !form) return;

  // Domicilio vs sucursal: cambia la tarifa, así que recotizamos.
  overlay.querySelectorAll('.ship-mode').forEach((btn) => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.ship-mode').forEach((b) => {
        b.classList.remove('is-selected');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('is-selected');
      btn.setAttribute('aria-checked', 'true');
      _deliveryMode = btn.dataset.mode;
      overlay.querySelector('.ship-field--branch').style.display =
        _deliveryMode === 'branch' ? '' : 'none';
      fetchShippingQuote();
    });
  });

  // Recotiza al terminar de escribir el CP, sin pegarle al backend por tecla.
  let cpTimer;
  const cpInput = form.querySelector('[name="postalCode"]');
  cpInput?.addEventListener('input', () => {
    clearTimeout(cpTimer);
    cpTimer = setTimeout(fetchShippingQuote, 450);
  });
  cpInput?.addEventListener('blur', fetchShippingQuote);

  form.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => input.classList.remove('is-invalid'));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = validateShipForm();
    if (!data) return;
    _shippingData = data;
    closeShippingModal();
    openPaymentModal();
  });

  document.getElementById('shipModalClose')?.addEventListener('click', closeShippingModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeShippingModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeShippingModal();
  });
}

/* ── Checkout: Stripe ── */
async function checkoutWithStripe() {
  const cart = getLocalCart();
  const token = localStorage.getItem('token');
  const userId = await getMvcqUserId();

  const res = await fetch(`${CARRITO_API}/stripe/checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      userId,
      items: cart.items.map(i => ({
        productId: i.productId,
        name: i.name,
        price: i.price,
        quantity: i.qty,
        size: i.size
      })),
      shipping: _shippingData,
      successUrl: `${window.location.origin}/pages/mis-pedidos.html?checkout=success&via=stripe`,
      cancelUrl: `${window.location.origin}/pages/carrito.html`
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg = errData?.message || 'Error al procesar el pago con Stripe';
    throw new Error(Array.isArray(msg) ? msg.join(', ') : String(msg));
  }

  const data = await res.json();
  const url = data.url || data.checkoutUrl || data.sessionUrl;
  if (url) {
    window.location.href = url;
    return;
  }
  carritoToast('Pedido enviado. Te contactaremos para confirmar.', 'success', 'fa-check');
  clearLocalCart();
  setTimeout(() => reRender(), 500);
}

/* ── Checkout: MercadoPago ── */
async function checkoutWithMercadoPago() {
  const cart = getLocalCart();
  const token = localStorage.getItem('token');

  const res = await fetch(`${CARRITO_API}/mercadopago/checkout-preference`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      items: cart.items.map(i => ({
        productId: i.productId,
        name: i.name,
        price: i.price,
        quantity: i.qty,
        size: i.size,
        image: i.image
      })),
      shipping: _shippingData,
      successUrl: `${window.location.origin}/pages/mis-pedidos.html?checkout=success&via=mercadopago`,
      failureUrl: `${window.location.origin}/pages/carrito.html?checkout=failure&via=mercadopago`,
      pendingUrl: `${window.location.origin}/pages/mis-pedidos.html?checkout=pending&via=mercadopago`
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg = errData?.message || 'Error al procesar el pago con MercadoPago';
    throw new Error(Array.isArray(msg) ? msg.join(', ') : String(msg));
  }

  const data = await res.json();
  const url = data.url || data.sandboxUrl;
  if (url) {
    window.location.href = url;
    return;
  }
  throw new Error('No se pudo iniciar el pago con MercadoPago');
}

/* ── Payment method modal ── */
let _selectedPaymentMethod = null;

function openPaymentModal() {
  const overlay = document.getElementById('pmModalOverlay');
  if (!overlay) return;
  const totalEl = document.getElementById('totalVal');
  const modalTotalEl = document.getElementById('pmModalTotal');
  if (modalTotalEl) modalTotalEl.textContent = totalEl?.textContent || '$0';
  overlay.classList.add('is-open');
  document.body.classList.add('pm-modal-open');
}

function closePaymentModal() {
  const overlay = document.getElementById('pmModalOverlay');
  if (!overlay) return;
  overlay.classList.remove('is-open');
  document.body.classList.remove('pm-modal-open');
}

function setPaymentModalLoading(isLoading) {
  const btn = document.getElementById('pmContinueBtn');
  if (!btn) return;
  const label = btn.querySelector('.pm-continue-label');
  const spinner = btn.querySelector('.pm-continue-spinner');
  btn.disabled = isLoading;
  if (label) label.style.display = isLoading ? 'none' : '';
  if (spinner) spinner.style.display = isLoading ? '' : 'none';
}

function initPaymentModal() {
  const overlay = document.getElementById('pmModalOverlay');
  const options = document.querySelectorAll('.pm-option');
  const continueBtn = document.getElementById('pmContinueBtn');
  if (!overlay || !continueBtn) return;

  options.forEach((opt) => {
    opt.addEventListener('click', () => {
      options.forEach((o) => {
        o.classList.remove('is-selected');
        o.setAttribute('aria-checked', 'false');
      });
      opt.classList.add('is-selected');
      opt.setAttribute('aria-checked', 'true');
      _selectedPaymentMethod = opt.dataset.method;
      continueBtn.disabled = false;
    });
  });

  document.getElementById('pmModalClose')?.addEventListener('click', closePaymentModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePaymentModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closePaymentModal();
  });

  continueBtn.addEventListener('click', async () => {
    if (!_selectedPaymentMethod) return;
    setPaymentModalLoading(true);
    try {
      if (_selectedPaymentMethod === 'stripe') {
        await checkoutWithStripe();
      } else {
        await checkoutWithMercadoPago();
      }
    } catch (err) {
      console.error('[checkout]', err);
      carritoToast(err.message || 'No se pudo procesar. Intentá de nuevo.', 'warn', 'fa-triangle-exclamation');
      setPaymentModalLoading(false);
    }
  });
}

/* ── Checkout entry point ── */
function initCheckout() {
  document.getElementById('checkoutBtn')?.addEventListener('click', () => {
    const isAuth = localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuth) {
      window.location.href = 'login.html?return=carrito.html';
      return;
    }
    // Primero la dirección: sin CP no hay costo de envío, y el costo tiene que
    // estar en la preferencia antes de mandar al cliente a pagar.
    openShippingModal();
  });
  initShippingModal();
  initPaymentModal();
}

/* ── Handle redirect back from a failed/cancelled payment ── */
function checkPaymentReturnStatus() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('checkout');
  if (status === 'failure') {
    carritoToast('Tu pago no pudo completarse. Podés intentar de nuevo cuando quieras.', 'warn', 'fa-triangle-exclamation');
    history.replaceState({}, '', window.location.pathname);
  }
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  reRender();
  initClearBtn();
  initCheckout();
  checkPaymentReturnStatus();
});
