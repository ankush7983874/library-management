const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const OTP = require("../models/OTP");
const { sendOTPEmail } = require("./emailService");

const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

const generateAndSendOTP = async (email, userType, purpose) => {
    const cleanEmail = String(email).trim().toLowerCase();

    if (!cleanEmail) {
        return { success: false, message: "Email is required." };
    }

    if (!["student", "owner"].includes(userType)) {
        return { success: false, message: "Invalid user type." };
    }

    if (!["registration", "forgot-password"].includes(purpose)) {
        return { success: false, message: "Invalid OTP purpose." };
    }

    // Check resend cooldown
    const existingOTP = await OTP.findOne({
        identifier: cleanEmail,
        userType,
        purpose,
        used: false
    }).sort({ createdAt: -1 });

    if (existingOTP) {
        const secondsSinceLast = Math.floor((Date.now() - new Date(existingOTP.createdAt).getTime()) / 1000);
        if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
            const waitTime = RESEND_COOLDOWN_SECONDS - secondsSinceLast;
            return {
                success: false,
                message: `Please wait ${waitTime} seconds before requesting a new OTP.`
            };
        }
    }

    // Invalidate old unverified OTPs for this identifier/userType/purpose
    await OTP.deleteMany({
        identifier: cleanEmail,
        userType,
        purpose,
        used: false
    });

    // Generate 6-digit random OTP
    const rawOTP = String(crypto.randomInt(100000, 1000000));

    // Hash OTP before storing
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(rawOTP, salt);

    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Save to Database
    await OTP.create({
        identifier: cleanEmail,
        userType,
        purpose,
        otpHash,
        expiresAt,
        attempts: 0,
        maxAttempts: 5,
        verified: false,
        used: false
    });

    // Send Email via SMTP
    const emailResult = await sendOTPEmail(cleanEmail, rawOTP, purpose);

    if (!emailResult.success && process.env.NODE_ENV === "production") {
        return {
            success: false,
            message: emailResult.message || "Failed to send OTP email."
        };
    }

    return {
        success: true,
        message: emailResult.success ? "OTP sent successfully to your email." : "OTP generated (SMTP fallback active).",
        otp: rawOTP
    };
};

const verifyOTP = async (email, userType, purpose, inputOTP) => {
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOTP = String(inputOTP).trim();

    if (!cleanEmail || !cleanOTP) {
        return { success: false, message: "Email and OTP are required." };
    }

    const otpRecord = await OTP.findOne({
        identifier: cleanEmail,
        userType,
        purpose,
        used: false,
        expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
        return {
            success: false,
            message: "OTP has expired or is invalid. Please request a new OTP."
        };
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
        return {
            success: false,
            message: "Maximum verification attempts exceeded. Please request a new OTP."
        };
    }

    const isMatch = await bcrypt.compare(cleanOTP, otpRecord.otpHash);

    if (!isMatch) {
        otpRecord.attempts += 1;
        await otpRecord.save();
        const remaining = otpRecord.maxAttempts - otpRecord.attempts;
        return {
            success: false,
            message: remaining > 0 
                ? `Invalid OTP. You have ${remaining} attempt(s) remaining.` 
                : "Invalid OTP. Maximum attempts reached."
        };
    }

    otpRecord.verified = true;
    otpRecord.used = true;
    await otpRecord.save();

    return {
        success: true,
        message: "OTP verified successfully."
    };
};

const isOTPVerified = async (email, userType, purpose) => {
    const cleanEmail = String(email).trim().toLowerCase();
    
    // Check if there is a verified OTP record from within the last 30 minutes
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

    const record = await OTP.findOne({
        identifier: cleanEmail,
        userType,
        purpose,
        verified: true,
        used: true,
        updatedAt: { $gte: thirtyMinsAgo }
    });

    return !!record;
};

const consumeOTPVerification = async (email, userType, purpose) => {
    const cleanEmail = String(email).trim().toLowerCase();
    await OTP.deleteMany({
        identifier: cleanEmail,
        userType,
        purpose,
        verified: true
    });
};

module.exports = {
    generateAndSendOTP,
    verifyOTP,
    isOTPVerified,
    consumeOTPVerification
};
