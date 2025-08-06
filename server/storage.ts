import {
  users,
  organizations,
  dataSources,
  dataMappings,
  riskExposures,
  exportJobs,
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

  async updateDataSourceStatus(id: string, status: string): Promise<void> {
    await db
      .update(dataSources)
      .set({ status, updatedAt: new Date() })
      .where(eq(dataSources.id, id));
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
}

export const storage = new DatabaseStorage();
