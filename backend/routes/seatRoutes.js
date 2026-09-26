const express = require("express");
const router = express.Router();
const { authenticate, protectOwner, protectOwnerOrSelf } = require("../middleware/authMiddleware");

const {
    createSeats,
    getSeats,
    availableSeats,
    getStudentSeat,
    seatStats,
    autoAllotSeat,
    releaseSeat,
    changeSeat
} = require("../controllers/seatController");

// =====================================
// Create Seats (Owner Only)
// =====================================
router.post("/create", protectOwner, createSeats);

// =====================================
// Get Seats
// =====================================
router.get("/", getSeats);
router.get("/available", availableSeats);

// =====================================
// Seat Statistics (Owner Only)
// =====================================
router.get("/stats", protectOwner, seatStats);

// =====================================
// Get Student Seat (Owner or Self Student)
// =====================================
router.get("/student/:studentId", protectOwnerOrSelf, getStudentSeat);

// =====================================
// Seat Management (Owner Only)
// =====================================
router.put("/allot/:studentId", protectOwner, autoAllotSeat);
router.put("/release/:studentId", protectOwner, releaseSeat);
router.put("/change", protectOwner, changeSeat);

module.exports = router;