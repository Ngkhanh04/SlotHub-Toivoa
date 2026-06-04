const express = require('express');
const router = express.Router();
const { 
    getMyProfile, 
    updateProfile, 
    createAccount,
    getAllUsers, 
    updateUserRole, 
    deleteUser 
} = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// 🔒 BẮT BUỘC ĐĂNG NHẬP CHO TẤT CẢ ROUTE BÊN DƯỚI
router.use(protect); 

// ===============================================
// API CHO NGƯỜI DÙNG BÌNH THƯỜNG (Profile cá nhân)
// ===============================================
router.get('/profile', getMyProfile);
router.put('/profile', updateProfile);

// ===============================================
// API ĐẶC QUYỀN CHO ADMIN 
// ===============================================
// 🌟 LƯU Ý QUAN TRỌNG: Phải dùng 'admin' chữ thường để khớp với Model của bạn!
router.use(authorize('admin')); 

router.post('/create-account', createAccount); // Pre-provisioning tài khoản mới
router.get('/', getAllUsers);                  // Lấy danh sách toàn trường
router.put('/:id/role', updateUserRole);       // Đổi chức vụ
router.delete('/:id', deleteUser);             // Trảm tài khoản

module.exports = router;