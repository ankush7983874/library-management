const express = require("express");
const router = express.Router();
const {
    sendForgotOTP,
    verifyForgotOTP,
    resetPassword
} = require("../controllers/forgotPasswordController");

router.post("/send-otp", sendForgotOTP);
router.post("/verify-otp", verifyForgotOTP);
router.post("/reset", resetPassword);

module.exports = router;
