Web responsive de tienda de ropa "Me visto como quiero"
Contiene: 5 archivos html, flex en todos, y adaptado a responsive con Grid System y media queries.
Utilicé Bootstrap para grid, navbar, y carousel.
Los HTML responsive son los de "index.html" y "productos.html"
Activé GitHub Pages para los desplazamientos.
En un principipio se desarrolló con CSS 'Vanilla', luego se pasó la hoja de estilos a SASS, utilizando nesting, mixin y extend para los links, bucles con FOR en la sección de catálogo, EACH para cambiar el color de algunas secciones como el footer. También agregué animaciones de keyframes para los botones de oferta.
La web es 100% responsive y con contenido real.
Tambien se tuvo en cuenta el SEO de la página.

<===============================>

<!-- PARA QUE SEA FUNCIONAL EL EFECTO DE 2 IMAGENES AL CREAR PRODUCTO:

El front busca esa segunda imagen en varios campos posibles del backend — como se ve en productos.js:57: imagenHover, hoverImage, secondaryImage, modelImage, imagenModelo, o el segundo elemento de un array images/gallery/imagenes.

Lo que pasa hoy (fallback):

Como tu backend probablemente no tiene todavía ese segundo campo de imagen, el código usa imágenes genéricas de lookbook (LOOKBOOK_FALLBACKS en productos.js:6) como respaldo. Funciona visualmente, pero no muestra el producto real en hover.

¿Qué necesitarías cambiar en el backend (NestJS)?

Para hacerlo bien, en tu entidad/modelo de producto agregarías un campo extra, por ejemplo:

Y en el panel de admin, un segundo input de tipo file para que el admin suba ambas fotos. El front ya está preparado para detectarlo automáticamente — apenas el API devuelva ese campo, el fallback genérico deja de usarse.

En resumen: Sí, dos imágenes por producto es el flujo correcto para tiendas premium. La imagen principal vende el producto, la imagen hover vende el estilo/look. -->

<=============================>

<!-- PRIMER ADMIN:

OPCIÓN Seeder / Script inicial

En NestJS hacés algo así:

✔️ Crear un script de seed

Cuando levantás la app por primera vez:

// pseudo ejemplo
await prisma.user.create({
data: {
email: "admin@tienda.com",
password: hash("admin123"),
role: "ADMIN"
}
});

👉 Esto corre UNA vez (o si no existe el usuario)

✔️ Alternativa más segura

Usar variables de entorno:

ADMIN_EMAIL=admin@cliente.com
ADMIN_PASSWORD=superseguro123

Y en el bootstrap:

if (!adminExists) {
createAdminFromEnv();
} -->

<========================>

<!-- ¿Cómo el cliente crea más admins?

Buena práctica:

Crear un panel de administración con gestión de usuarios

Funcionalidad mínima:

Crear usuario
Asignar rol (ADMIN / USER)
Editar usuario
Desactivar usuario

👉 Esto lo hacés en React + endpoints en NestJS:

Ejemplo:

POST /admin/users
PATCH /admin/users/:id/role

Protegido con:

JWT
Guard de roles (ADMIN) -->

<============================>

- RESEND (2da pc) -> 
1) acuse de recibo automático. (La resolución exige responder dentro de las 24 horas hábiles.) - legal.service.ts.
2) confirmación de compra y 
3) el aviso de despacho.

- Tarifas propias por zona

- las políticas que decide el comercio las puse con valores inventados: "30 días para cambios por talle, que aceptan cambios sujeto a stock, la política de datos" -> ajustá con el comerciante lo que no coincida con cómo trabaja. 

- pie dice "Última actualización: julio de 2026".

- Stripe está en modo test (si un cliente elige esa opción, no se le cobra) 

- rotar la contraseña de la base.

=============================>

1. Motor de Control de Stock Concurrente (Anti-Overselling)En eventos de alto tráfico (CyberMonday, Black Friday, flash sales), miles de usuarios intentan comprar el mismo ítem al mismo tiempo.Reserva temporal de stock (Locks): Manejo de reservas por tiempo limitado (ej. 10-15 min) en memoria rápida (Redis) con transacciones atómicas antes de confirmar el pago.Idempotencia en pagos y órdenes: Prevenir cobros duplicados mediante idempotencia basada en tokens/claves únicas enviadas al gateway.Control de concurrencia optimista/pesimista: Manejo a nivel de base de datos para evitar diferencias de inventario (race conditions).  

2. Motor de Búsqueda Semántica e Híbrida (Search & Discovery)Las búsquedas por coincidencia exacta de texto (SQL ILIKE o LIKE) ya no alcanzan.Búsqueda Vectorial e Híbrida: Integración de motores de búsqueda (Elasticsearch, OpenSearch o Meilisearch) combinando términos con embeddings vectoriales. Permite buscar por intención (ej: "ropa formal para evento al aire libre").Sugerencias e Indexación en Tiempo Real: Re-indexación asíncrona (vía event-driven con colas como RabbitMQ o Kafka) cuando el catálogo o stock cambia.

3. Motor de Reglas de Descuentos y Precios Dinámicos (Rules Engine)Crear un sistema flexible para que el equipo de marketing configure ofertas complejas sin tocar código:Motor de condiciones: Reglas del tipo Si (Monto > $X) Y (Categoría = Y) Y (MetodoPago = Z) -> Aplicar Descuento / Regalo.  Cupones dinámicos de un solo uso: Generación masiva y validación atómica con límites de uso por usuario/IP.Precios dinámicos/B2B: Precios segmentados por tipo de cliente (minorista vs. mayorista), volumen de compra o regiones geográficas.

4. Gestión Logística Multi-Depósito y Devoluciones (OMS & RMA)El procesamiento posterior a la compra suele ser el cuello de botella operacional.Multi-Warehouse Routing: Algoritmo que determina automáticamente desde qué depósito/sucursal despachar cada ítem del pedido para optimizar costos de envío y tiempos.Sistema RMA (Return Merchandise Authorization): Flujo backend para gestionar cambios, devoluciones, reingreso de stock e integración con la pasarela para refunds parciales o créditos en tienda.Webhooks de Tracking: Integración bidireccional con las APIs de las empresas de correo (tracking en tiempo real y cambio de estado vía eventos).

5. Event-Driven Automation (Retención y Marketing Integrado)Casi toda la retención depende de la capacidad del backend para reaccionar a eventos del cliente:Recuperación de carritos abandonados: Eventos programados (vía colas de tareas como BullMQ/Redis) que disparan avisos por WhatsApp/Email a las $X$ horas de inactividad.Webhooks/Integraciones salientes: Un subsistema de webhooks confiable (con reintentos y exponential backoff) para sincronizar eventos de ventas en tiempo real con ERPs, CRMs (HubSpot/Salesforce) o software contable.

6. Suscripciones y Pagos RecurrentesEl modelo de membresías/compras periódicas incrementa el LTV (Lifetime Value) del cliente.Motor de cobro recurrente: Lógica para gestionar ciclos de facturación, fallos de cobro (dunning process), reintentos automáticos y pausado/cancelación de suscripciones.

7. Métricas Backend, Telemetría y Análisis Anti-FraudeRisk Scoring & Anti-Fraude: Validación preventiva de transacciones analizando velocidad de compra (múltiples tarjetas desde la misma IP), discrepancia entre dirección de facturación y envío, o volúmenes anómalos.Clickstream Analytics Pipeline: Captura y agregación de eventos de navegación/interacción del usuario para medir el conversion funnel directamente en la infraestructura propia sin depender al 100% de scripts de terceros.Resumen de Stack Recomendado para estas característicasNecesidadHerramientas / Enfoques ComunesColas / Tareas asíncronasBullMQ, RabbitMQ, Apache KafkaBúsqueda avanzadaElasticsearch, Meilisearch, PGVectorCaché / Lock concurrenteRedis / RedlockArquitecturaEvent-Driven Architecture (EDA) / Microservicios orientados a dominio (OMS, Catalog, Promo Engine)