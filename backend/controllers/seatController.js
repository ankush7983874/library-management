const Seat = require("../models/seat");
const Student = require("../models/student");

// =====================================
// Create 150 Seats (Run Only Once)
// =====================================

exports.createSeats = async (req, res) => {

    try {

        const totalSeats = await Seat.countDocuments();

        if (totalSeats > 0) {

            return res.status(400).json({
                success: false,
                message: "Seats Already Created"
            });

        }

        let seats = [];

        for (let i = 1; i <= 150; i++) {

            seats.push({

                seatNumber: i,
                status: "Available",
                student: null,
                bookingDate: null,
                expiryDate: null,
                monthlyFee: 500

            });

        }

        await Seat.insertMany(seats);

        res.status(201).json({

            success: true,
            message: "150 Seats Created Successfully"

        });

    } catch (err) {

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};

// =====================================
// Get All Seats
// =====================================

exports.getSeats = async (req, res) => {

    try {

        const seats = await Seat.find()

            .populate("student", "fullName mobile email")

            .sort({ seatNumber: 1 });

        res.status(200).json({

            success: true,

            totalSeats: seats.length,

            seats

        });

    } catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

// =====================================
// Get Available Seats
// =====================================

exports.availableSeats = async (req, res) => {

    try {

        const seats = await Seat.find({

            status: "Available"

        }).sort({

            seatNumber: 1

        });

        res.status(200).json({

            success: true,

            totalAvailable: seats.length,

            seats

        });

    } catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

// =====================================
// Get Student Seat
// =====================================

exports.getStudentSeat = async (req, res) => {

    try {

        const studentId = req.params.studentId;

        const seat = await Seat.findOne({

            student: studentId

        }).populate("student", "fullName mobile email");

        if (!seat) {

            return res.status(404).json({

                success: false,

                message: "Seat Not Allotted"

            });

        }

        res.status(200).json({

            success: true,

            seat

        });

    } catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

// =====================================
// Seat Statistics
// =====================================

exports.seatStats = async (req, res) => {

    try {

        const totalSeats = await Seat.countDocuments();

        const available = await Seat.countDocuments({

            status: "Available"

        });

        const booked = await Seat.countDocuments({

            status: "Booked"

        });

        const reserved = await Seat.countDocuments({

            status: "Reserved"

        });

        res.status(200).json({

            success: true,

            totalSeats,

            available,

            booked,

            reserved

        });

    } catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

// =====================================
// Auto Seat Allot
// (Call after Payment Success)
// =====================================

exports.autoAllotSeat = async (req, res) => {

    try {

        const { studentId } = req.params;

        // Check Student

        const student = await Student.findById(studentId);

        if (!student) {

            return res.status(404).json({
                success: false,
                message: "Student Not Found"
            });

        }

        // Already has seat

        if (student.seatNumber) {

            return res.status(400).json({
                success: false,
                message: "Seat Already Allotted"
            });

        }

        // Payment Check

        if (student.feesStatus !== "Paid") {

            return res.status(400).json({
                success: false,
                message: "Please Complete Payment First"
            });

        }

        // Find First Available Seat

        const seat = await Seat.findOne({
            status: "Available"
        }).sort({ seatNumber: 1 });

        if (!seat) {

            return res.status(400).json({
                success: false,
                message: "No Seat Available"
            });

        }

        // Seat Update

        seat.status = "Booked";
        seat.student = student._id;
        seat.bookingDate = new Date();

        // 30 Days Validity

        const expiry = new Date();

        expiry.setMonth(expiry.getMonth() + 1);

        seat.expiryDate = expiry;

        await seat.save();

        // Student Update

        student.seatNumber = seat.seatNumber;

        await student.save();

        res.status(200).json({

            success: true,

            message: "Seat Allotted Successfully",

            seat

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

// =====================================
// Release Seat
// =====================================

exports.releaseSeat = async (req, res) => {

    try {

        const { studentId } = req.params;

        const seat = await Seat.findOne({

            student: studentId

        });

        if (!seat) {

            return res.status(404).json({

                success: false,

                message: "Seat Not Found"

            });

        }

        seat.status = "Available";
        seat.student = null;
        seat.bookingDate = null;
        seat.expiryDate = null;

        await seat.save();

        await Student.findByIdAndUpdate(

            studentId,

            {

                seatNumber: null

            }

        );

        res.status(200).json({

            success: true,

            message: "Seat Released Successfully"

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

// =====================================
// Change Seat
// =====================================

exports.changeSeat = async (req, res) => {

    try {

        const {

            studentId,

            newSeatNumber

        } = req.body;

        const student = await Student.findById(studentId);

        if (!student) {

            return res.status(404).json({

                success: false,

                message: "Student Not Found"

            });

        }

        const oldSeat = await Seat.findOne({

            student: studentId

        });

        const newSeat = await Seat.findOne({

            seatNumber: newSeatNumber

        });

        if (!newSeat) {

            return res.status(404).json({

                success: false,

                message: "Seat Not Found"

            });

        }

        if (newSeat.status !== "Available") {

            return res.status(400).json({

                success: false,

                message: "Seat Already Occupied"

            });

        }

        // Release Old Seat

        if (oldSeat) {

            oldSeat.status = "Available";
            oldSeat.student = null;
            oldSeat.bookingDate = null;
            oldSeat.expiryDate = null;

            await oldSeat.save();

        }

        // Assign New Seat

        newSeat.status = "Booked";
        newSeat.student = student._id;
        newSeat.bookingDate = new Date();

        await newSeat.save();

        student.seatNumber = newSeat.seatNumber;

        await student.save();

        res.status(200).json({

            success: true,

            message: "Seat Changed Successfully",

            seatNumber: newSeat.seatNumber

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

};

    