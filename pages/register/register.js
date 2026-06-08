document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("registerForm");
  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");
  const errorAlert = document.getElementById("registerError");
  const successAlert = document.getElementById("registerSuccess");

  function validatePassword() {
    if (password.value !== confirmPassword.value) {
      confirmPassword.setCustomValidity("Las contraseñas no coinciden");
      return false;
    } else {
      confirmPassword.setCustomValidity("");
      return true;
    }
  }

  document.querySelectorAll(".toggle-password").forEach((button) => {
    button.addEventListener("click", function () {
      const passwordInput = this.previousElementSibling;
      const type =
        passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);
      this.querySelector("i").classList.toggle("fa-eye");
      this.querySelector("i").classList.toggle("fa-eye-slash");
    });
  });

  password.onchange = validatePassword;
  confirmPassword.onkeyup = validatePassword;

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!form.checkValidity() || !validatePassword()) {
      event.stopPropagation();
      form.classList.add("was-validated");
      return;
    }

    const userData = {
      username: document.getElementById("username").value,
      email: document.getElementById("email").value,
      password: password.value,
    };

    try {
      const response = await fetch("https://web-vd8s1gd9atgj.up-de-fra1-k8s-1.apps.run-on-seenode.com/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const responseText = await response.text();
      console.log("Respuesta del servidor:", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Error al parsear la respuesta como JSON:", e);
        throw new Error("La respuesta del servidor no es un JSON válido");
      }

      if (!response.ok) {
        throw new Error(
          data.message || `Error en el registro (${response.status})`,
        );
      }

      errorAlert.classList.add("d-none");
      successAlert.classList.remove("d-none");

      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = "Registro exitoso";

      setTimeout(() => {
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem(
          "username",
          data.username || data.user?.username || userData.username,
        );

        const token =
          data.token ||
          data.access_token ||
          data.accessToken ||
          data.jwt ||
          data.user?.token ||
          data.user?.access_token ||
          "";
        if (token) {
          localStorage.setItem("token", token);
        }

        const role = (
          data.role ||
          data.userRole ||
          data.rol ||
          data.user?.role ||
          data.user?.userRole ||
          data.user?.rol ||
          "user"
        ).toLowerCase();
        localStorage.setItem("userRole", role);

        window.location.href = "../index.html";
      }, 2000);
    } catch (error) {
      console.error("Error en el registro:", error);
      errorAlert.textContent =
        error.message ||
        "Ha ocurrido un error al registrar la cuenta. Por favor, inténtalo de nuevo.";
      errorAlert.classList.remove("d-none");
      errorAlert.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  ["username", "email", "password", "confirmPassword"].forEach((field) => {
    document.getElementById(field)?.addEventListener("input", () => {
      if (!errorAlert.classList.contains("d-none")) {
        errorAlert.classList.add("d-none");
      }
    });
  });
});
