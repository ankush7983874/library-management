const express = require("express");
const router = express.Router();
const { authenticate, protectOwner, protectOwnerOrSelf } = require("../middleware/authMiddleware");

const {
    checkIn,
    checkOut,
    todayAttendance,
    currentAttendance,
    attendanceHistory,
    ownerTodayAttendance,
    ownerAttendanceHistory
} = require("../controllers/attendancecontroller");

// =====================================
// Student Attendance Routes (Authenticated)
// =====================================
router.post("/checkin", authenticate, checkIn);
router.post("/checkout", authenticate, checkOut);
router.put("/checkout/:studentId", protectOwnerOrSelf, checkOut); // Backward compatibility

router.get("/today/:studentId", protectOwnerOrSelf, todayAttendance);
router.get("/current/:studentId", protectOwnerOrSelf, currentAttendance);
router.get("/history/:studentId", protectOwnerOrSelf, attendanceHistory);

// =====================================
// Owner Live Attendance & History Routes (Protected - Owner Only)
// =====================================
router.get("/owner/today", protectOwner, ownerTodayAttendance);
router.get("/owner/history", protectOwner, ownerAttendanceHistory);

module.exports = router;