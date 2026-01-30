import { Home, Settings, User, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useUserData } from "../hooks/useApi";
import api from "../utils/api";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const userData = useUserData();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        setLoading(true);
        try {
            await api.post('/api/auth/logout');

            localStorage.removeItem('sessionId');
            localStorage.removeItem('userData');

            navigate('/login');
        } catch (error) {
            console.error('Logout xato:', error);

            // Xato bo'lsa ham logout qil
            localStorage.removeItem('sessionId');
            localStorage.removeItem('userData');
            navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin': return 'destructive';
            case 'rieltor': return 'default';
            default: return 'secondary';
        }
    };

    const getRoleText = (role: string) => {
        switch (role) {
            case 'admin': return 'Admin';
            case 'rieltor': return 'Rieltor';
            default: return 'User';
        }
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center justify-between px-4">
                {/* Left - Navigation */}
                <div className="flex items-center gap-2">
                    <Button
                        variant={location.pathname === '/' ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 rounded-full"
                        onClick={() => navigate('/')}
                    >
                        <Home className="h-4 w-4 mr-1.5" />
                        Asosiy
                    </Button>

                    {userData?.role === 'admin' && (
                        <Button
                            variant={location.pathname === '/admin' ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 rounded-full"
                            onClick={() => navigate('/admin')}
                        >
                            <Settings className="h-4 w-4 mr-1.5" />
                            Admin Panel
                        </Button>
                    )}
                </div>

                {/* Right - User Profile */}
                <div className="flex items-center gap-2">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-foreground">
                            {userData?.fullName || userData?.full_name || 'User'}
                        </p>
                        <Badge
                            variant={getRoleColor(userData?.role || 'user')}
                            className="text-xs"
                        >
                            {getRoleText(userData?.role || 'user')}
                        </Badge>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20"
                            >
                                <User className="h-5 w-5 text-primary" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem disabled className="cursor-default">
                                <User className="mr-2 h-4 w-4" />
                                <span>Profil</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={handleLogout}
                                disabled={loading}
                                className="text-destructive focus:text-destructive cursor-pointer"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>{loading ? 'Chiqilmoqda...' : 'Chiqish'}</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
};

export default Header;