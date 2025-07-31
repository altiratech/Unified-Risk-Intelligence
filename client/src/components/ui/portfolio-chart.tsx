import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";

interface PortfolioChartProps {
  exposures: any[];
  className?: string;
}

const COLORS = {
  wind: "#3B82F6",
  flood: "#D97706", 
  earthquake: "#DC2626",
  cyber: "#059669",
  fire: "#7C3AED",
  other: "#6B7280"
};

export function PortfolioChart({ exposures, className }: PortfolioChartProps) {
  const riskDistribution = useMemo(() => {
    const perilCounts: { [key: string]: { count: number; value: number } } = {};
    
    exposures.forEach((exposure) => {
      const peril = exposure.perilType?.toLowerCase() || "other";
      const value = parseFloat(exposure.totalInsuredValue || "0");
      
      if (!perilCounts[peril]) {
        perilCounts[peril] = { count: 0, value: 0 };
      }
      
      perilCounts[peril].count += 1;
      perilCounts[peril].value += value;
    });

    return Object.entries(perilCounts).map(([peril, data]) => ({
      name: peril.charAt(0).toUpperCase() + peril.slice(1),
      value: data.value,
      count: data.count,
      color: COLORS[peril as keyof typeof COLORS] || COLORS.other,
    })).sort((a, b) => b.value - a.value);
  }, [exposures]);

  const totalValue = riskDistribution.reduce((sum, item) => sum + item.value, 0);

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  if (exposures.length === 0) {
    return (
      <div className={`text-center py-8 text-slate-500 ${className}`}>
        No exposure data available
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Risk Distribution Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-700">Risk Distribution by Peril</span>
        <span className="text-xs text-slate-500">Total: {formatCurrency(totalValue)}</span>
      </div>

      {/* Pie Chart */}
      <div className="mb-6">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={riskDistribution}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {riskDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [formatCurrency(value), "Exposure"]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Risk Distribution List */}
      <div className="space-y-3">
        {riskDistribution.map((risk, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <div 
                className="w-4 h-2 rounded-full" 
                style={{ backgroundColor: risk.color }}
              />
              <span className="text-sm text-slate-700">{risk.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-24 bg-slate-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full" 
                  style={{ 
                    width: `${(risk.value / totalValue) * 100}%`,
                    backgroundColor: risk.color 
                  }}
                />
              </div>
              <span className="text-xs text-slate-600 w-12 text-right">
                {formatCurrency(risk.value)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Risk Concentration Bar Chart */}
      {riskDistribution.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Exposure Concentration</h4>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={riskDistribution} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                stroke="#64748b"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#64748b"
                tickFormatter={formatCurrency}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), "Exposure"]}
                labelStyle={{ color: "#1e293b" }}
                contentStyle={{ 
                  backgroundColor: "white", 
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px"
                }}
              />
              <Bar 
                dataKey="value" 
                fill="#3B82F6"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
