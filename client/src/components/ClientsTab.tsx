// client/src/components/ClientsTab.tsx (OPTIMIZED VERSION)
import { useState } from "react";
import {
    Search, RefreshCw, Plus, Pencil, Trash2, User, Home, Phone,
    MapPin, X
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
        setClientModalVisible(true);
    };

    const handleEdit = (client: any) => {
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
            notes: client.notes || '',
            preferredLocations: client.preferred_locations || []
        });
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

            {/* Modal */}
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
                                <Label>Narx oralig'i ($)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        placeholder="Min"
                                        value={formData.priceMin || ''}
                                        onChange={(e) => setFormData({ ...formData, priceMin: e.target.value ? Number(e.target.value) : null })}
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Max"
                                        value={formData.priceMax || ''}
                                        onChange={(e) => setFormData({ ...formData, priceMax: e.target.value ? Number(e.target.value) : null })}
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
        </div>
    );
}

export default ClientsTab;