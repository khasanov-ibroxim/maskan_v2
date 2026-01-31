import { useState, useEffect, useCallback, useRef } from "react";
import { Users, CheckCircle, Home, Building, Settings, HousePlus, BookUser } from "lucide-react";
import { StatsCard } from "./StatsCard";
import { ObjectsTab } from "./ObjectsTab";
import { UsersTab } from "./UsersTab";
import { SettingsTab } from "./SettingsTab";
import { ClientsTab } from "./ClientsTab";
import api from "../utils/api";

type TabType = "objects" | "clients" | "users" | "settings";

const tabs = [
    { id: "objects", label: "Obyektlar", icon: Home },
    { id: "clients", label: "Clients", icon: BookUser },
    { id: "users", label: "Foydalanuvchilar", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
] as const;

export function AdminPanel() {
    const [activeTab, setActiveTab] = useState<TabType>("objects");
    const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());

    // Stats data from API
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        realtors: 0,
        clients: 0,
        objects: 0
    });

    const [loading, setLoading] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Load stats from API
    const loadStats = useCallback(async () => {
        setLoading(true);
        try {
            // Load users and sessions
            const [usersRes, sessionsRes, clientsRes] = await Promise.all([
                api.get('/api/users/users'),
                api.get('/api/users/sessions/active'),
                api.get('/api/clients')
            ]);

            let totalUsers = 0;
            let activeUsers = 0;
            let realtors = 0;

            if (usersRes.data.success) {
                const users = usersRes.data.users || [];
                totalUsers = users.length;
                realtors = users.filter((u: any) =>
                    u.role === 'rieltor' || u.role === 'individual_rieltor'
                ).length;
            }

            if (sessionsRes.data.success) {
                activeUsers = sessionsRes.data.sessions?.length || 0;
            }

            const clients = clientsRes.data.success ? (clientsRes.data.data?.length || 0) : 0;

            setStats({
                totalUsers,
                activeUsers,
                realtors,
                clients,
                objects: 0 // Will be updated from ObjectsTab
            });

            setLastUpdate(new Date().toLocaleTimeString());
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Update objects count
    const updateObjectsCount = useCallback((count: number) => {
        setStats(prev => ({ ...prev, objects: count }));
    }, []);

    useEffect(() => {
        loadStats();

        // Auto-refresh every 10 minutes
        intervalRef.current = setInterval(() => {
            loadStats();
        }, 600000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [loadStats]);

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-card border-b border-border sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center">
                                <Building className="h-5 w-5 text-warning" />
                            </div>
                            <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
                        </div>
                        <div className="text-sm text-primary border border-primary/30 rounded-md px-3 py-1.5">
                            Oxirgi yangilanish: {lastUpdate}
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <StatsCard
                        title="Jami Userlar"
                        value={stats.totalUsers}
                        icon={Users}
                        variant="users"
                    />
                    <StatsCard
                        title="Online"
                        value={stats.activeUsers}
                        icon={CheckCircle}
                        variant="online"
                    />
                    <StatsCard
                        title="Rieltor"
                        value={stats.realtors}
                        icon={Home}
                        variant="rieltor"
                    />
                    <StatsCard
                        title="Clients"
                        value={stats.clients}
                        icon={BookUser}
                        variant="clients"
                    />
                    <StatsCard
                        title="Obyektlar"
                        value={stats.objects}
                        icon={HousePlus}
                        variant="objects"
                    />
                </div>

                {/* Tabs */}
                <div className="admin-card mb-6">
                    <div className="flex gap-1 p-2 border-b">
                        {tabs.map((tab, index) => (
                            <button
                                key={index}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                                    activeTab === tab.id
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === "objects" && <ObjectsTab onCountUpdate={updateObjectsCount} />}
                {activeTab === "clients" && <ClientsTab onRefresh={loadStats} />}
                {activeTab === "users" && <UsersTab onRefresh={loadStats} />}
                {activeTab === "settings" && <SettingsTab />}
            </main>
        </div>
    );
}