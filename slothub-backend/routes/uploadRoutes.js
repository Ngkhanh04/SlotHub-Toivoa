const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const { protect } = require('../middlewares/authMiddleware');

// [POST] Upload 1 ảnh (Bắt buộc phải đăng nhập)
// 'image' chính là tên cái key (trường dữ liệu) mà lát nữa ta sẽ gõ bên Postman
router.post('/', protect, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Chưa có file nào được tải lên!' });
    }
    
    // req.file.path chính là đường link ảnh đã được đẩy lên mạng
    res.status(200).json({ 
      message: 'Tải ảnh lên thành công!',
      imageUrl: req.file.path 
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi upload', error: error.message });
  }
});

module.exports = router;