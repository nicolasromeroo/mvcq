/* ═══════════════════════════════════════════════════════
   ADMIN SITE CONFIG — Me Visto Como Quiero
   Manages the "Sitio Web" tab in the admin panel.
   Loads current config from API and lets admin save changes.
   ═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const API = (['127.0.0.1','localhost'].includes(location.hostname) ? 'http://localhost:3000' : 'https://web-vd8s1gd9atgj.up-de-fra1-k8s-1.apps.run-on-seenode.com');

  /* ── DOM references ── */
  const loader   = document.getElementById('siteConfigLoader');
  const form     = document.getElementById('siteConfigForm');
  const saveBtn  = document.getElementById('btnSaveSiteConfig');
  const savedMsg = document.getElementById('siteConfigSaved');

  if (!loader || !form || !saveBtn) return; // not on admin panel

  /* Helpers */
  const el = (id) => document.getElementById(id);
  const checked = (id, val) => { const e = el(id); if (e) e.checked = !!val; };
  const val = (id, v) => { const e = el(id); if (e) e.value = v || ''; };
  const getChecked = (id) => { const e = el(id); return e ? e.checked : false; };
  const getVal     = (id) => { const e = el(id); return e ? e.value.trim() : ''; };

  function authHeader() {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  /* ── Build hero slides editor ── */
  function buildHeroSlidesEditor(slides = []) {
    const container = document.getElementById('heroSlidesConfig');
    if (!container) return;
    container.innerHTML = '';

    slides.forEach((slide, i) => {
      const div = document.createElement('div');
      div.className = 'admin-slide-editor';
      div.innerHTML = `
        <div class="admin-slide-editor-head">Slide ${i + 1}</div>
        <div class="admin-slide-editor-body">
          <div>
            <label class="admin-label" for="cfg-slide-${i}-title">Título</label>
            <input class="admin-input" id="cfg-slide-${i}-title" type="text" value="${esc(slide.title || '')}" placeholder="Título del slide" />
          </div>
          <div>
            <label class="admin-label" for="cfg-slide-${i}-badge">Etiqueta (badge)</label>
            <input class="admin-input" id="cfg-slide-${i}-badge" type="text" value="${esc(slide.badge || '')}" placeholder="NUEVO / 15% OFF / ..." />
          </div>
          <div style="grid-column:1/-1">
            <label class="admin-label" for="cfg-slide-${i}-subtitle">Subtítulo</label>
            <input class="admin-input" id="cfg-slide-${i}-subtitle" type="text" value="${esc(slide.subtitle || '')}" placeholder="Descripción breve del slide" />
          </div>
          <div>
            <label class="admin-label" for="cfg-slide-${i}-cta">Texto del botón</label>
            <input class="admin-input" id="cfg-slide-${i}-cta" type="text" value="${esc(slide.ctaText || '')}" placeholder="Ver colección" />
          </div>
          <div>
            <label class="admin-label" for="cfg-slide-${i}-link">Link del botón</label>
            <input class="admin-input" id="cfg-slide-${i}-link" type="text" value="${esc(slide.ctaLink || '')}" placeholder="pages/productos.html" />
          </div>
        </div>
      `;
      container.appendChild(div);
    });
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Populate form with config ── */
  function populateForm(cfg) {
    /* Marquee */
    checked('cfg-marquee-visible', cfg.marquee?.visible !== false);
    val('cfg-marquee-text', cfg.marquee?.text);

    /* Hero */
    checked('cfg-hero-visible', cfg.hero?.visible !== false);
    buildHeroSlidesEditor(cfg.hero?.slides || []);

    /* Categories */
    checked('cfg-categories-visible', cfg.categories?.visible !== false);

    /* Promo banner */
    checked('cfg-promo-visible', cfg.promoBanner?.visible !== false);
    val('cfg-promo-text',    cfg.promoBanner?.text);
    val('cfg-promo-subtext', cfg.promoBanner?.subtext);
    val('cfg-promo-cta',     cfg.promoBanner?.ctaText);
    val('cfg-promo-link',    cfg.promoBanner?.ctaLink);

    /* Featured */
    checked('cfg-featured-visible', cfg.featured?.visible !== false);
    val('cfg-featured-title',    cfg.featured?.title);
    val('cfg-featured-subtitle', cfg.featured?.subtitle);

    /* Trust */
    checked('cfg-trust-visible', cfg.trust?.visible !== false);

    /* Newsletter */
    checked('cfg-newsletter-visible', cfg.newsletter?.visible !== false);
  }

  /* ── Collect form values into config object ── */
  function collectConfig(existingHeroSlides = []) {
    /* Reconstruct slide data from form */
    const slides = existingHeroSlides.map((orig, i) => ({
      ...orig,
      title:    getVal(`cfg-slide-${i}-title`)    || orig.title,
      badge:    getVal(`cfg-slide-${i}-badge`)    || orig.badge,
      subtitle: getVal(`cfg-slide-${i}-subtitle`) || orig.subtitle,
      ctaText:  getVal(`cfg-slide-${i}-cta`)      || orig.ctaText,
      ctaLink:  getVal(`cfg-slide-${i}-link`)     || orig.ctaLink,
    }));

    return {
      marquee: {
        visible: getChecked('cfg-marquee-visible'),
        text:    getVal('cfg-marquee-text'),
      },
      hero: {
        visible: getChecked('cfg-hero-visible'),
        slides,
      },
      categories: {
        visible: getChecked('cfg-categories-visible'),
      },
      promoBanner: {
        visible: getChecked('cfg-promo-visible'),
        text:    getVal('cfg-promo-text'),
        subtext: getVal('cfg-promo-subtext'),
        ctaText: getVal('cfg-promo-cta'),
        ctaLink: getVal('cfg-promo-link'),
      },
      featured: {
        visible:  getChecked('cfg-featured-visible'),
        title:    getVal('cfg-featured-title'),
        subtitle: getVal('cfg-featured-subtitle'),
      },
      trust: {
        visible: getChecked('cfg-trust-visible'),
      },
      newsletter: {
        visible: getChecked('cfg-newsletter-visible'),
      },
    };
  }

  /* ── Load config from API ── */
  let heroSlides = [];

  async function loadConfig() {
    try {
      const res = await fetch(`${API}/site-config`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const cfg = await res.json();
      heroSlides = cfg.hero?.slides || [];
      populateForm(cfg);
      loader.style.display = 'none';
      form.style.display   = 'block';
    } catch (err) {
      loader.innerHTML = `<p class="text-danger">Error cargando configuración: ${err.message}</p>`;
    }
  }

  /* ── Save config to API ── */
  async function saveConfig() {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Guardando…';

    try {
      const config = collectConfig(heroSlides);
      heroSlides = config.hero?.slides || [];

      const res = await fetch(`${API}/site-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(),
        },
        body: JSON.stringify(config),
      });

      if (!res.ok) throw new Error('HTTP ' + res.status);

      /* Show success message */
      if (savedMsg) {
        savedMsg.style.display = 'flex';
        savedMsg.style.alignItems = 'center';
        setTimeout(() => { savedMsg.style.display = 'none'; }, 4000);
      }

    } catch (err) {
      alert('Error guardando: ' + err.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-save me-1"></i> Guardar cambios';
    }
  }

  /* ── Wire up the save button ── */
  saveBtn.addEventListener('click', saveConfig);

  /* ── Load when the "Sitio Web" tab is activated ── */
  document.addEventListener('adminSectionChange', function (e) {
    if (e.detail?.section === 'sitio' && form.style.display === 'none' && loader.style.display !== 'none') {
      loadConfig();
    }
  });

  /* Also check immediately if the section is already visible */
  const sectionEl = document.getElementById('section-sitio');
  if (sectionEl && sectionEl.classList.contains('is-visible')) {
    loadConfig();
  }

  /* ── Hook into admin-panel.js tab switch ── */
  /* admin-panel.js uses data-section buttons; we intercept here by watching mutations */
  const observer = new MutationObserver(function () {
    const sitioVisible = sectionEl && sectionEl.classList.contains('is-visible');
    const notLoaded    = form.style.display === 'none' && loader.innerHTML.includes('Cargando');
    if (sitioVisible && notLoaded) loadConfig();
  });

  if (sectionEl) {
    observer.observe(sectionEl, { attributes: true, attributeFilter: ['class'] });
  }

})();
