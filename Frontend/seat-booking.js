const BASE_URL = "http://localhost:5000/api";

// 1. Authenticated Student Check
const student = JSON.parse(localStorage.getItem("studentData") || "{}");
const token = localStorage.getItem("studentToken");

if (!student || !token || (!student._id && !student.id)) {
    alert("Please login first to access seat booking.");
    window.location.href = "student-login.html";
}

// 2. Navigation Handler
const dashboardBtn = document.getElementById("dashboardBtn");
if (dashboardBtn) {
    dashboardBtn.addEventListener("click", () => {
        window.location.href = "student-dashboard.html";
    });
}

// 3. Auto-load student details & available seats
document.addEventListener("DOMContentLoaded", async () => {
    // Render stored values immediately
    renderStudentDetails(student);

    // Fetch fresh profile from backend
    try {
        const studentId = student._id || student.id;
        const res = await fetch(`${BASE_URL}/student/dashboard/${studentId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.student) {
                const updated = data.student;
                localStorage.setItem("studentData", JSON.stringify(updated));
                renderStudentDetails(updated);
            }
        }
    } catch (err) {
        console.error("Error fetching student profile:", err);
    }

    // Load available seats (1-150)
    await loadAvailableSeats();
});

function renderStudentDetails(stu) {
    if (!stu) return;
    const nameEl = document.getElementById("studentName");
    const idEl = document.getElementById("studentIdCode");
    const mobileEl = document.getElementById("studentMobile");

    if (nameEl) nameEl.textContent = stu.fullName || "Student";
    if (idEl) idEl.textContent = stu.studentId || stu._id || "-";
    if (mobileEl) mobileEl.textContent = stu.mobile || "-";
}

async function loadAvailableSeats() {
    const seatSelect = document.getElementById("seatSelect");
    if (!seatSelect) return;

    try {
        const res = await fetch(`${BASE_URL}/seat`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) {
            seatSelect.innerHTML = `<option value="">Unable to load seat information. Please try again.</option>`;
            showSeatBookingError("Unable to load seat information. Please try again.");
            return;
        }

        const data = await res.json();
        seatSelect.innerHTML = `<option value="">-- Choose Available Seat (1–150) --</option>`;

        if (data.success && data.seats) {
            let freeCount = 0;
            let bookedCount = 0;

            // Map all 1-150 seats
            const seatMap = {};
            data.seats.forEach(s => seatMap[s.seatNumber] = s);

            for (let i = 1; i <= 150; i++) {
                const s = seatMap[i] || { seatNumber: i, status: "Available" };
                if (s.status === "Available") {
                    freeCount++;
                    const opt = document.createElement("option");
                    opt.value = s.seatNumber;
                    opt.textContent = `Seat #${s.seatNumber} (Available)`;
                    seatSelect.appendChild(opt);
                } else {
                    bookedCount++;
                }
            }

            // Update badge counters
            const freeEl = document.getElementById("bookingFreeCount");
            const bookedEl = document.getElementById("bookingBookedCount");
            if (freeEl) freeEl.innerText = freeCount;
            if (bookedEl) bookedEl.innerText = bookedCount;

            // Pre-select previously chosen seat if stored & available
            const savedSeat = localStorage.getItem("selectedSeat");
            if (savedSeat) {
                seatSelect.value = savedSeat;
            }

            if (freeCount === 0) {
                const opt = document.createElement("option");
                opt.value = "";
                opt.textContent = "All 150 Seats Occupied (Waiting List Flow)";
                seatSelect.appendChild(opt);
            }
        }
    } catch (err) {
        console.error("Error loading seats:", err);
        seatSelect.innerHTML = `<option value="">Unable to load seat information. Please try again.</option>`;
        showSeatBookingError("Unable to load seat information. Please try again.");
    }
}

function showSeatBookingError(msg) {
    let errDiv = document.getElementById("seatBookingErrorNotice");
    if (!errDiv) {
        errDiv = document.createElement("div");
        errDiv.id = "seatBookingErrorNotice";
        errDiv.style.cssText = "margin-top: 15px; padding: 12px; background: #fee2e2; color: #ef4444; font-weight: bold; border-radius: 6px; text-align: center;";
        const container = document.querySelector(".booking-container") || document.body;
        container.appendChild(errDiv);
    }
    errDiv.innerHTML = `${msg} <button onclick="loadAvailableSeats()" style="margin-left: 8px; padding: 4px 12px; background: #2563eb; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Retry</button>`;
}

// 4. Booking Form Submit
const bookingForm = document.getElementById("seatBookingForm");
if (bookingForm) {
    bookingForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const selectedSeat = document.getElementById("seatSelect").value;
        const paymentMethod = document.getElementById("paymentMethodSelect").value;

        if (selectedSeat) {
            localStorage.setItem("selectedSeat", selectedSeat);
        }
        localStorage.setItem("paymentMethod", paymentMethod);

        // Direct navigation to payment page
        window.location.href = "payment.html";
    });
}