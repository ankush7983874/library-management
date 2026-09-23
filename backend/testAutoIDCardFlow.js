const http = require('http');
const fs = require('fs');
const path = require('path');

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

async function runAutoIDCardTests() {
    console.log("==================================================");
    console.log("🧪 BARNALABYTE AUTO ID CARD GENERATION & REGISTRATION FLOW");
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

    const testEmail = `auto_idcard_${Date.now()}@example.com`;
    const testMobile = `93${Math.floor(10000000 + Math.random() * 90000000)}`;

    let studentId = null;
    let mongoStudentId = null;

    // 1. Send & Verify OTP
    try {
        const sendOtp = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/send', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testEmail, userType: 'student', purpose: 'registration' });

        const otp = sendOtp.body.otp;

        await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/verify', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testEmail, userType: 'student', purpose: 'registration', otp });

        // 2. Register Student Account
        const regRes = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/student/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            fullName: "Auto ID Card Student",
            fatherName: "Rajesh Kumar",
            motherName: "Sunita Devi",
            mobile: testMobile,
            email: testEmail,
            password: "StudentPassword123",
            gender: "Male",
            dob: "2001-08-20",
            college: "Thapar University",
            course: "B.Tech Computer Science",
            address: "Barnala Punjab"
        });

        mongoStudentId = regRes.body.student?._id;
        studentId = regRes.body.student?.studentId;

        assertTest(regRes.statusCode === 201 && mongoStudentId && regRes.body.student?.idCardGenerated === true,
            "Account Registration -> Auto ID Card Generated Flag Set (idCardGenerated = true)");
    } catch (e) {
        assertTest(false, "Account Registration -> Auto ID Card", e.message);
    }

    if (!mongoStudentId || !studentId) {
        console.log("Cannot proceed without studentId");
        return;
    }

    // 3. Verify PDF file exists physically on disk
    const pdfDiskPath = path.join(__dirname, `uploads/idcards/${studentId}.pdf`);
    const pdfExists = fs.existsSync(pdfDiskPath);
    assertTest(pdfExists, `PDF File Generated on Disk: uploads/idcards/${studentId}.pdf`);

    // 4. Verify QR Code PNG file exists physically on disk
    const qrDiskPath = path.join(__dirname, `uploads/qrcodes/${studentId}.png`);
    const qrExists = fs.existsSync(qrDiskPath);
    assertTest(qrExists, `QR Code File Generated on Disk: uploads/qrcodes/${studentId}.png`);

    // 5. Query Student Dashboard API before payment
    try {
        const dash1 = await makeRequest({
            hostname: 'localhost', port: 5000, path: `/api/student/dashboard/${mongoStudentId}`, method: 'GET'
        });
        const d1 = dash1.body.dashboard || {};

        assertTest(
            dash1.statusCode === 200 &&
            d1.idCardGenerated === true &&
            d1.idCardPDF !== null &&
            d1.feesStatus === "Pending" &&
            d1.seatNumber === null,
            "Student Dashboard Shows ID Card Generated (Pending Fees & Unassigned Seat)"
        );
    } catch (e) {
        assertTest(false, "Student Dashboard Query Before Payment", e.message);
    }

    // 6. Test ID Card Download Endpoint
    try {
        const dlRes = await makeRequest({
            hostname: 'localhost', port: 5000, path: `/api/idcard/download/${mongoStudentId}`, method: 'GET'
        });

        assertTest(dlRes.statusCode === 200, "ID Card Download Endpoint (/api/idcard/download/:id)");
    } catch (e) {
        assertTest(false, "ID Card Download Endpoint", e.message);
    }

    // 7. Perform Face Verification
    try {
        await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/face/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { studentId: mongoStudentId, faceData: "face_data_sample_hash" });
    } catch (e) {}

    // 8. Payment & Seat Allocation -> Post-Payment ID Card Regeneration with Real Seat Number
    let paymentId = null;
    try {
        const txnId = `TXN_ID_CARD_${Date.now()}`;
        const manualPay = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/payment/manual-upi', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { studentId: mongoStudentId, amount: 500, transactionId: txnId });

        paymentId = manualPay.body.payment?.id;

        // Owner approves payment -> triggers paymentSuccessService -> seat allocation -> regenerates PDF & QR
        const approvePay = await makeRequest({
            hostname: 'localhost', port: 5000, path: `/api/payment/owner-verify/${paymentId}`, method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { action: 'approve' });

        assertTest(approvePay.statusCode === 200 && approvePay.body.payment?.status === "Paid",
            "Payment Verification -> Seat Allocated & ID Card Regenerated");
    } catch (e) {
        assertTest(false, "Payment Verification & ID Card Regeneration", e.message);
    }

    // 9. Query Student Dashboard API after payment
    try {
        const dash2 = await makeRequest({
            hostname: 'localhost', port: 5000, path: `/api/student/dashboard/${mongoStudentId}`, method: 'GET'
        });
        const d2 = dash2.body.dashboard || {};

        assertTest(
            dash2.statusCode === 200 &&
            d2.feesStatus === "Paid" &&
            d2.seatNumber !== null &&
            d2.idCardGenerated === true,
            "Student Dashboard Updated (Fees Status: Paid, Seat Number Assigned, ID Card Ready)"
        );
    } catch (e) {
        assertTest(false, "Student Dashboard Query After Payment", e.message);
    }

    console.log("==================================================");
    console.log(`📊 AUTO ID CARD TEST RESULTS SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log("==================================================");
}

runAutoIDCardTests();
