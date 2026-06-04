const moment = require('moment');
const crypto = require('crypto');
const qs = require('qs');
const Order = require('../models/Order');
const { settleOrderPayment } = require('../utils/settleOrderPayment');
const { notifyVendorNewOrder } = require('../utils/vendorNotify');
const { issuePickupCode } = require('../utils/pickupCode');
const { logOrderStatus } = require('../utils/persistence');
const sendEmail = require('../utils/sendEmail');

function sortObject(obj) {
    let sorted = {};
    let str = [];
    for (let key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (let key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

// 1. [POST] Tạo link thanh toán VNPay
const createPaymentUrl = async (req, res) => {
    try {
        const { orderId } = req.body; 
        
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        
        const tmnCode = process.env.VNP_TMN_CODE;
        const secretKey = process.env.VNP_HASH_SECRET;
        let vnpUrl = process.env.VNP_URL;
        const returnUrl = process.env.VNP_RETURN_URL;

        const date = new Date();
        const createDate = moment(date).format('YYYYMMDDHHmmss');
        const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        
        let vnp_Params = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = tmnCode;
        vnp_Params['vnp_Locale'] = 'vn';
        vnp_Params['vnp_CurrCode'] = 'VND';
        vnp_Params['vnp_TxnRef'] = orderId; 
        vnp_Params['vnp_OrderInfo'] = 'Thanh toan don dat com: ' + orderId;
        vnp_Params['vnp_OrderType'] = 'billpayment';
        // 🌟 SỬA: Đổi totalAmount thành totalPrice cho đúng model Order
        vnp_Params['vnp_Amount'] = order.totalPrice * 100; 
        vnp_Params['vnp_ReturnUrl'] = returnUrl;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;

        vnp_Params = sortObject(vnp_Params);
        const signData = qs.stringify(vnp_Params, { encode: false });
        const hmac = crypto.createHmac("sha512", secretKey);
        const signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest("hex"); 
        vnp_Params['vnp_SecureHash'] = signed;

        vnpUrl += '?' + qs.stringify(vnp_Params, { encode: false });

        res.status(200).json({ paymentUrl: vnpUrl });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi tạo thanh toán', error: error.message });
    }
};

// 2. [GET] Xử lý Kết quả từ Frontend gửi lên
const vnpayReturn = async (req, res) => {
    try {
        let vnp_Params = req.query;
        const secureHash = vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHashType'];

        vnp_Params = sortObject(vnp_Params);
        const secretKey = process.env.VNP_HASH_SECRET;
        const signData = qs.stringify(vnp_Params, { encode: false });
        const hmac = crypto.createHmac("sha512", secretKey);
        const signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest("hex");

        if (secureHash === signed) {
            const orderId = vnp_Params['vnp_TxnRef'];
            const order = await Order.findById(orderId).populate('user');
            
            if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

            if (vnp_Params['vnp_ResponseCode'] === '00') {
                // CHỈ XỬ LÝ NẾU ĐƠN CHƯA THANH TOÁN (Tránh bị F5 gọi lại API nhiều lần)
                if (order.paymentStatus !== 'Paid') {
                    // 🌟 SỬA: status đổi thành 'Processing' cho khớp quy trình
                    order.paymentStatus = 'Paid';
                    order.status = 'Processing'; 
                    order.transactionId = vnp_Params['vnp_TransactionNo'];
                    issuePickupCode(order);
                    await order.save();
                    await logOrderStatus({
                        orderId: order._id,
                        fromStatus: 'Pending',
                        toStatus: 'Processing',
                        changedBy: order.user._id,
                        changedByRole: 'student',
                        note: 'VNPay thanh toán thành công'
                    });

                    await settleOrderPayment({
                        orderId: order._id,
                        studentUserId: order.user._id,
                        vendorDocId: order.vendor,
                        totalAmount: order.totalPrice,
                        paymentMethod: 'vnpay'
                    });

                    await notifyVendorNewOrder(req, order, order.user);

                    // Gửi Email... (Code gửi email của bạn giữ nguyên)
                    if (order.user && order.user.email) {
                        const emailHtml = `...`; // (Dán lại đoạn HTML email của bạn vào đây cho gọn)
                        sendEmail({
                            email: order.user.email,
                            subject: `🍱 [SlotHub] Hóa đơn đặt món thành công`,
                            html: emailHtml
                        }).catch(err => console.log('❌ Lỗi gửi email:', err));
                    }

                    // Bắn Socket...
                    const io = req.app.get('socketio'); 
                    if (io) {
                        io.emit(`new_order_${order.vendor.toString()}`, {
                            orderId: orderId,
                            message: 'Ting Ting! Có sinh viên vừa thanh toán VNPay!',
                        });
                    }
                }

                res.status(200).json({ message: 'Thanh toán thành công!', orderId: orderId });
            } else {
                // Bị hủy hoặc lỗi
                order.status = 'Cancelled';
                await order.save();
                res.status(400).json({ message: 'Giao dịch bị khách hàng hủy bỏ!' });
            }
        } else {
            res.status(400).json({ message: 'Chữ ký bảo mật không hợp lệ!' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi xử lý IPN VNPay', error: error.message });
    }
};

module.exports = { createPaymentUrl, vnpayReturn };