const path = require('path');
const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });
const API_BASE = "http://localhost:5000/api";

function makeRequest(urlPath, method, data, token) {
    return new Promise((resolve, reject) => {
        const fullUrl = `${API_BASE}${urlPath}`;
        const url = new URL(fullUrl);
        const headers = {
            'Content-Type': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: headers
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, body });
                }
            });
        });

        req.on('error', (err) => reject(err));
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function runTests() {
    console.log("==================================================");
    console.log("👑 BARNALABYTE OWNER DASHBOARD INTEGRATION TEST SUITE");
    console.log("==================================================");

    const timestamp = Date.now();

    // ----------------------------------------------------
    // STEP 1: Create Test Student & Test Owner
    // ----------------------------------------------------
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/BarnalaByte");
    }

    const Student = require('./models/student');
    const Owner = require('./models/owner');
    const OTP = require('./models/OTP');
    const bcrypt = require('bcryptjs');

    const ownerEmail = `dash_owner_${timestamp}@example.com`;
    const ownerMobile = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

    const studentEmail = `dash_student_${timestamp}@example.com`;
    const studentMobile = `97${Math.floor(10000000 + Math.random() * 90000000)}`;

    // Create Owner in DB (pre-save hook hashes plaintext password)
    const ownerDoc = await Owner.create({
        libraryName: "Barnala Central Smart Library",
        ownerName: "Master Owner",
        mobile: ownerMobile,
        email: ownerEmail,
        password: "Password123"
    });

    // Create Student in DB (pre-save hook hashes plaintext password)
    const studentDoc = await Student.create({
        studentId: `BL_${timestamp}_1`,
        fullName: "Test Student Dashboard",
        fatherName: "Father",
        gender: "Male",
        dob: new Date("2000-01-01"),
        mobile: studentMobile,
        email: studentEmail,
        password: "Password123",
        faceVerified: true,
        feesStatus: "Pending",
        accountStatus: "Active"
    });

    // Login as Student to get Student Token
    const studentLogin = await makeRequest('/student/login', 'POST', {
        email: studentEmail,
        password: "Password123"
    });
    const studentToken = studentLogin.data.token;

    // Login as Owner to get Owner Token
    const ownerLogin = await makeRequest('/owner/login', 'POST', {
        email: ownerEmail,
        password: "Password123"
    });
    const ownerToken = ownerLogin.data.token;

    if (!studentToken || !ownerToken) {
        console.error("FAIL: Could not obtain test tokens!", { studentLogin, ownerLogin });
        process.exit(1);
    }
    console.log("✔ Setup Completed: Test Owner & Test Student created.");

    // ----------------------------------------------------
    // STEP 2: Access Control Security Tests
    // ----------------------------------------------------
    const unauthDash = await makeRequest('/owner/dashboard', 'GET');
    if (unauthDash.status !== 401) {
        console.error("FAIL: Unauthenticated access to /owner/dashboard not blocked with 401!", unauthDash);
        process.exit(1);
    }

    const studentDash = await makeRequest('/owner/dashboard', 'GET', null, studentToken);
    if (studentDash.status !== 403 || studentDash.data.message !== "Owner access required.") {
        console.error("FAIL: Student access to /owner/dashboard not blocked with 403!", studentDash);
        process.exit(1);
    }

    const studentStudents = await makeRequest('/owner/students', 'GET', null, studentToken);
    if (studentStudents.status !== 403) {
        console.error("FAIL: Student access to /owner/students not blocked with 403!", studentStudents);
        process.exit(1);
    }

    const studentManualPending = await makeRequest('/payment/pending-manual', 'GET', null, studentToken);
    if (studentManualPending.status !== 403) {
        console.error("FAIL: Student access to /payment/pending-manual not blocked with 403!", studentManualPending);
        process.exit(1);
    }

    console.log("✔ Test 1 PASSED: Strict Access Control Security enforced (401 for Guest, 403 for Student).");

    // ----------------------------------------------------
    // STEP 3: Authenticated Owner Dashboard APIs
    // ----------------------------------------------------
    const ownerDash = await makeRequest('/owner/dashboard', 'GET', null, ownerToken);
    if (ownerDash.status !== 200 || !ownerDash.data.success || !ownerDash.data.dashboard) {
        console.error("FAIL: Owner GET /owner/dashboard failed!", ownerDash);
        process.exit(1);
    }

    const db = ownerDash.data.dashboard;
    if (typeof db.totalStudents !== 'number' || typeof db.totalSeats !== 'number' || typeof db.availableSeats !== 'number') {
        console.error("FAIL: Dashboard stats fields invalid!", db);
        process.exit(1);
    }
    console.log("✔ Test 2 PASSED: Owner GET /owner/dashboard returns real database metrics:", db);

    // ----------------------------------------------------
    // STEP 4: Owner Student Directory & Search
    // ----------------------------------------------------
    const ownerStudents = await makeRequest('/owner/students', 'GET', null, ownerToken);
    if (ownerStudents.status !== 200 || !ownerStudents.data.success || !Array.isArray(ownerStudents.data.students)) {
        console.error("FAIL: Owner GET /owner/students failed!", ownerStudents);
        process.exit(1);
    }

    // Search by name
    const searchName = await makeRequest(`/owner/students?keyword=${encodeURIComponent("Test Student")}`, 'GET', null, ownerToken);
    if (searchName.status !== 200 || searchName.data.students.length === 0) {
        console.error("FAIL: Student search by name failed!", searchName);
        process.exit(1);
    }

    // Search by numeric seat
    const searchSeat = await makeRequest('/owner/students?keyword=1', 'GET', null, ownerToken);
    if (searchSeat.status !== 200) {
        console.error("FAIL: Student search by numeric seat failed!", searchSeat);
        process.exit(1);
    }

    console.log("✔ Test 3 PASSED: Owner GET /owner/students & Numeric Seat Search verified.");

    // ----------------------------------------------------
    // STEP 5: Owner Profile & Reports APIs
    // ----------------------------------------------------
    const ownerProfile = await makeRequest('/owner/profile', 'GET', null, ownerToken);
    if (ownerProfile.status !== 200 || !ownerProfile.data.owner || ownerProfile.data.owner.email !== ownerEmail) {
        console.error("FAIL: Owner GET /owner/profile failed!", ownerProfile);
        process.exit(1);
    }

    const ownerReports = await makeRequest('/owner/reports', 'GET', null, ownerToken);
    if (ownerReports.status !== 200 || !ownerReports.data.reports) {
        console.error("FAIL: Owner GET /owner/reports failed!", ownerReports);
        process.exit(1);
    }
    console.log("✔ Test 4 PASSED: Owner Profile ('My Account') & Reports APIs verified.");

    // ----------------------------------------------------
    // STEP 6: Manual UPI Payment Approval & Rejection
    // ----------------------------------------------------
    const txnId1 = `TXN_DASH_APP_${timestamp}`;
    const manualSub1 = await makeRequest('/payment/manual-upi', 'POST', {
        studentId: studentDoc._id,
        amount: 500,
        transactionId: txnId1,
        month: "September",
        year: 2026
    }, studentToken);

    if (manualSub1.status !== 201 || manualSub1.data.payment.status !== "Pending") {
        console.error("FAIL: Manual UPI submission failed!", manualSub1);
        process.exit(1);
    }
    const paymentId1 = manualSub1.data.payment.id;

    // Verify payment shows up in pending-manual
    const pendingList1 = await makeRequest('/payment/pending-manual', 'GET', null, ownerToken);
    const hasPayment1 = pendingList1.data.payments.some(p => p._id.toString() === paymentId1.toString());
    if (!hasPayment1) {
        console.error("FAIL: Submitted manual payment not present in pending-manual!", pendingList1);
        process.exit(1);
    }

    // Owner Approve Payment
    const approveRes = await makeRequest(`/payment/owner-verify/${paymentId1}`, 'POST', { action: "approve" }, ownerToken);
    if (approveRes.status !== 200 || !approveRes.data.success || approveRes.data.payment.status !== "Paid") {
        console.error("FAIL: Owner payment approval failed!", approveRes);
        process.exit(1);
    }

    // Verify Student seat and fees status updated
    const updatedStudent = await Student.findById(studentDoc._id);
    if (updatedStudent.feesStatus !== "Paid" || !updatedStudent.seatNumber) {
        console.error("FAIL: Post-approval seat allocation or feesStatus update failed!", updatedStudent);
        process.exit(1);
    }
    console.log(`✔ Test 5 PASSED: Manual Payment Approved -> Payment Paid & Seat #${updatedStudent.seatNumber} Allocated.`);

    // Manual Rejection Test
    const studentDoc2 = await Student.create({
        studentId: `BL_${timestamp}_2`,
        fullName: "Test Rejection Student",
        fatherName: "Father",
        gender: "Female",
        dob: new Date("2001-01-01"),
        mobile: `96${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: `rej_${timestamp}@example.com`,
        password: "Password123",
        faceVerified: true,
        feesStatus: "Pending",
        accountStatus: "Active"
    });

    const txnId2 = `TXN_DASH_REJ_${timestamp}`;
    const manualSub2 = await makeRequest('/payment/manual-upi', 'POST', {
        studentId: studentDoc2._id,
        amount: 500,
        transactionId: txnId2,
        month: "September",
        year: 2026
    }, studentToken);

    const paymentId2 = manualSub2.data.payment.id;
    const rejectRes = await makeRequest(`/payment/owner-reject/${paymentId2}`, 'POST', { action: "reject" }, ownerToken);

    if (rejectRes.status !== 200 || rejectRes.data.payment.status !== "Rejected") {
        console.error("FAIL: Owner payment rejection failed!", rejectRes);
        process.exit(1);
    }

    const unassignedStudent = await Student.findById(studentDoc2._id);
    if (unassignedStudent.feesStatus === "Paid" || unassignedStudent.seatNumber) {
        console.error("FAIL: Rejected payment incorrectly allocated seat or marked Paid!", unassignedStudent);
        process.exit(1);
    }
    console.log("✔ Test 6 PASSED: Manual Payment Rejected -> Status Rejected & No Seat Allocated.");

    // Clean up test records
    await Owner.findByIdAndDelete(ownerDoc._id);
    await Student.findByIdAndDelete(studentDoc._id);
    await Student.findByIdAndDelete(studentDoc2._id);

    console.log("\n==================================================");
    console.log("🎉 ALL 6/6 OWNER DASHBOARD INTEGRATION TESTS PASSED!");
    console.log("==================================================");
}

runTests().catch(err => {
    console.error("Integration Test Error:", err);
    process.exit(1);
});
