import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  Database,
  Target,
  TrendingUp,
  Brain,
  Zap,
  MapPin,
  AlertCircle
} from "lucide-react";

interface DataQualityDashboardProps {
  analysis: {
    fields: Array<{
      name: string;
      type: string;
      sampleValues: string[];
      nullCount: number;
      uniqueCount: number;
    }>;
    mappingSuggestions: Array<{
      sourceField: string;
      targetField: string;
      confidence: number;
      reasoning: string;
      dataType: string;
    }>;
    qualityScore: {
      overall: number;
      completeness: number;
      consistency: number;
      accuracy: number;
      validity: number;
      issues: Array<{
        type: string;
        field: string;
        description: string;
        severity: 'low' | 'medium' | 'high';
        affectedRows: number;
        suggestedFix?: string;
      }>;
    };
    rowCount: number;
    preview: any[];
    enrichmentOpportunities: Array<{
      field: string;
      enrichmentType: string;
      description: string;
      confidence: number;
      apiRequired?: string;
    }>;
  };
  dataSourceId: string;
  onApplyMappings?: (minConfidence: number) => void;
  isLoading?: boolean;
}

export function DataQualityDashboard({ 
  analysis, 
  dataSourceId, 
  onApplyMappings,
  isLoading 
}: DataQualityDashboardProps) {
  
  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getQualityIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5" />;
    if (score >= 60) return <AlertTriangle className="w-5 h-5" />;
    return <XCircle className="w-5 h-5" />;
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
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
      {/* Data Quality Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Overall Quality</p>
                <p className="text-2xl font-bold text-slate-900">
                  {analysis.qualityScore.overall}%
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getQualityColor(analysis.qualityScore.overall)}`}>
                {getQualityIcon(analysis.qualityScore.overall)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Data Completeness</p>
                <p className="text-2xl font-bold text-slate-900">
                  {analysis.qualityScore.completeness}%
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getQualityColor(analysis.qualityScore.completeness)}`}>
                <Database className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Accuracy</p>
                <p className="text-2xl font-bold text-slate-900">
                  {analysis.qualityScore.accuracy}%
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getQualityColor(analysis.qualityScore.accuracy)}`}>
                <Target className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Records Analyzed</p>
                <p className="text-2xl font-bold text-slate-900">
                  {analysis.rowCount.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {analysis.fields.length} fields
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="text-blue-600 w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="mappings" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="mappings">AI Mappings</TabsTrigger>
          <TabsTrigger value="quality">Quality Issues</TabsTrigger>
          <TabsTrigger value="enrichment">Enrichment</TabsTrigger>
          <TabsTrigger value="preview">Data Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="mappings" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Brain className="w-5 h-5 mr-2" />
                  AI-Powered Field Mappings
                </CardTitle>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onApplyMappings?.(70)}
                  >
                    Accept 70%+ 
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => onApplyMappings?.(90)}
                  >
                    Accept 90%+
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.mappingSuggestions.map((mapping, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <code className="px-2 py-1 bg-slate-100 rounded text-sm">
                          {mapping.sourceField}
                        </code>
                        <span className="text-slate-400">→</span>
                        <code className="px-2 py-1 bg-primary/10 rounded text-sm">
                          {mapping.targetField}
                        </code>
                      </div>
                      <Badge variant={mapping.confidence >= 90 ? 'default' : mapping.confidence >= 70 ? 'secondary' : 'outline'}>
                        {Math.round(mapping.confidence)}% confidence
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">{mapping.reasoning}</p>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Confidence Score</span>
                        <span>{Math.round(mapping.confidence)}%</span>
                      </div>
                      <Progress value={mapping.confidence} className="h-1" />
                    </div>
                  </div>
                ))}
                
                {analysis.mappingSuggestions.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Database className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>No automatic field mappings suggested</p>
                    <p className="text-sm">Field names may require manual mapping</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Data Quality Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.qualityScore.issues.map((issue, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <Badge variant={getSeverityColor(issue.severity)}>
                          {issue.severity}
                        </Badge>
                        <span className="font-medium">{issue.field}</span>
                      </div>
                      <span className="text-sm text-slate-500">
                        {issue.affectedRows} rows affected
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mb-2">{issue.description}</p>
                    {issue.suggestedFix && (
                      <div className="p-2 bg-blue-50 rounded text-sm">
                        <strong>Suggested fix:</strong> {issue.suggestedFix}
                      </div>
                    )}
                  </div>
                ))}
                
                {analysis.qualityScore.issues.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <p className="text-green-600 font-medium">No critical data quality issues found</p>
                    <p className="text-sm">Your data appears to be well-structured and complete</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enrichment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                Data Enrichment Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.enrichmentOpportunities.map((opportunity, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {opportunity.enrichmentType === 'geocoding' && <MapPin className="w-4 h-4 text-blue-500" />}
                        {opportunity.enrichmentType === 'peril_classification' && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                        {opportunity.enrichmentType === 'property_details' && <Database className="w-4 h-4 text-green-500" />}
                        <span className="font-medium capitalize">
                          {opportunity.enrichmentType.replace('_', ' ')}
                        </span>
                      </div>
                      <Badge variant="outline">
                        {Math.round(opportunity.confidence)}% value
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{opportunity.description}</p>
                    {opportunity.apiRequired && (
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          Requires: {opportunity.apiRequired}
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
                
                {analysis.enrichmentOpportunities.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>No enrichment opportunities identified</p>
                    <p className="text-sm">Your dataset appears complete for basic analysis</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Data Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      {analysis.fields.slice(0, 6).map((field, index) => (
                        <th key={index} className="text-left py-3 px-2 font-medium text-slate-600">
                          {field.name}
                          <div className="text-xs text-slate-400 font-normal">
                            {field.type}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.preview.slice(0, 5).map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-slate-100">
                        {analysis.fields.slice(0, 6).map((field, fieldIndex) => (
                          <td key={fieldIndex} className="py-3 px-2 text-slate-700">
                            {String(row[field.name] || '').substring(0, 50)}
                            {String(row[field.name] || '').length > 50 && '...'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 text-sm text-slate-500">
                Showing first 5 rows of {analysis.rowCount.toLocaleString()} total records
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}