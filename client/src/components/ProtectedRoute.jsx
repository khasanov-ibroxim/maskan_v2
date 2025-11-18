// src/components/ProtectedRoute.jsx
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import api from '../utils/api';

const ProtectedRoute = ({ children, requiredRole = null }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const sessionId = localStorage.getItem('sessionId');

        // SessionId yo'q bo'lsa, darhol redirect
        if (!sessionId) {
            console.log('❌ SessionId topilmadi, login sahifasiga yo\'naltirilmoqda...');
            setIsAuthenticated(false);
            setLoading(false);
            return;
        }

        try {
            console.log('🔍 Session tekshirilmoqda...');

            // Timeout bilan request (5 soniya)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                console.log('⏱️ Request timeout (5s)');
            }, 5000);

            const response = await api.get('/api/auth/me', {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.data.success) {
                console.log('✅ Auth muvaffaqiyatli:', response.data.user.username);

                setIsAuthenticated(true);
                setUserRole(response.data.user.role);

                // User ma'lumotlarini yangilash
                localStorage.setItem('userData', JSON.stringify(response.data.user));
            } else {
                throw new Error('Auth failed');
            }
        } catch (error) {
            console.error('❌ Auth check xato:', error.message);

            // Xatolik yuz bersa, sessionni tozalash
            localStorage.removeItem('sessionId');
            localStorage.removeItem('userData');
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };

    // Loading holatida
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: '#f0f2f5'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <Spin
                        indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
                        size="large"
                    />
                    <div style={{
                        marginTop: 16,
                        color: '#666',
                        fontSize: 16
                    }}>
                        Yuklanmoqda...
                    </div>
                    <div style={{
                        marginTop: 8,
                        color: '#999',
                        fontSize: 12
                    }}>
                        Iltimos kuting
                    </div>
                </div>
            </div>
        );
    }

    // Autentifikatsiya qilinmagan
    if (!isAuthenticated) {
        console.log('🔒 Auth muvaffaqiyatsiz, login sahifasiga redirect...');
        return <Navigate to="/login" replace />;
    }

    // Role tekshirish
    if (requiredRole && userRole !== requiredRole) {
        console.log(`⛔ Ruxsat yo'q. Talab qilingan role: ${requiredRole}, User role: ${userRole}`);
        return <Navigate to="/" replace />;
    }

    console.log('✅ Access ruxsat berildi');
    return children;
};

export default ProtectedRoute;