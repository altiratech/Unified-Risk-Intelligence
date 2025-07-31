import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { apiIntegrationService } from "./api-integrations";
import multer from "multer";
import path from "path";
import fs from "fs";
import { insertDataSourceSchema, insertDataMappingSchema, insertRiskExposureSchema, insertExportJobSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // File upload configuration
  const upload = multer({
    dest: "uploads/",
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);
      
      // If user doesn't have an organization, create one with sample data
      if (user && !user.organizationId) {
        const org = await storage.createOrganization({
          name: `${user.firstName || user.email || "User"}'s Organization`,
          type: "carrier"
        });
        
        // Update user with organization
        user = await storage.upsertUser({
          ...user,
          organizationId: org.id
        });

        // Create sample data sources
        await storage.createDataSource({
          organizationId: org.id,
          name: "Property_Exposure_FL_2024.csv",
          type: "csv",
          status: "completed",
          filePath: "/uploads/sample1.csv",
          uploadedBy: userId,
        });

        await storage.createDataSource({
          organizationId: org.id,
          name: "CAT_Model_Results.xlsx",
          type: "xlsx",
          status: "processing",
          filePath: "/uploads/sample2.xlsx",
          uploadedBy: userId,
        });

        await storage.createDataSource({
          organizationId: org.id,
          name: "Policy_Data_Q4.json",
          type: "json",
          status: "completed",
          filePath: "/uploads/sample3.json",
          uploadedBy: userId,
        });

        // Create sample risk exposures
        const exposures = [
          {
            organizationId: org.id,
            policyNumber: "POL-FL-001",
            totalInsuredValue: "2500000.00",
            latitude: "25.7617",
            longitude: "-80.1918",
            address: "Miami, FL",
            perilType: "wind",
            riskScore: "8.5"
          },
          {
            organizationId: org.id,
            policyNumber: "POL-CA-002",
            totalInsuredValue: "3200000.00",
            latitude: "34.0522",
            longitude: "-118.2437",
            address: "Los Angeles, CA",
            perilType: "earthquake",
            riskScore: "7.2"
          },
          {
            organizationId: org.id,
            policyNumber: "POL-TX-003",
            totalInsuredValue: "1800000.00",
            latitude: "29.7604",
            longitude: "-95.3698",
            address: "Houston, TX",
            perilType: "flood",
            riskScore: "6.8"
          }
        ];

        for (const exposure of exposures) {
          await storage.createRiskExposure(exposure);
        }
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Data source routes
  app.get('/api/data-sources', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.organizationId) {
        return res.status(400).json({ message: "User not associated with organization" });
      }
      
      const dataSources = await storage.getDataSources(user.organizationId);
      res.json(dataSources);
    } catch (error) {
      console.error("Error fetching data sources:", error);
      res.status(500).json({ message: "Failed to fetch data sources" });
    }
  });

  app.post('/api/data-sources/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.organizationId) {
        return res.status(400).json({ message: "User not associated with organization" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const dataSource = await storage.createDataSource({
        organizationId: user.organizationId,
        name: req.file.originalname,
        type: path.extname(req.file.originalname).toLowerCase().slice(1),
        filePath: req.file.path,
        uploadedBy: userId,
      });

      // Simulate AI processing
      setTimeout(async () => {
        await storage.updateDataSourceStatus(dataSource.id, "completed");
        
        // Create sample AI mappings
        if (req.file.originalname.toLowerCase().includes('exposure')) {
          await storage.createDataMapping({
            dataSourceId: dataSource.id,
            sourceField: "Policy_ID",
            targetField: "policy_number",
            confidence: "98.5",
          });
          
          await storage.createDataMapping({
            dataSourceId: dataSource.id,
            sourceField: "Property_Value",
            targetField: "total_insured_value",
            confidence: "85.2",
          });
        }
      }, 2000);

      res.json(dataSource);
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Get single data source by ID
  app.get('/api/data-sources/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.organizationId) {
        return res.status(400).json({ message: "User not associated with organization" });
      }

      const dataSource = await storage.getDataSource(id);
      
      if (!dataSource || dataSource.organizationId !== user.organizationId) {
        return res.status(404).json({ message: "Data source not found" });
      }

      res.json(dataSource);
    } catch (error) {
      console.error("Error fetching data source:", error);
      res.status(500).json({ message: "Failed to fetch data source" });
    }
  });

  // Data mapping routes
  app.get('/api/data-mappings/:dataSourceId', isAuthenticated, async (req, res) => {
    try {
      const mappings = await storage.getDataMappings(req.params.dataSourceId);
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching mappings:", error);
      res.status(500).json({ message: "Failed to fetch mappings" });
    }
  });

  app.post('/api/data-mappings', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertDataMappingSchema.parse(req.body);
      const mapping = await storage.createDataMapping(validatedData);
      res.json(mapping);
    } catch (error) {
      console.error("Error creating mapping:", error);
      res.status(500).json({ message: "Failed to create mapping" });
    }
  });

  app.patch('/api/data-mappings/:id/approve', isAuthenticated, async (req, res) => {
    try {
      await storage.updateMappingApproval(req.params.id, req.body.approved);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating mapping approval:", error);
      res.status(500).json({ message: "Failed to update mapping" });
    }
  });

  // Risk exposure routes
  app.get('/api/risk-exposures', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.organizationId) {
        return res.status(400).json({ message: "User not associated with organization" });
      }
      
      const exposures = await storage.getRiskExposures(user.organizationId);
      res.json(exposures);
    } catch (error) {
      console.error("Error fetching risk exposures:", error);
      res.status(500).json({ message: "Failed to fetch risk exposures" });
    }
  });

  app.post('/api/risk-exposures', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.organizationId) {
        return res.status(400).json({ message: "User not associated with organization" });
      }

      const validatedData = insertRiskExposureSchema.parse({
        ...req.body,
        organizationId: user.organizationId,
      });
      
      const exposure = await storage.createRiskExposure(validatedData);
      res.json(exposure);
    } catch (error) {
      console.error("Error creating risk exposure:", error);
      res.status(500).json({ message: "Failed to create risk exposure" });
    }
  });

  // Risk metrics route
  app.get('/api/risk-metrics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.organizationId) {
        return res.status(400).json({ message: "User not associated with organization" });
      }
      
      const metrics = await storage.getRiskMetrics(user.organizationId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching risk metrics:", error);
      res.status(500).json({ message: "Failed to fetch risk metrics" });
    }
  });

  // Export routes
  app.get('/api/export-jobs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.organizationId) {
        return res.status(400).json({ message: "User not associated with organization" });
      }
      
      const jobs = await storage.getExportJobs(user.organizationId);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching export jobs:", error);
      res.status(500).json({ message: "Failed to fetch export jobs" });
    }
  });

  app.post('/api/export-jobs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.organizationId) {
        return res.status(400).json({ message: "User not associated with organization" });
      }

      const validatedData = insertExportJobSchema.parse({
        ...req.body,
        organizationId: user.organizationId,
        userId,
      });
      
      const job = await storage.createExportJob(validatedData);
      
      // Simulate export processing
      setTimeout(async () => {
        await storage.updateExportJobStatus(job.id, "completed", `/exports/${job.id}.${job.format}`);
      }, 3000);

      res.json(job);
    } catch (error) {
      console.error("Error creating export job:", error);
      res.status(500).json({ message: "Failed to create export job" });
    }
  });

  // Delete data source
  app.delete('/api/data-sources/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Here you would implement actual deletion logic
      // For now, we'll just simulate success
      res.json({ success: true, message: "Data source deleted successfully" });
    } catch (error) {
      console.error("Error deleting data source:", error);
      res.status(500).json({ message: "Failed to delete data source" });
    }
  });

  // API Integration routes
  app.get('/api/integrations/available', isAuthenticated, (req, res) => {
    try {
      const apis = apiIntegrationService.getAvailableAPIs();
      res.json(apis);
    } catch (error) {
      console.error("Error fetching available APIs:", error);
      res.status(500).json({ message: "Failed to fetch available APIs" });
    }
  });

  app.post('/api/integrations/connect/:provider', isAuthenticated, async (req: any, res) => {
    try {
      const { provider } = req.params;
      const { apiKey, location, propertyId } = req.body;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.organizationId) {
        return res.status(400).json({ message: "User not associated with organization" });
      }

      let result;
      switch (provider) {
        case 'noaa':
          result = await apiIntegrationService.connectNOAAWeatherAPI(user.organizationId, userId);
          break;
        case 'openweather':
          result = await apiIntegrationService.connectOpenWeatherAPI(user.organizationId, userId, apiKey, location);
          break;
        case 'fema':
          result = await apiIntegrationService.connectFEMAAPI(user.organizationId, userId);
          break;
        case 'corelogic':
          result = await apiIntegrationService.connectCoreLogicAPI(user.organizationId, userId, apiKey, propertyId);
          break;
        case 'demex':
          result = await apiIntegrationService.connectDemexAPI(user.organizationId, userId, apiKey, req.body.portfolioId);
          break;
        case 'zesty':
          result = await apiIntegrationService.connectZestyAiAPI(user.organizationId, userId, apiKey, req.body.propertyAddress);
          break;
        case 'tomorrow':
          result = await apiIntegrationService.connectTomorrowIoAPI(user.organizationId, userId, apiKey, location);
          break;
        default:
          return res.status(400).json({ message: "Unknown API provider" });
      }

      res.json(result);
    } catch (error) {
      console.error("Error connecting to API:", error);
      res.status(500).json({ message: "Failed to connect to API" });
    }
  });

  // Weather Risk Analysis routes
  app.post('/api/weather-risk/generate', isAuthenticated, async (req: any, res) => {
    try {
      const { spawn } = await import('child_process');
      const pythonProcess = spawn('python3', [path.join(process.cwd(), 'server/weather-risk.py')], {
        env: { ...process.env, TOMORROW_IO_API_KEY: process.env.TOMORROW_IO_API_KEY }
      });

      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          res.json({ 
            success: true, 
            message: 'Weather risk data generated successfully',
            output: output.trim()
          });
        } else {
          console.error('Python script error:', error);
          res.status(500).json({ 
            success: false, 
            message: 'Failed to generate weather risk data',
            error: error.trim()
          });
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        pythonProcess.kill();
        res.status(408).json({ 
          success: false, 
          message: 'Weather risk generation timed out' 
        });
      }, 30000);

    } catch (error) {
      console.error("Error generating weather risk data:", error);
      res.status(500).json({ message: "Failed to generate weather risk data" });
    }
  });

  // Serve the generated risk data
  app.get('/risk_data.geojson', (req, res) => {
    const filePath = path.join(process.cwd(), 'client/public/risk_data.geojson');
    
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      // Return sample data if file doesn't exist
      const sampleData = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [-118.2437, 34.0522] },
            properties: {
              name: "Los Angeles Office Complex",
              asset_type: "commercial",
              insured_value: 5000000,
              fire_index: 3.2,
              wind_speed: 12.5,
              temperature: 28.5,
              humidity: 35.0,
              precipitation: 0.0,
              risk_score: 68.4,
              risk_level: "high"
            }
          },
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [-122.4194, 37.7749] },
            properties: {
              name: "San Francisco Data Center",
              asset_type: "critical_infrastructure",
              insured_value: 10000000,
              fire_index: 1.8,
              wind_speed: 8.2,
              temperature: 18.5,
              humidity: 65.0,
              precipitation: 0.5,
              risk_score: 24.3,
              risk_level: "low"
            }
          },
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [-115.1398, 36.1699] },
            properties: {
              name: "Las Vegas Casino Resort",
              asset_type: "hospitality",
              insured_value: 15000000,
              fire_index: 4.1,
              wind_speed: 15.8,
              temperature: 35.2,
              humidity: 20.0,
              precipitation: 0.0,
              risk_score: 89.7,
              risk_level: "high"
            }
          }
        ],
        metadata: {
          generated_at: new Date().toISOString(),
          total_assets: 3,
          data_source: "Sample Data"
        }
      };
      res.json(sampleData);
    }
  });

  // Test endpoint for API integrations (development only)
  if (process.env.NODE_ENV === 'development') {
    app.get('/api/test-integrations', async (req, res) => {
      try {
        console.log('Testing API integrations...');
        
        // Test NOAA
        console.log('Testing NOAA...');
        const noaaResult = await apiIntegrationService.connectNOAAWeatherAPI('test-org', 'test-user');
        console.log('NOAA result:', noaaResult.success ? 'SUCCESS' : 'FAILED', noaaResult.error || '');
        
        // Test FEMA
        console.log('Testing FEMA...');
        const femaResult = await apiIntegrationService.connectFEMAAPI('test-org', 'test-user');
        console.log('FEMA result:', femaResult.success ? 'SUCCESS' : 'FAILED', femaResult.error || '');
        
        // Test OpenWeather with invalid key
        console.log('Testing OpenWeather (invalid key)...');
        const owInvalidResult = await apiIntegrationService.connectOpenWeatherAPI('test-org', 'test-user', 'invalid_key', 'test-location');
        console.log('OpenWeather (invalid) result:', owInvalidResult.success ? 'SUCCESS' : 'FAILED', owInvalidResult.error || '');
        
        // Test CoreLogic
        console.log('Testing CoreLogic...');
        const corelogicResult = await apiIntegrationService.connectCoreLogicAPI('test-org', 'test-user', 'test_key', 'test_property');
        console.log('CoreLogic result:', corelogicResult.success ? 'SUCCESS' : 'FAILED', corelogicResult.error || '');
        
        res.json({
          noaa: { success: noaaResult.success, error: noaaResult.error },
          fema: { success: femaResult.success, error: femaResult.error },
          openweather: { success: owInvalidResult.success, error: owInvalidResult.error },
          corelogic: { success: corelogicResult.success, error: corelogicResult.error }
        });
      } catch (error) {
        console.error('Test integration error:', error);
        res.status(500).json({ error: (error as Error).message });
      }
    });
  }

  const httpServer = createServer(app);
  return httpServer;
}
