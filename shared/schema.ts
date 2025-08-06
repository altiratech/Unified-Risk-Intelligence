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
import { nanoid } from "nanoid";

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

// Weather observations (Tomorrow.io data storage)
export const weatherObservations = pgTable("weather_observations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riskExposureId: varchar("risk_exposure_id").references(() => riskExposures.id),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  observationTime: timestamp("observation_time").notNull(),
  temperature: decimal("temperature", { precision: 5, scale: 2 }),
  windSpeed: decimal("wind_speed", { precision: 5, scale: 2 }),
  windDirection: decimal("wind_direction", { precision: 5, scale: 1 }),
  precipitation: decimal("precipitation", { precision: 5, scale: 2 }),
  humidity: decimal("humidity", { precision: 5, scale: 2 }),
  pressure: decimal("pressure", { precision: 8, scale: 2 }),
  visibility: decimal("visibility", { precision: 5, scale: 2 }),
  uvIndex: decimal("uv_index", { precision: 3, scale: 1 }),
  cloudCover: decimal("cloud_cover", { precision: 5, scale: 2 }),
  weatherCode: integer("weather_code"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Raw uploaded data (before mapping)
export const rawData = pgTable("raw_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dataSourceId: varchar("data_source_id").references(() => dataSources.id).notNull(),
  rowIndex: integer("row_index").notNull(),
  rawFields: jsonb("raw_fields").notNull(), // Store original CSV row data
  createdAt: timestamp("created_at").defaultNow(),
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

export const weatherObservationsRelations = relations(weatherObservations, ({ one }) => ({
  riskExposure: one(riskExposures, {
    fields: [weatherObservations.riskExposureId],
    references: [riskExposures.id],
  }),
  organization: one(organizations, {
    fields: [weatherObservations.organizationId],
    references: [organizations.id],
  }),
}));

export const rawDataRelations = relations(rawData, ({ one }) => ({
  dataSource: one(dataSources, {
    fields: [rawData.dataSourceId],
    references: [dataSources.id],
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

export const insertWeatherObservationSchema = createInsertSchema(weatherObservations).omit({
  id: true,
  createdAt: true,
});
export type InsertWeatherObservation = z.infer<typeof insertWeatherObservationSchema>;
export type WeatherObservation = typeof weatherObservations.$inferSelect;

export const insertRawDataSchema = createInsertSchema(rawData).omit({
  id: true,
  createdAt: true,
});
export type InsertRawData = z.infer<typeof insertRawDataSchema>;
export type RawData = typeof rawData.$inferSelect;

// Alert rules table
export const alertRules = pgTable("alert_rules", {
  id: varchar("id").primaryKey().$defaultFn(() => nanoid()),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  name: varchar("name").notNull(),
  description: text("description"),
  conditions: jsonb("conditions").notNull(), // Threshold conditions and logic
  isActive: boolean("is_active").default(true).notNull(),
  notificationMethods: jsonb("notification_methods").notNull(), // Email, webhook configs
  lastEvaluatedAt: timestamp("last_evaluated_at"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Alert instances table  
export const alertInstances = pgTable("alert_instances", {
  id: varchar("id").primaryKey().$defaultFn(() => nanoid()),
  alertRuleId: varchar("alert_rule_id").notNull().references(() => alertRules.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  status: varchar("status").notNull(), // 'active', 'acknowledged', 'resolved'
  triggerValue: varchar("trigger_value"),
  threshold: varchar("threshold"),
  triggerCondition: text("trigger_condition"),
  acknowledgedBy: varchar("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
  notificationsSent: jsonb("notifications_sent"), // Track delivery status
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User notification preferences
export const userNotificationPreferences = pgTable("user_notification_preferences", {
  id: varchar("id").primaryKey().$defaultFn(() => nanoid()),
  userId: varchar("user_id").notNull().references(() => users.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  emailEnabled: boolean("email_enabled").default(true).notNull(),
  emailAddress: varchar("email_address"),
  webhookEnabled: boolean("webhook_enabled").default(false).notNull(),
  webhookUrl: varchar("webhook_url"),
  alertFrequency: varchar("alert_frequency").default("immediate").notNull(), // 'immediate', 'hourly', 'daily'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Alert rule schemas
export const insertAlertRuleSchema = createInsertSchema(alertRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAlertRule = z.infer<typeof insertAlertRuleSchema>;
export type AlertRule = typeof alertRules.$inferSelect;

// Alert instance schemas
export const insertAlertInstanceSchema = createInsertSchema(alertInstances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAlertInstance = z.infer<typeof insertAlertInstanceSchema>;
export type AlertInstance = typeof alertInstances.$inferSelect;

// User notification preference schemas
export const insertUserNotificationPreferenceSchema = createInsertSchema(userNotificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserNotificationPreference = z.infer<typeof insertUserNotificationPreferenceSchema>;
export type UserNotificationPreference = typeof userNotificationPreferences.$inferSelect;
