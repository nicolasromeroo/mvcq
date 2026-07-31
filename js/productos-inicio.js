const contenedorDeProductos = document.getElementById("productos-genericos");
const API_BASE_URL = "https://web-vd8s1gd9atgj.up-de-fra1-k8s-1.apps.run-on-seenode.com";
const IMAGEN_FALLBACK = "img/aestethic.jpg";

function obtenerListaDeProductos(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.products)) {
    return data.products;
  }

  if (Array.isArray(data?.payload)) {
    return data.payload;
  }

  if (Array.isArray(data?.docs)) {
    return data.docs;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

function resolverImagenProducto(producto) {
  const imagen =
    producto.imageUrl ||
    producto.imagen ||
    producto.image ||
    producto.thumbnail ||
    producto.img;

  if (!imagen) {
    return IMAGEN_FALLBACK;
  }

  // If it's already a full URL, use it directly; otherwise prepend API base
  if (imagen.startsWith("http")) return imagen;
  return `${API_BASE_URL}/${imagen.replace(/^\//, "")}`;
}

function formatearPrecio(precio) {
  const valorNumerico = Number(precio);

  if (Number.isNaN(valorNumerico)) {
    return "Consultar";
  }

  return valorNumerico.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function obtenerNombreProducto(producto) {
  return producto.title || producto.name || "Producto sin nombre";
}

function obtenerCategoriaProducto(producto) {
  return producto.category || producto.categoria || "Nueva temporada";
}

/* Storewide payment perks (matches copy on pages/promociones.html and
   pages/carrito.html) — shown as a compact second line under the price. */
const DESCUENTO_TRANSFERENCIA = 0.1; // 10% OFF, igual que "10% OFF abonando en EFECTIVO"

function formatearPrecioTransferencia(precio) {
  const valorNumerico = Number(precio);
  if (Number.isNaN(valorNumerico)) return null;
  return formatearPrecio(valorNumerico * (1 - DESCUENTO_TRANSFERENCIA));
}

function renderizarProductosDestacados(productos) {
  if (!contenedorDeProductos) {
    return;
  }

  if (!productos.length) {
    contenedorDeProductos.innerHTML = `
			<div class="col-12 text-center text-muted">No hay productos disponibles en este momento.</div>
		`;
    return;
  }

  contenedorDeProductos.innerHTML = productos
    .map((producto, index) => {
      const precioTransferencia = formatearPrecioTransferencia(producto.price);
      return `
    <div class="destacados-col" style="--card-delay:${index * 90}ms">
      <article class="destacados-card h-100">
        <div class="destacados-card-media">
          <span class="destacados-badge">${obtenerCategoriaProducto(producto)}</span>
          <img src="${resolverImagenProducto(producto)}" alt="${obtenerNombreProducto(producto)}">
        </div>
        <div class="destacados-card-body">
          <p class="destacados-eyebrow">Selección destacada</p>
          <h5 class="card-title destacados-card-title">${obtenerNombreProducto(producto)}</h5>
          <div class="destacados-card-footer">
            <div class="destacados-price-block">
              <p class="destacados-price">${formatearPrecio(producto.price)}</p>
              ${precioTransferencia ? `<span class="destacados-price-sub">${precioTransferencia} con transferencia</span>` : ""}
            </div>
            <a href="pages/productos.html" class="destacados-link">Ver producto →</a>
          </div>
        </div>
      </article>
    </div>
  `;
    })
    .join("");
}

async function cargarProductosDestacados() {
  if (!contenedorDeProductos) {
    return;
  }

  try {
    const url = new URL("/product/products", API_BASE_URL);
    url.searchParams.set("limit", "6");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status} al obtener productos`);
    }

    const data = await response.json();
    const productos = obtenerListaDeProductos(data).slice(0, 6);

    renderizarProductosDestacados(productos);
  } catch (error) {
    console.error("No se pudieron cargar los productos destacados:", error);
    contenedorDeProductos.innerHTML = `
			<div class="col-12 text-center text-muted">No se pudieron cargar los productos destacados.</div>
		`;
  }
}

document.addEventListener("DOMContentLoaded", cargarProductosDestacados);
