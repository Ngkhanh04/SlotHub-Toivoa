import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import UserAvatar from '../../../components/UserAvatar';
import {
  Store, Mail, Wallet, Loader2, Search, ArrowDownToLine, CheckCircle, XCircle,
  Calendar, ShieldAlert, Clock, Phone, UtensilsCrossed, FileText, Image as ImageIcon,
  CircleDot, ShoppingBag
} from 'lucide-react';
import { formatVendorHoursRange } from '../../../utils/timeFormat';

const PendingVendorCard = ({ vendor, processingId, onApprove, onReject }) => (
  <div className="bg-[var(--portal-table-head)] rounded-[1.5rem] border border-[var(--portal-border)]/50 overflow-hidden flex flex-col">
    <div className="h-36 bg-[var(--portal-surface)] relative">
      {vendor.imageUrl ? (
        <img
          src={vendor.imageUrl}
          alt={vendor.name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-600">
          <Store size={40} />
        </div>
      )}
      <span className="absolute top-3 left-3 bg-[#F27124] text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
        Chờ duyệt
      </span>
    </div>

    <div className="p-5 flex-1 flex flex-col">
      <h3 className="text-lg font-black mb-1">{vendor.name}</h3>
      <p className="text-xs text-[#F27124] font-bold mb-3">{vendor.category || 'Chưa phân loại'}</p>

      {vendor.description && (
        <p className="text-sm portal-muted mb-3 line-clamp-2 flex gap-2">
          <FileText size={14} className="shrink-0 mt-0.5" />
          {vendor.description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs mb-4">
        <div className="bg-[var(--portal-surface)]/80 rounded-xl px-3 py-2 border border-[var(--portal-border)]">
          <p className="portal-muted font-bold mb-0.5">Giờ mở cửa quầy</p>
          <p className="font-black flex items-center gap-1">
            <Clock size={12} className="text-[#F27124]" />
            {vendor.hoursDisplay || formatVendorHoursRange(vendor)}
          </p>
        </div>
        <div className="bg-[var(--portal-surface)]/80 rounded-xl px-3 py-2 border border-[var(--portal-border)]">
          <p className="portal-muted font-bold mb-0.5">Ngày đăng ký</p>
          <p className="font-medium">
            {vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString('vi-VN') : '—'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-[var(--portal-surface)] rounded-xl border border-[var(--portal-border)] mb-4">
        <UserAvatar user={vendor.owner} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate">{vendor.owner?.name}</p>
          <p className="text-xs portal-muted flex items-center gap-1 truncate">
            <Mail size={10} /> {vendor.owner?.email}
          </p>
          {vendor.owner?.phone && (
            <p className="text-xs portal-muted flex items-center gap-1 mt-0.5">
              <Phone size={10} /> {vendor.owner.phone}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-auto">
        <button
          type="button"
          onClick={() => onReject(vendor.owner._id)}
          disabled={processingId === vendor.owner._id}
          className="flex-1 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-[var(--portal-text)] py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 border border-red-500/20"
        >
          <XCircle size={16} /> Từ chối
        </button>
        <button
          type="button"
          onClick={() => onApprove(vendor.owner._id)}
          disabled={processingId === vendor.owner._id}
          className="flex-1 bg-[#F27124] text-white hover:bg-[#D95F1B] py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {processingId === vendor.owner._id ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
          Duyệt ngay
        </button>
      </div>
    </div>
  </div>
);

const AdminVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [pendingVendors, setPendingVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allRes, pendingRes] = await Promise.all([
        api.get('/admin/vendors'),
        api.get('/admin/pending-vendors'),
      ]);
      const all = allRes.data || [];
      const active = all.filter(
        (v) => v.owner && v.owner.isApproved !== false && v.owner.role !== 'student'
      );
      setVendors(active);
      setPendingVendors(pendingRes.data || []);
    } catch (error) {
      console.error('Lỗi tải dữ liệu gian hàng:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn DUYỆT gian hàng này?')) return;
    setProcessingId(userId);
    try {
      await api.put(`/admin/approve-vendor/${userId}`);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi khi duyệt!');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('CẢNH BÁO: Bạn có chắc chắn muốn TỪ CHỐI và XÓA yêu cầu này không?')) return;
    setProcessingId(userId);
    try {
      await api.delete(`/admin/reject-vendor/${userId}`);
      setPendingVendors((prev) => prev.filter((v) => v.owner?._id !== userId));
    } catch (error) {
      alert('Lỗi khi từ chối!');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDemote = async (userId, vendorName) => {
    if (!window.confirm(`Bạn muốn tước quyền bán hàng của quầy [${vendorName}] và chuyển chủ về Sinh viên?`)) return;
    try {
      await api.put(`/users/${userId}/role`, { role: 'student' });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi xử lý!');
    }
  };

  const q = searchTerm.toLowerCase().trim();
  const filteredVendors = vendors.filter((v) => {
    if (!q) return true;
    return (
      v.name?.toLowerCase().includes(q) ||
      v.category?.toLowerCase().includes(q) ||
      v.owner?.name?.toLowerCase().includes(q) ||
      v.owner?.email?.toLowerCase().includes(q) ||
      (v.owner?.phone || '').includes(searchTerm.trim())
    );
  });

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#F27124]" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {pendingVendors.length > 0 && (
        <div className="portal-card border rounded-3xl border border-orange-500/20 shadow-lg shadow-orange-500/5 overflow-hidden">
          <div className="p-6 border-b border-[var(--portal-border)] flex justify-between items-center bg-orange-500/5">
            <h3 className="font-black text-lg flex items-center gap-2">
              <ShieldAlert className="text-[#F27124]" /> Yêu cầu chờ duyệt
            </h3>
            <span className="bg-[#F27124] text-white px-3 py-1 rounded-full text-xs font-bold">
              {pendingVendors.length} yêu cầu
            </span>
          </div>
          <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
            {pendingVendors.map((vendor) => (
              <PendingVendorCard
                key={vendor._id}
                vendor={vendor}
                processingId={processingId}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        </div>
      )}

      <div className="portal-card border rounded-3xl border border-[var(--portal-border)] overflow-hidden">
        <div className="p-6 border-b border-[var(--portal-border)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--portal-table-head)]">
          <div>
            <h3 className="font-black text-lg flex items-center gap-2">
              <Store className="text-[#F27124]" /> Gian hàng đang hoạt động
            </h3>
            <p className="portal-muted text-sm mt-1">
              {vendors.length} quầy · giờ mở cửa lấy từ cài đặt của chủ quầy (không phải khung nhận món SV)
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Tìm tên quầy, chủ quán, email, SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-full py-2.5 pl-10 pr-4 text-sm text-[var(--portal-text)] focus:border-[#F27124] outline-none transition-all"
            />
            <Search className="absolute left-3.5 top-2.5 portal-muted" size={16} />
          </div>
        </div>

        <div className="p-6 space-y-5">
          {filteredVendors.length === 0 ? (
            <p className="text-center py-12 portal-muted font-medium">Chưa có gian hàng nào đang hoạt động.</p>
          ) : (
            filteredVendors.map((vendor) => (
              <div
                key={vendor._id}
                className="bg-[var(--portal-input-bg)]/40 rounded-2xl border border-[var(--portal-border)] overflow-hidden hover:border-[var(--portal-border)] transition-colors"
              >
                <div className="flex flex-col lg:flex-row">
                  <div className="lg:w-48 h-40 lg:h-auto shrink-0 bg-[var(--portal-surface)] relative">
                    {vendor.imageUrl ? (
                      <img
                        src={vendor.imageUrl}
                        alt={vendor.name}
                        className="w-full h-full object-cover min-h-[160px]"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full min-h-[160px] flex flex-col items-center justify-center text-gray-600 gap-2">
                        <ImageIcon size={32} />
                        <span className="text-xs font-bold">Chưa có ảnh</span>
                      </div>
                    )}
                    <span
                      className={`absolute top-3 left-3 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 ${
                        vendor.isOpen
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      <CircleDot size={10} />
                      {vendor.isOpen ? 'Đang mở' : 'Đóng cửa'}
                    </span>
                  </div>

                  <div className="flex-1 p-5 lg:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                      <div>
                        <h4 className="text-xl font-black">{vendor.name}</h4>
                        <p className="text-sm text-[#F27124] font-bold mt-0.5">{vendor.category || 'Chưa phân loại'}</p>
                        {vendor.description && (
                          <p className="text-sm portal-muted mt-2 max-w-xl line-clamp-2">{vendor.description}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <span
                          className="text-xs font-bold bg-[var(--portal-surface)] portal-text-secondary px-3 py-1.5 rounded-lg border border-[var(--portal-border)] flex items-center gap-1"
                          title="Giờ mở cửa do chủ quầy cài trong Cài đặt gian hàng"
                        >
                          <Clock size={12} className="text-[#F27124]" />
                          {vendor.hoursDisplay || formatVendorHoursRange(vendor)}
                        </span>
                        <span
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
                            vendor.isActive !== false
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : 'bg-[var(--portal-surface)] portal-muted border-[var(--portal-border)]'
                          }`}
                        >
                          {vendor.isActive !== false ? 'Đang hoạt động' : 'Tạm ngưng'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div className="bg-[var(--portal-surface)]/60 rounded-xl p-3 border border-[var(--portal-border)]">
                        <p className="text-[10px] portal-muted font-bold uppercase mb-1 flex items-center gap-1">
                          <UtensilsCrossed size={10} /> Thực đơn
                        </p>
                        <p className="font-black">
                          {vendor.menuAvailableCount}/{vendor.menuItemCount} món
                        </p>
                      </div>
                      <div className="bg-[var(--portal-surface)]/60 rounded-xl p-3 border border-[var(--portal-border)]">
                        <p className="text-[10px] portal-muted font-bold uppercase mb-1 flex items-center gap-1">
                          <ShoppingBag size={10} /> Đơn đã TT
                        </p>
                        <p className="font-black">{vendor.paidOrderCount || 0}</p>
                      </div>
                      <div className="bg-[var(--portal-surface)]/60 rounded-xl p-3 border border-[var(--portal-border)]">
                        <p className="text-[10px] portal-muted font-bold uppercase mb-1">Doanh thu</p>
                        <p className="text-green-400 font-black text-sm">
                          {(vendor.totalRevenue || 0).toLocaleString()}đ
                        </p>
                      </div>
                      <div className="bg-[var(--portal-surface)]/60 rounded-xl p-3 border border-[var(--portal-border)]">
                        <p className="text-[10px] portal-muted font-bold uppercase mb-1 flex items-center gap-1">
                          <Calendar size={10} /> Tạo quầy
                        </p>
                        <p className="font-medium text-sm">
                          {new Date(vendor.createdAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[var(--portal-border)]">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar user={vendor.owner} size="md" />
                        <div className="min-w-0">
                          <p className="text-xs portal-muted font-bold uppercase tracking-wider mb-0.5">Chủ quầy</p>
                          <p className="font-bold text-sm truncate">{vendor.owner?.name}</p>
                          <p className="text-xs portal-muted flex items-center gap-1 truncate">
                            <Mail size={10} /> {vendor.owner?.email}
                          </p>
                          {vendor.owner?.phone ? (
                            <p className="text-xs portal-muted flex items-center gap-1 mt-0.5">
                              <Phone size={10} /> {vendor.owner.phone}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-600 italic mt-0.5">Chưa có SĐT</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="inline-flex items-center gap-1.5 text-green-400 font-black bg-green-500/10 px-3 py-2 rounded-xl border border-green-500/20 text-sm">
                          <Wallet size={14} />
                          {vendor.owner?.walletBalance?.toLocaleString() || 0}đ
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDemote(vendor.owner?._id, vendor.name)}
                          className="p-2.5 portal-muted hover:text-orange-400 hover:bg-orange-500/10 rounded-xl transition-all border border-[var(--portal-border)]"
                          title="Chuyển chủ quầy về Sinh viên"
                        >
                          <ArrowDownToLine size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminVendors;
