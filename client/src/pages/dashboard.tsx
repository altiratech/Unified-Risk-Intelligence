import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
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
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  return (
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

          {/* Enhanced Portfolio Analytics */}
          {portfolioAnalytics?.success && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Portfolio Analytics</h3>
                <Badge variant="outline" className="text-xs">
                  Industry-Standard Calculations
                </Badge>
              </div>
              <PortfolioAnalytics 
                data={portfolioAnalytics.data} 
                isLoading={analyticsLoading}
              />
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Data Import Section */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Data Import
                    <Database className="w-5 h-5 text-slate-400" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FileUpload />
                  
                  {/* Recent Uploads */}
                  <div className="space-y-3 mt-6">
                    <h4 className="text-sm font-medium text-slate-700">Recent Uploads</h4>
                    {dataSourcesLoading ? (
                      <div className="text-sm text-slate-500">Loading...</div>
                    ) : dataSources.length === 0 ? (
                      <div className="text-sm text-slate-500">No uploads yet</div>
                    ) : (
                      dataSources.slice(0, 3).map((source: any) => (
                        <div key={source.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-4 h-4 text-blue-500" />
                            <div>
                              <p className="text-sm font-medium text-slate-900">{source.name}</p>
                              <p className="text-xs text-slate-500">
                                {new Date(source.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant={source.status === "completed" ? "default" : "secondary"}
                            className={
                              source.status === "completed" 
                                ? "bg-green-100 text-green-800" 
                                : source.status === "processing" 
                                ? "bg-orange-100 text-orange-800"
                                : "bg-slate-100 text-slate-800"
                            }
                          >
                            {source.status === "completed" && <CheckCircle className="w-3 h-3 mr-1" />}
                            {source.status === "processing" && <Clock className="w-3 h-3 mr-1" />}
                            {source.status}
                          </Badge>
                        </div>
                      ))
                    )}
                    
                    <Button variant="outline" className="w-full" size="sm">
                      View All Uploads
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Mapping Assistant */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    AI Data Mapping Assistant
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-green-100 text-green-800">AI Powered</Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* AI Suggestions */}
                  <div className="bg-gradient-to-r from-primary/5 to-transparent p-4 rounded-lg mb-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="text-white w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 mb-1">Smart Mapping Suggestion</p>
                        <p className="text-xs text-slate-600">
                          {dataSources.length > 0 
                            ? "AI has analyzed your uploaded data and suggests field mappings based on insurance industry standards."
                            : "Upload a data file to see AI-powered mapping suggestions."
                          }
                        </p>
                        {dataSources.length > 0 && (
                          <div className="flex space-x-2 mt-3">
                            <Button size="sm" variant="default">Accept All</Button>
                            <Button size="sm" variant="outline">Review</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mapping Table */}
                  {dataSources.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-3 px-2 font-medium text-slate-600">Source Field</th>
                            <th className="text-left py-3 px-2 font-medium text-slate-600">Mapped To</th>
                            <th className="text-left py-3 px-2 font-medium text-slate-600">Confidence</th>
                            <th className="text-left py-3 px-2 font-medium text-slate-600">Status</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-700">
                          <tr className="border-b border-slate-100">
                            <td className="py-3 px-2">Policy_ID</td>
                            <td className="py-3 px-2">policy_number</td>
                            <td className="py-3 px-2">
                              <Badge className="bg-green-100 text-green-800">98%</Badge>
                            </td>
                            <td className="py-3 px-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </td>
                          </tr>
                          <tr className="border-b border-slate-100">
                            <td className="py-3 px-2">Property_Value</td>
                            <td className="py-3 px-2">total_insured_value</td>
                            <td className="py-3 px-2">
                              <Badge className="bg-orange-100 text-orange-800">85%</Badge>
                            </td>
                            <td className="py-3 px-2">
                              <AlertTriangle className="w-4 h-4 text-orange-600" />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      Upload data files to see AI mapping suggestions
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 mt-4">
                    <Button variant="outline">Review All</Button>
                    <Button>Apply Mapping</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Risk Visualization Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Geospatial Risk Map */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Geospatial Risk View
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">Climate</Button>
                    <Button size="sm">Exposure</Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RiskMap exposures={exposures} />
              </CardContent>
            </Card>

            {/* Portfolio Analytics */}
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
  );
}
