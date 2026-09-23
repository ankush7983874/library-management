const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema(
{
    seatNumber: {
        type: Number,
        required: true,
        unique: true,
        min: 1,
        max: 150
    },

    status: {
        type: String,
        enum: ["Available", "Booked", "Reserved"],
        default: "Available"
    },

    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        default: null
    },

    bookingDate: {
        type: Date,
        default: null
    },

    expiryDate: {
        type: Date,
        default: null
    },

    monthlyFee: {
        type: Number,
        default: 500
    }

},
{
    timestamps: true
});

module.exports = mongoose.models.Seat || mongoose.model("Seat", seatSchema);