const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { requestRefund, getRefundHistory } = require('../controllers/refundController');

// Tất cả các thao tác hoàn tiền đều cần đăng nhập
router.use(protect);

// [POST] Thực hiện hoàn tiền cho một đơn hàng cụ thể
router.post('/:orderId', requestRefund);

// [GET] Xem lịch sử hoàn tiền (Cho Admin đối soát)
router.get('/history', getRefundHistory);

module.exports = router;