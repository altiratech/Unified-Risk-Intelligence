import { storage } from "../storage";
import { weatherService } from "../weather-service";

export interface ProcessingJob {
  id: string;
  dataSourceId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processedRows: number;
  totalRows: number;
  errors: string[];
  startedAt?: Date;
  completedAt?: Date;
}

export class RawRowProcessor {
  private static instance: RawRowProcessor;
  private jobs: Map<string, ProcessingJob> = new Map();

  static getInstance(): RawRowProcessor {
    if (!RawRowProcessor.instance) {
      RawRowProcessor.instance = new RawRowProcessor();
    }
    return RawRowProcessor.instance;
  }

  async processRawRows(dataSourceId?: string): Promise<ProcessingJob> {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const job: ProcessingJob = {
      id: jobId,
      dataSourceId: dataSourceId || 'all',
      status: 'pending',
      processedRows: 0,
      totalRows: 0,
      errors: [],
      startedAt: new Date()
    };

    this.jobs.set(jobId, job);

    try {
      console.log(`Starting raw row processing job: ${jobId}`);
      job.status = 'processing';

      // Get unprocessed raw data
      const whereClause = dataSourceId 
        ? `processed = false AND data_source_id = '${dataSourceId}'`
        : `processed = false`;
      
      const rawRows = await storage.queryRaw(`
        SELECT rd.*, ds.organization_id 
        FROM raw_data rd 
        JOIN data_sources ds ON rd.data_source_id = ds.id 
        WHERE ${whereClause}
        ORDER BY rd.created_at
      `) as any[];

      job.totalRows = rawRows.length;
      console.log(`Found ${rawRows.length} unprocessed raw rows`);

      if (rawRows.length === 0) {
        job.status = 'completed';
        job.completedAt = new Date();
        return job;
      }

      // Get field mappings for each data source
      const dataSourceIds = [...new Set(rawRows.map((row: any) => row.data_source_id))];
      const mappingsMap = new Map();

      for (const dsId of dataSourceIds) {
        const mappings = await storage.queryRaw(`
          SELECT source_field, target_field 
          FROM data_mappings 
          WHERE data_source_id = '${dsId}' AND is_approved = true
        `) as any[];
        
        const mappingObj: Record<string, string> = {};
        mappings.forEach((m: any) => {
          mappingObj[m.source_field] = m.target_field;
        });
        mappingsMap.set(dsId, mappingObj);
        console.log(`Loaded ${mappings.length} mappings for data source ${dsId}`);
      }

      // Process each raw row
      for (const rawRow of rawRows) {
        try {
          const mappings = mappingsMap.get(rawRow.data_source_id);
          if (!mappings || Object.keys(mappings).length === 0) {
            job.errors.push(`No approved mappings found for data source ${rawRow.data_source_id}`);
            continue;
          }

          const csvData = rawRow.raw_fields; // raw_fields is already a JSONB object
          console.log(`Processing row ${rawRow.id}, raw_fields type: ${typeof csvData}, value:`, csvData);
          
          // Apply field mappings to create canonical exposure
          const exposureData: any = {
            organizationId: rawRow.organization_id,
            dataSourceId: rawRow.data_source_id
          };

          // Map each field according to approved mappings
          Object.entries(mappings).forEach(([sourceField, targetField]) => {
            if (csvData[sourceField] !== undefined) {
              let value = csvData[sourceField];
              
              // Type conversion based on target field
              switch (targetField) {
                case 'totalInsuredValue':
                case 'latitude':
                case 'longitude':
                case 'riskScore':
                  value = parseFloat(value) || 0;
                  break;
                case 'policyNumber':
                case 'address':
                case 'perilType':
                  value = String(value).trim();
                  break;
              }
              
              exposureData[targetField] = value;
            }
          });

          // Validate required fields
          if (!exposureData.policyNumber) {
            job.errors.push(`Missing policy number for row ${rawRow.id}`);
            continue;
          }

          // Create risk exposure
          const exposure = await storage.createRiskExposure(exposureData);
          console.log(`Created risk exposure: ${exposure.id} for policy ${exposureData.policyNumber}`);

          // Enqueue weather observation if location data is available
          if (exposureData.latitude && exposureData.longitude) {
            try {
              await weatherService.storeObservation(
                exposure.id,
                exposureData.latitude,
                exposureData.longitude
              );
              console.log(`Weather observation stored for exposure ${exposure.id}`);
            } catch (weatherError) {
              console.warn(`Failed to store weather for exposure ${exposure.id}:`, weatherError);
              job.errors.push(`Weather error for exposure ${exposure.id}: ${weatherError instanceof Error ? weatherError.message : 'Unknown error'}`);
            }
          }

          // Mark raw row as processed
          await storage.queryRaw(`
            UPDATE raw_data 
            SET processed = true, processed_at = NOW() 
            WHERE id = '${rawRow.id}'
          `);

          job.processedRows++;

        } catch (rowError) {
          const errorMsg = `Failed to process row ${rawRow.id}: ${rowError instanceof Error ? rowError.message : 'Unknown error'}`;
          console.error(errorMsg);
          job.errors.push(errorMsg);
        }
      }

      job.status = 'completed';
      job.completedAt = new Date();
      
      console.log(`Job ${jobId} completed: ${job.processedRows}/${job.totalRows} rows processed, ${job.errors.length} errors`);

    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      job.errors.push(`Job failed: ${errorMsg}`);
      console.error(`Job ${jobId} failed:`, error);
    }

    return job;
  }

  getJob(jobId: string): ProcessingJob | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): ProcessingJob[] {
    return Array.from(this.jobs.values());
  }

  // Clean up old jobs (keep last 50)
  cleanupJobs(): void {
    const jobs = Array.from(this.jobs.entries())
      .sort(([,a], [,b]) => (b.startedAt?.getTime() || 0) - (a.startedAt?.getTime() || 0));
    
    if (jobs.length > 50) {
      const toRemove = jobs.slice(50);
      toRemove.forEach(([jobId]) => this.jobs.delete(jobId));
    }
  }
}

export const rawRowProcessor = RawRowProcessor.getInstance();