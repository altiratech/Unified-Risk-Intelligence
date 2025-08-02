import {
  users,
  organizations,
  dataSources,
  dataMappings,
  riskExposures,
  exportJobs,
  weatherObservations,
  rawData,
  alertRules,
  alertInstances,
  userNotificationPreferences,
  type User,
  type UpsertUser,
  type Organization,
  type InsertOrganization,
  type DataSource,
  type InsertDataSource,
  type DataMapping,
  type InsertDataMapping,
  type RiskExposure,
  type InsertRiskExposure,
  type ExportJob,
  type InsertExportJob,
  type WeatherObservation,
  type InsertWeatherObservation,
  type RawData,
  type InsertRawData,
  type AlertRule,
  type InsertAlertRule,
  type AlertInstance,
  type InsertAlertInstance,
  type UserNotificationPreference,
  type InsertUserNotificationPreference,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Organization operations
  getOrganization(id: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  
  // Data source operations
  getDataSources(organizationId: string): Promise<DataSource[]>;
  getDataSource(id: string): Promise<DataSource | undefined>;
  createDataSource(dataSource: InsertDataSource): Promise<DataSource>;
  updateDataSourceStatus(id: string, status: string): Promise<void>;
  
  // Data mapping operations
  getDataMappings(dataSourceId: string): Promise<DataMapping[]>;
  createDataMapping(mapping: InsertDataMapping): Promise<DataMapping>;
  updateMappingApproval(id: string, isApproved: boolean): Promise<void>;
  
  // Risk exposure operations
  getRiskExposures(organizationId: string): Promise<RiskExposure[]>;
  createRiskExposure(exposure: InsertRiskExposure): Promise<RiskExposure>;
  getRiskMetrics(organizationId: string): Promise<{
    totalExposure: string;
    activePolicies: number;
    highRiskAreas: number;
    pml: string;
    aal: string;
    maxSingleLoss: string;
  }>;
  
  // Export job operations
  getExportJobs(organizationId: string): Promise<ExportJob[]>;
  createExportJob(job: InsertExportJob): Promise<ExportJob>;
  updateExportJobStatus(id: string, status: string, filePath?: string): Promise<void>;
  
  // Weather observation operations
  getWeatherObservations(organizationId: string, riskExposureId?: string): Promise<WeatherObservation[]>;
  createWeatherObservation(observation: InsertWeatherObservation): Promise<WeatherObservation>;
  getLatestWeatherForExposure(riskExposureId: string): Promise<WeatherObservation | undefined>;
  
  // Raw data operations (for CSV ingest pipeline)
  createRawDataBatch(dataSourceId: string, rows: any[]): Promise<RawData[]>;
  getRawData(dataSourceId: string): Promise<RawData[]>;
  deleteRawData(dataSourceId: string): Promise<void>;
  
  // Alert operations
  getAlertRules(organizationId: string): Promise<AlertRule[]>;
  getAlertRule(id: string): Promise<AlertRule | undefined>;
  createAlertRule(rule: InsertAlertRule): Promise<AlertRule>;
  updateAlertRule(id: string, updates: Partial<InsertAlertRule>): Promise<AlertRule>;
  updateAlertRuleEvaluation(id: string): Promise<void>;
  deleteAlertRule(id: string): Promise<void>;
  
  // Alert instance operations
  getAlertInstances(organizationId: string): Promise<AlertInstance[]>;
  getActiveAlertInstance(alertRuleId: string): Promise<AlertInstance | undefined>;
  createAlertInstance(instance: InsertAlertInstance): Promise<AlertInstance>;
  updateAlertInstanceStatus(id: string, status: string, acknowledgedBy?: string): Promise<void>;
  updateAlertInstanceNotifications(id: string, notifications: any[]): Promise<void>;
  
  // User notification preferences
  getUserNotificationPreferences(userId: string, organizationId: string): Promise<UserNotificationPreference | undefined>;
  upsertUserNotificationPreferences(preferences: InsertUserNotificationPreference): Promise<UserNotificationPreference>;
  
  // Raw query operations
  queryRaw(query: string): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Organization operations
  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [created] = await db.insert(organizations).values(org).returning();
    return created;
  }

  // Data source operations
  async getDataSources(organizationId: string): Promise<DataSource[]> {
    return await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.organizationId, organizationId))
      .orderBy(desc(dataSources.createdAt));
  }

  async createDataSource(dataSource: InsertDataSource): Promise<DataSource> {
    const [created] = await db.insert(dataSources).values(dataSource).returning();
    return created;
  }

  async getDataSource(id: string): Promise<DataSource | undefined> {
    const [dataSource] = await db.select().from(dataSources).where(eq(dataSources.id, id));
    return dataSource;
  }

  // Data mapping operations
  async getDataMappings(dataSourceId: string): Promise<DataMapping[]> {
    return await db
      .select()
      .from(dataMappings)
      .where(eq(dataMappings.dataSourceId, dataSourceId));
  }

  async createDataMapping(mapping: InsertDataMapping): Promise<DataMapping> {
    const [created] = await db.insert(dataMappings).values(mapping).returning();
    return created;
  }

  async updateMappingApproval(id: string, isApproved: boolean): Promise<void> {
    await db
      .update(dataMappings)
      .set({ isApproved })
      .where(eq(dataMappings.id, id));
  }

  // Risk exposure operations
  async getRiskExposures(organizationId: string): Promise<RiskExposure[]> {
    return await db
      .select()
      .from(riskExposures)
      .where(eq(riskExposures.organizationId, organizationId))
      .orderBy(desc(riskExposures.createdAt));
  }

  async createRiskExposure(exposure: InsertRiskExposure): Promise<RiskExposure> {
    const [created] = await db.insert(riskExposures).values(exposure).returning();
    return created;
  }

  async getRiskMetrics(organizationId: string): Promise<{
    totalExposure: string;
    activePolicies: number;
    highRiskAreas: number;
    pml: string;
    aal: string;
    maxSingleLoss: string;
  }> {
    const [metrics] = await db
      .select({
        totalExposure: sql<string>`COALESCE(SUM(${riskExposures.totalInsuredValue}), 0)`,
        activePolicies: sql<number>`COUNT(DISTINCT ${riskExposures.policyNumber})`,
        highRiskAreas: sql<number>`COUNT(CASE WHEN ${riskExposures.riskScore} > 7.5 THEN 1 END)`,
        maxSingleLoss: sql<string>`COALESCE(MAX(${riskExposures.totalInsuredValue}), 0)`,
      })
      .from(riskExposures)
      .where(eq(riskExposures.organizationId, organizationId));

    return {
      ...metrics,
      pml: (parseFloat(metrics.totalExposure) * 0.1).toString(), // Simple PML calculation
      aal: (parseFloat(metrics.totalExposure) * 0.02).toString(), // Simple AAL calculation
    };
  }

  // Export job operations
  async getExportJobs(organizationId: string): Promise<ExportJob[]> {
    return await db
      .select()
      .from(exportJobs)
      .where(eq(exportJobs.organizationId, organizationId))
      .orderBy(desc(exportJobs.createdAt));
  }

  async createExportJob(job: InsertExportJob): Promise<ExportJob> {
    const [created] = await db.insert(exportJobs).values(job).returning();
    return created;
  }

  async updateExportJobStatus(id: string, status: string, filePath?: string): Promise<void> {
    await db
      .update(exportJobs)
      .set({ status, filePath, updatedAt: new Date() })
      .where(eq(exportJobs.id, id));
  }

  async updateDataSourceStatus(id: string, status: string): Promise<void> {
    await db
      .update(dataSources)
      .set({ status, updatedAt: new Date() })
      .where(eq(dataSources.id, id));
  }

  // Weather observation operations
  async getWeatherObservations(organizationId: string, riskExposureId?: string): Promise<WeatherObservation[]> {
    const conditions = [eq(weatherObservations.organizationId, organizationId)];
    if (riskExposureId) {
      conditions.push(eq(weatherObservations.riskExposureId, riskExposureId));
    }

    return await db
      .select()
      .from(weatherObservations)
      .where(and(...conditions))
      .orderBy(desc(weatherObservations.observationTime));
  }

  async createWeatherObservation(observation: InsertWeatherObservation): Promise<WeatherObservation> {
    const [created] = await db.insert(weatherObservations).values(observation).returning();
    return created;
  }

  async getLatestWeatherForExposure(riskExposureId: string): Promise<WeatherObservation | undefined> {
    const [weather] = await db
      .select()
      .from(weatherObservations)
      .where(eq(weatherObservations.riskExposureId, riskExposureId))
      .orderBy(desc(weatherObservations.observationTime))
      .limit(1);
    return weather;
  }

  // Raw data operations
  async createRawDataBatch(dataSourceId: string, rows: any[]): Promise<RawData[]> {
    const rawDataRecords = rows.map((row, index) => ({
      dataSourceId,
      rowIndex: index,
      rawFields: row,
    }));

    return await db.insert(rawData).values(rawDataRecords).returning();
  }

  async getRawData(dataSourceId: string): Promise<RawData[]> {
    return await db
      .select()
      .from(rawData)
      .where(eq(rawData.dataSourceId, dataSourceId))
      .orderBy(rawData.rowIndex);
  }

  async deleteRawData(dataSourceId: string): Promise<void> {
    await db.delete(rawData).where(eq(rawData.dataSourceId, dataSourceId));
  }

  async queryRaw(query: string): Promise<any[]> {
    const result = await db.execute(sql.raw(query));
    return result.rows as any[];
  }

  // Alert operations
  async getAlertRules(organizationId: string): Promise<AlertRule[]> {
    return db.select().from(alertRules)
      .where(eq(alertRules.organizationId, organizationId))
      .orderBy(desc(alertRules.createdAt));
  }

  async getAlertRule(id: string): Promise<AlertRule | undefined> {
    const [result] = await db.select().from(alertRules).where(eq(alertRules.id, id));
    return result;
  }

  async createAlertRule(rule: InsertAlertRule): Promise<AlertRule> {
    const [result] = await db.insert(alertRules).values(rule).returning();
    return result;
  }

  async updateAlertRule(id: string, updates: Partial<InsertAlertRule>): Promise<AlertRule> {
    const [result] = await db.update(alertRules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(alertRules.id, id))
      .returning();
    return result;
  }

  async updateAlertRuleEvaluation(id: string): Promise<void> {
    await db.update(alertRules)
      .set({ lastEvaluatedAt: new Date() })
      .where(eq(alertRules.id, id));
  }

  async deleteAlertRule(id: string): Promise<void> {
    await db.delete(alertRules).where(eq(alertRules.id, id));
  }

  // Alert instance operations
  async getAlertInstances(organizationId: string): Promise<AlertInstance[]> {
    return db.select().from(alertInstances)
      .where(eq(alertInstances.organizationId, organizationId))
      .orderBy(desc(alertInstances.createdAt));
  }

  async getActiveAlertInstance(alertRuleId: string): Promise<AlertInstance | undefined> {
    const [result] = await db.select().from(alertInstances)
      .where(and(
        eq(alertInstances.alertRuleId, alertRuleId),
        eq(alertInstances.status, 'active')
      ));
    return result;
  }

  async createAlertInstance(instance: InsertAlertInstance): Promise<AlertInstance> {
    const [result] = await db.insert(alertInstances).values(instance).returning();
    return result;
  }

  async updateAlertInstanceStatus(id: string, status: string, acknowledgedBy?: string): Promise<void> {
    const updates: any = { status, updatedAt: new Date() };
    if (acknowledgedBy) {
      updates.acknowledgedBy = acknowledgedBy;
      updates.acknowledgedAt = new Date();
    }
    if (status === 'resolved') {
      updates.resolvedAt = new Date();
    }
    
    await db.update(alertInstances)
      .set(updates)
      .where(eq(alertInstances.id, id));
  }

  async updateAlertInstanceNotifications(id: string, notifications: any[]): Promise<void> {
    await db.update(alertInstances)
      .set({ notificationsSent: notifications })
      .where(eq(alertInstances.id, id));
  }

  // User notification preferences
  async getUserNotificationPreferences(userId: string, organizationId: string): Promise<UserNotificationPreference | undefined> {
    const [result] = await db.select().from(userNotificationPreferences)
      .where(and(
        eq(userNotificationPreferences.userId, userId),
        eq(userNotificationPreferences.organizationId, organizationId)
      ));
    return result;
  }

  async upsertUserNotificationPreferences(preferences: InsertUserNotificationPreference): Promise<UserNotificationPreference> {
    // Check if preferences exist
    const existing = await this.getUserNotificationPreferences(preferences.userId!, preferences.organizationId!);
    
    if (existing) {
      const [result] = await db.update(userNotificationPreferences)
        .set({ ...preferences, updatedAt: new Date() })
        .where(eq(userNotificationPreferences.id, existing.id))
        .returning();
      return result;
    } else {
      const [result] = await db.insert(userNotificationPreferences).values(preferences).returning();
      return result;
    }
  }
}

export const storage = new DatabaseStorage();
