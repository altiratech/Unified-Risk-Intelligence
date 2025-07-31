import { sql, relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  organizationId: varchar("organization_id").references(() => organizations.id),
  role: varchar("role").notNull().default("user"), // user, admin, analyst
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organizations (multi-tenant support)
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // carrier, reinsurer, mga, consultant
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Data sources
export const dataSources = pgTable("data_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // csv, api, excel, json
  status: varchar("status").notNull().default("pending"), // pending, processing, completed, failed
  filePath: text("file_path"),
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Data mappings (AI-assisted field mapping)
export const dataMappings = pgTable("data_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dataSourceId: varchar("data_source_id").references(() => dataSources.id).notNull(),
  sourceField: varchar("source_field").notNull(),
  targetField: varchar("target_field").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  isApproved: boolean("is_approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Risk exposure data
export const riskExposures = pgTable("risk_exposures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  dataSourceId: varchar("data_source_id").references(() => dataSources.id),
  policyNumber: varchar("policy_number"),
  totalInsuredValue: decimal("total_insured_value", { precision: 15, scale: 2 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  address: text("address"),
  perilType: varchar("peril_type"), // wind, flood, earthquake, cyber, etc.
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Export jobs
export const exportJobs = pgTable("export_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  format: varchar("format").notNull(), // csv, excel, pdf
  status: varchar("status").notNull().default("pending"), // pending, processing, completed, failed
  filePath: text("file_path"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  dataSources: many(dataSources),
  exportJobs: many(exportJobs),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  dataSources: many(dataSources),
  riskExposures: many(riskExposures),
  exportJobs: many(exportJobs),
}));

export const dataSourcesRelations = relations(dataSources, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [dataSources.organizationId],
    references: [organizations.id],
  }),
  uploadedByUser: one(users, {
    fields: [dataSources.uploadedBy],
    references: [users.id],
  }),
  mappings: many(dataMappings),
  riskExposures: many(riskExposures),
}));

export const dataMappingsRelations = relations(dataMappings, ({ one }) => ({
  dataSource: one(dataSources, {
    fields: [dataMappings.dataSourceId],
    references: [dataSources.id],
  }),
}));

export const riskExposuresRelations = relations(riskExposures, ({ one }) => ({
  organization: one(organizations, {
    fields: [riskExposures.organizationId],
    references: [organizations.id],
  }),
  dataSource: one(dataSources, {
    fields: [riskExposures.dataSourceId],
    references: [dataSources.id],
  }),
}));

export const exportJobsRelations = relations(exportJobs, ({ one }) => ({
  organization: one(organizations, {
    fields: [exportJobs.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [exportJobs.userId],
    references: [users.id],
  }),
}));

// Schema types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

export const insertDataSourceSchema = createInsertSchema(dataSources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDataSource = z.infer<typeof insertDataSourceSchema>;
export type DataSource = typeof dataSources.$inferSelect;

export const insertDataMappingSchema = createInsertSchema(dataMappings).omit({
  id: true,
  createdAt: true,
});
export type InsertDataMapping = z.infer<typeof insertDataMappingSchema>;
export type DataMapping = typeof dataMappings.$inferSelect;

export const insertRiskExposureSchema = createInsertSchema(riskExposures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRiskExposure = z.infer<typeof insertRiskExposureSchema>;
export type RiskExposure = typeof riskExposures.$inferSelect;

export const insertExportJobSchema = createInsertSchema(exportJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertExportJob = z.infer<typeof insertExportJobSchema>;
export type ExportJob = typeof exportJobs.$inferSelect;
