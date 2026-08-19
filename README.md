# Me Visto Como Quiero

Plataforma de e-commerce de indumentaria construida de cero: tienda pública,
panel de administración, pasarelas de pago, gestión de inventario y un módulo
de logística interna para depósito y sucursales.

No es un CRUD con carrito encima. El sistema modela el ciclo comercial completo
—reserva de stock, cobro, despacho, cancelación y reintegro— con las garantías
que ese ciclo necesita para no descuadrarse cuando dos personas compran la
última unidad al mismo tiempo o cuando la pasarela de pago avisa dos veces.

## Stack

**Backend** — NestJS · TypeScript · Prisma ORM · PostgreSQL
**Auth** — JWT vía Passport, bcrypt, guards por rol
**Pagos** — Stripe SDK · Mercado Pago SDK · webhooks con verificación HMAC
**Media** — Cloudinary
**Frontend** — HTML/CSS/JavaScript vanilla · Bootstrap · design system propio en CSS custom properties

El frontend es deliberadamente sin framework: consume la API por `fetch` y
mantiene el estado en `localStorage`. Es una decisión de alcance, no una
limitación técnica.

---

## Arquitectura

```
mvcq-server/                       API REST (NestJS)
├── auth/            JWT, registro, login, guards por rol
├── users/           cuentas y perfiles
├── product/         catálogo, variantes, imágenes (Cloudinary)
├── catalog/         lectura pública del catálogo
├── cart/            carrito persistente por usuario
├── collections/     "Mi Colección" — outfits sobre maniquí
├── order/           ciclo de vida del pedido y control de stock
├── checkout/        orquestación de compra
├── shipping/        cotización por código postal, zonas configurables
├── stripe/          creación de sesiones de pago
├── mercadopago/     preferencias de pago
├── webhooks/        recepción y verificación de avisos de pago
├── stock/           control de inventario y devoluciones
├── logistics/       depósito central, remitos, bultos, recepción
├── branches/        sucursales
├── proveedores/     proveedores y remitos de entrada
├── legal/           términos, botón de arrepentimiento (Res. 424/2020)
├── site-config/     configuración visual de la tienda
└── schedule/        turnos del personal

mvcq/                              tienda + panel (estático)
├── pages/           15 páginas
├── js/              lógica por página
└── css/             design system + hojas por vista
```

El módulo de logística usa una arquitectura por capas completa
(`controllers/` · `services/` · `repositories/` · `dto/` · `entities/`) con los
servicios agrupados por subdominio: depósito central, recepción y
transacciones entre sucursales.

---

## Dominios funcionales

### Tienda

Catálogo con filtros, variantes (talle/color), favoritos, carrito persistente y
una sección de **colecciones tipo outfit**: el usuario arma conjuntos sobre un
maniquí configurable y puede hacerlos públicos.

### Compra y pago

Checkout con dos pasarelas. El costo de envío se cotiza en el navegador para
mostrarlo, y se **recalcula en el backend** al crear la orden: nunca se cobra un
número que haya viajado desde el cliente.

Los webhooks de ambas pasarelas verifican la firma criptográfica antes de tocar
nada. El de Mercado Pago además valida el timestamp para rechazar avisos
reenviados fuera de ventana.

### Inventario

El stock se reserva al crear la orden y se libera automáticamente si el pago no
se concreta. Un único punto del sistema mueve inventario, y lo hace de forma
idempotente.

### Logística

Depósito central con remitos y bultos, recepción de mercadería con conteo por
ítem, stock por sucursal y transacciones entre sucursales.

### Operación autogestionada

El comerciante edita desde el panel, sin depender de un programador:

- Tarifas de envío por zona, rangos de código postal, umbral de envío gratis
- Textos legales completos de la página de términos y condiciones
- Contenido visual de la home (hero, banners, secciones)

### Cumplimiento normativo

- **Res. 424/2020** — botón de arrepentimiento, accesible sin registro ni login
  (la normativa lo exige) con acuse de recibo dentro de las 24 hs
- **Ley 24.240 art. 34** — derecho de revocación a 10 días
- **Ley 25.326** — tratamiento de datos personales

---

## Decisiones técnicas

Lo que sigue es lo que diferencia este sistema de un CRUD con carrito.

### Snapshots: el historial no se reescribe

`OrderItem` guarda `titleSnapshot` y `priceSnapshot`; `ShippingAddress` guarda
la `zone` con la que se cotizó. Cambiar el precio de un producto o las tarifas
de envío **no altera los pedidos ya hechos**.

Sin esto, subir un precio reescribe retroactivamente la facturación histórica.

### Reserva de stock con compare-and-swap

Dos clientes compran la última unidad en el mismo segundo. La secuencia
intuitiva —leer stock, validar, descontar— falla: ambos leen el mismo valor,
ambos pasan la validación, ambos descuentan. Una transacción no lo evita, porque
en `READ COMMITTED` nada impide que dos transacciones lean lo mismo.

La solución colapsa la comparación y la escritura en una sola operación atómica:

```ts
const updated = await tx.product.updateMany({
  where: { id, stock: { gte: quantity } },   // compare
  data:  { stock: { decrement: quantity } }, // swap
});
if (updated.count === 0) throw new BadRequestException('Stock insuficiente');
```

`count` es cómo el sistema se entera de si ganó la carrera.

### Idempotencia sobre los webhooks de pago

Las pasarelas notifican *at least once*: el mismo pago llega dos o tres veces.
Un flag `stockConsumed` registra si la mercadería está fuera del inventario,
separado del `status` —que un administrador puede editar a mano desde el panel—.

`syncStockWithStatus()` es el único punto del sistema que mueve inventario por
una orden. No "descuenta" ni "devuelve": recibe un status destino y **reconcilia**
la diferencia entre lo que debería ser cierto y lo que es cierto. Llamarlo diez
veces produce un solo movimiento.

Esto también cubre un caso que el `status` por sí solo no distingue: cancelar
una orden marcada "pagada" manualmente, que nunca descontó nada, no debe
inventar unidades.

### Expiración de reservas fuera de memoria

Una reserva que nunca se paga tiene que liberarse. Resolverlo con un `setTimeout`
al crear la orden es tentador y está mal: el timer vive en la memoria del
proceso y desaparece en cada deploy, dejando stock retenido para siempre.

El sistema usa un barrido periódico que consulta la base. El estado es durable,
sobrevive reinicios y funciona con más de una instancia. La liberación aplica el
mismo compare-and-swap sobre el status, para no cancelar una orden cuyo pago se
acreditó entre que el barrido la eligió y el momento de liberarla.

### Configuración como dato, no como código

Las tarifas de envío y los textos legales viven en una tabla clave→JSON y se
editan desde el panel. Antes eran constantes en el código: cambiar el costo a
Patagonia requería un deploy.

El motor que las interpreta sigue siendo código; los valores no.

### El backend no confía en el cliente

Precios, costos de envío y totales se recalculan siempre en el servidor. Lo que
manda el navegador se usa para mostrar, nunca para cobrar.

### Dinero en `Decimal` de punta a punta

Las columnas monetarias son `@db.Decimal(10,2)`, pero degradar ese valor a
`Number` para sumarlo reintroduce el problema que la columna existe para
evitar: acumular varios ítems en punto flotante puede desviar el subtotal
justo antes de compararlo contra el umbral de envío gratis, y el cliente ve
"envío gratis" en el carrito y un cargo en la orden.

El cálculo de una orden usa aritmética de `Prisma.Decimal` de punta a punta
—`unitPrice.mul(quantity)`, `itemsSubtotal.add(shippingCost)`— y sólo cruza a
`number` en la frontera con `ShippingService.quote()`, que trabaja con montos
de configuración, no con el total a cobrar.

### Ningún registro público puede autoasignarse un rol

`POST /auth/register` no acepta `role` en el DTO: no hay dónde ponerlo, y el
`ValidationPipe` global (`whitelist` + `forbidNonWhitelisted`) rechaza con 400
cualquier request que igual lo intente, en vez de ignorarlo en silencio.
Crear una cuenta con un rol distinto de `USER` es exclusivo de
`POST /users/create`, protegido por `@Roles(['ADMIN'])`.

El mismo mecanismo cierra un segundo hueco: los endpoints de edición de
usuario tenían un `data: any` que iba directo al ORM. Un `PUT` con
`{ password: "..." }` guardaba esa contraseña en texto plano, pisando el hash
real. `UpdateUserDto` no declara ese campo — cambiar contraseñas es sólo
responsabilidad de `changePassword()`, que sí hashea y exige la actual.

### Costura para integrar un correo

`quote()` tiene una interfaz estable (`{ cost, zone, etaBusinessDays, freeShipping, baseCost }`).
Migrar de tarifas manuales a cotización automática de Correo Argentino, Andreani
u OCA es reemplazar el cuerpo de un método: ningún otro módulo se entera.

---

El frontend es estático: se sirve desde cualquier servidor de archivos apuntando
la constante `API` de `mvcq/js/` al backend.

============================================

<!-- integración con Cloudinary: -->

uploadFile en product.service.ts:

Sin variables → sigue usando el disco local (para desarrollo)
