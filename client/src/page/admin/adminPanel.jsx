import React, {useEffect, useState} from 'react';
import {
    Card, Table, Button, Modal, Form, Input, Select, message, Tabs, Tag, Space,
    Popconfirm, Statistic, Row, Col, Alert, Tooltip
} from 'antd';
import {
    UserOutlined, ClockCircleOutlined, HistoryOutlined, PlusOutlined,
    DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined,
    LinkOutlined, MessageOutlined, InfoCircleOutlined, DownloadOutlined, EditOutlined
} from '@ant-design/icons';
import api from '../../utils/api.jsx';
import Header from "../../components/Header.jsx";

const {Option} = Select;
const {TabPane} = Tabs;

const AdminPanel = () => {
    const [users, setUsers] = useState([]);
    const [activeSessions, setActiveSessions] = useState([]);
    const [sessionHistory, setSessionHistory] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedRole, setSelectedRole] = useState('user');
    const [editingUser, setEditingUser] = useState(null);
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();

    useEffect(() => {
        loadData();
        const interval = setInterval(() => {
            loadActiveSessions();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadUsers(),
                loadActiveSessions(),
                loadSessionHistory(),
                loadActivityLogs()
            ]);
            message.success('Ma\'lumotlar yangilandi');
        } catch (error) {
            console.error('Ma\'lumot yuklashda xato:', error);
            message.error('Ma\'lumotlarni yuklashda xato');
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        try {
            const response = await api.get('/api/users/users');
            if (response.data.success) {
                setUsers(response.data.users);
            }
        } catch (error) {
            console.error('Userlarni yuklashda xato:', error);
            message.error('Userlarni yuklashda xato');
        }
    };

    const loadActiveSessions = async () => {
        try {
            const response = await api.get('/api/users/sessions/active');
            if (response.data.success) {
                setActiveSessions(response.data.sessions);
            }
        } catch (error) {
            console.error('Aktiv sesiyalarni yuklashda xato:', error);
        }
    };

    const loadSessionHistory = async () => {
        try {
            const response = await api.get('/api/users/sessions/history');
            if (response.data.success) {
                setSessionHistory(response.data.sessions);
            }
        } catch (error) {
            console.error('Sesiya tarixini yuklashda xato:', error);
        }
    };

    const loadActivityLogs = async () => {
        try {
            const response = await api.get('/api/users/logs?limit=100');
            if (response.data.success) {
                setActivityLogs(response.data.logs);
            }
        } catch (error) {
            console.error('Loglarni yuklashda xato:', error);
        }
    };

    const handleCreateUser = async (values) => {
        try {
            const response = await api.post('/api/users/users', values);
            if (response.data.success) {
                message.success('User muvaffaqiyatli yaratildi! 🎉');
                setModalVisible(false);
                form.resetFields();
                setSelectedRole('user');
                await loadUsers();
                await loadActivityLogs();
            }
        } catch (error) {
            console.error('User yaratishda xato:', error);
            const errorMsg = error.response?.data?.error || 'User yaratishda xato';
            message.error(errorMsg);
        }
    };

    const handleDeleteUser = async (userId) => {
        try {
            const response = await api.delete(`/api/users/users/${userId}`);
            if (response.data.success) {
                message.success('User muvaffaqiyatli o\'chirildi');
                await loadUsers();
                await loadActivityLogs();
            }
        } catch (error) {
            console.error('User o\'chirishda xato:', error);
            const errorMsg = error.response?.data?.error || 'User o\'chirishda xato';
            message.error(errorMsg);
        }
    };

    const handleEditUser = (user) => {
        console.log('✏️ User tahrirlanmoqda:', user);
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
            if (!values.password) {
                delete values.password;
            }

            const response = await api.put(`/api/users/users/${editingUser.id}`, values);

            if (response.data.success) {
                message.success('User muvaffaqiyatli yangilandi! ✅');
                setEditModalVisible(false);
                editForm.resetFields();
                setEditingUser(null);
                setSelectedRole('user');
                await loadUsers();
                await loadActivityLogs();
            }
        } catch (error) {
            console.error('User yangilashda xato:', error);
            const errorMsg = error.response?.data?.error || 'User yangilashda xato';
            message.error(errorMsg);
        }
    };

    const handleDownloadBackup = async () => {
        try {
            message.loading('Excel backup yuklanmoqda...', 0);
            const response = await api.get('/api/excel/download-backup', {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `backup_database_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            message.destroy();
            message.success('Backup muvaffaqiyatli yuklandi!');
        } catch (error) {
            message.destroy();
            console.error('Backup yuklashda xato:', error);
            message.error('Backup yuklashda xato');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('uz-UZ', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const stats = {
        totalUsers: users.length,
        activeUsers: activeSessions.length,
        realtors: users.filter(u => u.role === 'rieltor').length,
        managers: users.filter(u => u.role === 'manager').length,
        todayLogins: activityLogs.filter(log => {
            const today = new Date().toDateString();
            return log.action === 'login' && new Date(log.timestamp).toDateString() === today;
        }).length
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
                const roleConfig = {
                    admin: { color: 'red', icon: '👑' },
                    manager: { color: 'purple', icon: '🔧' },
                    rieltor: { color: 'blue', icon: '🏠' },
                    user: { color: 'green', icon: '👤' }
                };
                const config = roleConfig[role] || roleConfig.user;
                return (
                    <Tag color={config.color}>
                        {config.icon} {role.toUpperCase()}
                    </Tag>
                );
            }
        },
        {
            title: 'App Script',
            key: 'appScript',
            width: 120,
            render: (_, record) => {
                if (record.role === 'rieltor' && record.appScriptUrl) {
                    return (
                        <Tooltip title={record.appScriptUrl}>
                            <Tag color="cyan" icon={<LinkOutlined />}>
                                Mavjud
                            </Tag>
                        </Tooltip>
                    );
                }
                return '-';
            }
        },
        {
            title: 'Telegram',
            key: 'telegram',
            width: 100,
            render: (_, record) => {
                if (record.role === 'rieltor' && record.telegramThemeId) {
                    return (
                        <Tag color="green" icon={<MessageOutlined />}>
                            {record.telegramThemeId}
                        </Tag>
                    );
                }
                return '-';
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
                         icon={isOnline ? <CheckCircleOutlined/> : <CloseCircleOutlined/>}>
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
                        title="Userni o'chirmoqchimisiz?"
                        description="Bu amalni qaytarib bo'lmaydi!"
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
        <>
            <div style={{padding: 24, background: '#f0f2f5', minHeight: 'calc(100vh - 64px)'}}>
                <div style={{marginBottom: 24}}>
                    <h1 style={{fontSize: 28, marginBottom: 8}}>👨‍💼 Admin Panel</h1>
                    <p style={{color: '#666'}}>Foydalanuvchilar va tizim faoliyatini boshqarish</p>
                </div>

                <Row gutter={16} style={{marginBottom: 24}}>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Jami Userlar"
                                value={stats.totalUsers}
                                prefix={<UserOutlined/>}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Online"
                                value={stats.activeUsers}
                                prefix={<CheckCircleOutlined/>}
                                valueStyle={{color: '#3f8600'}}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Rieltor / Manager"
                                value={`${stats.realtors} / ${stats.managers}`}
                                prefix="🏠"
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Bugungi Loginlar"
                                value={stats.todayLogins}
                                prefix={<HistoryOutlined/>}
                            />
                        </Card>
                    </Col>
                </Row>

                <Card>
                    <Space style={{marginBottom: 16}}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined/>}
                            onClick={() => setModalVisible(true)}
                        >
                            Yangi User
                        </Button>
                        <Button
                            icon={<ReloadOutlined/>}
                            onClick={loadUsers}
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

                    <Table
                        columns={userColumns}
                        dataSource={users}
                        rowKey="id"
                        loading={loading}
                        pagination={{pageSize: 10}}
                        scroll={{x: 1400}}
                    />
                </Card>

                {/* Create User Modal */}
                <Modal
                    title="🆕 Yangi User Yaratish"
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
                            { min: 3, message: 'Kamida 3 ta belgi' },
                            { pattern: /^[a-zA-Z0-9_]+$/, message: 'Faqat harflar, raqamlar va _' }
                        ]}>
                            <Input placeholder="john_doe" prefix={<UserOutlined />} />
                        </Form.Item>

                        <Form.Item name="password" label="Parol" rules={[
                            { required: true, message: 'Parol kiriting!' },
                            { min: 5, message: 'Kamida 5 ta belgi' }
                        ]}>
                            <Input.Password placeholder="Kamida 5 ta belgi" />
                        </Form.Item>

                        <Form.Item name="fullName" label="To'liq ism" rules={[
                            { required: true, message: 'To\'liq ism kiriting!' },
                            { min: 3, message: 'Kamida 3 ta belgi' }
                        ]}>
                            <Input placeholder="John Doe" />
                        </Form.Item>

                        <Form.Item name="role" label="Role" rules={[
                            { required: true, message: 'Role tanlang!' }
                        ]} initialValue="user">
                            <Select onChange={setSelectedRole}>
                                <Option value="user">👤 User</Option>
                                <Option value="rieltor">🏠 Rieltor</Option>
                                <Option value="manager">🔧 Manager</Option>
                                <Option value="admin">👑 Admin</Option>
                            </Select>
                        </Form.Item>

                        {selectedRole === 'rieltor' && (
                            <>
                                <Alert
                                    message="Rieltor uchun qo'shimcha ma'lumotlar"
                                    type="info"
                                    icon={<InfoCircleOutlined />}
                                    style={{ marginBottom: 16 }}
                                />

                                <Form.Item name="appScriptUrl" label="App Script URL" rules={[
                                    { required: true, message: 'URL kiriting!' },
                                    { type: 'url', message: 'To\'g\'ri URL formati!' }
                                ]}>
                                    <Input placeholder="https://script.google.com/..." prefix={<LinkOutlined />} />
                                </Form.Item>

                                <Form.Item name="telegramThemeId" label="Telegram Theme ID" rules={[
                                    { required: true, message: 'Theme ID kiriting!' },
                                    { pattern: /^\d+$/, message: 'Faqat raqam!' }
                                ]}>
                                    <Input placeholder="65" prefix={<MessageOutlined />} type="number" />
                                </Form.Item>
                            </>
                        )}

                        <Form.Item style={{ marginTop: 24 }}>
                            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                                <Button onClick={() => {
                                    setModalVisible(false);
                                    form.resetFields();
                                    setSelectedRole('user');
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
                        setSelectedRole('user');
                    }}
                    footer={null}
                    width={600}
                >
                    <Form form={editForm} layout="vertical" onFinish={handleUpdateUser}>
                        <Alert
                            message="Diqqat!"
                            description="Parol maydonini bo'sh qoldirsangiz, parol o'zgartirilmaydi"
                            type="warning"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />

                        <Form.Item name="username" label="Username" rules={[
                            { required: true, message: 'Username kiriting!' },
                            { min: 3, message: 'Kamida 3 ta belgi' }
                        ]}>
                            <Input placeholder="john_doe" prefix={<UserOutlined />} />
                        </Form.Item>

                        <Form.Item name="password" label="Yangi parol (ixtiyoriy)" rules={[
                            { min: 5, message: 'Kamida 5 ta belgi' }
                        ]}>
                            <Input.Password placeholder="Bo'sh qoldiring agar o'zgartirmoqchi bo'lmasangiz" />
                        </Form.Item>

                        <Form.Item name="fullName" label="To'liq ism" rules={[
                            { required: true, message: 'To\'liq ism kiriting!' }
                        ]}>
                            <Input placeholder="John Doe" />
                        </Form.Item>

                        <Form.Item name="role" label="Role" rules={[
                            { required: true, message: 'Role tanlang!' }
                        ]}>
                            <Select onChange={setSelectedRole}>
                                <Option value="user">👤 User</Option>
                                <Option value="rieltor">🏠 Rieltor</Option>
                                <Option value="manager">🔧 Manager</Option>
                                <Option value="admin">👑 Admin</Option>
                            </Select>
                        </Form.Item>

                        {selectedRole === 'rieltor' && (
                            <>
                                <Alert
                                    message="Rieltor ma'lumotlari"
                                    type="info"
                                    icon={<InfoCircleOutlined />}
                                    style={{ marginBottom: 16 }}
                                />

                                <Form.Item name="appScriptUrl" label="App Script URL" rules={[
                                    { required: true, message: 'URL kiriting!' },
                                    { type: 'url', message: 'To\'g\'ri URL formati!' }
                                ]}>
                                    <Input placeholder="https://script.google.com/..." prefix={<LinkOutlined />} />
                                </Form.Item>

                                <Form.Item name="telegramThemeId" label="Telegram Theme ID" rules={[
                                    { required: true, message: 'Theme ID kiriting!' },
                                    { pattern: /^\d+$/, message: 'Faqat raqam!' }
                                ]}>
                                    <Input placeholder="65" prefix={<MessageOutlined />} type="number" />
                                </Form.Item>
                            </>
                        )}

                        <Form.Item style={{ marginTop: 24 }}>
                            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                                <Button onClick={() => {
                                    setEditModalVisible(false);
                                    editForm.resetFields();
                                    setEditingUser(null);
                                    setSelectedRole('user');
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
        </>
    );
}

export default AdminPanel;