import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  AlertTriangle, 
  Shield, 
  BarChart3, 
  MapPin, 
  PieChart,
  Target,
  Activity,
  Zap
} from "lucide-react";

interface PortfolioAnalyticsProps {
  data: {
    totalInsuredValue: number;
    policyCount: number;
    averageInsuredValue: number;
    geographicConcentration: Array<{
      region: string;
      exposure: number;
      percentage: number;
      riskScore: number;
    }>;
    perilDistribution: Array<{
      peril: string;
      exposure: number;
      percentage: number;
      averageRiskScore: number;
    }>;
    probableMaximumLoss: {
      pml_100_year: number;
      pml_250_year: number;
      pml_500_year: number;
      pml_1000_year: number;
    };
    averageAnnualLoss: {
      total: number;
      byPeril: { [peril: string]: number };
      asPercentage: number;
    };
    riskConcentration: {
      herfindahlIndex: number;
      top10Percentage: number;
      largestSingleRisk: number;
      concentrationRisk: 'Low' | 'Medium' | 'High';
    };
    correlationAnalysis: {
      geographicCorrelation: number;
      perilCorrelation: number;
      diversificationBenefit: number;
    };
    riskQuality: {
      dataCompleteness: number;
      geocodingAccuracy: number;
      riskScoreDistribution: {
        low: number;
        medium: number;
        high: number;
      };
    };
    catastropheScenarios: Array<{
      scenarioName: string;
      returnPeriod: number;
      expectedLoss: number;
      affectedPolicies: number;
      impactPercentage: number;
    }>;
  };
  isLoading?: boolean;
}

export function PortfolioAnalytics({ data, isLoading }: PortfolioAnalyticsProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'High': return 'destructive';
      case 'Medium': return 'default';
      case 'Low': return 'secondary';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-slate-200 rounded mb-2"></div>
                  <div className="h-8 bg-slate-200 rounded mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Risk Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">PML (250-Year)</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(data.probableMaximumLoss.pml_250_year)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {formatPercentage((data.probableMaximumLoss.pml_250_year / data.totalInsuredValue) * 100)} of TIV
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Average Annual Loss</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(data.averageAnnualLoss.total)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {formatPercentage(data.averageAnnualLoss.asPercentage)} of TIV
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Concentration Risk</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-slate-900">
                    {data.riskConcentration.herfindahlIndex}
                  </p>
                  <Badge variant={getRiskBadgeColor(data.riskConcentration.concentrationRisk)}>
                    {data.riskConcentration.concentrationRisk}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  HHI Index Score
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="pml" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pml">PML Analysis</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
          <TabsTrigger value="perils">Perils</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="quality">Data Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="pml" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Probable Maximum Loss (PML) Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">100-Year PML</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatCurrency(data.probableMaximumLoss.pml_100_year)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatPercentage((data.probableMaximumLoss.pml_100_year / data.totalInsuredValue) * 100)}
                  </p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">250-Year PML</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatCurrency(data.probableMaximumLoss.pml_250_year)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatPercentage((data.probableMaximumLoss.pml_250_year / data.totalInsuredValue) * 100)}
                  </p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">500-Year PML</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatCurrency(data.probableMaximumLoss.pml_500_year)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatPercentage((data.probableMaximumLoss.pml_500_year / data.totalInsuredValue) * 100)}
                  </p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">1000-Year PML</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatCurrency(data.probableMaximumLoss.pml_1000_year)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatPercentage((data.probableMaximumLoss.pml_1000_year / data.totalInsuredValue) * 100)}
                  </p>
                </div>
              </div>
              
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Diversification Benefit</span>
                  <span className="text-sm text-slate-600">
                    {formatPercentage(data.correlationAnalysis.diversificationBenefit)}
                  </span>
                </div>
                <Progress value={data.correlationAnalysis.diversificationBenefit} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geography" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Geographic Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.geographicConcentration.slice(0, 6).map((region, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                      <span className="font-medium">{region.region}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(region.exposure)}</p>
                      <p className="text-sm text-slate-500">
                        {formatPercentage(region.percentage)} • Risk: {region.riskScore.toFixed(1)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="perils" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                Peril Distribution & AAL
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.perilDistribution.map((peril, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold capitalize">{peril.peril}</h4>
                      <Badge variant="outline">
                        {formatPercentage(peril.percentage)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Exposure</p>
                        <p className="font-medium">{formatCurrency(peril.exposure)}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Avg Risk Score</p>
                        <p className="font-medium">{peril.averageRiskScore.toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Est. AAL</p>
                        <p className="font-medium">
                          {formatCurrency(data.averageAnnualLoss.byPeril[peril.peril] || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Catastrophe Scenarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.catastropheScenarios.map((scenario, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{scenario.scenarioName}</h4>
                      <Badge variant="outline">
                        {scenario.returnPeriod}-Year Event
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Expected Loss</p>
                        <p className="font-medium">{formatCurrency(scenario.expectedLoss)}</p>
                        <p className="text-xs text-slate-500">
                          {formatPercentage(scenario.impactPercentage)} of portfolio
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Affected Policies</p>
                        <p className="font-medium">{scenario.affectedPolicies.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Return Period</p>
                        <p className="font-medium">{scenario.returnPeriod} years</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Data Quality Indicators
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Data Completeness</span>
                    <span className="text-sm text-slate-600">
                      {data.riskQuality.dataCompleteness}%
                    </span>
                  </div>
                  <Progress value={data.riskQuality.dataCompleteness} className="h-2" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Geocoding Accuracy</span>
                    <span className="text-sm text-slate-600">
                      {data.riskQuality.geocodingAccuracy}%
                    </span>
                  </div>
                  <Progress value={data.riskQuality.geocodingAccuracy} className="h-2" />
                </div>

                <div>
                  <h4 className="font-medium mb-3">Risk Score Distribution</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-600">Low Risk</p>
                      <p className="text-lg font-bold text-green-700">
                        {data.riskQuality.riskScoreDistribution.low}%
                      </p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-600">Medium Risk</p>
                      <p className="text-lg font-bold text-yellow-700">
                        {data.riskQuality.riskScoreDistribution.medium}%
                      </p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-600">High Risk</p>
                      <p className="text-lg font-bold text-red-700">
                        {data.riskQuality.riskScoreDistribution.high}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}