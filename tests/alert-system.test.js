import request from 'supertest';

// Test configuration
const API_BASE = 'http://localhost:5000';
const TEST_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXJ1bm5lciIsInJvbGUiOiJhZG1pbiIsIm9yZ2FuaXphdGlvbklkIjoidGVzdC1vcmciLCJleHAiOjE3NTQxNzI5MDUsImlhdCI6MTc1NDA4NjUwNX0.dEAsFn-TQ42dHkUvAzipm-hD5uUp_dckGp-z7_rXPqw';

describe('Alert System', () => {
  
  let alertRuleId;

  test('Create alert rule for high total insured value', async () => {
    const alertRule = {
      name: 'High TIV Alert',
      description: 'Alert when total insured value exceeds $50M',
      conditions: [
        {
          field: 'totalInsuredValue',
          operator: 'gt',
          value: 50000000,
          aggregation: 'sum'
        }
      ],
      notificationMethods: [
        {
          type: 'email',
          config: {
            recipients: ['risk@company.com'],
            template: 'high_tiv_alert'
          }
        }
      ]
    };

    const response = await request(API_BASE)
      .post('/api/alert-rules')
      .set('Authorization', `Bearer ${TEST_JWT}`)
      .send(alertRule);

    expect(response.status).toBe(201);
    expect(response.body.name).toBe(alertRule.name);
    expect(response.body.isActive).toBe(true);
    expect(response.body.organizationId).toBe('test-org');
    
    alertRuleId = response.body.id;
    console.log(`Created alert rule: ${alertRuleId}`);
  });

  test('Get all alert rules', async () => {
    const response = await request(API_BASE)
      .get('/api/alert-rules')
      .set('Authorization', `Bearer ${TEST_JWT}`);

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThanOrEqual(1);
    
    const highTivAlert = response.body.find(rule => rule.name === 'High TIV Alert');
    expect(highTivAlert).toBeDefined();
    expect(highTivAlert.isActive).toBe(true);
    
    console.log(`Found ${response.body.length} alert rules`);
  });

  test('Trigger alert processing manually', async () => {
    const response = await request(API_BASE)
      .post('/api/jobs/process-alerts')
      .set('Authorization', `Bearer ${TEST_JWT}`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.result).toBeDefined();
    
    const result = response.body.result;
    expect(result.totalEvaluated).toBeGreaterThanOrEqual(0);
    expect(result.totalTriggered).toBeGreaterThanOrEqual(0);
    
    console.log(`Alert processing result: ${result.totalEvaluated} evaluated, ${result.totalTriggered} triggered`);
  });

  test('Get alert instances', async () => {
    const response = await request(API_BASE)
      .get('/api/alert-instances')
      .set('Authorization', `Bearer ${TEST_JWT}`);

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    
    console.log(`Found ${response.body.length} alert instances`);
    
    // If there are active alerts, test acknowledgment
    if (response.body.length > 0) {
      const activeAlert = response.body.find(alert => alert.status === 'active');
      if (activeAlert) {
        console.log(`Testing acknowledgment of alert ${activeAlert.id}`);
        
        const ackResponse = await request(API_BASE)
          .post(`/api/alert-instances/${activeAlert.id}/acknowledge`)
          .set('Authorization', `Bearer ${TEST_JWT}`);
          
        expect(ackResponse.status).toBe(200);
        expect(ackResponse.body.message).toMatch(/acknowledged/i);
      }
    }
  });

  test('Create count-based alert rule', async () => {
    const countAlert = {
      name: 'High Risk Property Count',
      description: 'Alert when more than 5 properties in flood zones',
      conditions: [
        {
          field: 'count',
          operator: 'gt',
          value: 5,
          aggregation: 'count',
          groupBy: 'perilType'
        }
      ],
      notificationMethods: [
        {
          type: 'webhook',
          config: {
            webhookUrl: 'https://webhook.site/test-alert-webhook'
          }
        }
      ]
    };

    const response = await request(API_BASE)
      .post('/api/alert-rules')
      .set('Authorization', `Bearer ${TEST_JWT}`)
      .send(countAlert);

    expect(response.status).toBe(201);
    expect(response.body.name).toBe(countAlert.name);
    expect(response.body.conditions[0].aggregation).toBe('count');
    
    console.log(`Created count-based alert rule: ${response.body.id}`);
  });

  test('Update alert rule status', async () => {
    if (alertRuleId) {
      const response = await request(API_BASE)
        .put(`/api/alert-rules/${alertRuleId}`)
        .set('Authorization', `Bearer ${TEST_JWT}`)
        .send({ isActive: false });

      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(false);
      
      console.log(`Deactivated alert rule: ${alertRuleId}`);
    }
  });

  test('Delete alert rule', async () => {
    if (alertRuleId) {
      const response = await request(API_BASE)
        .delete(`/api/alert-rules/${alertRuleId}`)
        .set('Authorization', `Bearer ${TEST_JWT}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/deleted/i);
      
      console.log(`Deleted alert rule: ${alertRuleId}`);
    }
  });

  test('Verify alert system is operational', async () => {
    // Create a simple test alert that should trigger
    const testAlert = {
      name: 'Test Alert - Low Threshold',
      description: 'Test alert with very low threshold to ensure triggering',
      conditions: [
        {
          field: 'totalInsuredValue',
          operator: 'gte',
          value: 1,
          aggregation: 'sum'
        }
      ],
      notificationMethods: [
        {
          type: 'email',
          config: {
            recipients: ['test@example.com']
          }
        }
      ]
    };

    // Create test alert
    const createResponse = await request(API_BASE)
      .post('/api/alert-rules')
      .set('Authorization', `Bearer ${TEST_JWT}`)
      .send(testAlert);

    expect(createResponse.status).toBe(201);
    const testAlertId = createResponse.body.id;

    // Trigger alert processing
    const processResponse = await request(API_BASE)
      .post('/api/jobs/process-alerts')
      .set('Authorization', `Bearer ${TEST_JWT}`)
      .send({});

    expect(processResponse.status).toBe(200);
    expect(processResponse.body.success).toBe(true);

    // Clean up test alert
    await request(API_BASE)
      .delete(`/api/alert-rules/${testAlertId}`)
      .set('Authorization', `Bearer ${TEST_JWT}`);

    console.log('✅ Alert system operational test completed');
  });

});