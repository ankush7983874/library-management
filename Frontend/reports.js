const API_BASE = "http://localhost:5000/api";
const ownerToken = localStorage.getItem("ownerToken");

if (!ownerToken) {
    alert("Owner access required. Please login as Owner.");
    window.location.href = "owner-login.html";
}

document.addEventListener("DOMContentLoaded", () => {
    const backBtn = document.getElementById("backBtn");
    if (backBtn) {
        backBtn.onclick = function() {
            window.location.href = "owner-dashboard.html";
        };
    }

    loadReportsData();
});

async function loadReportsData() {
    try {
        const response = await fetch(`${API_BASE}/owner/reports`, {
            headers: {
                "Authorization": `Bearer ${ownerToken}`
            }
        });

        if (response.status === 401 || response.status === 403) {
            alert("Owner access expired or forbidden.");
            localStorage.removeItem("ownerToken");
            window.location.href = "owner-login.html";
            return;
        }

        if (!response.ok) {
            showReportsError();
            return;
        }

        const data = await response.json();
        if (data.success && data.reports) {
            const r = data.reports;
            document.getElementById("reportTotalSeats").textContent = r.totalSeats || 150;
            document.getElementById("reportOccupiedSeats").textContent = r.occupiedSeats || 0;
            document.getElementById("reportAvailableSeats").textContent = r.availableSeats || 150;
            document.getElementById("reportMonthlyIncome").textContent = "₹" + (r.monthlyIncome || 0).toLocaleString('en-IN');
            document.getElementById("reportPendingFees").textContent = r.pendingFeesCount || 0;
            document.getElementById("reportWaitingCount").textContent = r.waitingCount || 0;

            const summaryTable = document.getElementById("monthlySummaryTable");
            if (summaryTable) {
                const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
                summaryTable.innerHTML = `
                    <tr>
                        <td>${currentMonth}</td>
                        <td>₹${(r.monthlyIncome || 0).toLocaleString('en-IN')}</td>
                        <td>${r.occupiedSeats || 0}</td>
                        <td>${r.attendancePct || 0}%</td>
                    </tr>
                `;
            }

            const graphRev = document.getElementById("graphRevenue");
            if (graphRev) {
                graphRev.innerHTML = `<div style="padding:15px; text-align:center;">
                    <h3 style="color:#2b6cb0;">Total Monthly Revenue</h3>
                    <p style="font-size:24px; font-weight:700; color:#276749; margin-top:10px;">₹${(r.monthlyIncome || 0).toLocaleString('en-IN')}</p>
                    <small style="color:#718096;">Verified Paid Payments</small>
                </div>`;
            }

            const graphOcc = document.getElementById("graphOccupancy");
            if (graphOcc) {
                graphOcc.innerHTML = `<div style="padding:15px; text-align:center;">
                    <h3 style="color:#2b6cb0;">Seat Occupancy & Attendance</h3>
                    <p style="font-size:20px; font-weight:700; color:#2d3748; margin-top:10px;">Seat Occupancy: ${r.seatOccupancyPct || 0}%</p>
                    <p style="font-size:16px; font-weight:600; color:#4a5568;">Today's Attendance: ${r.todayAttendance || 0} (${r.attendancePct || 0}%)</p>
                </div>`;
            }
        } else {
            showReportsError();
        }
    } catch (err) {
        console.error("loadReportsData Error:", err);
        showReportsError();
    }
}

function showReportsError() {
    const summaryTable = document.getElementById("monthlySummaryTable");
    if (summaryTable) {
        summaryTable.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#e53e3e; font-weight:bold;">Unable to load dashboard information. Please try again. <button onclick="loadReportsData()" style="margin-left: 8px; padding: 4px 10px; background: #2563eb; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Retry</button></td></tr>`;
    }
}