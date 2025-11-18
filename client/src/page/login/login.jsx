// src/pages/auth/Login.jsx
import React, { useState, useEffect } from "react";
import { Form, Input, Button, message } from "antd";
import { UserOutlined, LockOutlined, LoadingOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api.jsx";

const Login = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Mavjud sessionni tekshirish
        checkExistingSession();
    }, []);

    const checkExistingSession = async () => {
        const sessionId = localStorage.getItem('sessionId');

        if (!sessionId) {
            setCheckingSession(false);
            return;
        }

        try {
            const response = await api.get('/api/auth/me');

            if (response.data.success) {
                // Session hali ham faol, darhol redirect
                const role = response.data.user.role;
                console.log('✅ Faol session topildi, redirect qilinmoqda...');

                if (role === 'admin') {
                    navigate('/admin', { replace: true });
                } else {
                    navigate('/', { replace: true });
                }
            }
        } catch (error) {
            // Session tugagan yoki xato, tozalash
            console.log('❌ Session tugagan, tozalanmoqda...');
            localStorage.removeItem('sessionId');
            localStorage.removeItem('userData');
        } finally {
            setCheckingSession(false);
        }
    };

    const onFinish = async (values) => {
        setLoading(true);

        try {
            console.log('🔐 Login urinishi:', values.username);

            const response = await api.post('/api/auth/login', {
                username: values.username,
                password: values.password
            });

            if (response.data.success) {
                const { sessionId, user } = response.data;

                console.log('✅ Login muvaffaqiyatli:', user.username);

                // Session ID va user ma'lumotlarini saqlash
                localStorage.setItem('sessionId', sessionId);
                localStorage.setItem('userData', JSON.stringify(user));

                // Success message
                message.success(`Xush kelibsiz, ${user.fullName}! 🎉`);

                // Biroz kutish (animatsiya uchun)
                setTimeout(() => {
                    // Role ga qarab yo'naltirish
                    if (user.role === 'admin') {
                        console.log('👨‍💼 Admin panelga yo\'naltirilmoqda...');
                        navigate('/admin', { replace: true });
                    } else {
                        console.log('👤 Bosh sahifaga yo\'naltirilmoqda...');
                        navigate('/', { replace: true });
                    }
                }, 800);
            }

        } catch (error) {
            console.error('❌ Login xato:', error);

            if (error.response) {
                // Server javob berdi lekin xato
                const errorMsg = error.response.data?.error || 'Username yoki password noto\'g\'ri';
                message.error(errorMsg);
            } else if (error.request) {
                // Request yuborildi lekin javob yo'q
                message.error('Serverga ulanib bo\'lmadi. Internetni tekshiring!');
            } else {
                // Boshqa xatolik
                message.error('Xatolik yuz berdi. Qaytadan urinib ko\'ring');
            }
        } finally {
            setLoading(false);
        }
    };

    // Session tekshirilayotganda loading ko'rsatish
    if (checkingSession) {
        return (
            <div
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
            >
                <div style={{ textAlign: 'center', color: '#fff' }}>
                    <LoadingOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <div style={{ fontSize: 16 }}>Tekshirilmoqda...</div>
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
        >
            <div
                style={{
                    maxWidth: 420,
                    width: '100%',
                    margin: '0 20px',
                    padding: 40,
                    borderRadius: 16,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                    background: '#fff',
                }}
            >
                {/* Logo va Title */}
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{ fontSize: 48, marginBottom: 10 }}>🏠</div>
                    <h1 style={{ fontSize: 28, marginBottom: 8, color: '#333', fontWeight: 'bold' }}>
                        Maskan Lux
                    </h1>
                    <p style={{ color: '#888', fontSize: 14 }}>
                        Tizimga kirish
                    </p>
                </div>

                {/* Login Form */}
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    autoComplete="off"
                    size="large"
                >
                    <Form.Item
                        name="username"
                        rules={[
                            { required: true, message: 'Username kiriting!' },
                            { min: 3, message: 'Username kamida 3 ta belgidan iborat bo\'lishi kerak' }
                        ]}
                    >
                        <Input
                            prefix={<UserOutlined style={{ color: '#999' }} />}
                            placeholder="Username"
                            disabled={loading}
                            autoFocus
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[
                            { required: true, message: 'Parol kiriting!' },
                            { min: 3, message: 'Parol kamida 3 ta belgidan iborat bo\'lishi kerak' }
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined style={{ color: '#999' }} />}
                            placeholder="Parol"
                            disabled={loading}
                        />
                    </Form.Item>

                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        block
                        style={{
                            height: 48,
                            fontSize: 16,
                            fontWeight: 'bold',
                            marginTop: 8
                        }}
                    >
                        {loading ? 'Tekshirilmoqda...' : 'Kirish'}
                    </Button>
                </Form>



                {/* Footer */}
                <div style={{
                    marginTop: 20,
                    textAlign: 'center',
                    color: '#999',
                    fontSize: 11
                }}>
                    © 2025 Maskan Lux.
                </div>
            </div>
        </div>
    );
};

export default Login;