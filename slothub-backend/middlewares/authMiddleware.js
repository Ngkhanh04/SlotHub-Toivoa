const jwt = require('jsonwebtoken');
const User = require('../models/User'); 

// 1. Hàm kiểm tra đăng nhập (Bảo vệ vòng ngoài)
const protect = async (req, res, next) => { 
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa!' });
      }
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Thẻ Token không hợp lệ hoặc đã hết hạn!' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Bạn chưa đăng nhập, không có quyền truy cập!' });
  }
};

// 2. Hàm kiểm tra quyền (Bảo vệ vòng trong)
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Quyền truy cập bị từ chối! Tài khoản '${req.user.role}' không được phép thực hiện hành động này.` 
            });
        }
        next(); 
    };
};

module.exports = { protect, authorize };