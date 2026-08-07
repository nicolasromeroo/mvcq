/* ═══════════════════════════════════════════════════════
   LEGALES — Me Visto Como Quiero
   Carga los textos legales desde /legal/terms y reconstruye
   el índice y las secciones de la página.
   Si la carga falla, se deja el contenido estático ya presente
   en el HTML (misma copia por defecto que usa el backend).
   ═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const API = 'https://web-vd8s1gd9atgj.up-de-fra1-k8s-1.apps.run-on-seenode.com';

  const tocList          = document.getElementById('legalToc');
  const sectionsContainer = document.getElementById('legalSections');
  const updatedEl        = document.getElementById('legalUpdated');

  if (!sectionsContainer) return; // no estamos en legales.html

  function buildToc(sections) {
    if (!tocList) return;
    tocList.innerHTML = '';
    sections.forEach((s) => {
      const li = document.createElement('li');
      const a  = document.createElement('a');
      a.href = '#' + s.id;
      a.textContent = s.title;
      li.appendChild(a);
      tocList.appendChild(li);
    });
  }

  /* Botones fijos que no forman parte del texto legal editable, pero que
     acompañan a ciertas secciones puntuales del home legal. */
  function appendSectionExtras(el, id) {
    if (id === 'arrepentimiento') {
      const a = document.createElement('a');
      a.className = 'legal-btn';
      a.href = 'arrepentimiento.html';
      const icon = document.createElement('i');
      icon.className = 'fas fa-rotate-left';
      a.appendChild(icon);
      a.appendChild(document.createTextNode(' Ir al botón de arrepentimiento'));
      el.appendChild(a);
    }

    if (id === 'reclamos') {
      const wrap = document.createElement('div');
      wrap.className = 'legal-actions';

      const contact = document.createElement('a');
      contact.className = 'legal-btn';
      contact.href = 'contactanos.html';
      const contactIcon = document.createElement('i');
      contactIcon.className = 'fas fa-envelope';
      contact.appendChild(contactIcon);
      contact.appendChild(document.createTextNode(' Contactanos'));

      const defensa = document.createElement('a');
      defensa.className = 'legal-btn legal-btn--ghost';
      defensa.href = 'https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario';
      defensa.target = '_blank';
      defensa.rel = 'noopener noreferrer';
      const defensaIcon = document.createElement('i');
      defensaIcon.className = 'fas fa-scale-balanced';
      defensa.appendChild(defensaIcon);
      defensa.appendChild(document.createTextNode(' Defensa del Consumidor'));

      wrap.appendChild(contact);
      wrap.appendChild(defensa);
      el.appendChild(wrap);
    }
  }

  function buildSection(section) {
    const el = document.createElement('section');
    el.className = 'legal-section' + (section.highlight ? ' legal-section--highlight' : '');
    el.id = section.id;

    const h2 = document.createElement('h2');
    h2.textContent = section.title;
    el.appendChild(h2);

    // Texto plano cargado por el comerciante desde el panel: siempre
    // textContent, nunca innerHTML, para no correr riesgo de XSS almacenado.
    (section.paragraphs || []).forEach((text) => {
      const p = document.createElement('p');
      p.textContent = text;
      el.appendChild(p);
    });

    appendSectionExtras(el, section.id);
    return el;
  }

  function renderLegalTerms(data) {
    const sections = Array.isArray(data.sections) ? data.sections : [];
    if (!sections.length) return; // sin datos: se deja el contenido estático

    buildToc(sections);

    sectionsContainer.innerHTML = '';
    sections.forEach((s) => sectionsContainer.appendChild(buildSection(s)));

    if (updatedEl && data.updatedLabel) {
      updatedEl.textContent = 'Última actualización: ' + data.updatedLabel;
    }
  }

  async function loadLegalTerms() {
    try {
      const res = await fetch(`${API}/legal/terms`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      renderLegalTerms(data);
    } catch (err) {
      console.warn('No se pudieron cargar los textos legales desde la API, se muestra el contenido por defecto.', err);
    }
  }

  loadLegalTerms();
})();
