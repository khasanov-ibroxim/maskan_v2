import { useState } from "react";
import { Users, CheckCircle, Home, Building, Settings , HousePlus , BookUser} from "lucide-react";
import { StatsCard } from "./StatsCard";
import { ObjectsTab } from "./ObjectsTab";
import { UsersTab } from "./UsersTab";
import { SettingsTab } from "./SettingsTab";
import ClientsTab from "./ClientsTab";

type TabType = "objects" | "clients" | "users" | "settings";

const tabs = [
    { id: "objects", label: "Obyektlar", icon: Home },
    { id: "clients", label: "Clients", icon: BookUser },
    { id: "users", label: "Foydalanuvchilar", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
] as const;

export function AdminPanel() {
    const [activeTab, setActiveTab] = useState<TabType>("objects");
    const [lastUpdate] = useState(new Date().toLocaleTimeString());

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
                        value={13}
                        icon={Users}
                        variant="users"
                    />
                    <StatsCard
                        title="Online"
                        value={1}
                        icon={CheckCircle}
                        variant="online"
                    />
                    <StatsCard
                        title="Rieltor"
                        value={5}
                        icon={Home}
                        variant="rieltor"
                    />
                    <StatsCard
                        title="Clients"
                        value={1}
                        icon={BookUser}
                        variant="clients"
                    />

                    <StatsCard
                        title="Obyektlar"
                        value={5}
                        icon={HousePlus}
                        variant="objects"
                    />
                </div>

                {/* Tabs */}
                <div className="admin-card mb-6">
                    <div className="flex gap-1 p-2 border-b">
                        {tabs.map((tab , index) => (
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
                {activeTab === "objects" && <ObjectsTab />}
                {activeTab === "clients" && <ClientsTab />}
                {activeTab === "users" && <UsersTab />}
                {activeTab === "settings" && <SettingsTab />}
            </main>
        </div>
    );
}
