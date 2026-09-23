const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");

// =========================================
// Generate QR Code
// =========================================

const generateQRCode = async (student) => {

    try {

        // Create Folder If Not Exists

        const folder = path.join(

            __dirname,

            "../uploads/qrcodes"

        );

        if (!fs.existsSync(folder)) {

            fs.mkdirSync(folder, {

                recursive: true

            });

        }

        // QR File Name

        const qrName = `${student.studentId}.png`;

        const qrPath = path.join(folder, qrName);

        // QR Data: Secure Verification URL
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
        const qrData = `${baseUrl}/api/idcard/verify/${student.studentId || student._id}`;

        // Generate QR

        await QRCode.toFile(

            qrPath,

            qrData,

            {

                color: {

                    dark: "#000000",

                    light: "#FFFFFF"

                },

                width: 500,

                margin: 2

            }

        );

        return {

            success: true,

            qrName,

            qrPath

        };

    }

    catch (error) {

        console.log(error);

        return {

            success: false,

            message: error.message

        };

    }

};

module.exports = generateQRCode;
