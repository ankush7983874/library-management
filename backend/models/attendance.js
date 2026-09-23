const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
{
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true,
        index: true
    },

    date: {
        type: String,
        required: true,
        index: true
    },

    entryTime: {
        type: Date,
        default: Date.now
    },

    exitTime: {
        type: Date,
        default: null
    },

    checkIn: {
        type: String,
        default: ""
    },

    checkOut: {
        type: String,
        default: ""
    },

    entryLatitude: {
        type: Number,
        default: null
    },

    entryLongitude: {
        type: Number,
        default: null
    },

    entryAccuracyMeters: {
        type: Number,
        default: null
    },

    entryDistanceMeters: {
        type: Number,
        default: null
    },

    entryFaceVerified: {
        type: Boolean,
        default: true
    },

    exitLatitude: {
        type: Number,
        default: null
    },

    exitLongitude: {
        type: Number,
        default: null
    },

    exitAccuracyMeters: {
        type: Number,
        default: null
    },

    exitDistanceMeters: {
        type: Number,
        default: null
    },

    exitFaceVerified: {
        type: Boolean,
        default: false
    },

    durationMinutes: {
        type: Number,
        default: 0
    },

    durationFormatted: {
        type: String,
        default: ""
    },

    status: {
        type: String,
        enum: ["Open", "Completed", "Present", "Absent"],
        default: "Open",
        index: true
    }

},
{
    timestamps: true
});

// Compound indexes for optimal performance
attendanceSchema.index({ student: 1, date: 1 });
attendanceSchema.index({ student: 1, status: 1 });

module.exports = mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);