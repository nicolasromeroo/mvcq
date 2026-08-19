'use strict';

const API = (['127.0.0.1','localhost'].includes(location.hostname) ? 'http://localhost:3000' : 'https://web-vd8s1gd9atgj.up-de-fra1-k8s-1.apps.run-on-seenode.com');
const OUTFITS_KEY  = 'mvcq-colecciones-v2';
const POINTS_PER_FAV    = 5;
const POINTS_PER_OUTFIT = 20;

/* ── Redirect si no está autenticado ── */
document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('isAuthenticated') !== 'true') {
    window.location.href = 'login.html';
    return;
  }
  initPerfil();
});

async function initPerfil() {
  const username = localStorage.getItem('username') || 'Usuario';
  const role     = localStorage.getItem('userRole') || 'USER';
  const userId   = localStorage.getItem('mvcq_userId');
  const token    = localStorage.getItem('token');

  /* Hero */
  const heroTitle = document.getElementById('heroTitle');
  const heroSub   = document.getElementById('heroSub');
  if (heroTitle) heroTitle.textContent = username;
  if (heroSub)   heroSub.textContent   = role.toLowerCase() === 'admin' ? 'Panel de administración' : 'Tu cuenta personal';

  /* Avatar */
  const avatarEl = document.getElementById('perfilAvatar');
  if (avatarEl) avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=7a2b3b&color=fff&size=160`;

  /* Name */
  const nameEl = document.getElementById('perfilName');
  if (nameEl) nameEl.textContent = username;

  /* Role badge */
  const badgeEl = document.getElementById('perfilRoleBadge');
  if (badgeEl) {
    const isAdmin = role.toLowerCase() === 'admin';
    badgeEl.textContent = isAdmin ? 'Admin' : 'Cliente';
    if (isAdmin) badgeEl.classList.add('is-admin');
  }

  /* Fetch email from API */
  if (userId && token) {
    try {
      const res = await fetch(`${API}/users/find/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const user = await res.json();
        const emailEl = document.getElementById('perfilEmail');
        if (emailEl && user.email) emailEl.textContent = user.email;
      }
    } catch (_) {}
  }

  /* Stats */
  const favCount    = typeof getLocalFavorites === 'function'
    ? getLocalFavorites().items.length : 0;
  const outfitsData = (() => {
    try { return JSON.parse(localStorage.getItem(OUTFITS_KEY) || '[]'); } catch(_){ return []; }
  })();
  const outfitCount = outfitsData.length;
  const points      = favCount * POINTS_PER_FAV + outfitCount * POINTS_PER_OUTFIT;

  setEl('statFavs',    favCount);
  setEl('statOutfits', outfitCount);
  setEl('statPoints',  points);
  setEl('puntosTotal', points);

  /* Quick-links metadata */
  setEl('linkFavsCount',   `${favCount} prenda${favCount !== 1 ? 's' : ''} guardada${favCount !== 1 ? 's' : ''}`);
  setEl('linkOutfitsCount',`${outfitCount} outfit${outfitCount !== 1 ? 's' : ''} guardado${outfitCount !== 1 ? 's' : ''}`);
  const cartCount = typeof getCartCount === 'function' ? getCartCount() : 0;
  setEl('linkCartCount',   `${cartCount} artículo${cartCount !== 1 ? 's' : ''}`);

  /* Points breakdown */
  renderPuntosBreakdown(favCount, outfitCount);

  /* Change password form */
  initChangePasswordForm(token);

  /* Eye buttons */
  document.querySelectorAll('.perfil-eye-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';
      btn.querySelector('i').className = isText ? 'far fa-eye' : 'far fa-eye-slash';
    });
  });
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function renderPuntosBreakdown(favs, outfits) {
  const el = document.getElementById('puntosBreakdown');
  if (!el) return;
  el.innerHTML = `
    <div class="puntos-row">
      <span><i class="far fa-heart me-2" style="color:#7a2b3b"></i>Favoritos</span>
      <span class="puntos-row-val">+ ${favs * POINTS_PER_FAV} pts</span>
    </div>
    <div class="puntos-row">
      <span><i class="fas fa-layer-group me-2" style="color:#c4986b"></i>Outfits guardados</span>
      <span class="puntos-row-val">+ ${outfits * POINTS_PER_OUTFIT} pts</span>
    </div>
  `;
}

function initChangePasswordForm(token) {
  const form = document.getElementById('changePasswordForm');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const current  = document.getElementById('currentPassword')?.value.trim();
    const newPw    = document.getElementById('newPassword')?.value.trim();
    const confirm  = document.getElementById('confirmPassword')?.value.trim();
    const feedback = document.getElementById('pwFeedback');
    const btn      = document.getElementById('btnChangePassword');

    if (!current || !newPw || !confirm) {
      showFeedback(feedback, 'Completá todos los campos.', false);
      return;
    }
    if (newPw.length < 6) {
      showFeedback(feedback, 'La nueva contraseña debe tener al menos 6 caracteres.', false);
      return;
    }
    if (newPw !== confirm) {
      showFeedback(feedback, 'Las contraseñas nuevas no coinciden.', false);
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Guardando…';

    try {
      const res = await fetch(`${API}/users/change-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword: current, newPassword: newPw }),
      });

      const data = await res.json();

      if (res.ok) {
        showFeedback(feedback, '¡Contraseña actualizada exitosamente!', true);
        form.reset();
        showToast('Contraseña actualizada', true);
      } else {
        const msg = data?.message || 'No se pudo actualizar la contraseña.';
        showFeedback(feedback, msg, false);
      }
    } catch (_) {
      showFeedback(feedback, 'Error de conexión. Intentá de nuevo.', false);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-lock me-2"></i>Cambiar contraseña';
    }
  });
}

function showFeedback(el, msg, ok) {
  if (!el) return;
  el.textContent = msg;
  el.className = `perfil-feedback ${ok ? 'is-success' : 'is-error'}`;
  el.style.display = 'block';
  setTimeout(() => { if (el) el.style.display = 'none'; }, 5000);
}

function showToast(msg, ok = true) {
  const stack = document.getElementById('perfilToastStack');
  if (!stack) return;
  const t = document.createElement('div');
  t.className = `perfil-toast ${ok ? 'perfil-toast--success' : 'perfil-toast--error'}`;
  t.innerHTML = `<i class="fas ${ok ? 'fa-check' : 'fa-times'}"></i>${msg}`;
  stack.appendChild(t);
  requestAnimationFrame(() => { requestAnimationFrame(() => t.classList.add('is-visible')); });
  setTimeout(() => {
    t.classList.remove('is-visible');
    setTimeout(() => t.remove(), 450);
  }, 3500);
}
