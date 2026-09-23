const BASE_URL = "http://localhost:5000/api";

const student = JSON.parse(localStorage.getItem("studentData") || "{}");
const token = localStorage.getItem("studentToken");

if (!student || !token || (!student._id && !student.id)) {
    alert("Please login first to view your ID card.");
    window.location.href = "student-login.html";
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadIDCardData();

    const downloadBtn = document.getElementById("downloadPdfBtn");
    if (downloadBtn) {
        downloadBtn.addEventListener("click", () => {
            const studentId = student._id || student.id;
            window.open(`${BASE_URL}/idcard/download/${studentId}`, "_blank");
        });
    }
});

async function loadIDCardData() {
    try {
        const studentId = student._id || student.id;
        const res = await fetch(`${BASE_URL}/student/dashboard/${studentId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) {
            showErrorNotice("Unable to load student information. Please try again.");
            return;
        }

        const data = await res.json();

        if (data.success && data.student) {
            const stu = data.student;
            localStorage.setItem("studentData", JSON.stringify(stu));

            if (!stu.seatNumber || stu.feesStatus !== "Paid") {
                showPendingNotice();
                return;
            }

            // Fill ID card elements
            document.getElementById("cardName").textContent = stu.fullName || "Student";
            document.getElementById("cardStudentId").textContent = stu.studentId || stu._id || "-";
            document.getElementById("cardSeat").textContent = `Seat #${stu.seatNumber}`;
            document.getElementById("cardMobile").textContent = stu.mobile || "-";
            document.getElementById("cardCourse").textContent = stu.course || "B.Tech IT";
            document.getElementById("cardFeeStatus").textContent = stu.feesStatus || "Paid";

            if (stu.validTill) {
                document.getElementById("cardValidTill").textContent = new Date(stu.validTill).toLocaleDateString();
            } else {
                document.getElementById("cardValidTill").textContent = "1 Year Validity";
            }

            // Photo
            const photoImg = document.getElementById("cardPhoto");
            if (stu.photo) {
                photoImg.src = stu.photo.startsWith("http") ? stu.photo : `http://localhost:5000/uploads/${stu.photo}`;
            }

            // QR Code
            const qrImg = document.getElementById("cardQr");
            if (stu.qrCode) {
                qrImg.src = stu.qrCode.startsWith("http") ? stu.qrCode : `http://localhost:5000/uploads/qrcodes/${stu.qrCode}`;
                qrImg.style.display = "inline-block";
            }
        } else {
            showErrorNotice("Unable to load student information. Please try again.");
        }
    } catch (err) {
        console.error("Error loading ID card data:", err);
        showErrorNotice("Unable to load student information. Please try again.");
    }
}

function showPendingNotice() {
    const cardBox = document.getElementById("idCardBox");
    const notice = document.getElementById("pendingNotice");
    if (cardBox) cardBox.style.opacity = "0.4";
    if (notice) notice.style.display = "block";
}

function showErrorNotice(msg) {
    const notice = document.getElementById("pendingNotice");
    if (notice) {
        notice.style.display = "block";
        notice.style.background = "#fee2e2";
        notice.style.color = "#ef4444";
        notice.innerHTML = `<h3 style="margin-bottom:8px;">Error</h3><p style="font-weight:bold;">${msg}</p><button onclick="loadIDCardData()" style="margin-top:10px; padding:6px 16px; background:#2563eb; color:#fff; border:none; border-radius:6px; cursor:pointer;">Retry</button>`;
    }
}
