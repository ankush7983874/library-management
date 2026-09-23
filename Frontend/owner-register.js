const API_BASE = "http://localhost:5000/api";

document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("registerForm");
    const libraryNameInput = document.getElementById("libraryName");
    const ownerNameInput = document.getElementById("ownerName");
    const mobileInput = document.getElementById("mobile");
    const emailInput = document.getElementById("email");
    const sendOtpBtn = document.getElementById("sendOtpBtn");
    const otpContainer = document.getElementById("otpContainer");
    const otpInput = document.getElementById("otpInput");
    const verifyOtpBtn = document.getElementById("verifyOtpBtn");
    const otpStatus = document.getElementById("otpStatus");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const togglePassBtn1 = document.getElementById("togglePassBtn1");
    const togglePassBtn2 = document.getElementById("togglePassBtn2");
    const eyeIcon1 = document.getElementById("eyeIcon1");
    const eyeIcon2 = document.getElementById("eyeIcon2");
    const submitBtn = document.getElementById("submitBtn");
    const btnText = document.getElementById("btnText");
    const alertBox = document.getElementById("alertBox");

    let isOtpVerified = false;

    // Helper: Show Alert
    function showAlert(msg, isSuccess = false) {
        if (!alertBox) return;
        alertBox.textContent = msg;
        alertBox.className = `alert-box ${isSuccess ? 'alert-success' : 'alert-error'}`;
        alertBox.style.display = "block";
        alertBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function clearAlert() {
        if (alertBox) alertBox.style.display = "none";
    }

    // Toggle Password Visibility
    if (togglePassBtn1 && passwordInput && eyeIcon1) {
        togglePassBtn1.addEventListener("click", () => {
            const isPass = passwordInput.type === "password";
            passwordInput.type = isPass ? "text" : "password";
            eyeIcon1.className = isPass ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
        });
    }

    if (togglePassBtn2 && confirmPasswordInput && eyeIcon2) {
        togglePassBtn2.addEventListener("click", () => {
            const isPass = confirmPasswordInput.type === "password";
            confirmPasswordInput.type = isPass ? "text" : "password";
            eyeIcon2.className = isPass ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
        });
    }

    // Enable/Disable Submit Button based on form state
    function validateFormState() {
        const libName = libraryNameInput ? libraryNameInput.value.trim() : "";
        const ownName = ownerNameInput ? ownerNameInput.value.trim() : "";
        const mob = mobileInput ? mobileInput.value.trim() : "";
        const em = emailInput ? emailInput.value.trim() : "";
        const pass = passwordInput ? passwordInput.value : "";
        const confirmPass = confirmPasswordInput ? confirmPasswordInput.value : "";

        const isValid = libName !== "" &&
                        ownName !== "" &&
                        mob.length >= 10 &&
                        em !== "" &&
                        pass !== "" &&
                        confirmPass !== "" &&
                        pass === confirmPass &&
                        isOtpVerified;

        if (submitBtn) {
            submitBtn.disabled = !isValid;
        }
    }

    [libraryNameInput, ownerNameInput, mobileInput, emailInput, passwordInput, confirmPasswordInput].forEach(el => {
        if (el) {
            el.addEventListener("input", validateFormState);
        }
    });

    // Send OTP
    if (sendOtpBtn && emailInput) {
        sendOtpBtn.addEventListener("click", async () => {
            clearAlert();
            const email = emailInput.value.trim();

            if (!email) {
                showAlert("Please enter a valid Email Address first.");
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showAlert("Please enter a valid email format.");
                return;
            }

            sendOtpBtn.disabled = true;
            sendOtpBtn.textContent = "Sending OTP...";

            try {
                const response = await fetch(`${API_BASE}/otp/send`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email,
                        userType: "owner",
                        purpose: "registration"
                    })
                });

                const data = await response.json();

                if (data.success) {
                    showAlert(`OTP sent successfully to ${email}. Please check your inbox.`, true);
                    if (otpContainer) otpContainer.style.display = "block";
                    if (otpStatus) {
                        otpStatus.style.color = "#2b6cb0";
                        otpStatus.textContent = `OTP sent to ${email}`;
                    }
                    startCooldown();
                } else {
                    showAlert(data.message || "Failed to send OTP.");
                    sendOtpBtn.disabled = false;
                    sendOtpBtn.textContent = "Send OTP";
                }
            } catch (error) {
                console.error(error);
                showAlert("Server error while sending OTP. Please try again.");
                sendOtpBtn.disabled = false;
                sendOtpBtn.textContent = "Send OTP";
            }
        });
    }

    function startCooldown() {
        let cooldown = 60;
        sendOtpBtn.disabled = true;
        const interval = setInterval(() => {
            sendOtpBtn.textContent = `Resend OTP (${cooldown}s)`;
            cooldown--;
            if (cooldown < 0) {
                clearInterval(interval);
                sendOtpBtn.disabled = false;
                sendOtpBtn.textContent = "Send OTP";
            }
        }, 1000);
    }

    // Verify OTP
    if (verifyOtpBtn && otpInput && emailInput) {
        verifyOtpBtn.addEventListener("click", async () => {
            clearAlert();
            const email = emailInput.value.trim();
            const otp = otpInput.value.trim();

            if (!email || !otp) {
                showAlert("Please enter both Email and 6-digit OTP.");
                return;
            }

            if (otp.length !== 6) {
                showAlert("OTP must be 6 digits.");
                return;
            }

            verifyOtpBtn.disabled = true;
            verifyOtpBtn.textContent = "Verifying...";

            try {
                const response = await fetch(`${API_BASE}/otp/verify`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email,
                        userType: "owner",
                        purpose: "registration",
                        otp
                    })
                });

                const data = await response.json();

                if (data.success) {
                    isOtpVerified = true;
                    if (otpStatus) {
                        otpStatus.style.color = "#276749";
                        otpStatus.textContent = "✓ Email Verified Successfully!";
                    }
                    showAlert("✓ Email Verified Successfully!", true);
                    emailInput.readOnly = true;
                    otpInput.readOnly = true;
                    verifyOtpBtn.disabled = true;
                    verifyOtpBtn.textContent = "Verified ✓";
                    if (sendOtpBtn) sendOtpBtn.style.display = "none";
                    validateFormState();
                } else {
                    isOtpVerified = false;
                    if (otpStatus) {
                        otpStatus.style.color = "#e53e3e";
                        otpStatus.textContent = "✕ " + (data.message || "Invalid OTP");
                    }
                    showAlert(data.message || "Invalid OTP.");
                    verifyOtpBtn.disabled = false;
                    verifyOtpBtn.textContent = "Verify OTP";
                    validateFormState();
                }
            } catch (error) {
                console.error(error);
                showAlert("Server error while verifying OTP.");
                verifyOtpBtn.disabled = false;
                verifyOtpBtn.textContent = "Verify OTP";
                validateFormState();
            }
        });
    }

    // Submit Registration Form
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearAlert();

            const libraryName = libraryNameInput.value.trim();
            const ownerName = ownerNameInput.value.trim();
            const mobile = mobileInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (!libraryName) {
                showAlert("Library Name is required.");
                return;
            }
            if (!ownerName) {
                showAlert("Owner Name is required.");
                return;
            }
            if (!mobile) {
                showAlert("Mobile Number is required.");
                return;
            }
            if (mobile.length !== 10) {
                showAlert("Mobile Number must be 10 digits.");
                return;
            }
            if (!email) {
                showAlert("Email is required.");
                return;
            }
            if (!isOtpVerified) {
                showAlert("OTP verification is required before creating account.");
                return;
            }
            if (!password) {
                showAlert("Password is required.");
                return;
            }
            if (password !== confirmPassword) {
                showAlert("Passwords do not match.");
                return;
            }

            submitBtn.disabled = true;
            if (btnText) btnText.textContent = "CREATING ACCOUNT...";

            try {
                const response = await fetch(`${API_BASE}/owner/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        libraryName,
                        ownerName,
                        mobile,
                        email,
                        password
                    })
                });

                const data = await response.json();

                if (data.success) {
                    showAlert("Owner Account Created Successfully", true);
                    if (data.token) {
                        localStorage.setItem("ownerToken", data.token);
                    }
                    if (data.owner) {
                        localStorage.setItem("ownerData", JSON.stringify(data.owner));
                    }
                    setTimeout(() => {
                        window.location.href = "owner-login.html";
                    }, 1500);
                } else {
                    showAlert(data.message || "Registration failed.");
                    submitBtn.disabled = false;
                    if (btnText) btnText.textContent = "CREATE ACCOUNT";
                }
            } catch (error) {
                console.error(error);
                showAlert("Server error during registration.");
                submitBtn.disabled = false;
                if (btnText) btnText.textContent = "CREATE ACCOUNT";
            }
        });
    }
});