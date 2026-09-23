const Student = require("../models/student");
const Owner = require("../models/owner");
const bcrypt = require("bcryptjs");
const { generateAndSendOTP, verifyOTP, isOTPVerified, consumeOTPVerification } = require("../services/otpService");

exports.sendForgotOTP = async (req, res) => {
    try {
        const { email, userType } = req.body;

        if (!email || !userType) {
            return res.status(400).json({
                success: false,
                message: "Email and userType are required."
            });
        }

        const cleanEmail = String(email).trim().toLowerCase();

        // Check if account exists
        let user = null;
        if (userType === "student") {
            user = await Student.findOne({ email: cleanEmail });
        } else if (userType === "owner") {
            user = await Owner.findOne({ email: cleanEmail });
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid userType."
            });
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: `No ${userType} account found with this email.`
            });
        }

        const result = await generateAndSendOTP(cleanEmail, userType, "forgot-password");

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }

        return res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error) {
        console.error("sendForgotOTP Error:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to send forgot password OTP."
        });
    }
};

exports.verifyForgotOTP = async (req, res) => {
    try {
        const { email, userType, otp } = req.body;

        if (!email || !userType || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email, userType, and OTP are required."
            });
        }

        const result = await verifyOTP(email, userType, "forgot-password", otp);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }

        return res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error) {
        console.error("verifyForgotOTP Error:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to verify OTP."
        });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, userType, newPassword, confirmPassword } = req.body;

        if (!email || !userType || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "All fields (email, userType, newPassword, confirmPassword) are required."
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "New password and confirm password do not match."
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long."
            });
        }

        const cleanEmail = String(email).trim().toLowerCase();

        // Check if OTP was verified on backend
        const verified = await isOTPVerified(cleanEmail, userType, "forgot-password");

        if (!verified) {
            return res.status(400).json({
                success: false,
                message: "OTP verification required before resetting password."
            });
        }

        let user = null;
        if (userType === "student") {
            user = await Student.findOne({ email: cleanEmail });
            if (user) {
                user.password = newPassword;
                await user.save();
            }
        } else if (userType === "owner") {
            user = await Owner.findOne({ email: cleanEmail });
            if (user) {
                user.password = newPassword;
                await user.save();
            }
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Account not found."
            });
        }

        // Consume OTP verification state
        await consumeOTPVerification(cleanEmail, userType, "forgot-password");

        return res.status(200).json({
            success: true,
            message: "Password reset successfully. You can now login with your new password."
        });

    } catch (error) {
        console.error("resetPassword Error:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to reset password."
        });
    }
};
