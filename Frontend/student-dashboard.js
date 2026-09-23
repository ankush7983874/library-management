// ===============================
// Authentication Check
// ===============================

const student = JSON.parse(localStorage.getItem("studentData"));
const token = localStorage.getItem("studentToken");

if (!student || !token) {
    alert("Please Login First");
    window.location.href = "student-login.html";
}

// ===============================
// Clock
// ===============================

function updateClock() {
    const now = new Date();
    const clock = document.getElementById("clock");
    const date = document.getElementById("date");

    if (clock) clock.innerHTML = now.toLocaleTimeString();
    if (date) date.innerHTML = now.toDateString();
}

setInterval(updateClock, 1000);
updateClock();

// ===============================
// Load Student Profile & Dashboard
// ===============================

async function loadStudentDashboard() {
    try {
        const res = await fetch(`http://localhost:5000/api/student/dashboard/${student._id}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (res.status === 401 || res.status === 403) {
            alert("Session expired or unauthorized. Please login again.");
            localStorage.removeItem("studentToken");
            localStorage.removeItem("studentData");
            window.location.href = "student-login.html";
            return;
        }

        const data = await res.json();

        if (data.success && data.student) {
            const stu = data.student;

            // Update localStorage
            localStorage.setItem("studentData", JSON.stringify(stu));

            document.getElementById("studentName").innerHTML = `Welcome, ${stu.fullName} 👋`;

            // OTP Status
            document.getElementById("otpStatus").innerText = "Verified ✅";

            // Face Status
            const faceEl = document.getElementById("faceStatus");
            if (faceEl) {
                if (stu.faceVerified) {
                    faceEl.innerText = "Verified ✅";
                    faceEl.style.color = "#28a745";
                } else {
                    faceEl.innerText = "Optional (Attendance)";
                    faceEl.style.color = "#6c757d";
                }
            }

            // Fee Status
            const feeEl = document.getElementById("feesStatus");
            feeEl.innerText = stu.feesStatus || "Pending";
            feeEl.style.color = stu.feesStatus === "Paid" ? "#28a745" : "#d9534f";

            // Seat Number
            const seatEl = document.getElementById("seatNumber");
            if (stu.seatNumber) {
                seatEl.innerText = `Seat #${stu.seatNumber}`;
                seatEl.style.color = "#007bff";
            } else if (stu.accountStatus === "Waiting") {
                seatEl.innerText = "Waiting List";
                seatEl.style.color = "#ffc107";
            } else {
                seatEl.innerText = "Not Allotted";
                seatEl.style.color = "#6c757d";
            }

            // Photo
            const photo = document.getElementById("studentPhoto");
            if (photo && stu.photo) {
                photo.src = stu.photo.startsWith("http") ? stu.photo : `http://localhost:5000/uploads/${stu.photo}`;
            }

            // Load Dynamic Payment History & Attendance History
            await loadPaymentHistory(stu._id);
            await loadAttendanceHistory(stu._id);
        } else {
            console.error("Failed to load student dashboard data.");
            const nameEl = document.getElementById("studentName");
            if (nameEl) nameEl.innerHTML = `<span style="color:#ef4444;">Unable to load dashboard information. Please try again.</span>`;
        }
    } catch (err) {
        console.error("loadStudentDashboard Error:", err);
        const nameEl = document.getElementById("studentName");
        if (nameEl) nameEl.innerHTML = `<span style="color:#ef4444;">Unable to load dashboard information. Please try again.</span>`;
    }
}

async function loadPaymentHistory(studentId) {
    const tableBody = document.getElementById("dashboardPaymentTable");
    if (!tableBody) return;

    try {
        const res = await fetch(`http://localhost:5000/api/payment/student/${studentId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) {
            tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#ef4444; font-weight:bold;">Unable to load payment status. Please try again. <button onclick="loadPaymentHistory('${studentId}')" style="margin-left:8px; padding:2px 8px; background:#2563eb; color:white; border:none; border-radius:4px; cursor:pointer;">Retry</button></td></tr>`;
            return;
        }

        const data = await res.json();
        tableBody.innerHTML = "";

        const payments = data.payments || [];

        if (payments.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#718096;">No Recent Fee Payments</td></tr>`;
            return;
        }

        payments.slice(0, 5).forEach(p => {
            const monthStr = `${p.month || ''} ${p.year || ''}`.trim() || 'N/A';
            const statusColor = p.status === 'Paid' ? '#28a745' : (p.status === 'Pending' ? '#ffc107' : '#dc3545');

            tableBody.innerHTML += `
                <tr>
                    <td>${monthStr}</td>
                    <td>₹${p.amount || 500}</td>
                    <td><span style="color:${statusColor}; font-weight:bold;">${p.status}</span></td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("loadPaymentHistory Error:", err);
        tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#ef4444; font-weight:bold;">Unable to load payment status. Please try again. <button onclick="loadPaymentHistory('${studentId}')" style="margin-left:8px; padding:2px 8px; background:#2563eb; color:white; border:none; border-radius:4px; cursor:pointer;">Retry</button></td></tr>`;
    }
}

async function loadAttendanceHistory(studentId) {
    const tableBody = document.getElementById("dashboardAttendanceTable");
    if (!tableBody) return;

    try {
        const res = await fetch(`http://localhost:5000/api/attendance/student/${studentId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#ef4444; font-weight:bold;">Unable to load attendance information. Please try again. <button onclick="loadAttendanceHistory('${studentId}')" style="margin-left:8px; padding:2px 8px; background:#2563eb; color:white; border:none; border-radius:4px; cursor:pointer;">Retry</button></td></tr>`;
            return;
        }

        const data = await res.json();
        tableBody.innerHTML = "";

        const records = data.history || data.attendance || [];

        if (records.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#718096;">No Attendance Records</td></tr>`;
            return;
        }

        records.slice(0, 5).forEach(att => {
            const dateStr = att.date ? new Date(att.date).toLocaleDateString() : '-';
            const checkInStr = att.checkIn || '-';
            const checkOutStr = att.checkOut || '-';
            const statusStr = att.status === 'Present' ? 'Present ✅' : (att.status || 'Present');

            tableBody.innerHTML += `
                <tr>
                    <td>${dateStr}</td>
                    <td>${checkInStr}</td>
                    <td>${checkOutStr}</td>
                    <td><span style="color:#28a745; font-weight:bold;">${statusStr}</span></td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("loadAttendanceHistory Error:", err);
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#ef4444; font-weight:bold;">Unable to load attendance information. Please try again. <button onclick="loadAttendanceHistory('${studentId}')" style="margin-left:8px; padding:2px 8px; background:#2563eb; color:white; border:none; border-radius:4px; cursor:pointer;">Retry</button></td></tr>`;
    }
}

loadStudentDashboard();

// Download ID Card Function
function downloadIDCard() {
    if (!student.idCardPDF && !student.seatNumber) {
        alert("ID Card will be generated automatically once your payment and seat allocation are verified.");
        return;
    }
    window.open(`http://localhost:5000/api/idcard/download/${student._id}`, "_blank");
}

// ===============================
// Logout
// ===============================

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("studentToken");
        localStorage.removeItem("studentData");
        alert("Logged Out Successfully");
        window.location.href = "student-login.html";
    });
}