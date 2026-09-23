// =========================================
// BarnalaByte Neumorphic Registration Module
// student-register.js
// =========================================

const API_BASE = "http://localhost:5000/api";

let isOtpVerified = false;
let isFaceVerified = false;
let videoStream = null;
let capturedFaceData = null;

document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("registerForm");
    const emailInput = document.getElementById("email");
    const sendOtpBtn = document.getElementById("sendOtpBtn");
    const otpContainer = document.getElementById("otpContainer");
    const otpInput = document.getElementById("otpInput");
    const verifyOtpBtn = document.getElementById("verifyOtpBtn");
    const otpStatus = document.getElementById("otpStatus");
    const alertBox = document.getElementById("alertBox");
    const submitBtn = document.getElementById("submitBtn");
    const btnText = document.getElementById("btnText");

    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const togglePassBtn1 = document.getElementById("togglePassBtn1");
    const togglePassBtn2 = document.getElementById("togglePassBtn2");
    const eyeIcon1 = document.getElementById("eyeIcon1");
    const eyeIcon2 = document.getElementById("eyeIcon2");

    const photoInput = document.getElementById("photo");
    const photoPreview = document.getElementById("photoPreview");
    const fileNameDisplay = document.getElementById("fileNameDisplay");

    const faceConsentCheck = document.getElementById("faceConsentCheck");
    const startCamBtn = document.getElementById("startCamBtn");
    const verifyFaceBtn = document.getElementById("verifyFaceBtn");
    const webcamVideo = document.getElementById("webcamVideo");
    const faceCanvas = document.getElementById("faceCanvas");
    const cameraPlaceholder = document.getElementById("cameraPlaceholder");
    const faceScanMsg = document.getElementById("faceScanMsg");

    // =========================================
    // Alert Box Helper
    // =========================================
    function showAlert(message, isSuccess = false) {
        alertBox.innerText = message;
        alertBox.className = "alert-box " + (isSuccess ? "alert-success" : "alert-error");
        alertBox.style.display = "block";
        alertBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function hideAlert() {
        alertBox.innerText = "";
        alertBox.style.display = "none";
    }

    // =========================================
    // Password Toggle Listeners
    // =========================================
    if (togglePassBtn1 && passwordInput && eyeIcon1) {
        togglePassBtn1.addEventListener("click", () => {
            const isPass = passwordInput.getAttribute("type") === "password";
            passwordInput.setAttribute("type", isPass ? "text" : "password");
            eyeIcon1.className = isPass ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
        });
    }

    if (togglePassBtn2 && confirmPasswordInput && eyeIcon2) {
        togglePassBtn2.addEventListener("click", () => {
            const isPass = confirmPasswordInput.getAttribute("type") === "password";
            confirmPasswordInput.setAttribute("type", isPass ? "text" : "password");
            eyeIcon2.className = isPass ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
        });
    }

    // =========================================
    // Photo Upload & Preview
    // =========================================
    if (photoInput) {
        photoInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    showAlert("File size should not exceed 5MB.");
                    photoInput.value = "";
                    return;
                }
                fileNameDisplay.innerText = file.name;
                const reader = new FileReader();
                reader.onload = (event) => {
                    photoPreview.src = event.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                fileNameDisplay.innerText = "No file selected";
            }
        });
    }

    // =========================================
    // Send Email OTP
    // =========================================
    if (sendOtpBtn) {
        sendOtpBtn.addEventListener("click", async () => {
            hideAlert();
            const email = emailInput.value.trim();

            if (!email || !email.includes("@")) {
                showAlert("Please enter a valid email address before requesting OTP.");
                return;
            }

            sendOtpBtn.disabled = true;
            sendOtpBtn.innerText = "Sending...";

            try {
                const response = await fetch(`${API_BASE}/otp/send`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email,
                        userType: "student",
                        purpose: "registration"
                    })
                });

                const data = await response.json();

                if (data.success) {
                    otpContainer.style.display = "block";
                    otpStatus.style.color = "#2b6cb0";
                    otpStatus.innerText = "OTP sent to " + email + ". Please check your inbox.";
                    startCooldown();
                    showAlert("OTP sent to your email.", true);
                } else {
                    showAlert(data.message || "Failed to send OTP.");
                    sendOtpBtn.disabled = false;
                    sendOtpBtn.innerText = "Send OTP";
                }
            } catch (error) {
                console.error("Send OTP Error:", error);
                showAlert("Server error while sending OTP.");
                sendOtpBtn.disabled = false;
                sendOtpBtn.innerText = "Send OTP";
            }
        });
    }

    function startCooldown() {
        let cooldown = 60;
        sendOtpBtn.disabled = true;
        const interval = setInterval(() => {
            sendOtpBtn.innerText = `Resend (${cooldown}s)`;
            cooldown--;
            if (cooldown < 0) {
                clearInterval(interval);
                sendOtpBtn.disabled = false;
                sendOtpBtn.innerText = "Resend OTP";
            }
        }, 1000);
    }

    // =========================================
    // Verify Email OTP
    // =========================================
    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener("click", async () => {
            hideAlert();
            const email = emailInput.value.trim();
            const otp = otpInput.value.trim();

            if (!email || !otp || otp.length < 6) {
                showAlert("Please enter the 6-digit OTP sent to your email.");
                return;
            }

            verifyOtpBtn.disabled = true;
            verifyOtpBtn.innerText = "Verifying...";

            try {
                const response = await fetch(`${API_BASE}/otp/verify`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email,
                        userType: "student",
                        purpose: "registration",
                        otp
                    })
                });

                const data = await response.json();

                if (data.success) {
                    isOtpVerified = true;
                    otpStatus.style.color = "#276749";
                    otpStatus.innerText = "✅ Email verified successfully!";
                    emailInput.readOnly = true;
                    otpInput.readOnly = true;
                    verifyOtpBtn.disabled = true;
                    verifyOtpBtn.innerText = "Verified ✅";
                    sendOtpBtn.style.display = "none";
                    showAlert("Email address verified successfully!", true);
                } else {
                    isOtpVerified = false;
                    otpStatus.style.color = "#e53e3e";
                    otpStatus.innerText = "❌ " + (data.message || "Invalid OTP");
                    verifyOtpBtn.disabled = false;
                    verifyOtpBtn.innerText = "Verify OTP";
                }
            } catch (error) {
                console.error("Verify OTP Error:", error);
                showAlert("Server error while verifying OTP.");
                verifyOtpBtn.disabled = false;
                verifyOtpBtn.innerText = "Verify OTP";
            }
        });
    }

    // =========================================
    // Registration Form Submit
    // =========================================
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            hideAlert();

            if (!isOtpVerified) {
                showAlert("Email OTP verification is required before account creation.");
                return;
            }

            const fullName = document.getElementById("fullName").value.trim();
            const fatherName = document.getElementById("fatherName").value.trim();
            const motherName = document.getElementById("motherName").value.trim();
            const mobile = document.getElementById("mobile").value.trim();
            const email = emailInput.value.trim();
            const dob = document.getElementById("dob").value;
            const gender = document.getElementById("gender").value;
            const college = document.getElementById("college").value.trim();
            const course = document.getElementById("course").value.trim();
            const address = document.getElementById("address").value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (password !== confirmPassword) {
                showAlert("Password and Confirm Password do not match.");
                return;
            }

            submitBtn.disabled = true;
            btnText.innerText = "Creating Account...";

            try {
                const response = await fetch(`${API_BASE}/student/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fullName,
                        fatherName,
                        motherName,
                        mobile,
                        email,
                        password,
                        gender,
                        dob,
                        college,
                        course,
                        address
                    })
                });

                const data = await response.json();

                if (data.success) {
                    showAlert("🎉 Registration Successful! Redirecting to login...", true);
                    localStorage.setItem("studentToken", data.token);
                    localStorage.setItem("studentData", JSON.stringify(data.student));

                    setTimeout(() => {
                        window.location.href = "student-login.html";
                    }, 1200);
                } else {
                    showAlert(data.message || "Registration failed.");
                    submitBtn.disabled = false;
                    btnText.innerText = "CREATE ACCOUNT";
                }
            } catch (error) {
                console.error("Registration Error:", error);
                showAlert("Server error during registration.");
                submitBtn.disabled = false;
                btnText.innerText = "CREATE ACCOUNT";
            }
        });
    }
});