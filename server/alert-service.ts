import { storage } from "./storage";
import { 
  type AlertRule, 
  type InsertAlertRule, 
  type AlertInstance, 
  type InsertAlertInstance,
  type UserNotificationPreference
} from "@shared/schema";
import nodemailer from 'nodemailer';

export interface AlertCondition {
  field: string; // 'totalInsuredValue', 'riskScore', etc.
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne';
  value: number | string;
  aggregation?: 'sum' | 'count' | 'avg' | 'max' | 'min';
  groupBy?: string; // 'perilType', 'state', etc.
}

export interface NotificationMethod {
  type: 'email' | 'webhook';
  config: {
    recipients?: string[];
    webhookUrl?: string;
    template?: string;
  };
}

export interface AlertEvaluationResult {
  triggered: boolean;
  currentValue: string;
  threshold: string;
  affectedExposures?: any[];
}

/**
 * Alert service for managing threshold-based notifications
 */
export class AlertService {
  private emailTransporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeEmailTransporter();
  }

  private initializeEmailTransporter(): void {
    const smtpConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    if (smtpConfig.host && smtpConfig.auth.user && smtpConfig.auth.pass) {
      this.emailTransporter = nodemailer.createTransport(smtpConfig);
      console.log('Email transporter initialized');
    } else {
      console.warn('SMTP configuration incomplete - email notifications disabled');
    }
  }

  /**
   * Create a new alert rule
   */
  async createAlertRule(
    organizationId: string,
    userId: string,
    rule: {
      name: string;
      description?: string;
      conditions: AlertCondition[];
      notificationMethods: NotificationMethod[];
    }
  ): Promise<AlertRule> {
    const alertRule: InsertAlertRule = {
      organizationId,
      createdBy: userId,
      name: rule.name,
      description: rule.description || null,
      conditions: rule.conditions,
      notificationMethods: rule.notificationMethods,
      isActive: true,
      lastEvaluatedAt: null,
    };

    return await storage.createAlertRule(alertRule);
  }

  /**
   * Evaluate a single alert rule against current exposure data
   */
  async evaluateAlertRule(
    alertRule: AlertRule
  ): Promise<AlertEvaluationResult> {
    console.log(`Evaluating alert rule: ${alertRule.name}`);

    const conditions = alertRule.conditions as AlertCondition[];
    const exposures = await storage.getRiskExposures(alertRule.organizationId);

    // For now, implement simple threshold checking
    // In production, this would support complex aggregations and grouping
    let triggered = false;
    let currentValue = '0';
    let threshold = '0';
    let affectedExposures: any[] = [];

    for (const condition of conditions) {
      const result = this.evaluateCondition(condition, exposures);
      
      if (result.triggered) {
        triggered = true;
        currentValue = result.currentValue;
        threshold = result.threshold;
        affectedExposures = result.affectedExposures || [];
        break; // First triggered condition wins for now
      }
    }

    // Update last evaluated timestamp
    await storage.updateAlertRuleEvaluation(alertRule.id);

    return {
      triggered,
      currentValue,
      threshold,
      affectedExposures,
    };
  }

  /**
   * Evaluate a single condition against exposure data
   */
  private evaluateCondition(
    condition: AlertCondition,
    exposures: any[]
  ): AlertEvaluationResult {
    const { field, operator, value, aggregation, groupBy } = condition;

    if (aggregation === 'sum' && field === 'totalInsuredValue') {
      // Sum total insured values
      const total = exposures.reduce((sum, exp) => sum + (exp.totalInsuredValue || 0), 0);
      const threshold = parseFloat(value.toString());
      
      let triggered = false;
      switch (operator) {
        case 'gt': triggered = total > threshold; break;
        case 'gte': triggered = total >= threshold; break;
        case 'lt': triggered = total < threshold; break;
        case 'lte': triggered = total <= threshold; break;
        case 'eq': triggered = total === threshold; break;
        case 'ne': triggered = total !== threshold; break;
      }

      return {
        triggered,
        currentValue: total.toFixed(2),
        threshold: threshold.toFixed(2),
        affectedExposures: triggered ? exposures : [],
      };
    }

    if (aggregation === 'count') {
      // Count exposures matching criteria
      let filteredExposures = exposures;
      
      if (groupBy) {
        // Filter by group (e.g., perilType = 'flood')
        const groupValue = value.toString();
        filteredExposures = exposures.filter(exp => exp[groupBy] === groupValue);
      }

      const count = filteredExposures.length;
      const threshold = parseInt(value.toString());
      
      let triggered = false;
      switch (operator) {
        case 'gt': triggered = count > threshold; break;
        case 'gte': triggered = count >= threshold; break;
        case 'lt': triggered = count < threshold; break;
        case 'lte': triggered = count <= threshold; break;
        case 'eq': triggered = count === threshold; break;
        case 'ne': triggered = count !== threshold; break;
      }

      return {
        triggered,
        currentValue: count.toString(),
        threshold: threshold.toString(),
        affectedExposures: triggered ? filteredExposures : [],
      };
    }

    // Default: no trigger
    return {
      triggered: false,
      currentValue: '0',
      threshold: value.toString(),
    };
  }

  /**
   * Create an alert instance when a rule is triggered
   */
  async createAlertInstance(
    alertRule: AlertRule,
    evaluation: AlertEvaluationResult
  ): Promise<AlertInstance> {
    const alertInstance: InsertAlertInstance = {
      alertRuleId: alertRule.id,
      organizationId: alertRule.organizationId,
      status: 'active',
      triggerValue: evaluation.currentValue,
      threshold: evaluation.threshold,
      triggerCondition: `${alertRule.name} threshold exceeded`,
      notificationsSent: [],
    };

    const instance = await storage.createAlertInstance(alertInstance);
    
    // Send notifications
    await this.sendNotifications(alertRule, instance, evaluation);
    
    return instance;
  }

  /**
   * Send notifications for a triggered alert
   */
  private async sendNotifications(
    alertRule: AlertRule,
    alertInstance: AlertInstance,
    evaluation: AlertEvaluationResult
  ): Promise<void> {
    const notificationMethods = alertRule.notificationMethods as NotificationMethod[];
    const notifications: any[] = [];

    for (const method of notificationMethods) {
      try {
        if (method.type === 'email' && this.emailTransporter) {
          await this.sendEmailNotification(alertRule, alertInstance, evaluation, method);
          notifications.push({
            type: 'email',
            status: 'sent',
            timestamp: new Date().toISOString(),
          });
        } else if (method.type === 'webhook') {
          await this.sendWebhookNotification(alertRule, alertInstance, evaluation, method);
          notifications.push({
            type: 'webhook',
            status: 'sent',
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error(`Failed to send ${method.type} notification:`, error);
        notifications.push({
          type: method.type,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Update notification status
    await storage.updateAlertInstanceNotifications(alertInstance.id, notifications);
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    alertRule: AlertRule,
    alertInstance: AlertInstance,
    evaluation: AlertEvaluationResult,
    method: NotificationMethod
  ): Promise<void> {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not configured');
    }

    const recipients = method.config.recipients || [process.env.SMTP_USER];
    const subject = `Alert: ${alertRule.name}`;
    const text = `
Alert Rule: ${alertRule.name}
Description: ${alertRule.description || 'N/A'}

Threshold Exceeded:
- Current Value: ${evaluation.currentValue}
- Threshold: ${evaluation.threshold}
- Affected Exposures: ${evaluation.affectedExposures?.length || 0}

Alert ID: ${alertInstance.id}
Triggered At: ${alertInstance.createdAt}
    `.trim();

    await this.emailTransporter.sendMail({
      from: process.env.SMTP_USER,
      to: recipients.join(', '),
      subject,
      text,
    });

    console.log(`Email notification sent for alert ${alertRule.name}`);
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(
    alertRule: AlertRule,
    alertInstance: AlertInstance,
    evaluation: AlertEvaluationResult,
    method: NotificationMethod
  ): Promise<void> {
    if (!method.config.webhookUrl) {
      throw new Error('Webhook URL not configured');
    }

    const payload = {
      alertRule: {
        id: alertRule.id,
        name: alertRule.name,
        description: alertRule.description,
      },
      alertInstance: {
        id: alertInstance.id,
        status: alertInstance.status,
        triggerValue: alertInstance.triggerValue,
        threshold: alertInstance.threshold,
        createdAt: alertInstance.createdAt,
      },
      evaluation: {
        currentValue: evaluation.currentValue,
        threshold: evaluation.threshold,
        affectedExposuresCount: evaluation.affectedExposures?.length || 0,
      },
    };

    const response = await fetch(method.config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.WEBHOOK_SECRET || '',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
    }

    console.log(`Webhook notification sent for alert ${alertRule.name}`);
  }

  /**
   * Process all active alert rules for an organization
   */
  async processAlertsForOrganization(organizationId: string): Promise<{
    evaluated: number;
    triggered: number;
    errors: string[];
  }> {
    const alertRules = await storage.getAlertRules(organizationId);
    let evaluated = 0;
    let triggered = 0;
    const errors: string[] = [];

    console.log(`Processing ${alertRules.length} alert rules for organization ${organizationId}`);

    for (const rule of alertRules) {
      if (!rule.isActive) continue;

      try {
        const evaluation = await this.evaluateAlertRule(rule);
        evaluated++;

        if (evaluation.triggered) {
          // Check if we already have an active alert for this rule
          const existingAlert = await storage.getActiveAlertInstance(rule.id);
          
          if (!existingAlert) {
            await this.createAlertInstance(rule, evaluation);
            triggered++;
            console.log(`Alert triggered: ${rule.name}`);
          } else {
            console.log(`Alert already active: ${rule.name}`);
          }
        }
      } catch (error) {
        const errorMsg = `Failed to process alert rule ${rule.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    return { evaluated, triggered, errors };
  }
}

export const alertService = new AlertService();