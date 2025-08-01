import { storage } from "./storage";
import { InsertWeatherObservation } from "@shared/schema";

export interface WeatherData {
  temperature: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  humidity: number;
  pressure: number;
  visibility: number;
  uvIndex: number;
  cloudCover: number;
  weatherCode: number;
}

/**
 * Weather service for Tomorrow.io API integration and data persistence
 */
export class WeatherService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.tomorrow.io/v4';

  constructor() {
    this.apiKey = process.env.TOMORROW_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Tomorrow.io API key not configured - weather data will not be available');
    }
  }

  /**
   * Fetch and store weather data for a specific location
   */
  async fetchAndStoreWeatherData(
    latitude: number, 
    longitude: number, 
    organizationId: string,
    riskExposureId?: string
  ): Promise<WeatherData | null> {
    if (!this.apiKey) {
      console.warn('Weather API key not available');
      return null;
    }

    try {
      const weatherData = await this.fetchCurrentWeather(latitude, longitude);
      
      if (weatherData) {
        // Store in database
        const observation: InsertWeatherObservation = {
          organizationId,
          riskExposureId: riskExposureId || null,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          observationTime: new Date(),
          temperature: weatherData.temperature.toString(),
          windSpeed: weatherData.windSpeed.toString(),
          windDirection: weatherData.windDirection.toString(),
          precipitation: weatherData.precipitation.toString(),
          humidity: weatherData.humidity.toString(),
          pressure: weatherData.pressure.toString(),
          visibility: weatherData.visibility.toString(),
          uvIndex: weatherData.uvIndex.toString(),
          cloudCover: weatherData.cloudCover.toString(),
          weatherCode: weatherData.weatherCode
        };

        await storage.createWeatherObservation(observation);
      }

      return weatherData;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      return null;
    }
  }

  /**
   * Fetch current weather from Tomorrow.io API
   */
  private async fetchCurrentWeather(latitude: number, longitude: number): Promise<WeatherData | null> {
    const url = `${this.baseUrl}/weather/realtime?location=${latitude},${longitude}&apikey=${this.apiKey}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const values = data.data?.values;

      if (!values) {
        throw new Error('Invalid weather API response format');
      }

      return {
        temperature: values.temperature || 0,
        windSpeed: values.windSpeed || 0,
        windDirection: values.windDirection || 0,
        precipitation: values.precipitationIntensity || 0,
        humidity: values.humidity || 0,
        pressure: values.pressureSeaLevel || 0,
        visibility: values.visibility || 0,
        uvIndex: values.uvIndex || 0,
        cloudCover: values.cloudCover || 0,
        weatherCode: values.weatherCode || 0
      };
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      throw error;
    }
  }

  /**
   * Batch fetch weather data for multiple risk exposures
   */
  async batchFetchWeatherForExposures(organizationId: string): Promise<{
    success: number;
    errors: number;
    details: string[];
  }> {
    const exposures = await storage.getRiskExposures(organizationId);
    const results = { success: 0, errors: 0, details: [] as string[] };

    for (const exposure of exposures) {
      try {
        const lat = parseFloat(exposure.latitude || '0');
        const lng = parseFloat(exposure.longitude || '0');
        
        if (lat === 0 && lng === 0) {
          results.errors++;
          results.details.push(`Exposure ${exposure.policyNumber}: No valid coordinates`);
          continue;
        }

        const weatherData = await this.fetchAndStoreWeatherData(lat, lng, organizationId, exposure.id);
        
        if (weatherData) {
          results.success++;
          results.details.push(`Exposure ${exposure.policyNumber}: Weather data updated`);
        } else {
          results.errors++;
          results.details.push(`Exposure ${exposure.policyNumber}: Failed to fetch weather data`);
        }

        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        results.errors++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.details.push(`Exposure ${exposure.policyNumber}: ${errorMessage}`);
      }
    }

    return results;
  }

  /**
   * Get weather data for specific risk exposure
   */
  async getWeatherForExposure(riskExposureId: string): Promise<WeatherData | null> {
    const weatherObservation = await storage.getLatestWeatherForExposure(riskExposureId);
    
    if (!weatherObservation) {
      return null;
    }

    return {
      temperature: parseFloat(weatherObservation.temperature || '0'),
      windSpeed: parseFloat(weatherObservation.windSpeed || '0'),
      windDirection: parseFloat(weatherObservation.windDirection || '0'),
      precipitation: parseFloat(weatherObservation.precipitation || '0'),
      humidity: parseFloat(weatherObservation.humidity || '0'),
      pressure: parseFloat(weatherObservation.pressure || '0'),
      visibility: parseFloat(weatherObservation.visibility || '0'),
      uvIndex: parseFloat(weatherObservation.uvIndex || '0'),
      cloudCover: parseFloat(weatherObservation.cloudCover || '0'),
      weatherCode: weatherObservation.weatherCode || 0
    };
  }
}

export const weatherService = new WeatherService();