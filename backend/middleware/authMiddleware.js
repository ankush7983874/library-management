const jwt = require("jsonwebtoken");
const Student = require("../models/student");
const Owner = require("../models/owner");

// ============================================
// Authenticate Request (Verify Bearer Token)
// ============================================
const authenticate = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        let user = null;
        let role = decoded.role || null;

        // If role specified in token, fetch corresponding user model
        if (role === "owner") {
            user = await Owner.findById(decoded.id).select("-password");
        } else if (role === "student") {
            user = await Student.findById(decoded.id).select("-password");
        } else {
            // Fallback lookup if token does not specify role
            user = await Owner.findById(decoded.id).select("-password");
            if (user) {
                role = "owner";
            } else {
                user = await Student.findById(decoded.id).select("-password");
                if (user) {
                    role = "student";
                }
            }
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required. User not found."
            });
        }

        req.user = user;
        req.role = role;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Authentication required. Invalid or expired token."
        });
    }
};

// ============================================
// Protect Owner Endpoints (Owner Role Required)
// ============================================
const protectOwner = async (req, res, next) => {
    authenticate(req, res, () => {
        if (req.role !== "owner") {
            return res.status(403).json({
                success: false,
                message: "Owner access required."
            });
        }
        next();
    });
};

// ============================================
// Protect Student Endpoints (Student Role Required)
// ============================================
const protectStudent = async (req, res, next) => {
    authenticate(req, res, () => {
        if (req.role !== "student") {
            return res.status(403).json({
                success: false,
                message: "Access denied."
            });
        }
        next();
    });
};

// ============================================
// Protect Owner or Self (Owner OR Own Student Resource)
// ============================================
const protectOwnerOrSelf = async (req, res, next) => {
    authenticate(req, res, () => {
        if (req.role === "owner") {
            return next();
        }

        if (req.role === "student") {
            const targetId = req.params.id || req.params.studentId || req.body.studentId;
            
            // Check match against student _id or studentId string (e.g. BL2026xxxx)
            const isSelf = targetId && (
                req.user._id.toString() === targetId.toString() ||
                (req.user.studentId && req.user.studentId.toString() === targetId.toString())
            );

            if (isSelf) {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: "You can only access your own profile."
            });
        }

        return res.status(403).json({
            success: false,
            message: "Access denied."
        });
    });
};

module.exports = {
    authenticate,
    protectOwner,
    protectStudent,
    protectOwnerOrSelf
};
