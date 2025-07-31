import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface RiskMapProps {
  exposures: any[];
  className?: string;
}

export function RiskMap({ exposures, className }: RiskMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([39.8283, -98.5795], 4); // Center of US

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !exposures.length) return;

    const map = mapInstanceRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Add risk markers
    exposures.forEach((exposure) => {
      if (exposure.latitude && exposure.longitude) {
        const lat = parseFloat(exposure.latitude);
        const lng = parseFloat(exposure.longitude);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          const riskScore = parseFloat(exposure.riskScore || "0");
          
          // Determine marker color based on risk score
          let color = "#3B82F6"; // blue for low risk
          if (riskScore > 7.5) color = "#DC2626"; // red for high risk
          else if (riskScore > 5) color = "#D97706"; // orange for medium risk

          const marker = L.circleMarker([lat, lng], {
            radius: Math.max(5, riskScore),
            fillColor: color,
            color: color,
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.6,
          });

          // Add popup with exposure details
          marker.bindPopup(`
            <div class="p-2">
              <h4 class="font-semibold">${exposure.policyNumber || "Unknown Policy"}</h4>
              <p class="text-sm">TIV: $${parseFloat(exposure.totalInsuredValue || "0").toLocaleString()}</p>
              <p class="text-sm">Risk Score: ${riskScore.toFixed(1)}</p>
              <p class="text-sm">Peril: ${exposure.perilType || "N/A"}</p>
            </div>
          `);

          marker.addTo(map);
        }
      }
    });
  }, [exposures]);

  return (
    <div className={className}>
      {/* Map Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex space-x-2">
          <Button size="sm" variant="outline">
            Climate
          </Button>
          <Button size="sm">
            Exposure
          </Button>
        </div>
        <Button size="sm" variant="ghost">
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="w-full h-80 rounded-lg border border-slate-200 bg-slate-100"
      />

      {/* Map Legend */}
      <div className="flex items-center justify-between mt-4 text-xs">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-slate-600">High Risk</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-slate-600">Medium Risk</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-slate-600">Low Risk</span>
          </div>
        </div>
        <span className="text-slate-500">
          {exposures.length} exposure points
        </span>
      </div>
    </div>
  );
}
