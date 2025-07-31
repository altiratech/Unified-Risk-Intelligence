import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Cloud, 
  Thermometer, 
  Wind, 
  Droplets, 
  AlertTriangle,
  RefreshCw,
  MapPin,
  Activity
} from "lucide-react";

// Mapbox GL JS types (install @types/mapbox-gl if needed)
declare global {
  interface Window {
    mapboxgl: any;
  }
}

interface WeatherRiskData {
  type: string;
  features: Array<{
    type: string;
    geometry: {
      type: string;
      coordinates: [number, number];
    };
    properties: {
      name: string;
      asset_type: string;
      insured_value: number;
      fire_index: number;
      wind_speed: number;
      temperature: number;
      humidity: number;
      precipitation: number;
      risk_score: number;
      risk_level: string;
    };
  }>;
  metadata: {
    generated_at: string;
    total_assets: number;
    data_source: string;
  };
}

export default function WeatherRisk() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [riskData, setRiskData] = useState<WeatherRiskData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Please sign in to access weather risk data",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Load Mapbox GL JS dynamically
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.mapboxgl) {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
      script.onload = initializeMap;
      document.head.appendChild(script);

      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    } else if (window.mapboxgl) {
      initializeMap();
    }
  }, []);

  // Load risk data
  useEffect(() => {
    loadRiskData();
  }, []);

  const loadRiskData = async () => {
    setIsLoadingData(true);
    try {
      // First try to generate fresh data
      await fetch('/api/weather-risk/generate', { 
        method: 'POST',
        credentials: 'include' 
      });

      // Then load the generated data
      const response = await fetch('/risk_data.geojson', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load risk data');
      }
      
      const data = await response.json();
      setRiskData(data);
      
      toast({
        title: "Success",
        description: `Loaded weather risk data for ${data.metadata.total_assets} assets`,
      });
    } catch (error) {
      console.error('Error loading risk data:', error);
      toast({
        title: "Error",
        description: "Failed to load weather risk data. Using sample data.",
        variant: "destructive",
      });
      
      // Load sample data as fallback
      loadSampleData();
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadSampleData = () => {
    const sampleData: WeatherRiskData = {
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
    setRiskData(sampleData);
  };

  const initializeMap = () => {
    if (!mapContainer.current || map.current) return;

    // Initialize Mapbox map
    map.current = new window.mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11', // Use a light theme
      center: [-118.2437, 34.0522], // Center on Los Angeles
      zoom: 5,
      accessToken: 'pk.eyJ1Ijoicmlza2lxIiwiYSI6ImNseTJkZXA2NzAwMTEyam9rNjJjOXY4OWkifQ.sample_token' // Replace with actual token
    });

    map.current.on('load', () => {
      addRiskDataToMap();
    });
  };

  const addRiskDataToMap = () => {
    if (!map.current || !riskData) return;

    // Add risk data as a source
    map.current.addSource('risk-assets', {
      type: 'geojson',
      data: riskData
    });

    // Add circles for risk visualization
    map.current.addLayer({
      id: 'risk-circles',
      type: 'circle',
      source: 'risk-assets',
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['get', 'risk_score'],
          0, 8,
          50, 15,
          100, 25
        ],
        'circle-color': [
          'case',
          ['==', ['get', 'risk_level'], 'low'],
          '#10b981', // Green
          ['==', ['get', 'risk_level'], 'medium'],
          '#f59e0b', // Yellow
          '#ef4444'  // Red (high)
        ],
        'circle-opacity': 0.8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });

    // Add click events
    map.current.on('click', 'risk-circles', (e: any) => {
      const features = map.current.queryRenderedFeatures(e.point, {
        layers: ['risk-circles']
      });

      if (features.length > 0) {
        const asset = features[0].properties;
        setSelectedAsset(asset);

        // Create popup
        new window.mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="p-3">
              <h3 class="font-semibold text-sm mb-2">${asset.name}</h3>
              <div class="space-y-1 text-xs">
                <div>Risk Score: <span class="font-medium">${asset.risk_score}</span></div>
                <div>Fire Index: <span class="font-medium">${asset.fire_index}</span></div>
                <div>Wind Speed: <span class="font-medium">${asset.wind_speed} mph</span></div>
                <div>Temperature: <span class="font-medium">${asset.temperature}°C</span></div>
              </div>
            </div>
          `)
          .addTo(map.current);
      }
    });

    // Change cursor on hover
    map.current.on('mouseenter', 'risk-circles', () => {
      map.current.getCanvas().style.cursor = 'pointer';
    });

    map.current.on('mouseleave', 'risk-circles', () => {
      map.current.getCanvas().style.cursor = '';
    });
  };

  // Update map when risk data changes
  useEffect(() => {
    if (map.current && riskData) {
      addRiskDataToMap();
    }
  }, [riskData]);

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading || !isAuthenticated) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Weather Risk Analysis</h1>
                <p className="text-slate-600">Real-time weather risk assessment for insured assets</p>
              </div>
              <Button 
                onClick={loadRiskData} 
                disabled={isLoadingData}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
            </div>

            {/* Summary Stats */}
            {riskData && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="text-sm text-slate-600">Total Assets</p>
                        <p className="text-2xl font-bold">{riskData.metadata.total_assets}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-8 h-8 text-red-600" />
                      <div>
                        <p className="text-sm text-slate-600">High Risk</p>
                        <p className="text-2xl font-bold">
                          {riskData.features.filter(f => f.properties.risk_level === 'high').length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Activity className="w-8 h-8 text-yellow-600" />
                      <div>
                        <p className="text-sm text-slate-600">Medium Risk</p>
                        <p className="text-2xl font-bold">
                          {riskData.features.filter(f => f.properties.risk_level === 'medium').length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Cloud className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="text-sm text-slate-600">Low Risk</p>
                        <p className="text-2xl font-bold">
                          {riskData.features.filter(f => f.properties.risk_level === 'low').length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Map */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Risk Map
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    ref={mapContainer} 
                    className="w-full h-96 rounded-lg border"
                    style={{ minHeight: '400px' }}
                  />
                  <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      Low Risk
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      Medium Risk
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      High Risk
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Asset Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Asset Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {riskData ? (
                    riskData.features.map((feature, index) => (
                      <div 
                        key={index}
                        className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer"
                        onClick={() => setSelectedAsset(feature.properties)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{feature.properties.name}</h4>
                          <Badge className={getRiskLevelColor(feature.properties.risk_level)}>
                            {feature.properties.risk_level}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                          <div className="flex items-center gap-1">
                            <Thermometer className="w-3 h-3" />
                            {feature.properties.temperature}°C
                          </div>
                          <div className="flex items-center gap-1">
                            <Wind className="w-3 h-3" />
                            {feature.properties.wind_speed} mph
                          </div>
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Risk: {feature.properties.risk_score}
                          </div>
                          <div className="flex items-center gap-1">
                            <Droplets className="w-3 h-3" />
                            {feature.properties.humidity}% humidity
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          Value: {formatCurrency(feature.properties.insured_value)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-slate-500 py-8">
                      {isLoadingData ? "Loading risk data..." : "No risk data available"}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Selected Asset Details */}
            {selectedAsset && (
              <Card>
                <CardHeader>
                  <CardTitle>{selectedAsset.name} - Detailed Risk Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <AlertTriangle className="w-8 h-8 text-red-600" />
                      <div>
                        <p className="text-sm text-slate-600">Risk Score</p>
                        <p className="text-xl font-bold">{selectedAsset.risk_score}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Thermometer className="w-8 h-8 text-orange-600" />
                      <div>
                        <p className="text-sm text-slate-600">Fire Index</p>
                        <p className="text-xl font-bold">{selectedAsset.fire_index}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Wind className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="text-sm text-slate-600">Wind Speed</p>
                        <p className="text-xl font-bold">{selectedAsset.wind_speed} mph</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Droplets className="w-8 h-8 text-cyan-600" />
                      <div>
                        <p className="text-sm text-slate-600">Humidity</p>
                        <p className="text-xl font-bold">{selectedAsset.humidity}%</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Asset Type:</strong> {selectedAsset.asset_type} | 
                      <strong> Insured Value:</strong> {formatCurrency(selectedAsset.insured_value)} |
                      <strong> Temperature:</strong> {selectedAsset.temperature}°C |
                      <strong> Precipitation:</strong> {selectedAsset.precipitation} mm/h
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}