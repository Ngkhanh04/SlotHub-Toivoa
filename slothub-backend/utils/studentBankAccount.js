const User = require('../models/User');

const normalizeBankAccount = (bankAccount = {}) => {
    const bankName = String(bankAccount.bankName || '').trim().toUpperCase();
    const accountNumber = String(bankAccount.accountNumber || '').replace(/\D/g, '');
    const accountName = String(bankAccount.accountName || '').trim().toUpperCase();
    return { bankName, accountNumber, accountName };
};

const validateStudentBankAccount = (bankAccount) => {
    const { bankName, accountNumber, accountName } = normalizeBankAccount(bankAccount);
    if (!bankName || bankName.length < 2) {
        return { ok: false, message: 'Vui lòng nhập mã ngân hàng (VD: MB, VCB, TPB).' };
    }
    if (!accountNumber || accountNumber.length < 6 || accountNumber.length > 20) {
        return { ok: false, message: 'Số tài khoản phải từ 6–20 chữ số.' };
    }
    if (!accountName || accountName.length < 3) {
        return { ok: false, message: 'Vui lòng nhập tên chủ tài khoản (không dấu, viết hoa).' };
    }
    return { ok: true, data: { bankName, accountNumber, accountName } };
};

/** Mỗi sinh viên một STK — không cho hai tài khoản SV trùng ngân hàng + số TK */
const assertUniqueStudentBank = async ({ bankName, accountNumber, excludeUserId }) => {
    const filter = {
        role: 'student',
        'bankAccount.bankName': bankName,
        'bankAccount.accountNumber': accountNumber
    };
    if (excludeUserId) {
        filter._id = { $ne: excludeUserId };
    }
    const existing = await User.findOne(filter).select('name email');
    if (existing) {
        return {
            ok: false,
            message: 'Số tài khoản này đã được sinh viên khác liên kết. Mỗi sinh viên phải dùng tài khoản ngân hàng riêng.'
        };
    }
    return { ok: true };
};

const studentHasBankAccount = (user) => {
    const b = user?.bankAccount;
    return Boolean(b?.bankName && b?.accountNumber && b?.accountName);
};

module.exports = {
    normalizeBankAccount,
    validateStudentBankAccount,
    assertUniqueStudentBank,
    studentHasBankAccount
};
