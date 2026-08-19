/* ═══════════════════════════════════════════════════════
   ADMIN ENVÍOS Y LEGALES — Me Visto Como Quiero
   Manages the "Envíos y Legales" tab in the admin panel.
   Loads /legal/terms from the API and lets the admin edit
   every section (title, paragraphs, highlight) without Postman.
   ═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const API = (['127.0.0.1','localhost'].includes(location.hostname) ? 'http://localhost:3000' : 'https://web-vd8s1gd9atgj.up-de-fra1-k8s-1.apps.run-on-seenode.com');

  /* ── DOM references ── */
  const loader        = document.getElementById('enviosLegalesLoader');
  const form          = document.getElementById('enviosLegalesForm');
  const saveBtn       = document.getElementById('btnSaveEnviosLegales');
  const savedMsg      = document.getElementById('enviosLegalesSaved');
  const sectionsBox   = document.getElementById('legalSectionsConfig');
  const addSectionBtn = document.getElementById('btnAddLegalSection');
  const updatedInput  = document.getElementById('cfg-legal-updated');

  if (!loader || !form || !saveBtn || !sectionsBox) return; // not on admin panel

  function authHeader() {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  /* ── Build one paragraph row (textarea + remove button) ── */
  function buildParagraphRow(text) {
    const row = document.createElement('div');
    row.className = 'legal-para-row';
    row.innerHTML = `
      <textarea class="admin-input admin-textarea legal-para-textarea" rows="3" placeholder="Texto del párrafo…"></textarea>
      <button type="button" class="legal-para-remove" title="Eliminar párrafo" aria-label="Eliminar párrafo">
        <i class="fas fa-times"></i>
      </button>
    `;
    row.querySelector('.legal-para-textarea').value = text || '';
    row.querySelector('.legal-para-remove').addEventListener('click', () => {
      const card = row.closest('.legal-section-editor');
      row.remove();
      updateParaRemoveButtons(card);
    });
    return row;
  }

  /* ── Disable the remove button when a section has only one paragraph left ── */
  function updateParaRemoveButtons(card) {
    const rows = card.querySelectorAll('.legal-para-row');
    rows.forEach((row) => {
      row.querySelector('.legal-para-remove').disabled = rows.length <= 1;
    });
  }

  /* ── Build one section card ── */
  function buildSectionCard(section) {
    const card = document.createElement('div');
    card.className = 'legal-section-editor';
    card.innerHTML = `
      <div class="legal-section-editor-head">
        <div class="legal-section-editor-headline">
          <label class="admin-label">Identificador (ancla #)</label>
          <input type="text" class="admin-input legal-section-id" placeholder="ej: envios" />
        </div>
        <div class="legal-section-editor-headline legal-section-editor-headline--grow">
          <label class="admin-label">Título</label>
          <input type="text" class="admin-input legal-section-title" placeholder="Título de la sección" />
        </div>
        <label class="admin-toggle" title="Destacar con recuadro resaltado">
          <input type="checkbox" class="legal-section-highlight" />
          <span class="admin-toggle-track"></span>
        </label>
        <button type="button" class="legal-section-remove" title="Eliminar sección" aria-label="Eliminar sección">
          <i class="fas fa-trash"></i>
        </button>
      </div>
      <div class="legal-section-editor-body">
        <label class="admin-label">Párrafos</label>
        <div class="legal-paragraphs"></div>
        <button type="button" class="legal-para-add">
          <i class="fas fa-plus me-1"></i>Agregar párrafo
        </button>
      </div>
    `;

    const idInput = card.querySelector('.legal-section-id');
    idInput.value = section.id || '';
    if (section.id) {
      idInput.disabled = true;
      idInput.title = 'El identificador de una sección existente no se puede modificar: es el ancla usada en los links de legales.html';
    }

    card.querySelector('.legal-section-title').value = section.title || '';
    card.querySelector('.legal-section-highlight').checked = !!section.highlight;

    const paraContainer = card.querySelector('.legal-paragraphs');
    const paragraphs = section.paragraphs && section.paragraphs.length ? section.paragraphs : [''];
    paragraphs.forEach((p) => paraContainer.appendChild(buildParagraphRow(p)));
    updateParaRemoveButtons(card);

    card.querySelector('.legal-section-remove').addEventListener('click', () => card.remove());
    card.querySelector('.legal-para-add').addEventListener('click', () => {
      paraContainer.appendChild(buildParagraphRow(''));
      updateParaRemoveButtons(card);
    });

    return card;
  }

  function renderSections(sections) {
    sectionsBox.innerHTML = '';
    sections.forEach((s) => sectionsBox.appendChild(buildSectionCard(s)));
  }

  if (addSectionBtn) {
    addSectionBtn.addEventListener('click', () => {
      const card = buildSectionCard({ id: '', title: '', paragraphs: [''], highlight: false });
      sectionsBox.appendChild(card);
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /* ── Read the form back into a LegalTerms payload, validating as we go ── */
  function collectSections() {
    const cards = Array.from(sectionsBox.querySelectorAll('.legal-section-editor'));
    if (!cards.length) throw new Error('La página legal no puede quedar sin secciones.');

    const sections = cards.map((card) => {
      const id    = card.querySelector('.legal-section-id').value.trim();
      const title = card.querySelector('.legal-section-title').value.trim();
      const highlight = card.querySelector('.legal-section-highlight').checked;
      const paragraphs = Array.from(card.querySelectorAll('.legal-para-textarea'))
        .map((t) => t.value.trim())
        .filter(Boolean);

      if (!id) throw new Error(`La sección "${title || 'sin título'}" necesita un identificador.`);
      if (!/^[a-z0-9-]+$/.test(id)) {
        throw new Error(`El identificador "${id}" sólo admite minúsculas, números y guiones.`);
      }
      if (!title) throw new Error(`La sección "#${id}" necesita un título.`);
      if (!paragraphs.length) throw new Error(`La sección "${title}" necesita al menos un párrafo.`);

      return { id, title, paragraphs, highlight };
    });

    const ids = sections.map((s) => s.id);
    const duplicado = ids.find((id, i) => ids.indexOf(id) !== i);
    if (duplicado) {
      throw new Error(`Hay dos secciones con el identificador "${duplicado}". Tiene que ser único.`);
    }

    return sections;
  }

  /* ── Load terms from API ── */
  async function loadLegal() {
    try {
      const res = await fetch(`${API}/legal/terms`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();

      renderSections(data.sections || []);
      if (updatedInput) updatedInput.value = data.updatedLabel || '';

      loader.style.display = 'none';
      form.style.display   = 'block';
    } catch (err) {
      loader.innerHTML = `<p class="text-danger">Error cargando textos legales: ${err.message}</p>`;
    }
  }

  /* ── Save terms to API ── */
  async function saveLegal() {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Guardando…';

    try {
      const payload = {
        sections: collectSections(),
        updatedLabel: (updatedInput?.value || '').trim(),
      };
      if (!payload.updatedLabel) throw new Error('Indicá la fecha de última actualización.');

      const res = await fetch(`${API}/legal/terms`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = Array.isArray(body?.message) ? body.message.join('\n') : body?.message;
        throw new Error(message || 'HTTP ' + res.status);
      }

      const saved = await res.json();
      renderSections(saved.sections || []);
      if (updatedInput) updatedInput.value = saved.updatedLabel || '';

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
  saveBtn.addEventListener('click', saveLegal);

  /* ── Load when the "Envíos y Legales" tab is activated ── */
  document.addEventListener('adminSectionChange', function (e) {
    if (e.detail?.section === 'envios' && form.style.display === 'none' && loader.style.display !== 'none') {
      loadLegal();
    }
  });

  /* Also check immediately if the section is already visible */
  const sectionEl = document.getElementById('section-envios');
  if (sectionEl && sectionEl.classList.contains('is-visible')) {
    loadLegal();
  }

  /* ── Hook into admin-panel.js tab switch ── */
  /* admin-panel.js uses data-section buttons; we intercept here by watching mutations */
  const observer = new MutationObserver(function () {
    const envioVisible = sectionEl && sectionEl.classList.contains('is-visible');
    const notLoaded     = form.style.display === 'none' && loader.innerHTML.includes('Cargando');
    if (envioVisible && notLoaded) loadLegal();
  });

  if (sectionEl) {
    observer.observe(sectionEl, { attributes: true, attributeFilter: ['class'] });
  }

})();
