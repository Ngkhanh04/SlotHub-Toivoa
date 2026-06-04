const express = require('express');
const router = express.Router();
const { getAdminStats } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Chốt chặn: Bắt buộc đăng nhập VÀ phải là 'Admin'
router.get('/', protect, authorize('Admin'), getAdminStats);

module.exports = router;