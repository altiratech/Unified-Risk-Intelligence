import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useRoute } from "wouter";
import { 
  ArrowLeft, 
  FileText, 
  Database, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Brain,
  Download,
  RefreshCw
} from "lucide-react";

interface DataMapping {
  id: string;
  sourceField: string;
  targetField: string;
  confidence: string;
  isApproved: boolean;
}

export default function DataSourceDetail() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [match, params] = useRoute("/data-sources/:id");
  const queryClient = useQueryClient();
  
  const dataSourceId = params?.id;

  // Redirect if not authenticated
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
  const { data: dataSource, isLoading: sourceLoading } = useQuery<any>({
    queryKey: [`/api/data-sources/${dataSourceId}`],
    enabled: !!dataSourceId,
    retry: false,
  });

  // Fetch data mappings
  const { data: mappings = [], isLoading: mappingsLoading } = useQuery<DataMapping[]>({
    queryKey: [`/api/data-mappings/${dataSourceId}`],
    enabled: !!dataSourceId,
    retry: false,
  });

  // Approve mapping mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      return await apiRequest("PATCH", `/api/data-mappings/${id}/approve`, { approved });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/data-mappings/${dataSourceId}`] });
      toast({
        title: "Mapping updated",
        description: "Field mapping has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "processing":
        return <Clock className="w-5 h-5 text-orange-600" />;
      case "failed":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  if (isLoading || sourceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!match || !dataSource) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Data source not found</h3>
              <p className="text-slate-600 mb-4">The requested data source could not be found.</p>
              <Button onClick={() => window.history.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>
          </main>
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
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Button variant="ghost" onClick={() => window.history.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Data Sources
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{dataSource.name}</h2>
                  <div className="flex items-center space-x-3 mt-1">
                    {getStatusIcon(dataSource.status)}
                    <Badge variant="outline" className="uppercase">
                      {dataSource.type}
                    </Badge>
                    <span className="text-sm text-slate-500">
                      Uploaded {new Date(dataSource.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reprocess
                </Button>
              </div>
            </div>
          </div>

          {/* Content Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="mappings">Field Mappings</TabsTrigger>
              <TabsTrigger value="preview">Data Preview</TabsTrigger>
              <TabsTrigger value="history">Processing History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* File Information */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>File Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-600">File Name</label>
                        <p className="text-slate-900">{dataSource.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600">File Type</label>
                        <p className="text-slate-900 uppercase">{dataSource.type}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600">Upload Date</label>
                        <p className="text-slate-900">
                          {new Date(dataSource.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600">Last Updated</label>
                        <p className="text-slate-900">
                          {new Date(dataSource.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600">Status</label>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(dataSource.status)}
                          <span className="text-slate-900 capitalize">{dataSource.status}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600">File Path</label>
                        <p className="text-slate-900 font-mono text-sm">
                          {dataSource.filePath || "N/A"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Processing Status */}
                <Card>
                  <CardHeader>
                    <CardTitle>Processing Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">File Upload</span>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Data Validation</span>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">AI Field Mapping</span>
                        {dataSource.status === "completed" ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-orange-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Data Integration</span>
                        {dataSource.status === "completed" ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="mappings">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Brain className="w-5 h-5 mr-2 text-primary" />
                    AI-Generated Field Mappings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {mappingsLoading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                      <p className="text-slate-600">Loading mappings...</p>
                    </div>
                  ) : mappings.length === 0 ? (
                    <div className="text-center py-8">
                      <Brain className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">No mappings available</h3>
                      <p className="text-slate-600">AI field mapping is still in progress or not yet started.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-3 px-4 font-medium text-slate-600">Source Field</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-600">Target Field</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-600">Confidence</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mappings.map((mapping) => (
                            <tr key={mapping.id} className="border-b border-slate-100">
                              <td className="py-3 px-4 font-mono text-sm">{mapping.sourceField}</td>
                              <td className="py-3 px-4 font-mono text-sm">{mapping.targetField}</td>
                              <td className="py-3 px-4">
                                <Badge 
                                  className={
                                    parseFloat(mapping.confidence) > 90 
                                      ? "bg-green-100 text-green-800"
                                      : parseFloat(mapping.confidence) > 75
                                      ? "bg-orange-100 text-orange-800"
                                      : "bg-red-100 text-red-800"
                                  }
                                >
                                  {mapping.confidence}%
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                {mapping.isApproved ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Approved
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">
                                    Pending Review
                                  </Badge>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex space-x-2">
                                  {!mapping.isApproved && (
                                    <Button
                                      size="sm"
                                      onClick={() => approveMutation.mutate({ id: mapping.id, approved: true })}
                                      disabled={approveMutation.isPending}
                                    >
                                      Approve
                                    </Button>
                                  )}
                                  <Button size="sm" variant="outline">
                                    Edit
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview">
              <Card>
                <CardHeader>
                  <CardTitle>Data Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Database className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">Data preview coming soon</h3>
                    <p className="text-slate-600">We're working on showing you a preview of your data.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Processing History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900">File uploaded successfully</p>
                        <p className="text-xs text-green-700">
                          {new Date(dataSource.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    {dataSource.status === "completed" && (
                      <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                        <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900">AI field mapping completed</p>
                          <p className="text-xs text-blue-700">
                            {mappings.length} field mappings generated with average confidence of{" "}
                            {mappings.length > 0 
                              ? (mappings.reduce((acc, m) => acc + parseFloat(m.confidence), 0) / mappings.length).toFixed(1)
                              : "0"
                            }%
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}