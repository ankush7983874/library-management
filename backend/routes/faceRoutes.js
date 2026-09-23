const express = require("express");
const router = express.Router();
const { registerFace, verifyFace, getFaceStatus } = require("../controllers/faceController");

router.post("/register", registerFace);
router.post("/verify", verifyFace);
router.get("/status/:studentId", getFaceStatus);

module.exports = router;
