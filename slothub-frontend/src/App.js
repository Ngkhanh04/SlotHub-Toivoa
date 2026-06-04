import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { LocaleProvider } from './context/LocaleContext';
import { GoogleOAuthProvider } from '@react-oauth/google'; 
import './App.css'; 
import './index.css'; 

// ================= IMPORT CÁC TRANG (PAGES) =================
// Dành cho Sinh viên
import Home from './pages/Home';
import Orders from './pages/Orders';
import Checkout from './pages/Checkout'; 
import Login from './pages/Login';
import FoodDetail from './pages/FoodDetail'; 
import PaymentResult from './pages/PaymentResult'; 
import Profile from './pages/Profile';
import StudentMessages from './pages/StudentMessages';
import ChatWidget from './components/ChatWidget';

// Dành cho Admin & Vendor
import AdminRoute from './components/AdminRoute';
import AdminPage from './pages/admin/AdminPage';
import VendorPage from './pages/vendor/VendorPage'; // 🌟 Đã trỏ đúng vào bộ khung Vendor mới

// ========================================================
// 🌟 ĐIỀU HƯỚNG TỐI ƯU: Chia luồng ngay từ cửa theo Role
// ========================================================
const InitialRoute = () => {
  const { user, loading } = useContext(AuthContext);
  const token = localStorage.getItem('token');

  // Nếu Context đang tải thông tin User, hiện màn hình chờ mượt mà
  if (loading) {
     return (
       <div className="flex h-screen w-full items-center justify-center bg-[#F9FAFB]">
         <div className="w-12 h-12 border-4 border-[#F27124] border-t-transparent rounded-full animate-spin"></div>
       </div>
     );
  }

  // Chưa đăng nhập -> Đá ra Login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Đã đăng nhập -> Phân luồng về đúng "nhà" của từng người
  if (user.role === 'admin') {
     return <Navigate to="/admin" replace />;
  }
  if (user.role === 'vendor' || user.role === 'vendor_owner') {
     return <Navigate to="/vendor" replace />;
  }

  // Mặc định là Sinh viên thì cho vào Trang chủ đặt cơm
  return <Home />;
};

// ========================================================
// 🌟 BẬT/TẮT AI CHATBOT THÔNG MINH
// ========================================================
const ConditionalChatWidget = () => {
  const { user } = useContext(AuthContext);
  
  // Chỉ sinh viên mới được chat với AI
  if (user && user.role === 'student') {
    return <ChatWidget />;
  }
  
  // Admin, Vendor không bị vướng tầm nhìn
  return null;
};

function App() {
  return (
    <GoogleOAuthProvider clientId="483860874151-m5oqomh1pca4v1is782d602827egm321.apps.googleusercontent.com">
      <AuthProvider>
        <LocaleProvider>
        <Router>
          <div className="App font-sans bg-[#F9FAFB] min-h-screen relative">
            <Routes>
              {/* Trang chủ - Chứa bộ lọc điều hướng thông minh */}
              <Route path="/" element={<InitialRoute />} />
              
              {/* CÁC ROUTE CHUNG & SINH VIÊN */}
              <Route path="/login" element={<Login />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/product/:id" element={<FoodDetail />} />
              <Route path="/payment-result" element={<PaymentResult />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/messages" element={<StudentMessages />} />
              
              {/* 🌟 ROUTE DÀNH CHO NGƯỜI BÁN (VENDOR) */}
              <Route path="/vendor/*" element={<VendorPage />} />
              
              {/* 🌟 ROUTE BẢO MẬT DÀNH RIÊNG CHO ADMIN */}
              <Route 
                path="/admin/*" 
                element={
                  <AdminRoute>
                    <AdminPage />
                  </AdminRoute>
                } 
              />

              {/* Bắt lỗi 404: Gõ link bậy bạ tự động đá về trang chủ để phân luồng lại */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
            
            {/* Widget AI nằm lơ lửng góc dưới (Đã set điều kiện chỉ hiện cho Sinh viên) */}
            <ConditionalChatWidget />
            
          </div>
        </Router>
        </LocaleProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;