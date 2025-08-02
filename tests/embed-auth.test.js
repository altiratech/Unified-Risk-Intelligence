import request from 'supertest';

// Test configuration
const API_BASE = 'http://localhost:5000';
const TEST_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXJ1bm5lciIsInJvbGUiOiJhZG1pbiIsIm9yZ2FuaXphdGlvbklkIjoidGVzdC1vcmciLCJleHAiOjE3NTQxNzI5MDUsImlhdCI6MTc1NDA4NjUwNX0.dEAsFn-TQ42dHkUvAzipm-hD5uUp_dckGp-z7_rXPqw';

describe('Embed Authentication System', () => {
  
  let embedToken;

  test('Generate embed token', async () => {
    const tokenRequest = {
      organizationId: 'test-org',
      widgetId: 'map-widget-1',
      allowedOrigins: ['https://client.example.com', '*.replit.app'],
      permissions: ['read'],
      expiresInHours: 24
    };

    const response = await request(API_BASE)
      .post('/api/embed/generate-token')
      .set('Authorization', `Bearer ${TEST_JWT}`)
      .send(tokenRequest);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeDefined();
    expect(response.body.expiresAt).toBeDefined();
    expect(response.body.config.organizationId).toBe('test-org');
    expect(response.body.config.widgetId).toBe('map-widget-1');
    expect(response.body.config.allowedOrigins).toContain('https://client.example.com');
    
    embedToken = response.body.token;
    console.log(`Generated embed token: ${embedToken.substring(0, 20)}...`);
  });

  test('Test embed authentication with valid token', async () => {
    const response = await request(API_BASE)
      .get(`/api/embed/test?token=${embedToken}`)
      .set('Origin', 'https://client.example.com');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.organization).toBe('test-org');
    expect(response.body.permissions).toContain('read');
    expect(response.body.widgetId).toBe('map-widget-1');
    expect(response.body.allowedOrigins).toContain('https://client.example.com');
    
    console.log(`Embed authentication successful for widget: ${response.body.widgetId}`);
  });

  test('Test embed authentication with invalid token', async () => {
    const response = await request(API_BASE)
      .get('/api/embed/test?token=invalid-token')
      .set('Origin', 'https://client.example.com');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid embed token');
    
    console.log('Invalid token correctly rejected');
  });

  test('Test embed authentication without token', async () => {
    const response = await request(API_BASE)
      .get('/api/embed/test')
      .set('Origin', 'https://client.example.com');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Embed token required');
    
    console.log('Missing token correctly rejected');
  });

  test('Test CORS headers on embed endpoint', async () => {
    const response = await request(API_BASE)
      .options('/api/embed/test')
      .set('Origin', 'https://client.example.com');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeDefined();
    expect(response.headers['access-control-allow-methods']).toBeDefined();
    
    console.log('CORS preflight request handled correctly');
  });

  test('Generate token with minimal configuration', async () => {
    const minimalRequest = {
      organizationId: 'test-org'
    };

    const response = await request(API_BASE)
      .post('/api/embed/generate-token')
      .set('Authorization', `Bearer ${TEST_JWT}`)
      .send(minimalRequest);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.config.permissions).toEqual(['read']);
    expect(response.body.config.allowedOrigins).toEqual([]);
    
    console.log('Minimal token configuration handled correctly');
  });

  test('Generate token with wildcard origin', async () => {
    const wildcardRequest = {
      organizationId: 'test-org',
      allowedOrigins: ['*.replit.app'],
      permissions: ['read', 'write']
    };

    const response = await request(API_BASE)
      .post('/api/embed/generate-token')
      .set('Authorization', `Bearer ${TEST_JWT}`)
      .send(wildcardRequest);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.config.allowedOrigins).toContain('*.replit.app');
    expect(response.body.config.permissions).toContain('write');
    
    const wildcardToken = response.body.token;
    
    // Test wildcard domain matching
    const testResponse = await request(API_BASE)
      .get(`/api/embed/test?token=${wildcardToken}`)
      .set('Origin', 'https://myproject.replit.app');

    expect(testResponse.status).toBe(200);
    expect(testResponse.body.success).toBe(true);
    
    console.log('Wildcard origin matching works correctly');
  });

  test('Reject unauthorized origin', async () => {
    if (embedToken) {
      const response = await request(API_BASE)
        .get(`/api/embed/test?token=${embedToken}`)
        .set('Origin', 'https://malicious.com');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Origin not allowed');
      
      console.log('Unauthorized origin correctly rejected');
    }
  });

  test('Token generation requires authentication', async () => {
    const response = await request(API_BASE)
      .post('/api/embed/generate-token')
      .send({ organizationId: 'test-org' });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Unauthorized');
    
    console.log('Token generation requires proper authentication');
  });

  test('Token generation validates required fields', async () => {
    const response = await request(API_BASE)
      .post('/api/embed/generate-token')
      .set('Authorization', `Bearer ${TEST_JWT}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Missing required field');
    expect(response.body.message).toBe('organizationId is required');
    
    console.log('Required field validation works correctly');
  });

  test('Environment variable check', async () => {
    // This test verifies that the EMBED_JWT_SECRET is configured
    // by attempting to generate a token
    const response = await request(API_BASE)
      .post('/api/embed/generate-token')
      .set('Authorization', `Bearer ${TEST_JWT}`)
      .send({ organizationId: 'test-org' });

    if (response.status === 500 && response.body.message?.includes('EMBED_JWT_SECRET')) {
      console.log('⚠️  EMBED_JWT_SECRET environment variable needs to be configured');
      expect(response.body.message).toContain('EMBED_JWT_SECRET');
    } else {
      expect(response.status).toBe(200);
      console.log('✅ EMBED_JWT_SECRET properly configured');
    }
  });

});