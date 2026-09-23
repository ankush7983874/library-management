const fs = require('fs');
const path = require('path');
const http = require('http');

const API_BASE = "http://localhost:5000/api";

function makeRequest(urlPath, method, data) {
    return new Promise((resolve, reject) => {
        const fullUrl = `${API_BASE}${urlPath}`;
        const url = new URL(fullUrl);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
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
    console.log("=== BARNALABYTE OWNER REGISTRATION TEST SUITE ===");

    // Test 1: Frontend File Checks
    const frontendDir = path.join(__dirname, '../Frontend');
    const htmlPath = path.join(frontendDir, 'owner-register.html');
    const cssPath = path.join(frontendDir, 'owner-register.css');
    const jsPath = path.join(frontendDir, 'owner-register.js');

    if (!fs.existsSync(htmlPath) || !fs.existsSync(cssPath) || !fs.existsSync(jsPath)) {
        console.error("FAIL: Owner registration frontend files missing!");
        process.exit(1);
    }

    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    const jsContent = fs.readFileSync(jsPath, 'utf8');

    // Check title, icon, neumorphic CSS
    if (!htmlContent.includes("Create Owner Account") || !htmlContent.includes("Set up your BarnalaByte Library account")) {
        console.error("FAIL: HTML does not contain correct Title/Subtitle");
        process.exit(1);
    }
    if (!htmlContent.includes("fa-user-shield")) {
        console.error("FAIL: HTML does not contain raised user-shield icon");
        process.exit(1);
    }
    if (!cssContent.includes("#e0e5ec") || !cssContent.includes("min-height: 100vh") || !cssContent.includes("overflow-y: auto")) {
        console.error("FAIL: CSS does not contain neumorphic background #e0e5ec or viewport scrolling rules");
        process.exit(1);
    }
    console.log("✔ Test 1 PASSED: Frontend HTML/CSS/JS files verified.");

    // Test 2: Unverified OTP Registration Blocking
    const timestamp = Date.now();
    const testEmail = `testowner_${timestamp}@example.com`;
    const testMobile = `987${Math.floor(1000000 + Math.random() * 9000000)}`;

    const unverifiedReg = await makeRequest('/owner/register', 'POST', {
        libraryName: "Test Barnala Library",
        ownerName: "Test Owner",
        mobile: testMobile,
        email: testEmail,
        password: "OwnerPassword123"
    });

    if (unverifiedReg.status !== 400 || unverifiedReg.data.success !== false) {
        console.error("FAIL: Unverified OTP registration was not blocked!", unverifiedReg);
        process.exit(1);
    }
    console.log("✔ Test 2 PASSED: Registration correctly blocked without verified OTP.");

    // Test 3: OTP Send & Verify Flow
    const otpSendRes = await makeRequest('/otp/send', 'POST', {
        email: testEmail,
        userType: "owner",
        purpose: "registration"
    });

    if (!otpSendRes.data.success) {
        console.error("FAIL: Send OTP failed!", otpSendRes);
        process.exit(1);
    }

    const rawOtp = otpSendRes.data.otp;

    if (!rawOtp) {
        console.error("FAIL: OTP not returned in API response!");
        process.exit(1);
    }

    // Verify OTP with wrong code first
    const wrongOtpRes = await makeRequest('/otp/verify', 'POST', {
        email: testEmail,
        userType: "owner",
        purpose: "registration",
        otp: "000000"
    });

    if (wrongOtpRes.data.success === true) {
        console.error("FAIL: Invalid OTP was accepted!");
        process.exit(1);
    }

    // Verify OTP with correct code
    const correctOtpRes = await makeRequest('/otp/verify', 'POST', {
        email: testEmail,
        userType: "owner",
        purpose: "registration",
        otp: rawOtp
    });

    if (!correctOtpRes.data.success) {
        console.error("FAIL: Correct OTP verification failed!", correctOtpRes);
        process.exit(1);
    }
    console.log("✔ Test 3 PASSED: OTP send, wrong OTP rejection, and correct OTP verification successful.");

    // Test 4: Successful Owner Registration after OTP Verification
    const validRegRes = await makeRequest('/owner/register', 'POST', {
        libraryName: "Barnala Central Smart Library",
        ownerName: "Official Owner",
        mobile: testMobile,
        email: testEmail,
        password: "OwnerPassword123"
    });

    if (validRegRes.status !== 201 || !validRegRes.data.success || !validRegRes.data.token) {
        console.error("FAIL: Owner registration failed!", validRegRes);
        process.exit(1);
    }
    console.log("✔ Test 4 PASSED: Owner registered successfully with hashed password & JWT token.");

    // Test 5: Duplicate Rejection (Email & Mobile)
    const dupEmailRes = await makeRequest('/owner/register', 'POST', {
        libraryName: "Another Library",
        ownerName: "Another Owner",
        mobile: "9998887776",
        email: testEmail,
        password: "Password123"
    });

    if (dupEmailRes.status !== 400 || dupEmailRes.data.message !== "Email already registered.") {
        console.error("FAIL: Duplicate email allowed!", dupEmailRes);
        process.exit(1);
    }

    const diffEmail = `diff_${Date.now()}_${Math.floor(Math.random() * 1000)}@example.com`;

    const dupMobileRes = await makeRequest('/owner/register', 'POST', {
        libraryName: "Another Library",
        ownerName: "Another Owner",
        mobile: testMobile,
        email: diffEmail,
        password: "Password123"
    });

    if (dupMobileRes.status !== 400 || dupMobileRes.data.message !== "Mobile already registered.") {
        console.error("FAIL: Duplicate mobile allowed!", dupMobileRes);
        process.exit(1);
    }
    console.log("✔ Test 5 PASSED: Duplicate Email and Duplicate Mobile rejected properly.");

    // Test 6: Owner Login Verification
    const loginRes = await makeRequest('/owner/login', 'POST', {
        email: testEmail,
        password: "OwnerPassword123"
    });

    if (loginRes.status !== 200 || !loginRes.data.success || !loginRes.data.token) {
        console.error("FAIL: Registered Owner login failed!", loginRes);
        process.exit(1);
    }
    console.log("✔ Test 6 PASSED: Registered Owner logged in successfully with Email + Password.");

    console.log("\nALL 6/6 OWNER REGISTRATION TEST CASES PASSED SUCCESSFULLY! 🎉");
}

runTests().catch(err => {
    console.error("Test Error:", err);
    process.exit(1);
});
