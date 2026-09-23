const http = require('http');
const jwt = require('jsonwebtoken');

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

async function runSecurityTests() {
    console.log("==================================================");
    console.log("🔒 BARNALABYTE MANDATORY SECURITY & ACCESS CONTROL TESTS");
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

    const testStudent1Email = `sec_stu1_${Date.now()}@example.com`;
    const testStudent2Email = `sec_stu2_${Date.now()}@example.com`;
    const testOwnerEmail = `sec_owner_${Date.now()}@example.com`;
    const testMobile1 = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testMobile2 = `92${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testMobileOwner = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

    let student1Token = null;
    let student1Id = null;
    let student1Code = null;

    let student2Token = null;
    let student2Id = null;
    let student2Code = null;

    let ownerToken = null;

    try {
        // Register Student 1
        const s1Otp = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/send', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testStudent1Email, userType: 'student', purpose: 'registration' });

        await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/verify', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testStudent1Email, userType: 'student', purpose: 'registration', otp: s1Otp.body.otp });

        const s1Reg = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/student/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            fullName: "Student One", fatherName: "Father 1", mobile: testMobile1,
            email: testStudent1Email, password: "Password123", gender: "Male", dob: "2000-01-01"
        });

        student1Token = s1Reg.body.token;
        student1Id = s1Reg.body.student?._id;
        student1Code = s1Reg.body.student?.studentId;

        // Register Student 2
        const s2Otp = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/send', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testStudent2Email, userType: 'student', purpose: 'registration' });

        await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/verify', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testStudent2Email, userType: 'student', purpose: 'registration', otp: s2Otp.body.otp });

        const s2Reg = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/student/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            fullName: "Student Two", fatherName: "Father 2", mobile: testMobile2,
            email: testStudent2Email, password: "Password123", gender: "Female", dob: "2001-02-02"
        });

        student2Token = s2Reg.body.token;
        student2Id = s2Reg.body.student?._id;
        student2Code = s2Reg.body.student?.studentId;

        // Register Owner
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
            libraryName: "Security Library", ownerName: "Owner Security",
            mobile: testMobileOwner, email: testOwnerEmail, password: "OwnerPassword123"
        });

        ownerToken = oReg.body.token;
    } catch (err) {
        console.error("Setup Error:", err.message);
    }

    // ==========================================================
    // TEST 1: Guest -> Owner Dashboard (Expected: 401)
    // ==========================================================
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/owner/dashboard', method: 'GET'
        });
        assertTest(res.statusCode === 401 && res.body.success === false,
            "Test 1: Guest -> Owner Dashboard (Expected HTTP 401 Authentication required)");
    } catch (e) { assertTest(false, "Test 1", e.message); }

    // ==========================================================
    // TEST 2: Student -> Owner Dashboard (Expected: 403)
    // ==========================================================
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/owner/dashboard', method: 'GET',
            headers: { 'Authorization': `Bearer ${student1Token}` }
        });
        assertTest(res.statusCode === 403 && res.body.message === "Owner access required.",
            "Test 2: Student -> Owner Dashboard (Expected HTTP 403 'Owner access required.')");
    } catch (e) { assertTest(false, "Test 2", e.message); }

    // ==========================================================
    // TEST 3: Owner -> Owner Dashboard (Expected: 200)
    // ==========================================================
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/owner/dashboard', method: 'GET',
            headers: { 'Authorization': `Bearer ${ownerToken}` }
        });
        assertTest(res.statusCode === 200 && res.body.success === true && res.body.dashboard !== undefined,
            "Test 3: Owner -> Owner Dashboard (Expected HTTP 200 Allowed)");
    } catch (e) { assertTest(false, "Test 3", e.message); }

    // ==========================================================
    // TEST 4: Student -> Own Profile (Expected: 200)
    // ==========================================================
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: `/api/student/profile/${student1Id}`, method: 'GET',
            headers: { 'Authorization': `Bearer ${student1Token}` }
        });
        assertTest(res.statusCode === 200 && res.body.success === true && res.body.student?._id === student1Id,
            "Test 4: Student -> Own Profile (Expected HTTP 200 Allowed)");
    } catch (e) { assertTest(false, "Test 4", e.message); }

    // ==========================================================
    // TEST 5: Student -> Another Student Profile (Expected: 403)
    // ==========================================================
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: `/api/student/profile/${student2Id}`, method: 'GET',
            headers: { 'Authorization': `Bearer ${student1Token}` }
        });
        assertTest(res.statusCode === 403 && res.body.message === "You can only access your own profile.",
            "Test 5: Student -> Another Student Profile (Expected HTTP 403 'You can only access your own profile.')");
    } catch (e) { assertTest(false, "Test 5", e.message); }

    // ==========================================================
    // TEST 6: Owner -> Any Student Profile (Expected: 200)
    // ==========================================================
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: `/api/student/profile/${student1Id}`, method: 'GET',
            headers: { 'Authorization': `Bearer ${ownerToken}` }
        });
        assertTest(res.statusCode === 200 && res.body.success === true && res.body.student?._id === student1Id,
            "Test 6: Owner -> Any Student Profile (Expected HTTP 200 Allowed)");
    } catch (e) { assertTest(false, "Test 6", e.message); }

    // ==========================================================
    // TEST 7: Student -> Owner Student List (Expected: 403)
    // ==========================================================
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/owner/students', method: 'GET',
            headers: { 'Authorization': `Bearer ${student1Token}` }
        });
        assertTest(res.statusCode === 403 && res.body.message === "Owner access required.",
            "Test 7: Student -> Owner Student List (Expected HTTP 403 'Owner access required.')");
    } catch (e) { assertTest(false, "Test 7", e.message); }

    // ==========================================================
    // TEST 8: Student -> Owner Payments / Another Payment (Expected: 403)
    // ==========================================================
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/payment/all', method: 'GET',
            headers: { 'Authorization': `Bearer ${student1Token}` }
        });
        assertTest(res.statusCode === 403 && res.body.message === "Owner access required.",
            "Test 8: Student -> All Payments List (Expected HTTP 403 'Owner access required.')");
    } catch (e) { assertTest(false, "Test 8", e.message); }

    // ==========================================================
    // TEST 9: Student -> Another Student Attendance (Expected: 403)
    // ==========================================================
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: `/api/attendance/history/${student2Id}`, method: 'GET',
            headers: { 'Authorization': `Bearer ${student1Token}` }
        });
        assertTest(res.statusCode === 403 && res.body.message === "You can only access your own profile.",
            "Test 9: Student -> Another Student Attendance (Expected HTTP 403 'You can only access your own profile.')");
    } catch (e) { assertTest(false, "Test 9", e.message); }

    // ==========================================================
    // TEST 10: Student attempts to change another student's seat (Expected: 403)
    // ==========================================================
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: `/api/seat/allot/${student2Id}`, method: 'PUT',
            headers: {
                'Authorization': `Bearer ${student1Token}`,
                'Content-Type': 'application/json'
            }
        });
        assertTest(res.statusCode === 403 && res.body.message === "Owner access required.",
            "Test 10: Student -> Allot/Change Another Student Seat (Expected HTTP 403 'Owner access required.')");
    } catch (e) { assertTest(false, "Test 10", e.message); }

    // ==========================================================
    // TEST 11: Invalid JWT (Expected: 401)
    // ==========================================================
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/owner/dashboard', method: 'GET',
            headers: { 'Authorization': 'Bearer invalid_malformed_token_string' }
        });
        assertTest(res.statusCode === 401 && res.body.message.includes("Authentication required"),
            "Test 11: Invalid JWT Token (Expected HTTP 401 Authentication required)");
    } catch (e) { assertTest(false, "Test 11", e.message); }

    // ==========================================================
    // TEST 12: Expired JWT (Expected: 401)
    // ==========================================================
    try {
        // Construct an expired token signed with secret
        const expiredToken = jwt.sign(
            { id: student1Id, role: 'student' },
            process.env.JWT_SECRET || 'barnalabyte_secret',
            { expiresIn: -10 } // Expired 10 seconds ago
        );

        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: `/api/student/profile/${student1Id}`, method: 'GET',
            headers: { 'Authorization': `Bearer ${expiredToken}` }
        });
        assertTest(res.statusCode === 401 && res.body.message.includes("Authentication required"),
            "Test 12: Expired JWT Token (Expected HTTP 401 Authentication required)");
    } catch (e) { assertTest(false, "Test 12", e.message); }

    console.log("==================================================");
    console.log(`📊 SECURITY TESTS RESULTS SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log("==================================================");
}

runSecurityTests();
