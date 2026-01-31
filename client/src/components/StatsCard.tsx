import { LucideIcon } from "lucide-react";

interface StatsCardProps {
    title: string;
    value: number | string;
    icon: LucideIcon;
    variant: "users" | "online" | "rieltor" | "clients" | "objects";
}

const variantStyles = {
    users: "text-stats-users border-stats-users/20",
    online: "text-stats-online border-stats-online/20",
    rieltor: "text-stats-rieltor border-stats-rieltor/20",
    clients: "text-stats-online border-stats-online/20",
    objects: "text-stats-rieltor border-stats-rieltor/20",
};

export function StatsCard({ title, value, icon: Icon, variant }: StatsCardProps) {
    return (
        <div className={`stat-card border-l-4 ${variantStyles[variant]}`}>
            <p className="text-sm text-muted-foreground mb-2">{title}</p>
            <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${variantStyles[variant].split(" ")[0]}`} />
                <span className="text-2xl font-semibold text-foreground">{value}</span>
            </div>
        </div>
    );
}
