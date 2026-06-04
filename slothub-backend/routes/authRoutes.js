const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware'); 

// Import đầy đủ 6 hàm từ authController (Đã thêm registerVendor)
const { 
  register, 
  login, 
  googleLogin, 
  forgotPassword, 
  resetPassword,
  registerVendor
} = require('../controllers/authController');

// Import 2 hàm Profile từ userController
const { getMyProfile, updateProfile } = require('../controllers/userController');

// === CÁC ROUTE KHÔNG CẦN ĐĂNG NHẬP ===
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/forgotpassword', forgotPassword);
router.post('/resetpassword', resetPassword);

// 🌟 ROUTE MỚI: Mở cổng Đăng ký gian hàng
router.post('/register-vendor', registerVendor);

// === CÁC ROUTE BẮT BUỘC ĐĂNG NHẬP (Lấy/Sửa Profile) ===
router.get('/profile', protect, getMyProfile);
router.put('/profile', protect, updateProfile);

module.exports = router;