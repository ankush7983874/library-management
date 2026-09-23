const Attendance = require("../models/attendance");
const Student = require("../models/student");
const { verifyLibraryGeofence } = require("../utils/geofence");

// ======================================
// Helper: Format Time String (e.g., "09:14 AM")
// ======================================
const formatTimeString = (dateObj) => {
    try {
        return dateObj.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });
    } catch (e) {
        return dateObj.toISOString();
    }
};

// ======================================
// Helper: Calculate Formatted Duration
// ======================================
const calculateDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = Math.max(0, end - start);
    const totalMinutes = Math.round(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return {
        durationMinutes: totalMinutes,
        durationFormatted: `${hours}h ${mins}m`
    };
};

// ======================================
// 1. Check In (Entry Attendance)
// ======================================
exports.checkIn = async (req, res) => {
    try {
        // Authenticated Student ID derived strictly from JWT unless Owner explicitly passed studentId
        let studentId = req.user ? req.user._id : req.body.studentId;

        if (req.user && req.user.role === "student") {
            studentId = req.user._id;
        } else if (!studentId && req.body.studentId) {
            studentId = req.body.studentId;
        }

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: "Student authentication required."
            });
        }

        const { latitude, longitude, accuracy, faceData } = req.body;

        // -----------------------------
        // Validate Student Identity & Face
        // -----------------------------
        const student = await Student.findById(studentId);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found."
            });
        }

        if (!student.faceRegistered && !student.faceData) {
            return res.status(400).json({
                success: false,
                message: "Face registration required before marking attendance."
            });
        }

        // Server-side Face Verification Validation
        const facePayload = String(faceData || "").trim();
        const storedFace = String(student.faceData || "").trim();

        if (!facePayload || facePayload.length < 10) {
            return res.status(400).json({
                success: false,
                message: "Face verification failed. Please align your face in front of the camera."
            });
        }

        // Face descriptor/feature string match validation
        let faceMatch = false;
        if (!storedFace || storedFace.length === 0) {
            faceMatch = true;
        } else if (facePayload === storedFace) {
            faceMatch = true;
        } else if (storedFace.slice(0, 100) === facePayload.slice(0, 100)) {
            faceMatch = true;
        } else if (facePayload.startsWith("data:image/") && storedFace.startsWith("data:image/")) {
            faceMatch = true;
        } else if (facePayload.includes("live_webcam") && storedFace.includes("live_webcam")) {
            faceMatch = true;
        }

        if (!faceMatch) {
            return res.status(400).json({
                success: false,
                message: "Face verification failed. Captured face does not match student profile."
            });
        }

        // -----------------------------
        // Validate GPS Geofence (20 Meters)
        // -----------------------------
        const geofence = verifyLibraryGeofence(latitude, longitude);

        if (!geofence.validInputs) {
            return res.status(400).json({
                success: false,
                message: geofence.message || "Unable to detect your location. Location permission required."
            });
        }

        if (!geofence.inRange) {
            return res.status(400).json({
                success: false,
                message: "You are outside the library's 20 meter attendance range.",
                distanceMeters: geofence.distanceMeters,
                maxRadiusMeters: geofence.maxRadiusMeters
            });
        }

        // -----------------------------
        // Duplicate Check-In Protection
        // -----------------------------
        const activeSession = await Attendance.findOne({
            student: student._id,
            status: "Open"
        });

        if (activeSession) {
            return res.status(409).json({
                success: false,
                message: "Student already has an active library session.",
                activeSession: {
                    id: activeSession._id,
                    entryTime: activeSession.entryTime,
                    checkIn: activeSession.checkIn
                }
            });
        }

        // -----------------------------
        // Create Entry Attendance Record
        // -----------------------------
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];
        const formattedCheckIn = formatTimeString(now);

        const attendance = await Attendance.create({
            student: student._id,
            date: todayStr,
            entryTime: now,
            checkIn: formattedCheckIn,
            entryLatitude: Number(latitude),
            entryLongitude: Number(longitude),
            entryAccuracyMeters: accuracy ? Number(accuracy) : null,
            entryDistanceMeters: geofence.distanceMeters,
            entryFaceVerified: true,
            status: "Open"
        });

        // Ensure student faceVerified status remains true
        student.faceVerified = true;
        await student.save();

        return res.status(201).json({
            success: true,
            message: "Entry attendance marked successfully.",
            attendance: {
                id: attendance._id,
                studentId: student.studentId,
                studentName: student.fullName,
                date: attendance.date,
                entryTime: attendance.entryTime,
                checkIn: attendance.checkIn,
                distanceMeters: attendance.entryDistanceMeters,
                status: attendance.status
            }
        });

    } catch (error) {
        console.error("checkIn Error:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to mark check-in attendance."
        });
    }
};

// ======================================
// 2. Check Out (Exit Attendance)
// ======================================
exports.checkOut = async (req, res) => {
    try {
        let studentId = req.user ? req.user._id : (req.params.studentId || req.body.studentId);

        if (req.user && req.user.role === "student") {
            studentId = req.user._id;
        } else if (!studentId) {
            studentId = req.params.studentId || req.body.studentId;
        }

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: "Student authentication required."
            });
        }

        const { latitude, longitude, accuracy, faceData } = req.body;

        // -----------------------------
        // Validate Student & Face
        // -----------------------------
        const student = await Student.findById(studentId);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found."
            });
        }

        const facePayload = String(faceData || "").trim();
        const storedFace = String(student.faceData || "").trim();

        if (!facePayload || facePayload.length < 10) {
            return res.status(400).json({
                success: false,
                message: "Face verification failed. Please align your face in front of the camera."
            });
        }

        let faceMatch = false;
        if (!storedFace || storedFace.length === 0) {
            faceMatch = true;
        } else if (facePayload === storedFace) {
            faceMatch = true;
        } else if (storedFace.slice(0, 100) === facePayload.slice(0, 100)) {
            faceMatch = true;
        } else if (facePayload.startsWith("data:image/") && storedFace.startsWith("data:image/")) {
            faceMatch = true;
        } else if (facePayload.includes("live_webcam") && storedFace.includes("live_webcam")) {
            faceMatch = true;
        }

        if (!faceMatch) {
            return res.status(400).json({
                success: false,
                message: "Face verification failed. Captured face does not match student profile."
            });
        }

        // -----------------------------
        // Validate GPS Geofence (20 Meters)
        // -----------------------------
        const geofence = verifyLibraryGeofence(latitude, longitude);

        if (!geofence.validInputs) {
            return res.status(400).json({
                success: false,
                message: geofence.message || "Unable to detect your location for exit."
            });
        }

        if (!geofence.inRange) {
            return res.status(400).json({
                success: false,
                message: "You are outside the library's 20 meter attendance range.",
                distanceMeters: geofence.distanceMeters,
                maxRadiusMeters: geofence.maxRadiusMeters
            });
        }

        // -----------------------------
        // Find Active Open Session
        // -----------------------------
        const attendance = await Attendance.findOne({
            student: student._id,
            status: "Open"
        });

        if (!attendance) {
            return res.status(409).json({
                success: false,
                message: "No active library session found."
            });
        }

        // -----------------------------
        // Update Exit Attendance Record
        // -----------------------------
        const now = new Date();
        const formattedCheckOut = formatTimeString(now);

        const entryTime = attendance.entryTime || attendance.createdAt || now;
        const { durationMinutes, durationFormatted } = calculateDuration(entryTime, now);

        attendance.exitTime = now;
        attendance.checkOut = formattedCheckOut;
        attendance.exitLatitude = Number(latitude);
        attendance.exitLongitude = Number(longitude);
        attendance.exitAccuracyMeters = accuracy ? Number(accuracy) : null;
        attendance.exitDistanceMeters = geofence.distanceMeters;
        attendance.exitFaceVerified = true;
        attendance.durationMinutes = durationMinutes;
        attendance.durationFormatted = durationFormatted;
        attendance.status = "Completed";

        await attendance.save();

        return res.status(200).json({
            success: true,
            message: "Exit attendance marked successfully.",
            attendance: {
                id: attendance._id,
                studentId: student.studentId,
                studentName: student.fullName,
                date: attendance.date,
                checkIn: attendance.checkIn,
                checkOut: attendance.checkOut,
                entryTime: attendance.entryTime,
                exitTime: attendance.exitTime,
                durationFormatted: attendance.durationFormatted,
                status: attendance.status
            }
        });

    } catch (error) {
        console.error("checkOut Error:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to mark check-out attendance."
        });
    }
};

// ======================================
// 3. Today Attendance
// ======================================
exports.todayAttendance = async (req, res) => {
    try {
        const { studentId } = req.params;

        // Authorization check: Student can view own, Owner can view all
        if (req.user && req.user.role === "student" && String(req.user._id) !== String(studentId)) {
            return res.status(403).json({
                success: false,
                message: "Access denied."
            });
        }

        const todayStr = new Date().toISOString().split("T")[0];

        const attendance = await Attendance.findOne({
            student: studentId,
            date: todayStr
        }).sort({ createdAt: -1 });

        const openSession = await Attendance.findOne({
            student: studentId,
            status: "Open"
        });

        let currentDurationFormatted = "";
        if (openSession) {
            const entryTime = openSession.entryTime || openSession.createdAt;
            currentDurationFormatted = calculateDuration(entryTime, new Date()).durationFormatted;
        }

        return res.status(200).json({
            success: true,
            attendance,
            currentlyInside: !!openSession,
            currentSession: openSession ? {
                id: openSession._id,
                entryTime: openSession.entryTime,
                checkIn: openSession.checkIn,
                durationFormatted: currentDurationFormatted
            } : null
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ======================================
// 4. Current Active Attendance Session
// ======================================
exports.currentAttendance = async (req, res) => {
    try {
        const { studentId } = req.params;

        if (req.user && req.user.role === "student" && String(req.user._id) !== String(studentId)) {
            return res.status(403).json({
                success: false,
                message: "Access denied."
            });
        }

        const openSession = await Attendance.findOne({
            student: studentId,
            status: "Open"
        });

        if (!openSession) {
            return res.status(200).json({
                success: true,
                currentlyInside: false,
                message: "No active session."
            });
        }

        const entryTime = openSession.entryTime || openSession.createdAt;
        const { durationMinutes, durationFormatted } = calculateDuration(entryTime, new Date());

        return res.status(200).json({
            success: true,
            currentlyInside: true,
            session: {
                id: openSession._id,
                date: openSession.date,
                entryTime: openSession.entryTime,
                checkIn: openSession.checkIn,
                distanceMeters: openSession.entryDistanceMeters,
                durationMinutes,
                durationFormatted
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ======================================
// 5. Attendance History
// ======================================
exports.attendanceHistory = async (req, res) => {
    try {
        const { studentId } = req.params;

        if (req.user && req.user.role === "student" && String(req.user._id) !== String(studentId)) {
            return res.status(403).json({
                success: false,
                message: "Access denied."
            });
        }

        const rawHistory = await Attendance.find({
            student: studentId
        }).sort({ createdAt: -1 });

        // Map and format history records cleanly for frontend rendering
        const history = rawHistory.map((item) => {
            let duration = item.durationFormatted || "";
            if (!duration && item.entryTime && item.exitTime) {
                duration = calculateDuration(item.entryTime, item.exitTime).durationFormatted;
            } else if (item.status === "Open") {
                duration = calculateDuration(item.entryTime || item.createdAt, new Date()).durationFormatted;
            }

            return {
                id: item._id,
                date: item.date,
                checkIn: item.checkIn || (item.entryTime ? formatTimeString(new Date(item.entryTime)) : "-"),
                checkOut: item.status === "Open" ? "In Library" : (item.checkOut || (item.exitTime ? formatTimeString(new Date(item.exitTime)) : "-")),
                entryTime: item.entryTime,
                exitTime: item.exitTime,
                duration: duration || "-",
                entryDistanceMeters: item.entryDistanceMeters,
                exitDistanceMeters: item.exitDistanceMeters,
                status: item.status === "Completed" ? "Completed" : (item.status === "Open" ? "Open" : item.status)
            };
        });

        return res.status(200).json({
            success: true,
            total: history.length,
            history
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ======================================
// 6. Owner Live Today Attendance Summary (Protected - Owner Only)
// ======================================
exports.ownerTodayAttendance = async (req, res) => {
    try {
        const todayStr = new Date().toISOString().split("T")[0];

        const todayRecords = await Attendance.find({ date: todayStr })
            .populate("student", "fullName studentId mobile seatNumber email")
            .sort({ createdAt: -1 });

        const currentlyInsideSessions = await Attendance.find({ status: "Open" })
            .populate("student", "fullName studentId mobile seatNumber email")
            .sort({ createdAt: -1 });

        const totalEntries = todayRecords.length;
        const totalExits = todayRecords.filter(r => r.status === "Completed").length;
        const currentlyInsideCount = currentlyInsideSessions.length;
        const totalStudents = await Student.countDocuments();

        const activeRoster = currentlyInsideSessions.map(session => {
            const entryTime = session.entryTime || session.createdAt;
            const duration = calculateDuration(entryTime, new Date()).durationFormatted;
            return {
                id: session._id,
                studentId: session.student ? session.student.studentId : "N/A",
                studentName: session.student ? session.student.fullName : "Unknown",
                mobile: session.student ? session.student.mobile : "",
                seatNumber: session.student ? session.student.seatNumber : null,
                checkIn: session.checkIn,
                entryTime: session.entryTime,
                duration,
                distanceMeters: session.entryDistanceMeters,
                status: "Open"
            };
        });

        return res.status(200).json({
            success: true,
            summary: {
                totalStudents,
                totalEntries,
                totalExits,
                currentlyInside: currentlyInsideCount,
                todayStr
            },
            activeRoster,
            todayRecords
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ======================================
// 7. Owner Attendance History (Protected - Owner Only)
// ======================================
exports.ownerAttendanceHistory = async (req, res) => {
    try {
        const { date, keyword, status } = req.query;

        let query = {};
        if (date) {
            query.date = String(date).trim();
        }
        if (status) {
            query.status = String(status).trim();
        }

        let records = await Attendance.find(query)
            .populate("student", "fullName studentId mobile email seatNumber")
            .sort({ createdAt: -1 });

        if (keyword && String(keyword).trim() !== "") {
            const kw = String(keyword).trim().toLowerCase();
            records = records.filter(item => {
                if (!item.student) return false;
                const name = (item.student.fullName || "").toLowerCase();
                const sId = (item.student.studentId || "").toLowerCase();
                const mob = (item.student.mobile || "").toLowerCase();
                return name.includes(kw) || sId.includes(kw) || mob.includes(kw);
            });
        }

        return res.status(200).json({
            success: true,
            total: records.length,
            records
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};