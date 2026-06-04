const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { createReport, resolveReport } = require('../controllers/reportController');

// Phải đăng nhập mới được report
router.use(protect);

// [POST] Sinh viên gửi khiếu nại (bị giao thiếu món, đồ ăn có vấn đề...)
router.post('/', createReport);

// [PUT] Admin vào phán xử khiếu nại (Đồng ý bồi thường hoặc Từ chối)
router.put('/:id/resolve', resolveReport);

module.exports = router;