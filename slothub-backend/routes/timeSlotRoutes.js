const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { getActiveTimeSlots, createTimeSlot } = require('../controllers/timeSlotController');

// [GET] Xem danh sách các khung giờ trống (Ai cũng xem được để chọn lúc đặt món)
router.get('/', getActiveTimeSlots);

// [POST] Thêm khung giờ mới (Bắt buộc đăng nhập, Controller đã chặn chỉ Admin mới được tạo)
router.post('/', protect, createTimeSlot);

module.exports = router;