const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
    createOrder,
    getMyOrders,
    updateOrderStatus,
    getVendorOrders,
    verifyVendorPickup
} = require('../controllers/orderController');

// Tất cả đều yêu cầu đăng nhập
router.use(protect);

// [POST] Sinh viên đặt món
router.post('/', createOrder);

// [GET] Sinh viên xem lịch sử đơn hàng
router.get('/my-orders', getMyOrders);

// 🌟 [GET] VENDOR: Lấy danh sách đơn hàng của quầy (ROUTE MỚI)
router.get('/vendor/my-orders', getVendorOrders);

// [POST] VENDOR: Quét QR / OTP xác nhận nhận món
router.post('/vendor/verify-pickup', verifyVendorPickup);

// [PUT] Cập nhật trạng thái đơn (Cả Student hủy đơn hoặc Vendor xác nhận)
router.put('/:id/status', updateOrderStatus);

module.exports = router;