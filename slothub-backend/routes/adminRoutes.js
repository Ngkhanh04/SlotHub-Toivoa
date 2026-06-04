const express = require('express');
const router = express.Router();
const { 
    getDashboardStats,
    getCashFlowChart,
    getDashboardActivity,
    getAdminBankInfo,
    getAllVendorsAdmin,
    getPendingVendors,
    approveVendor,
    rejectVendor,
    updateAdminBankInfo,
    getAdminNotifications,    // 🌟 Import hàm thông báo
    markNotificationAsRead    // 🌟 Import hàm thông báo
} = require('../controllers/adminController');
const { protect } = require('../middlewares/authMiddleware');

// Bảo mật: Phải có token đăng nhập mới được gọi
router.use(protect);

// Tuyến đường (Routes) thống kê Dashboard
router.get('/stats', getDashboardStats);
router.get('/cash-flow', getCashFlowChart);
router.get('/activity', getDashboardActivity);

// Tuyến đường (Routes) quản lý Ngân hàng Admin
router.get('/bank-info', getAdminBankInfo);
router.put('/bank-info', updateAdminBankInfo);

// Tuyến đường (Routes) quản lý gian hàng
router.get('/vendors', getAllVendorsAdmin);
router.get('/pending-vendors', getPendingVendors);
router.put('/approve-vendor/:userId', approveVendor);
router.delete('/reject-vendor/:userId', rejectVendor);

// 🌟 Tuyến đường (Routes) quản lý Thông báo
router.get('/notifications', getAdminNotifications);
router.put('/notifications/:id/read', markNotificationAsRead);

module.exports = router;