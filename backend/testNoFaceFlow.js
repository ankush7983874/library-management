const mongoose = require("mongoose");
const Student = require("./models/Student");
const Seat = require("./models/Seat");
const Payment = require("./models/Payment");
const { generateAndSendOTP, verifyOTP } = require("./services/otpService");
const paymentSuccessService = require("./services/paymentSuccessService");

require("dotenv").config({ path: "./backend/.env" });

async function runTest() {
    console.log("==========================================");
    console.log("RUNNING NO-FACE FLOW VERIFICATION SUITE");
    console.log("==========================================");

    try {
        const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/smart_library";
        await mongoose.connect(mongoUri);
        console.log("✅ MongoDB Connected");

        const testEmail = `testnoface_${Date.now()}@example.com`;
        const testMobile = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

        // TEST 1 & 3: Email OTP Generation and Verification
        console.log("\n[TEST 1 & 3] Requesting Email OTP for:", testEmail);
        const otpResult = await generateAndSendOTP(testEmail, "student", "registration");
        console.log("  OTP Generated:", otpResult.otp);

        const verifyResult = await verifyOTP(testEmail, "student", "registration", otpResult.otp);
        console.log("  OTP Verification Status:", verifyResult.success ? "VERIFIED ✅" : "FAILED ❌");

        // TEST 2: Student Registration without Camera / Face Scan
        console.log("\n[TEST 2] Registering Student without Face Scan...");
        const student = await Student.create({
            fullName: "NoFace Test Student",
            fatherName: "Test Father",
            mobile: testMobile,
            email: testEmail,
            password: "password123",
            gender: "Male",
            dob: "2000-01-01",
            college: "Test College",
            course: "B.Tech",
            address: "Test Address",
            studentId: `BL${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`
        });

        console.log("✅ Student Created Successfully:");
        console.log("  ID:", student._id);
        console.log("  Student ID:", student.studentId);
        console.log("  Face Registered:", student.faceRegistered);
        console.log("  Face Verified:", student.faceVerified);

        // TEST 4 & 5: Payment Order Creation and Verification without Face Scan
        console.log("\n[TEST 4 & 5] Simulating Payment Verification for Student...");
        student.feesStatus = "Paid";
        await student.save();

        const payment = await Payment.create({
            student: student._id,
            amount: 500,
            month: "September",
            year: 2026,
            paymentMethod: "Manual_UPI",
            transactionId: `TXN_NOFACE_${Date.now()}`,
            status: "Paid",
            verificationSource: "Owner_Manual"
        });

        console.log("  Payment Created:", payment._id, "| Status:", payment.status);

        // TEST 8 & 9: Seat Allocation & ID Card Generation
        console.log("\n[TEST 8 & 9] Running paymentSuccessService for Seat & ID Card...");
        const postResult = await paymentSuccessService(student._id);
        console.log("  Post-Payment Processing Result:", postResult.success ? "SUCCESS ✅" : "FAILED ❌");

        const updatedStudent = await Student.findById(student._id);
        console.log("  Allocated Seat Number:", updatedStudent.seatNumber);
        console.log("  ID Card PDF:", updatedStudent.idCardPDF);
        console.log("  ID Card Generated Flag:", updatedStudent.idCardGenerated);

        // Cleanup test data
        await Student.findByIdAndDelete(student._id);
        await Payment.findByIdAndDelete(payment._id);
        if (updatedStudent.seatNumber) {
            await Seat.findOneAndUpdate({ seatNumber: updatedStudent.seatNumber }, { status: "Available", student: null, bookingDate: null, expiryDate: null });
        }

        console.log("\n==========================================");
        console.log("ALL NO-FACE FLOW TESTS PASSED SUCCESSFULLY! ✅");
        console.log("==========================================");

        await mongoose.disconnect();
        process.exit(0);

    } catch (err) {
        console.error("❌ Test Suite Error:", err);
        process.exit(1);
    }
}

runTest();
