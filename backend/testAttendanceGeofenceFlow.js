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

async function runAttendanceTests() {
    console.log("==================================================");
    console.log("🧪 BARNALABYTE SMART LIBRARY - ATTENDANCE & GEOFENCE SECURITY TESTS");
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

    const timestamp = Date.now();
    const student1Email = `student_att1_${timestamp}@example.com`;
    const student1Mobile = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
    const student2Email = `student_att2_${timestamp}@example.com`;
    const student2Mobile = `92${Math.floor(10000000 + Math.random() * 90000000)}`;
    const ownerEmail = `owner_att_${timestamp}@example.com`;
    const ownerMobile = `93${Math.floor(10000000 + Math.random() * 90000000)}`;

    let student1Token = null, student1Id = null;
    let student2Token = null, student2Id = null;
    let ownerToken = null;

    // Helper: Register Student
    async function registerTestStudent(email, mobile, name) {
        const sOtp = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/send', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email, userType: 'student', purpose: 'registration' });

        if (!sOtp.body || !sOtp.body.otp) {
            console.error("OTP Send Failed:", sOtp.body);
            throw new Error(`OTP Send Failed: ${JSON.stringify(sOtp.body)}`);
        }

        await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/verify', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email, userType: 'student', purpose: 'registration', otp: sOtp.body.otp });

        const regRes = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/student/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            fullName: name,
            fatherName: "Test Father",
            gender: "Male",
            dob: "2000-01-01",
            mobile,
            email,
            password: "Password@123"
        });

        if (!regRes.body || !regRes.body.success || !regRes.body.student) {
            console.error("Student Registration Failed:", regRes.body);
            throw new Error(`Registration failed: ${JSON.stringify(regRes.body)}`);
        }

        // Register face
        await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/face/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            studentId: regRes.body.student._id,
            faceData: "valid_reference_face_descriptor_payload_string_hash_1234567890"
        });

        return { token: regRes.body.token, id: regRes.body.student._id };
    }

    // Helper: Register Owner
    async function registerTestOwner() {
        const sOtp = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/send', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: ownerEmail, userType: 'owner', purpose: 'registration' });

        await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/verify', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: ownerEmail, userType: 'owner', purpose: 'registration', otp: sOtp.body.otp });

        const oReg = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/owner/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            libraryName: "BarnalaByte Geofence Library",
            ownerName: "Geofence Owner",
            mobile: ownerMobile,
            email: ownerEmail,
            password: "Password@123"
        });

        return oReg.body.token;
    }

    try {
        const s1 = await registerTestStudent(student1Email, student1Mobile, "Student One");
        student1Token = s1.token;
        student1Id = s1.id;

        const s2 = await registerTestStudent(student2Email, student2Mobile, "Student Two");
        student2Token = s2.token;
        student2Id = s2.id;

        ownerToken = await registerTestOwner();

        assertTest(student1Token && student2Token && ownerToken, "Setup Test Users (Students & Owner)");
    } catch (err) {
        console.error("Setup Test Users Error details:", err);
        assertTest(false, "Setup Test Users", err.message || String(err));
        return;
    }

    // Library Config Coords: (30.3782, 75.5459)

    // TEST 1: Missing GPS coordinates -> REJECTED
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/attendance/checkin', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${student1Token}` }
        }, {
            faceData: "valid_reference_face_descriptor_payload_string_hash_1234567890"
        });

        assertTest(res.statusCode === 400 && !res.body.success,
            "TEST 1: Missing GPS coordinates -> REJECTED");
    } catch (e) {
        assertTest(false, "TEST 1: Missing GPS coordinates", e.message);
    }

    // TEST 2: Invalid/NaN GPS coordinates -> REJECTED
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/attendance/checkin', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${student1Token}` }
        }, {
            latitude: "invalid_lat", longitude: "invalid_lng",
            faceData: "valid_reference_face_descriptor_payload_string_hash_1234567890"
        });

        assertTest(res.statusCode === 400 && !res.body.success,
            "TEST 2: Invalid/NaN GPS coordinates -> REJECTED");
    } catch (e) {
        assertTest(false, "TEST 2: Invalid GPS coordinates", e.message);
    }

    // TEST 3: Outside 20 meters (e.g. 30.3850, 75.5500 ~800m away) -> REJECTED
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/attendance/checkin', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${student1Token}` }
        }, {
            latitude: 30.3850, longitude: 75.5500, accuracy: 5,
            faceData: "valid_reference_face_descriptor_payload_string_hash_1234567890"
        });

        assertTest(res.statusCode === 400 && res.body.message.includes("outside"),
            "TEST 3: Outside 20 meters -> REJECTED");
    } catch (e) {
        assertTest(false, "TEST 3: Outside 20 meters", e.message);
    }

    // TEST 4: Invalid Face Payload -> REJECTED
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/attendance/checkin', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${student1Token}` }
        }, {
            latitude: 30.3782, longitude: 75.5459, accuracy: 5,
            faceData: ""
        });

        assertTest(res.statusCode === 400 && res.body.message.includes("Face verification failed"),
            "TEST 4: Invalid/empty Face Payload -> REJECTED");
    } catch (e) {
        assertTest(false, "TEST 4: Invalid Face Payload", e.message);
    }

    // TEST 5: Client sends fake verified=true without faceData -> REJECTED
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/attendance/checkin', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${student1Token}` }
        }, {
            latitude: 30.3782, longitude: 75.5459,
            verified: true, faceVerified: true
        });

        assertTest(res.statusCode === 400 && res.body.message.includes("Face verification failed"),
            "TEST 5: Client fake verified=true -> REJECTED");
    } catch (e) {
        assertTest(false, "TEST 5: Client fake verified=true", e.message);
    }

    // TEST 6: Valid Face + Inside 20m + No Active Session -> Check-in SUCCESS
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/attendance/checkin', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${student1Token}` }
        }, {
            latitude: 30.3782, longitude: 75.5459, accuracy: 5,
            faceData: "valid_reference_face_descriptor_payload_string_hash_1234567890"
        });

        assertTest(res.statusCode === 201 && res.body.success && res.body.attendance?.status === "Open",
            "TEST 6: Valid Face + Inside 20m -> Check-in SUCCESS (Status: Open)");
    } catch (e) {
        assertTest(false, "TEST 6: Check-in SUCCESS", e.message);
    }

    // TEST 7: Duplicate Check-in while session is Open -> REJECTED (HTTP 409)
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/attendance/checkin', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${student1Token}` }
        }, {
            latitude: 30.3782, longitude: 75.5459, accuracy: 5,
            faceData: "valid_reference_face_descriptor_payload_string_hash_1234567890"
        });

        assertTest(res.statusCode === 409 && res.body.message.includes("active library session"),
            "TEST 7: Duplicate Check-in while session is Open -> REJECTED (409)");
    } catch (e) {
        assertTest(false, "TEST 7: Duplicate Check-in", e.message);
    }

    // TEST 8: Checkout without active session for Student 2 -> REJECTED (HTTP 409)
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/attendance/checkout', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${student2Token}` }
        }, {
            latitude: 30.3782, longitude: 75.5459, accuracy: 5,
            faceData: "valid_reference_face_descriptor_payload_string_hash_1234567890"
        });

        assertTest(res.statusCode === 409 && res.body.message.includes("No active library session"),
            "TEST 8: Checkout without active session -> REJECTED (409)");
    } catch (e) {
        assertTest(false, "TEST 8: Checkout without active session", e.message);
    }

    // TEST 9: Outside 20m Checkout for Student 1 -> REJECTED
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/attendance/checkout', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${student1Token}` }
        }, {
            latitude: 30.3950, longitude: 75.5600, accuracy: 5, // ~2km away
            faceData: "valid_reference_face_descriptor_payload_string_hash_1234567890"
        });

        assertTest(res.statusCode === 400 && res.body.message.includes("outside"),
            "TEST 9: Outside 20m Checkout -> REJECTED");
    } catch (e) {
        assertTest(false, "TEST 9: Outside 20m Checkout", e.message);
    }

    // TEST 10: Valid Face + Inside 20m + Open session -> Checkout SUCCESS (Status: Completed)
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/attendance/checkout', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${student1Token}` }
        }, {
            latitude: 30.3782, longitude: 75.5459, accuracy: 5,
            faceData: "valid_reference_face_descriptor_payload_string_hash_1234567890"
        });

        assertTest(res.statusCode === 200 && res.body.success && res.body.attendance?.status === "Completed",
            "TEST 10: Valid Face + Inside 20m -> Checkout SUCCESS (Status: Completed)");
    } catch (e) {
        assertTest(false, "TEST 10: Checkout SUCCESS", e.message);
    }

    // TEST 11: Student 1 trying to read Student 2 attendance history -> HTTP 403 Forbidden
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: `/api/attendance/history/${student2Id}`, method: 'GET',
            headers: { 'Authorization': `Bearer ${student1Token}` }
        });

        assertTest(res.statusCode === 403 && (res.body.message.includes("access") || res.body.message.includes("Access")),
            "TEST 11: Student A reading Student B attendance -> REJECTED (403)");
    } catch (e) {
        assertTest(false, "TEST 11: Student A reading Student B attendance", e.message);
    }

    // TEST 12: Student 1 trying to access Owner Live Attendance API -> HTTP 403 Forbidden
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/attendance/owner/today', method: 'GET',
            headers: { 'Authorization': `Bearer ${student1Token}` }
        });

        assertTest(res.statusCode === 403,
            "TEST 12: Student accessing Owner Live Attendance API -> REJECTED (403)");
    } catch (e) {
        assertTest(false, "TEST 12: Student accessing Owner API", e.message);
    }

    // TEST 13: Owner accessing Owner Live Attendance API -> SUCCESS
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/attendance/owner/today', method: 'GET',
            headers: { 'Authorization': `Bearer ${ownerToken}` }
        });

        assertTest(res.statusCode === 200 && res.body.success && res.body.summary !== undefined,
            "TEST 13: Owner accessing Owner Live Attendance API -> SUCCESS");
    } catch (e) {
        assertTest(false, "TEST 13: Owner accessing Owner API", e.message);
    }

    console.log("==================================================");
    console.log(`📊 TEST RESULTS SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log("==================================================");
}

runAttendanceTests();
