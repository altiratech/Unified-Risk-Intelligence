import { cn } from "@/lib/utils";
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
  LogOut
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
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
            <a 
              href="#" 
              className="flex items-center px-3 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg"
            >
              <Upload className="mr-3 w-4 h-4 text-primary" />
              Import Data
            </a>
            <a 
              href="#" 
              className="flex items-center px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <Database className="mr-3 w-4 h-4 text-slate-400" />
              Data Sources
            </a>
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
            <a 
              href="#" 
              className="flex items-center px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <MapPin className="mr-3 w-4 h-4 text-slate-400" />
              Geospatial View
            </a>
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
