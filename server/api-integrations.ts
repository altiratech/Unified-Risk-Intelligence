import { storage } from "./storage";

// API Integration Service for external data sources
export class APIIntegrationService {
  
  // NOAA Weather Data Integration
  async connectNOAAWeatherAPI(organizationId: string, apiKey?: string): Promise<any> {
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
          uploadedBy: "system",
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
  async connectOpenWeatherAPI(organizationId: string, apiKey: string, location = "Miami,FL"): Promise<any> {
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
          uploadedBy: "system",
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
  async connectFEMAAPI(organizationId: string): Promise<any> {
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
          uploadedBy: "system",
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
  async connectCoreLogicAPI(organizationId: string, apiKey: string, propertyId = "sample"): Promise<any> {
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
        uploadedBy: "system",
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
        authFields: ['apiKey', 'clientId'],
        categories: ['property', 'valuation', 'risk'],
        website: 'https://www.corelogic.com/solutions/api-solutions.aspx'
      }
    ];
  }
}

export const apiIntegrationService = new APIIntegrationService();