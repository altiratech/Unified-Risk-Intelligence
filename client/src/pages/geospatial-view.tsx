import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthWrapper } from "@/components/layout/auth-wrapper";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { 
  Cloud, 
  Thermometer, 
  Wind, 
  Droplets, 
  AlertTriangle,
  RefreshCw,
  MapPin,
  Activity,
  Map,
  Layers,
  BarChart3,
  Search,
  Plus,
  Eye,
  EyeOff,
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,
  Clock
} from "lucide-react";

// Mapbox GL JS types
declare global {
  interface Window {
    mapboxgl: any;
    MapboxGeocoder: any;
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

interface RiskExposure {
  id: string;
  policyNumber: string;
  totalInsuredValue: string;
  latitude: string;
  longitude: string;
  peril: string;
  occupancy: string;
  constructionType: string;
  yearBuilt: number;
  organizationId: string;
  createdAt: string;
}

export default function GeospatialView() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [weatherRiskData, setWeatherRiskData] = useState<WeatherRiskData | null>(null);
  const [isLoadingWeatherData, setIsLoadingWeatherData] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("exposures");
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const [searchAddress, setSearchAddress] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showWeatherLayers, setShowWeatherLayers] = useState(true); // Enable by default for testing
  const [showHeatLayer, setShowHeatLayer] = useState(false);
  const [showWindLayer, setShowWindLayer] = useState(false);
  const [animationData, setAnimationData] = useState<any>(null);
  const [isLoadingAnimation, setIsLoadingAnimation] = useState(false);
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(1000); // ms between frames

  // Fetch risk exposures from existing API - disabled for preview mode
  const { data: exposures = [], isLoading: exposuresLoading } = useQuery<RiskExposure[]>({
    queryKey: ["/api/risk-exposures"],
    enabled: false, // Disable for preview mode
    retry: false,
  });

  // Fetch Mapbox config
  const { data: config } = useQuery<{mapboxAccessToken: string}>({
    queryKey: ["/api/config"],
    retry: false,
  });

  // Update mapbox token when config loads
  useEffect(() => {
    if (config?.mapboxAccessToken) {
      setMapboxToken(config.mapboxAccessToken);
    }
  }, [config]);

  // Load sample weather data on component mount for preview mode
  useEffect(() => {
    if (!weatherRiskData) {
      console.log('Loading initial sample weather data for preview');
      loadSampleWeatherData();
    }
  }, []);

  // Load Mapbox GL JS and Geocoder dynamically
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.mapboxgl) {
      // Load Mapbox GL JS
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
      
      // Load Mapbox Geocoder
      const geocoderScript = document.createElement('script');
      geocoderScript.src = 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.min.js';
      
      script.onload = () => {
        geocoderScript.onload = () => {
          if (mapboxToken) initializeMap();
        };
        document.head.appendChild(geocoderScript);
      };
      document.head.appendChild(script);

      // Add CSS files
      const mapboxLink = document.createElement('link');
      mapboxLink.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
      mapboxLink.rel = 'stylesheet';
      document.head.appendChild(mapboxLink);

      const geocoderLink = document.createElement('link');
      geocoderLink.href = 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.css';
      geocoderLink.rel = 'stylesheet';
      document.head.appendChild(geocoderLink);
    } else if (window.mapboxgl && mapboxToken) {
      initializeMap();
    }
  }, [mapboxToken]);

  // Load weather risk data
  const loadWeatherRiskData = async () => {
    setIsLoadingWeatherData(true);
    
    // For preview mode, skip API calls and use sample data directly
    try {
      console.log('Loading sample weather data for preview mode');
      loadSampleWeatherData();
      
      toast({
        title: "Sample Data Loaded",
        description: "Using sample weather risk data for preview",
      });
    } catch (error) {
      console.error('Error loading sample weather data:', error);
      toast({
        title: "Error",
        description: "Failed to load weather data",
        variant: "destructive",
      });
    } finally {
      setIsLoadingWeatherData(false);
    }
  };

  const loadSampleWeatherData = () => {
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
    setWeatherRiskData(sampleData);
  };

  const initializeMap = () => {
    if (!mapContainer.current || map.current || !mapboxToken) return;

    // Initialize Mapbox map with your access token
    map.current = new window.mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-98.5795, 39.8283], // Center of US
      zoom: 4,
      accessToken: mapboxToken
    });

    // Add navigation controls
    map.current.addControl(new window.mapboxgl.NavigationControl(), 'top-right');

    // Add geocoder for address search (temporarily disabled to avoid constructor error)
    // TODO: Fix MapboxGeocoder initialization
    /*
    const geocoder = new window.MapboxGeocoder({
      accessToken: mapboxToken,
      mapboxgl: window.mapboxgl,
      placeholder: 'Search for addresses, places...',
      marker: {
        color: 'orange'
      }
    });
    
    map.current.addControl(geocoder, 'top-left');
    */

    map.current.on('load', () => {
      addExposureDataToMap();
      if (activeTab === "weather" && weatherRiskData) {
        addWeatherDataToMap();
      }
      
      // Initialize weather layers
      initializeWeatherLayers();
    });
  };

  // Add comprehensive weather layer functionality using Tomorrow.io data
  const addWeatherLayers = async () => {
    if (!map.current || !map.current.isStyleLoaded()) {
      console.log('Cannot add weather layers - map not ready');
      return;
    }

    console.log('Adding weather layers - Heat:', showHeatLayer, 'Wind:', showWindLayer);

    // Add temperature heat layer using Tomorrow.io data
    if (showHeatLayer && !map.current.getSource('temperature-data')) {
      console.log('Fetching temperature layer data from Tomorrow.io');
      try {
        const response = await fetch('/api/weather-layers/temperature');
        const result = await response.json();
        
        if (result.success) {
          console.log('Adding temperature layer with Tomorrow.io data');
          map.current.addSource('temperature-data', {
            type: 'geojson',
            data: result.data
          });

          // Add heatmap layer
          map.current.addLayer({
            id: 'temperature-heatmap',
            type: 'heatmap',
            source: 'temperature-data',
            paint: {
              'heatmap-weight': ['get', 'intensity'],
              'heatmap-intensity': 0.7,
              'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0, 'rgba(0, 0, 255, 0)',        // Transparent blue
                0.2, 'rgba(0, 255, 255, 0.5)',  // Cyan
                0.4, 'rgba(0, 255, 0, 0.6)',    // Green
                0.6, 'rgba(255, 255, 0, 0.7)',  // Yellow
                0.8, 'rgba(255, 165, 0, 0.8)',  // Orange
                1, 'rgba(255, 0, 0, 0.9)'       // Red
              ],
              'heatmap-radius': 60,
              'heatmap-opacity': 0.8
            }
          });
          
          console.log('Temperature heatmap layer added successfully');
        } else {
          console.error('Failed to fetch temperature data:', result.error);
        }
      } catch (error) {
        console.error('Error fetching temperature layer:', error);
      }
    }

    // Add wind layer using Tomorrow.io data
    if (showWindLayer && !map.current.getSource('wind-data')) {
      console.log('Fetching wind layer data from Tomorrow.io');
      try {
        const response = await fetch('/api/weather-layers/wind');
        const result = await response.json();
        
        if (result.success) {
          console.log('Adding wind layer with Tomorrow.io data');
          map.current.addSource('wind-data', {
            type: 'geojson',
            data: result.data
          });

          // Add wind circles layer
          map.current.addLayer({
            id: 'wind-circles',
            type: 'circle',
            source: 'wind-data',
            paint: {
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['get', 'intensity'],
                0, 10,
                1, 40
              ],
              'circle-color': [
                'interpolate',
                ['linear'],
                ['get', 'windSpeed'],
                0, '#e3f2fd',    // Very light blue
                10, '#90caf9',   // Light blue
                20, '#2196f3',   // Blue
                30, '#0d47a1'    // Dark blue
              ],
              'circle-opacity': 0.6,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            }
          });
          
          console.log('Wind layer added successfully');
        } else {
          console.error('Failed to fetch wind data:', result.error);
        }
      } catch (error) {
        console.error('Error fetching wind layer:', error);
      }
    }
  };

  const removeWeatherLayers = () => {
    if (!map.current) return;

    console.log('Removing weather layers');
    const layersToRemove = ['temperature-heatmap', 'wind-circles'];
    const sourcesToRemove = ['temperature-data', 'wind-data'];

    layersToRemove.forEach(layerId => {
      if (map.current.getLayer(layerId)) {
        console.log('Removing layer:', layerId);
        map.current.removeLayer(layerId);
      }
    });

    sourcesToRemove.forEach(sourceId => {
      if (map.current.getSource(sourceId)) {
        console.log('Removing source:', sourceId);
        map.current.removeSource(sourceId);
      }
    });
  };

  const initializeWeatherLayers = () => {
    if (!map.current) return;
    
    // Set up layer toggles
    map.current.on('styledata', () => {
      if (showWeatherLayers) {
        addWeatherLayers();
      }
    });
  };

  // Load animation data
  const loadAnimationData = async () => {
    setIsLoadingAnimation(true);
    try {
      const response = await fetch('/api/weather-risk/animation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        setAnimationData(result.data);
        setCurrentFrame(0);
        toast({
          title: "Animation Data Loaded",
          description: `${result.data.animation.timestamps.length} frames ready for playback`,
        });
      } else {
        toast({
          title: "Animation Failed",
          description: result.message || "Failed to generate animation data",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Animation Error",
        description: "Failed to load animation data",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAnimation(false);
    }
  };

  // Animation playback controls
  const playAnimation = () => {
    if (!animationData || isAnimationPlaying) return;
    
    setIsAnimationPlaying(true);
    
    const intervalId = setInterval(() => {
      setCurrentFrame(prev => {
        const nextFrame = prev + 1;
        if (nextFrame >= animationData.animation.timestamps.length) {
          clearInterval(intervalId);
          setIsAnimationPlaying(false);
          return 0; // Reset to beginning
        }
        return nextFrame;
      });
    }, animationSpeed);
    
    // Store interval ID for cleanup
    (window as any).animationInterval = intervalId;
  };

  const pauseAnimation = () => {
    setIsAnimationPlaying(false);
    if ((window as any).animationInterval) {
      clearInterval((window as any).animationInterval);
    }
  };

  const stopAnimation = () => {
    pauseAnimation();
    setCurrentFrame(0);
  };

  const nextFrame = () => {
    if (!animationData) return;
    setCurrentFrame(prev => Math.min(prev + 1, animationData.animation.timestamps.length - 1));
  };

  const previousFrame = () => {
    setCurrentFrame(prev => Math.max(prev - 1, 0));
  };

  // Update map with animation frame data
  const updateMapWithFrame = (frameIndex: number) => {
    if (!map.current || !animationData) return;

    // Get features for current frame
    const frameFeatures = animationData.features.filter(
      (feature: any) => feature.properties.frame_index === frameIndex
    );

    if (frameFeatures.length === 0) return;

    // Update weather circles with frame data
    const frameGeoJSON = {
      type: "FeatureCollection",
      features: frameFeatures
    };

    if (map.current.getSource('weather-animation')) {
      map.current.getSource('weather-animation').setData(frameGeoJSON);
    } else {
      map.current.addSource('weather-animation', {
        type: 'geojson',
        data: frameGeoJSON
      });

      // Add animated circles layer
      map.current.addLayer({
        id: 'weather-animation-circles',
        type: 'circle',
        source: 'weather-animation',
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
            ['<', ['get', 'risk_score'], 25], '#10b981', // Green for low risk
            ['<', ['get', 'risk_score'], 60], '#f59e0b', // Yellow for medium risk
            '#ef4444' // Red for high risk
          ],
          'circle-opacity': 0.8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });

      // Add click events for animation circles
      map.current.on('click', 'weather-animation-circles', (e: any) => {
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ['weather-animation-circles']
        });

        if (features.length > 0) {
          const asset = features[0].properties;
          setSelectedAsset(asset);

          new window.mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
              <div class="p-3">
                <h3 class="font-semibold text-sm mb-2">${asset.name}</h3>
                <div class="text-xs text-gray-600 mb-2">
                  ${new Date(asset.timestamp).toLocaleString()}
                </div>
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
    }
  };

  // Manual address search function
  const handleAddressSearch = async () => {
    if (!searchAddress.trim() || !mapboxToken) return;
    
    setIsSearching(true);
    
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchAddress)}.json?access_token=${mapboxToken}&limit=1`
      );
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        const placeName = data.features[0].place_name;
        
        // Fly to location
        map.current.flyTo({
          center: [lng, lat],
          zoom: 12,
          duration: 2000
        });
        
        // Add marker
        new window.mapboxgl.Marker({ color: '#f59e0b' })
          .setLngLat([lng, lat])
          .setPopup(
            new window.mapboxgl.Popup({ offset: 25 })
              .setHTML(`<div class="p-2"><strong>Search Result:</strong><br/>${placeName}</div>`)
          )
          .addTo(map.current);
        
        toast({
          title: "Location Found",
          description: `Found: ${placeName}`,
        });
      } else {
        toast({
          title: "Location Not Found", 
          description: "No results found for that address",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Search Error",
        description: "Failed to search for address",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const addExposureDataToMap = () => {
    if (!map.current || !exposures.length) return;

    // Convert exposures to GeoJSON
    const exposureGeoJSON = {
      type: "FeatureCollection",
      features: exposures.map(exposure => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [parseFloat(exposure.longitude), parseFloat(exposure.latitude)]
        },
        properties: {
          id: exposure.id,
          policyNumber: exposure.policyNumber,
          totalInsuredValue: parseFloat(exposure.totalInsuredValue),
          peril: exposure.peril,
          occupancy: exposure.occupancy,
          constructionType: exposure.constructionType,
          yearBuilt: exposure.yearBuilt
        }
      }))
    };

    // Add exposure data as a source
    if (map.current.getSource('risk-exposures')) {
      map.current.getSource('risk-exposures').setData(exposureGeoJSON);
    } else {
      map.current.addSource('risk-exposures', {
        type: 'geojson',
        data: exposureGeoJSON
      });

      // Add circles for exposure visualization
      map.current.addLayer({
        id: 'exposure-circles',
        type: 'circle',
        source: 'risk-exposures',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'totalInsuredValue'],
            500000, 6,
            2000000, 12,
            10000000, 20
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'peril'], 'hurricane'],
            '#3b82f6', // Blue
            ['==', ['get', 'peril'], 'earthquake'],
            '#ef4444', // Red
            ['==', ['get', 'peril'], 'flood'],
            '#06b6d4', // Cyan
            '#10b981'  // Green (default)
          ],
          'circle-opacity': 0.7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });

      // Add click events for exposures
      map.current.on('click', 'exposure-circles', (e: any) => {
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ['exposure-circles']
        });

        if (features.length > 0) {
          const exposure = features[0].properties;
          setSelectedAsset(exposure);

          new window.mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
              <div class="p-3">
                <h3 class="font-semibold text-sm mb-2">Policy: ${exposure.policyNumber}</h3>
                <div class="space-y-1 text-xs">
                  <div>Insured Value: <span class="font-medium">$${exposure.totalInsuredValue.toLocaleString()}</span></div>
                  <div>Peril: <span class="font-medium">${exposure.peril}</span></div>
                  <div>Occupancy: <span class="font-medium">${exposure.occupancy}</span></div>
                  <div>Construction: <span class="font-medium">${exposure.constructionType}</span></div>
                </div>
              </div>
            `)
            .addTo(map.current);
        }
      });
    }
  };

  const addWeatherDataToMap = () => {
    if (!map.current || !weatherRiskData) {
      console.log('Cannot add weather data - map or data missing:', {
        hasMap: !!map.current,
        hasData: !!weatherRiskData,
        dataFeatures: weatherRiskData?.features?.length || 0
      });
      return;
    }

    console.log('Adding weather data to map with', weatherRiskData.features.length, 'features');

    // Hide exposure circles when showing weather data
    if (map.current.getLayer('exposure-circles')) {
      map.current.setLayoutProperty('exposure-circles', 'visibility', 'none');
    }

    // Add weather risk data as a source
    if (map.current.getSource('weather-risk')) {
      console.log('Updating existing weather-risk source');
      map.current.getSource('weather-risk').setData(weatherRiskData);
    } else {
      console.log('Adding new weather-risk source');
      map.current.addSource('weather-risk', {
        type: 'geojson',
        data: weatherRiskData
      });

      // Add circles for weather risk visualization
      map.current.addLayer({
        id: 'weather-circles',
        type: 'circle',
        source: 'weather-risk',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'risk_score'],
            0, 12,
            50, 20,
            100, 30
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'risk_level'], 'low'],
            '#10b981', // Green
            ['==', ['get', 'risk_level'], 'medium'],
            '#f59e0b', // Yellow
            '#ef4444'  // Red (high)
          ],
          'circle-opacity': 0.9,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff'
        },
        layout: {
          'visibility': 'visible'
        }
      });

      // Add click events for weather data
      map.current.on('click', 'weather-circles', (e: any) => {
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ['weather-circles']
        });

        if (features.length > 0) {
          const asset = features[0].properties;
          setSelectedAsset(asset);

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
      
      console.log('Weather circles layer added successfully');
    }
  };

  const switchMapData = (dataType: string) => {
    if (!map.current) return;

    console.log('Switching map data to:', dataType);

    if (dataType === "exposures") {
      // Show exposure circles, hide weather circles
      if (map.current.getLayer('exposure-circles')) {
        map.current.setLayoutProperty('exposure-circles', 'visibility', 'visible');
        console.log('Showing exposure circles');
      }
      if (map.current.getLayer('weather-circles')) {
        map.current.setLayoutProperty('weather-circles', 'visibility', 'none');
        console.log('Hiding weather circles');
      }
    } else if (dataType === "weather") {
      // Show weather circles, hide exposure circles
      if (map.current.getLayer('exposure-circles')) {
        map.current.setLayoutProperty('exposure-circles', 'visibility', 'none');
        console.log('Hiding exposure circles');
      }
      
      // Load weather data if not already loaded
      if (!weatherRiskData) {
        loadWeatherRiskData();
      } else {
        addWeatherDataToMap();
      }
      
      // Ensure weather circles are visible
      if (map.current.getLayer('weather-circles')) {
        map.current.setLayoutProperty('weather-circles', 'visibility', 'visible');
        console.log('Showing weather circles');
      } else {
        console.log('Weather circles layer not found');
      }
    }
  };

  // Handle tab changes and weather layer toggles
  useEffect(() => {
    if (map.current) {
      switchMapData(activeTab);
    }
    
    // Update weather layers when in weather tab
    if (activeTab === "weather" && map.current && map.current.isStyleLoaded()) {
      console.log('Updating weather layers - showWeatherLayers:', showWeatherLayers, 'showHeatLayer:', showHeatLayer, 'showWindLayer:', showWindLayer);
      
      if (showWeatherLayers) {
        addWeatherLayers();
      } else {
        removeWeatherLayers();
      }
    }
  }, [activeTab, weatherRiskData, showWeatherLayers, showHeatLayer, showWindLayer]);

  // Separate effect to handle individual layer toggles
  useEffect(() => {
    if (activeTab === "weather" && map.current && map.current.isStyleLoaded()) {
      // Handle temperature layer toggle
      if (showHeatLayer && !map.current.getLayer('temperature-heatmap')) {
        console.log('Adding temperature layer from toggle');
        addWeatherLayers();
      } else if (!showHeatLayer && map.current.getLayer('temperature-heatmap')) {
        console.log('Removing temperature layer from toggle');
        if (map.current.getLayer('temperature-heatmap')) {
          map.current.removeLayer('temperature-heatmap');
        }
        if (map.current.getSource('temperature-data')) {
          map.current.removeSource('temperature-data');
        }
      }

      // Handle wind layer toggle
      if (showWindLayer && !map.current.getLayer('wind-circles')) {
        console.log('Adding wind layer from toggle');
        addWeatherLayers();
      } else if (!showWindLayer && map.current.getLayer('wind-circles')) {
        console.log('Removing wind layer from toggle');
        if (map.current.getLayer('wind-circles')) {
          map.current.removeLayer('wind-circles');
        }
        if (map.current.getSource('wind-data')) {
          map.current.removeSource('wind-data');
        }
      }
    }
  }, [showHeatLayer, showWindLayer, activeTab]);

  // Ensure weather data displays when switching to weather tab
  useEffect(() => {
    if (activeTab === "weather" && weatherRiskData && map.current) {
      console.log('Weather tab active, adding weather data to map');
      addWeatherDataToMap();
      
      // Force visibility check after a short delay
      setTimeout(() => {
        if (map.current && map.current.getLayer('weather-circles')) {
          const visibility = map.current.getLayoutProperty('weather-circles', 'visibility');
          console.log('Weather circles visibility:', visibility);
          
          // Debug: Check if features are being rendered
          const features = map.current.querySourceFeatures('weather-risk');
          console.log('Weather features in source:', features.length);
          
          if (features.length > 0) {
            console.log('Sample feature coordinates:', features[0].geometry.coordinates);
            console.log('Sample feature properties:', features[0].properties);
            
            // Pan to first weather location to ensure it's visible
            const [lng, lat] = features[0].geometry.coordinates;
            map.current.flyTo({
              center: [lng, lat],
              zoom: 6,
              duration: 2000
            });
            console.log('Flying to weather location:', [lng, lat]);
          }
          
          if (visibility !== 'visible') {
            map.current.setLayoutProperty('weather-circles', 'visibility', 'visible');
            console.log('Forced weather circles to visible');
          }
        }
      }, 100);
    }
  }, [activeTab, weatherRiskData]);

  // Handle animation frame updates
  useEffect(() => {
    if (activeTab === "weather" && animationData && map.current) {
      updateMapWithFrame(currentFrame);
    }
  }, [currentFrame, animationData, activeTab]);

  // Update map when data changes
  useEffect(() => {
    if (map.current && exposures.length) {
      addExposureDataToMap();
    }
  }, [exposures]);

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPerilColor = (peril: string) => {
    switch (peril) {
      case 'hurricane': return 'bg-blue-100 text-blue-800';
      case 'earthquake': return 'bg-red-100 text-red-800';
      case 'flood': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <AuthWrapper showLoginPrompt={false}>
      <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Geospatial Risk Analysis</h1>
                <p className="text-slate-600">Interactive mapping of risk exposures and weather data</p>
              </div>
              <div className="flex gap-2">
                {/* Address Search */}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search addresses..."
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddressSearch()}
                    className="w-48"
                  />
                  <Button 
                    onClick={handleAddressSearch}
                    disabled={isSearching || !searchAddress.trim()}
                    variant="outline"
                    size="sm"
                  >
                    <Search className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                
                <Button 
                  onClick={loadWeatherRiskData} 
                  disabled={isLoadingWeatherData}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingWeatherData ? 'animate-spin' : ''}`} />
                  Refresh Weather
                </Button>
                
                <Button 
                  onClick={loadAnimationData} 
                  disabled={isLoadingAnimation}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Activity className={`w-4 h-4 ${isLoadingAnimation ? 'animate-spin' : ''}`} />
                  Forecast Animation
                </Button>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="exposures" className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Risk Exposures
                </TabsTrigger>
                <TabsTrigger value="weather" className="flex items-center gap-2">
                  <Cloud className="w-4 h-4" />
                  Weather Risk
                </TabsTrigger>
              </TabsList>

              <TabsContent value="exposures" className="space-y-6">
                {/* Exposure Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <MapPin className="w-8 h-8 text-blue-600" />
                        <div>
                          <p className="text-sm text-slate-600">Total Exposures</p>
                          <p className="text-2xl font-bold">{exposures.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-green-600" />
                        <div>
                          <p className="text-sm text-slate-600">Total Value</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(exposures.reduce((sum, exp) => sum + parseFloat(exp.totalInsuredValue), 0))}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Wind className="w-8 h-8 text-purple-600" />
                        <div>
                          <p className="text-sm text-slate-600">Hurricane Risk</p>
                          <p className="text-2xl font-bold">
                            {exposures.filter(exp => exp.peril === 'hurricane').length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                        <div>
                          <p className="text-sm text-slate-600">Earthquake Risk</p>
                          <p className="text-2xl font-bold">
                            {exposures.filter(exp => exp.peril === 'earthquake').length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="weather" className="space-y-6">
                {/* Weather Layer Controls */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="w-5 h-5" />
                      Weather Layer Controls
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="weather-layers" className="flex items-center gap-2">
                          <Map className="w-4 h-4" />
                          Weather Layers
                        </Label>
                        <Switch
                          id="weather-layers"
                          checked={showWeatherLayers}
                          onCheckedChange={setShowWeatherLayers}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="heat-layer" className="flex items-center gap-2">
                          <Thermometer className="w-4 h-4" />
                          Temperature Heat
                        </Label>
                        <Switch
                          id="heat-layer"
                          checked={showHeatLayer}
                          onCheckedChange={(checked) => {
                            console.log('Temperature Heat toggle clicked:', checked);
                            setShowHeatLayer(checked);
                          }}
                          disabled={!showWeatherLayers}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="wind-layer" className="flex items-center gap-2">
                          <Wind className="w-4 h-4" />
                          Wind Patterns
                        </Label>
                        <Switch
                          id="wind-layer"
                          checked={showWindLayer}
                          onCheckedChange={(checked) => {
                            console.log('Wind Patterns toggle clicked:', checked);
                            setShowWindLayer(checked);
                          }}
                          disabled={!showWeatherLayers}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Animation Controls */}
                {animationData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Predictive Risk Animation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Timeline Display */}
                        <div className="bg-slate-100 p-3 rounded-lg">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Current Time:</span>
                            <span className="font-medium">
                              {animationData.animation.timestamps[currentFrame] ? 
                                new Date(animationData.animation.timestamps[currentFrame]).toLocaleString() :
                                'No data'
                              }
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm mt-1">
                            <span className="text-slate-600">Frame:</span>
                            <span className="font-medium">
                              {currentFrame + 1} / {animationData.animation.timestamps.length}
                            </span>
                          </div>
                        </div>

                        {/* Playback Controls */}
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            onClick={previousFrame} 
                            disabled={currentFrame === 0}
                            variant="outline" 
                            size="sm"
                          >
                            <SkipBack className="w-4 h-4" />
                          </Button>
                          
                          {isAnimationPlaying ? (
                            <Button onClick={pauseAnimation} variant="outline" size="sm">
                              <Pause className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button onClick={playAnimation} variant="outline" size="sm">
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          
                          <Button onClick={stopAnimation} variant="outline" size="sm">
                            <Square className="w-4 h-4" />
                          </Button>
                          
                          <Button 
                            onClick={nextFrame} 
                            disabled={currentFrame >= animationData.animation.timestamps.length - 1}
                            variant="outline" 
                            size="sm"
                          >
                            <SkipForward className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Speed Control */}
                        <div className="flex items-center gap-3">
                          <Label htmlFor="animation-speed" className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4" />
                            Speed (ms):
                          </Label>
                          <Input
                            id="animation-speed"
                            type="number"
                            min="100"
                            max="3000"
                            step="100"
                            value={animationSpeed}
                            onChange={(e) => setAnimationSpeed(parseInt(e.target.value) || 1000)}
                            className="w-20"
                          />
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${((currentFrame + 1) / animationData.animation.timestamps.length) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Weather Summary Stats */}
                {weatherRiskData && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <MapPin className="w-8 h-8 text-blue-600" />
                          <div>
                            <p className="text-sm text-slate-600">Weather Assets</p>
                            <p className="text-2xl font-bold">{weatherRiskData.metadata.total_assets}</p>
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
                              {weatherRiskData.features.filter(f => f.properties.risk_level === 'high').length}
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
                              {weatherRiskData.features.filter(f => f.properties.risk_level === 'medium').length}
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
                              {weatherRiskData.features.filter(f => f.properties.risk_level === 'low').length}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* Map Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Map className="w-5 h-5" />
                      {activeTab === "exposures" ? "Risk Exposures Map" : "Weather Risk Map"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      ref={mapContainer} 
                      className="w-full h-96 rounded-lg border"
                      style={{ minHeight: '500px' }}
                    />
                    <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
                      {activeTab === "exposures" ? (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            Hurricane
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            Earthquake
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                            Flood
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            Other
                          </div>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Details Panel */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {activeTab === "exposures" ? "Exposure Details" : "Weather Asset Details"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {activeTab === "exposures" ? (
                      exposures.length > 0 ? (
                        exposures.slice(0, 5).map((exposure, index) => (
                          <div 
                            key={index}
                            className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer"
                            onClick={() => setSelectedAsset(exposure)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-sm">{exposure.policyNumber}</h4>
                              <Badge className={getPerilColor(exposure.peril)}>
                                {exposure.peril}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 gap-1 text-xs text-slate-600">
                              <div>Value: {formatCurrency(parseFloat(exposure.totalInsuredValue))}</div>
                              <div>Occupancy: {exposure.occupancy}</div>
                              <div>Built: {exposure.yearBuilt}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-slate-500 py-8">
                          {exposuresLoading ? "Loading exposures..." : "No exposures available"}
                        </div>
                      )
                    ) : (
                      weatherRiskData ? (
                        weatherRiskData.features.map((feature, index) => (
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
                                {feature.properties.humidity}%
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-slate-500 py-8">
                          {isLoadingWeatherData ? "Loading weather data..." : "No weather data available"}
                        </div>
                      )
                    )}
                  </CardContent>
                </Card>
              </div>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
    </AuthWrapper>
  );
}