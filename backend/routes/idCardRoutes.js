const express = require("express");
const router = express.Router();
const { protectOwnerOrSelf } = require("../middleware/authMiddleware");

const {
    generateIDCard,
    downloadIDCard,
    viewIDCard,
    verifyStudent
} = require("../controllers/idcardcontroller");

// Generate ID Card (Owner or Self Student)
router.get("/generate/:studentId", protectOwnerOrSelf, generateIDCard);

// Download ID Card (Owner or Self Student)
router.get("/download/:studentId", protectOwnerOrSelf, downloadIDCard);

// View ID Card (Owner or Self Student)
router.get("/view/:studentId", protectOwnerOrSelf, viewIDCard);

// Verify Student (PUBLIC EXCEPTION for QR Verification)
router.get("/verify/:studentId", verifyStudent);

module.exports = router;