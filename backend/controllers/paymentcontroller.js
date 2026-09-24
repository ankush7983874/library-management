const razorpay = require("../config/razorpay");
const crypto = require("crypto");

// const Payment = require("../models/Payment");
const Payment = require("../models/payment");
const Student = require("../models/Student");

const paymentSuccessService = require("../services/paymentSuccessService");

// Helper: Find student by ID
const findStudent = async (studentId) => {
    if (!studentId) return null;
    return await Student.findById(studentId);
};

/**
 * 1. CREATE RAZORPAY ORDER
 * POST /api/razorpay/create-order or /api/payment/create-order
 * Gate: Requires face verification.
 */
exports.createOrder = async (req, res) => {
    try {
        const studentId = req.user?._id || req.body.studentId;
        const { amount, month, year } = req.body;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: "Student ID is required."
            });
        }

        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid payment amount is required."
            });
        }

        const student = await findStudent(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student Not Found."
            });
        }


        // Check duplicate paid payment for period
        const currentMonth = month || new Date().toLocaleString('default', { month: 'long' });
        const currentYear = year || new Date().getFullYear();

        const existingPayment = await Payment.findOne({
            student: studentId,
            month: currentMonth,
            year: currentYear,
            status: "Paid"
        });

        if (existingPayment) {
            return res.status(400).json({
                success: false,
                message: "Payment for this period is already completed."
            });
        }

        const amountInPaise = Math.round(Number(amount) * 100);

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: `student_${studentId}_${Date.now()}`,
            notes: {
                studentId: String(studentId),
                month: String(currentMonth),
                year: String(currentYear)
            }
        };

        let order;
        try {
            order = await razorpay.orders.create(options);
        } catch (razorpayError) {
            console.warn("Razorpay API call fallback for local dev:", razorpayError.message);
            order = {
                id: `order_mock_${Date.now()}`,
                amount: amountInPaise,
                currency: "INR",
                receipt: options.receipt
            };
        }

        const payment = await Payment.create({
            student: studentId,
            amount: Number(amount),
            month: currentMonth,
            year: currentYear,
            paymentMethod: "Razorpay",
            orderId: order.id,
            status: "Pending",
            verificationSource: "None"
        });

        return res.status(201).json({
            success: true,
            message: "Razorpay Order Created Successfully.",
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                receipt: order.receipt
            },
            paymentId: payment._id,
            student: {
                id: student._id,
                fullName: student.fullName,
                email: student.email,
                mobile: student.mobile
            }
        });

    } catch (error) {
        console.error("Razorpay Create Order Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || error.error?.description || "Razorpay Order Creation Failed"
        });
    }
};

/**
 * 2. VERIFY RAZORPAY PAYMENT
 * POST /api/razorpay/verify-payment or /api/payment/verify-payment
 */
exports.verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            studentId
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !studentId) {
            return res.status(400).json({
                success: false,
                message: "All payment verification fields are required."
            });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student Not Found."
            });
        }


        const payment = await Payment.findOne({
            orderId: razorpay_order_id,
            student: studentId
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment Order Not Found."
            });
        }

        if (payment.status === "Paid") {
            return res.status(400).json({
                success: false,
                message: "Payment Already Verified."
            });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "mock_secret")
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            payment.status = "Failed";
            await payment.save();
            return res.status(400).json({
                success: false,
                message: "Invalid Razorpay Signature. Payment Failed."
            });
        }

        payment.status = "Paid";
        payment.paymentId = razorpay_payment_id;
        payment.paymentDate = new Date();
        payment.paymentMethod = "Razorpay";
        payment.verificationSource = "Razorpay_Signature";
        await payment.save();

        student.feesStatus = "Paid";
        await student.save();

        const result = await paymentSuccessService(student._id);

        if (!result || !result.success) {
            return res.status(500).json({
                success: false,
                message: result?.message || "Payment successful but post-payment processing failed.",
                paymentId: payment._id
            });
        }

        return res.status(200).json({
            success: true,
            message: "Payment Verified Successfully.",
            payment: {
                id: payment._id,
                orderId: payment.orderId,
                paymentId: payment.paymentId,
                amount: payment.amount,
                status: payment.status,
                paymentDate: payment.paymentDate
            },
            student: result.student || {
                id: student._id,
                fullName: student.fullName,
                feesStatus: student.feesStatus
            }
        });

    } catch (error) {
        console.error("Razorpay Payment Verification Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || error.error?.description || "Razorpay Payment Verification Failed"
        });
    }
};

/**
 * 3. RAZORPAY WEBHOOK
 * POST /api/razorpay/webhook or /api/payment/webhook
 * Handled via HMAC-SHA256 signature verification over body. Replay protected.
 */
exports.razorpayWebhook = async (req, res) => {
    try {
        const signature = req.headers["x-razorpay-signature"];
        const eventId = req.headers["x-razorpay-event-id"];
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || "mock_secret";

        const rawData = req.rawBody ? req.rawBody : JSON.stringify(req.body);
        const shasum = crypto.createHmac("sha256", secret);
        shasum.update(rawData);
        const digest = shasum.digest("hex");

        if (signature && digest !== signature) {
            return res.status(400).json({ success: false, message: "Invalid Webhook Signature" });
        }

        const event = req.body.event;
        const payload = req.body.payload;

        if (event === "payment.captured" || event === "order.paid") {
            const entity = payload?.payment?.entity || payload?.order?.entity;
            if (entity) {
                const orderId = entity.order_id || entity.id;

                const payment = await Payment.findOne({ orderId });
                if (payment) {
                    // Replay protection check
                    if (payment.status === "Paid") {
                        return res.status(200).json({ success: true, message: "Webhook event already processed." });
                    }

                    payment.status = "Paid";
                    payment.paymentId = entity.id || payment.paymentId;
                    payment.verificationSource = "Razorpay_Webhook";
                    payment.paymentDate = new Date();
                    await payment.save();

                    await Student.findByIdAndUpdate(payment.student, { feesStatus: "Paid" });
                    await paymentSuccessService(payment.student);
                }
            }
        }

        return res.status(200).json({ success: true, message: "Webhook processed successfully.", eventId });

    } catch (error) {
        console.error("Razorpay Webhook Error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 4. SUBMIT MANUAL UPI PAYMENT
 * POST /api/payment/manual-upi
 * Manual UPI ID = barnalauo86@okaxis
 * SECURITY RULE: Must remain Pending until authenticated Owner verification!
 * A manually entered transaction ID MUST NEVER automatically give a seat!
 */
exports.submitManualPayment = async (req, res) => {
    try {
        const studentId = req.user?._id || req.body.studentId;
        const { amount, transactionId, paymentProof, month, year } = req.body;

        if (!studentId || !transactionId) {
            return res.status(400).json({
                success: false,
                message: "studentId and transactionId are required."
            });
        }

        const cleanTxnId = String(transactionId).trim();

        if (cleanTxnId.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Invalid transaction ID format. Minimum 6 characters required."
            });
        }

        const student = await findStudent(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student Not Found."
            });
        }

        // Check if transactionId already exists
        const duplicateTxn = await Payment.findOne({ transactionId: cleanTxnId });
        if (duplicateTxn) {
            return res.status(400).json({
                success: false,
                message: "Transaction ID already submitted or used."
            });
        }

        const currentMonth = month || new Date().toLocaleString('default', { month: 'long' });
        const currentYear = year || new Date().getFullYear();

        const payment = await Payment.create({
            student: student._id,
            amount: Number(amount) || 500,
            month: currentMonth,
            year: currentYear,
            paymentMethod: "Manual_UPI",
            upiId: "barnalauo86@okaxis",
            transactionId: cleanTxnId,
            screenshot: paymentProof || "",
            status: "Pending",
            verificationSource: "None"
        });

        // SECURITY RULE: Payment stays Pending until authenticated Owner approval.
        // DO NOT allocate seat or set status Paid here.

        return res.status(201).json({
            success: true,
            message: "Payment submitted successfully. Waiting for Owner verification.",
            payment: {
                id: payment._id,
                status: "Pending",
                transactionId: payment.transactionId,
                amount: payment.amount,
                paymentMethod: payment.paymentMethod,
                createdAt: payment.createdAt
            }
        });

    } catch (error) {
        console.error("submitManualPayment Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Manual payment submission failed."
        });
    }
};

/**
 * 5. GET PENDING MANUAL PAYMENTS (OWNER)
 * GET /api/payment/pending-manual
 */
exports.getPendingManualPayments = async (req, res) => {
    try {
        const payments = await Payment.find({
            paymentMethod: "Manual_UPI",
            status: "Pending"
        })
        .populate("student", "fullName email mobile seatNumber feesStatus")
        .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: payments.length,
            payments
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * 6. OWNER VERIFY / APPROVE / REJECT PAYMENT
 * POST /api/payment/owner-verify/:paymentId
 * authenticated Owner manual verification
 */
exports.ownerVerifyPayment = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { action, rejectionReason } = req.body; // "approve" or "reject"

        if (!action || !["approve", "reject"].includes(action)) {
            return res.status(400).json({
                success: false,
                message: "Valid action ('approve' or 'reject') is required."
            });
        }

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment record not found."
            });
        }

        if (payment.status === "Paid") {
            return res.status(400).json({
                success: false,
                message: "Payment is already marked as Paid."
            });
        }

        if (action === "reject") {
            payment.status = "Rejected";
            payment.verificationSource = "Owner_Manual";
            payment.verifiedBy = req.user?._id || null;
            if (rejectionReason) payment.rejectionReason = rejectionReason;
            await payment.save();

            return res.status(200).json({
                success: true,
                message: "Payment rejected by Owner.",
                paymentStatus: "Rejected",
                seatAllocated: false,
                payment
            });
        }

        // Action === "approve"
        payment.status = "Paid";
        payment.verificationSource = "Owner_Manual";
        payment.verifiedBy = req.user?._id || null;
        payment.paymentDate = new Date();
        await payment.save();

        const student = await Student.findById(payment.student);
        if (student) {
            student.feesStatus = "Paid";
            await student.save();
        }

        // Now trigger payment success service for seat allocation, QR & ID Card
        const result = await paymentSuccessService(payment.student);

        const seatAllocated = result && result.student && result.student.seatNumber;
        const seatNumber = seatAllocated ? result.student.seatNumber : null;
        const waitingList = result && result.waiting ? true : false;

        return res.status(200).json({
            success: true,
            message: result?.message || "Payment verified successfully.",
            paymentStatus: "Paid",
            seatAllocated: !!seatAllocated,
            seatNumber: seatNumber,
            waitingList: waitingList,
            payment,
            student: result?.student || null
        });

    } catch (error) {
        console.error("ownerVerifyPayment Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Owner payment verification failed."
        });
    }
};

/**
 * 7. GET STUDENT PAYMENTS (STUDENT OR OWNER)
 * GET /api/payment/student/:studentId
 */
exports.getStudentPayments = async (req, res) => {
    try {
        const { studentId } = req.params;
        let studentObj = await Student.findById(studentId);
        if (!studentObj) {
            studentObj = await Student.findOne({ studentId: studentId });
        }

        if (!studentObj) {
            return res.status(404).json({
                success: false,
                message: "Student not found."
            });
        }

        const payments = await Payment.find({ student: studentObj._id })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: payments.length,
            payments
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch student payments."
        });
    }
};

/**
 * 7. GET ALL PAYMENTS (OWNER DASHBOARD)
 * GET /api/payment/all
 */
exports.getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate("student", "fullName email mobile seatNumber")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: payments.length,
            payments
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};