import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { UploadCloud, PlusCircle, Store } from 'lucide-react';

const VendorDashboard = () => {
  const { user } = useContext(AuthContext);
  
  // States thông tin quán
  const [myVendor, setMyVendor] = useState(null);
  const [loadingVendor, setLoadingVendor] = useState(true);

  // States lưu thông tin Form Món ăn
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // 1️⃣ TỰ ĐỘNG LẤY GIAN HÀNG CỦA CHỦ QUÁN ĐANG ĐĂNG NHẬP
  useEffect(() => {
    const fetchMyVendor = async () => {
      if (!user || (user.role !== 'vendor' && user.role !== 'admin')) return;
      
      try {
        // Giả sử API /vendors trả về danh sách tất cả các quán
        const res = await api.get('/vendors');
        
        // Tìm quán do user này làm chủ
        const myStall = res.data.find(v => v.owner === user._id);
        
        if (myStall) {
          setMyVendor(myStall);
        }
      } catch (err) {
        console.error("Lỗi tải thông tin gian hàng:", err);
      } finally {
        setLoadingVendor(false);
      }
    };

    fetchMyVendor();
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file)); 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Kiểm tra bảo mật Frontend
    if (user?.role !== 'vendor' && user?.role !== 'admin') {
      return alert('Chỉ chủ quán mới được thêm món ăn!');
    }

    if (!myVendor) {
      return alert('Lỗi: Không tìm thấy gian hàng của bạn trong hệ thống!');
    }

    if (!imageFile) {
      return alert('Vui lòng chọn ảnh cho món ăn!');
    }

    try {
      setIsUploading(true);

      // --- NHỊP 1: GỬI ẢNH LÊN CLOUDINARY ---
      const formData = new FormData();
      formData.append('image', imageFile);

      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const imageUrl = uploadRes.data.imageUrl;

      // --- NHỊP 2: LƯU MÓN ĂN VÀO MONGODB KÈM ID QUÁN ---
      const newItemData = {
        name,
        price: Number(price),
        category: category || 'Đồ ăn',
        imageUrl: imageUrl, 
        vendorId: myVendor._id, // 👈 ĐÂY CHÍNH LÀ ĐIỂM CHUẨN XÁC: Gắn ID của Gian Hàng!
        dailyQuota: 50 
      };

      await api.post('/menuitems', newItemData);
      
      alert('🎉 Thêm món ăn vào quán thành công!');
      
      // Reset Form
      setName('');
      setPrice('');
      setCategory('');
      setImageFile(null);
      setImagePreview(null);
      
    } catch (error) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi thêm món!');
    } finally {
      setIsUploading(false);
    }
  };

  // NẾU KHÔNG PHẢI CHỦ QUÁN (STUDENT)
  if (user?.role === 'student') {
    return (
      <div className="flex h-screen items-center justify-center text-red-500 font-bold bg-[#F9FAFB]">
        ⛔ Khu vực này chỉ dành cho Chủ Gian Hàng SlotHub!
      </div>
    );
  }

  // ĐANG TẢI DỮ LIỆU QUÁN
  if (loadingVendor) return <div className="text-center mt-20 italic">Đang tải thông tin gian hàng của bạn...</div>;

  return (
    <div className="bg-[#F9FAFB] min-h-screen p-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-[2rem] shadow-sm">
        <div className="flex items-center justify-between border-b pb-6 mb-8">
          <div className="flex items-center gap-3">
            <PlusCircle className="text-[#F27124]" size={32} />
            <h2 className="text-2xl font-extrabold text-gray-800">Thêm Món Mới</h2>
          </div>
          
          {/* HIỂN THỊ TÊN QUÁN ĐỂ CHỦ QUÁN YÊN TÂM */}
          {myVendor ? (
            <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-xl text-[#F27124] font-bold">
              <Store size={18} /> Quản lý: {myVendor.name}
            </div>
          ) : (
             <div className="text-red-500 text-sm font-bold bg-red-50 px-4 py-2 rounded-xl">
               ⚠️ Tài khoản chưa được cấp gian hàng
             </div>
          )}
        </div>
        
        {/* Phần FORM giống y hệt như cũ, mình đã rút gọn bớt mã HTML ở đây để bạn dễ nhìn */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Các input name, price, category... */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700">Tên món ăn</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="VD: Bún chả FPT" className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-[#F27124]" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700">Giá bán (VNĐ)</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required min="0" placeholder="VD: 35000" className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-[#F27124]" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700">Danh mục</label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} required placeholder="VD: Đồ ăn, Đồ uống..." className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-[#F27124]" />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700">Hình ảnh món ăn</label>
            <div className="flex items-center gap-6">
              <div className="flex-1 border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:bg-orange-50 transition-colors relative cursor-pointer">
                <input type="file" accept="image/*" onChange={handleImageChange} required className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <UploadCloud className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-sm text-gray-500 font-medium">Bấm vào đây để chọn ảnh</p>
              </div>

              {imagePreview && (
                <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-sm shrink-0">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          <button type="submit" disabled={isUploading || !myVendor} className="w-full bg-[#F27124] text-white py-4 rounded-2xl font-black shadow-lg disabled:bg-gray-300">
            {isUploading ? 'ĐANG TẢI ẢNH VÀ DỮ LIỆU...' : 'THÊM MÓN ĂN'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VendorDashboard;