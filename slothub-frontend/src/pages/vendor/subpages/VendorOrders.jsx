import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import { Loader2, Package, CheckCircle, XCircle } from 'lucide-react';

const statusLabel = {
  Pending: 'Chờ xác nhận',
  Processing: 'Đang làm',
  Ready: 'Sẵn sàng',
  Completed: 'Đã nhận món',
  Cancelled: 'Đã hủy',
};

const VendorOrders = ({ refreshKey = 0, onGoPickup }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [refreshKey]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders/vendor/my-orders'); 
      setOrders(res.data);
    } catch (err) {
      console.error("Lỗi lấy đơn hàng:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/orders/${id}/status`, { status });
      fetchOrders(); // Tải lại danh sách sau khi update
    } catch (err) {
      alert("Lỗi cập nhật đơn hàng!");
    }
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case 'Pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'Processing': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Ready': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Completed': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'Cancelled': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 portal-muted';
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#F27124]" size={40}/></div>;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {onGoPickup && (
        <div className="bg-gradient-to-r from-[#F27124]/20 to-transparent border border-[#F27124]/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm portal-text-secondary">
            Sinh viên đến lấy món? Dùng <strong className="text-[var(--portal-text)]">Quét nhận món</strong> để quét QR trên app.
          </p>
          <button
            type="button"
            onClick={onGoPickup}
            className="bg-[#F27124] text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#D95F1B]"
          >
            Mở quét QR
          </button>
        </div>
      )}
      {orders.length === 0 ? (
        <div className="text-center py-20 portal-muted">Chưa có đơn hàng nào chờ xử lý.</div>
      ) : (
        orders.map(order => (
          <div key={order._id} className="portal-card border p-6 rounded-2xl border border-[var(--portal-border)] shadow-lg hover:border-[var(--portal-border)] transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-black text-lg">Đơn hàng #{order._id.slice(-6)}</h3>
                <p className="portal-muted text-sm">{new Date(order.createdAt).toLocaleString('vi-VN')}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-black border ${getStatusStyle(order.status)}`}>
                {statusLabel[order.status] || order.status}
              </span>
            </div>

            <div className="space-y-2 mb-6">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm portal-text-secondary">
                  <span>{item.quantity}x {item.menuItem?.name || 'Món ăn đã xóa'}</span>
                  <span>{(item.price * item.quantity).toLocaleString()}đ</span>
                </div>
              ))}
              <div className="border-t border-[var(--portal-border)] pt-2 flex justify-between font-black">
                <span>Tổng cộng:</span>
                <span>{order.totalPrice.toLocaleString()}đ</span>
              </div>
              {order.note && <p className="text-xs text-orange-300 italic">Ghi chú: {order.note}</p>}
            </div>

            <div className="flex gap-3">
              {order.status === 'Pending' && (
                <button onClick={() => updateStatus(order._id, 'Processing')} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                  <Package size={18} /> Xác nhận làm món
                </button>
              )}
              {order.status === 'Processing' && (
                <button onClick={() => updateStatus(order._id, 'Ready')} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                  <CheckCircle size={18} /> Sẵn sàng giao
                </button>
              )}
              {order.status === 'Ready' && onGoPickup && (
                <button
                  type="button"
                  onClick={onGoPickup}
                  className="flex-1 bg-[#F27124] hover:bg-[#D95F1B] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                >
                  Quét QR nhận món
                </button>
              )}
              {['Pending', 'Processing'].includes(order.status) && (
                <button onClick={() => updateStatus(order._id, 'Cancelled')} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-[var(--portal-text)] px-4 rounded-xl font-bold transition-all">
                  <XCircle size={20} />
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default VendorOrders;