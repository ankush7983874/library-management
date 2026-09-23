// ====================================================
// Automated Verification: Mandatory API Error Handling
// ====================================================

const fs = require('fs');
const path = require('path');

console.log("Starting Mandatory API Error Handling Verification...\n");

const frontendDir = path.join(__dirname, '../Frontend');

// Exact required error messages
const REQUIRED_MESSAGES = {
    seat: "Unable to load seat information. Please try again.",
    student: "Unable to load student information. Please try again.",
    payment: "Unable to load payment status. Please try again.",
    attendance: "Unable to load attendance information. Please try again.",
    dashboard: "Unable to load dashboard information. Please try again."
};

let totalChecks = 0;
let passedChecks = 0;

function checkFileContains(fileName, expectedStrings) {
    const filePath = path.join(frontendDir, fileName);
    if (!fs.existsSync(filePath)) {
        console.error(`[FAIL] File ${fileName} does not exist.`);
        return;
    }

    const content = fs.readFileSync(filePath, 'utf8');

    expectedStrings.forEach(expectedStr => {
        totalChecks++;
        if (content.includes(expectedStr)) {
            console.log(`[PASS] ${fileName} contains: "${expectedStr}"`);
            passedChecks++;
        } else {
            console.error(`[FAIL] ${fileName} MISSING: "${expectedStr}"`);
        }
    });
}

function checkNoDummyFallbacks(fileName) {
    const filePath = path.join(frontendDir, fileName);
    if (!fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath, 'utf8');
    const dummyPatterns = [
        "|| mockData",
        "|| dummyData",
        "|| sampleData",
        "|| fakeData"
    ];

    dummyPatterns.forEach(pattern => {
        totalChecks++;
        if (!content.includes(pattern)) {
            console.log(`[PASS] ${fileName} does not contain production fallback: "${pattern}"`);
            passedChecks++;
        } else {
            console.error(`[FAIL] ${fileName} CONTAINS FORBIDDEN FALLBACK: "${pattern}"`);
        }
    });
}

// 1. Seat API Error Handling Verification
checkFileContains('seat.js', [REQUIRED_MESSAGES.seat, 'Retry']);
checkFileContains('seat-booking.js', [REQUIRED_MESSAGES.seat, 'Retry']);
checkNoDummyFallbacks('seat.js');
checkNoDummyFallbacks('seat-booking.js');

// 2. Student & Dashboard API Error Handling Verification
checkFileContains('student-dashboard.js', [
    REQUIRED_MESSAGES.dashboard,
    REQUIRED_MESSAGES.payment,
    REQUIRED_MESSAGES.attendance,
    'Retry'
]);
checkNoDummyFallbacks('student-dashboard.js');

// 3. Reports & Owner Dashboard Verification
checkFileContains('reports.js', [REQUIRED_MESSAGES.dashboard, 'Retry']);
checkFileContains('owner-dashboard.js', [
    REQUIRED_MESSAGES.dashboard,
    REQUIRED_MESSAGES.attendance,
    REQUIRED_MESSAGES.payment,
    REQUIRED_MESSAGES.student,
    'Retry'
]);
checkNoDummyFallbacks('reports.js');
checkNoDummyFallbacks('owner-dashboard.js');

// 4. Attendance API Verification
checkFileContains('attendance.js', [REQUIRED_MESSAGES.attendance, 'Retry']);
checkNoDummyFallbacks('attendance.js');

// 5. Student ID Card Verification
checkFileContains('student-id-card.js', [REQUIRED_MESSAGES.student, 'Retry']);
checkNoDummyFallbacks('student-id-card.js');

// 6. Payment API Verification
checkFileContains('payment.js', [REQUIRED_MESSAGES.payment, 'Retry']);
checkNoDummyFallbacks('payment.js');

console.log("\n=======================================================");
console.log(`RESULTS: ${passedChecks} / ${totalChecks} MANDATORY ERROR HANDLING CHECKS PASSED!`);
console.log("=======================================================");

if (passedChecks === totalChecks) {
    process.exit(0);
} else {
    process.exit(1);
}
