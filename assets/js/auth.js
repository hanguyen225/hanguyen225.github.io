// assets/js/auth.js
// Simple client‑side authentication for demo purposes.
// Stores role in localStorage as "role" ("admin" or "user").

const ADMIN_PASSWORD = "admin"; // hard‑coded demo password

export function loginAsAdmin(password) {
  if (password === ADMIN_PASSWORD) {
    localStorage.setItem("role", "admin");
    return true;
  }
  return false;
}

export function loginAsGuest() {
  localStorage.setItem("role", "user");
}

export function logout() {
  localStorage.removeItem("role");
}

export function getRole() {
  return localStorage.getItem("role") || "user"; // default to user
}

export function isAdmin() {
  return getRole() === "admin";
}

// UI helper – called on page load and after login/logout.
export function updateUI() {
  const role = getRole();
  const logoutBtn = document.getElementById("logoutButton");
  const loginModal = document.getElementById("loginModal");
  const adminElements = document.querySelectorAll(".admin-only");

  if (role === "admin") {
    if (logoutBtn) logoutBtn.style.display = "block";
    if (loginModal) loginModal.close();
    adminElements.forEach((el) => (el.style.display = "inline-block"));
  } else {
    if (logoutBtn) logoutBtn.style.display = "none";
    // show login modal if not already open
    if (loginModal && !loginModal.open) loginModal.showModal();
    adminElements.forEach((el) => (el.style.display = "none"));
  }
}
