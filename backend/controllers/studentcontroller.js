const Student = require("../models/student");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { isOTPVerified, consumeOTPVerification } = require("../services/otpService");

// ======================================
// Generate JWT Token
// ======================================

const generateToken = (id) => {
    return jwt.sign(
        { id, role: "student" },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d",
        }
    );
};

// ======================================
// Register Student
// ======================================

exports.registerStudent = async (req, res) => {

    try {

        const {

            fullName,
            fatherName,
            motherName,
            mobile,
            email,
            password,
            gender,
            dob,
            college,
            course,
            address

        } = req.body;

        // Validation

        if (
            !fullName ||
            !fatherName ||
            !mobile ||
            !email ||
            !password ||
            !gender ||
            !dob
        ) {

            return res.status(400).json({

                success: false,
                message: "Please fill all required fields."

            });

        }

        // OTP Verification Check
        const verified = await isOTPVerified(email, "student", "registration");

        if (!verified) {
            return res.status(400).json({
                success: false,
                message: "Please verify your email with OTP before registration."
            });
        }

        // Create Student
        const student = await Student.create({
            fullName,
            fatherName,
            motherName,
            mobile,
            email,
            password,
            gender,
            dob,
            college,
            course,
            address,
            photo: req.file ? req.file.filename : "",
            faceData: String(req.body.faceData || "").trim(),
            faceRegistered: !!req.body.faceData,
            faceVerified: !!req.body.faceData,
            studentId: `BL${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`,
            seatNumber: null,
            feesStatus: "Pending",
            accountStatus: "Active"
        });

        // AUTOMATIC ID CARD GENERATION UPON REGISTRATION
        student.idCardNumber = student.studentId;
        let validTill = new Date();
        validTill.setFullYear(validTill.getFullYear() + 1);
        student.validTill = validTill;

        try {
            const generateQRCode = require("../utils/qrGenerator");
            const generatePDF = require("../utils/pdfGenerator");

            const qrResult = await generateQRCode(student);
            if (qrResult && qrResult.success) {
                student.qrCode = qrResult.qrName;
            }

            const pdfResult = await generatePDF(student);
            if (pdfResult && pdfResult.pdfName) {
                student.idCardPDF = pdfResult.pdfName;
                student.idCardGenerated = true;
            }
        } catch (idErr) {
            console.error("Auto ID Card Generation Error during registration:", idErr.message);
        }

        await student.save();

        // Consume OTP verification
        await consumeOTPVerification(email, "student", "registration");

        res.status(201).json({
            success: true,
            message: "Student Account Registered & ID Card Automatically Generated",
            token: generateToken(student._id),
            student,
            idCard: {
                idCardNumber: student.idCardNumber,
                idCardGenerated: student.idCardGenerated,
                idCardPDF: student.idCardPDF ? `/api/idcard/download/${student._id}` : null,
                qrCode: student.qrCode
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

// ======================================
// Login Student
// ======================================

exports.loginStudent = async (req, res) => {

    try {

        const {

            email,
            password

        } = req.body;

        if (!email || !password) {

            return res.status(400).json({

                success: false,

                message: "Email and Password are required."

            });

        }

        const student = await Student.findOne({ email });

        if (!student) {

            return res.status(404).json({

                success: false,

                message: "Student not found."

            });

        }

        // Account Check

        if (student.accountStatus === "Blocked") {

            return res.status(401).json({

                success: false,

                message: "Your account has been blocked."

            });

        }

        const isMatch = await bcrypt.compare(

            password,

            student.password

        );

        if (!isMatch) {

            return res.status(401).json({

                success: false,

                message: "Invalid Password."

            });

        }

        res.status(200).json({

            success: true,

            message: "Login Successful",

            token: generateToken(student._id),

            student

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

// ======================================
// Get Student Profile
// ======================================

exports.getStudentProfile = async (req, res) => {

    try {

        const student = await Student.findById(req.params.id)
            .select("-password");

        if (!student) {

            return res.status(404).json({

                success: false,
                message: "Student Not Found"

            });

        }

        res.status(200).json({

            success: true,
            student

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,
            message: error.message

        });

    }

};

// ======================================
// Get All Students
// ======================================

exports.getAllStudents = async (req, res) => {

    try {

        const students = await Student.find()
            .select("-password")
            .sort({ createdAt: -1 });

        res.status(200).json({

            success: true,
            totalStudents: students.length,
            students

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,
            message: error.message

        });

    }

};

// ======================================
// Update Student
// ======================================

exports.updateStudent = async (req, res) => {

    try {

        const student = await Student.findById(req.params.id);

        if (!student) {

            return res.status(404).json({

                success: false,
                message: "Student Not Found"

            });

        }

        student.fullName = req.body.fullName || student.fullName;
        student.fatherName = req.body.fatherName || student.fatherName;
        student.motherName = req.body.motherName || student.motherName;
        student.mobile = req.body.mobile || student.mobile;
        student.email = req.body.email || student.email;
        student.gender = req.body.gender || student.gender;
        student.dob = req.body.dob || student.dob;
        student.college = req.body.college || student.college;
        student.course = req.body.course || student.course;
        student.address = req.body.address || student.address;

        if (req.body.seatNumber !== undefined) {

            student.seatNumber = req.body.seatNumber;

        }

        if (req.body.feesStatus) {

            student.feesStatus = req.body.feesStatus;

        }

        if (req.body.accountStatus) {

            student.accountStatus = req.body.accountStatus;

        }

        if (req.file) {

            student.photo = req.file.filename;

        }

        await student.save();

        res.status(200).json({

            success: true,
            message: "Student Updated Successfully",
            student

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,
            message: error.message

        });

    }

};

// ======================================
// Delete Student
// ======================================

exports.deleteStudent = async (req, res) => {

    try {

        const student = await Student.findById(req.params.id);

        if (!student) {

            return res.status(404).json({

                success: false,
                message: "Student Not Found"

            });

        }

        await Student.findByIdAndDelete(req.params.id);

        res.status(200).json({

            success: true,
            message: "Student Deleted Successfully"

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,
            message: error.message

        });

    }

};

// ======================================
// Search Student
// ======================================

exports.searchStudent = async (req, res) => {

    try {

        const keyword = req.query.keyword || "";

        const students = await Student.find({

            $or: [

                { fullName: { $regex: keyword, $options: "i" } },

                { mobile: { $regex: keyword, $options: "i" } },

                { email: { $regex: keyword, $options: "i" } },

                { seatNumber: { $regex: keyword, $options: "i" } }

            ]

        }).select("-password");

        res.status(200).json({

            success: true,

            totalStudents: students.length,

            students

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

// ======================================
// Change Password
// ======================================

exports.changePassword = async (req, res) => {

    try {

        const { oldPassword, newPassword } = req.body;

        const student = await Student.findById(req.params.id);

        if (!student) {

            return res.status(404).json({

                success: false,

                message: "Student Not Found"

            });

        }

        const isMatch = await bcrypt.compare(

            oldPassword,

            student.password

        );

        if (!isMatch) {

            return res.status(400).json({

                success: false,

                message: "Old Password is Incorrect"

            });

        }

        const salt = await bcrypt.genSalt(10);

        student.password = await bcrypt.hash(

            newPassword,

            salt

        );

        await student.save();

        res.status(200).json({

            success: true,

            message: "Password Changed Successfully"

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

// ======================================
// Student Dashboard
// ======================================

exports.studentDashboard = async (req, res) => {

    try {

        const student = await Student.findById(req.params.id)
            .select("-password");

        if (!student) {

            return res.status(404).json({

                success: false,

                message: "Student Not Found"

            });

        }

        res.status(200).json({

            success: true,

            student,

            dashboard: {

                emailOTPStatus: "Verified",

                faceVerificationStatus: student.faceVerified ? "Verified" : "Pending",

                feesStatus: student.feesStatus || "Pending",

                seatNumber: student.seatNumber || null,

                accountStatus: student.accountStatus || "Active",

                idCardGenerated: !!student.idCardGenerated,

                idCardPDF: student.idCardPDF ? `/api/idcard/download/${student._id}` : null,

                qrCode: student.qrCode || null

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

// ======================================
// Student Statistics
// ======================================

exports.studentStats = async (req, res) => {

    try {

        const totalStudents = await Student.countDocuments();

        const activeStudents = await Student.countDocuments({

            accountStatus: "Active"

        });

        const blockedStudents = await Student.countDocuments({

            accountStatus: "Blocked"

        });

        const paidStudents = await Student.countDocuments({

            feesStatus: "Paid"

        });

        const pendingStudents = await Student.countDocuments({

            feesStatus: "Pending"

        });

        res.status(200).json({

            success: true,

            totalStudents,

            activeStudents,

            blockedStudents,

            paidStudents,

            pendingStudents

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


 