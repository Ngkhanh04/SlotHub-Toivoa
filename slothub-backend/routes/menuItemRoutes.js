const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');

// Import đầy đủ các hàm từ Controller
const { 
    getAllMenuItems, 
    getVendorMenu, 
    getMenuItemById,
    createMenuItem, 
    toggleItemAvailability,
    createMenuItemReview
} = require('../controllers/menuItemController');

// ================= ROUTE CÔNG KHAI (Không cần đăng nhập) =================

// [GET] /api/menuitems -> Lấy tất cả món ăn (Dùng cho trang Home)
router.get('/', getAllMenuItems); 

// [GET] /api/menuitems/vendor/:vendorId -> Xem menu của 1 quán cụ thể
router.get('/vendor/:vendorId', getVendorMenu);

// [GET] /api/menuitems/:id -> Lấy chi tiết 1 món ăn (Dùng cho trang FoodDetail)
router.get('/:id', getMenuItemById);


// ================= ROUTE BẢO MẬT (Yêu cầu đăng nhập) =================

// [POST] Tạo món mới (Chủ quán)
router.post('/', protect, createMenuItem);

// [PUT] Đổi trạng thái Hết món (Chủ quán)
router.put('/:itemId/toggle', protect, toggleItemAvailability);

// 🌟 TÍNH NĂNG VIP: [POST] /api/menuitems/:id/reviews -> Đăng bình luận cho món ăn
router.post('/:id/reviews', protect, createMenuItemReview);


module.exports = router;