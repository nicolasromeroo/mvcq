function isAuthenticated() {
  return localStorage.getItem("isAuthenticated") === "true";
}

function isAdmin() {
  const role = localStorage.getItem("userRole");
  return role != null && role.toLowerCase() === "admin";
}

function getUsername() {
  return localStorage.getItem("username") || "Usuario";
}
function logout() {
  localStorage.removeItem("isAuthenticated");
  localStorage.removeItem("userRole");
  localStorage.removeItem("username");
  localStorage.removeItem("token");
  // Detect if we're in /pages/ or root
  const inPages = window.location.pathname.includes("/pages/");
  window.location.href = inPages ? "../index.html" : "index.html";
}

function updateUI() {
  const authNav = document.getElementById("authNav");
  const userNav = document.getElementById("userNav");
  const adminPanelItem = document.getElementById("adminPanelItem");
  const usernameSpan = document.getElementById("usernameSpan");
  const avatarImg = document.querySelector("#userDropdown img");

  if (isAuthenticated()) {
    const name = getUsername();

    if (authNav) authNav.classList.add("d-none");
    if (userNav) userNav.classList.remove("d-none");
    if (usernameSpan) usernameSpan.textContent = name;

    if (avatarImg) {
      const encodedName = encodeURIComponent(name);
      avatarImg.src =
        "https://ui-avatars.com/api/?name=" +
        encodedName +
        "&background=0D8ABC&color=fff";
      avatarImg.alt = name;
    }

    if (isAdmin() && adminPanelItem) {
      adminPanelItem.classList.remove("d-none");
    }
  } else {
    if (authNav) authNav.classList.remove("d-none");
    if (userNav) userNav.classList.add("d-none");
    if (adminPanelItem) adminPanelItem.classList.add("d-none");
  }
}
document.addEventListener("DOMContentLoaded", updateUI);
