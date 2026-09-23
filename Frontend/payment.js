// =========================================
// BarnalaByte Payment & Face Scan Module
// payment.js
// =========================================

const BASE_URL = "http://localhost:5000/api";
const API = `${BASE_URL}/payment`;

// Login Check
const student = JSON.parse(localStorage.getItem("studentData"));
const token = localStorage.getItem("studentToken");

if (!student || !token) {
    alert("Please Login First");
    window.location.href = "student-login.html";
}

// Student Information
document.getElementById("studentName").innerText = student.fullName || "Student";
document.getElementById("studentCourse").innerText = student.course || "Student";
document.getElementById("paymentStatus").innerText = student.feesStatus || "Pending";
document.getElementById("feeStatus").innerText = student.feesStatus || "Pending";

if (student.photo && student.photo !== "") {
    document.getElementById("studentPhoto").src = student.photo.startsWith("http") ? student.photo : `http://localhost:5000/uploads/${student.photo}`;
}

// Current Month
const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];
const today = new Date();
document.getElementById("currentMonth").innerText = months[today.getMonth()] + " " + today.getFullYear();

// Copy UPI
document.getElementById("copyBtn").onclick = () => {
    navigator.clipboard.writeText(document.getElementById("upiId").value);
    alert("UPI ID (barnalauo86@okaxis) Copied!");
};

// Dashboard Navigation
document.getElementById("dashboardBtn").onclick = () => {
    window.location.href = "student-dashboard.html";
};

// =========================================
// RAZORPAY PAYMENT LOGIC
// =========================================

document.getElementById("razorpayBtn").addEventListener("click", async () => {
    try {
        const res = await fetch(`${API}/create-order`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                amount: 500,
                studentId: student._id,
                month: months[today.getMonth()],
                year: today.getFullYear()
            })
        });

        const data = await res.json();

        if (!data.success) {
            alert("Razorpay Order Creation Failed: " + data.message);
            return;
        }

        const options = {
            key: "rzp_test_1234567890", // Test key placeholder
            amount: data.order.amount,
            currency: data.order.currency,
            name: "BarnalaByte Smart Library",
            description: `Membership Fee - ${months[today.getMonth()]} ${today.getFullYear()}`,
            order_id: data.order.id,
            handler: async function (response) {
                // Verify Payment on Backend
                const verifyRes = await fetch(`${API}/verify-payment`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        studentId: student._id
                    })
                });

                const verifyData = await verifyRes.json();

                if (verifyData.success) {
                    alert("🎉 Payment & Verification Successful! Seat & ID Card generated.");
                    student.feesStatus = "Paid";
                    localStorage.setItem("studentData", JSON.stringify(student));
                    window.location.href = "student-dashboard.html";
                } else {
                    alert("❌ Payment Verification Failed: " + verifyData.message);
                }
            },
            prefill: {
                name: student.fullName,
                email: student.email,
                contact: student.mobile
            },
            theme: { color: "#3399cc" }
        };

        const rzp1 = new Razorpay(options);
        rzp1.open();

    } catch (err) {
        console.error(err);
        alert("Server error connecting to Razorpay.");
    }
});

// =========================================
// MANUAL UPI PAYMENT LOGIC
// =========================================

let pollTimer = null;

const submitBtn = document.getElementById("submitPayment");

submitBtn.addEventListener("click", async () => {
    const transactionInput = document.getElementById("transactionId");
    const transactionId = transactionInput.value.trim();
    const paymentMethod = document.getElementById("paymentMethod").value;

    if (!transactionId || transactionId.length < 6) {
        alert("Please enter a valid Transaction ID / UTR Number (minimum 6 characters).");
        return;
    }

    // Disable button & set loading state
    submitBtn.disabled = true;
    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Submitting payment...`;

    const body = {
        studentId: student._id,
        month: months[today.getMonth()],
        year: today.getFullYear(),
        amount: 500,
        paymentMethod,
        transactionId
    };

    try {
        const res = await fetch(`${API}/manual-upi`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (data.success) {
            transactionInput.value = "";
            showStatusCard({
                status: "Pending",
                transactionId: data.payment?.transactionId || transactionId,
                amount: data.payment?.amount || 500,
                message: "Your payment has been submitted. Seat will be allotted after Owner verification."
            });
            await loadHistory();
            startPolling();
        } else {
            alert(data.message || "Manual payment submission failed.");
        }
    } catch (err) {
        console.error("Manual Payment Submit Error:", err);
        alert("Server error submitting manual payment.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
    }
});

// Refresh button listener
const refreshBtn = document.getElementById("refreshStatusBtn");
if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = `<i class="fa-solid fa-rotate fa-spin"></i> Refreshing...`;
        await loadHistory();
        setTimeout(() => {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = `<i class="fa-solid fa-rotate"></i> Refresh Status`;
        }, 500);
    });
}

function showStatusCard({ status, transactionId, amount, message }) {
    const container = document.getElementById("statusCardContainer");
    const titleEl = document.getElementById("statusCardTitle");
    const badgeEl = document.getElementById("statusCardBadge");
    const txnEl = document.getElementById("statusCardTxnId");
    const amountEl = document.getElementById("statusCardAmount");
    const msgEl = document.getElementById("statusCardMsg");

    if (!container) return;

    container.style.display = "block";
    txnEl.textContent = transactionId || "-";
    amountEl.textContent = `₹${amount || 500}`;
    msgEl.textContent = message || "";

    if (status === "Pending") {
        titleEl.innerHTML = `<i class="fa-solid fa-clock" style="color:#d69e2e;"></i> Payment Submitted Successfully`;
        badgeEl.textContent = "PENDING OWNER VERIFICATION";
        badgeEl.style.background = "#ffc107";
        badgeEl.style.color = "#000";
    } else if (status === "Paid") {
        titleEl.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#28a745;"></i> Payment Verified Successfully`;
        badgeEl.textContent = "PAID & VERIFIED";
        badgeEl.style.background = "#28a745";
        badgeEl.style.color = "#fff";
    } else if (status === "Rejected" || status === "Failed") {
        titleEl.innerHTML = `<i class="fa-solid fa-circle-xmark" style="color:#dc3545;"></i> Payment Verification Failed`;
        badgeEl.textContent = "REJECTED";
        badgeEl.style.background = "#dc3545";
        badgeEl.style.color = "#fff";
    }
}

function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
        await loadHistory();
    }, 10000);
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

// =========================================
// PAYMENT HISTORY & STATUS SYNC
// =========================================

async function loadHistory() {
    const table = document.getElementById("paymentTable");
    try {
        const res = await fetch(`${API}/student/${student._id}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!res.ok) {
            if (table) table.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ef4444; font-weight:bold;">Unable to load payment status. Please try again. <button onclick="loadHistory()" style="margin-left:8px; padding:2px 8px; background:#2563eb; color:white; border:none; border-radius:4px; cursor:pointer;">Retry</button></td></tr>`;
            return;
        }

        const data = await res.json();
        if (table) table.innerHTML = "";

        const payments = data.payments || [];

        if (payments.length === 0) {
            if (table) table.innerHTML = `<tr><td colspan="5" style="text-align:center;">No Payment History</td></tr>`;
            return;
        }

        // Check latest payment
        const latestPayment = payments[0];

        if (latestPayment) {
            document.getElementById("paymentStatus").innerText = latestPayment.status;
            document.getElementById("feeStatus").innerText = latestPayment.status;

            if (latestPayment.status === "Pending") {
                showStatusCard({
                    status: "Pending",
                    transactionId: latestPayment.transactionId,
                    amount: latestPayment.amount,
                    message: "Your payment has been submitted. Seat will be allotted after Owner verification."
                });
            } else if (latestPayment.status === "Paid") {
                student.feesStatus = "Paid";
                localStorage.setItem("studentData", JSON.stringify(student));
                showStatusCard({
                    status: "Paid",
                    transactionId: latestPayment.transactionId,
                    amount: latestPayment.amount,
                    message: "Payment verified successfully by Owner. Your seat assignment and ID card have been updated."
                });
                stopPolling();
            } else if (latestPayment.status === "Rejected") {
                showStatusCard({
                    status: "Rejected",
                    transactionId: latestPayment.transactionId,
                    amount: latestPayment.amount,
                    message: `Payment was rejected by Owner${latestPayment.rejectionReason ? ': ' + latestPayment.rejectionReason : '. Please re-check your Transaction ID or contact library administration.'}`
                });
                stopPolling();
            }
        }

        payments.forEach(item => {
            let color = "status-pending";
            if (item.status === "Paid") color = "status-paid";
            if (item.status === "Rejected" || item.status === "Failed") color = "status-rejected";

            if (table) {
                table.innerHTML += `
                    <tr>
                        <td>${item.month} ${item.year}</td>
                        <td>₹${item.amount}</td>
                        <td>${item.paymentMethod || "UPI"}</td>
                        <td class="${color}"><strong>${item.status}</strong></td>
                        <td>${new Date(item.createdAt || item.paymentDate).toLocaleDateString()}</td>
                    </tr>
                `;
            }
        });
    } catch (err) {
        console.error("loadHistory Error:", err);
        if (table) table.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ef4444; font-weight:bold;">Unable to load payment status. Please try again. <button onclick="loadHistory()" style="margin-left:8px; padding:2px 8px; background:#2563eb; color:white; border:none; border-radius:4px; cursor:pointer;">Retry</button></td></tr>`;
    }
}

// Initial calls
loadHistory();