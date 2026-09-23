const { generateAndSendOTP, verifyOTP } = require("../services/otpService");

exports.sendOTP = async (req, res) => {
    try {
        const { email, userType, purpose } = req.body;

        if (!email || !userType || !purpose) {
            return res.status(400).json({
                success: false,
                message: "Email, userType, and purpose are required."
            });
        }

        const result = await generateAndSendOTP(email, userType, purpose);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }

        return res.status(200).json({
            success: true,
            message: result.message,
            otp: result.otp
        });

    } catch (error) {
        console.error("sendOTP Error:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to send OTP."
        });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { email, userType, purpose, otp } = req.body;

        if (!email || !userType || !purpose || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email, userType, purpose, and OTP are required."
            });
        }

        const result = await verifyOTP(email, userType, purpose, otp);

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
        console.error("verifyOTP Error:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to verify OTP."
        });
    }
};
