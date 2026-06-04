const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { 
    getMyNotifications, 
    markAsRead, 
    markAllAsRead, 
    createNotification 
} = require('../controllers/notificationController');

// Tất cả các route thông báo đều yêu cầu phải đăng nhập
router.use(protect);

// [GET] Xem hộp thư của mình
router.get('/me', getMyNotifications);

// [PUT] Đánh dấu đã đọc tất cả (Phải đặt trên route /:id để không bị dính param)
router.put('/read-all', markAllAsRead);

// [PUT] Đánh dấu đã đọc 1 tin
router.put('/:id/read', markAsRead);

// [POST] Tạo thông báo (Dùng để Admin bắn tin, hoặc gọi nội bộ từ server)
router.post('/', createNotification);

module.exports = router;