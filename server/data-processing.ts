import { storage } from "./storage";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

export interface DataField {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  sampleValues: string[];
  nullCount: number;
  uniqueCount: number;
}

export interface DataMappingSuggestion {
  sourceField: string;
  targetField: string;
  confidence: number;
  reasoning: string;
  dataType: string;
}

export interface DataQualityScore {
  overall: number;
  completeness: number;
  consistency: number;
  accuracy: number;
  validity: number;
  issues: DataQualityIssue[];
}

export interface DataQualityIssue {
  type: 'missing_data' | 'invalid_format' | 'outlier' | 'inconsistent' | 'duplicate';
  field: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  affectedRows: number;
  suggestedFix?: string;
}

export interface ProcessedData {
  fields: DataField[];
  mappingSuggestions: DataMappingSuggestion[];
  qualityScore: DataQualityScore;
  rowCount: number;
  preview: any[];
  enrichmentOpportunities: EnrichmentOpportunity[];
}

export interface EnrichmentOpportunity {
  field: string;
  enrichmentType: 'geocoding' | 'peril_classification' | 'property_details' | 'demographics';
  description: string;
  confidence: number;
  apiRequired?: string;
}

export class DataProcessingEngine {
  
  // Standard insurance field mappings with synonyms and patterns
  private fieldMappings = {
    policy_number: [
      'policy', 'policy_id', 'policy_no', 'policy_num', 'pol_no', 'pol_num',
      'policyid', 'policy_number', 'policynumber', 'pol_id', 'reference'
    ],
    total_insured_value: [
      'tiv', 'insured_value', 'sum_insured', 'coverage_amount', 'limit',
      'policy_limit', 'coverage_limit', 'insured_amount', 'total_sum_insured',
      'building_value', 'property_value', 'replacement_cost', 'value'
    ],
    address: [
      'address', 'location', 'property_address', 'site_address', 'street',
      'full_address', 'address_line_1', 'addr', 'property_location'
    ],
    latitude: [
      'lat', 'latitude', 'y_coord', 'northing', 'geo_lat', 'coord_lat'
    ],
    longitude: [
      'lon', 'lng', 'longitude', 'x_coord', 'easting', 'geo_lon', 'coord_lon'
    ],
    peril_type: [
      'peril', 'risk_type', 'coverage_type', 'hazard', 'exposure_type',
      'line_of_business', 'lob', 'product_line', 'risk_category'
    ],
    construction_type: [
      'construction', 'building_type', 'occupancy', 'construction_class',
      'material', 'structure_type', 'building_material'
    ],
    year_built: [
      'year_built', 'construction_year', 'built_year', 'age', 'vintage'
    ],
    occupancy_type: [
      'occupancy', 'use', 'business_type', 'property_use', 'classification'
    ]
  };

  // Peril classification patterns
  private perilPatterns = {
    wind: ['wind', 'hurricane', 'typhoon', 'cyclone', 'storm', 'windstorm'],
    flood: ['flood', 'water', 'storm surge', 'tsunami', 'inundation'],
    earthquake: ['earthquake', 'seismic', 'tremor', 'quake', 'shake'],
    fire: ['fire', 'wildfire', 'conflagration', 'blaze', 'combustion'],
    hail: ['hail', 'hailstorm', 'ice damage'],
    cyber: ['cyber', 'data breach', 'ransomware', 'malware', 'hacking'],
    terrorism: ['terrorism', 'malicious damage', 'sabotage'],
    theft: ['theft', 'burglary', 'robbery', 'larceny', 'crime']
  };

  /**
   * Process uploaded data file and generate AI-powered insights
   */
  async processDataFile(filePath: string, dataSourceId: string): Promise<ProcessedData> {
    console.log(`Processing data file: ${filePath} for source: ${dataSourceId}`);
    
    // Read and parse the file
    const fileExtension = path.extname(filePath).toLowerCase();
    let rawData: any[] = [];
    
    try {
      if (fileExtension === '.csv') {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        rawData = parse(fileContent, { 
          columns: true, 
          skip_empty_lines: true,
          trim: true 
        });
      } else {
        throw new Error(`Unsupported file format: ${fileExtension}`);
      }
    } catch (error) {
      console.error('Error reading file:', error);
      throw new Error(`Failed to read data file: ${error.message}`);
    }

    if (rawData.length === 0) {
      throw new Error('No data found in file');
    }

    // Analyze data structure
    const fields = this.analyzeFields(rawData);
    
    // Generate mapping suggestions
    const mappingSuggestions = this.generateMappingSuggestions(fields);
    
    // Calculate data quality score
    const qualityScore = this.calculateDataQuality(rawData, fields);
    
    // Identify enrichment opportunities
    const enrichmentOpportunities = this.identifyEnrichmentOpportunities(fields, rawData);
    
    // Create preview with first 10 rows
    const preview = rawData.slice(0, 10);

    return {
      fields,
      mappingSuggestions,
      qualityScore,
      rowCount: rawData.length,
      preview,
      enrichmentOpportunities
    };
  }

  /**
   * Analyze field characteristics and data types
   */
  private analyzeFields(data: any[]): DataField[] {
    const fieldNames = Object.keys(data[0] || {});
    
    return fieldNames.map(fieldName => {
      const values = data.map(row => row[fieldName]).filter(val => val !== null && val !== undefined && val !== '');
      const allValues = data.map(row => row[fieldName]);
      
      return {
        name: fieldName,
        type: this.inferDataType(values),
        sampleValues: this.getSampleValues(values),
        nullCount: allValues.length - values.length,
        uniqueCount: new Set(values).size
      };
    });
  }

  /**
   * Infer data type from sample values
   */
  private inferDataType(values: any[]): 'string' | 'number' | 'date' | 'boolean' {
    if (values.length === 0) return 'string';
    
    const sampleSize = Math.min(100, values.length);
    const sample = values.slice(0, sampleSize);
    
    // Check for numbers
    const numericCount = sample.filter(val => {
      const num = parseFloat(String(val).replace(/[$,]/g, ''));
      return !isNaN(num) && isFinite(num);
    }).length;
    
    if (numericCount / sampleSize > 0.8) return 'number';
    
    // Check for dates
    const dateCount = sample.filter(val => {
      const date = new Date(String(val));
      return !isNaN(date.getTime()) && String(val).match(/\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4}/);
    }).length;
    
    if (dateCount / sampleSize > 0.8) return 'date';
    
    // Check for booleans
    const booleanCount = sample.filter(val => {
      const str = String(val).toLowerCase();
      return ['true', 'false', 'yes', 'no', '1', '0', 'y', 'n'].includes(str);
    }).length;
    
    if (booleanCount / sampleSize > 0.8) return 'boolean';
    
    return 'string';
  }

  /**
   * Get representative sample values
   */
  private getSampleValues(values: any[]): string[] {
    const unique = Array.from(new Set(values.map(v => String(v))));
    return unique.slice(0, 5);
  }

  /**
   * Generate AI-powered field mapping suggestions
   */
  private generateMappingSuggestions(fields: DataField[]): DataMappingSuggestion[] {
    const suggestions: DataMappingSuggestion[] = [];

    for (const field of fields) {
      const fieldName = field.name.toLowerCase().replace(/[_\s]/g, '');
      
      // Find best matching target field
      let bestMatch: { target: string; confidence: number; reasoning: string } | null = null;
      
      for (const [targetField, synonyms] of Object.entries(this.fieldMappings)) {
        for (const synonym of synonyms) {
          const synonymNormalized = synonym.toLowerCase().replace(/[_\s]/g, '');
          
          let confidence = 0;
          let reasoning = '';
          
          // Exact match
          if (fieldName === synonymNormalized) {
            confidence = 98;
            reasoning = 'Exact field name match';
          }
          // Contains match
          else if (fieldName.includes(synonymNormalized) || synonymNormalized.includes(fieldName)) {
            confidence = 85;
            reasoning = 'Field name contains expected pattern';
          }
          // Partial match
          else if (this.calculateSimilarity(fieldName, synonymNormalized) > 0.7) {
            confidence = 70;
            reasoning = 'High similarity to expected field name';
          }
          
          // Boost confidence based on data type and sample values
          if (confidence > 0) {
            confidence += this.analyzeFieldContent(field, targetField);
            
            if (!bestMatch || confidence > bestMatch.confidence) {
              bestMatch = { target: targetField, confidence: Math.min(99, confidence), reasoning };
            }
          }
        }
      }
      
      // Auto-classify peril types
      if (!bestMatch && field.name.toLowerCase().includes('peril') || 
          field.name.toLowerCase().includes('risk') ||
          field.name.toLowerCase().includes('hazard')) {
        
        const perilConfidence = this.analyzePerilClassification(field);
        if (perilConfidence > 60) {
          bestMatch = {
            target: 'peril_type',
            confidence: perilConfidence,
            reasoning: 'Field contains peril/risk indicators'
          };
        }
      }

      if (bestMatch && bestMatch.confidence >= 60) {
        suggestions.push({
          sourceField: field.name,
          targetField: bestMatch.target,
          confidence: bestMatch.confidence,
          reasoning: bestMatch.reasoning,
          dataType: field.type
        });
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    const maxLength = Math.max(str1.length, str2.length);
    return 1 - matrix[str2.length][str1.length] / maxLength;
  }

  /**
   * Analyze field content to boost mapping confidence
   */
  private analyzeFieldContent(field: DataField, targetField: string): number {
    let boost = 0;
    
    switch (targetField) {
      case 'total_insured_value':
        if (field.type === 'number') boost += 15;
        if (field.sampleValues.some(val => val.includes('$') || /^\d+\.?\d*$/.test(val))) boost += 10;
        break;
        
      case 'latitude':
        if (field.type === 'number') boost += 15;
        if (field.sampleValues.some(val => {
          const num = parseFloat(val);
          return num >= -90 && num <= 90;
        })) boost += 20;
        break;
        
      case 'longitude':
        if (field.type === 'number') boost += 15;
        if (field.sampleValues.some(val => {
          const num = parseFloat(val);
          return num >= -180 && num <= 180;
        })) boost += 20;
        break;
        
      case 'year_built':
        if (field.type === 'number') boost += 15;
        if (field.sampleValues.some(val => {
          const num = parseInt(val);
          return num >= 1800 && num <= new Date().getFullYear();
        })) boost += 15;
        break;
    }
    
    return boost;
  }

  /**
   * Analyze peril classification from field values
   */
  private analyzePerilClassification(field: DataField): number {
    let matches = 0;
    const totalSamples = field.sampleValues.length;
    
    for (const value of field.sampleValues) {
      const valueLower = value.toLowerCase();
      
      for (const [peril, patterns] of Object.entries(this.perilPatterns)) {
        if (patterns.some(pattern => valueLower.includes(pattern))) {
          matches++;
          break;
        }
      }
    }
    
    return totalSamples > 0 ? Math.round((matches / totalSamples) * 100) : 0;
  }

  /**
   * Calculate comprehensive data quality score
   */
  private calculateDataQuality(data: any[], fields: DataField[]): DataQualityScore {
    const issues: DataQualityIssue[] = [];
    
    // Completeness analysis
    let totalCells = 0;
    let missingCells = 0;
    
    for (const field of fields) {
      totalCells += data.length;
      missingCells += field.nullCount;
      
      if (field.nullCount > data.length * 0.1) {
        issues.push({
          type: 'missing_data',
          field: field.name,
          description: `${field.nullCount} missing values (${Math.round(field.nullCount/data.length*100)}%)`,
          severity: field.nullCount > data.length * 0.3 ? 'high' : 'medium',
          affectedRows: field.nullCount,
          suggestedFix: 'Consider data imputation or request complete dataset'
        });
      }
    }
    
    const completeness = Math.max(0, (1 - missingCells / totalCells) * 100);
    
    // Consistency analysis
    let consistencyIssues = 0;
    
    // Check for duplicate records
    const duplicateCount = data.length - new Set(data.map(row => JSON.stringify(row))).size;
    if (duplicateCount > 0) {
      issues.push({
        type: 'duplicate',
        field: 'entire_record',
        description: `${duplicateCount} duplicate records found`,
        severity: duplicateCount > data.length * 0.05 ? 'high' : 'medium',
        affectedRows: duplicateCount,
        suggestedFix: 'Remove duplicate records or verify data source'
      });
      consistencyIssues += duplicateCount;
    }
    
    const consistency = Math.max(0, (1 - consistencyIssues / data.length) * 100);
    
    // Accuracy analysis (basic outlier detection)
    let accuracyScore = 100;
    
    for (const field of fields) {
      if (field.type === 'number' && field.sampleValues.length > 0) {
        const numericValues = field.sampleValues.map(v => parseFloat(v)).filter(v => !isNaN(v));
        if (numericValues.length > 0) {
          const mean = numericValues.reduce((a, b) => a + b) / numericValues.length;
          const std = Math.sqrt(numericValues.reduce((sq, n) => sq + (n - mean) ** 2, 0) / numericValues.length);
          
          const outliers = numericValues.filter(v => Math.abs(v - mean) > 3 * std);
          if (outliers.length > 0) {
            issues.push({
              type: 'outlier',
              field: field.name,
              description: `${outliers.length} potential outliers detected`,
              severity: 'low',
              affectedRows: outliers.length,
              suggestedFix: 'Review outlier values for data entry errors'
            });
            accuracyScore -= Math.min(20, outliers.length);
          }
        }
      }
    }
    
    // Validity analysis
    let validityScore = 100;
    
    // Check for valid coordinate ranges
    const latField = fields.find(f => f.name.toLowerCase().includes('lat'));
    const lonField = fields.find(f => f.name.toLowerCase().includes('lon'));
    
    if (latField && latField.type === 'number') {
      const invalidLats = latField.sampleValues.filter(v => {
        const num = parseFloat(v);
        return isNaN(num) || num < -90 || num > 90;
      }).length;
      
      if (invalidLats > 0) {
        issues.push({
          type: 'invalid_format',
          field: latField.name,
          description: `${invalidLats} invalid latitude values (must be -90 to 90)`,
          severity: 'medium',
          affectedRows: invalidLats,
          suggestedFix: 'Verify coordinate format and accuracy'
        });
        validityScore -= invalidLats * 5;
      }
    }
    
    const overall = Math.round((completeness + consistency + accuracyScore + validityScore) / 4);
    
    return {
      overall: Math.max(0, Math.min(100, overall)),
      completeness: Math.round(completeness),
      consistency: Math.round(consistency),
      accuracy: Math.max(0, Math.min(100, accuracyScore)),
      validity: Math.max(0, Math.min(100, validityScore)),
      issues: issues.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
    };
  }

  /**
   * Identify data enrichment opportunities
   */
  private identifyEnrichmentOpportunities(fields: DataField[], data: any[]): EnrichmentOpportunity[] {
    const opportunities: EnrichmentOpportunity[] = [];
    
    // Address geocoding opportunity
    const addressField = fields.find(f => 
      f.name.toLowerCase().includes('address') || 
      f.name.toLowerCase().includes('location')
    );
    
    if (addressField && !fields.some(f => f.name.toLowerCase().includes('lat'))) {
      opportunities.push({
        field: addressField.name,
        enrichmentType: 'geocoding',
        description: 'Convert addresses to latitude/longitude coordinates for spatial analysis',
        confidence: 95,
        apiRequired: 'Mapbox Geocoding API'
      });
    }
    
    // Peril classification opportunity
    const perilField = fields.find(f => 
      f.name.toLowerCase().includes('peril') ||
      f.name.toLowerCase().includes('risk') ||
      f.name.toLowerCase().includes('line')
    );
    
    if (perilField) {
      const classificationConfidence = this.analyzePerilClassification(perilField);
      if (classificationConfidence < 80) {
        opportunities.push({
          field: perilField.name,
          enrichmentType: 'peril_classification',
          description: 'Standardize peril types using industry classifications',
          confidence: 80
        });
      }
    }
    
    // Property details enrichment
    if (addressField) {
      opportunities.push({
        field: addressField.name,
        enrichmentType: 'property_details',
        description: 'Enrich with building characteristics, construction type, and occupancy details',
        confidence: 85,
        apiRequired: 'Zesty.ai Property Intelligence API'
      });
    }
    
    return opportunities.sort((a, b) => b.confidence - a.confidence);
  }
}

export const dataProcessingEngine = new DataProcessingEngine();