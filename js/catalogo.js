// document.addEventListener("DOMContentLoaded", () => {
//   // Tetris tile pattern — cycles every 6 cards
//   const TILE_PATTERN = [
//     "tile-large", // 0: 2×2
//     "tile-small", // 1: 1×1
//     "tile-tall", // 2: 1×2
//     "tile-small", // 3: 1×1
//     "tile-wide", // 4: 2×1
//     "tile-small", // 5: 1×1
//   ];

//   // Show admin button only if user is admin
//   if (typeof isAdmin === "function" && isAdmin()) {
//     document.getElementById("btn-new-catalog").classList.remove("d-none");
//   }

//   function toggleCatalogForm() {
//     const formContainer = document.getElementById("catalog-form-container");
//     const isVisible = formContainer.style.display === "block";
//     formContainer.style.display = isVisible ? "none" : "block";
//     if (!isVisible) document.getElementById("catalog-form").reset();
//   }

//   document.getElementById("btn-new-catalog").onclick = toggleCatalogForm;

//   document
//     .getElementById("catalog-form")
//     .addEventListener("submit", async (e) => {
//       e.preventDefault();
//       const form = e.target;
//       const submitBtn = form.querySelector(".btn-form-submit");

//       const body = {
//         title: form.title.value.trim(),
//         imgBanner: form.bannerImage.value.trim(),
//         description: form.description.value.trim(),
//       };

//       submitBtn.disabled = true;
//       submitBtn.innerHTML =
//         '<i class="fas fa-spinner fa-spin me-1"></i> Creando...';

//       const res = await fetch(
//         "https://mevistocomoquiero.onrender.com/api/cards/createCard",
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: "Bearer " + localStorage.getItem("token"),
//           },
//           body: JSON.stringify(body),
//         },
//       );

//       submitBtn.disabled = false;
//       submitBtn.innerHTML = '<i class="fas fa-check me-1"></i> Crear catálogo';

//       if (res.ok) {
//         form.reset();
//         document.getElementById("catalog-form-container").style.display =
//           "none";
//         await loadCatalogCards();
//       } else {
//         const data = await res.json().catch(() => ({}));
//         alert("Error: " + (data.error || "No se pudo crear el catálogo"));
//       }
//     });

//   function buildTileHTML(catalog, index) {
//     const tileClass = TILE_PATTERN[index % TILE_PATTERN.length];
//     const title = escapeHTML(catalog.title);
//     const description = escapeHTML(catalog.description || "");
//     const imgSrc = escapeHTML(catalog.imgBanner || "");
//     const slug = escapeHTML(catalog.slug || "");

//     return `
//             <div class="catalog-tile ${tileClass}">
//                 <img src="${imgSrc}" alt="${title}" loading="lazy" />
//                 <div class="tile-overlay">
//                     <div class="tile-overlay-inner">
//                         <h3>${title}</h3>
//                         <div class="tile-overlay-divider"></div>
//                         ${description ? `<p>${description}</p>` : ""}
//                         <a href="productos.html?slug=${slug}" class="btn-tile">Ver productos</a>
//                     </div>
//                 </div>
//             </div>
//         `;
//   }

//   function escapeHTML(str) {
//     return String(str)
//       .replace(/&/g, "&amp;")
//       .replace(/</g, "&lt;")
//       .replace(/>/g, "&gt;")
//       .replace(/"/g, "&quot;")
//       .replace(/'/g, "&#39;");
//   }

// Datos genéricos de muestra para previsualización
const MOCK_CATALOGS = [
  {
    title: "Verano 2025",
    description: "Colección fresca y colorida para los días de calor.",
    imgBanner: "../img/aestethic.jpg",
    slug: "verano-2025",
  },
  {
    title: "Bluzas & Tops",
    description: "Las últimas tendencias en blusas y tops.",
    imgBanner: "../img/blusa.jpg",
    slug: "bluzas-tops",
  },
  {
    title: "Camperas",
    description: "Abrigos y camperas para el otoño.",
    imgBanner: "../img/campera-jean.jpg",
    slug: "camperas",
  },
  {
    title: "Jeans",
    description: "Modelos exclusivos de jeans para cada silueta.",
    imgBanner: "../img/jeans.jpg",
    slug: "jeans",
  },
  {
    title: "Remeras",
    description: "Básicos y diseños únicos en remeras.",
    imgBanner: "../img/remeras.jpg",
    slug: "remeras",
  },
  {
    title: "Vintage",
    description: "Piezas únicas con estética retro y vintage.",
    imgBanner: "../img/vintage1.jpg",
    slug: "vintage",
  },
  {
    title: "Ropa de Abrigo",
    description: "Colección de invierno para mantenerte abrigada.",
    imgBanner: "../img/abrigoMarron.jpg",
    slug: "ropa-abrigo",
  },
  {
    title: "Aesthetic",
    description: "Estilo aesthetic y tendencia urbana.",
    imgBanner: "../img/aestethic2.jpg",
    slug: "aesthetic",
  },
];

async function loadCatalogCards() {
  const container = document.getElementById("catalog-container");

  container.innerHTML = `
            <div class="catalogo-loading">
                <div class="dot-loader"><span></span><span></span><span></span></div>
            </div>`;

  try {
    const res = await fetch(
      "https://mevistocomoquiero.onrender.com/api/cards/catalogo",
    );
    if (!res.ok) throw new Error("Error al cargar los catálogos");
    const catalogs = await res.json();

    container.innerHTML = "";

    const data = catalogs.length ? catalogs : MOCK_CATALOGS;

    if (!catalogs.length) {
      // Sin datos reales → mostramos mock con etiqueta
      const notice = document.createElement("p");
      notice.style.cssText =
        "grid-column:1/-1;text-align:center;color:#aaa;font-size:.8rem;margin-bottom:-.5rem;";
      notice.textContent = "Vista previa — Sin catálogos reales aún";
      container.appendChild(notice);
    }

    data.forEach((catalog, index) => {
      container.insertAdjacentHTML("beforeend", buildTileHTML(catalog, index));
    });
  } catch (err) {
    //   // API no disponible → mostrar datos de muestra
    //   container.innerHTML = "";
    //   const notice = document.createElement("p");
    //   notice.style.cssText =
    //     "grid-column:1/-1;text-align:center;color:#aaa;font-size:.8rem;margin-bottom:-.5rem;";
    //   notice.textContent = "Vista previa — Sin conexión al servidor";
    //   container.appendChild(notice);
    //   MOCK_CATALOGS.forEach((catalog, index) => {
    //     container.insertAdjacentHTML(
    //       "beforeend",
    //       buildTileHTML(catalog, index),
    //     );
    //   });
  }
}

loadCatalogCards();
