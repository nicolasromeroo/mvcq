/* =====================================================
   cart-utils.js — Me Visto Como Quiero
   Shared cart helpers: localStorage + backend sync
   ===================================================== */

const MVCQ_CART_KEY = 'mvcq_cart';
const _CART_API = window.MVCQ_API;

let _cartUserId = null;

/* ── Resolve userId via profile endpoint (cached) ── */
async function getMvcqUserId() {
  if (_cartUserId) return _cartUserId;
  const stored = localStorage.getItem('mvcq_userId');
  if (stored) { _cartUserId = stored; return stored; }
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const res = await fetch(`${_CART_API}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const u = await res.json();
    const id = u.id || u._id || u.userId || u.user?.id || u.sub;
    if (id) {
      const sid = String(id);
      localStorage.setItem('mvcq_userId', sid);
      _cartUserId = sid;
    }
    return _cartUserId;
  } catch { return null; }
}

/* ── Local cart read/write ── */
function getLocalCart() {
  try { return JSON.parse(localStorage.getItem(MVCQ_CART_KEY) || '{"items":[]}'); }
  catch { return { items: [] }; }
}

function saveLocalCart(cart) {
  localStorage.setItem(MVCQ_CART_KEY, JSON.stringify(cart));
  _refreshCartBadge();
}

/* ── Public: add item ── */
function addToLocalCart(item) {
  const cart = getLocalCart();
  const existing = cart.items.find(
    i => i.productId === item.productId && i.size === item.size
  );
  if (existing) {
    existing.qty = Math.min(existing.qty + (item.qty || 1), 10);
  } else {
    cart.items.push({ ...item, qty: item.qty || 1 });
  }
  saveLocalCart(cart);
  return cart;
}

async function addToCart(item) {
  addToLocalCart(item);
  const token = localStorage.getItem('token');
  if (!token) return;
  const userId = await getMvcqUserId();
  if (!userId) return;
  try {
    await fetch(`${_CART_API}/cart/add-to-cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        userId,
        productId: item.productId,
        quantity: item.qty || 1,
        size: item.size || ''
      })
    });
  } catch (e) {
    console.warn('[cart] backend sync error:', e.message);
  }
}

/* ── Public: remove item ── */
function removeFromLocalCart(productId, size) {
  const cart = getLocalCart();
  cart.items = cart.items.filter(
    i => !(i.productId === productId && i.size === size)
  );
  saveLocalCart(cart);
  return cart;
}

async function removeFromCart(productId, size) {
  removeFromLocalCart(productId, size);
  const token = localStorage.getItem('token');
  if (!token) return;
  const userId = await getMvcqUserId();
  if (!userId) return;
  try {
    await fetch(`${_CART_API}/cart/${userId}/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    console.warn('[cart] remove backend error:', e.message);
  }
}

/* ── Public: update quantity ── */
function updateLocalCartQty(productId, size, qty) {
  if (qty <= 0) return removeFromLocalCart(productId, size);
  const cart = getLocalCart();
  const item = cart.items.find(i => i.productId === productId && i.size === size);
  if (item) item.qty = Math.min(qty, 10);
  saveLocalCart(cart);
  return cart;
}

async function updateCartQty(productId, size, qty) {
  if (qty <= 0) return removeFromCart(productId, size);
  updateLocalCartQty(productId, size, qty);
  const token = localStorage.getItem('token');
  if (!token) return;
  const userId = await getMvcqUserId();
  if (!userId) return;
  try {
    await fetch(`${_CART_API}/cart/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ productId, size, quantity: qty })
    });
  } catch (e) {
    console.warn('[cart] update qty backend error:', e.message);
  }
}

/* ── Public: clear ── */
function clearLocalCart() {
  saveLocalCart({ items: [] });
}

/* ── Getters ── */
function getCartCount() {
  return getLocalCart().items.reduce((s, i) => s + i.qty, 0);
}

function getCartTotal() {
  return getLocalCart().items.reduce((s, i) => s + (i.price * i.qty), 0);
}

/* ── Badge update ── */
function _refreshCartBadge() {
  const count = getCartCount();
  document.querySelectorAll('.site-nav-badge').forEach(el => {
    el.textContent = count > 99 ? '99+' : String(count);
  });
}

document.addEventListener('DOMContentLoaded', _refreshCartBadge);
