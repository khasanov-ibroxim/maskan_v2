import { Home, Settings, User } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

const Header = () => {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center justify-between px-4">
                {/* Left - Navigation */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="default"
                        size="sm"
                        className="h-8 rounded-full bg-primary text-primary-foreground font-medium"
                    >
                        <Home className="h-4 w-4 mr-1.5" />
                        Asosiy
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-full border-border hover:bg-card"
                    >
                        <Settings className="h-4 w-4 mr-1.5" />
                        Admin Panel
                    </Button>
                </div>

                {/* Right - User Profile */}
                <div className="flex items-center gap-2">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-foreground">Admin User</p>
                        <Badge variant="outline" className="text-xs border-primary text-primary">
                            Admin
                        </Badge>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20"
                    >
                        <User className="h-5 w-5 text-primary" />
                    </Button>
                </div>
            </div>
        </header>
    );
};

export default Header;
