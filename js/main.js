document.addEventListener("DOMContentLoaded", () => {
  const consentKey = "mvcq-cookie-consent";

  if (localStorage.getItem(consentKey) === "accepted") {
    return;
  }

  const banner = document.createElement("aside");
  banner.className = "cookie-banner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-live", "polite");
  banner.setAttribute("aria-label", "Preferencias de cookies");

  banner.innerHTML = `
    <div class="cookie-banner__glow"></div>
    <div class="cookie-banner__content">
      <div class="cookie-banner__badge">Experiencia personalizada</div>
      <h3>¿Aceptás cookies para una navegación más linda y rápida?</h3>
      <p>
        Usamos cookies para recordar preferencias, mejorar la tienda y mostrarte contenido más relevante.
      </p>
      <div class="cookie-banner__chips">
        <span><i class="fas fa-bolt"></i> Carga más rápida</span>
        <span><i class="fas fa-heart"></i> Experiencia personalizada</span>
        <span><i class="fas fa-shield-alt"></i> Configuración segura</span>
      </div>
      <div class="cookie-banner__actions">
        <button type="button" class="cookie-banner__btn cookie-banner__btn--ghost" data-cookie-action="later">Ahora no</button>
        <button type="button" class="cookie-banner__btn cookie-banner__btn--primary" data-cookie-action="accept">
          <i class="fas fa-cookie-bite me-2"></i>Aceptar cookies
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(banner);

  requestAnimationFrame(() => {
    banner.classList.add("is-visible");
  });

  banner.addEventListener("click", (event) => {
    const action = event.target.closest("[data-cookie-action]");
    if (!action) {
      return;
    }

    const type = action.getAttribute("data-cookie-action");

    if (type === "accept") {
      localStorage.setItem(consentKey, "accepted");
    } else {
      sessionStorage.setItem("mvcq-cookie-dismissed", "true");
    }

    banner.classList.remove("is-visible");
    banner.classList.add("is-leaving");

    window.setTimeout(() => {
      banner.remove();
    }, 320);
  });
});
