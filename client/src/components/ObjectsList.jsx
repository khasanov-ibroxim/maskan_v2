// client/src/components/ObjectsList.jsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, message, Tooltip, Input, Select } from 'antd';
import {
    FolderOpenOutlined,
    ShopOutlined,
    ReloadOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    SyncOutlined,
    SearchOutlined,
    FilterOutlined,
    ClearOutlined
} from '@ant-design/icons';
import api from '../utils/api.jsx';

const { Search } = Input;
const { Option } = Select;

const ObjectsList = () => {
    const [objects, setObjects] = useState([]);
    const [filteredObjects, setFilteredObjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [queueStatus, setQueueStatus] = useState({ queue: [], queueLength: 0 });
    const [postingId, setPostingId] = useState(null);

    // ✅ Filter state
    const [filters, setFilters] = useState({
        searchText: '',
        kvartil: null,
        rieltor: null,
        status: null,
        minPrice: null,
        maxPrice: null
    });

    // ✅ Table filters & sorters state
    const [tableParams, setTableParams] = useState({
        pagination: {
            current: 1,
            pageSize: 20,
            total: 0,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['10', '20', '50', '100', '200'],
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`
        },
        filters: {},
        sorter: {}
    });

    useEffect(() => {
        loadObjects();
        loadQueueStatus();

        // ✅ 10 minutda 1 marta (600000ms)
        const interval = setInterval(() => {
            console.log('🔄 Auto-refresh queue status (10 min)');
            loadQueueStatus();
        }, 600000);

        return () => clearInterval(interval);
    }, []);

    // ✅ Objects yoki filters o'zgarganda filterlash
    useEffect(() => {
        applyFilters();
    }, [objects, filters]);

    const applyFilters = () => {
        let filtered = [...objects];

        // Search filter
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

        // ID filter
        if (filters.id) {
            filtered = filtered.filter(obj => obj.id === filters.id);
        }
        // Kvartil filter
        if (filters.kvartil) {
            filtered = filtered.filter(obj => obj.kvartil === filters.kvartil);
        }

        // Rieltor filter
        if (filters.rieltor) {
            filtered = filtered.filter(obj => obj.rieltor === filters.rieltor);
        }

        // Status filter
        if (filters.status) {
            filtered = filtered.filter(obj => obj.elonStatus === filters.status);
        }

        // Price range filter
        if (filters.minPrice) {
            filtered = filtered.filter(obj => obj.narx >= filters.minPrice);
        }
        if (filters.maxPrice) {
            filtered = filtered.filter(obj => obj.narx <= filters.maxPrice);
        }

        setFilteredObjects(filtered);

        // ✅ Pagination total'ni yangilash, lekin current page'ni SAQLASH
        setTableParams(prev => ({
            ...prev,
            pagination: {
                ...prev.pagination,
                total: filtered.length
                // current va pageSize SAQLANADI!
            }
        }));
    };

    const handleDownloadUploads = async () => {
        try {
            message.loading('Uploads papka yuklanmoqda... (Bu biroz vaqt olishi mumkin)', 0);

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

        } catch (error) {
            message.destroy();
            console.error('Uploads yuklab olishda xato:', error);
            message.error('Xato: ' + (error.response?.data?.error || error.message));
        }
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

    const handlePostAd = async (objectId) => {
        console.log('🔍 Post Ad called:', objectId);
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
        } catch (error) {
            console.error('Elon berishda xato:', error);
            message.error(error.response?.data?.error || 'Elon berishda xato');
        } finally {
            setPostingId(null);
        }
    };

    const openFolder = (url) => {
        if (!url || url === "Yo'q") {
            message.warning('Fayl topilmadi');
            return;
        }
        window.open(url, '_blank');
    };

    const getStatusTag = (status) => {
        const statusConfig = {
            waiting: { color: 'default', icon: <ClockCircleOutlined />, text: 'Kutilmoqda' },
            processing: { color: 'processing', icon: <SyncOutlined spin />, text: 'Jarayonda' },
            posted: { color: 'success', icon: <CheckCircleOutlined />, text: 'Berildi' },
            error: { color: 'error', icon: <ClockCircleOutlined />, text: 'Xato' }
        };

        const config = statusConfig[status] || statusConfig.waiting;
        return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
    };

    // ✅ Pagination/Filter/Sorter o'zgarganda
    const handleTableChange = (pagination, filters, sorter) => {
        console.log('📄 Table changed:', { pagination, filters, sorter });

        setTableParams({
            pagination,
            filters,
            sorter
        });
    };

    // ✅ Filterlarni tozalash
    const clearFilters = () => {
        setFilters({
            searchText: '',
            kvartil: null,
            rieltor: null,
            status: null,
            minPrice: null,
            maxPrice: null
        });

        // ✅ Pagination'ni birinchi sahifaga qaytarish
        setTableParams(prev => ({
            ...prev,
            pagination: {
                ...prev.pagination,
                current: 1
            }
        }));

        message.success('Filterlar tozalandi');
    };

    // ✅ Unique values olish
    const getUniqueValues = (key) => {
        return [...new Set(objects.map(obj => obj[key]).filter(Boolean))].sort();
    };

    const columns = [
        {
            title: '№',
            key: 'index',
            width: 60,
            fixed: 'left',
            render: (_, __, index) => {
                return (tableParams.pagination.current - 1) * tableParams.pagination.pageSize + index + 1;
            }
        },
        {
            title: 'Kvartil',
            dataIndex: 'kvartil',
            key: 'kvartil',
            width: 180,
            fixed: 'left',
            sorter: (a, b) => (a.kvartil || '').localeCompare(b.kvartil || '')
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
            sorter: (a, b) => (a.m2 || 0) - (b.m2 || 0)
        },
        {
            title: 'Narx ($)',
            dataIndex: 'narx',
            key: 'narx',
            width: 120,
            render: (narx) => (
                <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                    ${narx?.toLocaleString()}
                </span>
            ),
            sorter: (a, b) => (a.narx || 0) - (b.narx || 0)
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
            render: (_, record) => getStatusTag(record.elonStatus)
        },
        {
            title: 'Amallar',
            key: 'actions',
            width: 180,
            fixed: 'right',
            render: (_, record) => {
                const isInQueue = queueStatus.queue.includes(record.id);
                const isPosted = record.elonStatus === 'posted';
                const isPosting = postingId === record.id || isInQueue;

                return (
                    <Space size="small">
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
        <div style={{ padding: '20px' }}>
            {/* ✅ FILTER PANEL */}
            <div style={{
                marginBottom: 16,
                background: '#f5f5f5',
                padding: '16px',
                borderRadius: '8px'
            }}>
                <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space wrap>
                        {/* Search */}
                        <Search
                            placeholder="Qidirish (kvartil, telefon, rieltor...)"
                            allowClear
                            value={filters.searchText}
                            onChange={(e) => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
                            style={{ width: 300 }}
                            prefix={<SearchOutlined />}
                        />
                        <Input
                            placeholder="ID"
                            type="text"
                            value={filters.id}
                            onChange={(e) => setFilters(prev => ({ ...prev, id: e.target.value ? e.target.value : null }))}
                            style={{ width: 120 }}
                        />
                        {/* Kvartil filter */}
                        <Select
                            placeholder="Kvartil"
                            allowClear
                            value={filters.kvartil}
                            onChange={(value) => setFilters(prev => ({ ...prev, kvartil: value }))}
                            style={{ width: 180 }}
                        >
                            {getUniqueValues('kvartil').map(kvartil => (
                                <Option key={kvartil} value={kvartil}>{kvartil}</Option>
                            ))}
                        </Select>

                        {/* Rieltor filter */}
                        <Select
                            placeholder="Rieltor"
                            allowClear
                            value={filters.rieltor}
                            onChange={(value) => setFilters(prev => ({ ...prev, rieltor: value }))}
                            style={{ width: 150 }}
                        >
                            {getUniqueValues('rieltor').map(rieltor => (
                                <Option key={rieltor} value={rieltor}>{rieltor}</Option>
                            ))}
                        </Select>

                        {/* Status filter */}
                        <Select
                            placeholder="Status"
                            allowClear
                            value={filters.status}
                            onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                            style={{ width: 140 }}
                        >
                            <Option value="waiting">Kutilmoqda</Option>
                            <Option value="processing">Jarayonda</Option>
                            <Option value="posted">Berildi</Option>
                            <Option value="error">Xato</Option>
                        </Select>

                        {/* Price range */}
                        <Input
                            placeholder="Min narx"
                            type="number"
                            value={filters.minPrice}
                            onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value ? Number(e.target.value) : null }))}
                            style={{ width: 120 }}
                            prefix="$"
                        />
                        <Input
                            placeholder="Max narx"
                            type="number"
                            value={filters.maxPrice}
                            onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value ? Number(e.target.value) : null }))}
                            style={{ width: 120 }}
                            prefix="$"
                        />

                        {/* Clear filters */}
                        <Button
                            icon={<ClearOutlined />}
                            onClick={clearFilters}
                            disabled={!Object.values(filters).some(v => v !== null && v !== '')}
                        >
                            Tozalash
                        </Button>
                    </Space>

                    {/* Active filters count */}
                    {Object.values(filters).some(v => v !== null && v !== '') && (
                        <Tag color="blue" icon={<FilterOutlined />}>
                            Faol filterlar: {Object.values(filters).filter(v => v !== null && v !== '').length}
                        </Tag>
                    )}
                </Space>
            </div>

            {/* ✅ ACTION BUTTONS */}
            <div style={{
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#fff',
                padding: '12px 16px',
                borderRadius: '8px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
            }}>
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
                        <Tag color="processing" icon={<SyncOutlined spin />} style={{ fontSize: 14 }}>
                            Navbatda: {queueStatus.queueLength}
                        </Tag>
                    )}
                </Space>

                <Space>
                    <Button
                        type="default"
                        icon={<FolderOpenOutlined/>}
                        onClick={handleDownloadUploads}
                        style={{
                            background: '#52c41a',
                            color: 'white',
                            borderColor: '#52c41a'
                        }}
                    >
                        Uploads Backup (ZIP)
                    </Button>
                </Space>

                <div>
                    <span style={{ color: '#666', fontSize: 14 }}>Ko'rsatilmoqda: </span>
                    <span style={{ fontWeight: 'bold', fontSize: 16, color: '#1890ff' }}>
                        {filteredObjects.length}
                    </span>
                    <span style={{ color: '#666', fontSize: 14 }}> / {objects.length}</span>
                </div>
            </div>

            {/* ✅ TABLE */}
            <Table
                columns={columns}
                dataSource={filteredObjects}
                rowKey="id"
                loading={loading}
                pagination={tableParams.pagination}
                onChange={handleTableChange}
                scroll={{ x: 1400 }}
                size="small"
                bordered
                rowClassName={(record, index) =>
                    index % 2 === 0 ? 'table-row-light' : 'table-row-dark'
                }
            />
        </div>
    );
};

export default ObjectsList;
