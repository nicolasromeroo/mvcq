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

- hace falta agregar un campo COLOR para el filtro de los productos: en el panel de administrador me deberia pedir el color del articulo, y en el front deberia poder filtrar por diferentes colores (ya esta el filtro, falta el campo en el front y back)

<============================>

- pagina de carrito
- pagina de mi perfil (admin - user)

- Agregar productos opcionalmente con Drag & drop (ordenar outfit)
- REFACTORIZAR HOJA DE ESTILOS (empezando por index.css) - ACOMODAR ARCHIVOS, CARPETAS,
