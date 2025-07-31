import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Cloud,
  CloudRain,
  AlertTriangle,
  Building,
  Link,
  CheckCircle,
  Key,
  Globe,
  Zap,
  RefreshCw,
  Star,
  Brain,
  Satellite
} from "lucide-react";

interface APIProvider {
  id: string;
  name: string;
  description: string;
  requiresAuth: boolean;
  authFields?: string[];
  categories: string[];
  website?: string;
  logo?: string;
}

interface ConnectionForm {
  apiKey?: string;
  location?: string;
  propertyId?: string;
  clientId?: string;
  propertyAddress?: string;
  portfolioId?: string;
}

export function APIIntegrations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<APIProvider | null>(null);
  const [connectionForm, setConnectionForm] = useState<ConnectionForm>({});
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);

  // Fetch available API providers
  const { data: providers = [], isLoading: providersLoading } = useQuery<APIProvider[]>({
    queryKey: ['/api/integrations/available'],
    retry: false,
  });

  // Connect to API mutation
  const connectMutation = useMutation({
    mutationFn: async ({ provider, formData }: { provider: string; formData: ConnectionForm }) => {
      return await apiRequest("POST", `/api/integrations/connect/${provider}`, formData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
      setShowConnectionDialog(false);
      setConnectionForm({});
      
      // Check if response has success field and it's true
      if ((data as any).success === true) {
        toast({
          title: "API Connected",
          description: `Successfully connected to ${selectedProvider?.name}. Data source created.`,
        });
      } else {
        // Only show error if success is explicitly false or doesn't exist
        toast({
          title: (data as any).requiresAuth ? "Authentication Required" : "Connection Failed", 
          description: (data as any).error || "Connection failed. Please check your credentials.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Connection Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'noaa':
        return <Cloud className="w-6 h-6 text-blue-500" />;
      case 'openweather':
        return <CloudRain className="w-6 h-6 text-orange-500" />;
      case 'fema':
        return <AlertTriangle className="w-6 h-6 text-red-500" />;
      case 'corelogic':
        return <Building className="w-6 h-6 text-green-500" />;
      case 'demex':
        return <Zap className="w-6 h-6 text-purple-500" />;
      case 'zesty':
        return <Brain className="w-6 h-6 text-indigo-500" />;
      case 'tomorrow':
        return <Satellite className="w-6 h-6 text-teal-500" />;
      default:
        return <Globe className="w-6 h-6 text-gray-500" />;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      weather: "bg-blue-100 text-blue-800",
      climate: "bg-cyan-100 text-cyan-800",
      disasters: "bg-red-100 text-red-800",
      flooding: "bg-purple-100 text-purple-800",
      emergency: "bg-orange-100 text-orange-800",
      property: "bg-green-100 text-green-800",
      valuation: "bg-yellow-100 text-yellow-800",
      risk: "bg-pink-100 text-pink-800",
      environmental: "bg-teal-100 text-teal-800",
      catastrophe: "bg-purple-100 text-purple-800",
      modeling: "bg-violet-100 text-violet-800",
      ai: "bg-indigo-100 text-indigo-800",
      satellite: "bg-blue-200 text-blue-900",
      intelligence: "bg-teal-100 text-teal-800"
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const handleConnect = (provider: APIProvider) => {
    setSelectedProvider(provider);
    setConnectionForm({});
    setShowConnectionDialog(true);
  };

  const handleSubmitConnection = () => {
    if (!selectedProvider) return;
    
    connectMutation.mutate({
      provider: selectedProvider.id,
      formData: connectionForm
    });
  };

  if (providersLoading) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
        <p className="text-slate-600">Loading API integrations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">API Integrations</h3>
          <p className="text-sm text-slate-600">Connect to external data sources and APIs</p>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All APIs</TabsTrigger>
          <TabsTrigger value="weather">Weather</TabsTrigger>
          <TabsTrigger value="disasters">Disasters</TabsTrigger>
          <TabsTrigger value="property">Property</TabsTrigger>
          <TabsTrigger value="enterprise">Enterprise</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map((provider) => (
              <Card key={provider.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getProviderIcon(provider.id)}
                      <div>
                        <CardTitle className="text-base">{provider.name}</CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          {provider.requiresAuth ? (
                            <Badge variant="outline" className="text-xs">
                              <Key className="w-3 h-3 mr-1" />
                              Auth Required
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              No Auth
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleConnect(provider)}
                      disabled={connectMutation.isPending}
                    >
                      <Link className="w-4 h-4 mr-2" />
                      Connect
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-slate-600 mb-3">{provider.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {provider.categories.map((category) => (
                      <Badge 
                        key={category} 
                        variant="secondary" 
                        className={`text-xs ${getCategoryColor(category)}`}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                  {provider.website && (
                    <div className="mt-3">
                      <a 
                        href={provider.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Learn more →
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="weather" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.filter(p => p.categories.includes('weather') || p.categories.includes('climate')).map((provider) => (
              <Card key={provider.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getProviderIcon(provider.id)}
                      <div>
                        <CardTitle className="text-base">{provider.name}</CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          {provider.requiresAuth ? (
                            <Badge variant="outline" className="text-xs">
                              <Key className="w-3 h-3 mr-1" />
                              Auth Required
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              No Auth
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleConnect(provider)}
                      disabled={connectMutation.isPending}
                    >
                      <Link className="w-4 h-4 mr-2" />
                      Connect
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-slate-600 mb-3">{provider.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {provider.categories.map((category) => (
                      <Badge 
                        key={category} 
                        variant="secondary" 
                        className={`text-xs ${getCategoryColor(category)}`}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="disasters" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.filter(p => p.categories.includes('disasters') || p.categories.includes('emergency')).map((provider) => (
              <Card key={provider.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getProviderIcon(provider.id)}
                      <div>
                        <CardTitle className="text-base">{provider.name}</CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          {provider.requiresAuth ? (
                            <Badge variant="outline" className="text-xs">
                              <Key className="w-3 h-3 mr-1" />
                              Auth Required
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              No Auth
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleConnect(provider)}
                      disabled={connectMutation.isPending}
                    >
                      <Link className="w-4 h-4 mr-2" />
                      Connect
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-slate-600 mb-3">{provider.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {provider.categories.map((category) => (
                      <Badge 
                        key={category} 
                        variant="secondary" 
                        className={`text-xs ${getCategoryColor(category)}`}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="property" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.filter(p => p.categories.includes('property') || p.categories.includes('valuation')).map((provider) => (
              <Card key={provider.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getProviderIcon(provider.id)}
                      <div>
                        <CardTitle className="text-base">{provider.name}</CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          {provider.requiresAuth ? (
                            <Badge variant="outline" className="text-xs">
                              <Key className="w-3 h-3 mr-1" />
                              Auth Required
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              No Auth
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleConnect(provider)}
                      disabled={connectMutation.isPending}
                    >
                      <Link className="w-4 h-4 mr-2" />
                      Connect
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-slate-600 mb-3">{provider.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {provider.categories.map((category) => (
                      <Badge 
                        key={category} 
                        variant="secondary" 
                        className={`text-xs ${getCategoryColor(category)}`}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="enterprise" className="space-y-4">
          <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Star className="w-5 h-5 text-purple-600" />
              <h4 className="font-semibold text-purple-900">Enterprise Data Providers</h4>
            </div>
            <p className="text-sm text-purple-700">
              Advanced insurance data sources with comprehensive risk modeling, AI-powered property analysis, 
              and catastrophe risk intelligence specifically designed for insurance carriers and reinsurers.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.filter(p => (p as any).enterprise).map((provider) => (
              <Card key={provider.id} className="hover:shadow-md transition-shadow border-purple-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getProviderIcon(provider.id)}
                      <div>
                        <CardTitle className="text-base">{provider.name}</CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            <Key className="w-3 h-3 mr-1" />
                            Auth Required
                          </Badge>
                          <Badge variant="default" className="text-xs bg-purple-600">
                            <Star className="w-3 h-3 mr-1" />
                            Enterprise
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleConnect(provider)}
                      disabled={connectMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Link className="w-4 h-4 mr-2" />
                      Connect
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-slate-600 mb-3">{provider.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {provider.categories.map((category) => (
                      <Badge 
                        key={category} 
                        variant="secondary" 
                        className={`text-xs ${getCategoryColor(category)}`}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                  {provider.website && (
                    <div className="mt-3">
                      <a 
                        href={provider.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-purple-600 hover:underline"
                      >
                        Learn more →
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Connection Dialog */}
      <Dialog open={showConnectionDialog} onOpenChange={setShowConnectionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedProvider && getProviderIcon(selectedProvider.id)}
              <span>Connect to {selectedProvider?.name}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-600">
              {selectedProvider?.description}
            </p>
            
            {selectedProvider?.requiresAuth && (
              <div className="space-y-3">
                {selectedProvider.authFields?.includes('apiKey') && (
                  <div>
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Enter your API key"
                      value={connectionForm.apiKey || ''}
                      onChange={(e) => setConnectionForm(prev => ({ ...prev, apiKey: e.target.value }))}
                    />
                  </div>
                )}
                
                {selectedProvider.authFields?.includes('clientId') && (
                  <div>
                    <Label htmlFor="clientId">Client ID</Label>
                    <Input
                      id="clientId"
                      placeholder="Enter your client ID"
                      value={connectionForm.clientId || ''}
                      onChange={(e) => setConnectionForm(prev => ({ ...prev, clientId: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            )}
            
            {selectedProvider?.id === 'openweather' && (
              <div>
                <Label htmlFor="location">Location (optional)</Label>
                <Input
                  id="location"
                  placeholder="e.g., Miami,FL or 25.7617,-80.1918"
                  value={connectionForm.location || ''}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
            )}
            
            {selectedProvider?.id === 'corelogic' && (
              <div>
                <Label htmlFor="propertyId">Property ID (optional)</Label>
                <Input
                  id="propertyId"
                  placeholder="Enter property identifier"
                  value={connectionForm.propertyId || ''}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, propertyId: e.target.value }))}
                />
              </div>
            )}
            
            {selectedProvider?.id === 'demex' && (
              <div>
                <Label htmlFor="portfolioId">Portfolio ID (optional)</Label>
                <Input
                  id="portfolioId"
                  placeholder="Enter portfolio identifier"
                  value={connectionForm.portfolioId || ''}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, portfolioId: e.target.value }))}
                />
              </div>
            )}
            
            {selectedProvider?.id === 'zesty' && (
              <div>
                <Label htmlFor="propertyAddress">Property Address (optional)</Label>
                <Input
                  id="propertyAddress"
                  placeholder="e.g., 123 Ocean Drive, Miami, FL"
                  value={connectionForm.propertyAddress || ''}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, propertyAddress: e.target.value }))}
                />
              </div>
            )}
            
            {(selectedProvider?.id === 'tomorrow' || selectedProvider?.id === 'openweather') && (
              <div>
                <Label htmlFor="location">Location (optional)</Label>
                <Input
                  id="location"
                  placeholder="e.g., Miami,FL or 25.7617,-80.1918"
                  value={connectionForm.location || ''}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowConnectionDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitConnection}
              disabled={connectMutation.isPending}
            >
              {connectMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Connect
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}