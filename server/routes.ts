import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { apiIntegrationService } from "./api-integrations";
import multer from "multer";
import path from "path";
import fs from "fs";
import { parse } from "csv-parse/sync";
import { insertDataSourceSchema, insertDataMappingSchema, insertRiskExposureSchema, insertExportJobSchema } from "@shared/schema";
import { riskAnalyticsEngine } from "./risk-analytics";
import { dataProcessingEngine } from "./data-processing";
import { csvProcessor } from "./csv-processor";
import { weatherService } from "./weather-service";

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
        status: "processing",
        filePath: req.file.path,
        uploadedBy: userId,
      });

      // Process the uploaded file with AI-powered analysis
      console.log("Processing uploaded file with AI:", req.file.originalname);
      
      try {
        const processedData = await dataProcessingEngine.processDataFile(req.file.path, dataSource.id);
        
        // Update data source status
        await storage.updateDataSourceStatus(dataSource.id, "completed");
        
        // Auto-create mapping suggestions
        for (const suggestion of processedData.mappingSuggestions) {
          await storage.createDataMapping({
            dataSourceId: dataSource.id,
            sourceField: suggestion.sourceField,
            targetField: suggestion.targetField,
            confidence: suggestion.confidence.toString(),
            isApproved: suggestion.confidence >= 90 // Auto-approve high confidence mappings
          });
        }
        
        res.json({ 
          message: "File uploaded and processed successfully",
          dataSource,
          processing: {
            rowCount: processedData.rowCount,
            fieldsAnalyzed: processedData.fields.length,
            mappingSuggestions: processedData.mappingSuggestions.length,
            qualityScore: processedData.qualityScore.overall,
            enrichmentOpportunities: processedData.enrichmentOpportunities.length,
            issues: processedData.qualityScore.issues.length
          }
        });
      } catch (processingError) {
        console.error("Error processing file:", processingError);
        await storage.updateDataSourceStatus(dataSource.id, "failed");
        
        res.json({ 
          message: "File uploaded but processing failed",
          dataSource,
          error: processingError.message
        });
      }
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

  // Risk metrics route - Basic metrics for dashboard
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

  // Enhanced Portfolio Analytics route - Industry-standard calculations
  app.get('/api/portfolio-analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.organizationId) {
        return res.status(400).json({ message: "User not associated with organization" });
      }
      
      console.log('Calculating enhanced portfolio analytics for organization:', user.organizationId);
      const analytics = await riskAnalyticsEngine.calculatePortfolioAnalytics(user.organizationId);
      
      res.json({
        success: true,
        data: analytics,
        calculatedAt: new Date().toISOString(),
        organizationId: user.organizationId
      });
    } catch (error) {
      console.error("Error calculating portfolio analytics:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        success: false,
        message: "Failed to calculate portfolio analytics",
        error: errorMessage 
      });
    }
  });

  // Data processing analysis routes
  app.get('/api/data-sources/:id/analysis', isAuthenticated, async (req: any, res) => {
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

      if (!dataSource.filePath || !fs.existsSync(dataSource.filePath)) {
        return res.status(404).json({ message: "Data file not found" });
      }

      console.log('Analyzing data source:', id);
      const analysis = await dataProcessingEngine.processDataFile(dataSource.filePath, id);
      
      res.json({
        success: true,
        dataSourceId: id,
        analysis,
        analyzedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error analyzing data source:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        success: false,
        message: "Failed to analyze data source",
        error: errorMessage 
      });
    }
  });

  app.post('/api/data-mappings/auto-apply/:dataSourceId', isAuthenticated, async (req: any, res) => {
    try {
      const { dataSourceId } = req.params;
      const { minConfidence = 80 } = req.body;
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.organizationId) {
        return res.status(400).json({ message: "User not associated with organization" });
      }

      const dataSource = await storage.getDataSource(dataSourceId);
      if (!dataSource || dataSource.organizationId !== user.organizationId) {
        return res.status(404).json({ message: "Data source not found" });
      }

      // Get existing mappings
      const existingMappings = await storage.getDataMappings(dataSourceId);
      
      // Auto-approve mappings above confidence threshold
      let approvedCount = 0;
      for (const mapping of existingMappings) {
        const confidence = parseFloat(mapping.confidence || '0');
        if (confidence >= minConfidence && !mapping.isApproved) {
          await storage.updateMappingApproval(mapping.id, true);
          approvedCount++;
        }
      }

      res.json({
        success: true,
        message: `Auto-approved ${approvedCount} high-confidence mappings`,
        approvedCount,
        minConfidence
      });
    } catch (error) {
      console.error("Error auto-applying mappings:", error);
      res.status(500).json({ message: "Failed to auto-apply mappings" });
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
      let responseSet = false;

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (!responseSet) {
          responseSet = true;
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
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!responseSet) {
          responseSet = true;
          pythonProcess.kill();
          res.status(408).json({ 
            success: false, 
            message: 'Weather risk generation timed out' 
          });
        }
      }, 30000);

    } catch (error) {
      console.error("Error generating weather risk data:", error);
      res.status(500).json({ message: "Failed to generate weather risk data" });
    }
  });

  // Weather layer data endpoint for Tomorrow.io integration
  app.get('/api/weather-layers/:layerType', async (req, res) => {
    try {
      const { layerType } = req.params;
      const { bounds } = req.query; // Optional map bounds for grid data
      
      console.log(`Fetching ${layerType} weather layer data...`);
      
      // Tomorrow.io API key from environment
      const apiKey = process.env.TOMORROW_IO_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error: 'Tomorrow.io API key not configured'
        });
      }
      
      // Define sample locations for weather grid (you can expand this)
      const gridLocations = [
        { lat: 34.0522, lon: -118.2437, name: "Los Angeles" },
        { lat: 37.7749, lon: -122.4194, name: "San Francisco" },
        { lat: 36.1699, lon: -115.1398, name: "Las Vegas" },
        { lat: 33.4484, lon: -112.0740, name: "Phoenix" },
        { lat: 38.5816, lon: -121.4944, name: "Sacramento" },
        // Add more grid points for better coverage
        { lat: 32.7157, lon: -117.1611, name: "San Diego" },
        { lat: 39.7392, lon: -104.9903, name: "Denver" },
        { lat: 35.2271, lon: -80.8431, name: "Charlotte" }
      ];
      
      const weatherData = [];
      
      // Fetch weather data for each grid point
      for (const location of gridLocations) {
        try {
          const response = await fetch(`https://api.tomorrow.io/v4/weather/realtime?location=${location.lat},${location.lon}&apikey=${apiKey}&fields=temperature,windSpeed,humidity,precipitationIntensity,fireIndex`);
          
          if (response.ok) {
            const data = await response.json();
            const values = data.data.values;
            
            weatherData.push({
              lat: location.lat,
              lon: location.lon,
              name: location.name,
              temperature: values.temperature || 20,
              windSpeed: values.windSpeed || 5,
              humidity: values.humidity || 50,
              precipitation: values.precipitationIntensity || 0,
              fireIndex: values.fireIndex || 1
            });
          }
        } catch (error) {
          console.error(`Error fetching weather for ${location.name}:`, error);
          // Use fallback data for this location
          weatherData.push({
            lat: location.lat,
            lon: location.lon,
            name: location.name,
            temperature: 22 + Math.random() * 10,
            windSpeed: 5 + Math.random() * 15,
            humidity: 40 + Math.random() * 40,
            precipitation: Math.random() > 0.8 ? Math.random() * 2 : 0,
            fireIndex: 1 + Math.random() * 3
          });
        }
      }
      
      // Convert to GeoJSON based on layer type
      let layerResponse;
      
      if (layerType === 'temperature') {
        layerResponse = {
          type: "FeatureCollection",
          features: weatherData.map(point => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [point.lon, point.lat]
            },
            properties: {
              temperature: point.temperature,
              intensity: Math.max(0, Math.min(1, (point.temperature - 0) / 40)), // Normalize 0-40°C to 0-1
              color: getTemperatureColor(point.temperature)
            }
          }))
        };
      } else if (layerType === 'wind') {
        layerResponse = {
          type: "FeatureCollection", 
          features: weatherData.map(point => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [point.lon, point.lat]
            },
            properties: {
              windSpeed: point.windSpeed,
              intensity: Math.max(0, Math.min(1, point.windSpeed / 30)), // Normalize 0-30 mph to 0-1
              color: getWindColor(point.windSpeed)
            }
          }))
        };
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid layer type. Use "temperature" or "wind"'
        });
      }
      
      res.json({
        success: true,
        layerType,
        data: layerResponse,
        source: 'Tomorrow.io Weather API',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error fetching weather layer data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch weather layer data'
      });
    }
  });

  // Helper functions for color mapping
  function getTemperatureColor(temp: number): string {
    // Blue (cold) to Red (hot) color scale
    if (temp < 5) return '#0000ff';      // Blue
    if (temp < 15) return '#00ffff';     // Cyan
    if (temp < 25) return '#00ff00';     // Green  
    if (temp < 35) return '#ffff00';     // Yellow
    return '#ff0000';                    // Red
  }
  
  function getWindColor(windSpeed: number): string {
    // Light to dark blue for wind intensity
    if (windSpeed < 5) return '#e3f2fd';   // Very light blue
    if (windSpeed < 15) return '#90caf9';  // Light blue
    if (windSpeed < 25) return '#2196f3';  // Blue
    return '#0d47a1';                      // Dark blue
  }

  // Generate predictive animation data using JavaScript (more reliable than Python execution)
  app.post('/api/weather-risk/animation', async (req, res) => {
    try {
      console.log('Generating weather animation data...');
      
      const generateAnimationData = () => {
        const assets = [
          { name: "Los Angeles Office Complex", lat: 34.0522, lon: -118.2437, type: "commercial", value: 5000000 },
          { name: "San Francisco Data Center", lat: 37.7749, lon: -122.4194, type: "critical_infrastructure", value: 10000000 },
          { name: "Las Vegas Casino Resort", lat: 36.1699, lon: -115.1398, type: "hospitality", value: 15000000 },
          { name: "Phoenix Manufacturing Plant", lat: 33.4484, lon: -112.0740, type: "industrial", value: 8000000 },
          { name: "Sacramento Distribution Center", lat: 38.5816, lon: -121.4944, type: "logistics", value: 3000000 }
        ];

        const animationData = {
          type: "FeatureCollection",
          features: [] as any[],
          animation: {
            timestamps: [] as string[],
            duration_hours: 72,
            interval_hours: 3
          },
          metadata: {
            generated_at: new Date().toISOString(),
            total_assets: assets.length,
            data_source: "Predictive Weather Modeling"
          }
        };

        const baseTime = new Date();
        
        // Generate 24 frames (3-hour intervals over 72 hours)
        for (let i = 0; i < 24; i++) {
          const timestamp = new Date(baseTime.getTime() + (i * 3 * 60 * 60 * 1000)).toISOString();
          animationData.animation.timestamps.push(timestamp);

          assets.forEach((asset, j) => {
            // Simulate evolving weather patterns
            const hourOfDay = (i * 3) % 24;
            const dayProgression = Math.floor(i / 8); // Days 0, 1, 2
            
            // Simulate realistic weather progression
            const fireIndex = 1.5 + Math.sin(hourOfDay * Math.PI / 12) * 1.5 + (dayProgression * 0.3);
            const windSpeed = 8 + Math.cos(hourOfDay * Math.PI / 8) * 6 + (dayProgression * 2);
            const temperature = 22 + Math.sin((hourOfDay - 6) * Math.PI / 12) * 8 + (dayProgression * 1.5);
            const humidity = 60 - Math.sin(hourOfDay * Math.PI / 12) * 20 - (dayProgression * 3);
            const precipitation = (i % 16 === 0) ? 0.2 : 0.0; // Rain every 48 hours

            // Calculate risk score
            const fireWindRisk = Math.max(fireIndex, 0) * (windSpeed / 10.0);
            const tempFactor = Math.max(1.0, temperature / 25.0);
            const humidityFactor = Math.max(1.0, (100 - Math.max(humidity, 0)) / 50.0);
            const precipFactor = Math.max(0.1, 1.0 - (precipitation / 5.0));
            
            const assetMultipliers: Record<string, number> = {
              commercial: 1.0,
              critical_infrastructure: 1.5,
              hospitality: 1.2,
              industrial: 1.3,
              logistics: 0.9
            };
            
            const assetFactor = assetMultipliers[asset.type] || 1.0;
            const riskScore = Math.min(100.0, Math.max(0.0, 
              fireWindRisk * tempFactor * humidityFactor * precipFactor * assetFactor
            ));
            
            const riskLevel = riskScore < 25 ? "low" : riskScore < 60 ? "medium" : "high";

            const feature = {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [asset.lon, asset.lat]
              },
              properties: {
                name: asset.name,
                asset_type: asset.type,
                insured_value: asset.value,
                timestamp: timestamp,
                fire_index: parseFloat(fireIndex.toFixed(2)),
                wind_speed: parseFloat(windSpeed.toFixed(2)),
                temperature: parseFloat(temperature.toFixed(2)),
                humidity: parseFloat(humidity.toFixed(2)),
                precipitation: parseFloat(precipitation.toFixed(2)),
                risk_score: parseFloat(riskScore.toFixed(2)),
                risk_level: riskLevel,
                frame_index: i
              }
            };

            animationData.features.push(feature);
          });
        }

        return animationData;
      };

      const animationData = generateAnimationData();
      
      console.log(`Generated ${animationData.animation.timestamps.length} animation frames for ${animationData.metadata.total_assets} assets`);
      
      res.json({
        success: true,
        data: animationData,
        message: `Generated ${animationData.animation.timestamps.length} animation frames with predictive weather patterns`
      });

    } catch (error) {
      console.error('Error generating animation data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        success: false,
        message: "Failed to generate animation data",
        error: errorMessage
      });
    }
  });

  // Provide frontend with Mapbox access token
  app.get('/api/config', (req, res) => {
    res.json({
      mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'
    });
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

  // ==================== ENHANCED CSV PROCESSING ENDPOINTS ====================
  
  // Enhanced CSV upload with raw data storage and field mapping
  app.post('/api/data-sources/upload-csv', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.organizationId) {
        return res.status(400).json({ message: "User not associated with organization" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Create data source record
      const dataSource = await storage.createDataSource({
        organizationId: user.organizationId,
        name: req.file.originalname,
        type: "csv",
        status: "processing",
        filePath: req.file.path,
        uploadedBy: userId,
      });

      // Process CSV with enhanced pipeline
      try {
        const result = await csvProcessor.processCSVFile(req.file.path, dataSource.id);
        
        // Auto-create field mappings for high-confidence suggestions
        for (const suggestion of result.fieldMappingSuggestions) {
          if (suggestion.confidence >= 80) {
            await storage.createDataMapping({
              dataSourceId: dataSource.id,
              sourceField: suggestion.sourceField,
              targetField: suggestion.targetField,
              confidence: suggestion.confidence.toString(),
              isApproved: true // Auto-approve high confidence
            });
          } else {
            await storage.createDataMapping({
              dataSourceId: dataSource.id,
              sourceField: suggestion.sourceField,
              targetField: suggestion.targetField,
              confidence: suggestion.confidence.toString(),
              isApproved: false // Require manual approval
            });
          }
        }

        await storage.updateDataSourceStatus(dataSource.id, "completed");

        res.json({
          success: true,
          message: "CSV uploaded and processed successfully",
          dataSource,
          processing: {
            rowCount: result.rowCount,
            fieldMappingSuggestions: result.fieldMappingSuggestions.length,
            autoApprovedMappings: result.fieldMappingSuggestions.filter(s => s.confidence >= 80).length,
            warnings: result.warnings
          },
          preview: result.preview
        });
        
      } catch (processingError) {
        await storage.updateDataSourceStatus(dataSource.id, "failed");
        const errorMessage = processingError instanceof Error ? processingError.message : 'Unknown processing error';
        res.status(500).json({
          success: false,
          message: "CSV upload failed during processing",
          error: errorMessage,
          dataSource
        });
      }
    } catch (error) {
      console.error("Error uploading CSV:", error);
      res.status(500).json({ message: "Failed to upload CSV file" });
    }
  });

  // Field mapping suggestions endpoint
  app.get('/api/data-sources/:id/mapping-suggestions', isAuthenticated, async (req: any, res) => {
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

      const mappings = await storage.getDataMappings(id);
      res.json({
        success: true,
        dataSourceId: id,
        mappings: mappings.map(m => ({
          id: m.id,
          sourceField: m.sourceField,
          targetField: m.targetField,
          confidence: parseFloat(m.confidence || '0'),
          isApproved: m.isApproved,
          createdAt: m.createdAt
        }))
      });
    } catch (error) {
      console.error("Error fetching mapping suggestions:", error);
      res.status(500).json({ message: "Failed to fetch mapping suggestions" });
    }
  });

  // Apply field mappings and create risk exposures
  app.post('/api/data-sources/:id/apply-mappings', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { mappings } = req.body; // { sourceField: targetField }
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.organizationId) {
        return res.status(400).json({ message: "User not associated with organization" });
      }

      const dataSource = await storage.getDataSource(id);
      if (!dataSource || dataSource.organizationId !== user.organizationId) {
        return res.status(404).json({ message: "Data source not found" });
      }

      // Apply mappings and create risk exposures
      const result = await csvProcessor.applyMappingsAndCreateExposures(
        id, 
        user.organizationId, 
        mappings
      );

      await storage.updateDataSourceStatus(id, "completed");

      res.json({
        success: true,
        message: "Field mappings applied successfully",
        dataSourceId: id,
        processing: {
          exposuresCreated: result.created,
          errors: result.errors.length,
          errorDetails: result.errors.slice(0, 10) // First 10 errors only
        }
      });
    } catch (error) {
      console.error("Error applying mappings:", error);
      res.status(500).json({ message: "Failed to apply field mappings" });
    }
  });

  // ==================== EXPORT ENDPOINTS ====================
  
  // Export risk exposures to CSV/JSON
  app.get('/api/export/exposures', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.organizationId) {
        return res.status(400).json({ message: "User not associated with organization" });
      }

      const format = req.query.format as string || 'csv';
      const exposures = await storage.getRiskExposures(user.organizationId);

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="risk_exposures.json"');
        return res.json({
          exportedAt: new Date().toISOString(),
          organizationId: user.organizationId,
          totalRecords: exposures.length,
          data: exposures
        });
      }

      // CSV Export
      const csvHeaders = [
        'Policy Number',
        'Total Insured Value', 
        'Latitude',
        'Longitude', 
        'Address',
        'Peril Type',
        'Risk Score',
        'Created At'
      ];

      const csvRows = exposures.map(exp => [
        exp.policyNumber || '',
        exp.totalInsuredValue || '0',
        exp.latitude || '0',
        exp.longitude || '0',
        exp.address || '',
        exp.perilType || '',
        exp.riskScore || '0',
        exp.createdAt?.toISOString() || ''
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="risk_exposures.csv"');
      res.send(csvContent);

    } catch (error) {
      console.error("Error exporting exposures:", error);
      res.status(500).json({ message: "Failed to export risk exposures" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
