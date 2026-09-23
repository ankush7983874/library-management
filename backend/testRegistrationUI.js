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

async function runRegistrationTests() {
    console.log("==================================================");
    console.log("🧪 BARNALABYTE REGISTRATION PAGE & API TESTS");
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

    const testEmail = `reg_test_${Date.now()}@example.com`;
    const testMobile = `95${Math.floor(10000000 + Math.random() * 90000000)}`;

    // 1. Send OTP
    let otp = null;
    try {
        const sendOtp = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/send', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testEmail, userType: 'student', purpose: 'registration' });

        otp = sendOtp.body.otp;
        assertTest(sendOtp.statusCode === 200 && sendOtp.body.success, "Send Email OTP API");
    } catch (e) {
        assertTest(false, "Send Email OTP API", e.message);
    }

    // 2. Verify Wrong OTP Handling
    try {
        const wrongOtp = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/verify', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testEmail, userType: 'student', purpose: 'registration', otp: '000000' });

        assertTest(wrongOtp.statusCode === 400 && wrongOtp.body.message.includes("Invalid"), "Invalid OTP Rejection (HTTP 400)");
    } catch (e) {
        assertTest(false, "Invalid OTP Rejection", e.message);
    }

    // 3. Registration without OTP verification MUST FAIL
    try {
        const unverifiedReg = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/student/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            fullName: "Unverified Student",
            fatherName: "Father",
            mobile: `94${Math.floor(10000000 + Math.random() * 90000000)}`,
            email: `unverified_${Date.now()}@example.com`,
            password: "Password123",
            gender: "Male",
            dob: "2001-01-01"
        });

        assertTest(unverifiedReg.statusCode === 400 && unverifiedReg.body.message.includes("OTP"), "Registration Gate: Rejected without Verified OTP");
    } catch (e) {
        assertTest(false, "Registration Gate: Rejected without Verified OTP", e.message);
    }

    // 4. Verify Correct OTP
    try {
        const verifyRes = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/verify', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testEmail, userType: 'student', purpose: 'registration', otp });

        assertTest(verifyRes.statusCode === 200 && verifyRes.body.success, "Correct OTP Verification");
    } catch (e) {
        assertTest(false, "Correct OTP Verification", e.message);
    }

    // 5. Complete Valid Student Registration
    let studentId = null;
    try {
        const regRes = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/student/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            fullName: "Neumorphic Reg Student",
            fatherName: "Rajesh Kumar",
            motherName: "Sunita Devi",
            mobile: testMobile,
            email: testEmail,
            password: "StudentPassword123",
            gender: "Male",
            dob: "2002-04-10",
            college: "IIT Delhi",
            course: "B.Tech Computer Science",
            address: "123 Smart Library Road, Barnala"
        });

        studentId = regRes.body.student?._id;
        assertTest(regRes.statusCode === 201 && studentId, "Valid Student Registration with Full Details");
    } catch (e) {
        assertTest(false, "Valid Student Registration", e.message);
    }

    // 6. Test Duplicate Email Rejection
    try {
        // Send and verify OTP for duplicate email attempt
        const sendOtp2 = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/send', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testEmail, userType: 'student', purpose: 'registration' });
        const otp2 = sendOtp2.body.otp;

        await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/verify', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: testEmail, userType: 'student', purpose: 'registration', otp: otp2 });

        const dupEmail = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/student/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            fullName: "Duplicate Student",
            fatherName: "Father",
            mobile: `93${Math.floor(10000000 + Math.random() * 90000000)}`,
            email: testEmail,
            password: "Password123",
            gender: "Male",
            dob: "2001-01-01"
        });

        assertTest(dupEmail.statusCode === 400 && dupEmail.body.message.includes("already registered"), "Duplicate Email Rejection (HTTP 400)");
    } catch (e) {
        assertTest(false, "Duplicate Email Rejection", e.message);
    }

    // 7. Test Duplicate Mobile Rejection
    try {
        const dupMobileEmail = `dup_mobile_${Date.now()}@example.com`;
        const sendOtp3 = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/send', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: dupMobileEmail, userType: 'student', purpose: 'registration' });
        const otp3 = sendOtp3.body.otp;

        await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/otp/verify', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: dupMobileEmail, userType: 'student', purpose: 'registration', otp: otp3 });

        const dupMobile = await makeRequest({
            hostname: 'localhost', port: 5000, path: '/api/student/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            fullName: "Duplicate Mobile Student",
            fatherName: "Father",
            mobile: testMobile, // Same mobile
            email: dupMobileEmail,
            password: "Password123",
            gender: "Male",
            dob: "2001-01-01"
        });

        assertTest(dupMobile.statusCode === 400 && dupMobile.body.message.includes("already registered"), "Duplicate Mobile Rejection (HTTP 400)");
    } catch (e) {
        assertTest(false, "Duplicate Mobile Rejection", e.message);
    }

    console.log("==================================================");
    console.log(`📊 REGISTRATION TEST RESULTS SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log("==================================================");
}

runRegistrationTests();
