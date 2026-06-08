/* ═══════════════════════════════════════════════════════
   SITE CONFIG LOADER — Me Visto Como Quiero
   Fetches /site-config and applies visibility + content
   to every configurable section on the page.
   ═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const API = 'http://localhost:3000';

  /* Map section keys → CSS selectors */
  const SECTION_SELECTORS = {
    marquee:     '#promoMarquee',
    hero:        '#heroBanner',
    categories:  '[data-section="categories"]',
    promoBanner: '[data-section="promoBanner"]',
    featured:    '[data-section="featured"]',
    trust:       '[data-section="trust"]',
    newsletter:  '[data-section="newsletter"]',
  };

  /* ── Apply visibility ── */
  function applyVisibility(config) {
    Object.entries(SECTION_SELECTORS).forEach(([key, selector]) => {
      const section = config[key];
      if (section && section.visible === false) {
        const el = document.querySelector(selector);
        if (el) el.style.display = 'none';
      }
    });
  }

  /* ── Apply marquee text ── */
  function applyMarquee(cfg) {
    if (!cfg) return;
    const text = cfg.text;
    if (!text) return;
    document.querySelectorAll('#marqueeText, #marqueeText2').forEach(el => {
      el.textContent = text;
    });
  }

  /* ── Apply hero slide content ── */
  function applyHero(cfg) {
    if (!cfg || !Array.isArray(cfg.slides)) return;
    cfg.slides.forEach((slide, i) => {
      const q = (attr) => document.querySelector(`[data-hero-${attr}="${i}"]`);
      if (slide.title)    { const el = q('title');    if (el) el.innerHTML = slide.title.replace(/\n/g, '<br>'); }
      if (slide.subtitle) { const el = q('subtitle'); if (el) el.textContent = slide.subtitle; }
      if (slide.badge)    { const el = q('eyebrow');  if (el) el.textContent = slide.badge; }
      if (slide.ctaText)  { const el = q('cta');      if (el) el.childNodes[0].textContent = slide.ctaText + ' '; }
      if (slide.ctaLink)  { const el = q('cta');      if (el) el.href = slide.ctaLink; }
    });
  }

  /* ── Apply promo banner content ── */
  function applyPromoBanner(cfg) {
    if (!cfg) return;
    if (cfg.text)    { const el = document.querySelector('[data-promo-title]');   if (el) el.textContent = cfg.text; }
    if (cfg.subtext) { const el = document.querySelector('[data-promo-subtext]'); if (el) el.textContent = cfg.subtext; }
    if (cfg.ctaText) { const el = document.querySelector('[data-promo-cta]');     if (el) { el.childNodes[0].textContent = cfg.ctaText + ' '; } }
    if (cfg.ctaLink) { const el = document.querySelector('[data-promo-cta]');     if (el) el.href = cfg.ctaLink; }
  }

  /* ── Apply featured section content ── */
  function applyFeatured(cfg) {
    if (!cfg) return;
    if (cfg.title)    { const el = document.querySelector('[data-featured-title]');    if (el) el.textContent = cfg.title; }
    if (cfg.subtitle) { const el = document.querySelector('[data-featured-subtitle]'); if (el) el.textContent = cfg.subtitle; }
  }

  /* ── Main load ── */
  async function loadSiteConfig() {
    try {
      const res = await fetch(`${API}/site-config`, { cache: 'no-store' });
      if (!res.ok) return; // silently use HTML defaults
      const config = await res.json();

      applyVisibility(config);
      applyMarquee(config.marquee);
      applyHero(config.hero);
      applyPromoBanner(config.promoBanner);
      applyFeatured(config.featured);

      /* Expose globally so admin JS can read it */
      window.__siteConfig = config;
    } catch (_) {
      /* Network error or backend down — keep HTML defaults */
    }
  }

  /* Run as soon as DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSiteConfig);
  } else {
    loadSiteConfig();
  }
})();
