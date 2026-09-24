const express = require('express');
const router = express.Router();
const { authenticate, protectOwner, protectOwnerOrSelf } = require('../middleware/authMiddleware');
const {
    createOrder,
    verifyPayment,
    razorpayWebhook,
    submitManualPayment,
    getPendingManualPayments,
    ownerVerifyPayment,
    getStudentPayments,
    getAllPayments
} = require('../controllers/paymentcontroller');

// Payment initiation & verification (Authenticated Student/Owner)
router.post('/create-order', authenticate, createOrder);
router.post('/verify-payment', authenticate, verifyPayment);
router.post('/webhook', razorpayWebhook); // Webhook authenticated via Razorpay signature

// Student payment history & status
router.get('/student/:studentId', protectOwnerOrSelf, getStudentPayments);

// Manual UPI Payments
router.post('/manual-upi', authenticate, submitManualPayment);
router.get('/pending-manual', protectOwner, getPendingManualPayments);
router.post('/owner-verify/:paymentId', protectOwner, ownerVerifyPayment);
router.post('/owner-reject/:paymentId', protectOwner, (req, res, next) => {
    req.body.action = "reject";
    return ownerVerifyPayment(req, res, next);
});

// All payments for Owner dashboard
router.get('/all', protectOwner, getAllPayments);

module.exports = router;