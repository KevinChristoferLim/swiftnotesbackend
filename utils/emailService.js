const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Verify connection configuration
transporter.verify(function(error, success) {
  if (error) {
    console.log('❌ Email server connection error:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// Send verification code email (TEXT ONLY)
const sendVerificationCode = async (email, code) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Password Reset - Verification Code',
      text: `
SwiftNotes - Password Reset Request

Hello,

You requested to reset your password. Use the verification code below to complete the process:

Your Verification Code: ${code}

This code will expire in 10 minutes.

If you didn't request this password reset, please ignore this email.

---
SwiftNotes App - Secure Password Management
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully. Message ID:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
};

module.exports = {
  sendVerificationCode
};