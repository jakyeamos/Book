const elements = {
  form: document.getElementById("login-form"),
  email: document.getElementById("login-email"),
  password: document.getElementById("login-password"),
  registerButton: document.getElementById("register-button"),
  status: document.getElementById("login-status"),
};

const params = new URLSearchParams(window.location.search);
const nextPath = params.get("next") || "/";

function safeNextPath(path) {
  if (!path.startsWith("/") || path.startsWith("//")) {
    return "/";
  }
  return path;
}

function targetFor(user) {
  const next = safeNextPath(nextPath);
  if (user.role === "admin") {
    return next === "/" ? "/admin" : next;
  }
  return next.startsWith("/admin") ? "/" : next;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || "Request failed");
  }
  return body;
}

async function finishWithSession(body) {
  elements.status.textContent = "Signed in";
  window.location.assign(targetFor(body.user));
}

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  elements.status.textContent = "Signing in...";
  try {
    await finishWithSession(await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: elements.email.value,
        password: elements.password.value,
      }),
    }));
  } catch (error) {
    elements.status.textContent = error.message || "Sign in failed";
  }
});

elements.registerButton.addEventListener("click", async () => {
  elements.status.textContent = "Creating account...";
  try {
    await finishWithSession(await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: elements.email.value,
        password: elements.password.value,
      }),
    }));
  } catch (error) {
    elements.status.textContent = error.message || "Registration failed";
  }
});

api("/api/auth/session")
  .then(finishWithSession)
  .catch(() => {
    elements.status.textContent = "Sign in required";
  });
