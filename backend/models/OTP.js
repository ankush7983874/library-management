const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
    identifier: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    userType: {
        type: String,
        enum: ["student", "owner"],
        required: true
    },
    purpose: {
        type: String,
        enum: ["registration", "forgot-password"],
        required: true
    },
    otpHash: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    maxAttempts: {
        type: Number,
        default: 5
    },
    verified: {
        type: Boolean,
        default: false
    },
    used: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// TTL index to automatically clean up expired OTP records after 15 minutes
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 900 });

module.exports = mongoose.models.OTP || mongoose.model("OTP", otpSchema);
