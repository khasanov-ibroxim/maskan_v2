import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "./ui/table";
import {FolderOpen, Megaphone, Pencil , Search , Delete} from "lucide-react";
import {Button} from "./ui/button";


const mockClients = [
    {
        id: 1,
        username: "John",
        telefon: "Yunusobod - 7",
        room: [2, 3, 4],
        price: {minPrice: "20000", maxPrice: "50000"},
        location: ["Yunusobod - 7", "Mirzo Ulugbek tumani"],
        active_reltor: "Dilshod",
        active_homes: [{}],
        status: "active",
    }
];


const ClientsTab = () => {
    return (
        <div>
            <div className="admin-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-12">№</TableHead>
                            <TableHead>Username</TableHead>
                            <TableHead>Telefon</TableHead>
                            <TableHead>Xonalar</TableHead>
                            <TableHead>Narx</TableHead>
                            <TableHead>Manzil</TableHead>
                            <TableHead>Rielter</TableHead>
                            <TableHead>Biriktirilgan Uy</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Amallar</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mockClients.map((client, index) => (
                            <TableRow key={index} className="hover:bg-muted/30">
                                <TableCell className="text-primary font-medium">{index + 1}</TableCell>
                                <TableCell>{client.username}</TableCell>
                                <TableCell>{client.telefon}</TableCell>
                                <TableCell>{client.room.map((room_item)=>room_item)}</TableCell>
                                <TableCell className="text-success font-semibold">
                                    ${client.price.minPrice}
                                    <br/> {client.price.maxPrice}</TableCell>
                                <TableCell>{client.location.map((location_item)=>location_item)}</TableCell>
                                <TableCell>{client.active_reltor}</TableCell>
                                <TableCell>{client.active_homes.length}</TableCell>
                                <TableCell>{client.status}</TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-center gap-2">
                                        <button className="p-1.5 rounded hover:bg-muted transition-colors">
                                            <Search className="h-4 w-4 text-muted-foreground"/>
                                        </button>
                                        <button className="p-1.5 rounded hover:bg-muted transition-colors">
                                            <Pencil className="h-4 w-4 text-muted-foreground"/>
                                        </button>
                                        <Button size="sm" className="bg-primary hover:bg-primary/80 h-7 px-2">
                                            <Delete className="h-3 w-3 mr-1"/>
                                           Delete
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default ClientsTab;