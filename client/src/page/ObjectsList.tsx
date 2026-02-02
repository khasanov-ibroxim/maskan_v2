import  { useEffect, useState, useRef } from 'react';
import {
    Table, Button, Space, Tag, message, Tooltip, Input, Select,
    Modal, Form, InputNumber, FloatButton, Card, Avatar, List, Spin
} from 'antd';
import {
    FolderOpenOutlined,
    ShopOutlined,
    ReloadOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    SyncOutlined,
    SearchOutlined,
    FilterOutlined,
    ClearOutlined,
    EditOutlined,
    SaveOutlined,
    RobotOutlined,
    SendOutlined,
    CloseOutlined,
    UserOutlined
} from '@ant-design/icons';
import api from '../utils/api'; // Updated import path
import { sendMessageToGemini } from './geminiService';
import type { TablePaginationConfig } from 'antd/es/table';
import type { FilterValue, SorterResult } from 'antd/es/table/interface';

const { Search } = Input;
const { Option } = Select;

// Define Types
interface RealEstateObject {
    id: number | string;
    kvartil: string;
    xet: string;
    tell: string;
    m2: number;
    narx: number;
    fio: string;
    uyTuri: string;
    xolati: string;
    planirovka: string;
    balkon: string;
    torets: string;
    dom: string;
    kvartira: string;
    osmotir: string;
    opisaniya: string;
    rieltor: string;
    xodim: string;
    elonStatus: 'waiting' | 'processing' | 'posted' | 'error';
    rasmlar: string;
    sheet_type?: string;
}

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

const ObjectsList: React.FC = () => {
    const [objects, setObjects] = useState<RealEstateObject[]>([]);
    const [filteredObjects, setFilteredObjects] = useState<RealEstateObject[]>([]);
    const [loading, setLoading] = useState(false);
    const [queueStatus, setQueueStatus] = useState({ queue: [] as (number | string)[], queueLength: 0 });
    const [postingId, setPostingId] = useState<number | string | null>(null);

    // ✅ EDIT MODAL state
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingObject, setEditingObject] = useState<RealEstateObject | null>(null);
    const [editForm] = Form.useForm();
    const [editLoading, setEditLoading] = useState(false);

    // 🤖 AI ASSISTANT State
    const [isAiOpen, setIsAiOpen] = useState(false);
    const [aiInput, setAiInput] = useState('');
    const [aiMessages, setAiMessages] = useState<ChatMessage[]>([
        { role: 'model', text: 'Assalomu alaykum! Men sizning ko\'chmas mulk bo\'yicha AI yordamchingizman. Jadval bo\'yicha qanday savolingiz bor?' }
    ]);
    const [aiLoading, setAiLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const [filters, setFilters] = useState({
        searchText: '',
        id: null as string | null,
        kvartil: null as string | null,
        rieltor: null as string | null,
        status: null as string | null,
        minPrice: null as number | null,
        maxPrice: null as number | null
    });

    const [tableParams, setTableParams] = useState({
        pagination: {
            current: 1,
            pageSize: 20,
            total: 0,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['10', '20', '50', '100', '200'],
            showTotal: (total: number, range: [number, number]) => `${range[0]}-${range[1]} / ${total}`
        },
    });

    useEffect(() => {
        loadObjects();
        loadQueueStatus();

        const interval = setInterval(() => {
            console.log('🔄 Auto-refresh queue status (10 min)');
            loadQueueStatus();
        }, 600000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        applyFilters();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [objects, filters]);

    // Scroll to bottom of chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [aiMessages, isAiOpen]);

    const applyFilters = () => {
        let filtered = [...objects];

        if (filters.searchText) {
            const searchLower = filters.searchText.toLowerCase();
            filtered = filtered.filter(obj =>
                obj.id?.toLowerCase().includes(searchLower) ||
                obj.kvartil?.toLowerCase().includes(searchLower) ||
                obj.xet?.toLowerCase().includes(searchLower) ||
                obj.tell?.toLowerCase().includes(searchLower) ||
                obj.rieltor?.toLowerCase().includes(searchLower) ||
                obj.opisaniya?.toLowerCase().includes(searchLower)
            );
        }

        if (filters.id) {
            filtered = filtered.filter(obj => obj.id === filters.id);
        }
        if (filters.kvartil) {
            filtered = filtered.filter(obj => obj.kvartil === filters.kvartil);
        }

        if (filters.rieltor) {
            filtered = filtered.filter(obj => obj.rieltor === filters.rieltor);
        }

        if (filters.status) {
            filtered = filtered.filter(obj => obj.elonStatus === filters.status);
        }

        if (filters.minPrice) {
            filtered = filtered.filter(obj => obj.narx >= (filters.minPrice as number));
        }
        if (filters.maxPrice) {
            filtered = filtered.filter(obj => obj.narx <= (filters.maxPrice as number));
        }

        setFilteredObjects(filtered);

        setTableParams(prev => ({
            ...prev,
            pagination: {
                ...prev.pagination,
                total: filtered.length
            }
        }));
    };

    const loadObjects = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/excel/objects');
            if (response.data.success) {
                setObjects(response.data.objects);
            }
        } catch (error) {
            console.error('Obyektlarni yuklashda xato:', error);
            message.error('Obyektlarni yuklashda xato');
        } finally {
            setLoading(false);
        }
    };

    const loadQueueStatus = async () => {
        try {
            const response = await api.get('/api/excel/queue-status');
            if (response.data.success) {
                setQueueStatus(response.data);
            }
        } catch (error) {
            console.error('Navbat statusini olishda xato:', error);
        }
    };

    const handlePostAd = async (objectId: number | string) => {
        setPostingId(objectId);
        try {
            const response = await api.post('/api/excel/post-ad', { objectId });

            if (response.data.success) {
                message.success(
                    `✅ Elon navbatga qo'shildi! Navbatda: ${response.data.queuePosition}`
                );
                await loadObjects();
                await loadQueueStatus();
            }
        } catch (error: any) {
            console.error('Elon berishda xato:', error);
            message.error(error.response?.data?.error || 'Elon berishda xato');
        } finally {
            setPostingId(null);
        }
    };

    // ✅ EDIT MODAL ochish
    const handleEditClick = (record: RealEstateObject) => {
        console.log('✏️ Edit clicked:', record);
        setEditingObject(record);

        // Form'ga qiymatlarni o'rnatish
        editForm.setFieldsValue({
            kvartil: record.kvartil,
            xet: record.xet,
            tell: record.tell,
            m2: record.m2,
            narx: record.narx,
            fio: record.fio,
            uy_turi: record.uyTuri,
            xolati: record.xolati,
            planirovka: record.planirovka,
            balkon: record.balkon,
            torets: record.torets,
            dom: record.dom,
            kvartira: record.kvartira,
            osmotir: record.osmotir,
            opisaniya: record.opisaniya,
            rieltor: record.rieltor,
            xodim: record.xodim
        });

        setEditModalVisible(true);
    };

    // ✅ EDIT SAVE
    const handleEditSave = async () => {
        if (!editingObject) return;
        try {
            const values = await editForm.validateFields();
            setEditLoading(true);

            console.log('💾 Saqlash:', values);

            // Backend'ga yuborish
            const response = await api.put(`/api/excel/objects/${editingObject.id}`, values);

            if (response.data.success) {
                message.success('✅ Obyekt muvaffaqiyatli yangilandi!');
                setEditModalVisible(false);
                setEditingObject(null);
                editForm.resetFields();

                // Ro'yxatni yangilash
                await loadObjects();
            }
        } catch (error: any) {
            console.error('Saqlashda xato:', error);
            if (error.response?.data?.error) {
                message.error(error.response.data.error);
            } else {
                message.error('Saqlashda xato yuz berdi');
            }
        } finally {
            setEditLoading(false);
        }
    };
    const handleEditDelete = async () => {
        if (!editingObject) return;

        Modal.confirm({
            title: 'Obyektni o\'chirish',
            content: `${editingObject.kvartil} - ${editingObject.xet} obyektini o'chirmoqchimisiz?`,
            okText: 'Ha, o\'chirish',
            okType: 'danger',
            cancelText: 'Yo\'q',
            onOk: async () => {
                try {
                    setEditLoading(true);
                    const response = await api.delete(`/api/excel/objects/${editingObject.id}`);

                    if (response.data.success) {
                        message.success('✅ Obyekt muvaffaqiyatli o\'chirildi!');
                        setEditModalVisible(false);
                        setEditingObject(null);
                        editForm.resetFields();
                        await loadObjects();
                    }
                } catch (error: any) {
                    console.error('O\'chirishda xato:', error);
                    message.error(error.response?.data?.error || 'O\'chirishda xato yuz berdi');
                } finally {
                    setEditLoading(false);
                }
            }
        });
    };
    // ✅ EDIT CANCEL
    const handleEditCancel = () => {
        setEditModalVisible(false);
        setEditingObject(null);
        editForm.resetFields();
    };

    const openFolder = (url: string) => {
        if (!url || url === "Yo'q") {
            message.warning('Fayl topilmadi');
            return;
        }
        window.open(url, '_blank');
    };

    const getStatusTag = (status: string) => {
        const statusConfig: any = {
            waiting: { color: 'default', icon: <ClockCircleOutlined />, text: 'Kutilmoqda' },
            processing: { color: 'processing', icon: <SyncOutlined spin />, text: 'Jarayonda' },
            posted: { color: 'success', icon: <CheckCircleOutlined />, text: 'Berildi' },
            error: { color: 'error', icon: <ClockCircleOutlined />, text: 'Xato' }
        };

        const config = statusConfig[status] || statusConfig.waiting;
        return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
    };

    const handleTableChange = (pagination: TablePaginationConfig, filters: Record<string, FilterValue | null>, sorter: SorterResult<RealEstateObject> | SorterResult<RealEstateObject>[]) => {
        setTableParams(prev => ({
            ...prev,
            pagination: pagination as any,
        }));
    };

    const clearFilters = () => {
        setFilters({
            id:"",
            searchText: '',
            kvartil: null,
            rieltor: null,
            status: null,
            minPrice: null,
            maxPrice: null
        });

        setTableParams(prev => ({
            ...prev,
            pagination: {
                ...prev.pagination,
                current: 1
            }
        }));

        message.success('Filterlar tozalandi');
    };

    const getUniqueValues = (key: keyof RealEstateObject) => {
        return [...new Set(objects.map(obj => obj[key]).filter(Boolean))].sort();
    };

    const handleDownloadUploads = async () => {
        try {
            message.loading('Uploads papka yuklanmoqda...', 0);

            const response = await api.get('/download-uploads-zip', {
                responseType: 'blob',
                timeout: 300000
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `uploads_backup_${Date.now()}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            message.destroy();
            message.success('Uploads papka muvaffaqiyatli yuklandi! 📦');

        } catch (error: any) {
            message.destroy();
            console.error('Uploads yuklab olishda xato:', error);
            message.error('Xato: ' + (error.response?.data?.error || error.message));
        }
    };

    // 🤖 AI Logic
    const handleAiSend = async () => {
        if (!aiInput.trim()) return;

        const userMsg: ChatMessage = { role: 'user', text: aiInput };
        setAiMessages(prev => [...prev, userMsg]);
        setAiInput('');
        setAiLoading(true);

        try {
            // Pass the currently filtered objects to context
            const responseText = await sendMessageToGemini(userMsg.text, filteredObjects);

            const modelMsg: ChatMessage = { role: 'model', text: responseText };
            setAiMessages(prev => [...prev, modelMsg]);
        } catch (error) {
            setAiMessages(prev => [...prev, { role: 'model', text: 'Xatolik yuz berdi. Keyinroq urinib ko\'ring.' }]);
        } finally {
            setAiLoading(false);
        }
    };

    // Helper to format message with bold text and newlines
    const formatMessage = (text: string) => {
        return text.split('\n').map((line, i) => (
            <div key={i} className={`${line.trim() === '' ? 'h-2' : 'min-h-[1.2em]'}`}>
                {line.split(/(\*\*.*?\*\*)/).map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={j}>{part.slice(2, -2)}</strong>;
                    }
                    return part;
                })}
            </div>
        ));
    };

    const columns: any = [
        {
            title: '№',
            key: 'index',
            width: 60,
            fixed: 'left',
            render: (_: any, __: any, index: number) => {
                return (tableParams.pagination.current - 1) * tableParams.pagination.pageSize + index + 1;
            }
        },
        {
            title: '№',
            key: 'id',
            dataIndex: "id",
            width: 60,
        },
        {
            title: 'Kvartil',
            dataIndex: 'kvartil',
            key: 'kvartil',
            width: 180,
            fixed: 'left',
            sorter: (a: RealEstateObject, b: RealEstateObject) => (a.kvartil || '').localeCompare(b.kvartil || '')
        },
        {
            title: 'X/E/T',
            dataIndex: 'xet',
            key: 'xet',
            width: 100
        },
        {
            title: 'M²',
            dataIndex: 'm2',
            key: 'm2',
            width: 80,
            sorter: (a: RealEstateObject, b: RealEstateObject) => (a.m2 || 0) - (b.m2 || 0)
        },
        {
            title: 'Narx ($)',
            dataIndex: 'narx',
            key: 'narx',
            width: 120,
            render: (narx: number) => (
                <span className="font-bold text-blue-600">
                    ${narx?.toLocaleString()}
                </span>
            ),
            sorter: (a: RealEstateObject, b: RealEstateObject) => (a.narx || 0) - (b.narx || 0)
        },
        {
            title: 'Turi',
            dataIndex: 'sheet_type',
            key: 'sheet_type',
            width: 140
        },
        {
            title: 'Telefon',
            dataIndex: 'tell',
            key: 'tell',
            width: 140
        },
        {
            title: 'Rieltor',
            dataIndex: 'rieltor',
            key: 'rieltor',
            width: 120
        },
        {
            title: 'Status',
            key: 'status',
            width: 130,
            render: (_: any, record: RealEstateObject) => getStatusTag(record.elonStatus)
        },
        {
            title: 'Amallar',
            key: 'actions',
            width: 220,
            fixed: 'right',
            render: (_: any, record: RealEstateObject) => {
                const isInQueue = queueStatus.queue.includes(record.id);
                const isPosted = record.elonStatus === 'posted';
                const isPosting = postingId === record.id || isInQueue;

                return (
                    <Space size="small">
                        {/* ✅ EDIT button */}
                        <Tooltip title="Tahrirlash">
                            <Button
                                type="default"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleEditClick(record)}
                            />
                        </Tooltip>

                        <Tooltip title="Rasmlarni ochish">
                            <Button
                                type="default"
                                size="small"
                                icon={<FolderOpenOutlined />}
                                onClick={() => openFolder(record.rasmlar)}
                                disabled={!record.rasmlar || record.rasmlar === "Yo'q"}
                            />
                        </Tooltip>

                        <Tooltip title={isPosted ? "Allaqachon berilgan" : "OLX ga e'lon berish"}>
                            <Button
                                type="primary"
                                size="small"
                                icon={<ShopOutlined />}
                                onClick={() => handlePostAd(record.id)}
                                loading={isPosting}
                                disabled={isPosted || isPosting}
                            >
                                {isPosted ? '✓' : "E'lon"}
                            </Button>
                        </Tooltip>
                    </Space>
                );
            }
        }
    ];

    return (
        <div className="p-5 relative">
            {/* FILTER PANEL */}
            <div className="mb-4 bg-gray-100 p-4 rounded-lg">
                <Space wrap className="w-full justify-between">
                    <Space wrap>
                        <Search
                            placeholder="Qidirish (kvartil, telefon, rieltor...)"
                            allowClear
                            value={filters.searchText}
                            onChange={(e) => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
                            className="w-[300px]"
                            prefix={<SearchOutlined />}
                        />
                        <Input
                            placeholder="ID"
                            type="text"
                            value={filters.id ?? ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, id: e.target.value ? e.target.value : null }))}
                            className="w-[120px]"
                            prefix="$"
                        />
                        <Select
                            placeholder="Kvartil"
                            allowClear
                            value={filters.kvartil}
                            onChange={(value) => setFilters(prev => ({ ...prev, kvartil: value }))}
                            className="w-[180px]"
                        >
                            {getUniqueValues('kvartil').map((kvartil: any) => (
                                <Option key={kvartil} value={kvartil}>{kvartil}</Option>
                            ))}
                        </Select>

                        <Select
                            placeholder="Rieltor"
                            allowClear
                            value={filters.rieltor}
                            onChange={(value) => setFilters(prev => ({ ...prev, rieltor: value }))}
                            className="w-[150px]"
                        >
                            {getUniqueValues('rieltor').map((rieltor: any) => (
                                <Option key={rieltor} value={rieltor}>{rieltor}</Option>
                            ))}
                        </Select>

                        <Select
                            placeholder="Status"
                            allowClear
                            value={filters.status}
                            onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                            className="w-[140px]"
                        >
                            <Option value="waiting">Kutilmoqda</Option>
                            <Option value="processing">Jarayonda</Option>
                            <Option value="posted">Berildi</Option>
                            <Option value="error">Xato</Option>
                        </Select>

                        <Input
                            placeholder="Min narx"
                            type="number"
                            value={filters.minPrice ?? ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value ? Number(e.target.value) : null }))}
                            className="w-[120px]"
                            prefix="$"
                        />
                        <Input
                            placeholder="Max narx"
                            type="number"
                            value={filters.maxPrice ?? ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value ? Number(e.target.value) : null }))}
                            className="w-[120px]"
                            prefix="$"
                        />

                        <Button
                            icon={<ClearOutlined />}
                            onClick={clearFilters}
                            disabled={!Object.values(filters).some(v => v !== null && v !== '')}
                        >
                            Tozalash
                        </Button>
                    </Space>

                    {Object.values(filters).some(v => v !== null && v !== '') && (
                        <Tag color="blue" icon={<FilterOutlined />}>
                            Faol filterlar: {Object.values(filters).filter(v => v !== null && v !== '').length}
                        </Tag>
                    )}
                </Space>
            </div>

            {/* ACTION BUTTONS */}
            <div className="mb-4 flex justify-between items-center bg-white p-3 rounded-lg shadow-sm">
                <Space>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={loadObjects}
                        loading={loading}
                        type="primary"
                    >
                        Yangilash
                    </Button>

                    {queueStatus.queueLength > 0 && (
                        <Tag color="processing" icon={<SyncOutlined spin />} className="text-sm">
                            Navbatda: {queueStatus.queueLength}
                        </Tag>
                    )}
                </Space>

                <Space>
                    <Button
                        type="default"
                        icon={<FolderOpenOutlined/>}
                        onClick={handleDownloadUploads}
                        className="bg-green-500 text-white border-green-500 hover:bg-green-600 hover:border-green-600 hover:text-white"
                    >
                        Uploads Backup (ZIP)
                    </Button>
                </Space>

                <div>
                    <span className="text-gray-500 text-sm">Ko'rsatilmoqda: </span>
                    <span className="font-bold text-lg text-blue-600">
                        {filteredObjects.length}
                    </span>
                    <span className="text-gray-500 text-sm"> / {objects.length}</span>
                </div>
            </div>

            {/* TABLE */}
            <Table
                columns={columns}
                dataSource={filteredObjects}
                rowKey="id"
                loading={loading}
                pagination={tableParams.pagination}
                onChange={handleTableChange}
                scroll={{ x: 1600 }}
                size="small"
                bordered
                rowClassName={(_, index) =>
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                }
            />

            {/* ✅ EDIT MODAL */}
            <Modal
                title={
                    <Space>
                        <EditOutlined />
                        <span>Obyektni tahrirlash</span>
                    </Space>
                }
                open={editModalVisible}
                onCancel={handleEditCancel}
                width={800}
                footer={[
                    <Button key="cancel" onClick={handleEditCancel}>
                        Bekor qilish
                    </Button>,
                    <Button
                        key="save"
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={editLoading}
                        onClick={handleEditSave}
                    >
                        Saqlash
                    </Button>,
                    <Button
                        key="delete"
                        type="default"
                        icon={<SaveOutlined />}
                        loading={editLoading}
                        onClick={handleEditDelete}
                    >
                        Delete
                    </Button>
                ]}
            >
                <Form
                    form={editForm}
                    layout="vertical"
                    className="max-h-[60vh] overflow-y-auto pr-4"
                >
                    <Form.Item
                        label="Kvartil"
                        name="kvartil"
                        rules={[{ required: true, message: 'Kvartilni kiriting!' }]}
                    >
                        <Input placeholder="Yunusobod-5" />
                    </Form.Item>

                    <Form.Item
                        label="X/E/T"
                        name="xet"
                        rules={[{ required: true, message: 'XET ni kiriting!' }]}
                    >
                        <Input placeholder="3/7/9" />
                    </Form.Item>

                    <Form.Item
                        label="Telefon"
                        name="tell"
                    >
                        <Input placeholder="+998901234567" />
                    </Form.Item>

                    <Space className="w-full" size="large">
                        <Form.Item
                            label="Maydon (m²)"
                            name="m2"
                            className="w-[48%]"
                        >
                            <Input placeholder="65" />
                        </Form.Item>

                        <Form.Item
                            label="Narx ($)"
                            name="narx"
                            className="w-[48%]"
                        >
                            <InputNumber
                                placeholder="85000"
                                className="w-full"
                                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={(value: any) => value.replace(/\$\s?|(,*)/g, '')}
                            />
                        </Form.Item>
                    </Space>

                    <Form.Item label="F.I.O" name="fio">
                        <Input placeholder="Familiya Ism" />
                    </Form.Item>

                    <Space className="w-full" size="large">
                        <Form.Item label="Uy turi" name="uy_turi" className="w-[48%]">
                            <Input placeholder="Blok" />
                        </Form.Item>

                        <Form.Item label="Xolati" name="xolati" className="w-[48%]">
                            <Input placeholder="Evroremont" />
                        </Form.Item>
                    </Space>

                    <Space className="w-full" size="large">
                        <Form.Item label="Planirovka" name="planirovka" className="w-[48%]">
                            <Input placeholder="Ajratlangan" />
                        </Form.Item>

                        <Form.Item label="Balkon" name="balkon" className="w-[48%]">
                            <Input placeholder="2 ta" />
                        </Form.Item>
                    </Space>

                    <Space className="w-full" size="large">
                        <Form.Item label="Torets" name="torets" className="w-[48%]">
                            <Input placeholder="Ha" />
                        </Form.Item>

                        <Form.Item label="Dom" name="dom" className="w-[48%]">
                            <Input placeholder="Yangi" />
                        </Form.Item>
                    </Space>

                    <Space className="w-full" size="large">
                        <Form.Item label="Kvartira" name="kvartira" className="w-[48%]">
                            <Input placeholder="Burchak" />
                        </Form.Item>

                        <Form.Item label="Osmotir" name="osmotir" className="w-[48%]">
                            <Input placeholder="2024-12-15 14:00" />
                        </Form.Item>
                    </Space>

                    <Form.Item label="Opisaniya" name="opisaniya">
                        <Input.TextArea rows={4} placeholder="Qo'shimcha ma'lumot..." {...({} as any)} />
                    </Form.Item>

                    <Space className="w-full" size="large">
                        <Form.Item label="Rieltor" name="rieltor" className="w-[48%]">
                            <Input placeholder="Aziz" disabled />
                        </Form.Item>

                        <Form.Item label="Xodim" name="xodim" className="w-[48%]">
                            <Input placeholder="Sarvar" />
                        </Form.Item>
                    </Space>
                </Form>
            </Modal>

            {/* 🤖 AI FLOATING BUTTON */}
            <FloatButton
                icon={<RobotOutlined />}
                type="primary"
                style={{ right: 24, bottom: 24, width: 56, height: 56 }}
                onClick={() => setIsAiOpen(!isAiOpen)}
                tooltip="AI Yordamchi"
            />

            {/* 🤖 AI CHAT WINDOW */}
            {isAiOpen && (
                <Card
                    title={
                        <Space>
                            <RobotOutlined className="text-blue-500" />
                            <span>Maskan lux Asistent AI</span>
                        </Space>
                    }
                    extra={
                        <Button
                            type="text"
                            icon={<CloseOutlined />}
                            onClick={() => setIsAiOpen(false)}
                        />
                    }
                    className="fixed right-6 bottom-24 w-[50%] h-[80%] shadow-2xl z-50 flex flex-col"
                    bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: 'calc(100% - 57px)' }}
                >
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                        {aiMessages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`flex max-w-[95%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
                                    <Avatar
                                        size="small"
                                        icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                                        className={msg.role === 'user' ? 'bg-blue-500' : 'bg-green-500'}
                                    />
                                    <div
                                        className={`p-3 rounded-lg text-sm ${
                                            msg.role === 'user'
                                                ? 'bg-blue-500 text-white rounded-tr-none'
                                                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
                                        }`}
                                    >
                                        {formatMessage(msg.text)}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {aiLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-200 p-3 rounded-lg rounded-tl-none shadow-sm flex items-center gap-2">
                                    <Spin size="small" />
                                    <span className="text-xs text-gray-500">Yozmoqda...</span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t border-gray-200">
                        <Space.Compact style={{ width: '100%' }}>
                            <Input
                                placeholder="Savolingizni yozing..."
                                value={aiInput}
                                onChange={(e) => setAiInput(e.target.value)}
                                onPressEnter={handleAiSend}
                                disabled={aiLoading}
                            />
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                onClick={handleAiSend}
                                loading={aiLoading}
                            />
                        </Space.Compact>
                        <div className="text-[10px] text-gray-400 text-center mt-1">
                            Hozirgi ro'yxat bo'yicha javob beradi
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default ObjectsList;