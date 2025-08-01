# Enhanced CSV Processing Workflow Demo

## Overview
The Risk Intelligence Platform now includes a sophisticated CSV processing pipeline that automatically maps insurance data fields and creates risk exposures with intelligent confidence scoring.

## Step-by-Step Workflow

### 1. CSV Upload with Enhanced Processing
**Endpoint:** `POST /api/data-sources/upload-csv`

When you upload a CSV file, the system:
- Parses the CSV and stores raw data in the database
- Analyzes field names using fuzzy string matching
- Generates intelligent mapping suggestions with confidence scores
- Auto-approves high-confidence mappings (≥80%)
- Creates preview data for review

**Example CSV Structure:**
```csv
policy_number,total_insured_value,latitude,longitude,address,peril_type,risk_score
POL-FL-2024-001,2500000.00,25.7617,-80.1918,"123 Miami Beach Dr, Miami Beach, FL 33139",wind,8.5
```

### 2. Intelligent Field Mapping
The system automatically recognizes common insurance field patterns:

**High Confidence Mappings (Auto-approved):**
- `policy_number` → `policyNumber` (100% confidence)
- `total_insured_value` → `totalInsuredValue` (95% confidence)  
- `latitude` → `latitude` (100% confidence)
- `longitude` → `longitude` (100% confidence)
- `address` → `address` (100% confidence)

**Medium Confidence Mappings (Manual review):**
- `peril_type` → `perilType` (90% confidence)
- `risk_score` → `riskScore` (95% confidence)

### 3. Field Mapping Review
**Endpoint:** `GET /api/data-sources/:id/mapping-suggestions`

Users can review all mapping suggestions:
```json
{
  "success": true,
  "dataSourceId": "ds-123",
  "mappings": [
    {
      "id": "map-1",
      "sourceField": "policy_number",
      "targetField": "policyNumber", 
      "confidence": 100,
      "isApproved": true,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### 4. Apply Mappings and Create Exposures
**Endpoint:** `POST /api/data-sources/:id/apply-mappings`

Once mappings are confirmed, the system:
- Converts raw CSV data to risk exposure records
- Validates data quality and completeness
- Creates database entries for each policy
- Reports success/error statistics

**Request Body:**
```json
{
  "mappings": {
    "policy_number": "policyNumber",
    "total_insured_value": "totalInsuredValue",
    "latitude": "latitude",
    "longitude": "longitude",
    "address": "address",
    "peril_type": "perilType",
    "risk_score": "riskScore"
  }
}
```

### 5. Weather Data Integration
**Endpoint:** `POST /api/weather/batch-update`

For each created risk exposure:
- Fetches real-time weather data from Tomorrow.io API
- Stores temperature, wind speed, humidity, precipitation
- Links weather observations to specific exposures
- Provides weather-enhanced risk analysis

### 6. Export and Analysis
**Endpoint:** `GET /api/export/exposures?format=csv`

Export processed data in multiple formats:
- **CSV Export:** Standard format for Excel/analytics tools
- **JSON Export:** Structured data with metadata
- **GeoJSON:** Geospatial format for mapping applications

## Data Quality Features

### Intelligent Field Recognition
The system recognizes over 20 common insurance field patterns:
- Policy identifiers: `policy_no`, `account_number`, `ref_no`
- Financial values: `tiv`, `sum_insured`, `coverage_amount`
- Location data: `lat`, `lng`, `property_address`
- Risk classifications: `peril`, `hazard`, `line_of_business`

### Data Quality Warnings
- Missing location fields detection
- Data completeness analysis (flags fields with >20% missing values)
- Value format validation
- Coordinate range checking

### Confidence Scoring Algorithm
Uses advanced string similarity matching:
- **Exact match:** 100% confidence
- **Contains match:** 80% confidence  
- **Fuzzy matching:** Levenshtein distance calculation
- **Pattern recognition:** Industry-standard field naming

## Testing the Workflow

### Sample Data Included
- `sample-data/sample_exposures.csv`: 20 realistic risk exposures
- Geographic distribution: FL, CA, TX, NY, LA, GA, SC, NC, AL, MS
- Peril types: wind, earthquake, flood, terrorism, wildfire, hail, tornado
- Value range: $580K - $3.2M total insured values

### API Testing Collection
- `tests/api-endpoints.postman_collection.json`: Complete test suite
- Covers all new endpoints and workflows
- Includes authentication and error handling tests

### Automated Tests
- `tests/csv-processing.test.js`: Jest test suite
- Validates CSV structure and field mapping logic
- Tests data quality algorithms and export functions

## Technical Architecture

### Raw Data Storage
- All uploaded CSV data stored in `raw_data` table
- Preserves original format for reprocessing
- Enables audit trails and data lineage

### Field Mapping Engine
- Configurable field patterns and synonyms
- Machine learning-ready confidence scoring
- Support for custom mapping rules

### Weather Intelligence
- Tomorrow.io API integration for real-time data
- Persistent weather observation storage
- Historical weather data tracking

This enhanced workflow transforms the platform from basic data management to an intelligent risk processing system that rivals enterprise-grade insurance platforms.