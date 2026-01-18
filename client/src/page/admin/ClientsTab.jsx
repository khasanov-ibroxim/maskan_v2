import React, { useState, useEffect } from 'react';
import {
    Card, Table, Button, Modal, Input, Select, message,
    Space, Popconfirm, Tag, InputNumber, Divider, Descriptions,
    Drawer, List, Avatar
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined,
    HomeOutlined, SearchOutlined, TeamOutlined, PhoneOutlined
} from '@ant-design/icons';
import api from '../../utils/api';

const { Option } = Select;
const { TextArea } = Input;

const ClientsTab = () => {
    const [clients, setClients] = useState([]);
    const [realtors, setRealtors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [matchesDrawerVisible, setMatchesDrawerVisible] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [matches, setMatches] = useState([]);

    // ✅ NEW: Assigned objects modal
    const [assignedObjectsModalVisible, setAssignedObjectsModalVisible] = useState(false);
    const [assignedObjects, setAssignedObjects] = useState([]);

    // Form state
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        rooms: [],
        floorMin: null,
        floorMax: null,
        totalFloorsMin: null,
        totalFloorsMax: null,
        priceMin: null,
        priceMax: null,
        notes: ''
    });

    useEffect(() => {
        loadClients();
        loadRealtors();
    }, []);

    const loadClients = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/clients');
            if (response.data.success) {
                setClients(response.data.data);
            }
        } catch (error) {
            message.error('Clientlarni yuklashda xato');
        } finally {
            setLoading(false);
        }
    };

    const loadRealtors = async () => {
        try {
            const response = await api.get('/api/users/realtors');
            if (response.data.success) {
                setRealtors(response.data.realtors);
            }
        } catch (error) {
            console.error('Realtorlarni yuklashda xato:', error);
        }
    };

    const handleAdd = () => {
        setEditingClient(null);
        setFormData({
            fullName: '',
            phone: '',
            rooms: [],
            floorMin: null,
            floorMax: null,
            totalFloorsMin: null,
            totalFloorsMax: null,
            priceMin: null,
            priceMax: null,
            notes: ''
        });
        setModalVisible(true);
    };

    const handleEdit = (client) => {
        setEditingClient(client);
        setFormData({
            fullName: client.full_name || '',
            phone: client.phone || '',
            rooms: client.rooms || [],
            floorMin: client.floor_min,
            floorMax: client.floor_max,
            totalFloorsMin: client.total_floors_min,
            totalFloorsMax: client.total_floors_max,
            priceMin: client.price_min,
            priceMax: client.price_max,
            notes: client.notes || ''
        });
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/api/clients/${id}`);
            message.success('Client o\'chirildi');
            loadClients();
        } catch (error) {
            message.error('O\'chirishda xato');
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.fullName || !formData.phone) {
            message.error('Ism va telefon majburiy!');
            return;
        }

        if (!/^\+998\d{9}$/.test(formData.phone)) {
            message.error('Telefon formatida xato! (+998XXXXXXXXX)');
            return;
        }

        try {
            const payload = {
                fullName: formData.fullName,
                phone: formData.phone,
                rooms: formData.rooms,
                floorMin: formData.floorMin,
                floorMax: formData.floorMax,
                totalFloorsMin: formData.totalFloorsMin,
                totalFloorsMax: formData.totalFloorsMax,
                priceMin: formData.priceMin,
                priceMax: formData.priceMax,
                notes: formData.notes
            };

            if (editingClient) {
                await api.put(`/api/clients/${editingClient.id}`, payload);
                message.success('Client yangilandi');
            } else {
                await api.post('/api/clients', payload);
                message.success('Client qo\'shildi');
            }

            setModalVisible(false);
            loadClients();
        } catch (error) {
            message.error(error.response?.data?.error || 'Xato yuz berdi');
        }
    };

    const handleAssignRealtor = async (clientId, realtorId) => {
        try {
            await api.post(`/api/clients/${clientId}/assign-realtor`, { realtorId });
            message.success('Rieltor biriktirildi');
            loadClients();
        } catch (error) {
            message.error('Xato yuz berdi');
        }
    };

    const handleFindMatches = async (client) => {
        try {
            setSelectedClient(client);
            setMatchesDrawerVisible(true);

            const response = await api.get(`/api/clients/${client.id}/matches`);
            if (response.data.success) {
                setMatches(response.data.data);
            }
        } catch (error) {
            message.error('Qidirishda xato');
        }
    };

    const handleAssignObject = async (clientId, objectId) => {
        try {
            await api.post(`/api/clients/${clientId}/assign-object`, { objectId });
            message.success('Obyekt biriktirildi');
            loadClients();
        } catch (error) {
            message.error('Xato yuz berdi');
        }
    };

    const handlePhoneChange = (value) => {
        let input = value.replace(/\D/g, '');
        if (!input.startsWith('998')) input = '998' + input;
        let formatted = '+' + input.substring(0, 12);
        setFormData({ ...formData, phone: formatted });
    };

    // ✅ NEW: Show assigned objects
    const handleShowAssignedObjects = async (client) => {
        try {
            setSelectedClient(client);
            setAssignedObjectsModalVisible(true);

            const response = await api.get(`/api/clients/${client.id}/assigned-objects`);
            if (response.data.success) {
                setAssignedObjects(response.data.data);
            }
        } catch (error) {
            message.error('Obyektlarni yuklashda xato');
        }
    };

    // ✅ NEW: Unassign object
    const handleUnassignObject = async (clientId, objectId) => {
        try {
            await api.post(`/api/clients/${clientId}/unassign-object`, { objectId });
            message.success('Obyekt ajratildi');

            // Refresh assigned objects
            const response = await api.get(`/api/clients/${clientId}/assigned-objects`);
            if (response.data.success) {
                setAssignedObjects(response.data.data);
            }

            loadClients();
        } catch (error) {
            message.error('Xato yuz berdi');
        }
    };

    const columns = [
        {
            title: 'F.I.O',
            dataIndex: 'full_name',
            key: 'full_name',
            width: 200,
            render: (name) => (
                <Space>
                    <UserOutlined />
                    <strong>{name}</strong>
                </Space>
            )
        },
        {
            title: 'Telefon',
            dataIndex: 'phone',
            key: 'phone',
            width: 150,
            render: (phone) => (
                <Space>
                    <PhoneOutlined />
                    {phone}
                </Space>
            )
        },
        {
            title: 'Xonalar',
            dataIndex: 'rooms',
            key: 'rooms',
            width: 120,
            render: (rooms) => (
                <Space>
                    {(rooms || []).map(r => (
                        <Tag key={r} color="blue">{r}-xona</Tag>
                    ))}
                </Space>
            )
        },
        {
            title: 'Narx oralig\'i',
            key: 'price',
            width: 180,
            render: (_, record) => (
                <div>
                    {record.price_min && <div>Min: ${record.price_min.toLocaleString()}</div>}
                    {record.price_max && <div>Max: ${record.price_max.toLocaleString()}</div>}
                </div>
            )
        },
        {
            title: 'Rieltor',
            dataIndex: 'assigned_realtor_name',
            key: 'realtor',
            width: 200,
            render: (name, record) => (
                <Select
                    style={{ width: '100%' }}
                    placeholder="Rieltor tanlang"
                    value={record.assigned_realtor_id}
                    onChange={(value) => handleAssignRealtor(record.id, value)}
                    allowClear
                >
                    {realtors.map(r => (
                        <Option key={r.id} value={r.id}>
                            <TeamOutlined /> {r.full_name}
                        </Option>
                    ))}
                </Select>
            )
        },
        {
            title: 'Biriktirilgan uylar',
            key: 'assigned_count',
            width: 150,
            render: (_, record) => {
                const count = (record.assigned_objects || []).length;
                return (
                    <Button
                        size="small"
                        type={count > 0 ? 'primary' : 'default'}
                        onClick={() => handleShowAssignedObjects(record)}
                    >
                        <HomeOutlined /> {count} ta uy
                    </Button>
                );
            }
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status) => (
                <Tag color={status === 'active' ? 'green' : 'default'}>
                    {status === 'active' ? 'Faol' : 'Faol emas'}
                </Tag>
            )
        },
        {
            title: 'Amallar',
            key: 'actions',
            width: 300,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button
                        size="small"
                        icon={<SearchOutlined />}
                        onClick={() => handleFindMatches(record)}
                    >
                        Topish
                    </Button>
                    <Button
                        type="primary"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    >
                        Tahrirlash
                    </Button>
                    <Popconfirm
                        title="O'chirmoqchimisiz?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Ha"
                        cancelText="Yo'q"
                    >
                        <Button
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                        >
                            O'chirish
                        </Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <div>
                    <h2 style={{ margin: 0 }}>👥 Clientlar</h2>
                    <p style={{ color: '#888', marginTop: 4 }}>Client va ularning talablarini boshqarish</p>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAdd}
                >
                    Yangi Client
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={clients}
                rowKey="id"
                loading={loading}
                pagination={{
                    pageSize: 10,
                    showTotal: (total) => `Jami: ${total}`,
                    showSizeChanger: true
                }}
                scroll={{ x: 1600 }}
            />

            <Modal
                title={editingClient ? '✏️ Client Tahrirlash' : '➕ Yangi Client'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={handleSubmit}
                width={700}
                okText={editingClient ? 'Yangilash' : 'Qo\'shish'}
            >
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8 }}>To'liq ism *</label>
                    <Input
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="Ali Valiyev"
                    />
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8 }}>Telefon raqam *</label>
                    <Input
                        value={formData.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="+998901234567"
                        maxLength={13}
                    />
                </div>

                <Divider>Talablar</Divider>

                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8 }}>Xonalar soni</label>
                    <Select
                        mode="multiple"
                        style={{ width: '100%' }}
                        value={formData.rooms}
                        onChange={(value) => setFormData({ ...formData, rooms: value })}
                        placeholder="Xonalar sonini tanlang"
                    >
                        <Option value={1}>1-xonali</Option>
                        <Option value={2}>2-xonali</Option>
                        <Option value={3}>3-xonali</Option>
                        <Option value={4}>4-xonali</Option>
                        <Option value={5}>5+ xonali</Option>
                    </Select>
                </div>

                <Space style={{ width: '100%', marginBottom: 16 }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: 8 }}>Min qavat</label>
                        <InputNumber
                            value={formData.floorMin}
                            onChange={(value) => setFormData({ ...formData, floorMin: value })}
                            min={1}
                            placeholder="1"
                            style={{ width: 120 }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 8 }}>Max qavat</label>
                        <InputNumber
                            value={formData.floorMax}
                            onChange={(value) => setFormData({ ...formData, floorMax: value })}
                            min={1}
                            placeholder="9"
                            style={{ width: 120 }}
                        />
                    </div>
                </Space>

                <Space style={{ width: '100%', marginBottom: 16 }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: 8 }}>Min etajnost</label>
                        <InputNumber
                            value={formData.totalFloorsMin}
                            onChange={(value) => setFormData({ ...formData, totalFloorsMin: value })}
                            min={1}
                            placeholder="5"
                            style={{ width: 120 }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 8 }}>Max etajnost</label>
                        <InputNumber
                            value={formData.totalFloorsMax}
                            onChange={(value) => setFormData({ ...formData, totalFloorsMax: value })}
                            min={1}
                            placeholder="12"
                            style={{ width: 120 }}
                        />
                    </div>
                </Space>

                <Space style={{ width: '100%', marginBottom: 16 }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: 8 }}>Min narx ($)</label>
                        <InputNumber
                            value={formData.priceMin}
                            onChange={(value) => setFormData({ ...formData, priceMin: value })}
                            min={0}
                            style={{ width: 150 }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 8 }}>Max narx ($)</label>
                        <InputNumber
                            value={formData.priceMax}
                            onChange={(value) => setFormData({ ...formData, priceMax: value })}
                            min={0}
                            style={{ width: 150 }}
                        />
                    </div>
                </Space>

                <div>
                    <label style={{ display: 'block', marginBottom: 8 }}>Izohlar</label>
                    <TextArea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        placeholder="Qo'shimcha ma'lumotlar..."
                    />
                </div>
            </Modal>

            <Drawer
                title={`🏠 ${selectedClient?.full_name} uchun mos uylar`}
                placement="right"
                width={600}
                open={matchesDrawerVisible}
                onClose={() => setMatchesDrawerVisible(false)}
            >
                {selectedClient && (
                    <div style={{ marginBottom: 16 }}>
                        <Descriptions size="small" column={1} bordered>
                            <Descriptions.Item label="Xonalar">
                                {(selectedClient.rooms || []).join(', ') || 'Belgilanmagan'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Qavat">
                                {selectedClient.floor_min && selectedClient.floor_max
                                    ? `${selectedClient.floor_min}-${selectedClient.floor_max}`
                                    : 'Belgilanmagan'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Narx">
                                {selectedClient.price_min && selectedClient.price_max
                                    ? `$${selectedClient.price_min?.toLocaleString()} - $${selectedClient.price_max?.toLocaleString()}`
                                    : 'Belgilanmagan'}
                            </Descriptions.Item>
                        </Descriptions>
                    </div>
                )}

                <Divider>Topilgan uylar ({matches.length})</Divider>

                <List
                    dataSource={matches}
                    renderItem={(item) => (
                        <List.Item
                            actions={[
                                <Button
                                    type="primary"
                                    size="small"
                                    onClick={() => handleAssignObject(selectedClient.id, item.id)}
                                >
                                    Biriktirish
                                </Button>
                            ]}
                        >
                            <List.Item.Meta
                                avatar={<Avatar icon={<HomeOutlined />} />}
                                title={`${item.kvartil} - ${item.xet}`}
                                description={
                                    <div>
                                        <div>Maydon: {item.m2} m²</div>
                                        <div>Narx: {item.narx}</div>
                                        <div>Telefon: {item.tell}</div>
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            </Drawer>

            {/* ✅ NEW: Assigned Objects Modal */}
            <Modal
                title={`🏠 ${selectedClient?.full_name} - Biriktirilgan uylar`}
                open={assignedObjectsModalVisible}
                onCancel={() => setAssignedObjectsModalVisible(false)}
                footer={null}
                width={800}
            >
                {assignedObjects.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                        <HomeOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                        <div>Hech qanday uy biriktirilmagan</div>
                    </div>
                ) : (
                    <List
                        dataSource={assignedObjects}
                        renderItem={(item) => (
                            <List.Item
                                actions={[
                                    <Button
                                        danger
                                        size="small"
                                        onClick={() => handleUnassignObject(selectedClient.id, item.id)}
                                    >
                                        Ajratish
                                    </Button>
                                ]}
                            >
                                <List.Item.Meta
                                    avatar={<Avatar icon={<HomeOutlined />} style={{ backgroundColor: '#1890ff' }} />}
                                    title={
                                        <Space>
                                            <strong>{item.kvartil}</strong>
                                            <Tag color="blue">{item.xet}</Tag>
                                        </Space>
                                    }
                                    description={
                                        <div>
                                            <div><strong>Maydon:</strong> {item.m2} m²</div>
                                            <div><strong>Narx:</strong> {item.narx}</div>
                                            <div><strong>Telefon:</strong> {item.tell}</div>
                                            {item.fio && <div><strong>Ega:</strong> {item.fio}</div>}
                                            {item.assigned_at && (
                                                <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                                                    Biriktirilgan: {new Date(item.assigned_at).toLocaleString('uz-UZ')}
                                                </div>
                                            )}
                                        </div>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                )}
            </Modal>
        </div>
    );
};

export default ClientsTab;