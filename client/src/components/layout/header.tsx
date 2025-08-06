import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, Bell, Zap, Search, Settings, HelpCircle, AlertCircle } from "lucide-react";

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
              <h1 className="text-xl font-semibold text-slate-900">Unified Risk Intelligence</h1>
            </div>
            {/* Strategic Features - Future Platform Capabilities */}
            <div className="hidden lg:flex items-center space-x-6">
              <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-slate-600 hover:text-primary">
                <Search className="w-4 h-4" />
                <span>Global Search</span>
              </Button>
              <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-slate-600 hover:text-primary">
                <Zap className="w-4 h-4" />
                <span>AI Insights</span>
                <Badge variant="secondary" className="ml-1 text-xs">Beta</Badge>
              </Button>
              <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-slate-600 hover:text-primary">
                <AlertCircle className="w-4 h-4" />
                <span>Risk Alerts</span>
                <Badge className="ml-1 bg-amber-500 text-white text-xs">2</Badge>
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm">
              <HelpCircle className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
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
