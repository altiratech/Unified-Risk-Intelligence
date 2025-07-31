import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { APIIntegrations } from "@/components/api-integrations";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Database, 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal,
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  Eye,
  RefreshCw,
  Upload
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: string;
  filePath?: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function DataSources() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const queryClient = useQueryClient();

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

  // Fetch data sources
  const { data: dataSources = [], isLoading: dataSourcesLoading, refetch } = useQuery<DataSource[]>({
    queryKey: ["/api/data-sources"],
    retry: false,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/data-sources/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Data source deleted",
        description: "The data source has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/data-sources"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter data sources
  const filteredDataSources = dataSources.filter((source) => {
    const matchesSearch = source.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || source.status === statusFilter;
    const matchesType = typeFilter === "all" || source.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "processing":
        return <Clock className="w-4 h-4 text-orange-600" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: "bg-green-100 text-green-800",
      processing: "bg-orange-100 text-orange-800",
      failed: "bg-red-100 text-red-800",
      pending: "bg-gray-100 text-gray-800"
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.pending}>
        {getStatusIcon(status)}
        <span className="ml-1">{status}</span>
      </Badge>
    );
  };

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

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                  <Database className="w-6 h-6 mr-3 text-primary" />
                  Data Sources
                </h2>
                <p className="text-slate-600">Manage and monitor your data imports and integrations</p>
              </div>
              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => refetch()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Data Source
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center">
                        <Upload className="w-5 h-5 mr-2 text-primary" />
                        Upload New Data Source
                      </DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                      <FileUpload />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* API Integrations Section */}
            <div className="mb-8">
              <APIIntegrations />
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border border-slate-200">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search data sources..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xlsx">Excel</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Sources</p>
                    <p className="text-2xl font-bold text-slate-900">{dataSources.length}</p>
                  </div>
                  <Database className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {dataSources.filter(s => s.status === "completed").length}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Processing</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {dataSources.filter(s => s.status === "processing").length}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Failed</p>
                    <p className="text-2xl font-bold text-red-600">
                      {dataSources.filter(s => s.status === "failed").length}
                    </p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Sources Table */}
          <Card>
            <CardHeader>
              <CardTitle>Data Sources ({filteredDataSources.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {dataSourcesLoading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-slate-600">Loading data sources...</p>
                </div>
              ) : filteredDataSources.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No data sources found</h3>
                  <p className="text-slate-600 mb-4">
                    {searchTerm || statusFilter !== "all" || typeFilter !== "all" 
                      ? "Try adjusting your filters or search term"
                      : "Get started by uploading your first data source"
                    }
                  </p>
                  <Button onClick={() => setShowUploadDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Data Source
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-medium text-slate-600">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">Type</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">Uploaded</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDataSources.map((source) => (
                        <tr key={source.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <FileText className="w-5 h-5 text-blue-500" />
                              <div>
                                <p className="font-medium text-slate-900">{source.name}</p>
                                <p className="text-sm text-slate-500">{source.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant="outline" className="uppercase">
                              {source.type}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            {getStatusBadge(source.status)}
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-slate-600">
                              <p>{new Date(source.createdAt).toLocaleDateString()}</p>
                              <p>{new Date(source.createdAt).toLocaleTimeString()}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/data-sources/${source.id}`}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Reprocess
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => deleteMutation.mutate(source.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}