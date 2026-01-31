import { useState } from "react";
import { Plus, RefreshCw, Download, Pencil, Trash2, User } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./ui/table";

const mockUsers = [
    {
        id: 1,
        username: "Javohir",
        fullName: "Javohir Karimov",
        role: "INDIVIDUAL_RIELTOR",
        status: "Offline",
    },
    {
        id: 2,
        username: "Laziz",
        fullName: "Laziz Ahmadov",
        role: "INDIVIDUAL_RIELTOR",
        status: "Online",
    },
    {
        id: 3,
        username: "laziz",
        fullName: "Laziz Toshmatov",
        role: "INDIVIDUAL_RIELTOR",
        status: "Offline",
    },
    {
        id: 4,
        username: "test",
        fullName: "Test User",
        role: "INDIVIDUAL_RIELTOR",
        status: "Offline",
    },
    {
        id: 5,
        username: "admin",
        fullName: "Admin User",
        role: "ADMIN",
        status: "Online",
    },
];

export function UsersTab() {
    const [users] = useState(mockUsers);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Action Buttons */}
            <div className="flex items-center justify-between">
                <div className="flex gap-3">
                    <Button className="bg-primary hover:bg-primary/90">
                        <Plus className="h-4 w-4 mr-2" />
                        Yangi User
                    </Button>
                    <Button variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Yangilash
                    </Button>
                    <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Excel Backup
                    </Button>
                </div>
                <div className="flex items-center gap-2 text-sm text-primary border border-primary/30 rounded-md px-3 py-1.5">
                    <RefreshCw className="h-4 w-4" />
                    <span>Avtomatik yangilanish: har 10 daqiqada</span>
                </div>
            </div>

            {/* Table */}
            <div className="admin-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead>Username</TableHead>
                            <TableHead>To'liq ism</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Amallar</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id} className="hover:bg-muted/30">
                                <TableCell className="font-medium text-primary">
                                    {user.username}
                                </TableCell>
                                <TableCell>{user.fullName}</TableCell>
                                <TableCell>
                                    <Badge
                                        variant="outline"
                                        className="border-primary text-primary bg-primary/5"
                                    >
                                        <User className="h-3 w-3 mr-1" />
                                        {user.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant="outline"
                                        className={user.status === "Online"
                                            ? "border-success text-success bg-success/5"
                                            : "border-muted-foreground text-muted-foreground"
                                        }
                                    >
                                        {user.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-center gap-2">
                                        <Button size="sm" className="action-btn-success h-8">
                                            <Pencil className="h-3 w-3 mr-1" />
                                            Tahrirlash
                                        </Button>
                                        <Button size="sm" variant="outline" className="action-btn-danger h-8">
                                            <Trash2 className="h-3 w-3 mr-1" />
                                            O'chirish
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
}
