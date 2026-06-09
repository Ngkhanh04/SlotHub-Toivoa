const User = require('../models/User');
const Vendor = require('../models/Vendor'); 
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const { OAuth2Client } = require('google-auth-library');
const { notifyAdmin } = require('../utils/adminNotify');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// ==========================================
// 1. API ĐĂNG KÝ (REGISTER)
// ==========================================
const register = async (req, res) => {
  try {
    const { email, password, name, phone } = req.body; 
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'Email này đã được sử dụng!' });

    // KHÔNG cần dùng bcrypt ở đây nữa, Model sẽ tự băm password thông qua pre('save')
    const newUser = new User({ email, password, name, phone });
    await newUser.save();

    await notifyAdmin(req, {
      title: 'Tài khoản mới đăng ký',
      message: `${name || email} vừa đăng ký tài khoản (${email})`,
      type: 'NEW_USER',
      actionLink: 'users'
    });

    res.status(201).json({ message: '🎉 Đăng ký tài khoản SlotHub thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ==========================================
// 2. API ĐĂNG NHẬP (LOGIN)
// ==========================================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập Email và Mật khẩu!' });
    }

    // Phải thêm .select('+password') để lấy trường password bị ẩn
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'Tài khoản không tồn tại trong hệ thống!' });

    if (user.role === 'student') {
        return res.status(403).json({ message: 'CẢNH BÁO: Sinh viên vui lòng đăng nhập bằng nút Google!' });
    }

    // 🌟 CHỐT CHẶN: Chặn Vendor chưa được Admin duyệt
    if ((user.role === 'vendor' || user.role === 'vendor_owner') && user.isApproved === false) {
        return res.status(403).json({ message: 'Gian hàng của bạn đang chờ Admin phê duyệt! Vui lòng quay lại sau.' });
    }

    if (!user.password) {
        return res.status(400).json({ message: 'Tài khoản này chưa được thiết lập mật khẩu. Vui lòng liên hệ Admin!' });
    }

    // So sánh mật khẩu bằng hàm đã viết sẵn trong Model
    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Sai mật khẩu!' });

    const token = generateToken(user._id, user.role);
    user.password = undefined; 

    res.status(200).json({
      message: '🔑 Đăng nhập hệ thống Quản trị thành công!',
      token: token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        avatar: user.avatar,
        walletBalance: user.walletBalance,
        bankAccount: user.bankAccount
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// ==========================================
// 3. API ĐĂNG NHẬP GOOGLE (Đã mở khóa mọi email)
// ==========================================
const googleLogin = async (req, res) => {
  try {
    const { access_token } = req.body; 
    
    if (!access_token) return res.status(400).json({ message: 'Thiếu Google Access Token!' });

    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` }
    });

    const data = await response.json();
    const { email_verified, email, name, sub: googleId, picture } = data;

    if (!email) return res.status(400).json({ message: 'Không lấy được email từ Google!' });
    if (!email_verified) return res.status(400).json({ message: 'Email Google chưa được xác minh!' });
    
    // 🌟 ĐÃ XÓA CHECK ĐUÔI @fpt.edu.vn Ở ĐÂY ĐỂ CHO PHÉP MỌI GMAIL 🌟

    let user = await User.findOne({ email });
    let isNewUser = false;

    if (user) {
      user.avatar = picture; 
      if (!user.googleId) user.googleId = googleId;
      await user.save();
    } else {
      isNewUser = true;
      user = new User({ name, email, googleId, role: 'student', avatar: picture });
      await user.save();
      await notifyAdmin(req, {
        title: 'Sinh viên mới (Google)',
        message: `${name} (${email}) vừa đăng nhập Google lần đầu`,
        type: 'NEW_USER',
        actionLink: 'users'
      });
    }

    const token = generateToken(user._id, user.role);

    return res.status(isNewUser ? 201 : 200).json({ 
      message: isNewUser ? 'Tạo tài khoản qua Google thành công!' : 'Đăng nhập Google thành công!', 
      token, 
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        avatar: user.avatar,
        walletBalance: user.walletBalance,
        bankAccount: user.bankAccount
      }
    });

  } catch (error) {
    console.error("Lỗi xác thực Google chi tiết:", error);
    res.status(500).json({ message: 'Lỗi xác thực Google từ Server', error: error.message });
  }
};

// ==========================================
// 4. API QUÊN MẬT KHẨU (Gửi mã OTP 6 số)
// ==========================================
const PARTNER_RESET_ROLES = ['vendor', 'vendor_owner', 'admin'];

const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'Vui lòng nhập email đăng nhập!' });
    }

    const user = await User.findOne({ email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
      .select('+password +resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản đối tác với email này.' });
    }

    if (user.role === 'student') {
      return res.status(400).json({ message: 'Tài khoản sinh viên đăng nhập bằng Google, không dùng mật khẩu email.' });
    }

    if (!PARTNER_RESET_ROLES.includes(user.role)) {
      return res.status(403).json({ message: 'Loại tài khoản này không hỗ trợ khôi phục mật khẩu qua email.' });
    }

    if (!user.password) {
      return res.status(400).json({ message: 'Tài khoản chưa có mật khẩu. Vui lòng liên hệ Admin để được cấp lại.' });
    }

    // Tạo mã OTP 6 chữ số
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    
    // Lưu lại bỏ qua validate để update token mượt hơn
    await user.save({ validateBeforeSave: false });

    const roleLabel = user.role === 'admin' ? 'Quản trị' : 'Chủ quầy';
    const message = `Chào ${user.name || 'bạn'},\n\nBạn vừa yêu cầu khôi phục mật khẩu SlotHub (${roleLabel}).\n\nMã xác nhận: ${resetToken}\n\nMã có hiệu lực 15 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`;

    await sendEmail({
      email: user.email,
      subject: 'Mã khôi phục mật khẩu SlotHub — Chủ quầy / Admin',
      message
    });

    res.json({ message: 'Đã gửi mã 6 số vào email của bạn. Vui lòng kiểm tra hộp thư (cả thư rác).' });
  } catch (error) {
    console.error('forgotPassword:', error);
    res.status(500).json({ message: 'Lỗi khi gửi email. Kiểm tra cấu hình EMAIL_USER / EMAIL_PASS trên server.' });
  }
};

// ==========================================
// 5. API ĐẶT LẠI MẬT KHẨU
// ==========================================
const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || String(resetToken).trim().length !== 6) {
      return res.status(400).json({ message: 'Mã xác nhận phải gồm 6 chữ số.' });
    }
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    }

    const hashedToken = crypto.createHash('sha256').update(String(resetToken).trim()).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+password +resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({ message: 'Mã xác nhận không hợp lệ hoặc đã hết hạn (15 phút).' });
    }

    if (!PARTNER_RESET_ROLES.includes(user.role)) {
      return res.status(403).json({ message: 'Không thể đặt lại mật khẩu cho loại tài khoản này.' });
    }

    // KHÔNG cần băm password thủ công, chỉ cần gán và save, Model sẽ tự xử lý
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi đặt lại mật khẩu', error: error.message });
  }
};

// ==========================================
// 6. API ĐĂNG KÝ QUẦY (VENDOR)
// ==========================================
const registerVendor = async (req, res) => {
  try {
    const { name, vendorName, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email này đã được đăng ký trong hệ thống!' });
    }

    // 🌟 KHÔNG CẦN BĂM MẬT KHẨU THỦ CÔNG - TẠO USER ÉP CỜ CHỜ DUYỆT
    const newOwner = new User({
      name,
      email,
      password, // Chuyển thẳng, Model lo băm
      role: 'vendor_owner',
      isApproved: false 
    });
    await newOwner.save();

    const { normalizeTimeString } = require('../utils/timeFormat');
    const newVendor = new Vendor({
      name: vendorName,
      owner: newOwner._id,
      openTime: normalizeTimeString(req.body.openTime, '07:00'),
      closeTime: normalizeTimeString(req.body.closeTime, '21:00'),
      category: req.body.category || 'Cơm'
    });
    await newVendor.save();

    await notifyAdmin(req, {
      title: 'Quầy mới chờ duyệt',
      message: `${name} đăng ký gian hàng "${vendorName}" (${email})`,
      type: 'NEW_VENDOR',
      actionLink: 'vendors'
    });

    res.status(201).json({ message: '🎉 Đăng ký mở quầy thành công!' });
  } catch (error) {
    console.error("Lỗi đăng ký quầy:", error);
    res.status(500).json({ message: 'Lỗi hệ thống khi tạo quầy', error: error.message });
  }
};

module.exports = { register, login, googleLogin, forgotPassword, resetPassword, registerVendor };