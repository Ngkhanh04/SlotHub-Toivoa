const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// 1. Cấu hình chìa khóa kết nối
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Cấu hình nơi lưu trữ và định dạng ảnh
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'Slothub', // Ảnh sẽ tự động chui vào thư mục này trên Cloudinary
    allowedFormats: ['jpeg', 'png', 'jpg'] // Chỉ cho phép up ảnh
  }
});

// 3. Tạo middleware upload
const upload = multer({ storage: storage });

module.exports = { upload };