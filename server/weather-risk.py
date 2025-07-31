#!/usr/bin/env python3
"""
Weather Risk Module for Tomorrow.io Integration
Fetches real-time weather data and calculates risk scores for insured assets
"""

import json
import requests
import os
from typing import List, Dict, Any
from dataclasses import dataclass, asdict

@dataclass
class AssetLocation:
    """Represents an insured asset with location and metadata"""
    name: str
    lat: float
    lon: float
    asset_type: str = "property"
    insured_value: float = 1000000.0

@dataclass
class WeatherData:
    """Weather data from Tomorrow.io API"""
    fire_index: float
    wind_speed: float
    temperature: float
    humidity: float
    precipitation: float

@dataclass
class RiskAssessment:
    """Risk assessment for an asset"""
    asset: AssetLocation
    weather: WeatherData
    risk_score: float
    risk_level: str

class WeatherRiskCalculator:
    """Main class for weather risk calculations"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('TOMORROW_IO_API_KEY')
        if not self.api_key:
            raise ValueError("Tomorrow.io API key is required. Set TOMORROW_IO_API_KEY environment variable.")
        
        self.base_url = "https://api.tomorrow.io/v4"
        
        # Sample insured asset locations (replace with real data)
        self.assets = [
            AssetLocation("Los Angeles Office Complex", 34.0522, -118.2437, "commercial", 5000000.0),
            AssetLocation("San Francisco Data Center", 37.7749, -122.4194, "critical_infrastructure", 10000000.0),
            AssetLocation("Las Vegas Casino Resort", 36.1699, -115.1398, "hospitality", 15000000.0),
            AssetLocation("Phoenix Manufacturing Plant", 33.4484, -112.0740, "industrial", 8000000.0),
            AssetLocation("Sacramento Distribution Center", 38.5816, -121.4944, "logistics", 3000000.0)
        ]
    
    def fetch_forecast_data(self, lat: float, lon: float, hours_ahead: int = 72) -> List[Dict]:
        """
        Fetch weather forecast data for trend analysis
        
        Args:
            lat: Latitude
            lon: Longitude  
            hours_ahead: Number of hours to forecast (default 72 = 3 days)
            
        Returns:
            List of weather data points over time
        """
        url = f"{self.base_url}/weather/forecast"
        
        params = {
            "location": f"{lat},{lon}",
            "apikey": self.api_key,
            "fields": [
                "fireIndex",
                "windSpeed", 
                "temperature",
                "humidity",
                "precipitationIntensity"
            ],
            "timesteps": "1h",
            "endTime": f"nowPlus{hours_ahead}h"
        }
        
        try:
            response = requests.get(url, params=params, timeout=15)
            response.raise_for_status()
            
            data = response.json()
            forecast_data = []
            
            for interval in data.get("timelines", {}).get("hourly", []):
                timestamp = interval["time"]
                values = interval["values"]
                
                forecast_data.append({
                    "timestamp": timestamp,
                    "fire_index": values.get("fireIndex", 1.0),
                    "wind_speed": values.get("windSpeed", 5.0),
                    "temperature": values.get("temperature", 20.0),
                    "humidity": values.get("humidity", 50.0),
                    "precipitation": values.get("precipitationIntensity", 0.0)
                })
            
            return forecast_data
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching forecast data for {lat},{lon}: {e}")
            # Return sample forecast data for development
            return self._generate_sample_forecast_data(hours_ahead)

    def _generate_sample_forecast_data(self, hours: int) -> List[Dict]:
        """Generate sample forecast data for development/testing"""
        import datetime
        
        forecast_data = []
        base_time = datetime.datetime.now()
        
        for hour in range(hours):
            timestamp = (base_time + datetime.timedelta(hours=hour)).isoformat()
            
            # Simulate changing weather patterns
            fire_risk = 1.0 + (hour % 24) * 0.1  # Daily cycle
            wind_speed = 5.0 + (hour % 12) * 2.0  # Semi-daily pattern
            temp = 20.0 + 10 * abs((hour % 24 - 12) / 12)  # Daily temperature cycle
            
            forecast_data.append({
                "timestamp": timestamp,
                "fire_index": min(fire_risk, 5.0),
                "wind_speed": min(wind_speed, 25.0),
                "temperature": temp,
                "humidity": max(30.0, 80.0 - hour * 0.5),
                "precipitation": 0.1 if hour % 8 == 0 else 0.0
            })
        
        return forecast_data

    def fetch_weather_data(self, lat: float, lon: float) -> WeatherData:
        """
        Fetch weather forecast data from Tomorrow.io API
        
        Args:
            lat: Latitude
            lon: Longitude
            
        Returns:
            WeatherData object with current/forecast conditions
        """
        # Tomorrow.io API endpoint for real-time weather
        url = f"{self.base_url}/weather/realtime"
        
        params = {
            "location": f"{lat},{lon}",
            "apikey": self.api_key,
            "fields": [
                "fireIndex",
                "windSpeed", 
                "temperature",
                "humidity",
                "precipitationIntensity"
            ]
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            values = data["data"]["values"]
            
            return WeatherData(
                fire_index=values.get("fireIndex", 0.0),
                wind_speed=values.get("windSpeed", 0.0),
                temperature=values.get("temperature", 0.0),
                humidity=values.get("humidity", 0.0),
                precipitation=values.get("precipitationIntensity", 0.0)
            )
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching weather data for {lat},{lon}: {e}")
            # Return default values on API failure
            return WeatherData(
                fire_index=1.0,
                wind_speed=5.0,
                temperature=20.0,
                humidity=50.0,
                precipitation=0.0
            )
    
    def calculate_risk_score(self, weather: WeatherData, asset: AssetLocation) -> float:
        """
        Calculate risk score based on weather conditions and asset characteristics
        
        Args:
            weather: Weather data
            asset: Asset location and metadata
            
        Returns:
            Risk score (0-100 scale)
        """
        # Base risk from fire index and wind speed
        fire_wind_risk = weather.fire_index * (weather.wind_speed / 10.0)
        
        # Temperature factor (higher temps increase fire risk)
        temp_factor = max(1.0, weather.temperature / 25.0)
        
        # Humidity factor (lower humidity increases fire risk)
        humidity_factor = max(1.0, (100 - weather.humidity) / 50.0)
        
        # Precipitation factor (reduces fire risk)
        precip_factor = max(0.1, 1.0 - (weather.precipitation / 5.0))
        
        # Asset type multiplier
        asset_multipliers = {
            "commercial": 1.0,
            "critical_infrastructure": 1.5,
            "hospitality": 1.2,
            "industrial": 1.3,
            "logistics": 0.9
        }
        
        asset_factor = asset_multipliers.get(asset.asset_type, 1.0)
        
        # Calculate final risk score (0-100 scale)
        risk_score = (
            fire_wind_risk * 
            temp_factor * 
            humidity_factor * 
            precip_factor * 
            asset_factor
        )
        
        return min(100.0, max(0.0, risk_score))
    
    def get_risk_level(self, risk_score: float) -> str:
        """Convert numerical risk score to categorical level"""
        if risk_score < 25:
            return "low"
        elif risk_score < 60:
            return "medium"
        else:
            return "high"
    
    def assess_all_assets(self) -> List[RiskAssessment]:
        """
        Assess risk for all insured assets
        
        Returns:
            List of risk assessments
        """
        assessments = []
        
        for asset in self.assets:
            print(f"Assessing risk for {asset.name}...")
            
            # Fetch weather data
            weather = self.fetch_weather_data(asset.lat, asset.lon)
            
            # Calculate risk score
            risk_score = self.calculate_risk_score(weather, asset)
            risk_level = self.get_risk_level(risk_score)
            
            assessment = RiskAssessment(
                asset=asset,
                weather=weather,
                risk_score=risk_score,
                risk_level=risk_level
            )
            
            assessments.append(assessment)
        
        return assessments
    
    def generate_geojson(self, assessments: List[RiskAssessment]) -> Dict[str, Any]:
        """
        Convert risk assessments to GeoJSON format for frontend consumption
        
        Args:
            assessments: List of risk assessments
            
        Returns:
            GeoJSON FeatureCollection
        """
        features = []
        
        for assessment in assessments:
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [assessment.asset.lon, assessment.asset.lat]
                },
                "properties": {
                    "name": assessment.asset.name,
                    "asset_type": assessment.asset.asset_type,
                    "insured_value": assessment.asset.insured_value,
                    "fire_index": round(assessment.weather.fire_index, 2),
                    "wind_speed": round(assessment.weather.wind_speed, 2),
                    "temperature": round(assessment.weather.temperature, 2),
                    "humidity": round(assessment.weather.humidity, 2),
                    "precipitation": round(assessment.weather.precipitation, 2),
                    "risk_score": round(assessment.risk_score, 2),
                    "risk_level": assessment.risk_level
                }
            }
            features.append(feature)
        
        return {
            "type": "FeatureCollection",
            "features": features,
            "metadata": {
                "generated_at": "2025-01-31T20:42:00Z",
                "total_assets": len(features),
                "data_source": "Tomorrow.io Weather API"
            }
        }
    
    def save_risk_data(self, output_path: str = "client/public/risk_data.geojson"):
        """
        Generate risk assessment and save as GeoJSON file
        
        Args:
            output_path: Path to save the GeoJSON file
        """
        print("Starting weather risk assessment...")
        
        # Assess all assets
        assessments = self.assess_all_assets()
        
        # Generate GeoJSON
        geojson_data = self.generate_geojson(assessments)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Save to file
        with open(output_path, 'w') as f:
            json.dump(geojson_data, f, indent=2)
        
        print(f"Risk data saved to {output_path}")
        print(f"Assessed {len(assessments)} assets")
        
        # Print summary
        for assessment in assessments:
            print(f"  {assessment.asset.name}: Risk Score {assessment.risk_score:.1f} ({assessment.risk_level})")

    def generate_forecast_animation_data(self) -> Dict[str, Any]:
        """
        Generate forecast data for trend animation visualization
        
        Returns:
            Structured data for time-series animation
        """
        animation_data = {
            "type": "FeatureCollection",
            "features": [],
            "animation": {
                "timestamps": [],
                "duration_hours": 72,
                "interval_hours": 3
            },
            "metadata": {
                "generated_at": "2025-01-31T20:42:00Z",
                "total_assets": len(self.assets),
                "data_source": "Tomorrow.io Forecast API"
            }
        }
        
        # Get forecast data for each asset
        asset_forecasts = {}
        for asset in self.assets:
            try:
                forecast_data = self.fetch_forecast_data(asset.lat, asset.lon, 72)
                asset_forecasts[asset.name] = forecast_data
            except Exception as e:
                print(f"Error fetching forecast for {asset.name}: {e}")
                continue
        
        # Create animation frames (every 3 hours)
        if asset_forecasts:
            sample_forecast = list(asset_forecasts.values())[0]
            timestamps = [data["timestamp"] for data in sample_forecast[::3]]  # Every 3rd hour
            animation_data["animation"]["timestamps"] = timestamps
            
            # Generate features for each timestamp
            for i, timestamp in enumerate(timestamps):
                frame_features = []
                
                for asset in self.assets:
                    if asset.name in asset_forecasts:
                        forecast_point = asset_forecasts[asset.name][i * 3]  # Every 3rd hour
                        
                        weather = WeatherData(
                            fire_index=forecast_point["fire_index"],
                            wind_speed=forecast_point["wind_speed"],
                            temperature=forecast_point["temperature"],
                            humidity=forecast_point["humidity"],
                            precipitation=forecast_point["precipitation"]
                        )
                        
                        risk_score = self.calculate_risk_score(weather, asset)
                        risk_level = self.get_risk_level(risk_score)
                        
                        feature = {
                            "type": "Feature",
                            "geometry": {
                                "type": "Point",
                                "coordinates": [asset.lon, asset.lat]
                            },
                            "properties": {
                                "name": asset.name,
                                "asset_type": asset.asset_type,
                                "insured_value": asset.insured_value,
                                "timestamp": timestamp,
                                "fire_index": weather.fire_index,
                                "wind_speed": weather.wind_speed,
                                "temperature": weather.temperature,
                                "humidity": weather.humidity,
                                "precipitation": weather.precipitation,
                                "risk_score": risk_score,
                                "risk_level": risk_level,
                                "frame_index": i
                            }
                        }
                        
                        frame_features.append(feature)
                
                animation_data["features"].extend(frame_features)
        
        return animation_data

def main():
    """Main function for standalone execution"""
    try:
        calculator = WeatherRiskCalculator()
        calculator.save_risk_data()
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure to set the TOMORROW_IO_API_KEY environment variable")

if __name__ == "__main__":
    main()