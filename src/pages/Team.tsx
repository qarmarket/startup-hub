import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { teamService, TeamMember } from "@/services/team";
import { toast } from "sonner";
import { Search, Users, Mail, Shield, Download } from "lucide-react";
import * as XLSX from "xlsx";

export default function Team() {
  const { user, isLead } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const data = await teamService.getAll();
      setMembers(data);
    } catch (error) {
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: "lead" | "non_lead") => {
    try {
      await teamService.updateRole(userId, newRole);
      toast.success("Role updated successfully");
      fetchTeamMembers();
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      await teamService.updateStatus(userId, newStatus);
      toast.success("Status updated successfully");
      fetchTeamMembers();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleExport = () => {
    const exportData = filteredMembers.map((member) => ({
      Name: member.full_name || "-",
      Email: member.email,
      Role: member.role === "lead" ? "Admin" : "Member",
      Status: member.status,
      "Joined At": member.created_at,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Team");
    XLSX.writeFile(wb, "team_export.xlsx");
    toast.success("Team data exported successfully");
  };

  const filteredMembers = members.filter((member) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      member.email.toLowerCase().includes(searchLower) ||
      member.full_name?.toLowerCase().includes(searchLower)
    );
  });

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <AppLayout
      title="Team"
      description="Manage your team members and roles"
      actions={
        isLead && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-sm text-muted-foreground">Total Members</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <Shield className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {members.filter((m) => m.role === "lead").length}
                </p>
                <p className="text-sm text-muted-foreground">Admins</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent">
                <Mail className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {members.filter((m) => m.status === "active").length}
                </p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Team List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-1/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No team members found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "Try adjusting your search" : "Invite team members to get started"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredMembers.map((member, index) => (
              <Card
                key={member.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(member.full_name, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.full_name || member.email}</p>
                          {member.id === user?.id && (
                            <Badge variant="secondary" className="text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={member.status === "active" ? "default" : "secondary"}>
                        {member.status}
                      </Badge>
                      <Badge variant={member.role === "lead" ? "default" : "secondary"}>
                        {member.role === "lead" ? "Admin" : "Member"}
                      </Badge>
                      {isLead && member.id !== user?.id && (
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.role}
                            onValueChange={(v) => handleRoleChange(member.id, v as "lead" | "non_lead")}
                          >
                            <SelectTrigger className="w-[110px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="lead">Admin</SelectItem>
                              <SelectItem value="non_lead">Member</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={member.status || "active"}
                            onValueChange={(v) => handleStatusChange(member.id, v)}
                          >
                            <SelectTrigger className="w-[100px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
