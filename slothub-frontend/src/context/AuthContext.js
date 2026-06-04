import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [balance, setBalance] = useState(0);
    
    // 🌟 KHỞI TẠO USER TỪ LOCALSTORAGE (GIÚP F5 KHÔNG BỊ VĂNG)
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const fetchBalance = useCallback(async () => {
        try {
            const res = await api.get('/auth/profile'); 
            setBalance(res.data.walletBalance);
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data)); // Đồng bộ lại localStorage
        } catch (err) {
            console.error("Không lấy được số dư ví:", err);
        }
    }, []);

    // 🌟 HÀM ĐĂNG XUẤT CHUẨN MỰC
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        window.location.href = '/login';
    };

    useEffect(() => {
        // Chỉ gọi fetchBalance nếu đã có token (đã đăng nhập)
        if(localStorage.getItem('token')){
            fetchBalance();
        }
    }, [fetchBalance]);

    return (
        <AuthContext.Provider value={{ balance, setBalance, fetchBalance, user, setUser, logout }}>
            {children}
        </AuthContext.Provider>
    );
};