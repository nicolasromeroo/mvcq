/**
 * URL base de la API, elegida según dónde se esté sirviendo el front.
 *
 * Tiene que cargarse ANTES que cualquier otro script propio: el resto de los
 * archivos leen window.MVCQ_API al definir sus constantes.
 *
 * En desarrollo (Five Server en 127.0.0.1:5500, o localhost) pega contra el
 * backend local; desplegado, contra producción. Sin esto había que editar a
 * mano 13 archivos para cambiar de entorno.
 */
(function () {
  var PROD = 'https://web-vd8s1gd9atgj.up-de-fra1-k8s-1.apps.run-on-seenode.com';
  var DEV = 'http://localhost:3000';

  var host = window.location.hostname;
  var esLocal = host === 'localhost' || host === '127.0.0.1' || host === '';

  // Permite forzar el entorno desde la consola sin tocar código:
  //   localStorage.setItem('MVCQ_API_OVERRIDE', 'http://localhost:3000')
  var override = null;
  try {
    override = window.localStorage.getItem('MVCQ_API_OVERRIDE');
  } catch (e) {
    // localStorage bloqueado (modo incógnito estricto): se ignora
  }

  window.MVCQ_API = override || (esLocal ? DEV : PROD);

  if (esLocal) {
    console.info('[MVCQ] API →', window.MVCQ_API);
  }
})();
