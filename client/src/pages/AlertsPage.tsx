import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Bell, Settings, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertRuleForm } from '@/components/alert-rule-form';
import { AlertInstancesList } from '@/components/alert-instances-list';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { AuthWrapper } from "@/components/layout/auth-wrapper";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

interface AlertRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  conditions: Array<{
    field: string;
    operator: string;
    value: number;
    aggregation: string;
    groupBy?: string;
  }>;
  notificationMethods: Array<{
    type: 'email' | 'webhook';
    config: any;
  }>;
  createdAt: string;
  lastTriggered?: string;
}

interface AlertInstance {
  id: string;
  alertRuleId: string;
  alertRuleName: string;
  status: 'active' | 'acknowledged' | 'resolved';
  triggeredAt: string;
  value: number;
  threshold: number;
  message: string;
}

function AlertsPageContent() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Sample data for preview mode
  const sampleAlertRules: AlertRule[] = [
    {
      id: "rule-1",
      name: "High Value Exposure Alert",
      description: "Triggers when total insured value exceeds $50M in any region",
      isActive: true,
      conditions: [
        {
          field: "totalInsuredValue",
          operator: "gt",
          value: 50000000,
          aggregation: "sum",
          groupBy: "state"
        }
      ],
      notificationMethods: [
        {
          type: "email",
          config: {
            recipients: ["risk@company.com"],
            template: "default"
          }
        }
      ],
      createdAt: "2024-01-15T10:00:00Z",
      lastTriggered: "2024-01-20T14:30:00Z"
    },
    {
      id: "rule-2", 
      name: "Critical Risk Score Alert",
      description: "Monitors for properties with risk scores above 85",
      isActive: true,
      conditions: [
        {
          field: "riskScore",
          operator: "gt",
          value: 85,
          aggregation: "max"
        }
      ],
      notificationMethods: [
        {
          type: "email",
          config: {
            recipients: ["alerts@company.com"],
            template: "default"
          }
        }
      ],
      createdAt: "2024-01-10T09:00:00Z"
    }
  ];

  const sampleAlertInstances: AlertInstance[] = [
    {
      id: "instance-1",
      alertRuleId: "rule-1",
      alertRuleName: "High Value Exposure Alert",
      status: "active",
      triggeredAt: "2024-01-20T14:30:00Z",
      value: 75000000,
      threshold: 50000000,
      message: "Total insured value in California reached $75M, exceeding threshold of $50M"
    },
    {
      id: "instance-2",
      alertRuleId: "rule-2", 
      alertRuleName: "Critical Risk Score Alert",
      status: "acknowledged",
      triggeredAt: "2024-01-18T11:15:00Z",
      value: 92,
      threshold: 85,
      message: "Property with risk score 92 identified in high-risk wildfire zone"
    },
    {
      id: "instance-3",
      alertRuleId: "rule-1",
      alertRuleName: "High Value Exposure Alert", 
      status: "resolved",
      triggeredAt: "2024-01-15T16:45:00Z",
      value: 62000000,
      threshold: 50000000,
      message: "Total insured value in Texas reached $62M, exceeding threshold of $50M"
    }
  ];

  // Fetch alert rules with fallback to sample data
  const { data: alertRules = sampleAlertRules, isLoading: rulesLoading } = useQuery({
    queryKey: ['/api/alert-rules'],
    staleTime: 30000,
    retry: false,
    throwOnError: false,
  });

  // Fetch alert instances with fallback to sample data  
  const { data: alertInstances = sampleAlertInstances, isLoading: instancesLoading } = useQuery({
    queryKey: ['/api/alert-instances'],
    staleTime: 30000,
    retry: false,
    throwOnError: false,
  });

  // Delete alert rule mutation (preview mode - show success message only)
  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      // In preview mode, simulate successful deletion
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      toast({ 
        title: 'Alert rule deleted successfully',
        description: 'This action would delete the rule in a live environment'
      });
    },
    onError: () => {
      toast({ 
        title: 'Failed to delete alert rule', 
        variant: 'destructive' 
      });
    },
  });

  // Toggle rule active status (preview mode - show success message only)
  const toggleRuleMutation = useMutation({
    mutationFn: async ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) => {
      // In preview mode, simulate successful toggle
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true };
    },
    onSuccess: () => {
      toast({ 
        title: 'Alert rule updated successfully',
        description: 'This action would update the rule in a live environment'
      });
    },
    onError: () => {
      toast({ 
        title: 'Failed to update alert rule', 
        variant: 'destructive' 
      });
    },
  });

  // Manual alert processing (preview mode - show simulated results)
  const processAlertsMutation = useMutation({
    mutationFn: async () => {
      // In preview mode, simulate alert processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { 
        result: { 
          totalEvaluated: 3, 
          totalTriggered: 1 
        } 
      };
    },
    onSuccess: (data) => {
      toast({ 
        title: 'Alert processing completed',
        description: `Evaluated: ${data.result.totalEvaluated}, Triggered: ${data.result.totalTriggered} (Preview Mode)`
      });
    },
    onError: () => {
      toast({ 
        title: 'Alert processing failed', 
        variant: 'destructive' 
      });
    },
  });

  const activeAlerts = (alertInstances as AlertInstance[]).filter((alert: AlertInstance) => alert.status === 'active');
  const acknowledgedAlerts = (alertInstances as AlertInstance[]).filter((alert: AlertInstance) => alert.status === 'acknowledged');

  const handleCreateRule = () => {
    setEditingRule(null);
    setShowCreateForm(true);
  };

  const handleEditRule = (rule: AlertRule) => {
    setEditingRule(rule);
    setShowCreateForm(true);
  };

  const handleFormClose = () => {
    setShowCreateForm(false);
    setEditingRule(null);
  };

  const handleDeleteRule = (ruleId: string) => {
    if (confirm('Are you sure you want to delete this alert rule?')) {
      deleteRuleMutation.mutate(ruleId);
    }
  };

  const handleToggleRule = (ruleId: string, currentActive: boolean) => {
    toggleRuleMutation.mutate({ ruleId, isActive: !currentActive });
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Alert Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Monitor portfolio thresholds and receive notifications
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => processAlertsMutation.mutate()}
            disabled={processAlertsMutation.isPending}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            {processAlertsMutation.isPending ? 'Processing...' : 'Process Alerts'}
          </Button>
          <Button onClick={handleCreateRule} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Alert Rule
          </Button>
        </div>
      </div>

      {/* Alert Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{activeAlerts.length}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alert Rules</CardTitle>
            <Bell className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(alertRules as AlertRule[]).length}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {(alertRules as AlertRule[]).filter((rule: AlertRule) => rule.isActive).length} active rules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acknowledged</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{acknowledgedAlerts.length}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Being handled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="rules">Alert Rules</TabsTrigger>
          <TabsTrigger value="instances">Alert Instances</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          {rulesLoading ? (
            <div className="text-center py-8">Loading alert rules...</div>
          ) : (alertRules as AlertRule[]).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No alert rules configured
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Create your first alert rule to start monitoring your portfolio
                </p>
                <Button onClick={handleCreateRule}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Alert Rule
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {(alertRules as AlertRule[]).map((rule: AlertRule) => (
                <Card key={rule.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {rule.name}
                          <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </CardTitle>
                        <CardDescription>{rule.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleRule(rule.id, rule.isActive)}
                          disabled={toggleRuleMutation.isPending}
                        >
                          {rule.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRule(rule)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRule(rule.id)}
                          disabled={deleteRuleMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <strong>Conditions:</strong>
                        <ul className="list-disc list-inside ml-4 mt-1">
                          {rule.conditions.map((condition, index) => (
                            <li key={index} className="text-sm text-gray-600 dark:text-gray-300">
                              {condition.field} {condition.operator} {condition.value.toLocaleString()}
                              {condition.aggregation && ` (${condition.aggregation})`}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <strong>Notifications:</strong>
                        <div className="flex gap-2 mt-1">
                          {rule.notificationMethods.map((method, index) => (
                            <Badge key={index} variant="outline">
                              {method.type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {rule.lastTriggered && (
                        <div className="text-sm text-gray-500">
                          Last triggered: {new Date(rule.lastTriggered).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="instances">
          <AlertInstancesList 
            instances={alertInstances as AlertInstance[]} 
            isLoading={instancesLoading}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['/api/alert-instances'] })}
          />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <AlertRuleForm
          rule={editingRule}
          onClose={handleFormClose}
          onSuccess={() => {
            handleFormClose();
            queryClient.invalidateQueries({ queryKey: ['/api/alert-rules'] });
          }}
        />
      )}
    </div>
  );
}

export default function AlertsPage() {
  return (
    <AuthWrapper showLoginPrompt={false}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1">
            <AlertsPageContent />
          </main>
        </div>
      </div>
    </AuthWrapper>
  );
}