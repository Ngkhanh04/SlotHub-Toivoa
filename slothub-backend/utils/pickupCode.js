const PICKUP_CODE_TTL_MS = 2 * 60 * 60 * 1000;

const issuePickupCode = (order, issuedAt = new Date()) => {
    if (!order.otpCode) {
        order.otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    }
    order.pickupCodeIssuedAt = issuedAt;
    order.pickupCodeExpiresAt = new Date(issuedAt.getTime() + PICKUP_CODE_TTL_MS);
};

const getPickupCodeExpiresAt = (order) => {
    if (order.pickupCodeExpiresAt) {
        return new Date(order.pickupCodeExpiresAt);
    }
    if (order.paymentStatus === 'Paid' && order.createdAt) {
        return new Date(new Date(order.createdAt).getTime() + PICKUP_CODE_TTL_MS);
    }
    return null;
};

const isPickupCodeExpired = (order, now = new Date()) => {
    const expiresAt = getPickupCodeExpiresAt(order);
    if (!expiresAt) return true;
    return now.getTime() > expiresAt.getTime();
};

const pickupCodeExpiredMessage = () =>
    'Mã nhận món đã hết hạn (quá 2 giờ kể từ khi thanh toán). Vui lòng liên hệ quầy.';

module.exports = {
    PICKUP_CODE_TTL_MS,
    issuePickupCode,
    getPickupCodeExpiresAt,
    isPickupCodeExpired,
    pickupCodeExpiredMessage
};
