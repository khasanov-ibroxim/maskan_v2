import { useState, useEffect } from "react";
import { Search, RefreshCw, Upload, Pencil, Trash2, FolderOpen, Megaphone, X, Filter } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
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
import api from "../utils/api";

interface ObjectType {
    id: string;
    kvartil: string;
    xet: string;
    m2: number;
    narx: number;
    turi: string;
    tell: string;
    rieltor: string;
    rasmlar?: string;
    elonStatus?: string;
    opisaniya?: string;
}

interface ObjectsTabProps {
    onCountUpdate?: (count: number) => void;
}

export function ObjectsTab({ onCountUpdate }: ObjectsTabProps) {
    const [objects, setObjects] = useState<ObjectType[]>([]);
    const [filteredObjects, setFilteredObjects] = useState<ObjectType[]>([]);
    const [loading, setLoading] = useState(false);
    const [postingId, setPostingId] = useState<string | null>(null);
    const [queueStatus, setQueueStatus] = useState({ queueLength: 0 });
    const { toast } = useToast();

    // Filters
    const [filters, setFilters] = useState({
        searchText: '',
        id: '',
        kvartil: '',
        rieltor: '',
        status: '',
        minPrice: '',
        maxPrice: ''
    });

    useEffect(() => {
        loadObjects();
        loadQueueStatus();

        // Auto-refresh queue status every 10 minutes
        const interval = setInterval(() => {
            loadQueueStatus();
        }, 600000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        applyFilters();
    }, [objects, filters]);

    useEffect(() => {
        if (onCountUpdate) {
            onCountUpdate(objects.length);
        }
    }, [objects, onCountUpdate]);

    const loadObjects = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/excel/objects');
            if (response.data.success) {
                setObjects(response.data.objects || []);
                toast({
                    title: "Ma'lumotlar yangilandi",
                    description: `${response.data.objects?.length || 0} ta obyekt yuklandi`,
                });
            }
        } catch (error: any) {
            console.error('Error loading objects:', error);
            toast({
                title: "Xato",
                description: error.response?.data?.error || "Obyektlarni yuklashda xato",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const loadQueueStatus = async () => {
        try {
            const response = await api.get('/api/excel/queue-status');
            if (response.data.success) {
                setQueueStatus({ queueLength: response.data.queueLength || 0 });
            }
        } catch (error) {
            console.error('Error loading queue status:', error);
        }
    };

    const applyFilters = () => {
        let filtered = [...objects];

        if (filters.searchText) {
            const searchLower = filters.searchText.toLowerCase();
            filtered = filtered.filter(obj =>
                obj.id?.toLowerCase().includes(searchLower) ||
                obj.kvartil?.toLowerCase().includes(searchLower) ||
                obj.xet?.toLowerCase().includes(searchLower) ||
                obj.tell?.toLowerCase().includes(searchLower) ||
                obj.rieltor?.toLowerCase().includes(searchLower)
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
            filtered = filtered.filter(obj => obj.narx >= Number(filters.minPrice));
        }

        if (filters.maxPrice) {
            filtered = filtered.filter(obj => obj.narx <= Number(filters.maxPrice));
        }

        setFilteredObjects(filtered);
    };

    const handlePostAd = async (objectId: string) => {
        setPostingId(objectId);
        try {
            const response = await api.post('/api/excel/post-ad', { objectId });

            if (response.data.success) {
                toast({
                    title: "Elon navbatga qo'shildi",
                    description: `Navbatda: ${response.data.queuePosition}`,
                });
                await loadObjects();
                await loadQueueStatus();
            }
        } catch (error: any) {
            console.error('Error posting ad:', error);
            toast({
                title: "Xato",
                description: error.response?.data?.error || "Elon berishda xato",
                variant: "destructive"
            });
        } finally {
            setPostingId(null);
        }
    };

    const handleDownloadBackup = async () => {
        try {
            toast({
                title: "Yuklanmoqda...",
                description: "Uploads papka tayyorlanmoqda",
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
                description: "Uploads papka yuklandi",
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

    const clearFilters = () => {
        setFilters({
            searchText: '',
            id: '',
            kvartil: '',
            rieltor: '',
            status: '',
            minPrice: '',
            maxPrice: ''
        });
    };

    const getUniqueValues = (field: keyof ObjectType) => {
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

    const activeFiltersCount = Object.values(filters).filter(v => v !== '').length;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Filters */}
            <div className="admin-card p-4">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Qidirish (kvartil, telefon, rieltor...)"
                            value={filters.searchText}
                            onChange={(e) => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
                            className="pl-10"
                        />
                    </div>

                    <Input
                        placeholder="ID"
                        className="w-28"
                        value={filters.id}
                        onChange={(e) => setFilters(prev => ({ ...prev, id: e.target.value }))}
                    />

                    <Select
                        value={filters.kvartil}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, kvartil: value }))}
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
                        value={filters.rieltor}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, rieltor: value }))}
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
                        value={filters.status}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
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
                        value={filters.minPrice}
                        onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                    />

                    <Input
                        placeholder="Max narx"
                        className="w-28"
                        type="number"
                        value={filters.maxPrice}
                        onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                    />

                    <Button variant="outline" size="sm" onClick={clearFilters}>
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
                        onClick={loadObjects}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
                        {filteredObjects.map((obj, index) => {
                            const isPosted = obj.elonStatus === 'posted';
                            const isPosting = postingId === obj.id;

                            return (
                                <TableRow key={obj.id} className="hover:bg-muted/30">
                                    <TableCell className="text-primary font-medium">{index + 1}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground font-mono">
                                        {obj.id.slice(0, 8)}...
                                    </TableCell>
                                    <TableCell>{obj.kvartil}</TableCell>
                                    <TableCell>{obj.xet}</TableCell>
                                    <TableCell>{obj.m2}</TableCell>
                                    <TableCell className="text-success font-semibold">${obj.narx}</TableCell>
                                    <TableCell>{obj.turi}</TableCell>
                                    <TableCell>{obj.tell}</TableCell>
                                    <TableCell>{obj.rieltor}</TableCell>
                                    <TableCell>{getStatusBadge(obj.elonStatus)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-2">
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
                                                disabled={isPosted || isPosting}
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
        </div>
    );
}