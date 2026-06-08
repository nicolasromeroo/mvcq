const nav = document.querySelector('.contenedor-estilos-nav');
const navCollapse = document.getElementById('navbarNav');
let prevScrollPos = window.pageYOffset;

/* On inner pages (no full-viewport hero) the navbar is always opaque */
const hasHeroPage = !!document.querySelector('.hero-carousel');

function updateNavbarState() {
  if (!nav) return;

  const currentScrollPos = window.pageYOffset;
  const isMenuOpen = navCollapse ? navCollapse.classList.contains('show') : false;

  /* Inner page: always scrolled state */
  if (!hasHeroPage) {
    nav.classList.add('is-scrolled');
    nav.classList.remove('is-hidden');
    return;
  }

  nav.classList.toggle('is-scrolled', currentScrollPos > 24);

  if (isMenuOpen || currentScrollPos <= 40) {
    nav.classList.remove('is-hidden');
  } else if (currentScrollPos > prevScrollPos && currentScrollPos > 180) {
    nav.classList.add('is-hidden');
  } else {
    nav.classList.remove('is-hidden');
  }

  prevScrollPos = currentScrollPos;
}

window.addEventListener('scroll', updateNavbarState, { passive: true });

if (navCollapse) {
  navCollapse.addEventListener('show.bs.collapse',   () => { if (nav) nav.classList.remove('is-hidden'); });
  navCollapse.addEventListener('shown.bs.collapse',  updateNavbarState);
  navCollapse.addEventListener('hidden.bs.collapse', updateNavbarState);
}

updateNavbarState();
