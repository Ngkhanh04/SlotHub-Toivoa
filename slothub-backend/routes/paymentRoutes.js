const express = require('express');
const router = express.Router();
const { createPaymentUrl, vnpayReturn } = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

// 1. Route tạo link thanh toán (Khách hàng gọi) -> Phải bảo vệ bằng Token
router.post('/create_payment_url', protect, createPaymentUrl);

// 2. Route hứng dữ liệu trả về từ VNPay (VNPay tự động gọi) -> KHÔNG DÙNG protect
router.get('/vnpay_return', vnpayReturn); 

module.exports = router;