import { storage } from "./storage";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { InsertRiskExposure } from "@shared/schema";

export interface CSVProcessResult {
  dataSourceId: string;
  rowCount: number;
  preview: any[];
  fieldMappingSuggestions: FieldMappingSuggestion[];
  warnings: string[];
}

export interface FieldMappingSuggestion {
  sourceField: string;
  targetField: string;
  confidence: number;
  reasoning: string;
}

/**
 * Enhanced CSV processor with raw data storage and smart field mapping
 */
export class CSVProcessor {
  // Standard insurance risk exposure field patterns
  private readonly fieldMappings = {
    // Policy identification
    policyNumber: [
      'policy_number', 'policy_no', 'policynumber', 'policy', 'account_number', 
      'account_no', 'accountnumber', 'ref_no', 'reference_number'
    ],
    
    // Financial values
    totalInsuredValue: [
      'total_insured_value', 'tiv', 'sum_insured', 'coverage_amount', 
      'insured_value', 'property_value', 'building_value', 'sum_assured',
      'coverage_limit', 'policy_limit'
    ],
    
    // Location data
    latitude: [
      'latitude', 'lat', 'y_coord', 'y_coordinate', 'geo_lat'
    ],
    longitude: [
      'longitude', 'lng', 'lon', 'x_coord', 'x_coordinate', 'geo_lon', 'geo_lng'
    ],
    address: [
      'address', 'property_address', 'location', 'street_address', 
      'full_address', 'premises_address', 'site_address'
    ],
    
    // Risk classification
    perilType: [
      'peril_type', 'peril', 'coverage_type', 'risk_type', 'hazard', 
      'exposure_type', 'line_of_business', 'product_line'
    ],
    riskScore: [
      'risk_score', 'riskscore', 'risk_rating', 'hazard_score', 
      'exposure_score', 'vulnerability_score'
    ]
  };

  /**
   * Process CSV file: parse, store raw data, generate mapping suggestions
   */
  async processCSVFile(filePath: string, dataSourceId: string): Promise<CSVProcessResult> {
    console.log(`Processing CSV file: ${filePath} for data source: ${dataSourceId}`);
    
    // Parse CSV file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const rawRows = parse(fileContent, { 
      columns: true, 
      skip_empty_lines: true,
      trim: true 
    });

    if (rawRows.length === 0) {
      throw new Error('CSV file contains no data rows');
    }

    // Store raw data in database
    await storage.createRawDataBatch(dataSourceId, rawRows);

    // Generate field mapping suggestions
    const sourceFields = Object.keys(rawRows[0] as Record<string, any>);
    const fieldMappingSuggestions = this.generateFieldMappingSuggestions(sourceFields);
    
    // Create preview with first 10 rows
    const preview = rawRows.slice(0, 10);
    
    // Generate warnings
    const warnings = this.generateWarnings(rawRows, sourceFields);

    return {
      dataSourceId,
      rowCount: rawRows.length,
      preview,
      fieldMappingSuggestions,
      warnings
    };
  }

  /**
   * Apply field mappings and convert raw data to risk exposures
   */
  async applyMappingsAndCreateExposures(
    dataSourceId: string, 
    organizationId: string,
    mappings: Record<string, string>
  ): Promise<{ created: number; errors: string[] }> {
    // Get raw data from database
    const rawData = await storage.getRawData(dataSourceId);
    
    const created: string[] = [];
    const errors: string[] = [];

    for (const rawRow of rawData) {
      try {
        const mappedData = this.applyMappings(rawRow.rawFields, mappings);
        
        // Create risk exposure record
        const exposure: InsertRiskExposure = {
          organizationId,
          dataSourceId,
          policyNumber: mappedData.policyNumber || `POLICY_${rawRow.rowIndex}`,
          totalInsuredValue: mappedData.totalInsuredValue || "0",
          latitude: mappedData.latitude || "0",
          longitude: mappedData.longitude || "0",
          address: mappedData.address || "",
          perilType: mappedData.perilType || "unknown",
          riskScore: mappedData.riskScore || "0"
        };

        await storage.createRiskExposure(exposure);
        created.push(exposure.policyNumber!);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Row ${rawRow.rowIndex}: ${errorMessage}`);
      }
    }

    return { created: created.length, errors };
  }

  /**
   * Generate intelligent field mapping suggestions using string similarity
   */
  private generateFieldMappingSuggestions(sourceFields: string[]): FieldMappingSuggestion[] {
    const suggestions: FieldMappingSuggestion[] = [];

    for (const [targetField, patterns] of Object.entries(this.fieldMappings)) {
      let bestMatch = { field: '', confidence: 0 };

      for (const sourceField of sourceFields) {
        const confidence = this.calculateFieldSimilarity(sourceField.toLowerCase(), patterns);
        if (confidence > bestMatch.confidence && confidence > 0.3) {
          bestMatch = { field: sourceField, confidence };
        }
      }

      if (bestMatch.field) {
        suggestions.push({
          sourceField: bestMatch.field,
          targetField,
          confidence: Math.round(bestMatch.confidence * 100),
          reasoning: `Field name "${bestMatch.field}" matches ${targetField} pattern with ${Math.round(bestMatch.confidence * 100)}% confidence`
        });
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate similarity between source field and target patterns
   */
  private calculateFieldSimilarity(sourceField: string, patterns: string[]): number {
    let maxSimilarity = 0;

    for (const pattern of patterns) {
      // Exact match
      if (sourceField === pattern) {
        return 1.0;
      }
      
      // Contains match
      if (sourceField.includes(pattern) || pattern.includes(sourceField)) {
        maxSimilarity = Math.max(maxSimilarity, 0.8);
      }
      
      // Fuzzy string similarity (basic Levenshtein-style)
      const similarity = this.fuzzyMatch(sourceField, pattern);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    return maxSimilarity;
  }

  /**
   * Basic fuzzy string matching
   */
  private fuzzyMatch(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Apply field mappings to raw data row
   */
  private applyMappings(rawRow: any, mappings: Record<string, string>): Record<string, string> {
    const mapped: Record<string, string> = {};
    
    for (const [sourceField, targetField] of Object.entries(mappings)) {
      if (rawRow[sourceField] !== undefined && rawRow[sourceField] !== null) {
        mapped[targetField] = String(rawRow[sourceField]).trim();
      }
    }
    
    return mapped;
  }

  /**
   * Generate data quality warnings
   */
  private generateWarnings(rows: any[], fields: string[]): string[] {
    const warnings: string[] = [];
    
    // Check for missing critical fields
    const criticalFields = ['policyNumber', 'totalInsuredValue'];
    const hasLocation = fields.some(f => 
      f.toLowerCase().includes('lat') || 
      f.toLowerCase().includes('address') ||
      f.toLowerCase().includes('location')
    );
    
    if (!hasLocation) {
      warnings.push('No location fields detected - geocoding may be required');
    }
    
    // Check data completeness
    const sampleSize = Math.min(100, rows.length);
    for (const field of fields) {
      const nonEmptyCount = rows.slice(0, sampleSize)
        .filter(row => row[field] && row[field].toString().trim()).length;
      const completeness = nonEmptyCount / sampleSize;
      
      if (completeness < 0.8) {
        warnings.push(`Field "${field}" has ${Math.round((1 - completeness) * 100)}% missing values`);
      }
    }
    
    return warnings;
  }
}

export const csvProcessor = new CSVProcessor();