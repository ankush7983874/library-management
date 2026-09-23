const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");

// GET /api/auth/me -> Returns authenticated user profile and role
router.get("/me", authenticate, (req, res) => {
    return res.status(200).json({
        success: true,
        role: req.role,
        user: req.user
    });
});

module.exports = router;
