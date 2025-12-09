import { useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Wallet,
  FileText,
  CheckSquare,
  StickyNote,
  Users,
  Settings,
  LogOut,
  Building2,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const iconMap: Record<string, React.ElementType> = {
  "layout-dashboard": LayoutDashboard,
  wallet: Wallet,
  "file-text": FileText,
  "check-square": CheckSquare,
  "sticky-note": StickyNote,
  users: Users,
  settings: Settings,
};

const menuItems = [
  { name: "Dashboard", slug: "dashboard", icon: "layout-dashboard", path: "/" },
  { name: "Budgets", slug: "budgets", icon: "wallet", path: "/budgets" },
  { name: "Invoices", slug: "invoices", icon: "file-text", path: "/invoices" },
  { name: "Tasks", slug: "tasks", icon: "check-square", path: "/tasks" },
  { name: "Notes", slug: "notes", icon: "sticky-note", path: "/notes" },
  { name: "Team", slug: "team", icon: "users", path: "/team", leadOnly: true },
  { name: "Settings", slug: "settings", icon: "settings", path: "/settings" },
];

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut, isLead } = useAuth();

  const filteredItems = menuItems.filter(
    (item) => !item.leadOnly || isLead
  );

  const getInitials = (email: string) => {
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sidebar-foreground">StartupOS</span>
            <span className="text-xs text-muted-foreground">Management Platform</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => {
                const Icon = iconMap[item.icon] || LayoutDashboard;
                const isActive = location.pathname === item.path;
                
                return (
                  <SidebarMenuItem key={item.slug}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={cn(
                        "h-10 rounded-lg transition-colors",
                        isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      )}
                    >
                      <Link to={item.path}>
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {user?.email ? getInitials(user.email) : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.email}
            </p>
            <Badge variant="secondary" className="text-xs mt-0.5">
              {isLead ? "Admin" : "Member"}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          onClick={signOut}
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
