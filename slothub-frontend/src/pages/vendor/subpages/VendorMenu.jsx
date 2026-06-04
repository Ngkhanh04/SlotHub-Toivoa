import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import { PlusCircle, Edit2, Trash2, Search, Loader2, Image as ImageIcon, Power, PowerOff, UtensilsCrossed, X, Star, MessageSquare, Flame, UploadCloud } from 'lucide-react';

const VendorMenu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // States cho Modal (Popup Thêm/Sửa)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '', price: '', description: '', imageUrl: '', category: 'Cơm', calories: '', isAvailable: true
  });
  const [reviewsItem, setReviewsItem] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const categories = ['Cơm', 'Bún/Phở', 'Đồ ăn vặt', 'Đồ uống', 'Tráng miệng'];

  const resetImagePicker = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetImagePicker();
  };

  // 1. Fetch dữ liệu thực đơn
  const fetchMenu = async () => {
    try {
      const res = await api.get('/vendor/menu');
      setMenuItems(res.data);
    } catch (error) {
      console.error("Lỗi lấy thực đơn:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMenu(); }, []);

  // 2. Mở Modal Thêm mới hoặc Chỉnh sửa
  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({ 
        name: item.name, price: item.price, description: item.description || '', 
        imageUrl: item.imageUrl, category: item.category, isAvailable: item.isAvailable,
        calories: item.calories != null ? String(item.calories) : ''
      });
    } else {
      setEditingItem(null);
      setFormData({ name: '', price: '', description: '', imageUrl: '', category: 'Cơm', calories: '', isAvailable: true });
    }
    setImageFile(null);
    setImagePreview(item?.imageUrl || null);
    setIsModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh (JPG, PNG...)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Ảnh tối đa 5MB. Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadDishImage = async () => {
    const formDataUpload = new FormData();
    formDataUpload.append('image', imageFile);
    const uploadRes = await api.post('/upload', formDataUpload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return uploadRes.data.imageUrl;
  };

  // 3. Xử lý Lưu món (Thêm hoặc Sửa)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const imageUrlFromForm = formData.imageUrl?.trim();
    if (!imageFile && !imageUrlFromForm) {
      return alert('Vui lòng chọn ảnh từ máy hoặc dán link ảnh món ăn!');
    }
    setIsSubmitting(true);
    try {
      let imageUrl = imageUrlFromForm;
      if (imageFile) {
        imageUrl = await uploadDishImage();
      }
      const payload = {
        ...formData,
        imageUrl,
        price: Number(formData.price),
        calories: formData.calories === '' ? '' : Number(formData.calories),
      };
      if (editingItem) {
        await api.put(`/vendor/menu/${editingItem._id}`, payload);
        alert("Cập nhật món thành công!");
      } else {
        await api.post('/vendor/menu', payload);
        alert("Thêm món mới thành công!");
      }
      closeModal();
      fetchMenu(); // Tải lại danh sách
    } catch (error) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Bật/Tắt trạng thái "Còn hàng / Hết hàng" nhanh
  const toggleAvailability = async (id, currentStatus) => {
    try {
      await api.put(`/vendor/menu/${id}`, { isAvailable: !currentStatus });
      setMenuItems(menuItems.map(item => item._id === id ? { ...item, isAvailable: !currentStatus } : item));
    } catch (error) {
      alert("Lỗi cập nhật trạng thái!");
    }
  };

  // 5. Xóa món
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa món "${name}" khỏi thực đơn?`)) return;
    try {
      await api.delete(`/vendor/menu/${id}`);
      setMenuItems(menuItems.filter(item => item._id !== id));
    } catch (error) {
      alert("Lỗi xóa món!");
    }
  };

  const filteredMenu = menuItems.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-[#F27124]" size={40}/></div>;

  return (
    <div className="animate-in fade-in duration-300">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            <UtensilsCrossed className="text-[#F27124]" /> Quản lý Thực đơn
          </h2>
          <p className="text-sm portal-muted mt-1">Gian hàng của bạn đang có {menuItems.length} món ăn.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input 
              type="text" placeholder="Tìm kiếm món ăn..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
              className="w-full portal-card border-[var(--portal-border)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--portal-text)] focus:border-[#F27124] outline-none"
            />
            <Search className="absolute left-3.5 top-2.5 portal-muted" size={16} />
          </div>
          <button 
            onClick={() => openModal()}
            className="bg-[#F27124] hover:bg-[#D95F1B] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 shrink-0"
          >
            <PlusCircle size={18} /> <span className="hidden sm:inline">Thêm món mới</span>
          </button>
        </div>
      </div>

      {/* DANH SÁCH MÓN ĂN (GRID CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredMenu.map(item => (
          <div key={item._id} className="portal-card border rounded-[1.5rem] border border-[var(--portal-border)] overflow-hidden group hover:border-[var(--portal-border)] transition-all flex flex-col">
            
            {/* Ảnh món ăn */}
            <div className="h-48 bg-[var(--portal-surface)] relative overflow-hidden">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${!item.isAvailable && 'grayscale opacity-50'}`} />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-600"><ImageIcon size={40} /></div>
              )}
              {/* Nút Bật/Tắt nhanh */}
              <button 
                onClick={() => toggleAvailability(item._id, item.isAvailable)}
                className={`absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 backdrop-blur-md border shadow-lg transition-all hover:scale-105 ${
                  item.isAvailable ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/40' : 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/40'
                }`}
              >
                {item.isAvailable ? <><Power size={14}/> Đang bán</> : <><PowerOff size={14}/> Hết hàng</>}
              </button>
            </div>

            {/* Thông tin món */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg line-clamp-1" title={item.name}>{item.name}</h3>
                </div>
                <p className="text-xl font-black text-[#F27124] mb-2">{item.price.toLocaleString()}đ</p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-bold">
                    <Star size={14} className="fill-amber-400" />
                    {item.rating ? item.rating.toFixed(1) : '—'}
                  </span>
                  <span className="portal-muted text-xs font-medium">({item.numReviews || 0} đánh giá)</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="inline-block bg-[var(--portal-surface)] portal-text-secondary text-xs font-medium px-2.5 py-1 rounded-md border border-[var(--portal-border)]">
                    {item.category}
                  </span>
                  {item.calories != null && item.calories > 0 ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-md border border-emerald-500/20">
                      <Flame size={12} /> {item.calories} kcal
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 portal-muted text-xs font-medium px-2 py-1">
                      <Flame size={12} /> Chưa ghi calo
                    </span>
                  )}
                </div>
                {item.reviews?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setReviewsItem(item)}
                    className="w-full mb-3 py-2 rounded-xl text-xs font-bold text-[#F27124] bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare size={14} /> Xem đánh giá SV
                  </button>
                )}
              </div>
              
              <div className="flex gap-2 mt-auto pt-4 border-t border-[var(--portal-border)]">
                <button onClick={() => openModal(item)} className="flex-1 bg-[var(--portal-surface)] hover:bg-blue-500/20 portal-text-secondary hover:text-blue-400 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors border border-[var(--portal-border)] hover:border-blue-500/30">
                  <Edit2 size={16} /> Sửa
                </button>
                <button onClick={() => handleDelete(item._id, item.name)} className="flex-1 bg-[var(--portal-surface)] hover:bg-red-500/20 portal-text-secondary hover:text-red-400 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors border border-[var(--portal-border)] hover:border-red-500/30">
                  <Trash2 size={16} /> Xóa
                </button>
              </div>
            </div>

          </div>
        ))}
        {filteredMenu.length === 0 && (
            <div className="col-span-full py-20 text-center portal-muted portal-card border rounded-3xl border border-dashed border-[var(--portal-border)]">
                <UtensilsCrossed size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Chưa có món ăn nào trong thực đơn.</p>
            </div>
        )}
      </div>

      {/* ================= MODAL THÊM / SỬA MÓN ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="portal-card border rounded-[2rem] border border-[var(--portal-border)] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-6 border-b border-[var(--portal-border)] flex justify-between items-center bg-[var(--portal-table-head)]">
              <h3 className="text-xl font-black">{editingItem ? 'Chỉnh sửa Món ăn' : 'Thêm Món mới'}</h3>
              <button type="button" onClick={closeModal} className="portal-muted hover:text-[var(--portal-text)] p-1 bg-[var(--portal-surface)] rounded-full hover:bg-[var(--portal-surface-hover)] transition-colors"><X size={20}/></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-bold portal-text-secondary ml-1">Tên món ăn <span className="text-red-500">*</span></label>
                  <input type="text" required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-xl px-4 py-3 text-[var(--portal-text)] focus:border-[#F27124] outline-none transition-colors" placeholder="VD: Cơm Tấm Sườn Bì" />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-bold portal-text-secondary ml-1">Giá bán (VNĐ) <span className="text-red-500">*</span></label>
                  <input type="number" required min="0" value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})} className="w-full bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-xl px-4 py-3 text-[var(--portal-text)] focus:border-[#F27124] outline-none transition-colors" placeholder="VD: 35000" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold portal-text-secondary ml-1">Danh mục</label>
                  <select value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-xl px-4 py-3 text-[var(--portal-text)] focus:border-[#F27124] outline-none transition-colors cursor-pointer">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold portal-text-secondary ml-1 flex items-center gap-1.5">
                    <Flame size={14} className="text-emerald-400" /> Calo (kcal)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5000"
                    step="1"
                    value={formData.calories}
                    onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                    className="w-full bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-xl px-4 py-3 text-[var(--portal-text)] focus:border-[#F27124] outline-none transition-colors"
                    placeholder="VD: 450 (để trống nếu chưa rõ)"
                  />
                  <p className="text-[11px] portal-muted ml-1">Giúp sinh viên & SlotAI gợi ý món healthy. Ước lượng 1 phần ăn.</p>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-bold portal-text-secondary ml-1">
                    Ảnh món ăn <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                    <div className="flex-1 border-2 border-dashed border-[var(--portal-border)] rounded-xl p-5 text-center hover:border-[#F27124]/50 hover:bg-orange-500/5 transition-colors relative cursor-pointer min-h-[120px] flex flex-col justify-center">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        onChange={handleImageChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <UploadCloud className="mx-auto portal-muted mb-2" size={28} />
                      <p className="text-sm font-bold portal-text-secondary">Chọn ảnh từ máy tính / điện thoại</p>
                      <p className="text-[11px] portal-muted mt-1">JPG, PNG — tối đa 5MB</p>
                    </div>
                    {(imagePreview || formData.imageUrl) && (
                      <div className="w-full sm:w-28 h-28 rounded-xl overflow-hidden border border-[var(--portal-border)] shrink-0 bg-[var(--portal-surface)]">
                        <img
                          src={imagePreview || formData.imageUrl}
                          alt="Xem trước"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] portal-muted ml-1">Hoặc dán link ảnh có sẵn (nếu không upload file):</p>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => {
                      const url = e.target.value;
                      setFormData({ ...formData, imageUrl: url });
                      if (!imageFile && url.trim()) setImagePreview(url.trim());
                      if (!url.trim() && !imageFile) setImagePreview(null);
                    }}
                    className="w-full bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-xl px-4 py-3 text-[var(--portal-text)] focus:border-[#F27124] outline-none transition-colors text-sm"
                    placeholder="https://... (tùy chọn nếu đã chọn file)"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-bold portal-text-secondary ml-1">Mô tả món ăn</label>
                  <textarea rows="2" value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="w-full bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-xl px-4 py-3 text-[var(--portal-text)] focus:border-[#F27124] outline-none transition-colors resize-none" placeholder="Mô tả ngắn gọn nguyên liệu..."></textarea>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-[var(--portal-border)]">
                <button type="button" onClick={closeModal} className="px-6 py-3 rounded-xl font-bold portal-muted bg-[var(--portal-surface)] hover:bg-[var(--portal-surface-hover)] transition-colors">Hủy</button>
                <button type="submit" disabled={isSubmitting} className="px-8 py-3 rounded-xl font-black bg-[#F27124] hover:bg-[#D95F1B] transition-colors shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center gap-2">
                  {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                  {isSubmitting ? 'Đang tải ảnh & lưu...' : editingItem ? 'Lưu thay đổi' : 'Thêm món'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reviewsItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="portal-card border rounded-[2rem] border border-[var(--portal-border)] w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-[var(--portal-border)] flex justify-between items-start gap-3">
              <div>
                <h3 className="text-lg font-black line-clamp-1">{reviewsItem.name}</h3>
                <p className="text-sm text-amber-400 font-bold mt-1 flex items-center gap-1">
                  <Star size={14} className="fill-amber-400" />
                  {reviewsItem.rating?.toFixed(1) || '0'} · {reviewsItem.numReviews || 0} đánh giá
                </p>
              </div>
              <button type="button" onClick={() => setReviewsItem(null)} className="portal-muted hover:text-[var(--portal-text)] p-1 bg-[var(--portal-surface)] rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3 custom-scrollbar flex-1">
              {[...(reviewsItem.reviews || [])].reverse().map((r, idx) => (
                <div key={r._id || idx} className="bg-[var(--portal-input-bg)] rounded-xl p-4 border border-[var(--portal-border)]">
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={12} className={n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-600'} />
                    ))}
                    <span className="text-sm font-bold ml-2">{r.name || 'Sinh viên'}</span>
                  </div>
                  <p className="text-sm portal-text-secondary leading-relaxed">{r.comment}</p>
                  {r.createdAt && (
                    <p className="text-[10px] portal-muted mt-2">{new Date(r.createdAt).toLocaleString('vi-VN')}</p>
                  )}
                </div>
              ))}
              {(!reviewsItem.reviews || reviewsItem.reviews.length === 0) && (
                <p className="text-center portal-muted py-8">Chưa có đánh giá nào.</p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default VendorMenu;