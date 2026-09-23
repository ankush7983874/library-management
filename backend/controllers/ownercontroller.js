const Student = require("../models/student");
const Payment = require("../models/payment");
const Seat = require("../models/seat");
const Attendance = require("../models/attendance");
const Owner = require("../models/owner");
const Waiting = require("../models/Waiting");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { isOTPVerified, consumeOTPVerification } = require("../services/otpService");

// =====================================
// Generate JWT Token
// =====================================

const generateToken = (id) => {

    return jwt.sign(
        { id, role: "owner" },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );

};


// =====================================
// Owner Register
// =====================================

exports.registerOwner = async (req, res) => {

    try {

        const {
            libraryName,
            ownerName,
            mobile,
            email,
            password
        } = req.body;


        // -----------------------------
        // Validation
        // -----------------------------

        if (
            !libraryName ||
            !ownerName ||
            !mobile ||
            !email ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                message: "Please fill all fields."

            });

        }

        // -----------------------------
        // Check Email Duplicate
        // -----------------------------

        const emailExists = await Owner.findOne({
            email
        });

        if (emailExists) {
            return res.status(400).json({
                success: false,
                message: "Email already registered."
            });
        }


        // -----------------------------
        // Check Mobile Duplicate
        // -----------------------------

        const mobileExists = await Owner.findOne({
            mobile
        });

        if (mobileExists) {
            return res.status(400).json({
                success: false,
                message: "Mobile already registered."
            });
        }


        // -----------------------------
        // Check OTP Verification
        // -----------------------------

        const verified = await isOTPVerified(email, "owner", "registration");

        if (!verified) {
            return res.status(400).json({
                success: false,
                message: "Please verify your email with OTP before registration."
            });
        }


        // -----------------------------
        // Create Owner
        // -----------------------------

        const owner = await Owner.create({

            libraryName,

            ownerName,

            mobile,

            email,

            password

        });

        // Consume OTP verification
        await consumeOTPVerification(email, "owner", "registration");


        // -----------------------------
        // Response
        // -----------------------------

        return res.status(201).json({

            success: true,

            message: "Owner Registered Successfully",

            token: generateToken(owner._id),

            owner: {

                id: owner._id,

                libraryName: owner.libraryName,

                ownerName: owner.ownerName,

                mobile: owner.mobile,

                email: owner.email

            }

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


// =====================================
// Owner Login
// =====================================

exports.loginOwner = async (req, res) => {

    try {

        const {

            email,
            password

        } = req.body;


        // -----------------------------
        // Validation
        // -----------------------------

        if (!email || !password) {

            return res.status(400).json({

                success: false,

                message: "Email and Password required."

            });

        }


        // -----------------------------
        // Find Owner
        // -----------------------------

        const owner = await Owner.findOne({

            email

        });

        if (!owner) {

            return res.status(404).json({

                success: false,

                message: "Owner not found."

            });

        }


        // -----------------------------
        // Compare Password
        // -----------------------------

        const isMatch = await bcrypt.compare(

            password,

            owner.password

        );

        if (!isMatch) {

            return res.status(401).json({

                success: false,

                message: "Invalid Password."

            });

        }


        // -----------------------------
        // Response
        // -----------------------------

        return res.status(200).json({

            success: true,

            message: "Login Successful",

            token: generateToken(owner._id),

            owner: {

                id: owner._id,

                libraryName: owner.libraryName,

                ownerName: owner.ownerName,

                mobile: owner.mobile,

                email: owner.email

            }

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


// =====================================
// Owner Dashboard Statistics
// =====================================

exports.dashboard = async (req, res) => {
    try {
        // Ensure 150 seats exist in DB if empty
        let totalSeats = await Seat.countDocuments();
        if (totalSeats === 0) {
            const seats = [];
            for (let i = 1; i <= 150; i++) {
                seats.push({
                    seatNumber: i,
                    status: "Available",
                    student: null,
                    monthlyFee: 500
                });
            }
            await Seat.insertMany(seats);
            totalSeats = 150;
        }

        const totalStudents = await Student.countDocuments();
        const occupiedSeats = await Seat.countDocuments({ status: "Booked" });
        const availableSeats = await Seat.countDocuments({ status: "Available" });

        // Calculate verified/paid monthly income
        const paidPayments = await Payment.find({ status: "Paid" });
        const monthlyIncome = paidPayments.reduce((total, payment) => {
            return total + Number(payment.amount || 0);
        }, 0);

        const pendingFees = await Payment.countDocuments({ status: "Pending" });

        // Calculate today's attendance
        let todayAttendance = 0;
        try {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            const end = new Date();
            end.setHours(23, 59, 59, 999);

            todayAttendance = await Attendance.countDocuments({
                createdAt: { $gte: start, $lte: end }
            });
        } catch (attendanceError) {
            todayAttendance = 0;
        }

        // Waiting list count
        let waitingStudents = 0;
        try {
            waitingStudents = await Waiting.countDocuments();
        } catch (wErr) {
            waitingStudents = 0;
        }

        return res.status(200).json({
            success: true,
            dashboard: {
                totalStudents,
                totalSeats,
                occupiedSeats,
                availableSeats,
                monthlyIncome,
                pendingFees,
                todayAttendance,
                waitingStudents
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// =====================================
// Get All Students (With Search)
// =====================================

exports.getAllStudents = async (req, res) => {
    try {
        const { keyword } = req.query;
        let query = {};

        if (keyword && String(keyword).trim() !== "") {
            const cleanKw = String(keyword).trim();
            const numSeat = parseInt(cleanKw, 10);

            const orConditions = [
                { fullName: { $regex: cleanKw, $options: "i" } },
                { mobile: { $regex: cleanKw, $options: "i" } },
                { email: { $regex: cleanKw, $options: "i" } },
                { studentId: { $regex: cleanKw, $options: "i" } }
            ];

            // Safely append numeric seat search without regex CastError on Number field
            if (!isNaN(numSeat) && numSeat > 0) {
                orConditions.push({ seatNumber: numSeat });
            }

            query = { $or: orConditions };
        }

        const students = await Student.find(query)
            .select("-password")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            total: students.length,
            students
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// =====================================
// Get Single Student Detail (Owner View)
// =====================================

exports.getStudentById = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await Student.findById(id).select("-password");

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found."
            });
        }

        const payments = await Payment.find({ student: student._id }).sort({ createdAt: -1 });
        const attendance = await Attendance.find({ student: student._id }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            student,
            payments,
            attendance
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// =====================================
// Get Logged-In Owner Profile (My Account)
// =====================================

exports.getOwnerProfile = async (req, res) => {
    try {
        const owner = await Owner.findById(req.user._id).select("-password");

        if (!owner) {
            return res.status(404).json({
                success: false,
                message: "Owner profile not found."
            });
        }

        return res.status(200).json({
            success: true,
            owner
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// =====================================
// Get All Payments
// =====================================

exports.getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate("student", "fullName mobile email studentId seatNumber")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            total: payments.length,
            payments
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// =====================================
// Get Waiting List
// =====================================

exports.getWaitingList = async (req, res) => {
    try {
        const waitingStudents = await Waiting.find()
            .populate("student", "fullName mobile email seatPreference")
            .sort({ date: 1 });

        return res.status(200).json({
            success: true,
            total: waitingStudents.length,
            waitingList: waitingStudents
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// =====================================
// Get Owner Reports & Analytics
// =====================================

exports.getReports = async (req, res) => {
    try {
        const totalStudents = await Student.countDocuments();
        const totalSeats = (await Seat.countDocuments()) || 150;
        const occupiedSeats = await Seat.countDocuments({ status: "Booked" });
        const availableSeats = await Seat.countDocuments({ status: "Available" });

        const paidPayments = await Payment.find({ status: "Paid" });
        const monthlyIncome = paidPayments.reduce((total, p) => total + Number(p.amount || 0), 0);
        const pendingFeesCount = await Payment.countDocuments({ status: "Pending" });

        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        const todayAttendance = await Attendance.countDocuments({ createdAt: { $gte: start, $lte: end } });
        const waitingCount = await Waiting.countDocuments();

        const seatOccupancyPct = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;
        const attendancePct = totalStudents > 0 ? Math.round((todayAttendance / totalStudents) * 100) : 0;

        return res.status(200).json({
            success: true,
            reports: {
                totalStudents,
                totalSeats,
                occupiedSeats,
                availableSeats,
                seatOccupancyPct,
                monthlyIncome,
                pendingFeesCount,
                todayAttendance,
                attendancePct,
                waitingCount
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// =====================================
// Get Owner Settings (Protected)
// =====================================

exports.getSettings = async (req, res) => {
    try {
        let owner = await Owner.findById(req.user._id).select("-password");

        if (!owner) {
            owner = await Owner.findOne().select("-password");
        }

        if (!owner) {
            return res.status(404).json({
                success: false,
                message: "Owner configuration not found."
            });
        }

        return res.status(200).json({
            success: true,
            settings: {
                libraryName: owner.libraryName || "BarnalaByte Smart Library",
                logo: owner.logo || "",
                address: owner.address || "",
                totalSeats: owner.totalSeats || 150,
                monthlyFee: owner.monthlyFee || 500,
                openingTime: owner.openingTime || "06:00 AM",
                closingTime: owner.closingTime || "11:00 PM",
                upiId: owner.upiId || "barnalauo86@okaxis",
                paymentQr: owner.paymentQr || "",
                holidays: owner.holidays || ""
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// =====================================
// Update Owner Settings (Protected - Owner Only)
// =====================================

exports.updateSettings = async (req, res) => {
    try {
        const owner = await Owner.findById(req.user._id);

        if (!owner) {
            return res.status(404).json({
                success: false,
                message: "Owner account not found."
            });
        }

        const {
            libraryName,
            logo,
            address,
            monthlyFee,
            openingTime,
            closingTime,
            upiId,
            paymentQr,
            holidays
        } = req.body;

        if (libraryName !== undefined) owner.libraryName = libraryName;
        if (logo !== undefined) owner.logo = logo;
        if (address !== undefined) owner.address = address;
        if (monthlyFee !== undefined) owner.monthlyFee = Number(monthlyFee);
        if (openingTime !== undefined) owner.openingTime = openingTime;
        if (closingTime !== undefined) owner.closingTime = closingTime;
        if (upiId !== undefined) owner.upiId = upiId;
        if (paymentQr !== undefined) owner.paymentQr = paymentQr;
        if (holidays !== undefined) owner.holidays = holidays;

        await owner.save();

        return res.status(200).json({
            success: true,
            message: "Settings updated successfully.",
            settings: {
                libraryName: owner.libraryName,
                logo: owner.logo,
                address: owner.address,
                monthlyFee: owner.monthlyFee,
                openingTime: owner.openingTime,
                closingTime: owner.closingTime,
                upiId: owner.upiId,
                paymentQr: owner.paymentQr,
                holidays: owner.holidays
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// =====================================
// Get Public Library Settings (Public/Student Access)
// =====================================

exports.getPublicSettings = async (req, res) => {
    try {
        const owner = await Owner.findOne().select("libraryName logo address monthlyFee openingTime closingTime upiId paymentQr holidays");

        return res.status(200).json({
            success: true,
            settings: {
                libraryName: owner ? owner.libraryName : "BarnalaByte Smart Library",
                logo: owner ? owner.logo : "",
                address: owner ? owner.address : "",
                monthlyFee: owner ? owner.monthlyFee : 500,
                openingTime: owner ? owner.openingTime : "06:00 AM",
                closingTime: owner ? owner.closingTime : "11:00 PM",
                upiId: owner ? owner.upiId : "barnalauo86@okaxis",
                paymentQr: owner ? owner.paymentQr : "",
                holidays: owner ? owner.holidays : ""
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// =====================================
// Export Module
// =====================================

module.exports = exports;