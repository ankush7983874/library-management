const http = require('http');

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

async function runTests() {
    console.log("==================================================");
    console.log("🧪 BARNALABYTE SMART LIBRARY - END-TO-END PHASES VERIFICATION");
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

    // 1. Health Check
    try {
        const health = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/', method: 'GET'
        });
        assertTest(health.statusCode === 200 && health.body.success, "Server Running & API Health Check");
    } catch (e) {
        assertTest(false, "Server Running & API Health Check", e.message);
    }

    // Helper: Register Student
    const testEmail = `phase_test_${Date.now()}@example.com`;
    const testMobile = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

    let studentId = null;

    try {
        // Send OTP
        const sendOtp = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/send', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testEmail, userType: 'student', purpose: 'registration' });

        const otp = sendOtp.body.otp;

        // Verify OTP
        const verifyOtp = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/verify', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testEmail, userType: 'student', purpose: 'registration', otp });

        // Register Student
        const regRes = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/student/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            fullName: "Phase Test Student",
            fatherName: "Test Father",
            motherName: "Test Mother",
            mobile: testMobile,
            email: testEmail,
            password: "Password@123",
            gender: "Male",
            dob: "2000-01-01"
        });

        if (!regRes.body.success) {
            console.log("Registration Error Details:", regRes.body);
        }

        studentId = regRes.body.student?._id;
        studentToken = regRes.body.token;
        assertTest(regRes.statusCode === 201 && studentId && studentToken, "Student Registration with OTP", regRes.body.message || JSON.stringify(regRes.body));
    } catch (e) {
        assertTest(false, "Student Registration with OTP", e.message);
    }

    if (!studentId) {
        console.log("Cannot proceed without studentId");
        return;
    }

    // Register/Login Owner for Owner-protected endpoints
    let ownerToken = null;
    try {
        const ownerEmail = `owner_phase_${Date.now()}@example.com`;
        const ownerMobile = `97${Math.floor(10000000 + Math.random() * 90000000)}`;

        const sOtp = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/send', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: ownerEmail, userType: 'owner', purpose: 'registration' });

        const oOtp = sOtp.body.otp;

        await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/verify', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: ownerEmail, userType: 'owner', purpose: 'registration', otp: oOtp });

        const oReg = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/owner/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            libraryName: "BarnalaByte Phase Library",
            ownerName: "Phase Owner",
            mobile: ownerMobile,
            email: ownerEmail,
            password: "Password@123"
        });

        ownerToken = oReg.body.token;
    } catch (err) {
        console.error("Owner setup error in testAllPhases:", err.message);
    }

    // 2. SECURITY RULE TEST: Payment creation without face verification MUST FAIL
    try {
        const failPay = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/payment/create-order', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` }
        }, { amount: 500, studentId });

        assertTest(failPay.statusCode === 400 && failPay.body.message.includes("Face verification"),
            "Payment Gate: Rejected without Face Verification");
    } catch (e) {
        assertTest(false, "Payment Gate: Rejected without Face Verification", e.message);
    }

    // 3. PHASE 2: Face Verification
    try {
        const faceReg = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/face/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { studentId, faceData: "mock_descriptor_data_sample_hash_string_1234567890_abc" });

        assertTest(faceReg.statusCode === 200 && faceReg.body.student?.faceVerified, "Face Registration & Server Verification");
    } catch (e) {
        assertTest(false, "Face Registration & Server Verification", e.message);
    }

    // Check Face Status
    try {
        const faceStat = await makeRequest({
            hostname: 'localhost', port: 5000, path: `/api/face/status/${studentId}`, method: 'GET'
        });
        assertTest(faceStat.statusCode === 200 && faceStat.body.faceVerified === true, "Face Status Query");
    } catch (e) {
        assertTest(false, "Face Status Query", e.message);
    }

    // 4. PHASE 3: Manual UPI Payment Submission (MUST STAY PENDING)
    const testTxnId = `TXN${Date.now()}`;
    let manualPaymentId = null;

    try {
        const manualRes = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/payment/manual-upi', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` }
        }, { studentId, amount: 500, transactionId: testTxnId });

        manualPaymentId = manualRes.body.payment?.id;
        assertTest(manualRes.statusCode === 201 && manualRes.body.payment?.status === "Pending",
            "Manual UPI Submission: Stays Pending (No Auto Seat)");
    } catch (e) {
        assertTest(false, "Manual UPI Submission", e.message);
    }

    // Duplicate Txn ID test
    try {
        const dupTxn = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/payment/manual-upi', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` }
        }, { studentId, amount: 500, transactionId: testTxnId });

        assertTest(dupTxn.statusCode === 400 && dupTxn.body.message.includes("already"),
            "Security: Duplicate Transaction ID Rejected");
    } catch (e) {
        assertTest(false, "Security: Duplicate Transaction ID Rejected", e.message);
    }

    // 5. PHASE 4 & 5: Owner Manual Approval -> Triggers Seat Allocation, QR & PDF ID Card
    try {
        const approveRes = await makeRequest({
            hostname: 'localhost', port: 5000, path: `/api/payment/owner-verify/${manualPaymentId}`, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerToken}` }
        }, { action: 'approve' });

        assertTest(approveRes.statusCode === 200 && approveRes.body.payment?.status === "Paid" && approveRes.body.result?.success,
            "Owner Payment Approval & Auto Seat Allocation + QR + ID Card");
    } catch (e) {
        assertTest(false, "Owner Payment Approval & Seat Allocation", e.message);
    }

    // 6. PHASE 7 & 8: Student Dashboard API Check
    try {
        const dashRes = await makeRequest({
            hostname: 'localhost', port: 5000, path: `/api/student/dashboard/${studentId}`, method: 'GET',
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        const d = dashRes.body.dashboard || {};
        assertTest(dashRes.statusCode === 200 && d.emailOTPStatus === "Verified" && d.faceVerificationStatus === "Verified" && d.feesStatus === "Paid" && d.seatNumber !== null,
            "Student Dashboard: Complete Verified Flow Status (OTP, Face, Payment, Seat)");
    } catch (e) {
        assertTest(false, "Student Dashboard Query", e.message);
    }

    // 7. Owner Dashboard API Check
    try {
        const ownerDash = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/owner/dashboard', method: 'GET',
            headers: { 'Authorization': `Bearer ${ownerToken}` }
        });
        assertTest(ownerDash.statusCode === 200 && ownerDash.body.dashboard?.totalStudents > 0,
            "Owner Dashboard Metrics Query");
    } catch (e) {
        assertTest(false, "Owner Dashboard Metrics Query", e.message);
    }

    // 8. PHASE 18: Notification Service Trigger Test
    try {
        const { notifyMonthlyFeeReminder } = require("./services/notificationService");
        await notifyMonthlyFeeReminder({ email: testEmail, fullName: "Phase Test Student", mobile: testMobile });
        assertTest(true, "Phase 18: Notification Service (Email & SMS Reminders)");
    } catch (e) {
        assertTest(false, "Phase 18: Notification Service (Email & SMS Reminders)", e.message);
    }

    // 9. PHASE 19: Owner Settings & Public Settings Query Test
    try {
        const pubSettings = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/owner/public-settings', method: 'GET'
        });
        assertTest(pubSettings.statusCode === 200 && pubSettings.body.settings?.upiId === "barnalauo86@okaxis",
            "Phase 19: Public Settings API (UPI ID & Monthly Fee)");
    } catch (e) {
        assertTest(false, "Phase 19: Public Settings API", e.message);
    }

    console.log("==================================================");
    console.log(`📊 TEST RESULTS SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log("==================================================");
}

runTests();

