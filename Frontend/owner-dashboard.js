// ========================================
// BarnalaByte Owner Dashboard Implementation
// Frontend/owner-dashboard.js
// ========================================

const API_BASE = "http://localhost:5000/api";

// ----------------------------------------
// 1. Owner Authentication Check
// ----------------------------------------
const ownerToken = localStorage.getItem("ownerToken");
const ownerData = JSON.parse(localStorage.getItem("ownerData") || "{}");

if (!ownerToken) {
    alert("Owner authentication required. Please login first.");
    window.location.href = "owner-login.html";
}

document.addEventListener("DOMContentLoaded", () => {
    // ----------------------------------------
    // 2. Setup Topbar & Live Clock
    // ----------------------------------------
    setupClock();
    setupOwnerHeader();
    setupSearchFilter();

    // ----------------------------------------
    // 3. Setup Logout Handler
    // ----------------------------------------
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            if (confirm("Are you sure you want to logout?")) {
                localStorage.removeItem("ownerToken");
                localStorage.removeItem("ownerData");
                window.location.href = "owner-login.html";
            }
        });
    }

    // ----------------------------------------
    // 4. Load Dashboard Data & Lists
    // ----------------------------------------
    refreshAllDashboardData();
});

function setupClock() {
    function updateClock() {
        const now = new Date();
        const clockEl = document.getElementById("clock");
        const dateEl = document.getElementById("date");

        if (clockEl) clockEl.textContent = now.toLocaleTimeString();
        if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
    setInterval(updateClock, 1000);
    updateClock();
}

function setupOwnerHeader() {
    if (ownerData && ownerData.ownerName) {
        const welcomeP = document.querySelector(".topbar p");
        if (welcomeP) {
            welcomeP.textContent = `Welcome Back, ${ownerData.ownerName} 👋 (${ownerData.libraryName || 'Library Owner'})`;
        }
    }
}

// ----------------------------------------
// Refresh All Dashboard Components
// ----------------------------------------
async function refreshAllDashboardData() {
    await Promise.all([
        loadDashboardStats(),
        loadLiveAttendance(),
        loadPendingManualPayments(),
        loadStudents(),
        loadPayments(),
        loadWaitingList()
    ]);
}

// ----------------------------------------
// 5. Load Dashboard Stats Cards
// ----------------------------------------
async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE}/owner/dashboard`, {
            headers: {
                "Authorization": `Bearer ${ownerToken}`
            }
        });

        if (response.status === 401 || response.status === 403) {
            handleUnauthorized();
            return;
        }

        const data = await response.json();

        if (data.success && data.dashboard) {
            const db = data.dashboard;
            setCardValue("totalStudents", db.totalStudents || 0);
            setCardValue("totalSeats", db.totalSeats || 150);
            setCardValue("occupiedSeats", db.occupiedSeats || 0);
            setCardValue("availableSeats", db.availableSeats || 150);
            setCardValue("monthlyIncome", "₹" + (db.monthlyIncome || 0).toLocaleString('en-IN'));
            setCardValue("pendingFees", db.pendingFees || 0);
            setCardValue("todayAttendance", db.todayAttendance || 0);
            setCardValue("waitingStudents", db.waitingStudents || 0);
        } else {
            console.error("Failed to load dashboard stats:", data.message);
            showCardError("totalStudents", "Unable to load dashboard information. Please try again.");
        }
    } catch (err) {
        console.error("loadDashboardStats Error:", err);
        showCardError("totalStudents", "Unable to load dashboard information. Please try again.");
    }
}

function showCardError(id, msg) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<span style="color:#e53e3e; font-size:12px;">Error</span>`;
}

function setCardValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

// ----------------------------------------
// 5b. Load Live Attendance Roster (Currently Inside Library)
// ----------------------------------------
async function loadLiveAttendance() {
    const tableBody = document.getElementById("liveRosterTable");
    if (!tableBody) return;

    try {
        const response = await fetch(`${API_BASE}/attendance/owner/today`, {
            headers: {
                "Authorization": `Bearer ${ownerToken}`
            }
        });

        if (response.status === 401 || response.status === 403) {
            handleUnauthorized();
            return;
        }

        const data = await response.json();
        tableBody.innerHTML = "";

        if (!data.success || !data.activeRoster) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#e53e3e; font-weight:bold;">Unable to load attendance information. Please try again. <button onclick="loadLiveAttendance()" style="margin-left: 8px; padding: 2px 8px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button></td></tr>`;
            return;
        }

        if (data.activeRoster.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 15px; color:#718096; font-weight:500;">✓ No students currently inside library</td></tr>`;
            return;
        }

        data.activeRoster.forEach(student => {
            const seatText = student.seatNumber ? `Seat #${student.seatNumber}` : 'Not Assigned';
            const distText = student.distanceMeters !== undefined && student.distanceMeters !== null ? `${student.distanceMeters}m` : '-';

            const row = document.createElement("tr");
            row.innerHTML = `
                <td><strong>${escapeHtml(student.studentName)}</strong></td>
                <td><code style="background:#edf2f7; padding:2px 6px; border-radius:4px;">${escapeHtml(student.studentId)}</code></td>
                <td>${escapeHtml(student.mobile || '-')}</td>
                <td><span style="color:#2b6cb0; font-weight:600;">${escapeHtml(seatText)}</span></td>
                <td>${escapeHtml(student.checkIn || '-')}</td>
                <td><span style="color:#276749; font-weight:700;">${escapeHtml(student.duration)}</span></td>
                <td><span style="background:#dcfce7; color:#166534; padding:2px 8px; border-radius:12px; font-size:12px; font-weight:600;">${distText}</span></td>
            `;

            tableBody.appendChild(row);
        });

    } catch (err) {
        console.error("loadLiveAttendance Error:", err);
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#e53e3e; font-weight:bold;">Unable to load attendance information. Please try again. <button onclick="loadLiveAttendance()" style="margin-left: 8px; padding: 2px 8px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button></td></tr>`;
    }
}

// ----------------------------------------
// 6. Load Pending Manual UPI Payments
// ----------------------------------------
async function loadPendingManualPayments() {
    const tableBody = document.getElementById("pendingManualTable");
    if (!tableBody) return;

    try {
        const response = await fetch(`${API_BASE}/payment/pending-manual`, {
            headers: {
                "Authorization": `Bearer ${ownerToken}`
            }
        });

        if (response.status === 401 || response.status === 403) {
            handleUnauthorized();
            return;
        }

        const data = await response.json();

        tableBody.innerHTML = "";

        if (!data.success || !data.payments) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#e53e3e; font-weight:bold;">Unable to load payment status. Please try again. <button onclick="loadPendingManualPayments()" style="margin-left: 8px; padding: 2px 8px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button></td></tr>`;
            return;
        }

        if (data.payments.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 15px; color:#718096; font-weight:500;">✓ No Pending Manual UPI Payments</td></tr>`;
            return;
        }

        data.payments.forEach(p => {
            const sName = p.student ? p.student.fullName : "Unknown Student";
            const sMobile = p.student ? p.student.mobile : "-";
            const amountStr = `₹${p.amount}`;
            const txnId = p.transactionId || "N/A";
            const pDate = new Date(p.createdAt || p.paymentDate).toLocaleDateString();

            const row = document.createElement("tr");
            row.innerHTML = `
                <td><strong>${escapeHtml(sName)}</strong></td>
                <td>${escapeHtml(sMobile)}</td>
                <td><span style="color:#276749; font-weight:700;">${amountStr}</span></td>
                <td><code style="background:#edf2f7; padding:4px 8px; border-radius:6px; font-weight:600;">${escapeHtml(txnId)}</code></td>
                <td>${pDate}</td>
                <td>
                    <button class="btn-approve" data-id="${p._id}" style="padding:6px 12px; background:#276749; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:600; margin-right:6px; transition:0.2s;">
                        Approve
                    </button>
                    <button class="btn-reject" data-id="${p._id}" style="padding:6px 12px; background:#e53e3e; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:600; transition:0.2s;">
                        Reject
                    </button>
                </td>
            `;

            row.querySelector(".btn-approve").addEventListener("click", () => handlePaymentAction(p._id, "approve"));
            row.querySelector(".btn-reject").addEventListener("click", () => handlePaymentAction(p._id, "reject"));

            tableBody.appendChild(row);
        });

    } catch (err) {
        console.error("loadPendingManualPayments Error:", err);
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#e53e3e; font-weight:bold;">Unable to load payment status. Please try again. <button onclick="loadPendingManualPayments()" style="margin-left: 8px; padding: 2px 8px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button></td></tr>`;
    }
}

// Owner Action: Approve or Reject Manual UPI Payment
async function handlePaymentAction(paymentId, action) {
    const actionTitle = action === "approve" ? "Approve" : "Reject";
    if (!confirm(`Are you sure you want to ${actionTitle.toUpperCase()} this payment?`)) return;

    try {
        const endpoint = action === "approve" ? `${API_BASE}/payment/owner-verify/${paymentId}` : `${API_BASE}/payment/owner-reject/${paymentId}`;
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${ownerToken}`
            },
            body: JSON.stringify({ action })
        });

        const data = await response.json();

        if (data.success) {
            alert(`Payment successfully ${action}d.`);
            refreshAllDashboardData();
        } else {
            alert(data.message || `Failed to ${action} payment.`);
        }
    } catch (err) {
        console.error("handlePaymentAction Error:", err);
        alert(`Server error performing ${action} action.`);
    }
}

// ----------------------------------------
// 7. Load Recent Students Table
// ----------------------------------------
async function loadStudents(keyword = "") {
    const tableBody = document.getElementById("studentTable");
    if (!tableBody) return;

    try {
        const url = keyword ? `${API_BASE}/owner/students?keyword=${encodeURIComponent(keyword)}` : `${API_BASE}/owner/students`;
        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${ownerToken}`
            }
        });

        if (response.status === 401 || response.status === 403) {
            handleUnauthorized();
            return;
        }

        const data = await response.json();
        tableBody.innerHTML = "";

        if (!data.success || !data.students) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#e53e3e; font-weight:bold;">Unable to load student information. Please try again. <button onclick="loadStudents()" style="margin-left: 8px; padding: 2px 8px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button></td></tr>`;
            return;
        }

        if (data.students.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:15px; color:#718096;">No students found</td></tr>`;
            return;
        }

        const studentsToShow = keyword ? data.students : data.students.slice(0, 10);

        studentsToShow.forEach(s => {
            const seatText = s.seatNumber ? `Seat #${s.seatNumber}` : (s.accountStatus === 'Waiting' ? 'Waiting List' : 'Not Assigned');
            const feeStatusColor = s.feesStatus === 'Paid' ? '#276749' : '#e53e3e';
            const accStatus = s.accountStatus || 'Active';

            const row = document.createElement("tr");
            row.innerHTML = `
                <td><strong>${escapeHtml(s.fullName || 'N/A')}</strong></td>
                <td><span style="font-weight:600; color:#2b6cb0;">${escapeHtml(seatText)}</span></td>
                <td>${escapeHtml(s.mobile || 'N/A')}</td>
                <td><span style="color:${feeStatusColor}; font-weight:700;">${escapeHtml(s.feesStatus || 'Pending')}</span></td>
                <td><span style="background:#e2e8f0; padding:2px 8px; border-radius:12px; font-size:12px;">${escapeHtml(accStatus)}</span></td>
                <td>
                    <button class="btn-view-profile" data-id="${s._id}" style="padding:4px 10px; background:#2b6cb0; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:12px; font-weight:600;">
                        View Profile
                    </button>
                </td>
            `;

            row.querySelector(".btn-view-profile").addEventListener("click", () => {
                window.location.href = `student_profile.html?id=${s._id}`;
            });

            tableBody.appendChild(row);
        });

    } catch (err) {
        console.error("loadStudents Error:", err);
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#e53e3e; font-weight:bold;">Unable to load student information. Please try again. <button onclick="loadStudents()" style="margin-left: 8px; padding: 2px 8px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button></td></tr>`;
    }
}

// ----------------------------------------
// 8. Load Recent Payments Table
// ----------------------------------------
async function loadPayments() {
    const tableBody = document.getElementById("paymentTable");
    if (!tableBody) return;

    try {
        const response = await fetch(`${API_BASE}/payment/all`, {
            headers: {
                "Authorization": `Bearer ${ownerToken}`
            }
        });

        if (response.status === 401 || response.status === 403) {
            handleUnauthorized();
            return;
        }

        const data = await response.json();
        tableBody.innerHTML = "";

        if (!data.success || !data.payments) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#e53e3e; font-weight:bold;">Unable to load payment status. Please try again. <button onclick="loadPayments()" style="margin-left: 8px; padding: 2px 8px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button></td></tr>`;
            return;
        }

        if (data.payments.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:15px; color:#718096;">No payment history found</td></tr>`;
            return;
        }

        data.payments.slice(0, 10).forEach(p => {
            const sName = p.student ? p.student.fullName : "Unknown Student";
            const monthStr = `${p.month || ''} ${p.year || ''}`.trim() || 'N/A';
            const amountStr = `₹${p.amount || 0}`;
            const statusColor = p.status === 'Paid' ? '#276749' : (p.status === 'Pending' ? '#d69e2e' : '#e53e3e');
            const pDate = new Date(p.createdAt || p.paymentDate).toLocaleDateString();

            const row = document.createElement("tr");
            row.innerHTML = `
                <td><strong>${escapeHtml(sName)}</strong></td>
                <td>${escapeHtml(monthStr)}</td>
                <td><strong>${amountStr}</strong></td>
                <td><span style="color:${statusColor}; font-weight:700;">${escapeHtml(p.status)}</span></td>
                <td>${pDate}</td>
            `;

            tableBody.appendChild(row);
        });

    } catch (err) {
        console.error("loadPayments Error:", err);
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#e53e3e; font-weight:bold;">Unable to load payment status. Please try again. <button onclick="loadPayments()" style="margin-left: 8px; padding: 2px 8px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button></td></tr>`;
    }
}

// ----------------------------------------
// 9. Load Waiting List Table
// ----------------------------------------
async function loadWaitingList() {
    const tableBody = document.getElementById("waitingListTable");
    if (!tableBody) return;

    try {
        const response = await fetch(`${API_BASE}/owner/waiting-list`, {
            headers: {
                "Authorization": `Bearer ${ownerToken}`
            }
        });

        if (response.status === 401 || response.status === 403) {
            handleUnauthorized();
            return;
        }

        const data = await response.json();
        tableBody.innerHTML = "";

        if (!data.success || !data.waitingList) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#e53e3e; font-weight:bold;">Unable to load student information. Please try again. <button onclick="loadWaitingList()" style="margin-left: 8px; padding: 2px 8px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button></td></tr>`;
            return;
        }

        if (data.waitingList.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:15px; color:#718096;">No students currently in waiting list</td></tr>`;
            return;
        }

        data.waitingList.forEach((w, index) => {
            const sName = w.student ? w.student.fullName : (w.name || "Student");
            const sMobile = w.student ? w.student.mobile : (w.mobile || "-");
            const sEmail = w.student ? w.student.email : (w.email || "-");
            const statusText = `Waiting #${index + 1}`;
            const jDate = new Date(w.date || w.createdAt || Date.now()).toLocaleDateString();

            const row = document.createElement("tr");
            row.innerHTML = `
                <td><strong>${escapeHtml(sName)}</strong></td>
                <td>${escapeHtml(sMobile)}</td>
                <td>${escapeHtml(sEmail)}</td>
                <td><span style="color:#d69e2e; font-weight:700;">${escapeHtml(statusText)}</span></td>
                <td>${jDate}</td>
            `;

            tableBody.appendChild(row);
        });

    } catch (err) {
        console.error("loadWaitingList Error:", err);
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#e53e3e; font-weight:bold;">Unable to load student information. Please try again. <button onclick="loadWaitingList()" style="margin-left: 8px; padding: 2px 8px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button></td></tr>`;
    }
}

// ----------------------------------------
// 10. Search Filter Setup
// ----------------------------------------
function setupSearchFilter() {
    const searchInput = document.getElementById("searchStudent");
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        const keyword = e.target.value.trim();
        debounceTimer = setTimeout(() => {
            loadStudents(keyword);
        }, 300);
    });
}

// ----------------------------------------
// Helpers & Security Handlers
// ----------------------------------------
function handleUnauthorized() {
    alert("Owner access expired or forbidden. Please log in as Owner.");
    localStorage.removeItem("ownerToken");
    localStorage.removeItem("ownerData");
    window.location.href = "owner-login.html";
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
