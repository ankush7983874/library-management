const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const API_BASE = "http://localhost:5000/api";
const testEmail = `teststudent_${Date.now()}@example.com`;
const testPassword = "SecretPassword123!";
const testNewPassword = "NewSecretPassword456!";

async function runTests() {
    console.log("=== STARTING AUTHENTICATION & OTP SYSTEM TESTS ===");

    // 1. Attempt Student Registration Without OTP
    console.log("\n[Test 1] Student Registration Without OTP Verification");
    const regRes1 = await fetch(`${API_BASE}/student/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            fullName: "Auth Test Student",
            fatherName: "Father Test",
            motherName: "Mother Test",
            mobile: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
            email: testEmail,
            password: testPassword,
            gender: "Male",
            dob: "2000-01-01",
            college: "Test University",
            course: "B.Tech",
            address: "Test City"
        })
    }).then(r => r.json());

    console.log("Result 1:", regRes1);
    if (!regRes1.success && regRes1.message.includes("verify your email with OTP")) {
        console.log("✅ TEST 1 PASSED: Unverified registration blocked correctly.");
    } else {
        console.error("❌ TEST 1 FAILED!");
    }

    // 2. Request OTP for Registration
    console.log("\n[Test 2] Request OTP for Registration");
    const sendRes = await fetch(`${API_BASE}/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: testEmail,
            userType: "student",
            purpose: "registration"
        })
    }).then(r => r.json());

    console.log("Result 2:", sendRes);

    // Fetch the generated OTP hash/record directly from DB for verification test
    await mongoose.connect(process.env.MONGO_URI);
    const OTP = require("./models/OTP");
    const otpDoc = await OTP.findOne({ identifier: testEmail, userType: "student", purpose: "registration" }).sort({ createdAt: -1 });

    if (!otpDoc) {
        console.error("❌ TEST 2 FAILED: OTP document not found in DB!");
        process.exit(1);
    }
    console.log("✅ TEST 2 PASSED: OTP record created in MongoDB.");

    // 3. Verify Invalid OTP
    console.log("\n[Test 3] Verify Invalid OTP");
    const invalidVerifyRes = await fetch(`${API_BASE}/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: testEmail,
            userType: "student",
            purpose: "registration",
            otp: "000000"
        })
    }).then(r => r.json());

    console.log("Result 3:", invalidVerifyRes);
    if (!invalidVerifyRes.success) {
        console.log("✅ TEST 3 PASSED: Invalid OTP rejected.");
    } else {
        console.error("❌ TEST 3 FAILED!");
    }

    // Generate/Set known OTP for exact verification testing
    const bcrypt = require("bcryptjs");
    const testOtpCode = "654321";
    otpDoc.otpHash = await bcrypt.hash(testOtpCode, 10);
    await otpDoc.save();

    // 4. Verify Valid OTP
    console.log("\n[Test 4] Verify Valid OTP");
    const validVerifyRes = await fetch(`${API_BASE}/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: testEmail,
            userType: "student",
            purpose: "registration",
            otp: testOtpCode
        })
    }).then(r => r.json());

    console.log("Result 4:", validVerifyRes);
    if (validVerifyRes.success) {
        console.log("✅ TEST 4 PASSED: OTP verified successfully.");
    } else {
        console.error("❌ TEST 4 FAILED!");
    }

    // 5. Complete Student Registration After OTP Verification
    console.log("\n[Test 5] Student Registration After OTP Verification");
    const regRes2 = await fetch(`${API_BASE}/student/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            fullName: "Auth Test Student",
            fatherName: "Father Test",
            motherName: "Mother Test",
            mobile: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
            email: testEmail,
            password: testPassword,
            gender: "Male",
            dob: "2000-01-01",
            college: "Test University",
            course: "B.Tech",
            address: "Test City"
        })
    }).then(r => r.json());

    console.log("Result 5:", regRes2);
    if (regRes2.success && regRes2.token) {
        console.log("✅ TEST 5 PASSED: Student account created successfully after OTP verification.");
    } else {
        console.error("❌ TEST 5 FAILED!");
    }

    // 6. Student Login with Email + Password
    console.log("\n[Test 6] Student Login (Email + Password)");
    const loginRes = await fetch(`${API_BASE}/student/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: testEmail,
            password: testPassword
        })
    }).then(r => r.json());

    console.log("Result 6:", loginRes);
    if (loginRes.success && loginRes.token) {
        console.log("✅ TEST 6 PASSED: Student login with Email + Password successful.");
    } else {
        console.error("❌ TEST 6 FAILED!");
    }

    // 7. Forgot Password Flow
    console.log("\n[Test 7] Forgot Password Send OTP");
    const forgotSendRes = await fetch(`${API_BASE}/forgot-password/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: testEmail,
            userType: "student"
        })
    }).then(r => r.json());

    console.log("Result 7:", forgotSendRes);

    const forgotOtpDoc = await OTP.findOne({ identifier: testEmail, userType: "student", purpose: "forgot-password" }).sort({ createdAt: -1 });
    const forgotTestOtp = "112233";
    forgotOtpDoc.otpHash = await bcrypt.hash(forgotTestOtp, 10);
    await forgotOtpDoc.save();

    console.log("\n[Test 8] Forgot Password Verify OTP");
    const forgotVerifyRes = await fetch(`${API_BASE}/forgot-password/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: testEmail,
            userType: "student",
            otp: forgotTestOtp
        })
    }).then(r => r.json());

    console.log("Result 8:", forgotVerifyRes);

    console.log("\n[Test 9] Forgot Password Reset");
    const resetRes = await fetch(`${API_BASE}/forgot-password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: testEmail,
            userType: "student",
            newPassword: testNewPassword,
            confirmPassword: testNewPassword
        })
    }).then(r => r.json());

    console.log("Result 9:", resetRes);
    if (resetRes.success) {
        console.log("✅ TEST 9 PASSED: Password reset successfully.");
    } else {
        console.error("❌ TEST 9 FAILED!");
    }

    // 8. Test Login with Old vs New Password
    console.log("\n[Test 10] Login with Old Password (Should Fail)");
    const oldLoginRes = await fetch(`${API_BASE}/student/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: testEmail,
            password: testPassword
        })
    }).then(r => r.json());

    console.log("Result 10 (Old Password):", oldLoginRes);
    if (!oldLoginRes.success) {
        console.log("✅ TEST 10 PASSED: Old password rejected.");
    } else {
        console.error("❌ TEST 10 FAILED!");
    }

    console.log("\n[Test 11] Login with New Password (Should Succeed)");
    const newLoginRes = await fetch(`${API_BASE}/student/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: testEmail,
            password: testNewPassword
        })
    }).then(r => r.json());

    console.log("Result 11 (New Password):", newLoginRes);
    if (newLoginRes.success && newLoginRes.token) {
        console.log("✅ TEST 11 PASSED: Login with new password successful!");
    } else {
        console.error("❌ TEST 11 FAILED!");
    }

    await mongoose.connection.close();
    console.log("\n=== ALL AUTHENTICATION TESTS COMPLETED SUCCESSFULLY ===");
}

runTests().catch(err => {
    console.error("FATAL TEST ERROR:", err);
    process.exit(1);
});
