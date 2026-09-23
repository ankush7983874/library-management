/**
 * SMS Service for BarnalaByte Library System
 * Supports environment-configurable SMS gateways
 */

const sendSMS = async (mobile, message) => {
    try {
        const apiKey = process.env.SMS_API_KEY;
        const senderId = process.env.SMS_SENDER_ID || "BARNALA";
        const providerUrl = process.env.SMS_PROVIDER_URL;

        if (!mobile) {
            return { success: false, message: "Mobile number is required" };
        }

        if (apiKey && providerUrl) {
            // In production with configured SMS Gateway provider
            const axios = require("axios");
            const response = await axios.post(providerUrl, {
                apiKey,
                senderId,
                mobile,
                message
            });

            return {
                success: true,
                providerResponse: response.data
            };
        } else {
            // Unconfigured or Development fallback log
            return {
                success: true,
                message: "SMS notification logged (No SMS Gateway API key configured)",
                recipient: mobile,
                body: message
            };
        }
    } catch (error) {
        console.error("SMS Service Error:", error.message);
        return {
            success: false,
            message: error.message || "Failed to send SMS"
        };
    }
};

module.exports = {
    sendSMS
};
