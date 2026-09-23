// =========================================
// BarnalaByte Student Profile
// Final Version
// =========================================

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
// Load Student Profile
// ===============================

async function loadStudentProfile() {

    try {

        const response = await fetch(
            `http://localhost:5000/api/student/profile/${student._id}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (response.status === 401 || response.status === 403) {
            alert("Unauthorized access or session expired. Please login again.");
            localStorage.removeItem("studentToken");
            localStorage.removeItem("studentData");
            window.location.href = "student-login.html";
            return;
        }

        const data = await response.json();

        if (!data.success) {
            alert(data.message);
            return;
        }

        const s = data.student;

        // ==========================
        // Profile Card
        // ==========================

        document.getElementById("fullName").innerText =
            s.fullName || "N/A";

        document.getElementById("course").innerText =
            s.course || "N/A";

        document.getElementById("accountStatus").innerText =
            s.accountStatus || "Active";

        // ==========================
        // Personal Details
        // ==========================

        document.getElementById("studentId").innerText =
            s._id;

        document.getElementById("seatNumber").innerText =
            s.seatNumber || "Not Booked";

        document.getElementById("mobile").innerText =
            s.mobile || "N/A";

        document.getElementById("email").innerText =
            s.email || "N/A";

        document.getElementById("college").innerText =
            s.college || "N/A";

        document.getElementById("fatherName").innerText =
            s.fatherName || "N/A";

        document.getElementById("motherName").innerText =
            s.motherName || "N/A";

        document.getElementById("gender").innerText =
            s.gender || "N/A";

        document.getElementById("dob").innerText =
            new Date(s.dob).toLocaleDateString();

        document.getElementById("address").innerText =
            s.address || "N/A";

        document.getElementById("feesStatus").innerText =
            s.feesStatus || "Pending";

        document.getElementById("joiningDate").innerText =
            new Date(s.createdAt).toLocaleDateString();

        // ==========================
        // Profile Photo
        // ==========================

        const photo = document.getElementById("profilePhoto");

        if (photo) {

            if (s.photo && s.photo !== "") {

                photo.src =
                    `http://localhost:5000/uploads/${s.photo}`;

            }

        }

    }

    catch (error) {

        console.log(error);

        alert("Unable to Load Profile");

    }

}

loadStudentProfile();

// ===============================
// Dashboard Button
// ===============================

const dashboardBtn = document.getElementById("dashboardBtn");

if (dashboardBtn) {

    dashboardBtn.addEventListener("click", () => {

        window.location.href = "student-dashboard.html";

    });

}

// ===============================
// Edit Button
// ===============================

const editBtn = document.getElementById("editBtn");

if (editBtn) {

    editBtn.addEventListener("click", () => {

        alert("Edit Profile Feature Coming Soon");

    });

}