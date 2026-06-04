const Review = require('../models/Review');
const Order = require('../models/Order'); // Import bảng Order mới

// 1. [POST] Gửi đánh giá (Có hỗ trợ up nhiều ảnh hộp cơm)
const createReview = async (req, res) => {
    try {
        const { vendorId, rating, comment, images } = req.body;
        const userId = req.user.id; // Lấy ID sinh viên từ token đăng nhập

        // KIỂM TRA CHỐNG FAKE REVIEW: 
        // Sinh viên này đã từng mua và nhận món (Completed) tại gian hàng này chưa?
        const hasCompletedOrder = await Order.findOne({
            user: userId,
            vendor: vendorId,
            status: 'Completed' // Chỉ khi nào cầm hộp cơm trên tay mới được review
        });

        if (!hasCompletedOrder) {
            return res.status(403).json({ 
                message: 'Bạn chỉ có thể đánh giá sau khi đã đặt và nhận món thành công tại gian hàng này!' 
            });
        }

        // Lưu review vào Database
        const newReview = new Review({ vendorId, user: userId, rating, comment, images });
        await newReview.save();

        res.status(201).json({ message: 'Cảm ơn bạn đã đánh giá gian hàng!', data: newReview });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// 2. [GET] Lấy danh sách đánh giá của một gian hàng cụ thể
const getVendorReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ vendorId: req.params.vendorId })
            // Nâng cấp: Lấy name và lấy thêm cả avatar để Frontend hiển thị cho đẹp
            .populate('user', 'name avatar') 
            .sort({ createdAt: -1 }); // Feedback mới nhất lên đầu
            
        res.status(200).json(reviews);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

module.exports = { createReview, getVendorReviews };