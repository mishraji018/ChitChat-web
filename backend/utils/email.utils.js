import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: `"ChitChat 🐻" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your ChitChat Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
        <h2 style="color: #e91e63; text-align: center;">ChitChat 🐻</h2>
        <p>Hello,</p>
        <p>Your OTP for verification is:</p>
        <div style="font-size: 32px; font-weight: bold; text-align: center; margin: 20px 0; color: #333; letter-spacing: 5px;">${otp}</div>
        <p>This OTP is valid for <strong>10 minutes</strong>. Please do not share this code with anyone.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #888; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email Error:', error);
    return false;
  }
};
