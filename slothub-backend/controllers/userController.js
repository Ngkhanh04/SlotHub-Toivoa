const User = require('../models/User');
const bcrypt = require('bcryptjs');
const {
    validateStudentBankAccount,
    assertUniqueStudentBank
} = require('../utils/studentBankAccount');

// ==========================================
// QUYỀN CỦA KHÁCH HÀNG (USER BÌNH THƯỜNG)
// ==========================================

const getMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password -resetPasswordToken -resetPasswordExpire');
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

        res.status(200).json({
            _id: user._id, id: user._id, name: user.name, email: user.email, phone: user.phone,
            role: user.role, avatar: user.avatar, walletBalance: user.walletBalance,
            isPremium: user.isPremium, bankAccount: user.bankAccount 
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

        const { name, phone, avatar, bankAccount } = req.body;
        const updateFields = {};
        if (name !== undefined && name !== null) updateFields.name = String(name).trim();
        if (phone !== undefined && phone !== null) {
            const normalized = String(phone).trim();
            if (normalized && !/^0\d{9,10}$/.test(normalized)) {
                return res.status(400).json({ message: 'Số điện thoại không hợp lệ (VD: 0912345678).' });
            }
            updateFields.phone = normalized;
        }
        if (avatar !== undefined && avatar !== null) updateFields.avatar = String(avatar).trim();

        if (bankAccount !== undefined && bankAccount !== null) {
            const isVendor = ['vendor', 'vendor_owner'].includes(currentUser.role);
            if (isVendor) {
                updateFields.bankAccount = {
                    bankName: String(bankAccount.bankName || '').trim().toUpperCase(),
                    accountNumber: String(bankAccount.accountNumber || '').trim(),
                    accountName: String(bankAccount.accountName || '').trim().toUpperCase()
                };
            } else if (currentUser.role !== 'student') {
                return res.status(403).json({
                    message: 'Không thể cập nhật tài khoản ngân hàng cho loại tài khoản này.'
                });
            } else {
            const validated = validateStudentBankAccount(bankAccount);
            if (!validated.ok) {
                return res.status(400).json({ message: validated.message });
            }
            const unique = await assertUniqueStudentBank({
                ...validated.data,
                excludeUserId: currentUser._id
            });
            if (!unique.ok) {
                return res.status(400).json({ message: unique.message });
            }
            updateFields.bankAccount = validated.data;
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id, updateFields, { returnDocument: 'after', runValidators: true } 
        ).select('-password -resetPasswordToken -resetPasswordExpire');

        if (!updatedUser) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        res.status(200).json({
            message: 'Cập nhật hồ sơ thành công!',
            data: updatedUser,
            user: {
                _id: updatedUser._id,
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone || '',
                role: updatedUser.role,
                avatar: updatedUser.avatar,
                walletBalance: updatedUser.walletBalance,
                bankAccount: updatedUser.bankAccount
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message: 'Số tài khoản này đã được sinh viên khác liên kết. Mỗi sinh viên phải dùng tài khoản ngân hàng riêng.'
            });
        }
        res.status(500).json({ message: 'Lỗi cập nhật', error: error.message });
    }
};

// ==========================================
// QUYỀN CỦA ADMIN (SUPER ADMIN)
// ==========================================

// 3. 🌟 [POST] Tạo tài khoản mới (Nâng cấp thêm Mật khẩu)
const createAccount = async (req, res) => {
    try {
        const { name, email, role, password } = req.body;

        if (!name || !email || !role) {
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin (Tên, Email, Quyền)!' });
        }

        // Bắt buộc phải khởi tạo mật khẩu nếu tạo Vendor hoặc Admin
        if ((role === 'vendor' || role === 'vendor_owner' || role === 'admin') && !password) {
             return res.status(400).json({ message: 'Vui lòng khởi tạo mật khẩu để Chủ quán/Admin có thể đăng nhập!' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: `Email này đã tồn tại với chức vụ: ${userExists.role.toUpperCase()}` });
        }

        // Mã hóa mật khẩu an toàn
        let hashedPassword = undefined;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            hashedPassword = await bcrypt.hash(password, salt);
        }

        const newUser = await User.create({
            name, email, role, 
            password: hashedPassword, // Lưu mật khẩu đã mã hóa
            walletBalance: 0
        });

        // Ẩn mật khẩu khi trả kết quả về
        newUser.password = undefined;

        res.status(201).json({ 
            message: `🎉 Đã cấp tài khoản ${role.toUpperCase()} thành công! Hãy gửi Mật khẩu cho đối tác.`,
            user: newUser 
        });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi hệ thống khi tạo tài khoản', error: error.message });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('name email phone role avatar walletBalance isApproved isActive createdAt updatedAt')
            .sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

const updateUserRole = async (req, res) => {
    try {
        let { role } = req.body;
        if (!role) return res.status(400).json({ message: 'Vui lòng cung cấp Role muốn đổi!' });

        role = role.toLowerCase();
        const validRoles = ['student', 'staff', 'vendor', 'vendor_owner', 'admin'];
        if (!validRoles.includes(role)) return res.status(400).json({ message: 'Quyền (Role) không hợp lệ!' });

        const updatedUser = await User.findByIdAndUpdate(req.params.id, { role: role }, { returnDocument: 'after' }).select('-password');
        if (!updatedUser) return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
        
        res.status(200).json({ message: `Đã cấp quyền [${role.toUpperCase()}] cho tài khoản!`, data: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi cập nhật quyền', error: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) return res.status(404).json({ message: 'Không tìm thấy người dùng để xóa!' });
        res.status(200).json({ message: 'Đã xóa người dùng khỏi hệ thống thành công!' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi xóa người dùng', error: error.message });
    }
};

module.exports = { getMyProfile, updateProfile, createAccount, getAllUsers, updateUserRole, deleteUser };