// client/src/components/ObjectsTab.tsx - FULL VERSION
import { useState, useEffect, useMemo } from "react";
import {
    Search, RefreshCw, Upload, Pencil, Trash2, FolderOpen, Megaphone,
    X, Filter, Save, ChevronLeft, ChevronRight
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./ui/table";
import { useToast } from "../hooks/use-toast";
import { useAppStore } from "../stores/useAppStore";
import {
    useObjects,
    useQueueStatus,
    usePostAd,
    useUpdateObject,
    useDeleteObject,
} from "../hooks/useQueries";
import api from "../utils/api";

interface ObjectsTabProps {
    onCountUpdate?: (count: number) => void;
}

interface ObjectFormData {
    kvartil: string;
    xet: string;
    tell: string;
    m2: string;
    narx: string;
    fio: string;
    uy_turi: string;
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
}

export function ObjectsTab({ onCountUpdate }: ObjectsTabProps) {
    const { toast } = useToast();

    // Zustand state
    const {
        objectFilters,
        setObjectFilters,
        clearObjectFilters,
        editingObject,
        setEditingObject,
    } = useAppStore();

    // React Query hooks
    const { data: objects = [], isLoading, refetch: refetchObjects } = useObjects();
    const { data: queueStatus = { queueLength: 0, queue: [] } } = useQueueStatus();

    const postAdMutation = usePostAd();
    const updateObjectMutation = useUpdateObject();
    const deleteObjectMutation = useDeleteObject();

    const [postingId, setPostingId] = useState<string | null>(null);
    const [editModalVisible, setEditModalVisible] = useState(false);

    // ✅ Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // ✅ Edit Form State
    const [formData, setFormData] = useState<ObjectFormData>({
        kvartil: '',
        xet: '',
        tell: '',
        m2: '',
        narx: '',
        fio: '',
        uy_turi: '',
        xolati: '',
        planirovka: '',
        balkon: '',
        torets: '',
        dom: '',
        kvartira: '',
        osmotir: '',
        opisaniya: '',
        rieltor: '',
        xodim: ''
    });

    // Update parent count
    useEffect(() => {
        if (onCountUpdate) {
            onCountUpdate(objects.length);
        }
    }, [objects, onCountUpdate]);

    // Filter objects
    const filteredObjects = useMemo(() => {
        let filtered = [...objects];

        if (objectFilters.searchText) {
            const searchLower = objectFilters.searchText.toLowerCase();
            filtered = filtered.filter(obj =>
                obj.id?.toString().toLowerCase().includes(searchLower) ||
                obj.kvartil?.toLowerCase().includes(searchLower) ||
                obj.xet?.toLowerCase().includes(searchLower) ||
                obj.tell?.toLowerCase().includes(searchLower) ||
                obj.rieltor?.toLowerCase().includes(searchLower) ||
                obj.opisaniya?.toLowerCase().includes(searchLower)
            );
        }

        if (objectFilters.id) {
            filtered = filtered.filter(obj => obj.id?.toString() === objectFilters.id);
        }

        if (objectFilters.kvartil && objectFilters.kvartil !== 'all') {
            filtered = filtered.filter(obj => obj.kvartil === objectFilters.kvartil);
        }

        if (objectFilters.rieltor && objectFilters.rieltor !== 'all') {
            filtered = filtered.filter(obj => obj.rieltor === objectFilters.rieltor);
        }

        if (objectFilters.status && objectFilters.status !== 'all') {
            filtered = filtered.filter(obj => obj.elonStatus === objectFilters.status);
        }

        if (objectFilters.minPrice) {
            filtered = filtered.filter(obj => obj.narx >= Number(objectFilters.minPrice));
        }

        if (objectFilters.maxPrice) {
            filtered = filtered.filter(obj => obj.narx <= Number(objectFilters.maxPrice));
        }

        return filtered;
    }, [objects, objectFilters]);

    // ✅ Paginated Data
    const paginatedObjects = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredObjects.slice(startIndex, endIndex);
    }, [filteredObjects, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredObjects.length / pageSize);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [objectFilters]);

    const handlePostAd = async (objectId: string) => {
        setPostingId(objectId);
        try {
            await postAdMutation.mutateAsync(objectId);
        } finally {
            setPostingId(null);
        }
    };

    // ✅ EDIT FUNCTIONALITY
    const handleEditClick = (record: any) => {
        setEditingObject(record);
        setFormData({
            kvartil: record.kvartil || '',
            xet: record.xet || '',
            tell: record.tell || '',
            m2: record.m2?.toString() || '',
            narx: record.narx?.toString() || '',
            fio: record.fio || '',
            uy_turi: record.uyTuri || '',
            xolati: record.xolati || '',
            planirovka: record.planirovka || '',
            balkon: record.balkon || '',
            torets: record.torets || '',
            dom: record.dom || '',
            kvartira: record.kvartira || '',
            osmotir: record.osmotir || '',
            opisaniya: record.opisaniya || '',
            rieltor: record.rieltor || '',
            xodim: record.xodim || ''
        });
        setEditModalVisible(true);
    };

    const handleEditSave = async () => {
        if (!editingObject) return;

        try {
            const payload = {
                ...formData,
                m2: formData.m2 ? Number(formData.m2) : 0,
                narx: formData.narx ? Number(formData.narx) : 0
            };

            await updateObjectMutation.mutateAsync({
                id: editingObject.id,
                data: payload
            });

            setEditModalVisible(false);
            setEditingObject(null);
        } catch (error) {
            console.error('Edit error:', error);
        }
    };

    const handleEditDelete = async () => {
        if (!editingObject) return;

        if (!confirm(`${editingObject.kvartil} - ${editingObject.xet} obyektini o'chirmoqchimisiz?`)) {
            return;
        }

        try {
            await deleteObjectMutation.mutateAsync(editingObject.id);
            setEditModalVisible(false);
            setEditingObject(null);
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const handleDownloadBackup = async () => {
        try {
            toast({
                title: "Yuklanmoqda...",
                description: "Uploads papka tayyorlanmoqda"
            });

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

            toast({
                title: "Muvaffaqiyatli",
                description: "Uploads papka yuklandi"
            });
        } catch (error: any) {
            console.error('Error downloading backup:', error);
            toast({
                title: "Xato",
                description: error.response?.data?.error || "Yuklashda xato",
                variant: "destructive"
            });
        }
    };

    const openFolder = (url?: string) => {
        if (!url || url === "Yo'q") {
            toast({
                title: "Fayl topilmadi",
                variant: "destructive"
            });
            return;
        }
        window.open(url, '_blank');
    };

    const getUniqueValues = (field: keyof typeof objects[0]) => {
        const values = objects.map(obj => obj[field]).filter(Boolean);
        return [...new Set(values)] as string[];
    };

    const getStatusBadge = (status?: string) => {
        const config: Record<string, { color: string; label: string }> = {
            waiting: { color: 'border-yellow-500 text-yellow-700', label: 'Kutilmoqda' },
            processing: { color: 'border-blue-500 text-blue-700', label: 'Jarayonda' },
            posted: { color: 'border-green-500 text-green-700', label: 'Berildi' },
            error: { color: 'border-red-500 text-red-700', label: 'Xato' }
        };

        const conf = config[status || ''] || { color: 'border-gray-500 text-gray-700', label: status || '-' };

        return (
            <Badge variant="outline" className={conf.color}>
                {conf.label}
            </Badge>
        );
    };

    const activeFiltersCount = Object.values(objectFilters).filter(v => v !== '' && v !== 'all').length;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Filters */}
            <div className="admin-card p-4">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Qidirish (kvartil, telefon, rieltor...)"
                            value={objectFilters.searchText}
                            onChange={(e) => setObjectFilters({ searchText: e.target.value })}
                            className="pl-10"
                        />
                    </div>

                    <Input
                        placeholder="ID"
                        className="w-28"
                        value={objectFilters.id}
                        onChange={(e) => setObjectFilters({ id: e.target.value })}
                    />

                    <Select
                        value={objectFilters.kvartil || 'all'}
                        onValueChange={(value) => setObjectFilters({ kvartil: value === 'all' ? '' : value })}
                    >
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="Kvartil" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Barchasi</SelectItem>
                            {getUniqueValues('kvartil').map(kvartil => (
                                <SelectItem key={kvartil} value={kvartil}>{kvartil}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={objectFilters.rieltor || 'all'}
                        onValueChange={(value) => setObjectFilters({ rieltor: value === 'all' ? '' : value })}
                    >
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="Rieltor" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Barchasi</SelectItem>
                            {getUniqueValues('rieltor').map(rieltor => (
                                <SelectItem key={rieltor} value={rieltor}>{rieltor}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={objectFilters.status || 'all'}
                        onValueChange={(value) => setObjectFilters({ status: value === 'all' ? '' : value })}
                    >
                        <SelectTrigger className="w-28">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Barchasi</SelectItem>
                            <SelectItem value="waiting">Kutilmoqda</SelectItem>
                            <SelectItem value="processing">Jarayonda</SelectItem>
                            <SelectItem value="posted">Berildi</SelectItem>
                            <SelectItem value="error">Xato</SelectItem>
                        </SelectContent>
                    </Select>

                    <Input
                        placeholder="Min narx"
                        className="w-28"
                        type="number"
                        value={objectFilters.minPrice}
                        onChange={(e) => setObjectFilters({ minPrice: e.target.value })}
                    />

                    <Input
                        placeholder="Max narx"
                        className="w-28"
                        type="number"
                        value={objectFilters.maxPrice}
                        onChange={(e) => setObjectFilters({ maxPrice: e.target.value })}
                    />

                    <Button variant="outline" size="sm" onClick={clearObjectFilters}>
                        Tozalash
                    </Button>

                    {activeFiltersCount > 0 && (
                        <Badge variant="outline" className="border-primary text-primary">
                            <Filter className="h-3 w-3 mr-1" />
                            {activeFiltersCount}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
                <div className="flex gap-3">
                    <Button
                        className="bg-primary hover:bg-primary/80"
                        onClick={() => refetchObjects()}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Yangilash
                    </Button>
                    <Button
                        className="bg-[#F59F0A] hover:bg-[#F59F0A]/80"
                        onClick={handleDownloadBackup}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Uploads Backup (ZIP)
                    </Button>

                    {queueStatus.queueLength > 0 && (
                        <Badge variant="outline" className="border-blue-500 text-blue-700">
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            Navbatda: {queueStatus.queueLength}
                        </Badge>
                    )}
                </div>
                <span className="text-sm text-muted-foreground">
                    Ko'rsatilmoqda: <strong>{filteredObjects.length}</strong> / {objects.length}
                </span>
            </div>

            {/* Table */}
            <div className="admin-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-12">№</TableHead>
                            <TableHead className="w-32">ID</TableHead>
                            <TableHead>Kvartil</TableHead>
                            <TableHead>X/E/T</TableHead>
                            <TableHead>M²</TableHead>
                            <TableHead>Narx ($)</TableHead>
                            <TableHead>Turi</TableHead>
                            <TableHead>Telefon</TableHead>
                            <TableHead>Rieltor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Amallar</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedObjects.map((obj: any, index: number) => {
                            const isPosted = obj.elonStatus === 'posted';
                            const isPosting = postingId === obj.id;
                            const globalIndex = (currentPage - 1) * pageSize + index + 1;

                            return (
                                <TableRow key={obj.id} className="hover:bg-muted/30">
                                    <TableCell className="text-primary font-medium">{globalIndex}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground font-mono">
                                        {obj.id.toString().slice(0, 8)}...
                                    </TableCell>
                                    <TableCell>{obj.kvartil}</TableCell>
                                    <TableCell>{obj.xet}</TableCell>
                                    <TableCell>{obj.m2}</TableCell>
                                    <TableCell className="text-success font-semibold">${obj.narx}</TableCell>
                                    <TableCell>{obj.sheet_type}</TableCell>
                                    <TableCell>{obj.tell}</TableCell>
                                    <TableCell>{obj.rieltor}</TableCell>
                                    <TableCell>{getStatusBadge(obj.elonStatus)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                className="p-1.5 rounded hover:bg-muted transition-colors"
                                                onClick={() => handleEditClick(obj)}
                                            >
                                                <Pencil className="h-4 w-4 text-muted-foreground" />
                                            </button>
                                            <button
                                                className="p-1.5 rounded hover:bg-muted transition-colors"
                                                onClick={() => openFolder(obj.rasmlar)}
                                                disabled={!obj.rasmlar || obj.rasmlar === "Yo'q"}
                                            >
                                                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                            </button>
                                            <Button
                                                size="sm"
                                                className="bg-primary hover:bg-primary/80 h-7 px-2"
                                                onClick={() => handlePostAd(obj.id)}
                                                disabled={isPosted || isPosting || postAdMutation.isPending}
                                            >
                                                {isPosting ? (
                                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                                ) : isPosted ? (
                                                    '✓'
                                                ) : (
                                                    <>
                                                        <Megaphone className="h-3 w-3 mr-1" />
                                                        E'lon
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* ✅ Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between admin-card p-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            Sahifa {currentPage} / {totalPages}
                        </span>
                        <Select
                            value={pageSize.toString()}
                            onValueChange={(value) => {
                                setPageSize(Number(value));
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="w-24">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                                <SelectItem value="200">200</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
                            {(currentPage - 1) * pageSize + 1}-
                            {Math.min(currentPage * pageSize, filteredObjects.length)} / {filteredObjects.length}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* ✅ EDIT MODAL */}
            {editModalVisible && editingObject && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">Obyektni tahrirlash</h2>
                            <button onClick={() => setEditModalVisible(false)}>
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Kvartil *</Label>
                                    <Input
                                        value={formData.kvartil}
                                        onChange={(e) => setFormData({ ...formData, kvartil: e.target.value })}
                                        placeholder="Yunusobod-5"
                                    />
                                </div>
                                <div>
                                    <Label>X/E/T *</Label>
                                    <Input
                                        value={formData.xet}
                                        onChange={(e) => setFormData({ ...formData, xet: e.target.value })}
                                        placeholder="3/7/9"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Telefon</Label>
                                    <Input
                                        value={formData.tell}
                                        onChange={(e) => setFormData({ ...formData, tell: e.target.value })}
                                        placeholder="+998901234567"
                                    />
                                </div>
                                <div>
                                    <Label>Maydon (m²)</Label>
                                    <Input
                                        type="number"
                                        value={formData.m2}
                                        onChange={(e) => setFormData({ ...formData, m2: e.target.value })}
                                        placeholder="65"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Narx ($)</Label>
                                    <Input
                                        type="number"
                                        value={formData.narx}
                                        onChange={(e) => setFormData({ ...formData, narx: e.target.value })}
                                        placeholder="85000"
                                    />
                                </div>
                                <div>
                                    <Label>F.I.O</Label>
                                    <Input
                                        value={formData.fio}
                                        onChange={(e) => setFormData({ ...formData, fio: e.target.value })}
                                        placeholder="Familiya Ism"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Uy turi</Label>
                                    <Select
                                        value={formData.uy_turi}
                                        onValueChange={(value) => setFormData({ ...formData, uy_turi: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tanlang" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Blok">Blok</SelectItem>
                                            <SelectItem value="Panel">Panel</SelectItem>
                                            <SelectItem value="G'isht">G'isht</SelectItem>
                                            <SelectItem value="Monоlit">Monоlit</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Xolati</Label>
                                    <Select
                                        value={formData.xolati}
                                        onValueChange={(value) => setFormData({ ...formData, xolati: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tanlang" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Evroremont">Evroremont</SelectItem>
                                            <SelectItem value="Oddiy remont">Oddiy remont</SelectItem>
                                            <SelectItem value="Ta'mirsiz">Ta'mirsiz</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Planirovka</Label>
                                    <Select
                                        value={formData.planirovka}
                                        onValueChange={(value) => setFormData({ ...formData, planirovka: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tanlang" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Ajratlangan">Ajratlangan</SelectItem>
                                            <SelectItem value="Smejniy">Smejniy</SelectItem>
                                            <SelectItem value="Chexol">Chexol</SelectItem>
                                            <SelectItem value="Student">Student</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Balkon</Label>
                                    <Select
                                        value={formData.balkon}
                                        onValueChange={(value) => setFormData({ ...formData, balkon: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tanlang" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Yo'q">Yo'q</SelectItem>
                                            <SelectItem value="1 ta">1 ta</SelectItem>
                                            <SelectItem value="2 ta">2 ta</SelectItem>
                                            <SelectItem value="3 ta">3 ta</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Torets</Label>
                                    <Select
                                        value={formData.torets}
                                        onValueChange={(value) => setFormData({ ...formData, torets: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tanlang" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Yo'q">Yo'q</SelectItem>
                                            <SelectItem value="Ha">Ha</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Dom</Label>
                                    <Input
                                        value={formData.dom}
                                        onChange={(e) => setFormData({ ...formData, dom: e.target.value })}
                                        placeholder="Yangi"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Kvartira</Label>
                                    <Input
                                        value={formData.kvartira}
                                        onChange={(e) => setFormData({ ...formData, kvartira: e.target.value })}
                                        placeholder="Burchak"
                                    />
                                </div>
                                <div>
                                    <Label>Osmotir</Label>
                                    <Input
                                        value={formData.osmotir}
                                        onChange={(e) => setFormData({ ...formData, osmotir: e.target.value })}
                                        placeholder="2024-12-15 14:00"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label>Opisaniya</Label>
                                <Input
                                    value={formData.opisaniya}
                                    onChange={(e) => setFormData({ ...formData, opisaniya: e.target.value })}
                                    placeholder="Qo'shimcha ma'lumot..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Rieltor</Label>
                                    <Input
                                        value={formData.rieltor}
                                        onChange={(e) => setFormData({ ...formData, rieltor: e.target.value })}
                                        placeholder="Aziz"
                                        disabled
                                    />
                                </div>
                                <div>
                                    <Label>Xodim</Label>
                                    <Input
                                        value={formData.xodim}
                                        onChange={(e) => setFormData({ ...formData, xodim: e.target.value })}
                                        placeholder="Sarvar"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button
                                    onClick={handleEditSave}
                                    className="flex-1"
                                    disabled={updateObjectMutation.isPending}
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    Saqlash
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleEditDelete}
                                    disabled={deleteObjectMutation.isPending}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    O'chirish
                                </Button>
                                <Button variant="outline" onClick={() => setEditModalVisible(false)}>
                                    Bekor qilish
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ObjectsTab;