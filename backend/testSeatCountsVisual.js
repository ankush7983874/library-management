// ====================================================
// Automated Verification: Live 1-150 Seat Free & Booked Counter
// ====================================================

const fs = require('fs');
const path = require('path');

console.log("Starting Live 1-150 Seat Counter Verification...\n");

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

// Check seat-availability.html
checkFileContains('seat-availability.html', [
    'summaryFreeSeats',
    'summaryBookedSeats',
    'Total Seats: 150'
]);

// Check seat.js
checkFileContains('seat.js', [
    'summaryFreeSeats',
    'summaryBookedSeats',
    'freeCount',
    'bookedCount'
]);

// Check seat-booking.html & seat-booking.js
checkFileContains('seat-booking.html', [
    'bookingFreeCount',
    'bookingBookedCount'
]);

checkFileContains('seat-booking.js', [
    'bookingFreeCount',
    'bookingBookedCount',
    'freeCount'
]);

console.log("\n=======================================================");
console.log("ALL LIVE 1-150 SEAT COUNTER VERIFICATION CHECKS PASSED!");
console.log("=======================================================");
