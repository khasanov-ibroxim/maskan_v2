// client/src/pages/admin/AdminPanel.jsx
import React, {useEffect, useState, useCallback, useRef} from 'react';
import {
    Card, Table, Button, Modal, Form, Input, Select, message, Tabs, Tag, Space,
    Popconfirm, Statistic, Row, Col, Alert
} from 'antd';
import {
    UserOutlined, PlusOutlined, DeleteOutlined, CheckCircleOutlined,
    ReloadOutlined, DownloadOutlined, EditOutlined, HomeOutlined
} from '@ant-design/icons';
import api from '../../utils/api.jsx';
import ObjectsList from '../../components/ObjectsList.jsx';

const {Option} = Select;
const {TabPane} = Tabs;

const AdminPanel = () => {
    const [users, setUsers] = useState([]);
    const [activeSessions, setActiveSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedRole, setSelectedRole] = useState('user');
    const [editingUser, setEditingUser] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();

    // ✅ Interval ref (cleanup uchun)
    const intervalRef = useRef(null);

    // ✅ useCallback bilan loadUsers - faqat 1 marta yaratiladi
    const loadUsers = useCallback(async (showMessage = false) => {
        setLoading(true);
        try {
            const [usersRes, sessionsRes] = await Promise.all([
                api.get('/api/users/users'),
                api.get('/api/users/sessions/active')
            ]);

            if (usersRes.data.success) setUsers(usersRes.data.users);
            if (sessionsRes.data.success) setActiveSessions(sessionsRes.data.sessions);

            setLastUpdate(new Date());

            // ✅ Faqat manual refresh'da message ko'rsatish
            if (showMessage) {
                message.success('Ma\'lumotlar yangilandi');
            }
        } catch (error) {
            console.error('Ma\'lumot yuklashda xato:', error);
            if (showMessage) {
                message.error('Ma\'lumotlarni yuklashda xato');
            }
        } finally {
            setLoading(false);
        }
    }, []); // ✅ Dependencies bo'sh - funksiya o'zgarmaydi

    // ✅ Component mount bo'lganda - faqat 1 marta
    useEffect(() => {
        console.log('🚀 AdminPanel mounted - loading initial data');
        loadUsers(false);

        // ✅ 10 minutda 1 marta yangilash (600000ms = 10 min)
        intervalRef.current = setInterval(() => {
            console.log('🔄 Auto-refresh (10 min interval)');
            loadUsers(false);
        }, 600000); // 10 minut

        // ✅ Cleanup - component unmount bo'lganda
        return () => {
            console.log('🧹 Cleaning up interval');
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [loadUsers]); // ✅ loadUsers dependency (useCallback orqali stable)

    // ✅ Manual refresh handler
    const handleManualRefresh = () => {
        console.log('🔄 Manual refresh triggered');
        loadUsers(true);
    };

    const handleCreateUser = async (values) => {
        try {
            const response = await api.post('/api/users/users', values);
            if (response.data.success) {
                message.success('User yaratildi! 🎉');
                setModalVisible(false);
                form.resetFields();
                setSelectedRole('user');

                // ✅ Optimistic update - serverga qayta zapros yo'q
                setUsers(prev => [...prev, response.data.user]);

                // ✅ Agar zarur bo'lsa - faqat sessions'ni yangilash
                const sessionsRes = await api.get('/api/users/sessions/active');
                if (sessionsRes.data.success) {
                    setActiveSessions(sessionsRes.data.sessions);
                }
            }
        } catch (error) {
            console.error('User yaratishda xato:', error);
            message.error(error.response?.data?.error || 'User yaratishda xato');
        }
    };

    const handleDeleteUser = async (userId) => {
        try {
            const response = await api.delete(`/api/users/users/${userId}`);
            if (response.data.success) {
                message.success('User o\'chirildi');

                // ✅ Optimistic update
                setUsers(prev => prev.filter(u => u.id !== userId));
                setActiveSessions(prev => prev.filter(s => s.userId !== userId));
            }
        } catch (error) {
            console.error('User o\'chirishda xato:', error);
            message.error(error.response?.data?.error || 'Xato');

            // ✅ Xato bo'lsa - qayta yuklash
            loadUsers(false);
        }
    };

    const handleEditUser = (user) => {
        setEditingUser(user);
        editForm.setFieldsValue({
            username: user.username,
            fullName: user.fullName,
            role: user.role,
            appScriptUrl: user.appScriptUrl || '',
            telegramThemeId: user.telegramThemeId || ''
        });
        setSelectedRole(user.role);
        setEditModalVisible(true);
    };

    const handleUpdateUser = async (values) => {
        try {
            if (!values.password) delete values.password;

            const response = await api.put(`/api/users/users/${editingUser.id}`, values);

            if (response.data.success) {
                message.success('User yangilandi! ✅');
                setEditModalVisible(false);
                editForm.resetFields();
                setEditingUser(null);
                setSelectedRole('user');

                // ✅ Optimistic update
                setUsers(prev => prev.map(u =>
                    u.id === editingUser.id ? { ...u, ...values } : u
                ));
            }
        } catch (error) {
            console.error('User yangilashda xato:', error);
            message.error(error.response?.data?.error || 'Xato');

            // ✅ Xato bo'lsa - qayta yuklash
            loadUsers(false);
        }
    };

    const handleDownloadBackup = async () => {
        try {
            message.loading('Excel backup yuklanmoqda...', 0);
            const response = await api.get('/api/excel/export', {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `backup_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            message.destroy();
            message.success('Backup yuklandi!');
        } catch (error) {
            message.destroy();
            console.error('Backup yuklashda xato:', error);
            message.error('Xato');
        }
    };

    const stats = {
        totalUsers: users.length,
        activeUsers: activeSessions.length,
        realtors: users.filter(u => u.role === 'rieltor').length
    };

    const userColumns = [
        {
            title: 'Username',
            dataIndex: 'username',
            key: 'username',
            width: 120,
            fixed: 'left'
        },
        {
            title: 'To\'liq ism',
            dataIndex: 'fullName',
            key: 'fullName',
            width: 150
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            width: 100,
            render: (role) => {
                const config = {
                    admin: { color: 'red', icon: '👑' },
                    rieltor: { color: 'blue', icon: '🏠' },
                    user: { color: 'green', icon: '👤' }
                };
                const c = config[role] || config.user;
                return <Tag color={c.color}>{c.icon} {role.toUpperCase()}</Tag>;
            }
        },
        {
            title: 'Status',
            key: 'status',
            width: 100,
            render: (_, record) => {
                const isOnline = activeSessions.some(s => s.userId === record.id);
                return (
                    <Tag color={isOnline ? 'green' : 'default'}
                         icon={isOnline ? <CheckCircleOutlined/> : null}>
                        {isOnline ? 'Online' : 'Offline'}
                    </Tag>
                );
            }
        },
        {
            title: 'Amallar',
            key: 'actions',
            width: 200,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="primary"
                        size="small"
                        icon={<EditOutlined/>}
                        onClick={() => handleEditUser(record)}
                        disabled={record.role === 'admin'}
                    >
                        Tahrirlash
                    </Button>
                    <Popconfirm
                        title="O'chirmoqchimisiz?"
                        onConfirm={() => handleDeleteUser(record.id)}
                        okText="Ha"
                        cancelText="Yo'q"
                        disabled={record.role === 'admin'}
                    >
                        <Button
                            type="primary"
                            danger
                            size="small"
                            icon={<DeleteOutlined/>}
                            disabled={record.role === 'admin'}
                        >
                            O'chirish
                        </Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div style={{padding: 24, background: '#f0f2f5', minHeight: 'calc(100vh - 64px)'}}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{fontSize: 28, margin: 0}}>👨‍💼 Admin Panel</h1>

                {/* ✅ Last update timestamp */}
                {lastUpdate && (
                    <Tag color="blue">
                        Oxirgi yangilanish: {lastUpdate.toLocaleTimeString('uz-UZ')}
                    </Tag>
                )}
            </div>

            <Row gutter={16} style={{marginBottom: 24}}>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Jami Userlar"
                            value={stats.totalUsers}
                            prefix={<UserOutlined/>}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Online"
                            value={stats.activeUsers}
                            prefix={<CheckCircleOutlined/>}
                            valueStyle={{color: '#3f8600'}}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Rieltor"
                            value={stats.realtors}
                            prefix={<HomeOutlined/>}
                        />
                    </Card>
                </Col>
            </Row>

            <Tabs defaultActiveKey="objects" type="card">
                <TabPane tab={<span><HomeOutlined /> Obyektlar</span>} key="objects">
                    <Card>
                        <ObjectsList />
                    </Card>
                </TabPane>

                <TabPane tab={<span><UserOutlined /> Foydalanuvchilar</span>} key="users">
                    <Card>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 16
                        }}>
                            <Space>
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined/>}
                                    onClick={() => setModalVisible(true)}
                                >
                                    Yangi User
                                </Button>
                                <Button
                                    icon={<ReloadOutlined/>}
                                    onClick={handleManualRefresh}
                                    loading={loading}
                                >
                                    Yangilash
                                </Button>
                                <Button
                                    type="default"
                                    icon={<DownloadOutlined/>}
                                    onClick={handleDownloadBackup}
                                >
                                    Excel Backup
                                </Button>
                            </Space>

                            {/* ✅ Auto-refresh info */}
                            <Tag icon={<ReloadOutlined />} color="processing">
                                Avtomatik yangilanish: har 10 daqiqada
                            </Tag>
                        </div>

                        <Table
                            columns={userColumns}
                            dataSource={users}
                            rowKey="id"
                            loading={loading}
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: true,
                                showQuickJumper: true,
                                showTotal: (total) => `Jami: ${total}`
                            }}
                            scroll={{x: 900}}
                        />
                    </Card>
                </TabPane>
            </Tabs>

            {/* Create User Modal */}
            <Modal
                title="🆕 Yangi User"
                open={modalVisible}
                onCancel={() => {
                    setModalVisible(false);
                    form.resetFields();
                    setSelectedRole('user');
                }}
                footer={null}
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleCreateUser}>
                    <Form.Item name="username" label="Username" rules={[
                        { required: true, message: 'Username kiriting!' },
                        { min: 3, message: 'Kamida 3 ta belgi' }
                    ]}>
                        <Input placeholder="john_doe" />
                    </Form.Item>

                    <Form.Item name="password" label="Parol" rules={[
                        { required: true, message: 'Parol kiriting!' },
                        { min: 5, message: 'Kamida 5 ta belgi' }
                    ]}>
                        <Input.Password placeholder="Kamida 5 ta belgi" />
                    </Form.Item>

                    <Form.Item name="fullName" label="To'liq ism" rules={[
                        { required: true, message: 'Ism kiriting!' }
                    ]}>
                        <Input placeholder="John Doe" />
                    </Form.Item>

                    <Form.Item name="role" label="Role" rules={[
                        { required: true }
                    ]} initialValue="user">
                        <Select onChange={setSelectedRole}>
                            <Option value="user">👤 User</Option>
                            <Option value="rieltor">🏠 Rieltor</Option>
                            <Option value="admin">👑 Admin</Option>
                        </Select>
                    </Form.Item>

                    {selectedRole === 'rieltor' && (
                        <>
                            <Form.Item name="appScriptUrl" label="App Script URL" rules={[
                                { required: true, type: 'url' }
                            ]}>
                                <Input placeholder="https://script.google.com/..." />
                            </Form.Item>

                            <Form.Item name="telegramThemeId" label="Telegram Theme ID" rules={[
                                { required: true }
                            ]}>
                                <Input placeholder="65" type="number" />
                            </Form.Item>
                        </>
                    )}

                    <Form.Item>
                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button onClick={() => {
                                setModalVisible(false);
                                form.resetFields();
                            }}>
                                Bekor qilish
                            </Button>
                            <Button type="primary" htmlType="submit">
                                Yaratish
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Edit User Modal */}
            <Modal
                title="✏️ User Tahrirlash"
                open={editModalVisible}
                onCancel={() => {
                    setEditModalVisible(false);
                    editForm.resetFields();
                    setEditingUser(null);
                }}
                footer={null}
                width={600}
            >
                <Form form={editForm} layout="vertical" onFinish={handleUpdateUser}>
                    <Alert
                        message="Parol bo'sh qoldirsangiz o'zgartirilmaydi"
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />

                    <Form.Item name="username" label="Username" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>

                    <Form.Item name="password" label="Yangi parol (ixtiyoriy)">
                        <Input.Password />
                    </Form.Item>

                    <Form.Item name="fullName" label="To'liq ism" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>

                    <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                        <Select onChange={setSelectedRole}>
                            <Option value="user">👤 User</Option>
                            <Option value="rieltor">🏠 Rieltor</Option>
                            <Option value="admin">👑 Admin</Option>
                        </Select>
                    </Form.Item>

                    {selectedRole === 'rieltor' && (
                        <>
                            <Form.Item name="appScriptUrl" label="App Script URL" rules={[
                                { required: true, type: 'url' }
                            ]}>
                                <Input />
                            </Form.Item>

                            <Form.Item name="telegramThemeId" label="Telegram Theme ID" rules={[
                                { required: true }
                            ]}>
                                <Input type="number" />
                            </Form.Item>
                        </>
                    )}

                    <Form.Item>
                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button onClick={() => {
                                setEditModalVisible(false);
                                editForm.resetFields();
                            }}>
                                Bekor qilish
                            </Button>
                            <Button type="primary" htmlType="submit">
                                Yangilash
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

export default AdminPanel;
