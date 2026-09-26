const BASE_URL = "http://localhost:5000/api";
const selectedSeatEl = document.getElementById("selectedSeat");
const seatNumberDisplay = document.getElementById("seatNumber");
const bookBtn = document.getElementById("bookBtn");

let selectedSeatNumber = localStorage.getItem("selectedSeat") || null;
const token = localStorage.getItem("studentToken") || localStorage.getItem("ownerToken") || localStorage.getItem("token");

if (seatNumberDisplay && selectedSeatNumber) {
    seatNumberDisplay.innerText = selectedSeatNumber;
}

if (bookBtn) {
    bookBtn.addEventListener("click", () => {
        if (!selectedSeatNumber) {
            alert("Please click and select a free seat on the chart first!");
            return;
        }
        window.location.href = "seat-booking.html";
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    setupSeatSearchFilter();
    await loadSeatsFromBackend();
});

async function loadSeatsFromBackend() {
    const zoneAGrid = document.getElementById("zoneAGrid");
    const zoneBGrid = document.getElementById("zoneBGrid");
    const zoneCGrid = document.getElementById("zoneCGrid");
    const fallbackContainer = document.getElementById("seatContainer");

    const loaderHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 20px;">Loading live 150-seat floor map...</div>`;
    if (zoneAGrid) zoneAGrid.innerHTML = loaderHTML;
    if (zoneBGrid) zoneBGrid.innerHTML = "";
    if (zoneCGrid) zoneCGrid.innerHTML = "";
    if (fallbackContainer) fallbackContainer.innerHTML = loaderHTML;

    try {
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};
        const res = await fetch(`${BASE_URL}/seat`, { headers });

        if (!res.ok) {
            const errHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #ef4444; padding: 20px; font-weight: bold;">Unable to load seat information. Please try again.<br/><button onclick="loadSeatsFromBackend()" style="margin-top: 10px; padding: 6px 16px; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer;">Retry</button></div>`;
            if (zoneAGrid) zoneAGrid.innerHTML = errHTML;
            if (fallbackContainer) fallbackContainer.innerHTML = errHTML;
            return;
        }

        const data = await res.json();
        if (zoneAGrid) zoneAGrid.innerHTML = "";
        if (fallbackContainer) fallbackContainer.innerHTML = "";

        if (!data.success || !data.seats) {
            const errHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #ef4444; padding: 20px; font-weight: bold;">Unable to load seat information. Please try again.<br/><button onclick="loadSeatsFromBackend()" style="margin-top: 10px; padding: 6px 16px; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer;">Retry</button></div>`;
            if (zoneAGrid) zoneAGrid.innerHTML = errHTML;
            if (fallbackContainer) fallbackContainer.innerHTML = errHTML;
            return;
        }

        // Map backend seats by seatNumber
        const seatMap = {};
        data.seats.forEach(s => {
            seatMap[s.seatNumber] = s;
        });

        let freeCount = 0;
        let bookedCount = 0;

        for (let i = 1; i <= 150; i++) {
            const seatData = seatMap[i] || { seatNumber: i, status: "Available" };
            const seatBtn = document.createElement("button");
            seatBtn.id = `seat-btn-${i}`;
            seatBtn.classList.add("seat");
            seatBtn.setAttribute("data-seat-num", i);

            const numSpan = document.createElement("span");
            numSpan.className = "seat-num";
            numSpan.innerText = i;
            seatBtn.appendChild(numSpan);

            const labelSpan = document.createElement("span");
            labelSpan.className = "seat-label";

            const isBooked = seatData.status === "Booked";
            const isReserved = seatData.status === "Reserved";

            if (isBooked) {
                bookedCount++;
                seatBtn.classList.add("occupied");
                seatBtn.disabled = true;
                seatBtn.title = `Seat #${i} - Booked 🔴`;
                labelSpan.innerText = "Booked 🔴";
            } else if (isReserved) {
                bookedCount++;
                seatBtn.classList.add("occupied");
                seatBtn.disabled = true;
                seatBtn.title = `Seat #${i} - Reserved`;
                labelSpan.innerText = "Reserved";
            } else {
                freeCount++;
                seatBtn.classList.add("available");
                seatBtn.title = `Seat #${i} - Free / Available`;
                labelSpan.innerText = "Free";

                if (selectedSeatNumber && String(selectedSeatNumber) === String(i)) {
                    seatBtn.classList.add("selected");
                    if (selectedSeatEl) selectedSeatEl.innerHTML = `<span style="color:#22c55e;">Selected Seat:</span> #${i} (Free)`;
                }

                seatBtn.addEventListener("click", () => {
                    document.querySelectorAll(".seat.available").forEach(btn => {
                        btn.classList.remove("selected");
                    });

                    seatBtn.classList.add("selected");
                    selectedSeatNumber = i;

                    if (selectedSeatEl) selectedSeatEl.innerHTML = `<span style="color:#22c55e;">Selected Seat:</span> #${i} (Free)`;
                    if (seatNumberDisplay) seatNumberDisplay.innerText = i;

                    localStorage.setItem("selectedSeat", i);
                });
            }

            seatBtn.appendChild(labelSpan);

            // Append to Zone Grids
            if (zoneAGrid && i <= 50) {
                zoneAGrid.appendChild(seatBtn);
            } else if (zoneBGrid && i > 50 && i <= 100) {
                zoneBGrid.appendChild(seatBtn);
            } else if (zoneCGrid && i > 100 && i <= 150) {
                zoneCGrid.appendChild(seatBtn);
            } else if (fallbackContainer) {
                fallbackContainer.appendChild(seatBtn);
            }
        }

        // Update Summary Counters
        const freeEl = document.getElementById("summaryFreeSeats");
        const bookedEl = document.getElementById("summaryBookedSeats");
        if (freeEl) freeEl.innerText = freeCount;
        if (bookedEl) bookedEl.innerText = bookedCount;

    } catch (err) {
        console.error("loadSeatsFromBackend Error:", err);
        const errHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #ef4444; padding: 20px; font-weight: bold;">Unable to load seat information. Please try again.<br/><button onclick="loadSeatsFromBackend()" style="margin-top: 10px; padding: 6px 16px; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer;">Retry</button></div>`;
        if (zoneAGrid) zoneAGrid.innerHTML = errHTML;
        if (fallbackContainer) fallbackContainer.innerHTML = errHTML;
    }
}

function setupSeatSearchFilter() {
    const searchInput = document.getElementById("seatSearchInput");
    if (!searchInput) return;

    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim();
        document.querySelectorAll(".seat").forEach(btn => {
            const seatNum = btn.getAttribute("data-seat-num");
            if (!query || seatNum === query) {
                btn.style.opacity = "1";
                if (seatNum === query) {
                    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    btn.style.transform = "scale(1.15)";
                    setTimeout(() => { btn.style.transform = ""; }, 1500);
                }
            } else {
                btn.style.opacity = "0.35";
            }
        });
    });
}