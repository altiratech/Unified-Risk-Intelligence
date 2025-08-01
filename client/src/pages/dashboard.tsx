import { useAuth } from "@/hooks/useAuth";
import { AuthWrapper } from "@/components/layout/auth-wrapper";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/ui/file-upload";
import { RiskMap } from "@/components/ui/risk-map";
import { PortfolioChart } from "@/components/ui/portfolio-chart";
import { PortfolioAnalytics } from "@/components/ui/portfolio-analytics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  FileText, 
  AlertTriangle, 
  Database,
  Download,
  RefreshCw,
  CheckCircle,
  Clock,
  TrendingUp
} from "lucide-react";

export default function Dashboard() {
  const { isAuthenticated } = useAuth();

  // Fetch risk metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<{
    totalExposure: string;
    activePolicies: number;
    highRiskAreas: number;
    pml: string;
    aal: string;
    maxSingleLoss: string;
  }>({
    queryKey: ["/api/risk-metrics"],
    retry: false,
  });

  // Fetch data sources
  const { data: dataSources = [], isLoading: dataSourcesLoading } = useQuery<any[]>({
    queryKey: ["/api/data-sources"],
    retry: false,
  });

  // Fetch risk exposures
  const { data: exposures = [], isLoading: exposuresLoading } = useQuery<any[]>({
    queryKey: ["/api/risk-exposures"],
    retry: false,
  });

  // Fetch export jobs
  const { data: exportJobs = [], isLoading: exportJobsLoading } = useQuery<any[]>({
    queryKey: ["/api/export-jobs"],
    retry: false,
  });

  // Fetch enhanced portfolio analytics
  const { data: portfolioAnalytics, isLoading: analyticsLoading } = useQuery<{
    success: boolean;
    data: any;
    calculatedAt: string;
  }>({
    queryKey: ["/api/portfolio-analytics"],
    retry: false,
  });

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  return (
    <AuthWrapper showLoginPrompt={false}>
      <div className="min-h-screen bg-slate-50">
        <Header />
        
        <div className="flex">
          <Sidebar />
          
          <main className="flex-1 p-6 overflow-y-auto">
            {/* Dashboard Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Risk Intelligence Dashboard</h2>
                  <p className="text-slate-600">Unified view of your risk data and exposure analysis</p>
                </div>
                <div className="flex space-x-3">
                  <Button variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Button size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Total Exposure</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {metricsLoading ? "..." : formatCurrency(metrics?.totalExposure || "0")}
                        </p>
                        <p className="text-xs text-green-600 mt-1 flex items-center">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          +5.2% from last month
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <DollarSign className="text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Active Policies</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {metricsLoading ? "..." : metrics?.activePolicies?.toLocaleString() || "0"}
                        </p>
                        <p className="text-xs text-green-600 mt-1 flex items-center">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          +127 this week
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <FileText className="text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">High Risk Areas</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {metricsLoading ? "..." : metrics?.highRiskAreas || "0"}
                        </p>
                        <p className="text-xs text-orange-600 mt-1">Requires attention</p>
                      </div>
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Data Sources</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {dataSourcesLoading ? "..." : dataSources.length}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Connected & syncing</p>
                      </div>
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Database className="text-slate-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* File Upload & Data Sources */}
              <div className="lg:col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Upload Risk Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FileUpload />
                  </CardContent>
                </Card>

                {/* Recent Data Sources */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Recent Data Sources
                      <Badge variant="secondary">{dataSources.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dataSources.slice(0, 3).map((source) => (
                        <div key={source.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-4 h-4 text-slate-600" />
                            <div>
                              <p className="text-sm font-medium">{source.name}</p>
                              <p className="text-xs text-slate-500">{source.type}</p>
                            </div>
                          </div>
                          <Badge variant={source.status === 'processed' ? 'default' : 'secondary'}>
                            {source.status === 'processed' ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                            {source.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Risk Map & Analytics */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Risk Exposure Map</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RiskMap exposures={exposures} />
                  </CardContent>
                </Card>

                {/* Portfolio Analytics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Portfolio Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PortfolioAnalytics 
                      data={portfolioAnalytics?.data}
                      isLoading={analyticsLoading}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Additional Analytics Section */}
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Portfolio Risk Analytics
                    <select className="text-xs border border-slate-300 rounded-md px-2 py-1">
                      <option>Last 30 Days</option>
                      <option>Last Quarter</option>
                      <option>Last Year</option>
                    </select>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PortfolioChart exposures={exposures} />
                  
                  {/* Key Risk Metrics */}
                  <div className="space-y-4 mt-6">
                    <h4 className="text-sm font-medium text-slate-700">Key Risk Metrics</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-600">PML (1:250)</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {metricsLoading ? "..." : formatCurrency(metrics?.pml || "0")}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-600">AAL</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {metricsLoading ? "..." : formatCurrency(metrics?.aal || "0")}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-600">Max Single Loss</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {metricsLoading ? "..." : formatCurrency(metrics?.maxSingleLoss || "0")}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-600">Correlation Risk</p>
                        <p className="text-lg font-semibold text-orange-600">Medium</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </AuthWrapper>
  );
}