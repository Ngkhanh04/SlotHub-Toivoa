import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import { Users, Trash2, ShieldCheck, Mail, Wallet, Loader2, Search, Edit, Phone } from 'lucide-react';
import UserAvatar from '../../../components/UserAvatar';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState(null); // Trạng thái loading cho từng dòng

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users'); 
      setUsers(res.data);
    } catch (error) {
      console.error("Lỗi tải danh sách người dùng:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🌟 Xử lý đổi quyền (Role) cực mượt
  const handleRoleChange = async (userId, newRole, userName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn cấp quyền [${newRole.toUpperCase()}] cho tài khoản ${userName}?`)) return;
    
    setUpdatingId(userId);
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      
      // 🌟 Optimistic Update: Cập nhật ngay trên UI không cần gọi lại API
      setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi cập nhật quyền!');
    } finally {
      setUpdatingId(null);
    }
  };

  // 🌟 Xử lý xóa tài khoản
  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`CẢNH BÁO: Xóa vĩnh viễn tài khoản [${userName}] khỏi hệ thống? Dữ liệu không thể phục hồi!`)) return;
    
    setUpdatingId(userId);
    try {
      await api.delete(`/users/${userId}`);
      
      // 🌟 Xóa ngay trên UI
      setUsers(users.filter(u => u._id !== userId));
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi xóa tài khoản!');
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      (u.phone || '').includes(searchTerm.trim())
    );
  });

  if (loading) return <div className="portal-muted py-10 flex justify-center items-center h-[70vh]"><Loader2 className="animate-spin text-[#F27124]" size={40}/></div>;

  return (
    <div className="portal-card border rounded-3xl border border-[var(--portal-border)] overflow-hidden animate-in fade-in duration-300 shadow-xl">
      
      {/* THANH TÌM KIẾM */}
      <div className="p-6 border-b border-[var(--portal-border)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--portal-table-head)]">
        <div>
          <h3 className="font-black text-xl flex items-center gap-2">
            <Users className="text-[#F27124]" /> Hồ sơ Người dùng
          </h3>
          <p className="portal-muted text-sm mt-1">Hệ thống đang có tổng cộng {users.length} tài khoản.</p>
        </div>
        <div className="relative w-full md:w-80">
          <input 
            type="text" placeholder="Tìm tên, email hoặc SĐT..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
            className="w-full bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-full py-2.5 pl-10 pr-4 text-sm text-[var(--portal-text)] focus:border-[#F27124] focus:ring-1 focus:ring-[#F27124] outline-none transition-all"
          />
          <Search className="absolute left-3.5 top-2.5 portal-muted" size={16} />
        </div>
      </div>

      {/* BẢNG DỮ LIỆU */}
      <div className="overflow-x-auto min-h-[50vh]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--portal-table-head)] portal-muted text-xs font-bold uppercase tracking-wider border-b border-[var(--portal-border)]">
              <th className="p-5 pl-6">Người dùng</th>
              <th className="p-5">Số điện thoại</th>
              <th className="p-5">Thông tin Ví</th>
              <th className="p-5">Phân quyền (Role)</th>
              <th className="p-5 text-center">Ngày tạo</th>
              <th className="p-5 pr-6 text-center">Xóa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--portal-border)] portal-text-secondary">
            {filteredUsers.map(user => {
              
              // Map chung 'vendor_owner' và 'vendor' về 1 kiểu hiển thị để đổi màu cho chuẩn
              const displayRole = user.role === 'vendor_owner' ? 'vendor' : user.role;
              
              return (
              <tr key={user._id} className="hover:bg-[var(--portal-surface)]/30 transition-colors">
                
                {/* CỘT THÔNG TIN NGƯỜI DÙNG */}
                <td className="p-5 pl-6">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={user} size="lg" />
                    <div>
                      <p className="font-bold text-sm line-clamp-1">{user.name}</p>
                      <p className="text-xs portal-muted flex items-center gap-1 mt-0.5"><Mail size={10}/> {user.email}</p>
                    </div>
                  </div>
                </td>

                <td className="p-5">
                  {user.phone ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-200 bg-[var(--portal-surface)]/80 px-3 py-1.5 rounded-lg border border-[var(--portal-border)]">
                      <Phone size={14} className="text-[#F27124]" />
                      {user.phone}
                    </span>
                  ) : (
                    <span className="text-xs portal-muted italic">Chưa cập nhật</span>
                  )}
                </td>
                
                {/* CỘT VÍ ĐIỆN TỬ */}
                <td className="p-5">
                  <div className="inline-flex items-center gap-1.5 text-green-400 font-black bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
                     <Wallet size={14}/> {user.walletBalance?.toLocaleString()}đ
                  </div>
                </td>
                
                {/* CỘT ĐỔI QUYỀN (SELECT BOX) */}
                <td className="p-5">
                  <div className="relative group inline-block w-40">
                    <select 
                      value={displayRole} 
                      onChange={(e) => handleRoleChange(user._id, e.target.value, user.name)}
                      disabled={updatingId === user._id || user.email === 'admin@gmail.com'}
                      className={`appearance-none w-full text-xs font-bold rounded-xl px-4 py-2.5 outline-none cursor-pointer border transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                        displayRole === 'admin' ? 'bg-red-500/10 text-red-400 border-red-500/20 focus:border-red-500' : 
                        displayRole === 'vendor' ? 'bg-orange-500/10 text-[#F27124] border-orange-500/20 focus:border-[#F27124]' : 
                        'bg-blue-500/10 text-blue-400 border-blue-500/20 focus:border-blue-500'
                      }`}
                    >
                      <option value="student" className="bg-[var(--portal-surface)] text-white">Sinh viên</option>
                      <option value="vendor" className="bg-[var(--portal-surface)] text-white">Chủ quán (Vendor)</option>
                      <option value="admin" className="bg-[var(--portal-surface)] text-white">Quản trị viên (Admin)</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none portal-muted">
                      {updatingId === user._id ? <Loader2 size={14} className="animate-spin text-[#F27124]" /> : <Edit size={14} />}
                    </div>
                  </div>
                </td>
                
                {/* CỘT NGÀY TẠO */}
                <td className="p-5 text-center text-xs portal-muted font-medium">
                  {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                </td>
                
                {/* CỘT XÓA */}
                <td className="p-5 pr-6 text-center">
                  <button 
                    onClick={() => handleDeleteUser(user._id, user.name)}
                    disabled={user.role === 'admin' || updatingId === user._id}
                    className="p-2 portal-muted hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                    title={user.role === 'admin' ? "Không thể xóa Admin" : "Xóa tài khoản"}
                  >
                    {updatingId === user._id ? <Loader2 size={16} className="animate-spin text-red-400" /> : <Trash2 size={16} />}
                  </button>
                </td>
              </tr>
            )})}
            
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center p-12">
                  <div className="flex flex-col items-center justify-center portal-muted">
                    <ShieldCheck size={48} className="mb-3 opacity-20" />
                    <p className="font-medium text-lg">Không tìm thấy tài khoản nào!</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;