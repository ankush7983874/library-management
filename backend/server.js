const razorpayRoutes = require("./routes/razorpayRoutes");

const idCardRoutes = require("./routes/idCardRoutes");


const paymentRoutes = require("./routes/paymentRoutes");

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

// Load Environment Variables from backend/.env
dotenv.config({ path: path.join(__dirname, ".env") });

// Database Connection
const connectDB = require("./config/db.js");

// Routes
const authRoutes = require("./routes/authRoutes");
const ownerRoutes = require("./routes/ownerRoutes");
const studentRoutes = require("./routes/studentroutes");
const seatRoutes = require("./routes/seatRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes"); // ✅ NEW
const otpRoutes = require("./routes/otpRoutes");
const forgotPasswordRoutes = require("./routes/forgotPasswordRoutes");
const faceRoutes = require("./routes/faceRoutes");

// Connect Database
connectDB();

// Create Express App
const app = express();

// ======================
// Middleware
// ======================
app.use(cors());
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ extended: true }));

// ======================
// API Routes
// ======================
app.use("/api/auth", authRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/seat", seatRoutes);
app.use("/api/attendance", attendanceRoutes); // ✅ NEW
app.use("/api/payment", paymentRoutes);
app.use("/api/idcard", idCardRoutes);
app.use("/api/razorpay", razorpayRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/forgot-password", forgotPasswordRoutes);
app.use("/api/face", faceRoutes);

// ======================
// Home Route
// ======================
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "🚀 BarnalaByte Smart Library API Running..."
    });
});

// ======================
// Invalid Route Handler
// ======================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API Route Not Found"
    });
});

// ======================
// Start Server
// ======================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server Running on Port ${PORT}`);
});