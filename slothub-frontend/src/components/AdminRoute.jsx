import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AdminRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) return null; 

    if (!user) return <Navigate to="/login" />;

    if (user.role !== 'admin') {
        alert("⛔ Bạn không có quyền truy cập khu vực này!");
        return <Navigate to="/" />;
    }

    return children;
};

export default AdminRoute;