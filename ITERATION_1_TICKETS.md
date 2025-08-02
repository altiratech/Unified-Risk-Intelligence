# Iteration 1 - Tickets & Estimates (~40 hours)

## Backend Work (24 hours)

### B1: Alert Configuration API (6 hours)
- [ ] Create alert rules schema with last_evaluated_at column
- [ ] CRUD endpoints for alert management per organization  
- [ ] Alert evaluation engine with configurable triggers
- [ ] Alert rule validation and sanitization

### B2: Background Alert Processor (8 hours)
- [ ] Cron job to evaluate exposure data against alert rules
- [ ] Real-time trigger system for immediate threshold breaches
- [ ] Alert state management (active, acknowledged, resolved)
- [ ] Performance optimization for large portfolio scanning

### B3: Notification Service (6 hours)
- [ ] Email notification integration with SMTP
- [ ] Webhook delivery for external systems
- [ ] Alert history and audit logging
- [ ] Notification retry logic and error handling

### C1: Embed Authentication Groundwork (4 hours)
- [ ] JWT token generation for embed access with allowedOrigins claim
- [ ] Scoped permissions for widget data access
- [ ] CORS configuration for cross-origin embedding
- [ ] Security validation for embed tokens

## Database Changes (2 hours)

### B6: Alert Schema Migration (2 hours)
- [ ] Alert rules table with JSON condition storage and last_evaluated_at
- [ ] Alert instances table for triggered events
- [ ] User notification preferences table
- [ ] Database migration scripts and rollback procedures

## Tests & Documentation (10 hours)

### B7: Alert Testing Suite (6 hours)
- [ ] Unit tests for alert evaluation logic
- [ ] Integration tests for notification delivery
- [ ] Performance tests for large portfolio scanning
- [ ] Mock SMTP and webhook testing

### Documentation Updates (4 hours)
- [ ] API documentation for alert endpoints
- [ ] Configuration guide for SMTP and webhook setup
- [ ] Alert rule examples and best practices
- [ ] Update FEATURES.md with completed functionality

## Environment Variables Required
```env
# Alert System
SMTP_HOST=smtp.provider.com
SMTP_PORT=587
SMTP_USER=alerts@company.com
SMTP_PASS=secure_password
WEBHOOK_SECRET=random_32_char_string

# Widget Embedding (groundwork)
EMBED_JWT_SECRET=different_32_char_secret
CORS_ALLOWED_ORIGINS=https://client1.com,https://client2.com
```

## Success Criteria
- [ ] Alert rules can be created, updated, and deleted via API
- [ ] Background processor evaluates rules every 5 minutes
- [ ] Email and webhook notifications are delivered successfully
- [ ] Embed JWT tokens generated with proper security claims
- [ ] All tests pass with >90% coverage
- [ ] Documentation complete with working examples

**Total Estimated Hours: 40**