import React, { useState, useEffect } from 'react';
import { Button, message, Dropdown, Space, Avatar, Tag } from 'antd';
import {
    LogoutOutlined,
    UserOutlined,
    HomeOutlined,
    SettingOutlined,
    DashboardOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [userData, setUserData] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const data = localStorage.getItem('userData');
        if (data) {
            setUserData(JSON.parse(data));
        }
    }, []);

    const handleLogout = async () => {
        setLoading(true);
        try {
            await api.post('/api/auth/logout');

            localStorage.removeItem('sessionId');
            localStorage.removeItem('userData');

            message.success('Tizimdan chiqdingiz');
            navigate('/login');
        } catch (error) {
            console.error('Logout xato:', error);

            // Xato bo'lsa ham logout qil
            localStorage.removeItem('sessionId');
            localStorage.removeItem('userData');
            navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    const menuItems = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Profil',
            disabled: true
        },
        {
            type: 'divider'
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Chiqish',
            danger: true,
            onClick: handleLogout
        }
    ];

    const getRoleColor = (role) => {
        switch (role) {
            case 'admin': return 'red';
            case 'rieltor': return 'blue';
            default: return 'green';
        }
    };

    const getRoleText = (role) => {
        switch (role) {
            case 'admin': return 'Admin';
            case 'rieltor': return 'Rieltor';
            default: return 'User';
        }
    };

    return (
        <div style={{
            padding: '16px 24px',
            background: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent:"space-between", gap: 16 }}>

                {userData.role === 'admin' && <Space size={8}>
                    <Button
                        type={location.pathname === '/' ? 'primary' : 'default'}
                        icon={<HomeOutlined />}
                        onClick={() => navigate('/')}
                    >
                        Asosiy
                    </Button>

                    {userData.role === 'admin' && (
                        <Button
                            type={location.pathname === '/admin' ? 'primary' : 'default'}
                            icon={<DashboardOutlined />}
                            onClick={() => navigate('/admin')}
                        >
                            Admin Panel
                        </Button>
                    )}
                </Space>}

            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent:"space-between", width:"100%", gap: 12 }}>
                <Dropdown menu={{ items: menuItems }} placement="bottomRight">
                    <Space style={{ cursor: 'pointer' }}>
                        <Avatar
                            size={36}
                            icon={<UserOutlined />}
                            style={{
                                background: userData.role === 'admin' ? '#ff4d4f' : '#1677ff'
                            }}
                        />
                        <div>
                            <div style={{ fontWeight: 500 }}>
                                {userData.fullName || 'User'}
                            </div>
                            <Tag
                                color={getRoleColor(userData.role)}
                                style={{ fontSize: 10, margin: 0 }}
                            >
                                {getRoleText(userData.role)}
                            </Tag>
                        </div>
                    </Space>
                </Dropdown>

                <Button
                    type="primary"
                    danger
                    icon={<LogoutOutlined />}
                    loading={loading}
                    onClick={handleLogout}
                >
                    Chiqish
                </Button>
            </div>
        </div>
    );
};

export default Header;