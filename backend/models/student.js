const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
    fullName: {
        type: String,
        trim: true
    },
    name: {
        type: String,
        trim: true
    },
    fatherName: {
        type: String,
        default: ""
    },
    motherName: {
        type: String,
        default: ""
    },
    mobile: {
        type: String,
        default: ""
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    gender: {
        type: String,
        default: ""
    },
    dob: {
        type: String,
        default: ""
    },
    college: {
        type: String,
        default: ""
    },
    course: {
        type: String,
        default: ""
    },
    address: {
        type: String,
        default: ""
    },
    photo: {
        type: String,
        default: ""
    },
    seatNumber: {
        type: Number,
        default: null
    },
    feesStatus: {
        type: String,
        enum: ["Pending", "Paid"],
        default: "Pending"
    },
    accountStatus: {
        type: String,
        enum: ["Active", "Blocked"],
        default: "Active"
    },
    studentId: {
        type: String,
        default: null,
        sparse: true
    },
    validTill: {
        type: Date,
        default: null
    },
    qrCode: {
        type: String,
        default: ""
    },
    idCardPDF: {
        type: String,
        default: ""
    },
    idCardGenerated: {
        type: Boolean,
        default: false
    },
    idCardNumber: {
        type: String,
        default: ""
    },
    faceRegistered: {
        type: Boolean,
        default: false
    },
    faceVerified: {
        type: Boolean,
        default: false
    },
    faceData: {
        type: String,
        default: ""
    }
}, { timestamps: true });

// Password Hash Pre-save Hook
studentSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare Password Method
studentSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.models.Student || mongoose.model('Student', studentSchema);