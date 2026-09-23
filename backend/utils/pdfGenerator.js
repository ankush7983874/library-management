const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const generatePDF = async (student) => {

    const folder = path.join(__dirname, "../uploads/idcards");

    if (!fs.existsSync(folder)) {

        fs.mkdirSync(folder, { recursive: true });

    }

    const pdfName = `${student.studentId}.pdf`;

    const pdfPath = path.join(folder, pdfName);

    const doc = new PDFDocument({

        size: "A4",

        margin: 20

    });

    const stream = fs.createWriteStream(pdfPath);

    doc.pipe(stream);

    // ===========================
    // Background
    // ===========================

    doc.roundedRect(20,20,555,300,10)
       .fillAndStroke("#ffffff","#1E3A8A");

    // ===========================
    // Title
    // ===========================

    doc.fillColor("#1E3A8A")
       .fontSize(22)
       .text("BarnalaByte Library",170,35);

    doc.fontSize(11)
       .fillColor("black")
       .text("Professional Library ID Card",185,65);

    // ===========================
    // Student Photo
    // ===========================

    let photoPath = path.join(
        __dirname,
        "../uploads/photos",
        student.photo || "default.png"
    );

    if(fs.existsSync(photoPath)){

        doc.image(photoPath,40,100,{
            width:100,
            height:120
        });

    }

    // ===========================
    // Student Details
    // ===========================

    const displaySeat = student.seatNumber ? `Seat #${student.seatNumber}` : "Not Assigned";
    const displayFee = student.feesStatus || "Pending";

    doc.fontSize(14)
       .fillColor("#000")
       .text(`Name : ${student.fullName}`,170,110);

    doc.text(`Student ID : ${student.studentId}`,170,140);

    doc.text(`Seat No : ${displaySeat}`,170,170);

    doc.text(`Mobile : ${student.mobile}`,170,200);

    doc.text(`Course : ${student.course || 'N/A'}`,170,230);

    doc.text(`Fees Status : ${displayFee}`,170,260);

        // ===========================
    // QR Code
    // ===========================

    let qrPath = path.join(
        __dirname,
        "../uploads/qrcodes",
        `${student.studentId}.png`
    );

    if (fs.existsSync(qrPath)) {

        doc.image(qrPath, 430, 100, {

            width: 100,
            height: 100

        });

    }

    // ===========================
    // Valid Till
    // ===========================

    let validDate = student.validTill
        ? new Date(student.validTill).toLocaleDateString()
        : "N/A";

    doc.fontSize(12)
        .fillColor("#000")
        .text(`Valid Till : ${validDate}`, 40, 250);

    // ===========================
    // Library Details
    // ===========================

    doc.fontSize(13)
        .fillColor("#1E3A8A")
        .text("Library Details", 40, 340);

    doc.fontSize(11)
        .fillColor("#000")
        .text("Library Name : BarnalaByte Library", 40, 365);

    doc.text("Location : Barnala, Punjab", 40, 385);

    doc.text("Timing : 6:00 AM - 11:00 PM", 40, 405);

    doc.text("Website : www.barnalabyte.in", 40, 425);

    // ===========================
    // Rules
    // ===========================

    doc.fontSize(13)
        .fillColor("#1E3A8A")
        .text("Library Rules", 320, 340);

    doc.fontSize(10)
        .fillColor("#000")
        .text("• Keep Silence", 320, 365);

    doc.text("• ID Card Mandatory", 320, 385);

    doc.text("• No Smoking", 320, 405);

    doc.text("• Seat Transfer Not Allowed", 320, 425);

    // ===========================
    // Signature
    // ===========================

    doc.moveTo(420, 520)
        .lineTo(540, 520)
        .stroke();

    doc.fontSize(10)
        .fillColor("#000")
        .text("Owner Signature", 430, 525);

    // ===========================
    // Footer
    // ===========================

    doc.rect(20, 760, 555, 25)
        .fill("#1E3A8A");

    doc.fillColor("#fff")
        .fontSize(10)
        .text(
            "BarnalaByte Library | Professional Library Management System",
            70,
            768
        );

    // ===========================
    // Finish PDF
    // ===========================

    doc.end();

    return new Promise((resolve, reject) => {

        stream.on("finish", () => {

            resolve({

                pdfName,
                pdfPath

            });

        });

        stream.on("error", reject);

    });

};

module.exports = generatePDF;