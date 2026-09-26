const http = require('http');

function testGetSeats() {
    return new Promise((resolve, reject) => {
        http.get('http://localhost:5000/api/seat', (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    resolve({ statusCode: res.statusCode, data });
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function runTest() {
    console.log("==========================================");
    console.log("TESTING 150-SEAT FLOOR MAP API RESTORATION");
    console.log("==========================================\n");

    try {
        const { statusCode, data } = await testGetSeats();
        
        console.log("1. HTTP Status Code:", statusCode);
        if (statusCode !== 200) {
            throw new Error(`Expected HTTP 200 OK, got ${statusCode}`);
        }
        console.log("✅ HTTP 200 OK Received");

        console.log("2. API Success Property:", data.success);
        if (!data.success) {
            throw new Error("API returned success: false");
        }
        console.log("✅ API Success True");

        console.log("3. Total Seats Returned:", data.seats ? data.seats.length : 0);
        if (!data.seats || data.seats.length !== 150) {
            throw new Error(`Expected exactly 150 seats, got ${data.seats ? data.seats.length : 0}`);
        }
        console.log("✅ Exactly 150 Seats Returned");

        let freeCount = 0;
        let bookedCount = 0;
        data.seats.forEach(s => {
            if (s.status === "Available") freeCount++;
            else bookedCount++;
        });

        console.log(`4. Available Free Seats: ${freeCount}`);
        console.log(`5. Booked / Occupied Seats: ${bookedCount}`);
        console.log(`6. Total Capacity: ${freeCount + bookedCount} / 150`);

        console.log("\n==========================================");
        console.log("🎉 ALL 150-SEAT FLOOR MAP VERIFICATIONS PASSED!");
        console.log("==========================================\n");

    } catch (err) {
        console.error("❌ TEST FAILED:", err.message);
        process.exit(1);
    }
}

runTest();
