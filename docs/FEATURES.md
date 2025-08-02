# Risk Intelligence Platform Features

## Overview
This document outlines the key features implemented in the Risk Intelligence Platform, providing configuration examples and usage guidance for each capability.

## 1. Alert System (Threshold Monitoring)

### Purpose
Proactive risk monitoring through configurable threshold alerts with email and webhook notifications.

### Configuration
The alert system requires SMTP configuration for email notifications:

```env
# .env configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alerts@yourcompany.com
SMTP_PASS=your_app_password
WEBHOOK_SECRET=secure_random_string_32_chars
```

### API Endpoints
- `GET /api/alert-rules` - List all alert rules for organization
- `POST /api/alert-rules` - Create new alert rule
- `PUT /api/alert-rules/:id` - Update alert rule
- `DELETE /api/alert-rules/:id` - Delete alert rule
- `GET /api/alert-instances` - List triggered alerts
- `POST /api/alert-instances/:id/acknowledge` - Acknowledge alert
- `POST /api/alert-instances/:id/resolve` - Resolve alert
- `POST /api/jobs/process-alerts` - Manual alert processing

### Example Alert Rule
```json
{
  "name": "High Total Insured Value",
  "description": "Alert when total portfolio value exceeds $100M",
  "conditions": [
    {
      "field": "totalInsuredValue",
      "operator": "gt",
      "value": 100000000,
      "aggregation": "sum"
    }
  ],
  "notificationMethods": [
    {
      "type": "email",
      "config": {
        "recipients": ["risk@company.com", "ceo@company.com"],
        "template": "high_value_alert"
      }
    },
    {
      "type": "webhook",
      "config": {
        "webhookUrl": "https://api.company.com/webhooks/risk-alerts"
      }
    }
  ]
}
```

### Supported Conditions
- **Field Types**: `totalInsuredValue`, `riskScore`, `perilType`, etc.
- **Operators**: `gt`, `gte`, `lt`, `lte`, `eq`, `ne`
- **Aggregations**: `sum`, `count`, `avg`, `max`, `min`
- **Group By**: `perilType`, `state`, `riskLevel`, etc.

### Background Processing
Alert rules are evaluated automatically every 2 minutes during development. Processing includes:
- Risk exposure data aggregation
- Threshold comparison
- Notification delivery (email/webhook)
- Alert instance creation and tracking

## 2. Embed Authentication (Widget Foundation)

### Purpose
Secure embedding of risk intelligence widgets in customer applications using JWT authentication.

### Configuration
```env
# .env configuration
EMBED_JWT_SECRET=secure_random_jwt_secret_32_chars
CORS_ALLOWED_ORIGINS=https://client1.com,https://client2.com,*.replit.app
```

### Token Generation
```bash
# Generate embed token via API
curl -X POST https://your-app.replit.app/api/embed/generate-token \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "org-123",
    "widgetId": "risk-map-widget",
    "allowedOrigins": ["https://client.example.com", "*.replit.app"],
    "permissions": ["read"],
    "expiresInHours": 24
  }'
```

### Widget Integration Example
```html
<!-- Customer's website -->
<iframe 
  src="https://your-app.replit.app/embed/risk-map?token=eyJhbGciOiJIUzI1NiJ9..."
  width="800" 
  height="600"
  frameborder="0">
</iframe>
```

### Security Features
- JWT-based authentication
- Origin validation with wildcard support
- Permission-based access control
- Configurable token expiration
- CORS header management

### API Endpoints
- `POST /api/embed/generate-token` - Generate embed token (admin only)
- `GET /api/embed/test` - Test embed authentication

## 3. Data Processing Pipeline

### CSV Upload and Processing
- Automatic field detection and mapping
- AI-assisted column mapping suggestions
- Background processing with job tracking
- Raw data storage with audit trail

### Weather Data Integration
- Tomorrow.io API integration for real-time weather
- Geospatial weather layer visualization
- Weather-risk correlation analysis
- Predictive weather animation

### Risk Analytics Engine
- Portfolio risk metrics calculation
- Geospatial risk visualization
- Exposure concentration analysis
- Risk trend prediction

## 4. Background Job System

### Scheduled Jobs
- **Raw Data Processing**: Every 5 minutes
- **Alert Evaluation**: Every 2 minutes
- **Export Generation**: On-demand

### Job Management
- Job status tracking
- Error handling and logging
- Manual job triggering
- Progress monitoring

### API Endpoints
- `POST /api/jobs/process-raw` - Manual raw data processing
- `POST /api/jobs/process-alerts` - Manual alert processing
- `GET /api/jobs/:jobId` - Get job status

## 5. Export and Reporting

### Export Formats
- CSV format for data analysis
- JSON format for API integration
- GeoJSON for mapping applications

### Export Features
- Background export processing
- Large dataset handling
- Download link generation
- Export history tracking

## 6. Authentication and Security

### Replit OAuth Integration
- Single sign-on authentication
- Session-based user management
- Organization-based data isolation
- Role-based access control

### API Security
- JWT token authentication
- Request validation with Zod schemas
- SQL injection protection
- CORS configuration

## Testing and Development

### Test Suites
- Alert system functionality tests
- Embed authentication tests
- API endpoint validation
- Data processing pipeline tests

### Development Tools
- Hot reloading with Vite
- TypeScript type checking
- Database migrations with Drizzle
- Background job monitoring

## Future Enhancements

### Iteration 2 Planned Features
1. **Enhanced Alert System**
   - Machine learning-based anomaly detection
   - Multi-channel notification support
   - Alert escalation workflows

2. **Advanced Widget Embedding**
   - Real-time data updates (30-second polling)
   - Interactive map widgets
   - Custom dashboard components

3. **API Enhancements**
   - Rate limiting and quotas
   - API key management
   - Webhook delivery guarantees

## Support and Configuration

### Environment Variables
See `.env.example` for complete configuration options.

### Database Setup
The platform uses PostgreSQL with Drizzle ORM for type-safe database operations.

### API Documentation
Comprehensive API documentation is available via the Postman collection in `tests/api-endpoints.postman_collection.json`.