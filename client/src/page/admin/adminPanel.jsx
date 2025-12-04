import React, {useEffect, useState} from 'react';
import {
    Card,
    Table,
    Button,
    Modal,
    Form,
    Input,
    Select,
    message,
    Tabs,
    Tag,
    Space,
    Popconfirm,
    Statistic,
    Row,
    Col,
    Alert,
    Tooltip
} from 'antd';
import {
    UserOutlined,
    ClockCircleOutlined,
    HistoryOutlined,
    PlusOutlined,
    DeleteOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ReloadOutlined,
    LinkOutlined,
    MessageOutlined,
    InfoCircleOutlined,
    DownloadOutlined
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
    const [selectedRole, setSelectedRole] = useState('user');
    const [form] = Form.useForm();

    useEffect(() => {
        loadData();

        // Har 30 soniyada avtomatik yangilash
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
                console.log('✅ Userlar yuklandi:', response.data.users.length);
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
                console.log('✅ Aktiv sesiyalar yuklandi:', response.data.sessions.length);
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
                console.log('✅ Sesiya tarixi yuklandi:', response.data.sessions.length);
            }
        } catch (error) {
            console.error('Sesiya tarixini yuklashda xato:', error);
            message.error('Sesiya tarixini yuklashda xato');
        }
    };

    const loadActivityLogs = async () => {
        try {
            const response = await api.get('/api/users/logs?limit=100');
            if (response.data.success) {
                setActivityLogs(response.data.logs);
                console.log('✅ Activity logs yuklandi:', response.data.logs.length);
            }
        } catch (error) {
            console.error('Loglarni yuklashda xato:', error);
        }
    };

    const handleCreateUser = async (values) => {
        try {
            console.log('👤 Yangi user yaratilmoqda:', values);

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
            console.log('🗑️ User o\'chirilmoqda:', userId);

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

    const handleDownloadBackup = async () => {
        try {
            message.loading('Excel backup yuklanmoqda...', 0);

            const response = await api.get('/api/excel/download-backup', {
                responseType: 'blob'
            });

            // Blob yaratish va yuklab olish
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

    const formatDuration = (seconds) => {
        if (!seconds) return '-';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours}s ${minutes}d ${secs}s`;
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

    const getTimeSince = (dateString) => {
        const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
        if (seconds < 60) return `${seconds}s oldin`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}d oldin`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}s oldin`;
        return `${Math.floor(seconds / 86400)} kun oldin`;
    };

    // Statistics
    const stats = {
        totalUsers: users.length,
        activeUsers: activeSessions.length,
        inactiveUsers: users.length - activeSessions.length,
        totalSessions: sessionHistory.length,
        todayLogins: activityLogs.filter(log => {
            const today = new Date().toDateString();
            return log.action === 'login' && new Date(log.timestamp).toDateString() === today;
        }).length,
        realtors: users.filter(u => u.role === 'rieltor').length,
        managers: users.filter(u => u.role === 'manager').length
    };

    // Users table columns
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
            title: 'Telegram Theme',
            key: 'telegramTheme',
            width: 130,
            render: (_, record) => {
                if (record.role === 'rieltor' && record.telegramThemeId) {
                    return (
                        <Tag color="green" icon={<MessageOutlined />}>
                            ID: {record.telegramThemeId}
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
            title: 'Yaratilgan',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 150,
            render: (date) => formatDate(date)
        },
        {
            title: 'Amallar',
            key: 'actions',
            width: 120,
            fixed: 'right',
            render: (_, record) => (
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
            )
        }
    ];

    // Active sessions columns
    const activeSessionColumns = [
        {
            title: 'Username',
            dataIndex: 'username',
            key: 'username',
            width: 150
        },
        {
            title: 'Login vaqti',
            dataIndex: 'loginTime',
            key: 'loginTime',
            width: 180,
            render: (time) => formatDate(time)
        },
        {
            title: 'Oxirgi faoliyat',
            dataIndex: 'lastActivity',
            key: 'lastActivity',
            width: 180,
            render: (time) => (
                <Space direction="vertical" size={0}>
                    <span>{formatDate(time)}</span>
                    <span style={{fontSize: 12, color: '#888'}}>
                        ({getTimeSince(time)})
                    </span>
                </Space>
            )
        },
        {
            title: 'IP Address',
            dataIndex: 'ipAddress',
            key: 'ipAddress',
            width: 150
        }
    ];

    // Session history columns
    const sessionHistoryColumns = [
        {
            title: 'Username',
            dataIndex: 'username',
            key: 'username',
            width: 120
        },
        {
            title: 'Login',
            dataIndex: 'loginTime',
            key: 'loginTime',
            width: 180,
            render: (time) => formatDate(time)
        },
        {
            title: 'Logout',
            dataIndex: 'logoutTime',
            key: 'logoutTime',
            width: 180,
            render: (time) => time ? formatDate(time) : '-'
        },
        {
            title: 'Davomiylik',
            dataIndex: 'duration',
            key: 'duration',
            width: 120,
            render: (duration) => formatDuration(duration)
        },
        {
            title: 'Status',
            dataIndex: 'isActive',
            key: 'isActive',
            width: 100,
            render: (isActive) => (
                <Tag color={isActive ? 'green' : 'default'}>
                    {isActive ? 'Aktiv' : 'Tugagan'}
                </Tag>
            )
        },
        {
            title: 'Logout sababi',
            dataIndex: 'logoutReason',
            key: 'logoutReason',
            width: 150,
            render: (reason) => {
                if (!reason) return '-';
                const reasonText = {
                    'manual_logout': 'Qo\'lda chiqish',
                    'auto_logout': 'Avtomatik (24h)',
                    'auto_logout_cleanup': 'Tozalash'
                };
                return reasonText[reason] || reason;
            }
        }
    ];

    // Activity logs columns
    const activityColumns = [
        {
            title: 'Vaqt',
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: (time) => formatDate(time),
            width: 180
        },
        {
            title: 'Username',
            dataIndex: 'username',
            key: 'username',
            width: 120
        },
        {
            title: 'Amal',
            dataIndex: 'action',
            key: 'action',
            render: (action) => {
                const actionColors = {
                    'login': 'green',
                    'logout': 'red',
                    'create_user': 'blue',
                    'delete_user': 'orange'
                };
                return (
                    <Tag color={actionColors[action] || 'default'}>
                        {action}
                    </Tag>
                );
            },
            width: 120
        },
        {
            title: 'Tavsif',
            dataIndex: 'description',
            key: 'description'
        },
        {
            title: 'IP',
            dataIndex: 'ipAddress',
            key: 'ipAddress',
            width: 130
        }
    ];

    return (
        <>
            <Header />
            <div style={{padding: 24, background: '#f0f2f5', minHeight: 'calc(100vh - 64px)'}}>
                <div style={{marginBottom: 24}}>
                    <h1 style={{fontSize: 28, marginBottom: 8}}>👨‍💼 Admin Panel</h1>
                    <p style={{color: '#666'}}>Foydalanuvchilar va tizim faoliyatini boshqarish</p>
                </div>

                {/* Statistics */}
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
                    <Tabs defaultActiveKey="1">
                        {/* Users Tab */}
                        <TabPane
                            tab={
                                <span>
                                    <UserOutlined/>
                                    Userlar ({users.length})
                                </span>
                            }
                            key="1"
                        >
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
                                    style={{marginLeft: 'auto'}}
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
                                scroll={{x: 1200}}
                            />
                        </TabPane>

                        {/* Active Sessions Tab */}
                        <TabPane
                            tab={
                                <span>
                                    <ClockCircleOutlined/>
                                    Aktiv Sesiyalar ({activeSessions.length})
                                </span>
                            }
                            key="2"
                        >
                            <Space style={{marginBottom: 16}}>
                                <Button
                                    icon={<ReloadOutlined/>}
                                    onClick={loadActiveSessions}
                                >
                                    Yangilash
                                </Button>
                            </Space>

                            <Table
                                columns={activeSessionColumns}
                                dataSource={activeSessions}
                                rowKey="sessionId"
                                loading={loading}
                                pagination={{pageSize: 10}}
                                scroll={{x: 800}}
                            />
                        </TabPane>

                        {/* Session History Tab */}
                        <TabPane
                            tab={
                                <span>
                                    <HistoryOutlined/>
                                    Sesiya Tarixi ({sessionHistory.length})
                                </span>
                            }
                            key="3"
                        >
                            <Space style={{marginBottom: 16}}>
                                <Button
                                    icon={<ReloadOutlined/>}
                                    onClick={loadSessionHistory}
                                >
                                    Yangilash
                                </Button>
                            </Space>

                            <Table
                                columns={sessionHistoryColumns}
                                dataSource={sessionHistory}
                                rowKey="sessionId"
                                loading={loading}
                                pagination={{pageSize: 10}}
                                scroll={{x: 1000}}
                            />
                        </TabPane>

                        {/* Activity Logs Tab */}
                        <TabPane
                            tab={
                                <span>
                                    <HistoryOutlined/>
                                    Activity Logs ({activityLogs.length})
                                </span>
                            }
                            key="4"
                        >
                            <Space style={{marginBottom: 16}}>
                                <Button
                                    icon={<ReloadOutlined/>}
                                    onClick={loadActivityLogs}
                                >
                                    Yangilash
                                </Button>
                            </Space>

                            <Table
                                columns={activityColumns}
                                dataSource={activityLogs}
                                rowKey={(record) => `${record.timestamp}-${record.userId}`}
                                loading={loading}
                                pagination={{pageSize: 20}}
                                scroll={{x: 1000}}
                            />
                        </TabPane>
                    </Tabs>
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
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleCreateUser}
                        autoComplete="off"
                    >
                        <Form.Item
                            name="username"
                            label="Username"
                            rules={[
                                { required: true, message: 'Username kiriting!' },
                                { min: 3, message: 'Kamida 3 ta belgi bo\'lishi kerak' },
                                {
                                    pattern: /^[a-zA-Z0-9_]+$/,
                                    message: 'Faqat harflar, raqamlar va _ belgisi'
                                }
                            ]}
                        >
                            <Input
                                placeholder="masalan: john_doe"
                                prefix={<UserOutlined />}
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label="Parol"
                            rules={[
                                { required: true, message: 'Parol kiriting!' },
                                { min: 5, message: 'Kamida 5 ta belgi bo\'lishi kerak' }
                            ]}
                        >
                            <Input.Password placeholder="Kamida 5 ta belgi" />
                        </Form.Item>

                        <Form.Item
                            name="fullName"
                            label="To'liq ism"
                            rules={[
                                { required: true, message: 'To\'liq ism kiriting!' },
                                { min: 3, message: 'Kamida 3 ta belgi bo\'lishi kerak' }
                            ]}
                        >
                            <Input placeholder="masalan: John Doe" />
                        </Form.Item>

                        <Form.Item
                            name="role"
                            label="Role"
                            rules={[{ required: true, message: 'Role tanlang!' }]}
                            initialValue="user"
                        >
                            <Select onChange={(value) => setSelectedRole(value)}>
                                <Option value="user">👤 User</Option>
                                <Option value="rieltor">🏠 Rieltor</Option>
                                <Option value="manager">🔧 Manager</Option>
                                <Option value="admin">👑 Admin</Option>
                            </Select>
                        </Form.Item>

                        {/* Realtor-specific fields */}
                        {selectedRole === 'rieltor' && (
                            <>
                                <Alert
                                    message="Rieltor uchun qo'shimcha ma'lumotlar"
                                    description="App Script URL va Telegram Theme ID kiritish majburiy"
                                    type="info"
                                    icon={<InfoCircleOutlined />}
                                    style={{ marginBottom: 16 }}
                                />

                                <Form.Item
                                    name="appScriptUrl"
                                    label={
                                        <Space>
                                            <LinkOutlined />
                                            App Script URL
                                        </Space>
                                    }
                                    rules={[
                                        { required: true, message: 'App Script URL kiriting!' },
                                        {
                                            type: 'url',
                                            message: 'To\'g\'ri URL formatida kiriting!'
                                        },
                                        {
                                            pattern: /script\.google\.com/,
                                            message: 'Google Apps Script URL bo\'lishi kerak'
                                        }
                                    ]}
                                    tooltip="Google Apps Script'ning web app URL manzili"
                                >
                                    <Input
                                        placeholder="https://script.google.com/macros/s/..."
                                        prefix={<LinkOutlined />}
                                    />
                                </Form.Item>

                                <Form.Item
                                    name="telegramThemeId"
                                    label={
                                        <Space>
                                            <MessageOutlined />
                                            Telegram Theme ID
                                        </Space>
                                    }
                                    rules={[
                                        { required: true, message: 'Telegram Theme ID kiriting!' },
                                        {
                                            pattern: /^\d+$/,
                                            message: 'Faqat raqam bo\'lishi kerak'
                                        }
                                    ]}
                                    tooltip="Telegram guruh yoki kanalning theme/topic ID raqami"
                                >
                                    <Input
                                        placeholder="masalan: 65"
                                        prefix={<MessageOutlined />}
                                        type="number"
                                    />
                                </Form.Item>
                            </>
                        )}

                        {/* Manager info */}
                        {selectedRole === 'manager' && (
                            <Alert
                                message="Manager huquqlari"
                                description="Manager admin bilan bir xil huquqlarga ega"
                                type="success"
                                icon={<CheckCircleOutlined />}
                                style={{ marginBottom: 16 }}
                            />
                        )}

                        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
                            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                                <Button
                                    onClick={() => {
                                        setModalVisible(false);
                                        form.resetFields();
                                        setSelectedRole('user');
                                    }}
                                >
                                    Bekor qilish
                                </Button>
                                <Button type="primary" htmlType="submit">
                                    Yaratish
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