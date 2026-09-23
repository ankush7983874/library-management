const express = require("express");
const router = express.Router();
const { protectOwner, protectOwnerOrSelf } = require("../middleware/authMiddleware");

// =====================================
// Controllers
// =====================================

const {
    registerStudent,
    loginStudent,

    getStudentProfile,
    getAllStudents,

    updateStudent,
    deleteStudent,

    searchStudent,

    changePassword,

    studentDashboard,
    studentStats
} = require("../controllers/studentcontroller");

// =====================================
// Authentication (Public)
// =====================================

// Register
router.post("/register", registerStudent);

// Login
router.post("/login", loginStudent);

// =====================================
// Student Profile & Self Resources
// =====================================

// Get Profile (Owner or Own Student)
router.get("/profile/:id", protectOwnerOrSelf, getStudentProfile);

// Dashboard (Owner or Own Student)
router.get("/dashboard/:id", protectOwnerOrSelf, studentDashboard);

// Update Student (Owner or Own Student)
router.put("/update/:id", protectOwnerOrSelf, updateStudent);

// Change Password (Owner or Own Student)
router.put("/change-password/:id", protectOwnerOrSelf, changePassword);

// =====================================
// Owner Only Student Management
// =====================================

// Get All Students (Owner Only)
router.get("/all", protectOwner, getAllStudents);

// Search Student (Owner Only)
router.get("/search", protectOwner, searchStudent);

// Delete Student (Owner Only)
router.delete("/delete/:id", protectOwner, deleteStudent);

// Student Statistics (Owner Only)
router.get("/stats", protectOwner, studentStats);

module.exports = router;