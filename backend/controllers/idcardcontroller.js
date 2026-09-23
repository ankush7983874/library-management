const Student = require("../models/Student");

const generateQRCode = require("../utils/qrGenerator");

const generatePDF = require("../utils/pdfGenerator");

const path = require("path");

const fs = require("fs");

// =====================================
// Generate Student ID Card
// =====================================

exports.generateIDCard = async (req, res) => {

    try {

        const studentId = req.params.studentId;

        // ===========================
        // Find Student
        // ===========================

        const student = await Student.findById(studentId);

        if (!student) {

            return res.status(404).json({

                success: false,

                message: "Student Not Found"

            });

        }

        // ===========================
        // Payment Check
        // ===========================

        if (student.feesStatus !== "Paid") {

            return res.status(400).json({

                success: false,

                message: "Fees Not Paid"

            });

        }

        // ===========================
        // Seat Check
        // ===========================

        if (!student.seatNumber) {

            return res.status(400).json({

                success: false,

                message: "Seat Not Allotted"

            });

        }

        // ===========================
        // Already Generated
        // ===========================

        if (student.idCardGenerated) {

            return res.status(200).json({

                success: true,

                message: "ID Card Already Generated",

                student

            });

        }

        // ===========================
        // Generate ID Number
        // ===========================

        student.idCardNumber = student.studentId;

        // ===========================
        // Valid Till
        // ===========================

        let valid = new Date();

        valid.setFullYear(valid.getFullYear() + 1);

        student.validTill = valid;

                // ===========================
        // Generate QR Code
        // ===========================

        const qrResult = await generateQRCode(student);

        if (!qrResult.success) {

            return res.status(500).json({

                success: false,

                message: "QR Code Generation Failed"

            });

        }

        // Save QR File Name

        student.qrCode = qrResult.qrName;

        // ===========================
        // Generate PDF ID Card
        // ===========================

        const pdfResult = await generatePDF(student);

        student.idCardPDF = pdfResult.pdfName;

        // ===========================
        // Mark Generated
        // ===========================

        student.idCardGenerated = true;

        await student.save();

        // ===========================
        // Response
        // ===========================

        res.status(200).json({

            success: true,

            message: "ID Card Generated Successfully",

            student: {

                id: student._id,

                studentId: student.studentId,

                idCardNumber: student.idCardNumber,

                fullName: student.fullName,

                seatNumber: student.seatNumber,

                qrCode: student.qrCode,

                pdf: student.idCardPDF,

                validTill: student.validTill

            }

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

// =====================================
// Download Student ID Card
// =====================================

exports.downloadIDCard = async (req, res) => {

    try {

        const student = await Student.findById(req.params.studentId);

        if (!student) {

            return res.status(404).json({

                success: false,

                message: "Student Not Found"

            });

        }

        if (!student.idCardGenerated) {

            return res.status(400).json({

                success: false,

                message: "ID Card Not Generated"

            });

        }

        const pdfPath = path.join(

            __dirname,

            "../uploads/idcards",

            student.idCardPDF

        );

        if (!fs.existsSync(pdfPath)) {

            return res.status(404).json({

                success: false,

                message: "PDF File Not Found"

            });

        }

        res.download(pdfPath);

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

// =====================================
// View Student ID Card
// =====================================

exports.viewIDCard = async (req, res) => {

    try {

        const student = await Student.findById(req.params.studentId);

        if (!student) {

            return res.status(404).json({

                success: false,

                message: "Student Not Found"

            });

        }

        if (!student.idCardGenerated) {

            return res.status(400).json({

                success: false,

                message: "ID Card Not Generated"

            });

        }

        res.status(200).json({

            success: true,

            student: {

                studentId: student.studentId,

                idCardNumber: student.idCardNumber,

                fullName: student.fullName,

                mobile: student.mobile,

                email: student.email,

                seatNumber: student.seatNumber,

                feesStatus: student.feesStatus,

                qrCode: student.qrCode,

                idCardPDF: student.idCardPDF,

                validTill: student.validTill

            }

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

// =====================================
// Verify Student (QR Scan)
// =====================================

exports.verifyStudent = async (req, res) => {

    try {

        let student = await Student.findOne({
            studentId: req.params.studentId
        });

        if (!student && req.params.studentId.match(/^[0-9a-fA-F]{24}$/)) {
            student = await Student.findById(req.params.studentId);
        }

        if (!student) {

            return res.status(404).json({

                success: false,

                message: "Invalid Student"

            });

        }

        res.status(200).json({

            success: true,

            verified: true,

            student: {

                name: student.fullName,

                studentId: student.studentId,

                seatNumber: student.seatNumber || "Not Assigned",

                feesStatus: student.feesStatus || "Pending",

                accountStatus: student.accountStatus || "Active",

                validTill: student.validTill,

                libraryName: "BarnalaByte Smart Library"

            }

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

