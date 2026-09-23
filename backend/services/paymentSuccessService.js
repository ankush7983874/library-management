const Student = require("../models/Student");
const Seat = require("../models/Seat");
const Waiting = require("../models/Waiting");

const generateQRCode = require("../utils/qrGenerator");
const generatePDF = require("../utils/pdfGenerator");

// ======================================
// Payment Success Service
// ======================================

const paymentSuccessService = async (studentId) => {

    try {

        // ============================
        // Find Student
        // ============================

        const student = await Student.findById(studentId);

        if (!student) {

            throw new Error("Student Not Found");

        }

        // ============================
        // Already Seat Allotted Case
        // ============================
        if (student.seatNumber) {
            student.feesStatus = "Paid";
            student.accountStatus = "Active";
            
            let validTill = new Date();
            validTill.setFullYear(validTill.getFullYear() + 1);
            student.validTill = validTill;

            try {
                const qr = await generateQRCode(student);
                if (qr && qr.success) {
                    student.qrCode = qr.qrName;
                }
                const pdf = await generatePDF(student);
                if (pdf && pdf.pdfName) {
                    student.idCardPDF = pdf.pdfName;
                    student.idCardGenerated = true;
                }
            } catch (err) {
                console.error("ID Card regeneration error:", err.message);
            }

            await student.save();

            return {
                success: true,
                message: "Payment Verified. Existing Seat Retained & ID Card Updated.",
                student: {
                    id: student._id,
                    studentId: student.studentId,
                    fullName: student.fullName,
                    seatNumber: student.seatNumber,
                    feesStatus: student.feesStatus,
                    accountStatus: student.accountStatus,
                    idCardGenerated: student.idCardGenerated,
                    qrCode: student.qrCode,
                    idCardPDF: student.idCardPDF
                }
            };
        }

        // ============================
        // Find Available Seat
        // ============================

        const seat = await Seat.findOne({

            status: "Available"

        }).sort({

            seatNumber: 1

        });

        if (!seat) {
            // Phase 5 Requirement: All 150 seats occupied
            // Payment stays Paid, student enters Waiting List, no fake seat assigned
            student.feesStatus = "Paid";
            student.accountStatus = "Waiting";
            await student.save();

            const existingWaiting = await Waiting.findOne({ student: student._id });
            if (!existingWaiting) {
                await Waiting.create({
                    student: student._id,
                    name: student.fullName,
                    mobile: student.mobile,
                    email: student.email,
                    gender: student.gender || "Other",
                    status: "Waiting"
                });
            }

            return {
                success: true,
                waiting: true,
                message: "Payment verified. All 150 seats occupied. Added to Waiting List.",
                student: {
                    id: student._id,
                    fullName: student.fullName,
                    feesStatus: student.feesStatus,
                    accountStatus: student.accountStatus
                }
            };
        }

        // ============================
        // Seat Allot
        // ============================

        seat.status = "Booked";

        seat.student = student._id;

        seat.bookingDate = new Date();

        await seat.save();

        // ============================
        // Update Student
        // ============================

        student.seatNumber = seat.seatNumber;

        student.feesStatus = "Paid";

        student.accountStatus = "Active";

        student.studentId =
            student.studentId ||
            `BL${new Date().getFullYear()}${String(student._id).slice(-4)}`;

        let validTill = new Date();

        validTill.setFullYear(validTill.getFullYear() + 1);

        student.validTill = validTill;

                // ============================
        // Generate QR Code
        // ============================

        const qr = await generateQRCode(student);

        if (!qr.success) {

            throw new Error("QR Code Generation Failed");

        }

        student.qrCode = qr.qrName;

        // ============================
        // Generate PDF ID Card
        // ============================

        const pdf = await generatePDF(student);

        student.idCardGenerated = true;

        student.idCardPDF = pdf.pdfName;

        student.idCardNumber = student.studentId;

        // ============================
        // Save Student & Send Notifications
        // ============================

        await student.save();

        try {
            const { notifyPaymentSuccess, notifySeatAllocation } = require("./notificationService");
            await notifyPaymentSuccess(student, { amount: 500 });
            await notifySeatAllocation(student, seat.seatNumber);
        } catch (notifErr) {
            console.error("Notification trigger error:", notifErr.message);
        }

        // ============================
        // Return Success
        // ============================

        return {

            success: true,

            message: "Seat Allotted & ID Card Generated Successfully",

            student: {

                id: student._id,

                studentId: student.studentId,

                fullName: student.fullName,

                mobile: student.mobile,

                seatNumber: student.seatNumber,

                feesStatus: student.feesStatus,

                accountStatus: student.accountStatus,

                idCardGenerated: student.idCardGenerated,

                qrCode: student.qrCode,

                idCardPDF: student.idCardPDF,

                validTill: student.validTill

            }

        };

    }

    catch (error) {

        return {

            success: false,

            message: error.message

        };

    }

};

module.exports = paymentSuccessService;