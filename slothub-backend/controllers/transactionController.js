const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const { notifyAdmin } = require('../utils/adminNotify');
const { logStudentWallet, logAudit } = require('../utils/persistence');
const { studentHasBankAccount } = require('../utils/studentBankAccount');

const isVendorRole = (role) => ['vendor', 'vendor_owner'].includes(role);

// 1. [POST] Yêu cầu Nạp / Rút tiền (Sinh viên) hoặc Rút doanh thu (Chủ quầy → PAYOUT)
const requestTransaction = async (req, res) => {
    try {
        const { type, amount, description } = req.body;
        const userId = req.user.id;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Số tiền không hợp lệ!' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
        }

        const vendorUser = isVendorRole(user.role);
        if (vendorUser && type === 'DEPOSIT') {
            return res.status(400).json({ message: 'Chủ quầy không nạp ví qua kênh này. Doanh thu được cộng tự động khi có đơn.' });
        }

        const txType = type === 'WITHDRAW' && vendorUser ? 'PAYOUT' : type;

        if (!['DEPOSIT', 'WITHDRAW', 'PAYOUT'].includes(txType)) {
            return res.status(400).json({ message: 'Loại giao dịch không hợp lệ!' });
        }

        let userBankData = undefined;

        if (type === 'WITHDRAW' || txType === 'PAYOUT') {
            if (user.walletBalance < amount) {
                return res.status(400).json({ message: 'Số dư ví không đủ để rút!' });
            }

            if (txType === 'WITHDRAW') {
                if (user.role !== 'student') {
                    return res.status(400).json({ message: 'Chỉ sinh viên rút tiền qua kênh này.' });
                }
                if (!studentHasBankAccount(user)) {
                    return res.status(400).json({
                        message: 'Bạn chưa liên kết tài khoản ngân hàng riêng. Vào Hồ sơ cá nhân để cập nhật STK nhận tiền.'
                    });
                }
            } else if (!user.bankAccount?.accountNumber || !user.bankAccount?.bankName) {
                return res.status(400).json({ message: 'Bạn chưa liên kết tài khoản ngân hàng. Vui lòng cập nhật trong Cài đặt quầy!' });
            }

            userBankData = {
                bankName: user.bankAccount.bankName,
                accountNumber: user.bankAccount.accountNumber,
                accountName: user.bankAccount.accountName
            };


            // Trừ tiền đóng băng
            user.walletBalance -= amount;
            await user.save();
        }

        const vendorDoc = vendorUser ? await Vendor.findOne({ owner: user._id }) : null;

        const newTransaction = new Transaction({
            userId: user._id,
            vendorId: vendorDoc?._id,
            amount: amount,
            type: txType,
            status: 'PENDING',
            description: description || (
                txType === 'DEPOSIT' ? `Nạp ${amount.toLocaleString()}đ` :
                txType === 'PAYOUT' ? `Rút doanh thu ${amount.toLocaleString()}đ` :
                `Rút ${amount.toLocaleString()}đ`
            ),
            bankInfo: userBankData
        });
        await newTransaction.save();

        const who = user.name || user.email;
        if (txType === 'DEPOSIT') {
            await notifyAdmin(req, {
                title: 'Yêu cầu nạp tiền',
                message: `${who} yêu cầu nạp ${Number(amount).toLocaleString('vi-VN')}đ vào ví`,
                type: 'DEPOSIT',
                actionLink: 'transactions'
            });
        } else if (txType === 'WITHDRAW') {
            await notifyAdmin(req, {
                title: 'Yêu cầu rút tiền (SV)',
                message: `${who} yêu cầu rút ${Number(amount).toLocaleString('vi-VN')}đ`,
                type: 'WITHDRAW',
                actionLink: 'transactions'
            });
        } else if (txType === 'PAYOUT') {
            await notifyAdmin(req, {
                title: 'Yêu cầu rút doanh thu quầy',
                message: `${who} (chủ quầy) rút ${Number(amount).toLocaleString('vi-VN')}đ`,
                type: 'PAYOUT',
                actionLink: 'transactions'
            });
        }

        const actionLabel = txType === 'DEPOSIT' ? 'Nạp' : 'Rút';
        res.status(201).json({ 
            message: `Yêu cầu ${actionLabel} tiền đã được gửi. Admin sẽ duyệt và chuyển khoản sớm nhất!`,
            transaction: newTransaction,
            newBalance: user.walletBalance
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi xử lý giao dịch', error: error.message });
    }
};

// ... Các hàm khác giữ nguyên y hệt (getMyTransactions, getVendorTransactions, getAllTransactions, updateTransactionStatus) ...

// 2. [GET] Lấy lịch sử dòng tiền Cá nhân
const getMyTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user.id }).sort({ createdAt: -1 }); 
        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy lịch sử giao dịch', error: error.message });
    }
};

// 3. [GET] Lấy lịch sử dòng tiền của 1 Quán
const getVendorTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ vendorId: req.params.vendorId })
            .populate('orderId', 'totalPrice status') 
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy lịch sử giao dịch quán', error: error.message });
    }
};

// 4. [GET] Kiểm toán toàn hệ thống (Admin)
const getAllTransactions = async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Quyền truy cập bị từ chối!' });
        
        const transactions = await Transaction.find()
            .populate('userId', 'name email walletBalance role')
            .sort({ createdAt: -1 });
        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi hệ thống kiểm toán', error: error.message });
    }
};

// 5. [PUT] Admin Duyệt / Từ chối giao dịch
const updateTransactionStatus = async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Thao tác bị từ chối!' });

        const { status } = req.body; 
        const transactionId = req.params.id;

        const transaction = await Transaction.findById(transactionId);
        if (!transaction) return res.status(404).json({ message: 'Không tìm thấy giao dịch!' });
        
        if (transaction.status !== 'PENDING') return res.status(400).json({ message: 'Giao dịch này đã được xử lý!' });

        const user = await User.findById(transaction.userId);
        if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản!' });

        if (status === 'SUCCESS') {
            if (transaction.type === 'DEPOSIT') {
                user.walletBalance += transaction.amount;
                await user.save();
                await logStudentWallet({
                    userId: user._id,
                    amount: transaction.amount,
                    balanceAfter: user.walletBalance,
                    type: 'DEPOSIT',
                    transactionId: transaction._id,
                    description: transaction.description || 'Nạp ví'
                });
            }
        } 
        else if (status === 'FAILED') {
            if (transaction.type === 'WITHDRAW' || transaction.type === 'PAYOUT') {
                user.walletBalance += transaction.amount;
                await user.save();
                if (transaction.type === 'WITHDRAW') {
                    await logStudentWallet({
                        userId: user._id,
                        amount: transaction.amount,
                        balanceAfter: user.walletBalance,
                        type: 'REFUND',
                        transactionId: transaction._id,
                        description: 'Hoàn tiền yêu cầu rút bị từ chối'
                    });
                }
            }
        } 
        else {
            return res.status(400).json({ message: 'Trạng thái duyệt không hợp lệ!' });
        }

        transaction.status = status;
        await transaction.save();

        await logAudit({
            actor: req.user.id,
            actorRole: 'admin',
            action: status === 'SUCCESS' ? 'TRANSACTION_APPROVED' : 'TRANSACTION_REJECTED',
            entityType: 'Transaction',
            entityId: transaction._id,
            metadata: { type: transaction.type, amount: transaction.amount }
        });

        res.status(200).json({ message: `Đã ${status === 'SUCCESS' ? 'PHÊ DUYỆT' : 'TỪ CHỐI'} lệnh tiền!`, transaction });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi phê duyệt giao dịch', error: error.message });
    }
};

// 6. [GET] Tổng quan ví chủ quầy (số dư + lịch sử rút)
const getVendorWalletSummary = async (req, res) => {
    try {
        if (!isVendorRole(req.user.role)) {
            return res.status(403).json({ message: 'Chỉ chủ quầy mới truy cập được!' });
        }
        const vendor = await Vendor.findOne({ owner: req.user.id });
        const user = await User.findById(req.user.id).select('walletBalance bankAccount name email');

        const [payoutRequests, orderRevenue] = await Promise.all([
            Transaction.find({ userId: req.user.id, type: 'PAYOUT' }).sort({ createdAt: -1 }).limit(30),
            vendor
                ? Transaction.find({ vendorId: vendor._id, type: 'PAYMENT', status: 'SUCCESS' })
                    .sort({ createdAt: -1 }).limit(30)
                : []
        ]);

        const transactions = [...payoutRequests, ...orderRevenue]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 50);

        res.status(200).json({
            balance: user?.walletBalance || 0,
            bankAccount: user?.bankAccount,
            vendor,
            transactions
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy ví quầy', error: error.message });
    }
};

module.exports = {
    requestTransaction,
    getMyTransactions,
    getVendorTransactions,
    getAllTransactions,
    updateTransactionStatus,
    getVendorWalletSummary
};