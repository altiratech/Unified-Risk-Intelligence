import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useRoute } from "wouter";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataQualityDashboard } from "@/components/ui/data-quality-dashboard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, FileText, Database, Download, RefreshCw, Brain, Zap } from "lucide-react";

export default function DataSourceDetailEnhanced() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [match, params] = useRoute("/data-sources/:id");
  const [activeView, setActiveView] = useState<'mappings' | 'analysis'>('mappings');
  const queryClient = useQueryClient();
  
  const dataSourceId = params?.id;

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

  // Fetch data source details
  const { data: dataSource, isLoading: dataSourceLoading } = useQuery<any>({
    queryKey: ["/api/data-sources/" + dataSourceId],
    enabled: !!dataSourceId,
    retry: false,
  });

  // Fetch data mappings
  const { data: mappings = [], isLoading: mappingsLoading } = useQuery<any[]>({
    queryKey: ["/api/data-mappings/" + dataSourceId],
    enabled: !!dataSourceId,
    retry: false,
  });

  // Fetch AI analysis
  const { data: analysisData, isLoading: analysisLoading } = useQuery<{
    success: boolean;
    analysis: any;
    analyzedAt: string;
  }>({
    queryKey: ["/api/data-sources/" + dataSourceId + "/analysis"],
    enabled: !!dataSourceId && activeView === 'analysis',
    retry: false,
  });

  // Auto-apply mappings mutation
  const autoApplyMutation = useMutation({
    mutationFn: async (minConfidence: number) => {
      return apiRequest(`/api/data-mappings/auto-apply/${dataSourceId}`, {
        method: 'POST',
        body: JSON.stringify({ minConfidence }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Mappings Applied",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/data-mappings/" + dataSourceId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to apply mappings",
        variant: "destructive",
      });
    }
  });

  const handleApplyMappings = (minConfidence: number) => {
    autoApplyMutation.mutate(minConfidence);
  };

  if (isLoading || !match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center space-x-4 mb-4">
              <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {dataSourceLoading ? "Loading..." : dataSource?.name || "Data Source"}
                </h2>
                <p className="text-slate-600">AI-powered data analysis and field mapping</p>
              </div>
              <div className="flex space-x-3">
                <Button 
                  variant={activeView === 'mappings' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setActiveView('mappings')}
                >
                  <Database className="w-4 h-4 mr-2" />
                  Mappings
                </Button>
                <Button 
                  variant={activeView === 'analysis' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setActiveView('analysis')}
                >
                  <Brain className="w-4 h-4 mr-2" />
                  AI Analysis
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* Data Source Info */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">File Type</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {dataSource?.type?.toUpperCase() || 'CSV'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Processing Status</p>
                    <Badge 
                      variant={dataSource?.status === "completed" ? "default" : "secondary"}
                      className={
                        dataSource?.status === "completed" 
                          ? "bg-green-100 text-green-800" 
                          : dataSource?.status === "processing" 
                          ? "bg-orange-100 text-orange-800"
                          : "bg-slate-100 text-slate-800"
                      }
                    >
                      {dataSource?.status || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Zap className="text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Field Mappings</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {mappings.length}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      {mappings.filter((m: any) => m.isApproved).length} approved
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Database className="text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Upload Date</p>
                    <p className="text-lg font-bold text-slate-900">
                      {dataSource?.createdAt ? new Date(dataSource.createdAt).toLocaleDateString() : 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {dataSource?.createdAt ? new Date(dataSource.createdAt).toLocaleTimeString() : ''}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                    <RefreshCw className="text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content based on active view */}
          {activeView === 'mappings' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>AI Field Mappings</CardTitle>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleApplyMappings(70)}
                      disabled={autoApplyMutation.isPending}
                    >
                      Accept 70%+
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => handleApplyMappings(90)}
                      disabled={autoApplyMutation.isPending}
                    >
                      Accept 90%+
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {mappingsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-2">
                          <div className="h-4 bg-slate-200 rounded animate-pulse w-32"></div>
                          <div className="h-3 bg-slate-200 rounded animate-pulse w-24"></div>
                        </div>
                        <div className="h-6 bg-slate-200 rounded animate-pulse w-16"></div>
                      </div>
                    ))}
                  </div>
                ) : mappings.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Database className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>No field mappings found</p>
                    <p className="text-sm">Upload a data file to see AI-powered mapping suggestions</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-2 font-medium text-slate-600">Source Field</th>
                          <th className="text-left py-3 px-2 font-medium text-slate-600">Target Field</th>
                          <th className="text-left py-3 px-2 font-medium text-slate-600">Confidence</th>
                          <th className="text-left py-3 px-2 font-medium text-slate-600">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mappings.map((mapping: any) => (
                          <tr key={mapping.id} className="border-b border-slate-100">
                            <td className="py-3 px-2">
                              <code className="px-2 py-1 bg-slate-100 rounded text-sm">
                                {mapping.sourceField}
                              </code>
                            </td>
                            <td className="py-3 px-2">
                              <code className="px-2 py-1 bg-primary/10 rounded text-sm">
                                {mapping.targetField}
                              </code>
                            </td>
                            <td className="py-3 px-2">
                              <Badge 
                                variant={
                                  parseFloat(mapping.confidence) >= 90 ? "default" :
                                  parseFloat(mapping.confidence) >= 70 ? "secondary" : "outline"
                                }
                              >
                                {parseFloat(mapping.confidence).toFixed(1)}%
                              </Badge>
                            </td>
                            <td className="py-3 px-2">
                              {mapping.isApproved ? (
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  Approved
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Pending</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeView === 'analysis' && analysisData?.success && (
            <DataQualityDashboard 
              analysis={analysisData.analysis}
              dataSourceId={dataSourceId!}
              onApplyMappings={handleApplyMappings}
              isLoading={analysisLoading}
            />
          )}

          {activeView === 'analysis' && analysisLoading && (
            <Card>
              <CardContent className="p-12">
                <div className="text-center">
                  <Brain className="w-12 h-12 animate-pulse mx-auto mb-4 text-primary" />
                  <h3 className="text-lg font-semibold mb-2">Analyzing Your Data</h3>
                  <p className="text-slate-600">AI is processing your data to provide quality insights and enrichment suggestions...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeView === 'analysis' && !analysisLoading && !analysisData?.success && (
            <Card>
              <CardContent className="p-12">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-lg font-semibold mb-2">Analysis Not Available</h3>
                  <p className="text-slate-600 mb-4">
                    Unable to analyze this data source. This may be due to file format or processing issues.
                  </p>
                  <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/data-sources/" + dataSourceId + "/analysis"] })}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}