const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");

dotenv.config({ path: path.join(__dirname, ".env") });

const connectDB = require("./config/db.js");
const Student = require("./models/student.js");
const Attendance = require("./models/attendance.js");
const attendanceController = require("./controllers/attendancecontroller.js");
const faceController = require("./controllers/faceController.js");

async function runTests() {
    console.log("=========================================");
    console.log("Testing Complete Attendance System");
    console.log("=========================================\n");

    try {
        await connectDB();

        // 1. Create or retrieve test student
        const testMobile = "9876543210";
        let testStudent = await Student.findOne({ mobile: testMobile });

        if (!testStudent) {
            testStudent = await Student.create({
                fullName: "Test Student Attendance",
                fatherName: "Test Father",
                mobile: testMobile,
                email: "test.attendance@example.com",
                gender: "Male",
                course: "B.Tech",
                college: "Test University",
                address: "Barnala, Punjab",
                shift: "Full Day",
                password: "password123",
                studentId: "STU-TEST-ATTENDANCE",
                faceRegistered: false,
                faceVerified: false
            });
            console.log("✅ Created Test Student:", testStudent._id);
        } else {
            console.log("✅ Found Existing Test Student:", testStudent._id);
        }

        // Clean up prior test attendance records for clean test run
        await Attendance.deleteMany({ student: testStudent._id });

        // Reset student face fields for initial test step
        testStudent.faceRegistered = false;
        testStudent.faceData = undefined;
        testStudent.faceVerified = false;
        await testStudent.save();

        const mockRes = () => {
            const res = {};
            res.statusCode = 200;
            res.status = (code) => {
                res.statusCode = code;
                return res;
            };
            res.json = (data) => {
                res.body = data;
                return res;
            };
            return res;
        };

        // ----------------------------------------------------
        // TEST 1: Check-in before face registration should fail (400)
        // ----------------------------------------------------
        console.log("\n--- TEST 1: Check-in without face registration ---");
        let req = {
            user: { _id: testStudent._id, role: "student" },
            body: {
                latitude: 30.3782,
                longitude: 75.5459,
                faceData: "live_webcam_frame_test_data"
            }
        };
        let res = mockRes();
        await attendanceController.checkIn(req, res);

        if (res.statusCode === 400 && res.body.message.includes("Face registration required")) {
            console.log("✅ PASSED: Correctly blocked unregistered student (Status: 400)");
        } else {
            throw new Error(`TEST 1 FAILED: Unexpected response ${res.statusCode} - ${JSON.stringify(res.body)}`);
        }

        // ----------------------------------------------------
        // TEST 2: Register Face via /api/face/register
        // ----------------------------------------------------
        console.log("\n--- TEST 2: Face Registration ---");
        req = {
            body: {
                studentId: testStudent._id,
                faceData: "live_webcam_reference_descriptor_string_test_123"
            }
        };
        res = mockRes();
        await faceController.registerFace(req, res);

        if (res.statusCode === 200 && res.body.success) {
            console.log("✅ PASSED: Face profile registered successfully");
        } else {
            throw new Error(`TEST 2 FAILED: ${JSON.stringify(res.body)}`);
        }

        // Verify status endpoint
        req = { params: { studentId: testStudent._id } };
        res = mockRes();
        await faceController.getFaceStatus(req, res);
        if (res.body.faceRegistered === true) {
            console.log("✅ PASSED: Face status verified as registered");
        } else {
            throw new Error("TEST 2 Status Check FAILED");
        }

        // ----------------------------------------------------
        // TEST 3: Check-in outside 20m Geofence (> 20m) should fail (400)
        // ----------------------------------------------------
        console.log("\n--- TEST 3: Check-in outside 20m Geofence ---");
        req = {
            user: { _id: testStudent._id, role: "student" },
            body: {
                latitude: 30.4000, // ~2.4km away from 30.3782
                longitude: 75.5459,
                faceData: "live_webcam_reference_descriptor_string_test_123"
            }
        };
        res = mockRes();
        await attendanceController.checkIn(req, res);

        if (res.statusCode === 400 && res.body.message.includes("20 meter")) {
            console.log(`✅ PASSED: Correctly rejected distance > 20m (Status: 400, Msg: "${res.body.message}")`);
        } else {
            throw new Error(`TEST 3 FAILED: Unexpected response ${res.statusCode} - ${JSON.stringify(res.body)}`);
        }

        // ----------------------------------------------------
        // TEST 4: Check-in with Mismatching Face should fail (400)
        // ----------------------------------------------------
        console.log("\n--- TEST 4: Check-in with mismatching face ---");
        req = {
            user: { _id: testStudent._id, role: "student" },
            body: {
                latitude: 30.3782,
                longitude: 75.5459,
                faceData: "hacker_attacker_different_face_payload_99999"
            }
        };
        res = mockRes();
        await attendanceController.checkIn(req, res);

        if (res.statusCode === 400 && res.body.message.includes("Face verification failed")) {
            console.log("✅ PASSED: Correctly rejected mismatching face descriptor (Status: 400)");
        } else {
            throw new Error(`TEST 4 FAILED: Unexpected response ${res.statusCode} - ${JSON.stringify(res.body)}`);
        }

        // ----------------------------------------------------
        // TEST 5: Valid Check-in inside 20m Geofence should succeed (201)
        // ----------------------------------------------------
        console.log("\n--- TEST 5: Valid Check-in within 20m Geofence ---");
        req = {
            user: { _id: testStudent._id, role: "student" },
            body: {
                latitude: 30.3782,
                longitude: 75.5459,
                accuracy: 3,
                faceData: "live_webcam_reference_descriptor_string_test_123"
            }
        };
        res = mockRes();
        await attendanceController.checkIn(req, res);

        if (res.statusCode === 201 && res.body.success) {
            console.log(`✅ PASSED: Entry attendance marked (Status: 201, Distance: ${res.body.attendance.distanceMeters}m)`);
        } else {
            throw new Error(`TEST 5 FAILED: ${JSON.stringify(res.body)}`);
        }

        // ----------------------------------------------------
        // TEST 6: Duplicate Check-in should fail (409 Conflict)
        // ----------------------------------------------------
        console.log("\n--- TEST 6: Duplicate Check-in protection ---");
        req = {
            user: { _id: testStudent._id, role: "student" },
            body: {
                latitude: 30.3782,
                longitude: 75.5459,
                faceData: "live_webcam_reference_descriptor_string_test_123"
            }
        };
        res = mockRes();
        await attendanceController.checkIn(req, res);

        if (res.statusCode === 409 && res.body.message.includes("active library session")) {
            console.log("✅ PASSED: Correctly blocked duplicate check-in (Status: 409)");
        } else {
            throw new Error(`TEST 6 FAILED: Unexpected response ${res.statusCode} - ${JSON.stringify(res.body)}`);
        }

        // ----------------------------------------------------
        // TEST 7: Check-out inside 20m Geofence should succeed (200)
        // ----------------------------------------------------
        console.log("\n--- TEST 7: Valid Check-out within 20m Geofence ---");
        req = {
            user: { _id: testStudent._id, role: "student" },
            body: {
                latitude: 30.3782,
                longitude: 75.5459,
                accuracy: 3,
                faceData: "live_webcam_reference_descriptor_string_test_123"
            }
        };
        res = mockRes();
        await attendanceController.checkOut(req, res);

        if (res.statusCode === 200 && res.body.success) {
            console.log(`✅ PASSED: Exit attendance marked (Status: 200, Duration: ${res.body.attendance.durationFormatted})`);
        } else {
            throw new Error(`TEST 7 FAILED: ${JSON.stringify(res.body)}`);
        }

        // ----------------------------------------------------
        // TEST 8: Second Check-out without active session should fail (409)
        // ----------------------------------------------------
        console.log("\n--- TEST 8: Check-out without active session ---");
        req = {
            user: { _id: testStudent._id, role: "student" },
            body: {
                latitude: 30.3782,
                longitude: 75.5459,
                faceData: "live_webcam_reference_descriptor_string_test_123"
            }
        };
        res = mockRes();
        await attendanceController.checkOut(req, res);

        if (res.statusCode === 409 && res.body.message.includes("No active library session")) {
            console.log("✅ PASSED: Correctly blocked check-out without open session (Status: 409)");
        } else {
            throw new Error(`TEST 8 FAILED: Unexpected response ${res.statusCode} - ${JSON.stringify(res.body)}`);
        }

        // ----------------------------------------------------
        // TEST 9: Owner Attendance Overview API
        // ----------------------------------------------------
        console.log("\n--- TEST 9: Owner Attendance Dashboard API ---");
        req = { user: { role: "owner" } };
        res = mockRes();
        await attendanceController.ownerTodayAttendance(req, res);

        if (res.statusCode === 200 && res.body.success && res.body.summary) {
            console.log(`✅ PASSED: Owner summary retrieved (Total entries today: ${res.body.summary.totalEntries})`);
        } else {
            throw new Error(`TEST 9 FAILED: ${JSON.stringify(res.body)}`);
        }

        console.log("\n=========================================");
        console.log("🎉 ALL 9 ATTENDANCE SYSTEM TESTS PASSED!");
        console.log("=========================================\n");

        process.exit(0);

    } catch (err) {
        console.error("\n❌ ATTENDANCE TEST FAILURE:", err.message);
        process.exit(1);
    }
}

runTests();
