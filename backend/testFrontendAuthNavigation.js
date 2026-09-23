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

async function runFrontendAuthNavTests() {
    console.log("==================================================");
    console.log("🌐 BARNALABYTE FRONTEND AUTH NAVIGATION & DIRECT URL TESTS");
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

    const testStudentEmail = `nav_student_${Date.now()}@example.com`;
    const testOwnerEmail = `nav_owner_${Date.now()}@example.com`;
    const testMobileStu = `97${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testMobileOwn = `96${Math.floor(10000000 + Math.random() * 90000000)}`;

    let studentToken = null;
    let studentId = null;
    let ownerToken = null;

    try {
        // Setup Student
        const sOtp = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/send', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testStudentEmail, userType: 'student', purpose: 'registration' });

        await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/verify', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testStudentEmail, userType: 'student', purpose: 'registration', otp: sOtp.body.otp });

        const sReg = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/student/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            fullName: "Nav Student", fatherName: "Father Nav", mobile: testMobileStu,
            email: testStudentEmail, password: "Password123", gender: "Male", dob: "2000-01-01"
        });

        studentToken = sReg.body.token;
        studentId = sReg.body.student?._id;

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
            libraryName: "Nav Library", ownerName: "Nav Owner",
            mobile: testMobileOwn, email: testOwnerEmail, password: "OwnerPassword123"
        });

        ownerToken = oReg.body.token;
    } catch (e) {
        console.error("Setup Error:", e.message);
    }

    // 1. Guest -> Direct API call for Student Dashboard (Expected: 401)
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: `/api/student/dashboard/${studentId}`, method: 'GET'
        });
        assertTest(res.statusCode === 401, "Guest opening Student Dashboard endpoint directly -> HTTP 401");
    } catch (e) { assertTest(false, "Guest Student Dashboard", e.message); }

    // 2. Guest -> Direct API call for My Account / Student Profile (Expected: 401)
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: `/api/student/profile/${studentId}`, method: 'GET'
        });
        assertTest(res.statusCode === 401, "Guest opening My Account endpoint directly -> HTTP 401");
    } catch (e) { assertTest(false, "Guest My Account", e.message); }

    // 3. Student -> Direct API call for Owner Dashboard (Expected: 403)
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/owner/dashboard', method: 'GET',
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        assertTest(res.statusCode === 403, "Student opening Owner Dashboard endpoint directly -> HTTP 403 Access Denied");
    } catch (e) { assertTest(false, "Student Owner Dashboard", e.message); }

    // 4. Student -> Direct API call for own Student Dashboard (Expected: 200)
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: `/api/student/dashboard/${studentId}`, method: 'GET',
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        assertTest(res.statusCode === 200 && res.body.success === true, "Student opening own Student Dashboard -> HTTP 200 Allowed");
    } catch (e) { assertTest(false, "Student own Dashboard", e.message); }

    // 5. Student -> Direct API call for own My Account (Expected: 200)
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: `/api/student/profile/${studentId}`, method: 'GET',
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        assertTest(res.statusCode === 200 && res.body.success === true, "Student opening own My Account -> HTTP 200 Allowed");
    } catch (e) { assertTest(false, "Student own Profile", e.message); }

    // 6. Owner -> Direct API call for Owner Dashboard (Expected: 200)
    try {
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/owner/dashboard', method: 'GET',
            headers: { 'Authorization': `Bearer ${ownerToken}` }
        });
        assertTest(res.statusCode === 200 && res.body.success === true, "Owner opening Owner Dashboard -> HTTP 200 Allowed");
    } catch (e) { assertTest(false, "Owner Dashboard", e.message); }

    // 7. Logout Simulation -> Removing Token reverts API requests to 401
    try {
        const loggedOutToken = null;
        const res = await makeRequest({
            hostname: 'localhost', port: 5000, path: `/api/student/dashboard/${studentId}`, method: 'GET'
        });
        assertTest(res.statusCode === 401, "Logout -> Token Cleared -> Private Navigation API Requests Revert to HTTP 401");
    } catch (e) { assertTest(false, "Logout clearing token", e.message); }

    console.log("==================================================");
    console.log(`📊 FRONTEND AUTH NAVIGATION RESULTS SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log("==================================================");
}

runFrontendAuthNavTests();
