const express = require("express");
const router = express.Router();
const {
    createOrder,
    verifyPayment,
    razorpayWebhook
} = require("../controllers/paymentcontroller");

router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);
router.post("/webhook", razorpayWebhook);

module.exports = router;