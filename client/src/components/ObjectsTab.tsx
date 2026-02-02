// client/src/components/ObjectsTab.tsx (OPTIMIZED VERSION)
import { useState, useEffect, useMemo } from "react";
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

export function ObjectsTab({ onCountUpdate }: ObjectsTabProps) {
    const { toast } = useToast();

    // Zustand state
    const {
        objectFilters,
        setObjectFilters,
        clearObjectFilters,
        objectModalVisible,
        setObjectModalVisible,
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
                obj.id?.toLowerCase().includes(searchLower) ||
                obj.kvartil?.toLowerCase().includes(searchLower) ||
                obj.xet?.toLowerCase().includes(searchLower) ||
                obj.tell?.toLowerCase().includes(searchLower) ||
                obj.rieltor?.toLowerCase().includes(searchLower)
            );
        }

        if (objectFilters.id) {
            filtered = filtered.filter(obj => obj.id === objectFilters.id);
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

    const handlePostAd = async (objectId: string) => {
        setPostingId(objectId);
        try {
            await postAdMutation.mutateAsync(objectId);
        } finally {
            setPostingId(null);
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
                        {filteredObjects.map((obj: any, index: number) => {
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
        </div>
    );
}

export default ObjectsTab;