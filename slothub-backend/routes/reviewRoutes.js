const express = require('express');
const router = express.Router();
// SỬA TẠI ĐÂY: Đổi getServiceReviews thành getVendorReviews
const { createReview, getVendorReviews } = require('../controllers/reviewController');
const { protect } = require('../middlewares/authMiddleware');

// SỬA TẠI ĐÂY: Đổi serviceId thành vendorId cho đúng logic Canteen 
// và gọi đúng hàm getVendorReviews
router.get('/:vendorId', getVendorReviews);

// Viết review thì phải đăng nhập
router.post('/', protect, createReview);

module.exports = router;