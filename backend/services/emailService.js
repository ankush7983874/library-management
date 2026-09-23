const nodemailer = require("nodemailer");

const createTransporter = () => {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT || "465", 10);
    const secure = process.env.SMTP_SECURE === "true" || port === 465;
    const user = process.env.SMTP_USER || "libraryofficial100@gmail.com";
    const pass = process.env.SMTP_PASS || "";

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
            user,
            pass
        }
    });
};

const sendOTPEmail = async (toEmail, otp, purpose) => {
    try {
        const transporter = createTransporter();
        const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || "libraryofficial100@gmail.com";

        const purposeTitle = purpose === "registration" ? "Account Registration" : "Password Reset";

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #1E3A8A; margin-bottom: 10px;">BarnalaByte Smart Library Management System</h2>
                <p style="font-size: 15px; color: #333;">Your verification OTP for <strong>${purposeTitle}</strong> is:</p>
                <div style="background-color: #f0f4f8; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1E3A8A;">${otp}</span>
                </div>
                <p style="font-size: 14px; color: #666;">This OTP is valid for 10 minutes. Do not share this OTP with anyone.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #999;">If you did not request this OTP, please ignore this email.</p>
            </div>
        `;

        const mailOptions = {
            from: `"BarnalaByte Library" <${fromAddress}>`,
            to: toEmail,
            subject: `BarnalaByte Verification OTP - ${otp}`,
            text: `BarnalaByte Smart Library Management System\n\nYour verification OTP for ${purposeTitle} is: ${otp}\n\nThis OTP is valid for 10 minutes. Do not share this OTP with anyone.`,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        return {
            success: true,
            messageId: info.messageId
        };
    } catch (error) {
        console.error("SMTP Email Sending Error:", error.message);
        return {
            success: false,
            message: error.message || "Failed to send OTP email via SMTP."
        };
    }
};

const sendNotificationEmail = async (toEmail, subject, text, html) => {
    try {
        const transporter = createTransporter();
        const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || "libraryofficial100@gmail.com";

        const mailOptions = {
            from: `"BarnalaByte Library" <${fromAddress}>`,
            to: toEmail,
            subject,
            text,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        return {
            success: true,
            messageId: info.messageId
        };
    } catch (error) {
        console.error("Notification Email Error:", error.message);
        return {
            success: false,
            message: error.message || "Failed to send notification email."
        };
    }
};

module.exports = {
    sendOTPEmail,
    sendNotificationEmail
};

