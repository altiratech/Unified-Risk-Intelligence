import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Plus, Trash2 } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const alertRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  isActive: z.boolean().default(true),
  conditions: z.array(z.object({
    field: z.string().min(1, 'Field is required'),
    operator: z.string().min(1, 'Operator is required'),
    value: z.coerce.number().min(0, 'Value must be positive'),
    aggregation: z.string().min(1, 'Aggregation is required'),
    groupBy: z.string().optional(),
  })).min(1, 'At least one condition is required'),
  notificationMethods: z.array(z.object({
    type: z.enum(['email', 'webhook']),
    config: z.object({
      recipients: z.array(z.string().email()).optional(),
      webhookUrl: z.string().url().optional(),
      template: z.string().optional(),
    }),
  })).min(1, 'At least one notification method is required'),
});

type AlertRuleFormData = z.infer<typeof alertRuleSchema>;

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
}

interface AlertRuleFormProps {
  rule?: AlertRule | null;
  onClose: () => void;
  onSuccess: () => void;
}

const FIELD_OPTIONS = [
  { value: 'totalInsuredValue', label: 'Total Insured Value' },
  { value: 'riskScore', label: 'Risk Score' },
  { value: 'count', label: 'Property Count' },
  { value: 'averageValue', label: 'Average Property Value' },
  { value: 'perilExposure', label: 'Peril Exposure' },
];

const OPERATOR_OPTIONS = [
  { value: 'gt', label: 'Greater than (>)' },
  { value: 'gte', label: 'Greater than or equal (>=)' },
  { value: 'lt', label: 'Less than (<)' },
  { value: 'lte', label: 'Less than or equal (<=)' },
  { value: 'eq', label: 'Equal to (=)' },
  { value: 'ne', label: 'Not equal to (≠)' },
];

const AGGREGATION_OPTIONS = [
  { value: 'sum', label: 'Sum' },
  { value: 'count', label: 'Count' },
  { value: 'avg', label: 'Average' },
  { value: 'max', label: 'Maximum' },
  { value: 'min', label: 'Minimum' },
];

const GROUP_BY_OPTIONS = [
  { value: 'none', label: 'No grouping' },
  { value: 'perilType', label: 'Peril Type' },
  { value: 'state', label: 'State' },
  { value: 'riskLevel', label: 'Risk Level' },
  { value: 'zipCode', label: 'ZIP Code' },
];

export function AlertRuleForm({ rule, onClose, onSuccess }: AlertRuleFormProps) {
  const { toast } = useToast();
  const [emailRecipients, setEmailRecipients] = useState<string>('');

  const form = useForm<AlertRuleFormData>({
    resolver: zodResolver(alertRuleSchema),
    defaultValues: rule ? {
      name: rule.name,
      description: rule.description,
      isActive: rule.isActive,
      conditions: rule.conditions,
      notificationMethods: rule.notificationMethods,
    } : {
      name: '',
      description: '',
      isActive: true,
      conditions: [{
        field: 'totalInsuredValue',
        operator: 'gt',
        value: 0,
        aggregation: 'sum',
        groupBy: 'none',
      }],
      notificationMethods: [{
        type: 'email',
        config: {
          recipients: [],
          template: 'default',
        },
      }],
    },
  });

  const { fields: conditionFields, append: appendCondition, remove: removeCondition } = useFieldArray({
    control: form.control,
    name: 'conditions',
  });

  const { fields: notificationFields, append: appendNotification, remove: removeNotification } = useFieldArray({
    control: form.control,
    name: 'notificationMethods',
  });

  const createMutation = useMutation({
    mutationFn: (data: AlertRuleFormData) => 
      apiRequest('POST', '/api/alert-rules', data),
    onSuccess: () => {
      toast({ title: 'Alert rule created successfully' });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create alert rule',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: AlertRuleFormData) =>
      apiRequest('PUT', `/api/alert-rules/${rule?.id}`, data),
    onSuccess: () => {
      toast({ title: 'Alert rule updated successfully' });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update alert rule',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: AlertRuleFormData) => {
    // Process email recipients
    const processedData = {
      ...data,
      notificationMethods: data.notificationMethods.map((method) => {
        if (method.type === 'email') {
          const recipients = emailRecipients
            .split(',')
            .map(email => email.trim())
            .filter(email => email.length > 0);
          
          return {
            ...method,
            config: {
              ...method.config,
              recipients,
            },
          };
        }
        return method;
      }),
    };

    if (rule) {
      updateMutation.mutate(processedData);
    } else {
      createMutation.mutate(processedData);
    }
  };

  const addCondition = () => {
    appendCondition({
      field: 'totalInsuredValue',
      operator: 'gt',
      value: 0,
      aggregation: 'sum',
      groupBy: '',
    });
  };

  const addEmailNotification = () => {
    appendNotification({
      type: 'email',
      config: {
        recipients: [],
        template: 'default',
      },
    });
  };

  const addWebhookNotification = () => {
    appendNotification({
      type: 'webhook',
      config: {
        webhookUrl: '',
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {rule ? 'Edit Alert Rule' : 'Create Alert Rule'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alert Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., High Portfolio Value Alert" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe when this alert should trigger..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Active</FormLabel>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Conditions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Alert Conditions</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Condition
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {conditionFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-6 gap-4 items-end p-4 border rounded-lg">
                    <FormField
                      control={form.control}
                      name={`conditions.${index}.field`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Field</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select field" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {FIELD_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`conditions.${index}.aggregation`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Aggregation</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select aggregation" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {AGGREGATION_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`conditions.${index}.operator`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Operator</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select operator" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {OPERATOR_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`conditions.${index}.value`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Threshold Value</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(+e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`conditions.${index}.groupBy`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Group By</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select grouping" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {GROUP_BY_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    {conditionFields.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeCondition(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Notification Methods */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Notification Methods</CardTitle>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={addEmailNotification}>
                      <Plus className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={addWebhookNotification}>
                      <Plus className="h-4 w-4 mr-2" />
                      Webhook
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {notificationFields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium capitalize">
                        {form.watch(`notificationMethods.${index}.type`)} Notification
                      </h4>
                      {notificationFields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeNotification(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {form.watch(`notificationMethods.${index}.type`) === 'email' && (
                      <div className="space-y-2">
                        <Label>Email Recipients (comma-separated)</Label>
                        <Input
                          placeholder="risk@company.com, admin@company.com"
                          value={emailRecipients}
                          onChange={(e) => setEmailRecipients(e.target.value)}
                        />
                      </div>
                    )}

                    {form.watch(`notificationMethods.${index}.type`) === 'webhook' && (
                      <FormField
                        control={form.control}
                        name={`notificationMethods.${index}.config.webhookUrl`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Webhook URL</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://your-webhook-url.com/alerts"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : rule
                  ? 'Update Alert Rule'
                  : 'Create Alert Rule'
                }
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}