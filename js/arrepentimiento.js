/* =====================================================
   arrepentimiento.js — Me Visto Como Quiero
   Botón de arrepentimiento (Ley 24.240, art. 34)

   El endpoint es público a propósito: la Resolución 424/2020 exige que el
   consumidor pueda ejercer el derecho sin registrarse ni iniciar sesión.
   ===================================================== */

const ARREP_API = 'https://web-vd8s1gd9atgj.up-de-fra1-k8s-1.apps.run-on-seenode.com';

function arrepShowMsg(text, kind = 'error') {
  const el = document.getElementById('arrepMsg');
  if (!el) return;
  el.textContent = text;
  el.className = `legal-form-msg legal-form-msg--${kind}`;
  el.style.display = '';
}

function arrepSetLoading(isLoading) {
  const btn = document.getElementById('arrepSubmit');
  if (!btn) return;
  btn.disabled = isLoading;
  btn.querySelector('.arrep-label').style.display = isLoading ? 'none' : '';
  btn.querySelector('.arrep-spinner').style.display = isLoading ? '' : 'none';
}

/** Valida en el navegador sólo para dar feedback rápido; el backend revalida. */
function arrepValidate(form) {
  const required = ['declaredOrderNumber', 'fullName', 'email'];
  let firstBad = null;

  required.forEach((name) => {
    const input = form.elements[name];
    const ok = String(input.value || '').trim().length > 0;
    input.classList.toggle('is-invalid', !ok);
    if (!ok && !firstBad) firstBad = input;
  });

  const email = form.elements.email;
  if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    email.classList.add('is-invalid');
    if (!firstBad) firstBad = email;
  }

  if (firstBad) {
    firstBad.focus();
    arrepShowMsg('Revisá los campos marcados.');
    return null;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  Object.keys(data).forEach((k) => { data[k] = String(data[k] ?? '').trim(); });
  // Los opcionales vacíos no se mandan: el DTO los espera ausentes, no en "".
  ['phone', 'reason'].forEach((k) => { if (!data[k]) delete data[k]; });
  return data;
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('arrepForm');
  if (!form) return;

  form.querySelectorAll('input, textarea').forEach((el) => {
    el.addEventListener('input', () => el.classList.remove('is-invalid'));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = arrepValidate(form);
    if (!data) return;

    arrepSetLoading(true);
    try {
      const res = await fetch(`${ARREP_API}/legal/arrepentimiento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json();

      if (!res.ok) {
        const msg = Array.isArray(body?.message) ? body.message[0] : body?.message;
        arrepShowMsg(msg || 'No pudimos registrar tu solicitud. Intentá de nuevo.');
        return;
      }

      // Reemplaza el formulario por el acuse de recibo.
      form.style.display = 'none';
      document.getElementById('arrepMsg').style.display = 'none';
      document.getElementById('arrepSuccessMsg').textContent = body.message;
      document.getElementById('arrepSuccessId').textContent = body.id;
      document.getElementById('arrepSuccess').style.display = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('[arrepentimiento]', err);
      arrepShowMsg(
        'No pudimos conectar con el servidor. Escribinos desde Contactanos y lo resolvemos igual.'
      );
    } finally {
      arrepSetLoading(false);
    }
  });
});
