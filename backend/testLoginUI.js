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

async function runLoginTests() {
    console.log("==================================================");
    console.log("🧪 BARNALABYTE LOGIN PAGE & API INTEGRATION TESTS");
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

    const testStudentEmail = `login_student_${Date.now()}@example.com`;
    const testStudentMobile = `97${Math.floor(10000000 + Math.random() * 90000000)}`;

    const testOwnerEmail = `login_owner_${Date.now()}@example.com`;
    const testOwnerMobile = `96${Math.floor(10000000 + Math.random() * 90000000)}`;

    // 1. Create Student
    try {
        const sendOtp = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/send', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testStudentEmail, userType: 'student', purpose: 'registration' });

        const otp = sendOtp.body.otp;

        await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/verify', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testStudentEmail, userType: 'student', purpose: 'registration', otp });

        const regRes = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/student/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            fullName: "Login Test Student",
            fatherName: "Test Father",
            motherName: "Test Mother",
            mobile: testStudentMobile,
            email: testStudentEmail,
            password: "StudentPassword123",
            gender: "Male",
            dob: "2002-05-15"
        });

        assertTest(regRes.statusCode === 201 && regRes.body.student?._id, "Setup: Student Registration");
    } catch (e) {
        assertTest(false, "Setup: Student Registration", e.message);
    }

    // 2. Create Owner
    try {
        const sendOtp = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/send', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testOwnerEmail, userType: 'owner', purpose: 'registration' });

        const otp = sendOtp.body.otp;

        await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/verify', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testOwnerEmail, userType: 'owner', purpose: 'registration', otp });

        const regOwner = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/owner/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            libraryName: "BarnalaByte Central",
            ownerName: "Login Test Owner",
            mobile: testOwnerMobile,
            email: testOwnerEmail,
            password: "OwnerPassword123"
        });

        assertTest(regOwner.statusCode === 201 && regOwner.body.owner?.id, "Setup: Owner Registration");
    } catch (e) {
        assertTest(false, "Setup: Owner Registration", e.message);
    }

    // 3. Test Valid Student Login
    try {
        const studLogin = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/student/login', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testStudentEmail, password: "StudentPassword123" });

        assertTest(studLogin.statusCode === 200 && studLogin.body.token && studLogin.body.student, "Valid Student Login API");
    } catch (e) {
        assertTest(false, "Valid Student Login API", e.message);
    }

    // 4. Test Valid Owner Login
    try {
        const ownLogin = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/owner/login', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testOwnerEmail, password: "OwnerPassword123" });

        assertTest(ownLogin.statusCode === 200 && ownLogin.body.token && ownLogin.body.owner, "Valid Owner Login API");
    } catch (e) {
        assertTest(false, "Valid Owner Login API", e.message);
    }

    // 5. Test Invalid Password
    try {
        const invalidPass = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/student/login', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testStudentEmail, password: "WrongPassword999" });

        assertTest(invalidPass.statusCode === 401 && invalidPass.body.message.includes("Invalid"), "Invalid Password Handling (HTTP 401)");
    } catch (e) {
        assertTest(false, "Invalid Password Handling", e.message);
    }

    // 6. Test Non-existent Email
    try {
        const notFound = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/student/login', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: "nonexistent_email_123456@example.com", password: "Password123" });

        assertTest(notFound.statusCode === 404 && notFound.body.message.includes("not found"), "Non-existent User Handling (HTTP 404)");
    } catch (e) {
        assertTest(false, "Non-existent User Handling", e.message);
    }

    console.log("==================================================");
    console.log(`📊 LOGIN TEST RESULTS SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log("==================================================");
}

runLoginTests();
