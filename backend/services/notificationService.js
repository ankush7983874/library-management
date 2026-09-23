/**
 * Notification Service for BarnalaByte Library Management System
 * Dispatches email and SMS notifications for core business triggers:
 * 1. Registration
 * 2. Payment Success
 * 3. Seat Allocation
 * 4. ID Card Generation
 * 5. Monthly Fee Reminder
 */

const { sendNotificationEmail } = require("./emailService");
const { sendSMS } = require("./smsService");

// 1. Registration Trigger
const notifyRegistration = async (student) => {
    if (!student || !student.email) return;

    const subject = "Welcome to BarnalaByte Smart Library!";
    const text = `Hello ${student.fullName},\n\nWelcome to BarnalaByte Smart Library Management System. Your registration and face verification are complete. Your Student ID card has been generated. You can now proceed to select seat and make payment.\n\nThank you!`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #1E3A8A;">Welcome to BarnalaByte Library</h2>
            <p>Hello <strong>${student.fullName}</strong>,</p>
            <p>Your registration and face verification are complete. Your account is created and initial Student ID card is generated.</p>
            <p>You can log in to your dashboard anytime to select your preferred seat and complete your monthly fee payment.</p>
            <br>
            <p style="color: #666; font-size: 12px;">BarnalaByte Smart Library Management Team</p>
        </div>
    `;

    await sendNotificationEmail(student.email, subject, text, html);
    if (student.mobile) {
        await sendSMS(student.mobile, `Welcome ${student.fullName}! Your BarnalaByte Library account has been successfully created.`);
    }
};

// 2. Payment Success Trigger
const notifyPaymentSuccess = async (student, payment) => {
    if (!student || !student.email) return;

    const amount = payment ? payment.amount : 500;
    const subject = "Payment Confirmation - BarnalaByte Smart Library";
    const text = `Hello ${student.fullName},\n\nYour payment of ₹${amount} has been successfully verified and processed.\n\nThank you for choosing BarnalaByte Library!`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #10B981;">Payment Received Successfully</h2>
            <p>Hello <strong>${student.fullName}</strong>,</p>
            <p>We have successfully received and verified your payment of <strong>₹${amount}</strong>.</p>
            <p>Status: <span style="color: #10B981; font-weight: bold;">PAID</span></p>
            <br>
            <p style="color: #666; font-size: 12px;">BarnalaByte Smart Library Management Team</p>
        </div>
    `;

    await sendNotificationEmail(student.email, subject, text, html);
    if (student.mobile) {
        await sendSMS(student.mobile, `BarnalaByte Library: Payment of ₹${amount} received successfully.`);
    }
};

// 3. Seat Allocation Trigger
const notifySeatAllocation = async (student, seatNumber) => {
    if (!student || !student.email) return;

    const subject = `Seat Allocated #${seatNumber} - BarnalaByte Smart Library`;
    const text = `Hello ${student.fullName},\n\nCongratulations! Seat #${seatNumber} has been allocated to you.\n\nYour ID card has been updated with your seat number.`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #1E3A8A;">Seat Allocation Confirmed</h2>
            <p>Hello <strong>${student.fullName}</strong>,</p>
            <p>Your seat booking is complete. You have been assigned:</p>
            <div style="background: #EFF6FF; padding: 15px; text-align: center; border-radius: 6px; margin: 15px 0;">
                <span style="font-size: 24px; font-weight: bold; color: #1E3A8A;">Seat #${seatNumber}</span>
            </div>
            <p>Your digital ID Card and QR code are now updated in your student dashboard.</p>
            <br>
            <p style="color: #666; font-size: 12px;">BarnalaByte Smart Library Management Team</p>
        </div>
    `;

    await sendNotificationEmail(student.email, subject, text, html);
    if (student.mobile) {
        await sendSMS(student.mobile, `BarnalaByte Library: Seat #${seatNumber} has been successfully allocated to you.`);
    }
};

// 4. ID Card Generation Trigger
const notifyIDCardGeneration = async (student) => {
    if (!student || !student.email) return;

    const subject = "Digital ID Card Generated - BarnalaByte Smart Library";
    const text = `Hello ${student.fullName},\n\nYour BarnalaByte Library Digital ID Card (Student ID: ${student.studentId || "N/A"}) is ready for download in your dashboard.`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #1E3A8A;">ID Card Ready</h2>
            <p>Hello <strong>${student.fullName}</strong>,</p>
            <p>Your digital library card and verification QR code are now generated.</p>
            <p>Student ID: <strong>${student.studentId || "N/A"}</strong></p>
            <p>Log in to your student dashboard to view and download your ID Card PDF.</p>
            <br>
            <p style="color: #666; font-size: 12px;">BarnalaByte Smart Library Management Team</p>
        </div>
    `;

    await sendNotificationEmail(student.email, subject, text, html);
};

// 5. Monthly Fee Reminder Trigger
const notifyMonthlyFeeReminder = async (student) => {
    if (!student || !student.email) return;

    const subject = "Monthly Library Fee Due Reminder - BarnalaByte Library";
    const text = `Hello ${student.fullName},\n\nThis is a friendly reminder that your monthly library membership fee (₹500) is due soon. Please log in to your dashboard to make your payment.`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #D97706;">Monthly Fee Due Reminder</h2>
            <p>Hello <strong>${student.fullName}</strong>,</p>
            <p>This is a reminder that your monthly library seat membership fee of <strong>₹500</strong> is due.</p>
            <p>Please log in to your dashboard to complete the payment via Razorpay or UPI QR.</p>
            <br>
            <p style="color: #666; font-size: 12px;">BarnalaByte Smart Library Management Team</p>
        </div>
    `;

    await sendNotificationEmail(student.email, subject, text, html);
    if (student.mobile) {
        await sendSMS(student.mobile, `BarnalaByte Library Reminder: Your monthly library fee of ₹500 is due. Please pay via your student dashboard.`);
    }
};

module.exports = {
    notifyRegistration,
    notifyPaymentSuccess,
    notifySeatAllocation,
    notifyIDCardGeneration,
    notifyMonthlyFeeReminder
};
