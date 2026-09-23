const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({

    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true
    },

    month: {
        type: String,
        default: () => new Date().toLocaleString('default', { month: 'long' })
    },

    year: {
        type: Number,
        default: () => new Date().getFullYear()
    },

    amount: {
        type: Number,
        default: 500
    },

    paymentMethod: {
        type: String,
        enum: ["Razorpay", "Manual_UPI", "UPI", "Cash", "Online", "Bank_Transfer"],
        default: "Manual_UPI"
    },

    transactionId: {
        type: String,
        default: ""
    },

    upiId: {
        type: String,
        default: "barnalauo86@okaxis"
    },

    orderId: {
        type: String,
        default: ""
    },

    paymentId: {
        type: String,
        default: ""
    },

    verificationSource: {
        type: String,
        enum: ["Razorpay_Signature", "Razorpay_Webhook", "Razorpay", "Owner_Manual", "Webhook", "None"],
        default: "None"
    },

    screenshot: {
        type: String,
        default: ""
    },

    status: {
        type: String,
        enum: ["Pending", "Paid", "Rejected", "Failed"],
        default: "Pending"
    },

    paymentDate: {
        type: Date,
        default: Date.now
    }

}, {
    timestamps: true
});

module.exports = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);