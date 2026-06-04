const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { 
    getAllVendors, getVendorDetail, createVendor, updateVendor,
    getMyStore, updateMyStore, getMyDashboard, getVendorRevenueHistory,
    getMyMenu, addMenuItem, updateMenuItem, deleteMenuItem,
    getVendorNotifications,
    markVendorNotificationRead
} = require('../controllers/vendorController');

// ==============================================
// 1. CÁC API CHỦ QUẦY (đặt trước /:id)
// ==============================================
router.get('/my-store', protect, getMyStore);
router.put('/my-store', protect, updateMyStore);
router.get('/dashboard', protect, getMyDashboard);
router.get('/revenue-history', protect, getVendorRevenueHistory);
router.get('/notifications', protect, getVendorNotifications);
router.put('/notifications/:id/read', protect, markVendorNotificationRead);

router.get('/menu', protect, getMyMenu);
router.post('/menu', protect, addMenuItem);
router.put('/menu/:id', protect, updateMenuItem);
router.delete('/menu/:id', protect, deleteMenuItem);

// ==============================================
// 2. CÁC API GIAN HÀNG (PROFILE QUÁN)
// ==============================================
router.get('/', getAllVendors); // Public: Ai cũng xem được DS gian hàng
router.post('/', protect, createVendor); // Protect: Đăng ký mở quán

// Lấy chi tiết 1 quán (Public)
router.get('/:id', getVendorDetail); 

// Cập nhật thông tin quán (Protect)
router.put('/:id', protect, updateVendor);

module.exports = router;