/* =====================================================
   favorites-utils.js — Me Visto Como Quiero
   Shared favorites helpers: localStorage storage
   ===================================================== */

const MVCQ_FAV_KEY = 'mvcq_favorites';

/* ── Local favorites read/write ── */
function getLocalFavorites() {
  try { return JSON.parse(localStorage.getItem(MVCQ_FAV_KEY) || '{"items":[]}'); }
  catch { return { items: [] }; }
}

function saveLocalFavorites(favs) {
  localStorage.setItem(MVCQ_FAV_KEY, JSON.stringify(favs));
  _refreshFavBadge();
}

/* ── Public: toggle a product in/out of favorites ── */
function toggleFavorite(product) {
  const favs = getLocalFavorites();
  const idx = favs.items.findIndex(i => i.productId === product.productId);
  let added;
  if (idx >= 0) {
    favs.items.splice(idx, 1);
    added = false;
  } else {
    favs.items.unshift({ ...product, savedAt: Date.now() });
    added = true;
  }
  saveLocalFavorites(favs);
  return added;
}

/* ── Public: check if a product is favorited ── */
function isFavorited(productId) {
  return getLocalFavorites().items.some(i => i.productId === productId);
}

/* ── Public: remove a product from favorites ── */
function removeFromFavorites(productId) {
  const favs = getLocalFavorites();
  favs.items = favs.items.filter(i => i.productId !== productId);
  saveLocalFavorites(favs);
}

/* ── Count & badge ── */
function getFavCount() {
  return getLocalFavorites().items.length;
}

function _refreshFavBadge() {
  const count = getFavCount();
  document.querySelectorAll('.site-nav-fav-badge').forEach(el => {
    el.textContent = count > 99 ? '99+' : String(count);
    el.style.display = count > 0 ? '' : 'none';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  _refreshFavBadge();
  /* Restore heart state on product cards if already on page */
  document.querySelectorAll('.producto-wishlist[data-product-id]').forEach(btn => {
    if (isFavorited(btn.dataset.productId)) {
      btn.classList.add('is-liked');
      const icon = btn.querySelector('i');
      if (icon) { icon.classList.remove('far'); icon.classList.add('fas'); }
    }
  });
});
