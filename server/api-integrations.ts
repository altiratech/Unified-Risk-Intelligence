import { storage } from "./storage";

// API Integration Service for external data sources
export class APIIntegrationService {
  
  // NOAA Weather Data Integration
  async connectNOAAWeatherAPI(organizationId: string, userId: string, apiKey?: string): Promise<any> {
    try {
      // NOAA API doesn't require key for basic weather data
      const response = await fetch('https://api.weather.gov/stations/KMIA/observations/latest');
      const data = await response.json();
      
      if (response.ok) {
        const dataSource = await storage.createDataSource({
          organizationId,
          name: "NOAA Weather Data - Miami Station",
          type: "api",
          status: "completed",
          filePath: "/api/noaa/weather",
          uploadedBy: userId,
        });

        return {
          success: true,
          dataSource,
          preview: {
            temperature: data.properties?.temperature?.value,
            humidity: data.properties?.relativeHumidity?.value,
            windSpeed: data.properties?.windSpeed?.value,
            timestamp: data.properties?.timestamp
          }
        };
      }
      
      throw new Error('Failed to connect to NOAA API');
    } catch (error) {
      console.error('NOAA API connection error:', error);
      return {
        success: false,
        error: 'Failed to connect to NOAA Weather API. Please check your connection.',
        requiresAuth: false
      };
    }
  }

  // OpenWeather API Integration
  async connectOpenWeatherAPI(organizationId: string, userId: string, apiKey: string, location = "Miami,FL"): Promise<any> {
    if (!apiKey) {
      return {
        success: false,
        error: 'OpenWeather API key is required',
        requiresAuth: true
      };
    }

    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`
      );
      const data = await response.json();
      
      if (response.ok) {
        const dataSource = await storage.createDataSource({
          organizationId,
          name: `OpenWeather Data - ${location}`,
          type: "api",
          status: "completed",
          filePath: `/api/openweather/${location}`,
          uploadedBy: userId,
        });

        return {
          success: true,
          dataSource,
          preview: {
            temperature: data.main?.temp,
            humidity: data.main?.humidity,
            pressure: data.main?.pressure,
            weather: data.weather?.[0]?.description,
            windSpeed: data.wind?.speed
          }
        };
      }
      
      if (response.status === 401) {
        return {
          success: false,
          error: 'Invalid OpenWeather API key. Please check your credentials.',
          requiresAuth: true
        };
      }
      
      throw new Error(`OpenWeather API error: ${data.message || 'Unknown error'}`);
    } catch (error) {
      console.error('OpenWeather API connection error:', error);
      return {
        success: false,
        error: 'Failed to connect to OpenWeather API. Please verify your API key.',
        requiresAuth: true
      };
    }
  }

  // FEMA Disaster Data Integration
  async connectFEMAAPI(organizationId: string, userId: string): Promise<any> {
    try {
      // FEMA OpenFEMA API - Updated endpoint
      const response = await fetch('https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=10&$filter=state eq \'FL\'');
      const data = await response.json();
      
      if (response.ok) {
        const dataSource = await storage.createDataSource({
          organizationId,
          name: "FEMA Disaster Declarations - Florida",
          type: "api",
          status: "completed",
          filePath: "/api/fema/disasters",
          uploadedBy: userId,
        });

        return {
          success: true,
          dataSource,
          preview: {
            totalDisasters: data.DisasterDeclarationsSummaries?.length || 0,
            recentDisasters: data.DisasterDeclarationsSummaries?.slice(0, 3).map((d: any) => ({
              title: d.declarationTitle,
              date: d.declarationDate,
              type: d.incidentType
            })) || []
          }
        };
      }
      
      throw new Error('Failed to connect to FEMA API');
    } catch (error) {
      console.error('FEMA API connection error:', error);
      return {
        success: false,
        error: 'Failed to connect to FEMA API. The service may be temporarily unavailable.',
        requiresAuth: false
      };
    }
  }

  // CoreLogic Property Data Integration (requires API key)
  async connectCoreLogicAPI(organizationId: string, userId: string, apiKey: string, propertyId = "sample"): Promise<any> {
    if (!apiKey) {
      return {
        success: false,
        error: 'CoreLogic API credentials are required',
        requiresAuth: true
      };
    }

    try {
      // Note: This is a simulated CoreLogic integration since we don't have real credentials
      // In a real implementation, you would use their actual API endpoints
      const mockResponse = {
        propertyId,
        marketValue: 450000,
        floodZone: "AE",
        hurricaneRisk: "High",
        earthquakeRisk: "Low",
        lastUpdated: new Date().toISOString()
      };

      const dataSource = await storage.createDataSource({
        organizationId,
        name: `CoreLogic Property Data - ${propertyId}`,
        type: "api",
        status: "completed",
        filePath: `/api/corelogic/${propertyId}`,
        uploadedBy: userId,
      });

      return {
        success: true,
        dataSource,
        preview: mockResponse,
        note: "This is a demonstration integration. Real CoreLogic API access requires valid credentials."
      };
    } catch (error) {
      console.error('CoreLogic API connection error:', error);
      return {
        success: false,
        error: 'Failed to connect to CoreLogic API. Please verify your credentials.',
        requiresAuth: true
      };
    }
  }

  // Demex Catastrophe Risk Integration
  async connectDemexAPI(organizationId: string, userId: string, apiKey: string, portfolioId?: string): Promise<any> {
    if (!apiKey) {
      return {
        success: false,
        error: 'Demex API key is required for catastrophe risk data access',
        requiresAuth: true
      };
    }

    try {
      // Demex API structure for catastrophe risk modeling
      const portfolioData = {
        portfolioId: portfolioId || "DMX-" + Math.random().toString(36).substr(2, 9),
        riskAssessment: {
          totalExposure: 2500000000, // $2.5B
          probableMaximumLoss: {
            pml100: 125000000, // 100-year PML
            pml250: 287500000, // 250-year PML  
            pml500: 425000000  // 500-year PML
          },
          perils: {
            hurricane: {
              annualProbability: 0.04,
              expectedLoss: 15600000,
              maxLoss: 425000000
            },
            earthquake: {
              annualProbability: 0.002,
              expectedLoss: 2100000,
              maxLoss: 89000000
            },
            flood: {
              annualProbability: 0.01,
              expectedLoss: 8200000,
              maxLoss: 156000000  
            },
            wildfire: {
              annualProbability: 0.008,
              expectedLoss: 4300000,
              maxLoss: 78000000
            }
          },
          geographicConcentration: {
            florida: 0.45,
            california: 0.23,
            texas: 0.18,
            other: 0.14
          },
          riskMetrics: {
            diversificationBenefit: 0.18,
            correlationRisk: 0.34,
            tailRisk: 0.42,
            riskAdjustedReturn: 8.7
          }
        },
        modelDetails: {
          vendor: "Demex",
          modelVersion: "2024.1",
          resolutionKm: 1,
          simulationYears: 100000,
          lastUpdated: new Date().toISOString()
        }
      };

      const dataSource = await storage.createDataSource({
        organizationId,
        name: `Demex Catastrophe Risk Model - Portfolio ${portfolioData.portfolioId}`,
        type: "api",
        status: "completed", 
        filePath: `/api/demex/risk/${portfolioData.portfolioId}`,
        uploadedBy: userId,
      });

      return {
        success: true,
        dataSource,
        preview: {
          totalExposure: portfolioData.riskAssessment.totalExposure,
          pml250: portfolioData.riskAssessment.probableMaximumLoss.pml250,
          hurricaneRisk: portfolioData.riskAssessment.perils.hurricane.expectedLoss,
          diversificationBenefit: portfolioData.riskAssessment.riskMetrics.diversificationBenefit
        },
        fullData: portfolioData,
        note: "Enterprise demo data - requires Demex API credentials for live catastrophe modeling"
      };
    } catch (error) {
      console.error('Demex API connection error:', error);
      return {
        success: false,
        error: 'Failed to connect to Demex Catastrophe Risk API. Please verify your enterprise credentials.',
        requiresAuth: true
      };
    }
  }

  // Zesty.ai Property Intelligence Integration  
  async connectZestyAiAPI(organizationId: string, userId: string, apiKey: string, propertyAddress?: string): Promise<any> {
    if (!apiKey) {
      return {
        success: false,
        error: 'Zesty.ai API key is required for AI-powered property intelligence',
        requiresAuth: true
      };
    }

    try {
      // Zesty.ai property intelligence structure
      const propertyIntelligence = {
        propertyId: "ZAI-" + Math.random().toString(36).substr(2, 9),
        address: propertyAddress || "456 Biscayne Blvd, Miami, FL 33132",
        aiAnalysis: {
          roofCondition: {
            score: 8.2,
            condition: "Good",
            estimatedAge: 3,
            materialType: "Tile",
            aiConfidence: 0.94
          },
          structuralIntegrity: {
            score: 7.8,
            foundation: "Excellent", 
            walls: "Good",
            overallCondition: "Good",
            aiConfidence: 0.89
          },
          vegetationRisk: {
            score: 6.5,
            overhangingTrees: true,
            fireRisk: "Moderate",
            windRisk: "Low",
            aiConfidence: 0.92
          },
          surroundingArea: {
            developmentDensity: "High",
            proximityToWater: 0.2,
            floodRisk: "High",
            crimeIndex: 3.2,
            aiConfidence: 0.96
          }
        },
        riskFactors: {
          hurricane: {
            windResistance: 8.1,
            stormSurgeVulnerability: 7.3,
            overallRisk: "High"
          },
          fire: {
            defensibleSpace: 4.2,
            materialRisk: 2.1,
            overallRisk: "Low"
          },
          flood: {
            elevation: 12,
            drainageQuality: 6.8,
            overallRisk: "High"
          }
        },
        satelliteImagery: {
          lastCaptured: "2024-01-15",
          resolution: "30cm",
          changeDetection: {
            roofChanges: false,
            structureChanges: false,
            landscapeChanges: true
          }
        },
        insuranceRecommendations: {
          premiumAdjustment: -0.05, // 5% discount recommended
          coverageRecommendations: [
            "Standard wind coverage adequate",
            "Consider flood insurance upgrade",
            "Recommend maintenance on vegetation"
          ],
          riskMitigationSuggestions: [
            "Trim overhanging branches",
            "Install hurricane shutters",
            "Improve drainage around foundation"
          ]
        },
        lastUpdated: new Date().toISOString()
      };

      const dataSource = await storage.createDataSource({
        organizationId,
        name: `Zesty.ai Property Intelligence - ${propertyIntelligence.address}`,
        type: "api",
        status: "completed",
        filePath: `/api/zesty/property/${propertyIntelligence.propertyId}`,
        uploadedBy: userId,
      });

      return {
        success: true,
        dataSource,
        preview: {
          address: propertyIntelligence.address,
          roofCondition: propertyIntelligence.aiAnalysis.roofCondition.score,
          overallRisk: propertyIntelligence.riskFactors.hurricane.overallRisk,
          premiumAdjustment: propertyIntelligence.insuranceRecommendations.premiumAdjustment
        },
        fullData: propertyIntelligence,
        note: "Enterprise demo data - requires Zesty.ai API access for live property intelligence"
      };
    } catch (error) {
      console.error('Zesty.ai API connection error:', error);
      return {
        success: false,
        error: 'Failed to connect to Zesty.ai Property Intelligence API. Please verify your API credentials.',
        requiresAuth: true
      };
    }
  }

  // Tomorrow.io Weather Intelligence Integration
  async connectTomorrowIoAPI(organizationId: string, userId: string, apiKey: string, location?: string): Promise<any> {
    if (!apiKey) {
      return {
        success: false,
        error: 'Tomorrow.io API key is required for weather intelligence data',
        requiresAuth: true
      };
    }

    try {
      // Tomorrow.io weather intelligence structure
      const locationName = location || "Miami, FL";
      const weatherData = {
        location: {
          lat: 25.7617,
          lon: -80.1918,
          name: locationName
        },
        currentConditions: {
          temperature: 28.5,
          humidity: 78,
          windSpeed: 15.2,
          windDirection: 95,
          pressure: 1013.2,
          visibility: 16.1,
          cloudCover: 45,
          uvIndex: 8
        },
        forecastData: {
          hourly: Array.from({length: 24}, (_, i) => ({
            time: new Date(Date.now() + i * 3600000).toISOString(),
            temperature: 28.5 + Math.sin(i * 0.26) * 3,
            precipitation: Math.max(0, Math.sin(i * 0.31) * 2),
            windSpeed: 15.2 + Math.sin(i * 0.19) * 5,
            humidity: 78 + Math.sin(i * 0.21) * 10
          })),
          daily: Array.from({length: 14}, (_, i) => ({
            date: new Date(Date.now() + i * 86400000).toISOString().split('T')[0],
            temperatureMax: 31 + Math.sin(i * 0.44) * 3,
            temperatureMin: 24 + Math.sin(i * 0.44) * 2,
            precipitationProbability: Math.max(0, Math.sin(i * 0.33) * 80),
            windSpeedMax: 20 + Math.sin(i * 0.27) * 10
          }))
        },
        severeWeatherAlerts: [
          {
            alertType: "Hurricane Watch",
            severity: "High",
            startTime: new Date(Date.now() + 72 * 3600000).toISOString(),
            endTime: new Date(Date.now() + 120 * 3600000).toISOString(),
            description: "Hurricane conditions possible within 48 hours"
          }
        ],
        riskAssessment: {
          hurricaneRisk: {
            probabilityNext7Days: 0.15,
            probabilityNext30Days: 0.34,
            seasonalRisk: "Very High"
          },
          floodRisk: {
            probabilityNext24Hours: 0.08,
            probabilityNext7Days: 0.23,
            seasonalRisk: "High"
          },
          windRisk: {
            sustainedWindsProbability: 0.12,
            gustsProbability: 0.28,
            overallRisk: "Moderate"
          }
        },
        hyperLocalInsights: {
          microclimateFactors: ["Coastal proximity", "Urban heat island"],
          localWeatherPatterns: ["Afternoon thunderstorms", "Sea breeze effect"],
          historicalAnomalies: ["Above average rainfall", "Higher storm frequency"],
          insuranceImpact: {
            claimsProbability: 0.18,
            severityScore: 7.2,
            recommendedActions: ["Monitor storm development", "Review evacuation plans"]
          }
        },
        lastUpdated: new Date().toISOString()
      };

      const dataSource = await storage.createDataSource({
        organizationId,
        name: `Tomorrow.io Weather Intelligence - ${locationName}`,
        type: "api",
        status: "completed",
        filePath: `/api/tomorrow/weather/${encodeURIComponent(locationName)}`,
        uploadedBy: userId,
      });

      return {
        success: true,
        dataSource,
        preview: {
          location: locationName,
          currentTemp: weatherData.currentConditions.temperature,
          hurricaneRisk: weatherData.riskAssessment.hurricaneRisk.seasonalRisk,
          claimsProbability: weatherData.hyperLocalInsights.insuranceImpact.claimsProbability
        },
        fullData: weatherData,
        note: "Enterprise demo data - requires Tomorrow.io API access for live weather intelligence"
      };
    } catch (error) {
      console.error('Tomorrow.io API connection error:', error);
      return {
        success: false,
        error: 'Failed to connect to Tomorrow.io Weather Intelligence API. Please verify your API credentials.',
        requiresAuth: true
      };
    }
  }

  // Get available API integrations
  getAvailableAPIs() {
    return [
      {
        id: 'noaa',
        name: 'NOAA Weather Service',
        description: 'Real-time weather data and forecasts from National Weather Service',
        requiresAuth: false,
        categories: ['weather', 'environmental'],
        logo: 'https://www.weather.gov/images/wtv/noaa_logo.png'
      },
      {
        id: 'openweather',
        name: 'OpenWeather',
        description: 'Global weather data including current conditions, forecasts, and historical data',
        requiresAuth: true,
        authFields: ['apiKey'],
        categories: ['weather', 'climate'],
        website: 'https://openweathermap.org/api'
      },
      {
        id: 'fema',
        name: 'FEMA OpenFEMA',
        description: 'Disaster declarations, flood maps, and emergency management data',
        requiresAuth: false,
        categories: ['disasters', 'flooding', 'emergency'],
        website: 'https://www.fema.gov/about/openfema'
      },
      {
        id: 'corelogic',
        name: 'CoreLogic Property Data',
        description: 'Property valuations, risk assessments, and market analytics',
        requiresAuth: true,
        authFields: ['apiKey'],
        categories: ['property', 'valuation', 'risk'],
        website: 'https://www.corelogic.com'
      },
      {
        id: 'demex',
        name: 'Demex Catastrophe Risk',
        description: 'Advanced catastrophe risk modeling and portfolio analysis for insurance carriers',
        requiresAuth: true,
        authFields: ['apiKey'],
        categories: ['catastrophe', 'risk', 'modeling'],
        website: 'https://www.demex.com',
        enterprise: true
      },
      {
        id: 'zesty',
        name: 'Zesty.ai Property Intelligence',
        description: 'AI-powered property analysis using satellite imagery and machine learning',
        requiresAuth: true,
        authFields: ['apiKey', 'propertyAddress'],
        categories: ['property', 'ai', 'satellite'],
        website: 'https://www.zesty.ai',
        enterprise: true
      },
      {
        id: 'tomorrow',
        name: 'Tomorrow.io Weather Intelligence',
        description: 'Hyperlocal weather data and risk assessment with insurance-specific insights',
        requiresAuth: true,
        authFields: ['apiKey', 'location'],
        categories: ['weather', 'risk', 'intelligence'],
        website: 'https://www.tomorrow.io',
        enterprise: true
      }
    ];
  }
}

export const apiIntegrationService = new APIIntegrationService();