const http = require('http');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './backend/.env' });

function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ statusCode: res.statusCode, headers: res.headers, body: JSON.parse(body) });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, headers: res.headers, body: body });
                }
            });
        });
        req.on('error', reject);
        if (postData) {
            req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
        }
        req.end();
    });
}

async function runFinalPaymentTests() {
    console.log("==================================================");
    console.log("💳 BARNALABYTE FINAL PAYMENT, RAZORPAY, UPI, SEAT & ID CARD TEST SUITE");
    console.log("==================================================");

    let passCount = 0;
    let failCount = 0;

    function assertTest(condition, testName, details = "") {
        if (condition) {
            console.log(`✅ [PASS] ${testName}`);
            passCount++;
        } else {
            console.log(`❌ [FAIL] ${testName} - ${details}`);
            failCount++;
        }
    }

    const testStudentEmail1 = `pay_stu1_${Date.now()}@example.com`;
    const testStudentEmail2 = `pay_stu2_${Date.now()}@example.com`;
    const testOwnerEmail = `pay_owner_${Date.now()}@example.com`;
    const testMobile1 = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testMobile2 = `92${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testMobileOwner = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

    let student1Token = null, student1Id = null;
    let student2Token = null, student2Id = null;
    let ownerToken = null;

    try {
        // Setup Student 1 (Without Face Scan initially)
        const s1Otp = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/send', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testStudentEmail1, userType: 'student', purpose: 'registration' });

        await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/verify', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testStudentEmail1, userType: 'student', purpose: 'registration', otp: s1Otp.body.otp });

        const s1Reg = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/student/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            fullName: "Payment Student 1", fatherName: "Father 1", mobile: testMobile1,
            email: testStudentEmail1, password: "Password123", gender: "Male", dob: "2000-01-01"
        });

        student1Token = s1Reg.body.token;
        student1Id = s1Reg.body.student?._id;

        // Setup Student 2 (With Face Scan)
        const s2Otp = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/send', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testStudentEmail2, userType: 'student', purpose: 'registration' });

        await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/verify', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testStudentEmail2, userType: 'student', purpose: 'registration', otp: s2Otp.body.otp });

        const s2Reg = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/student/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            fullName: "Payment Student 2", fatherName: "Father 2", mobile: testMobile2,
            email: testStudentEmail2, password: "Password123", gender: "Female", dob: "2001-02-02"
        });

        student2Token = s2Reg.body.token;
        student2Id = s2Reg.body.student?._id;

        await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/face/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { studentId: student2Id, faceData: "face_data_sample" });

        // Setup Owner
        const oOtp = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/send', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testOwnerEmail, userType: 'owner', purpose: 'registration' });

        await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/verify', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testOwnerEmail, userType: 'owner', purpose: 'registration', otp: oOtp.body.otp });

        const oReg = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/owner/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            libraryName: "Payment Library", ownerName: "Owner Payment",
            mobile: testMobileOwner, email: testOwnerEmail, password: "OwnerPassword123"
        });

        ownerToken = oReg.body.token;
    } catch (e) {
        console.error("Setup error:", e.message);
    }

    // ==========================================================
    // 1. FACE GATE SECURITY TEST
    // ==========================================================
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/payment/create-order', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${student1Token}` }
        }, { amount: 500, studentId: student1Id });

        assertTest(res.statusCode === 400 && res.body.message.includes("Face verification is required"),
            "Face Gate: Payment blocked before face verification (Expected HTTP 400 with meaningful error)");
    } catch (e) { assertTest(false, "Face Gate", e.message); }

    // Complete face verification for Student 1
    await makeRequest({
        hostname: 'localhost', port: 5000, path: '/api/face/register', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { studentId: student1Id, faceData: "face_data_sample_1" });

    // ==========================================================
    // 2. RAZORPAY CREATE ORDER & SIGNATURE VERIFICATION TEST
    // ==========================================================
    let orderId = null;
    try {
        const orderRes = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/payment/create-order', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${student1Token}` }
        }, { amount: 500, studentId: student1Id });

        orderId = orderRes.body.order?.id;
        assertTest(orderRes.statusCode === 201 && orderId && orderRes.body.order.amount === 50000,
            "Razorpay: Create Order Successful (Amount in Paise: 50000)");

        const razorpayPaymentId = `pay_mock_${Date.now()}`;
        const secret = process.env.RAZORPAY_KEY_SECRET || "mock_secret";
        const signature = crypto.createHmac("sha256", secret)
            .update(orderId + "|" + razorpayPaymentId)
            .digest("hex");

        const verifyRes = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/payment/verify-payment', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${student1Token}` }
        }, {
            razorpay_order_id: orderId,
            razorpay_payment_id: razorpayPaymentId,
            razorpay_signature: signature,
            studentId: student1Id
        });

        assertTest(verifyRes.statusCode === 200 && verifyRes.body.payment?.status === "Paid",
            "Razorpay: Server-side Signature Verification & Payment Status Paid", JSON.stringify(verifyRes.body));

        // 3. DUPLICATE PAYMENT VERIFICATION TEST
        const dupVerifyRes = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/payment/verify-payment', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${student1Token}` }
        }, {
            razorpay_order_id: orderId,
            razorpay_payment_id: razorpayPaymentId,
            razorpay_signature: signature,
            studentId: student1Id
        });

        assertTest(dupVerifyRes.statusCode === 400 && dupVerifyRes.body.message.includes("Already Verified"),
            "Duplicate Protection: Re-verifying same Razorpay payment blocked (Expected HTTP 400)", JSON.stringify(dupVerifyRes.body));

    } catch (e) { assertTest(false, "Razorpay Flow", e.message); }

    // ==========================================================
    // 4. MANUAL UPI FAKE TRANSACTION TEST
    // ==========================================================
    let manualPaymentId = null;
    try {
        const fakeTxnId = `FAKE_TXN_${Date.now()}`;
        const manualRes = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/payment/manual-upi', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${student2Token}` }
        }, {
            studentId: student2Id,
            amount: 500,
            transactionId: fakeTxnId,
            paymentMethod: "Manual_UPI"
        });

        manualPaymentId = manualRes.body.payment?.id;

        assertTest(
            manualRes.statusCode === 201 &&
            manualRes.body.payment?.status === "Pending",
            "Manual UPI Fake Transaction Protection: Submitted transaction ID stays 'Pending' without auto seat allocation"
        );

        // Verify Student 2 dashboard still shows unassigned seat
        const dashRes = await makeRequest({
            hostname: 'localhost', port: 5000, path: `/api/student/dashboard/${student2Id}`, method: 'GET',
            headers: { 'Authorization': `Bearer ${student2Token}` }
        });

        assertTest(dashRes.body.dashboard?.seatNumber === null && dashRes.body.dashboard?.feesStatus === "Pending",
            "Manual UPI Protection: Student Dashboard shows Pending Fees & Unassigned Seat before Owner approval");
    } catch (e) { assertTest(false, "Manual UPI Fake Txn", e.message); }

    // ==========================================================
    // 5. OWNER SECURITY & MANUAL PAYMENT VERIFICATION TEST
    // ==========================================================
    try {
        // Student 2 attempts to approve their own payment -> Expected HTTP 403
        const illegalApprove = await makeRequest({
            hostname: 'localhost', port: 5000, path: `/api/payment/owner-verify/${manualPaymentId}`, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${student2Token}` }
        }, { action: 'approve' });

        assertTest(illegalApprove.statusCode === 403 && illegalApprove.body.message.includes("Owner access required"),
            "Owner Security: Student calling owner-verify endpoint receives HTTP 403 Forbidden");

        // Owner approves Student 2 payment -> Expected HTTP 200 & seat allocation
        const ownerApprove = await makeRequest({
            hostname: 'localhost', port: 5000, path: `/api/payment/owner-verify/${manualPaymentId}`, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerToken}` }
        }, { action: 'approve' });

        assertTest(ownerApprove.statusCode === 200 && ownerApprove.body.payment?.status === "Paid",
            "Owner Verification: Authenticated Owner approves manual payment -> Payment Paid & Seat Allocated");

        // Verify Student 2 dashboard updated
        const dashRes2 = await makeRequest({
            hostname: 'localhost', port: 5000, path: `/api/student/dashboard/${student2Id}`, method: 'GET',
            headers: { 'Authorization': `Bearer ${student2Token}` }
        });

        assertTest(dashRes2.body.dashboard?.seatNumber !== null && dashRes2.body.dashboard?.feesStatus === "Paid",
            "Owner Verification: Student Dashboard updated with assigned Seat Number and Fees Status Paid");
    } catch (e) { assertTest(false, "Owner Payment Verification", e.message); }

    // ==========================================================
    // 6. RAZORPAY WEBHOOK TEST
    // ==========================================================
    try {
        const orderRes2 = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/payment/create-order', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${student2Token}` }
        }, { amount: 500, studentId: student2Id, month: "September", year: 2026 });

        const orderId2 = orderRes2.body.order?.id;
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || "mock_secret";

        const webhookPayload = JSON.stringify({
            event: "payment.captured",
            payload: {
                payment: {
                    entity: {
                        id: `pay_wh_${Date.now()}`,
                        order_id: orderId2,
                        amount: 50000,
                        status: "captured"
                    }
                }
            }
        });

        const webhookSignature = crypto.createHmac("sha256", webhookSecret)
            .update(webhookPayload)
            .digest("hex");

        const whRes = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/razorpay/webhook', method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-razorpay-signature': webhookSignature,
                'x-razorpay-event-id': `event_${Date.now()}`
            }
        }, webhookPayload);

        assertTest(whRes.statusCode === 200 && whRes.body.success === true,
            "Razorpay Webhook: Verified raw payload HMAC signature and processed payment.captured event", JSON.stringify(whRes.body));

    } catch (e) { assertTest(false, "Razorpay Webhook", e.message); }

    console.log("==================================================");
    console.log(`📊 FINAL PAYMENT TEST RESULTS SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log("==================================================");
}

runFinalPaymentTests();
