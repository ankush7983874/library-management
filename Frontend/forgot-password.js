const API_BASE = "http://localhost:5000/api";

const forgotForm = document.getElementById("forgotForm");
const userTypeSelect = document.getElementById("userType");
const emailInput = document.getElementById("email");
const sendOtpBtn = document.getElementById("sendOtpBtn");
const otpBox = document.getElementById("otpBox");
const otpInput = document.getElementById("otpInput");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");
const otpStatus = document.getElementById("otpStatus");
const passwordBox = document.getElementById("passwordBox");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");

let isOtpVerified = false;

// Send OTP for Forgot Password
sendOtpBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const userType = userTypeSelect.value;

    if (!email) {
        alert("Please enter a valid registered email address.");
        return;
    }

    sendOtpBtn.disabled = true;
    sendOtpBtn.innerText = "Sending...";

    try {
        const response = await fetch(`${API_BASE}/forgot-password/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email,
                userType
            })
        });

        const data = await response.json();

        if (data.success) {
            alert("OTP sent to your registered email: " + email);
            otpBox.style.display = "flex";
            otpStatus.style.color = "#2563eb";
            otpStatus.innerText = "OTP sent to " + email + ". Check your inbox.";
            startCooldown();
        } else {
            alert(data.message || "Failed to send OTP.");
            sendOtpBtn.disabled = false;
            sendOtpBtn.innerText = "Send OTP";
        }
    } catch (error) {
        console.error(error);
        alert("Server error while sending OTP.");
        sendOtpBtn.disabled = false;
        sendOtpBtn.innerText = "Send OTP";
    }
});

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

// Verify OTP
verifyOtpBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const userType = userTypeSelect.value;
    const otp = otpInput.value.trim();

    if (!email || !otp) {
        alert("Please enter both email and 6-digit OTP.");
        return;
    }

    verifyOtpBtn.disabled = true;
    verifyOtpBtn.innerText = "Verifying...";

    try {
        const response = await fetch(`${API_BASE}/forgot-password/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email,
                userType,
                otp
            })
        });

        const data = await response.json();

        if (data.success) {
            isOtpVerified = true;
            otpStatus.style.color = "#16a34a";
            otpStatus.innerText = "✅ OTP Verified! You can now set a new password.";
            passwordBox.style.display = "flex";
            emailInput.readOnly = true;
            userTypeSelect.disabled = true;
            otpInput.readOnly = true;
            verifyOtpBtn.disabled = true;
            verifyOtpBtn.innerText = "Verified ✅";
            sendOtpBtn.style.display = "none";
        } else {
            isOtpVerified = false;
            otpStatus.style.color = "#dc2626";
            otpStatus.innerText = "❌ " + (data.message || "Invalid OTP");
            verifyOtpBtn.disabled = false;
            verifyOtpBtn.innerText = "Verify OTP";
        }
    } catch (error) {
        console.error(error);
        alert("Server error while verifying OTP.");
        verifyOtpBtn.disabled = false;
        verifyOtpBtn.innerText = "Verify OTP";
    }
});

// Reset Password Form Submit
forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!isOtpVerified) {
        alert("Please verify the OTP first.");
        return;
    }

    const email = emailInput.value.trim();
    const userType = userTypeSelect.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (newPassword !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/forgot-password/reset`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email,
                userType,
                newPassword,
                confirmPassword
            })
        });

        const data = await response.json();

        if (data.success) {
            alert("Password Reset Successfully 🎉 Please login with your new password.");
            if (userType === "student") {
                window.location.href = "student-login.html";
            } else {
                window.location.href = "owner-login.html";
            }
        } else {
            alert(data.message || "Password reset failed.");
        }
    } catch (error) {
        console.error(error);
        alert("Server error during password reset.");
    }
});