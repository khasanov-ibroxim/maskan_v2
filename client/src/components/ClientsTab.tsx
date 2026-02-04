// client/src/components/ClientsTab.tsx - FULL FUNCTIONAL VERSION
import { useState, useEffect } from "react";
import {
    Search, RefreshCw, Plus, Pencil, Trash2, User, Home, Phone,
    MapPin, X, Eye, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
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
import { Badge } from "./ui/badge";
import { useToast } from "../hooks/use-toast";
import { useAppStore } from "../stores/useAppStore";
import {
    useClients,
    useRealtorsQuery,
    useCreateClient,
    useUpdateClient,
    useDeleteClient,
    useAssignRealtor,
    useCascaderDataQuery,
} from "../hooks/useQueries";
import api from "../utils/api";

interface ClientFormData {
    fullName: string;
    phone: string;
    rooms: number[];
    floorMin: number | null;
    floorMax: number | null;
    totalFloorsMin: number | null;
    totalFloorsMax: number | null;
    priceMin: number | null;
    priceMax: number | null;
    notes: string;
    preferredLocations: Array<{ tuman: string; kvartils: string[] }>;
}

interface ClientsTabProps {
    onRefresh?: () => void;
}

export function ClientsTab({ onRefresh }: ClientsTabProps) {
    const { toast } = useToast();

    // Zustand state
    const {
        clientModalVisible,
        setClientModalVisible,
        editingClient,
        setEditingClient,
        clientFilters,
        setClientFilters,
    } = useAppStore();

    // React Query hooks
    const { data: clients = [], isLoading: clientsLoading, refetch: refetchClients } = useClients();
    const { data: realtors = [] } = useRealtorsQuery();
    const { data: cascaderData = [] } = useCascaderDataQuery();

    const createClientMutation = useCreateClient();
    const updateClientMutation = useUpdateClient();
    const deleteClientMutation = useDeleteClient();
    const assignRealtorMutation = useAssignRealtor();

    // ✅ NEW: Matches & Assigned Objects state
    const [matchesDrawerVisible, setMatchesDrawerVisible] = useState(false);
    const [assignedObjectsModalVisible, setAssignedObjectsModalVisible] = useState(false);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [matches, setMatches] = useState<any[]>([]);
    const [assignedObjects, setAssignedObjects] = useState<any[]>([]);

    // Local form state
    const [formData, setFormData] = useState<ClientFormData>({
        fullName: '',
        phone: '',
        rooms: [],
        floorMin: null,
        floorMax: null,
        totalFloorsMin: null,
        totalFloorsMax: null,
        priceMin: null,
        priceMax: null,
        notes: '',
        preferredLocations: []
    });

    // ✅ NEW: Cascader value state
    const [cascaderValue, setCascaderValue] = useState<string[][]>([]);

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
            notes: '',
            preferredLocations: []
        });
        setCascaderValue([]);
        setClientModalVisible(true);
    };

    const handleEdit = (client: any) => {
        setEditingClient(client);

        // ✅ Transform preferredLocations for Cascader
        let cascaderValue: string[][] = [];
        if (client.preferred_locations && Array.isArray(client.preferred_locations)) {
            cascaderValue = client.preferred_locations.map((loc: any) => {
                if (loc.kvartils && loc.kvartils.length > 0) {
                    return [loc.tuman, loc.kvartils[0]];
                } else {
                    return [loc.tuman];
                }
            });
        }

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
            notes: client.notes || '',
            preferredLocations: client.preferred_locations || []
        });

        setCascaderValue(cascaderValue);
        setClientModalVisible(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Clientni o'chirmoqchimisiz?")) return;

        await deleteClientMutation.mutateAsync(id);
        onRefresh?.();
    };

    const handleSubmit = async () => {
        if (!formData.fullName || !formData.phone) {
            toast({
                title: "Xato",
                description: "Ism va telefon majburiy!",
                variant: "destructive"
            });
            return;
        }

        if (!/^\+998\d{9}$/.test(formData.phone)) {
            toast({
                title: "Xato",
                description: "Telefon formatida xato! (+998XXXXXXXXX)",
                variant: "destructive"
            });
            return;
        }

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
            notes: formData.notes,
            preferredLocations: formData.preferredLocations || []
        };

        if (editingClient) {
            await updateClientMutation.mutateAsync({ id: editingClient.id, data: payload });
        } else {
            await createClientMutation.mutateAsync(payload);
        }

        setClientModalVisible(false);
        setCascaderValue([]);
        onRefresh?.();
    };

    const handleAssignRealtor = async (clientId: string, realtorId: string) => {
        const assignId = realtorId === "none" ? null : realtorId;
        await assignRealtorMutation.mutateAsync({ clientId, realtorId: assignId });
    };

    const handlePhoneChange = (value: string) => {
        let input = value.replace(/\D/g, '');
        if (!input.startsWith('998')) input = '998' + input;
        let formatted = '+' + input.substring(0, 12);
        setFormData({ ...formData, phone: formatted });
    };

    // ✅ NEW: Find matches functionality
    const handleFindMatches = async (client: any) => {
        try {
            setSelectedClient(client);
            setMatchesDrawerVisible(true);

            const response = await api.get(`/api/clients/${client.id}/matches`);
            if (response.data.success) {
                setMatches(response.data.data);
            }
        } catch (error) {
            toast({
                title: "Xato",
                description: "Qidirishda xato",
                variant: "destructive"
            });
        }
    };

    // ✅ NEW: Assign object to client
    const handleAssignObject = async (clientId: string, objectId: string) => {
        try {
            await api.post(`/api/clients/${clientId}/assign-object`, { objectId });
            toast({
                title: "Muvaffaqiyatli",
                description: "Obyekt biriktirildi"
            });
            refetchClients();
        } catch (error) {
            toast({
                title: "Xato",
                description: "Xato yuz berdi",
                variant: "destructive"
            });
        }
    };

    // ✅ NEW: Show assigned objects
    const handleShowAssignedObjects = async (client: any) => {
        try {
            setSelectedClient(client);
            setAssignedObjectsModalVisible(true);

            const response = await api.get(`/api/clients/${client.id}/assigned-objects`);
            if (response.data.success) {
                setAssignedObjects(response.data.data);
            }
        } catch (error) {
            toast({
                title: "Xato",
                description: "Obyektlarni yuklashda xato",
                variant: "destructive"
            });
        }
    };

    // ✅ NEW: Unassign object
    const handleUnassignObject = async (clientId: string, objectId: string) => {
        try {
            await api.post(`/api/clients/${clientId}/unassign-object`, { objectId });
            toast({
                title: "Muvaffaqiyatli",
                description: "Obyekt ajratildi"
            });

            // Refresh assigned objects
            const response = await api.get(`/api/clients/${clientId}/assigned-objects`);
            if (response.data.success) {
                setAssignedObjects(response.data.data);
            }

            refetchClients();
        } catch (error) {
            toast({
                title: "Xato",
                description: "Xato yuz berdi",
                variant: "destructive"
            });
        }
    };

    // ✅ NEW: Handle location changes (Cascader simulation)
    const handleLocationChange = (locations: string[][]) => {
        setCascaderValue(locations);

        const newLocations = locations.map(([tuman, kvartil]) => ({
            tuman: tuman,
            kvartils: kvartil ? [kvartil] : []
        }));

        setFormData({
            ...formData,
            preferredLocations: newLocations
        });
    };

    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id);
        toast({
            title: "Muvaffaqiyatli",
            description: "ID nusxalandi"
        });
    };

    const filteredClients = clients.filter((client: any) =>
        client.full_name.toLowerCase().includes(clientFilters.searchText.toLowerCase()) ||
        client.phone.includes(clientFilters.searchText)
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Filters */}
            <div className="admin-card p-4">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Qidirish (ism, telefon...)"
                            value={clientFilters.searchText}
                            onChange={(e) => setClientFilters({ searchText: e.target.value })}
                            className="pl-10"
                        />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setClientFilters({ searchText: "" })}>
                        Tozalash
                    </Button>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
                <div className="flex gap-3">
                    <Button className="bg-primary hover:bg-primary/80" onClick={handleAdd}>
                        <Plus className="h-4 w-4 mr-2" />
                        Yangi Client
                    </Button>
                    <Button className="bg-primary hover:bg-primary/80" onClick={() => refetchClients()} disabled={clientsLoading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${clientsLoading ? 'animate-spin' : ''}`} />
                        Yangilash
                    </Button>
                </div>
                <span className="text-sm text-muted-foreground">
                    Jami: <strong>{filteredClients.length}</strong>
                </span>
            </div>

            {/* Table */}
            <div className="admin-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead>F.I.O</TableHead>
                            <TableHead>Telefon</TableHead>
                            <TableHead>Xonalar</TableHead>
                            <TableHead>Narx oralig'i</TableHead>
                            <TableHead>Manzillar</TableHead>
                            <TableHead>Rieltor</TableHead>
                            <TableHead>Biriktirilgan uylar</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Amallar</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredClients.map((client: any) => (
                            <TableRow key={client.id} className="hover:bg-muted/30">
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <strong>{client.full_name}</strong>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        {client.phone}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        {(client.rooms || []).map((r: number) => (
                                            <Badge key={r} variant="outline" className="border-primary text-primary">
                                                {r}-xona
                                            </Badge>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {client.price_min && client.price_max ? (
                                        <div className="text-sm">
                                            <div>${client.price_min.toLocaleString()}</div>
                                            <div className="text-muted-foreground">- ${client.price_max.toLocaleString()}</div>
                                        </div>
                                    ) : '-'}
                                </TableCell>
                                <TableCell>
                                    {client.preferred_locations && client.preferred_locations.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {client.preferred_locations.slice(0, 2).map((loc: any, idx: number) => (
                                                <Badge key={idx} variant="outline" className="border-purple-500 text-purple-700">
                                                    <MapPin className="h-3 w-3 mr-1" />
                                                    {loc.tuman}
                                                    {loc.kvartils && loc.kvartils.length > 0 && (
                                                        <span className="text-xs ml-1">({loc.kvartils.join(', ')})</span>
                                                    )}
                                                </Badge>
                                            ))}
                                            {client.preferred_locations.length > 2 && (
                                                <Badge variant="outline">+{client.preferred_locations.length - 2}</Badge>
                                            )}
                                        </div>
                                    ) : (
                                        <Badge variant="outline">Belgilanmagan</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Select
                                        value={client.assigned_realtor_id || "none"}
                                        onValueChange={(value) => handleAssignRealtor(client.id, value)}
                                        disabled={assignRealtorMutation.isPending}
                                    >
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Rieltor tanlang" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Bo'sh</SelectItem>
                                            {realtors.map((r: any) => (
                                                <SelectItem key={r.id} value={r.id}>
                                                    {r.full_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className={`${(client.assigned_objects || []).length > 0 ? 'border-primary text-primary' : ''}`}
                                        onClick={() => handleShowAssignedObjects(client)}
                                    >
                                        <Home className="h-3 w-3 mr-1" />
                                        {(client.assigned_objects || []).length} ta uy
                                    </Button>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={
                                        client.status === 'active'
                                            ? 'border-success text-success'
                                            : 'border-muted-foreground'
                                    }>
                                        {client.status === 'active' ? 'Faol' : 'Faol emas'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleFindMatches(client)}
                                        >
                                            <Search className="h-3 w-3 mr-1" />
                                            Topish
                                        </Button>
                                        <button
                                            className="p-1.5 rounded hover:bg-muted transition-colors"
                                            onClick={() => handleEdit(client)}
                                        >
                                            <Pencil className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                        <button
                                            className="p-1.5 rounded hover:bg-muted transition-colors"
                                            onClick={() => handleDelete(client.id)}
                                            disabled={deleteClientMutation.isPending}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Client Modal */}
            {clientModalVisible && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">
                                {editingClient ? 'Client Tahrirlash' : 'Yangi Client'}
                            </h2>
                            <button onClick={() => setClientModalVisible(false)}>
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label>To'liq ism *</Label>
                                <Input
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    placeholder="Ali Valiyev"
                                />
                            </div>

                            <div>
                                <Label>Telefon raqam *</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => handlePhoneChange(e.target.value)}
                                    placeholder="+998901234567"
                                    maxLength={13}
                                />
                            </div>

                            <div>
                                <Label>Xonalar soni</Label>
                                <div className="flex gap-2 flex-wrap">
                                    {[1, 2, 3, 4, 5].map(num => (
                                        <Button
                                            key={num}
                                            type="button"
                                            size="sm"
                                            variant={formData.rooms.includes(num) ? "default" : "outline"}
                                            onClick={() => {
                                                const rooms = formData.rooms.includes(num)
                                                    ? formData.rooms.filter(r => r !== num)
                                                    : [...formData.rooms, num];
                                                setFormData({ ...formData, rooms });
                                            }}
                                        >
                                            {num}-xonali
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label>Manzillar (Tuman/Kvartil)</Label>
                                <LocationSelector
                                    cascaderData={cascaderData}
                                    value={cascaderValue}
                                    onChange={handleLocationChange}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Min qavat</Label>
                                    <Input
                                        type="number"
                                        value={formData.floorMin || ''}
                                        onChange={(e) => setFormData({ ...formData, floorMin: e.target.value ? Number(e.target.value) : null })}
                                        placeholder="1"
                                    />
                                </div>
                                <div>
                                    <Label>Max qavat</Label>
                                    <Input
                                        type="number"
                                        value={formData.floorMax || ''}
                                        onChange={(e) => setFormData({ ...formData, floorMax: e.target.value ? Number(e.target.value) : null })}
                                        placeholder="9"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Min etajnost</Label>
                                    <Input
                                        type="number"
                                        value={formData.totalFloorsMin || ''}
                                        onChange={(e) => setFormData({ ...formData, totalFloorsMin: e.target.value ? Number(e.target.value) : null })}
                                        placeholder="5"
                                    />
                                </div>
                                <div>
                                    <Label>Max etajnost</Label>
                                    <Input
                                        type="number"
                                        value={formData.totalFloorsMax || ''}
                                        onChange={(e) => setFormData({ ...formData, totalFloorsMax: e.target.value ? Number(e.target.value) : null })}
                                        placeholder="12"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Min narx ($)</Label>
                                    <Input
                                        type="number"
                                        value={formData.priceMin || ''}
                                        onChange={(e) => setFormData({ ...formData, priceMin: e.target.value ? Number(e.target.value) : null })}
                                        placeholder="50000"
                                    />
                                </div>
                                <div>
                                    <Label>Max narx ($)</Label>
                                    <Input
                                        type="number"
                                        value={formData.priceMax || ''}
                                        onChange={(e) => setFormData({ ...formData, priceMax: e.target.value ? Number(e.target.value) : null })}
                                        placeholder="100000"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label>Izohlar</Label>
                                <Input
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Qo'shimcha ma'lumotlar..."
                                />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button
                                    onClick={handleSubmit}
                                    className="flex-1"
                                    disabled={createClientMutation.isPending || updateClientMutation.isPending}
                                >
                                    {editingClient ? 'Yangilash' : 'Qo\'shish'}
                                </Button>
                                <Button variant="outline" onClick={() => setClientModalVisible(false)} className="flex-1">
                                    Bekor qilish
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Matches Drawer */}
            {matchesDrawerVisible && selectedClient && (
                <div className="fixed inset-0 bg-black/50 flex items-end justify-end z-50">
                    <div className="bg-card w-full max-w-2xl h-full overflow-y-auto p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">
                                🏠 {selectedClient.full_name} uchun mos uylar
                            </h2>
                            <button onClick={() => setMatchesDrawerVisible(false)}>
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {selectedClient && (
                            <div className="mb-6 admin-card p-4">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <strong>Xonalar:</strong> {(selectedClient.rooms || []).join(', ') || 'Belgilanmagan'}
                                    </div>
                                    <div>
                                        <strong>Qavat:</strong> {selectedClient.floor_min && selectedClient.floor_max
                                        ? `${selectedClient.floor_min}-${selectedClient.floor_max}`
                                        : 'Belgilanmagan'}
                                    </div>
                                    <div className="col-span-2">
                                        <strong>Narx:</strong> {selectedClient.price_min && selectedClient.price_max
                                        ? `$${selectedClient.price_min?.toLocaleString()} - $${selectedClient.price_max?.toLocaleString()}`
                                        : 'Belgilanmagan'}
                                    </div>
                                </div>
                            </div>
                        )}

                        <h3 className="font-semibold mb-4">Topilgan uylar ({matches.length})</h3>

                        <div className="space-y-3">
                            {matches.map((item: any) => (
                                <div key={item.id} className="admin-card p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Home className="h-4 w-4 text-primary" />
                                                <strong>{item.kvartil} - {item.xet}</strong>
                                            </div>
                                            <div className="text-sm space-y-1">
                                                <div>Maydon: {item.m2} m²</div>
                                                <div>Narx: ${item.narx?.toLocaleString()}</div>
                                                <div>Telefon: {item.tell}</div>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleAssignObject(selectedClient.id, item.id)}
                                        >
                                            Biriktirish
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Assigned Objects Modal */}
            {assignedObjectsModalVisible && selectedClient && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">
                                🏠 {selectedClient.full_name} - Biriktirilgan uylar
                            </h2>
                            <button onClick={() => setAssignedObjectsModalVisible(false)}>
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {assignedObjects.length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground">
                                <Home className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                <div>Hech qanday uy biriktirilmagan</div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {assignedObjects.map((item: any) => (
                                    <div key={item.id} className="admin-card p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Home className="h-4 w-4 text-primary" />
                                                    <strong>{item.kvartil}</strong>
                                                    <Badge variant="outline" className="border-blue-500 text-blue-700">
                                                        {item.xet}
                                                    </Badge>
                                                </div>
                                                <div className="text-sm space-y-1">
                                                    <div>
                                                        <strong>ID:</strong>
                                                        <Badge
                                                            variant="outline"
                                                            className="ml-2 cursor-pointer font-mono"
                                                            onClick={() => handleCopyId(item.id)}
                                                        >
                                                            {item.id.slice(0, 12)}... 📋
                                                        </Badge>
                                                    </div>
                                                    <div><strong>Maydon:</strong> {item.m2} m²</div>
                                                    <div><strong>Narx:</strong> ${item.narx?.toLocaleString()}</div>
                                                    <div><strong>Telefon:</strong> {item.tell}</div>
                                                    {item.rieltor && (
                                                        <div>
                                                            <strong>Rieltor:</strong>
                                                            <Badge variant="outline" className="ml-2 border-green-500 text-green-700">
                                                                {item.rieltor}
                                                            </Badge>
                                                        </div>
                                                    )}
                                                    {item.assigned_at && (
                                                        <div className="text-xs text-muted-foreground mt-2">
                                                            Biriktirilgan: {new Date(item.assigned_at).toLocaleString('uz-UZ')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-destructive text-destructive"
                                                onClick={() => handleUnassignObject(selectedClient.id, item.id)}
                                            >
                                                Ajratish
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ✅ Location Selector Component (Cascader alternative)
function LocationSelector({ cascaderData, value, onChange }: any) {
    const [selectedLocations, setSelectedLocations] = useState<string[][]>(value || []);
    const [currentTuman, setCurrentTuman] = useState("");
    const [currentKvartil, setCurrentKvartil] = useState("");

    const getCurrentTumanKvartils = () => {
        if (!currentTuman) return [];
        const tuman = cascaderData.find((t: any) => t.value === currentTuman);
        return tuman?.children || [];
    };

    const handleAdd = () => {
        if (!currentTuman) return;

        const newLocation: string[] = currentKvartil ? [currentTuman, currentKvartil] : [currentTuman];
        const updated = [...selectedLocations, newLocation];
        setSelectedLocations(updated);
        onChange(updated);

        setCurrentTuman("");
        setCurrentKvartil("");
    };

    const handleRemove = (index: number) => {
        const updated = selectedLocations.filter((_, i) => i !== index);
        setSelectedLocations(updated);
        onChange(updated);
    };

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <Select value={currentTuman} onValueChange={(val) => { setCurrentTuman(val); setCurrentKvartil(""); }}>
                    <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Tuman tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                        {cascaderData.map((tuman: any) => (
                            <SelectItem key={tuman.value} value={tuman.value}>{tuman.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {currentTuman && (
                    <Select value={currentKvartil} onValueChange={setCurrentKvartil}>
                        <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Kvartil (ixtiyoriy)" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Butun tuman</SelectItem>
                            {getCurrentTumanKvartils().map((kvartil: any) => (
                                <SelectItem key={kvartil.value} value={kvartil.value}>{kvartil.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                <Button type="button" size="sm" onClick={handleAdd} disabled={!currentTuman}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            {selectedLocations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedLocations.map((loc, idx) => (
                        <Badge key={idx} variant="outline" className="border-purple-500 text-purple-700 gap-1">
                            <MapPin className="h-3 w-3" />
                            {loc[0]}{loc[1] ? ` (${loc[1]})` : ''}
                            <button
                                type="button"
                                onClick={() => handleRemove(idx)}
                                className="ml-1 hover:text-destructive"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ClientsTab;