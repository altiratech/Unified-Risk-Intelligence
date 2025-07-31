import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, Bell } from "lucide-react";

export function Header() {
  const { user } = useAuth() as { user: any };

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="text-white w-4 h-4" />
              </div>
              <h1 className="text-xl font-semibold text-slate-900">RiskIQ Platform</h1>
            </div>
            <nav className="hidden md:flex space-x-6">
              <a href="#" className="text-primary font-medium border-b-2 border-primary pb-4">Dashboard</a>
              <a href="#" className="text-slate-600 hover:text-primary pb-4">Data Sources</a>
              <a href="#" className="text-slate-600 hover:text-primary pb-4">Risk Models</a>
              <a href="#" className="text-slate-600 hover:text-primary pb-4">Portfolio Analysis</a>
              <a href="#" className="text-slate-600 hover:text-primary pb-4">Reports</a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-4 h-4" />
              <Badge className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                3
              </Badge>
            </Button>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">
                  {user?.firstName || user?.email || "User"}
                </p>
                <p className="text-xs text-slate-600">Risk Analyst</p>
              </div>
              <Avatar>
                <AvatarImage src={user?.profileImageUrl} />
                <AvatarFallback>
                  {(user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
