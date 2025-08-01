const request = require('supertest');

// Test configuration
const API_BASE = 'http://localhost:5000';
const TEST_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXJ1bm5lciIsInJvbGUiOiJhZG1pbiIsIm9yZ2FuaXphdGlvbklkIjoidGVzdC1vcmciLCJleHAiOjE3NTQxNzI5MDUsImlhdCI6MTc1NDA4NjUwNX0.dEAsFn-TQ42dHkUvAzipm-hD5uUp_dckGp-z7_rXPqw';

describe('CSV Processing Pipeline', () => {
  
  test('Complete end-to-end CSV processing workflow', async () => {
    // Step 1: Trigger raw row processing
    const processResponse = await request(API_BASE)
      .post('/api/jobs/process-raw')
      .set('Authorization', `Bearer ${TEST_JWT}`)
      .send({});

    expect(processResponse.status).toBe(200);
    expect(processResponse.body.success).toBe(true);
    expect(processResponse.body.job.totalRows).toBeGreaterThan(0);
    
    console.log(`Processing job completed: ${processResponse.body.job.processedRows} rows processed`);
    
    // Step 2: Verify risk exposures were created
    const exposuresResponse = await request(API_BASE)
      .get('/api/risk-exposures')
      .set('Authorization', `Bearer ${TEST_JWT}`);

    expect(exposuresResponse.status).toBe(200);
    expect(exposuresResponse.body).toBeInstanceOf(Array);
    expect(exposuresResponse.body.length).toBeGreaterThanOrEqual(20);
    
    console.log(`Risk exposures created: ${exposuresResponse.body.length}`);
    
    // Step 3: Verify policy numbers are correct
    const policies = exposuresResponse.body.map(exp => exp.policyNumber);
    expect(policies).toContain('POL-FL-2024-001');
    expect(policies).toContain('POL-CA-2024-002');
    expect(policies).toContain('POL-TX-2024-003');
    
    // Step 4: Verify export functionality works
    const exportResponse = await request(API_BASE)
      .get('/api/export/exposures?format=csv')
      .set('Authorization', `Bearer ${TEST_JWT}`);

    expect(exportResponse.status).toBe(200);
    expect(exportResponse.text).toMatch(/Policy Number,Total Insured Value/);
    expect(exportResponse.text).toMatch(/POL-FL-2024-001/);
    
    const csvLines = exportResponse.text.split('\\n').filter(line => line.trim());
    expect(csvLines.length).toBeGreaterThanOrEqual(21); // Header + 20 data rows
    
    console.log(`CSV export contains ${csvLines.length - 1} data rows`);
    
    // Step 5: Verify weather integration (if first exposure has weather data)
    if (exposuresResponse.body.length > 0) {
      const firstExposure = exposuresResponse.body[0];
      const weatherResponse = await request(API_BASE)
        .get(`/api/weather/${firstExposure.id}`)
        .set('Authorization', `Bearer ${TEST_JWT}`);
      
      // Weather might not be available due to API key, but endpoint should respond
      expect([200, 404, 503]).toContain(weatherResponse.status);
      
      if (weatherResponse.status === 200) {
        console.log(`Weather data available for exposure ${firstExposure.id}`);
      }
    }
    
    console.log('✅ Complete CSV processing pipeline verified successfully');
  });

  test('Health check endpoint works', async () => {
    const response = await request(API_BASE)
      .get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.server).toBe('Risk Intelligence Platform API');
  });

  test('Authentication required for protected endpoints', async () => {
    const response = await request(API_BASE)
      .get('/api/risk-exposures');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Unauthorized');
  });

});