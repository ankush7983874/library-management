// =========================================
// BarnalaByte Neumorphic Login Module
// owner-login.js
// =========================================

const API_BASE = "http://localhost:5000/api";

let currentRole = "owner"; // Default role for owner-login.html

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const togglePasswordBtn = document.getElementById("togglePasswordBtn");
    const eyeIcon = document.getElementById("eyeIcon");
    const rememberMeCheck = document.getElementById("rememberMe");
    const errorAlert = document.getElementById("errorAlert");
    const loginSubmitBtn = document.getElementById("loginSubmitBtn");
    const btnText = document.getElementById("btnText");
    const signupPlusBtn = document.getElementById("signupPlusBtn");

    const roleStudentBtn = document.getElementById("roleStudentBtn");
    const roleOwnerBtn = document.getElementById("roleOwnerBtn");

    // =========================================
    // Remember Me Auto-fill
    // =========================================
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberMeCheck.checked = true;
    }

    // =========================================
    // Password Visibility Toggle
    // =========================================
    if (togglePasswordBtn && passwordInput && eyeIcon) {
        togglePasswordBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const isPassword = passwordInput.getAttribute("type") === "password";
            passwordInput.setAttribute("type", isPassword ? "text" : "password");
            eyeIcon.className = isPassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
        });
    }

    // =========================================
    // Role Switching (Student / Owner)
    // =========================================
    function setRole(role) {
        currentRole = role;
        hideError();

        if (role === "student") {
            roleStudentBtn.classList.add("active");
            roleOwnerBtn.classList.remove("active");
            signupPlusBtn.href = "student-register.html";
        } else {
            roleOwnerBtn.classList.add("active");
            roleStudentBtn.classList.remove("active");
            signupPlusBtn.href = "owner-register.html";
        }
    }

    if (roleStudentBtn) {
        roleStudentBtn.addEventListener("click", () => setRole("student"));
    }
    if (roleOwnerBtn) {
        roleOwnerBtn.addEventListener("click", () => setRole("owner"));
    }

    // Default init role
    setRole(currentRole);

    // =========================================
    // Helper: Show & Hide Error
    // =========================================
    function showError(message) {
        errorAlert.innerText = message;
        errorAlert.style.display = "block";
    }

    function hideError() {
        errorAlert.innerText = "";
        errorAlert.style.display = "none";
    }

    // =========================================
    // Form Submit & Login Handling
    // =========================================
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            hideError();

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) {
                showError("Please enter both Email and Password.");
                return;
            }

            // Loading UI State
            loginSubmitBtn.disabled = true;
            btnText.innerText = "Signing in...";

            const endpoint = currentRole === "student"
                ? `${API_BASE}/student/login`
                : `${API_BASE}/owner/login`;

            try {
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (data.success) {
                    // Handle Remember Me
                    if (rememberMeCheck.checked) {
                        localStorage.setItem("rememberedEmail", email);
                    } else {
                        localStorage.removeItem("rememberedEmail");
                    }

                    if (currentRole === "student") {
                        localStorage.setItem("studentToken", data.token);
                        localStorage.setItem("studentData", JSON.stringify(data.student));
                        window.location.href = "student-dashboard.html";
                    } else {
                        localStorage.setItem("ownerToken", data.token);
                        localStorage.setItem("ownerData", JSON.stringify(data.owner));
                        window.location.href = "owner-dashboard.html";
                    }
                } else {
                    showError(data.message || "Invalid email or password.");
                    loginSubmitBtn.disabled = false;
                    btnText.innerText = "LOGIN";
                }

            } catch (error) {
                console.error("Login Fetch Error:", error);
                showError("Server unavailable. Please check your network or backend server.");
                loginSubmitBtn.disabled = false;
                btnText.innerText = "LOGIN";
            }
        });
    }
});
