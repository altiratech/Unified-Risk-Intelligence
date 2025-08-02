import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { 
  Upload, 
  Database, 
  Bot, 
  MapPin, 
  BarChart3, 
  Cloud, 
  Shield, 
  Download, 
  FileText, 
  History,
  LogOut,
  Bell
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  
  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <aside className={cn("w-64 bg-white border-r border-slate-200 h-screen overflow-y-auto", className)}>
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Data Management
          </h3>
          <nav className="space-y-1">
            <Link 
              href="/dashboard" 
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg",
                location === "/dashboard" 
                  ? "text-primary bg-primary/10" 
                  : "text-slate-700 hover:bg-slate-100"
              )}
            >
              <Upload className={cn("mr-3 w-4 h-4", location === "/dashboard" ? "text-primary" : "text-slate-400")} />
              Dashboard
            </Link>
            <Link 
              href="/data-sources" 
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg",
                location === "/data-sources" 
                  ? "text-primary bg-primary/10" 
                  : "text-slate-700 hover:bg-slate-100"
              )}
            >
              <Database className={cn("mr-3 w-4 h-4", location === "/data-sources" ? "text-primary" : "text-slate-400")} />
              Data Sources
            </Link>
            <a 
              href="#" 
              className="flex items-center px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <Bot className="mr-3 w-4 h-4 text-slate-400" />
              AI Mapping
            </a>
          </nav>
        </div>
        
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Risk Analysis
          </h3>
          <nav className="space-y-1">
            <Link 
              href="/alerts" 
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg",
                location === "/alerts" 
                  ? "text-primary bg-primary/10" 
                  : "text-slate-700 hover:bg-slate-100"
              )}
            >
              <Bell className={cn("mr-3 w-4 h-4", location === "/alerts" ? "text-primary" : "text-slate-400")} />
              Alert Management
            </Link>
            <Link 
              href="/geospatial" 
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg",
                location === "/geospatial" 
                  ? "text-primary bg-primary/10" 
                  : "text-slate-700 hover:bg-slate-100"
              )}
            >
              <MapPin className={cn("mr-3 w-4 h-4", location === "/geospatial" ? "text-primary" : "text-slate-400")} />
              Geospatial View
            </Link>
            <a 
              href="#" 
              className="flex items-center px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <BarChart3 className="mr-3 w-4 h-4 text-slate-400" />
              Portfolio Analytics
            </a>
            <a 
              href="#" 
              className="flex items-center px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <Cloud className="mr-3 w-4 h-4 text-slate-400" />
              Climate Models
            </a>
            <a 
              href="#" 
              className="flex items-center px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <Shield className="mr-3 w-4 h-4 text-slate-400" />
              Cyber Risk
            </a>
          </nav>
        </div>

        <div className="mb-6">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Export & Reporting
          </h3>
          <nav className="space-y-1">
            <a 
              href="#" 
              className="flex items-center px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <Download className="mr-3 w-4 h-4 text-slate-400" />
              Export Data
            </a>
            <a 
              href="#" 
              className="flex items-center px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <FileText className="mr-3 w-4 h-4 text-slate-400" />
              Reports
            </a>
            <a 
              href="#" 
              className="flex items-center px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <History className="mr-3 w-4 h-4 text-slate-400" />
              Audit Trail
            </a>
          </nav>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="flex items-center px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg w-full"
          >
            <LogOut className="mr-3 w-4 h-4 text-slate-400" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
