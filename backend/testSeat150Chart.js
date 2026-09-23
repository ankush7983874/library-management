// ====================================================
// Automated Verification: 150 Seat Interactive Floor Chart
// ====================================================

const fs = require('fs');
const path = require('path');

console.log("Starting 150-Seat Interactive Floor Chart Verification...\n");

const frontendDir = path.join(__dirname, '../Frontend');

function checkFileContains(fileName, expectedStrings) {
    const filePath = path.join(frontendDir, fileName);
    const content = fs.readFileSync(filePath, 'utf8');

    expectedStrings.forEach(str => {
        if (content.includes(str)) {
            console.log(`[PASS] ${fileName} contains: "${str}"`);
        } else {
            console.error(`[FAIL] ${fileName} MISSING: "${str}"`);
            process.exit(1);
        }
    });
}

// 1. Check seat-availability.html chart zones & search bar
checkFileContains('seat-availability.html', [
    '150-Seat Interactive Floor Chart',
    'Zone A: Quiet Study Hall (Seats 1–50)',
    'Zone B: Computer & Digital Zone (Seats 51–100)',
    'Zone C: Premium Reading Bay (Seats 101–150)',
    'seatSearchInput',
    'zoneAGrid',
    'zoneBGrid',
    'zoneCGrid'
]);

// 2. Check seat-availability.css 150-seat chart styles
checkFileContains('seat-availability.css', [
    '.seat-chart-grid',
    '.zone-header',
    'span.seat-num',
    'span.seat-label'
]);

// 3. Check seat.js zone rendering & search filter logic
checkFileContains('seat.js', [
    'zoneAGrid',
    'zoneBGrid',
    'zoneCGrid',
    'setupSeatSearchFilter',
    'data-seat-num'
]);

console.log("\n=======================================================");
console.log("ALL 150-SEAT INTERACTIVE CHART CHECKS PASSED!");
console.log("=======================================================");
