document.addEventListener("DOMContentLoaded", () => {
  /* ===== DOM REFS ===== */
  const panel = document.getElementById("filtros-panel");
  const overlay = document.getElementById("filtros-overlay");
  const toggleBtn = document.getElementById("filtro-toggle");
  const closeBtn = document.getElementById("filtros-close");
  const applyBtn = document.getElementById("filtros-apply");
  const clearAllBtn = document.getElementById("filtros-clear-all");
  const activeWrap = document.getElementById("filtros-active");
  const activeList = document.getElementById("filtros-active-list");
  const countEl = document.getElementById("productos-count");

  const precioMin = document.getElementById("precio-min");
  const precioMax = document.getElementById("precio-max");
  const precioMinLabel = document.getElementById("precio-min-label");
  const precioMaxLabel = document.getElementById("precio-max-label");

  /* ===== STATE ===== */
  const state = {
    audiencias: new Set(),
    categorias: new Set(),
    tallas: new Set(),
    colores: new Set(),
    precioMin: 0,
    precioMax: 50000,
  };

  /* ===== EXPOSE STATE ===== */
  window.mvcqFilterState = state;

  /* ===== MOBILE PANEL ===== */
  function openPanel() {
    panel.classList.add("is-open");
    overlay.classList.add("is-visible");
    document.body.style.overflow = "hidden";
  }

  function closePanel() {
    panel.classList.remove("is-open");
    overlay.classList.remove("is-visible");
    document.body.style.overflow = "";
  }

  toggleBtn.addEventListener("click", openPanel);
  closeBtn.addEventListener("click", closePanel);
  overlay.addEventListener("click", closePanel);
  applyBtn.addEventListener("click", closePanel);

  /* ===== SECTION TOGGLES ===== */
  document.querySelectorAll(".filtro-section-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.closest(".filtro-section");
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expanded));
      section.classList.toggle("is-collapsed", expanded);
    });
  });

  /* ===== AUDIENCE CHECKBOXES ===== */
  panel.querySelectorAll('input[name="audiencia"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked) {
        state.audiencias.add(cb.value);
      } else {
        state.audiencias.delete(cb.value);
      }
      renderChips();
      dispatchFilterChange();
    });
  });

  /* ===== CATEGORY CHECKBOXES ===== */
  panel.querySelectorAll('input[name="categoria"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked) {
        state.categorias.add(cb.value);
      } else {
        state.categorias.delete(cb.value);
      }
      renderChips();
      dispatchFilterChange();
    });
  });

  /* ===== SIZE BUTTONS ===== */
  panel.querySelectorAll(".filtro-size-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const size = btn.dataset.size;
      btn.classList.toggle("is-active");
      if (state.tallas.has(size)) {
        state.tallas.delete(size);
      } else {
        state.tallas.add(size);
      }
      renderChips();
      dispatchFilterChange();
    });
  });

  /* ===== COLOR SWATCHES ===== */
  panel.querySelectorAll(".filtro-color-swatch").forEach((swatch) => {
    swatch.addEventListener("click", () => {
      const color = swatch.dataset.color;
      swatch.classList.toggle("is-active");
      if (state.colores.has(color)) {
        state.colores.delete(color);
      } else {
        state.colores.add(color);
      }
      renderChips();
      dispatchFilterChange();
    });
  });

  /* ===== PRICE RANGE ===== */
  function formatPrice(n) {
    return "$" + Number(n).toLocaleString("es-AR");
  }

  function updatePriceLabels() {
    const min = Math.min(+precioMin.value, +precioMax.value);
    const max = Math.max(+precioMin.value, +precioMax.value);
    state.precioMin = min;
    state.precioMax = max;
    precioMinLabel.textContent = formatPrice(min);
    precioMaxLabel.textContent = formatPrice(max);
    renderChips();
  }

  precioMin.addEventListener("input", () => {
    updatePriceLabels();
    dispatchFilterChange();
  });
  precioMax.addEventListener("input", () => {
    updatePriceLabels();
    dispatchFilterChange();
  });

  /* ===== FILTER BADGE (toggle button) ===== */
  function updateFilterBadge(count) {
    const badge = document.getElementById("filtro-badge");
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove("d-none");
    } else {
      badge.classList.add("d-none");
    }
  }

  /* ===== FILTER CHANGE BROADCAST ===== */
  function dispatchFilterChange() {
    document.dispatchEvent(
      new CustomEvent("filtros:changed", { detail: state }),
    );
  }

  const AUDIENCIA_LABELS = {
    mujer: "Mujer",
    hombre: "Hombre",
    ninos: "Niños",
    adolescentes: "Adolescentes",
    tradicional: "Tradicional",
  };

  /* ===== ACTIVE CHIPS ===== */
  function renderChips() {
    activeList.innerHTML = "";
    let count = 0;

    state.audiencias.forEach((aud) => {
      activeList.appendChild(
        makeChip(AUDIENCIA_LABELS[aud] || aud, "audiencia", aud),
      );
      count++;
    });

    state.categorias.forEach((cat) => {
      activeList.appendChild(makeChip(cat, "categoria", cat));
      count++;
    });

    state.tallas.forEach((size) => {
      activeList.appendChild(makeChip("Talle " + size, "talla", size));
      count++;
    });

    state.colores.forEach((color) => {
      activeList.appendChild(makeChip(color, "color", color));
      count++;
    });

    if (state.precioMin > 0 || state.precioMax < 50000) {
      activeList.appendChild(
        makeChip(
          formatPrice(state.precioMin) + " – " + formatPrice(state.precioMax),
          "precio",
          "range",
        ),
      );
      count++;
    }

    activeWrap.style.display = count > 0 ? "flex" : "none";
    updateFilterBadge(count);
  }

  function makeChip(label, type, value) {
    const chip = document.createElement("span");
    chip.className = "filtro-chip";
    chip.innerHTML =
      escapeHTML(label) +
      ' <button class="filtro-chip-remove" aria-label="Quitar filtro"><i class="fas fa-times"></i></button>';

    chip.querySelector("button").addEventListener("click", () => {
      removeFilter(type, value);
    });

    return chip;
  }

  function removeFilter(type, value) {
    if (type === "audiencia") {
      state.audiencias.delete(value);
      const cb = panel.querySelector(
        `input[name="audiencia"][value="${value}"]`,
      );
      if (cb) cb.checked = false;
    } else if (type === "categoria") {
      state.categorias.delete(value);
      const cb = panel.querySelector(
        `input[name="categoria"][value="${value}"]`,
      );
      if (cb) cb.checked = false;
    } else if (type === "talla") {
      state.tallas.delete(value);
      const btn = panel.querySelector(`.filtro-size-btn[data-size="${value}"]`);
      if (btn) btn.classList.remove("is-active");
    } else if (type === "color") {
      state.colores.delete(value);
      const swatch = panel.querySelector(
        `.filtro-color-swatch[data-color="${value}"]`,
      );
      if (swatch) swatch.classList.remove("is-active");
    } else if (type === "precio") {
      state.precioMin = 0;
      state.precioMax = 50000;
      precioMin.value = 0;
      precioMax.value = 50000;
      precioMinLabel.textContent = formatPrice(0);
      precioMaxLabel.textContent = formatPrice(50000);
    }

    renderChips();
    dispatchFilterChange();
  }

  /* ===== CLEAR ALL ===== */
  clearAllBtn.addEventListener("click", () => {
    state.audiencias.clear();
    state.categorias.clear();
    state.tallas.clear();
    state.colores.clear();
    state.precioMin = 0;
    state.precioMax = 50000;

    panel
      .querySelectorAll('input[name="audiencia"]')
      .forEach((cb) => (cb.checked = false));
    panel
      .querySelectorAll('input[name="categoria"]')
      .forEach((cb) => (cb.checked = false));
    panel
      .querySelectorAll(".filtro-size-btn")
      .forEach((b) => b.classList.remove("is-active"));
    panel
      .querySelectorAll(".filtro-color-swatch")
      .forEach((s) => s.classList.remove("is-active"));
    precioMin.value = 0;
    precioMax.value = 50000;
    precioMinLabel.textContent = formatPrice(0);
    precioMaxLabel.textContent = formatPrice(50000);

    renderChips();
    dispatchFilterChange();
  });

  /* ===== HELPERS ===== */
  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ===== PRODUCT COUNT ===== */
  const observer = new MutationObserver(() => {
    const cards = document.querySelectorAll(
      "#productsList .producto-card:not(.is-skeleton)",
    );
    if (cards.length && countEl && !countEl.textContent) {
      countEl.textContent = cards.length + " productos";
    }
  });

  observer.observe(document.getElementById("productsList"), {
    childList: true,
  });
});
