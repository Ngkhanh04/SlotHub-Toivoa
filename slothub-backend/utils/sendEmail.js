// utils/sendEmail.js
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Cấu hình tài khoản gửi email
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Nội dung bức thư
  const mailOptions = {
    from: `Slot-hub <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message, // Vẫn giữ lại để luồng Quên mật khẩu cũ chạy bình thường
    html: options.html,    // Thêm dòng này để hỗ trợ gửi giao diện hóa đơn đẹp
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;