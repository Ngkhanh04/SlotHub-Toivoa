const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // QUAN TRỌNG: Gọi đúng biến MONGODB_URI từ file .env
        const conn = await mongoose.connect(process.env.MONGODB_URI);

        console.log(`✅ [MongoDB] Kết nối Database thành công tại: ${conn.connection.host}`);
        console.log(`🗄️  [MongoDB] Tên Database đang sử dụng: ${conn.connection.name}`);

        const { bootstrapDatabase } = require('../utils/dbBootstrap');
        await bootstrapDatabase();
    } catch (error) {
        console.error(`❌ [MongoDB] Lỗi kết nối Database: ${error.message}`);
        // Dừng toàn bộ hệ thống ngay lập tức nếu không kết nối được DB (Tránh lỗi dây chuyền)
        process.exit(1); 
    }
};

module.exports = connectDB;