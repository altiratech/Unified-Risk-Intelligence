import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface AlertInstance {
  id: string;
  alertRuleId: string;
  alertRuleName: string;
  status: 'active' | 'acknowledged' | 'resolved';
  triggeredAt: string;
  value: number;
  threshold: number;
  message: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

interface AlertInstancesListProps {
  instances: AlertInstance[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function AlertInstancesList({ instances, isLoading, onRefresh }: AlertInstancesListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const acknowledgeMutation = useMutation({
    mutationFn: (instanceId: string) =>
      apiRequest('POST', `/api/alert-instances/${instanceId}/acknowledge`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alert-instances'] });
      toast({ title: 'Alert acknowledged successfully' });
    },
    onError: () => {
      toast({
        title: 'Failed to acknowledge alert',
        variant: 'destructive',
      });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (instanceId: string) =>
      apiRequest('POST', `/api/alert-instances/${instanceId}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alert-instances'] });
      toast({ title: 'Alert resolved successfully' });
    },
    onError: () => {
      toast({
        title: 'Failed to resolve alert',
        variant: 'destructive',
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'acknowledged':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'destructive' as const;
      case 'acknowledged':
        return 'secondary' as const;
      case 'resolved':
        return 'default' as const;
      default:
        return 'outline' as const;
    }
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    } else {
      return `$${value.toFixed(0)}`;
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
        Loading alert instances...
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No alerts triggered
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            All your portfolio thresholds are within normal ranges
          </p>
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Group instances by status
  const activeInstances = instances.filter(i => i.status === 'active');
  const acknowledgedInstances = instances.filter(i => i.status === 'acknowledged');
  const resolvedInstances = instances.filter(i => i.status === 'resolved');

  const renderInstances = (instanceList: AlertInstance[], title: string, emptyMessage: string) => {
    if (instanceList.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {instanceList.map((instance) => (
          <Card key={instance.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(instance.status)}
                  <CardTitle className="text-lg">{instance.alertRuleName}</CardTitle>
                  <Badge variant={getStatusVariant(instance.status)}>
                    {instance.status.charAt(0).toUpperCase() + instance.status.slice(1)}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {instance.status === 'active' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeMutation.mutate(instance.id)}
                        disabled={acknowledgeMutation.isPending}
                      >
                        Acknowledge
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => resolveMutation.mutate(instance.id)}
                        disabled={resolveMutation.isPending}
                      >
                        Resolve
                      </Button>
                    </>
                  )}
                  {instance.status === 'acknowledged' && (
                    <Button
                      size="sm"
                      onClick={() => resolveMutation.mutate(instance.id)}
                      disabled={resolveMutation.isPending}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-gray-600 dark:text-gray-300">
                  {instance.message}
                </p>
                
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <strong>Current Value:</strong> {formatValue(instance.value)}
                    <span className="mx-2">|</span>
                    <strong>Threshold:</strong> {formatValue(instance.threshold)}
                  </div>
                  <div className="text-gray-500">
                    Triggered: {new Date(instance.triggeredAt).toLocaleString()}
                  </div>
                </div>

                {instance.status === 'acknowledged' && instance.acknowledgedAt && (
                  <div className="text-sm text-yellow-600">
                    Acknowledged on {new Date(instance.acknowledgedAt).toLocaleString()}
                    {instance.acknowledgedBy && ` by ${instance.acknowledgedBy}`}
                  </div>
                )}

                {instance.status === 'resolved' && instance.resolvedAt && (
                  <div className="text-sm text-green-600">
                    Resolved on {new Date(instance.resolvedAt).toLocaleString()}
                    {instance.resolvedBy && ` by ${instance.resolvedBy}`}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Alert Instances</h2>
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Active Alerts */}
      <div>
        <h3 className="text-lg font-medium text-red-600 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Active Alerts ({activeInstances.length})
        </h3>
        {renderInstances(activeInstances, 'Active Alerts', 'No active alerts - all thresholds are within normal ranges')}
      </div>

      {/* Acknowledged Alerts */}
      <div>
        <h3 className="text-lg font-medium text-yellow-600 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Acknowledged Alerts ({acknowledgedInstances.length})
        </h3>
        {renderInstances(acknowledgedInstances, 'Acknowledged Alerts', 'No acknowledged alerts')}
      </div>

      {/* Resolved Alerts */}
      <div>
        <h3 className="text-lg font-medium text-green-600 mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Resolved Alerts ({resolvedInstances.length})
        </h3>
        {renderInstances(resolvedInstances, 'Resolved Alerts', 'No resolved alerts yet')}
      </div>
    </div>
  );
}