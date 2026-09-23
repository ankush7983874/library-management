const express = require("express");
const router = express.Router();
const { protectOwner } = require("../middleware/authMiddleware");

const {
    registerOwner,
    loginOwner,
    dashboard,
    getAllStudents,
    getStudentById,
    getOwnerProfile,
    getAllPayments,
    getWaitingList,
    getReports,
    getSettings,
    updateSettings,
    getPublicSettings
} = require("../controllers/ownercontroller");

// Public endpoints
router.post("/register", registerOwner);
router.post("/login", loginOwner);
router.get("/public-settings", getPublicSettings);

// Owner Dashboard & Management (Protected - Owner Only)
router.get("/dashboard", protectOwner, dashboard);
router.get("/students", protectOwner, getAllStudents);
router.get("/student/:id", protectOwner, getStudentById);
router.get("/profile", protectOwner, getOwnerProfile);
router.get("/payments", protectOwner, getAllPayments);
router.get("/waiting-list", protectOwner, getWaitingList);
router.get("/reports", protectOwner, getReports);
router.get("/settings", protectOwner, getSettings);
router.put("/settings", protectOwner, updateSettings);

module.exports = router;