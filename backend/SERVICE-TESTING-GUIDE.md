# SalesOS Microservices Testing Guide

## 🎯 Overview

This guide provides comprehensive instructions for testing all SalesOS microservices that have been implemented.

## 📋 Services Overview

| Service | Port | Base URL | Description |
|---------|------|----------|-------------|
| **API Gateway** | 3000 | http://localhost:3000 | Single entry point for all API requests |
| **Auth Service** | 3001 | http://localhost:3001 | Authentication and authorization |
| **CRM Service** | 3002 | http://localhost:3002 | Accounts, Contacts, Opportunities |
| **Email Service** | 3003 | http://localhost:3003 | Email sending and tracking |
| **Calendar Service** | 3004 | http://localhost:3004 | Calendar and meeting management |
| **Sequences Service** | 3005 | http://localhost:3005 | Email sequences and automation |
| **Activities Service** | 3006 | http://localhost:3006 | Activity tracking and logging |
| **Kafka Publisher** | N/A | N/A | Event publishing worker |
| **Kafka Consumer** | N/A | N/A | Event consuming worker |

## 🧪 Testing Methods

### Method 1: Interactive Browser Testing (Recommended)

1. **Open the HTML Test Page:**
   ```bash
   # From the backend directory
   # Open test-services.html in your browser
   start test-services.html     # Windows
   open test-services.html      # macOS
   xdg-open test-services.html  # Linux
   ```

2. **Click "Test All Services"** button to test all services at once

3. **Or test individual services** by clicking their respective "Test" buttons

4. **View results** in the response sections below each service card

### Method 2: Command Line Testing (Bash Script)

```bash
# From the backend directory
chmod +x test-services.sh
./test-services.sh
```

### Method 3: Manual curl Commands

#### Test Gateway
```bash
# Health check
curl http://localhost:3000/health

# Readiness check
curl http://localhost:3000/ready

# Liveness check
curl http://localhost:3000/live

# Metrics
curl http://localhost:3000/metrics
```

#### Test Auth Service
```bash
# Health check
curl http://localhost:3001/health

# Readiness check
curl http://localhost:3001/ready

# Liveness check
curl http://localhost:3001/live
```

#### Test CRM Service
```bash
# Health check
curl http://localhost:3002/health

# Readiness check
curl http://localhost:3002/ready

# Liveness check
curl http://localhost:3002/live
```

#### Test Email Service
```bash
# Health check
curl http://localhost:3003/health

# Readiness check
curl http://localhost:3003/ready

# Liveness check
curl http://localhost:3003/live
```

#### Test Calendar Service
```bash
# Health check
curl http://localhost:3004/health

# Readiness check
curl http://localhost:3004/ready

# Liveness check
curl http://localhost:3004/live
```

#### Test Sequences Service
```bash
# Health check
curl http://localhost:3005/health

# Readiness check
curl http://localhost:3005/ready

# Liveness check
curl http://localhost:3005/live
```

#### Test Activities Service
```bash
# Health check
curl http://localhost:3006/health

# Readiness check
curl http://localhost:3006/ready

# Liveness check
curl http://localhost:3006/live
```

### Method 4: PowerShell Commands (Windows)

```powershell
# Test all services health endpoints
$services = @(
    @{Name="Gateway"; Port=3000},
    @{Name="Auth"; Port=3001},
    @{Name="CRM"; Port=3002},
    @{Name="Email"; Port=3003},
    @{Name="Calendar"; Port=3004},
    @{Name="Sequences"; Port=3005},
    @{Name="Activities"; Port=3006}
)

foreach ($service in $services) {
    Write-Host "`n$($service.Name) Service (Port $($service.Port)):" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$($service.Port)/health" -Method Get
        Write-Host "✓ Health: $($response.status)" -ForegroundColor Green
        $response | ConvertTo-Json
    } catch {
        Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}
```

## 🔍 Expected Responses

### Health Endpoint (`/health`)
```json
{
  "status": "ok",
  "timestamp": "2026-01-06T08:10:00.000Z"
}
```

### Readiness Endpoint (`/ready`)
```json
{
  "status": "ready",
  "checks": {
    "database": {
      "status": "ok",
      "latencyMs": 15
    },
    "redis": {
      "status": "ok",
      "latencyMs": 2
    }
  },
  "timestamp": "2026-01-06T08:10:00.000Z"
}
```

### Liveness Endpoint (`/live`)
```json
{
  "status": "alive",
  "timestamp": "2026-01-06T08:10:00.000Z"
}
```

## 🔐 Testing API Endpoints (Through Gateway)

### 1. Auth Endpoints (Public - No Auth Required)

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Signup
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "password123",
    "name": "New User"
  }'

# Refresh Token
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your-refresh-token"
  }'
```

### 2. Protected Endpoints (Require Authentication)

**Note:** You need a valid JWT token from the login endpoint to access these.

```bash
# Set your token
TOKEN="your-jwt-token-here"

# List Accounts (CRM)
curl http://localhost:3000/api/v1/accounts \
  -H "Authorization: Bearer $TOKEN"

# List Contacts (CRM)
curl http://localhost:3000/api/v1/contacts \
  -H "Authorization: Bearer $TOKEN"

# List Opportunities (CRM)
curl http://localhost:3000/api/v1/opportunities \
  -H "Authorization: Bearer $TOKEN"

# List Emails
curl http://localhost:3000/api/v1/emails \
  -H "Authorization: Bearer $TOKEN"

# List Calendars
curl http://localhost:3000/api/v1/calendars \
  -H "Authorization: Bearer $TOKEN"

# List Sequences
curl http://localhost:3000/api/v1/sequences \
  -H "Authorization: Bearer $TOKEN"

# List Activities
curl http://localhost:3000/api/v1/activities \
  -H "Authorization: Bearer $TOKEN"
```

## 📊 Monitoring Kafka Workers

```bash
# Check Kafka Publisher logs
# Look for: "Kafka publisher running"

# Check Kafka Consumer logs
# Look for: "Kafka consumer running"

# In the terminal where services are running, you should see:
# - Kafka Consumer joined the group
# - Kafka Producer connected
# - No SSL certificate errors
```

## ✅ Success Criteria

All services should:
1. ✓ Respond to `/health` with `200 OK`
2. ✓ Respond to `/ready` with `200 OK` (database and Redis connected)
3. ✓ Respond to `/live` with `200 OK`
4. ✓ Show proper logging in the console
5. ✓ Handle requests without errors

Kafka Workers should:
1. ✓ Connect to Kafka broker (localhost:19092)
2. ✓ Not show SSL certificate errors
3. ✓ Show "running" status in logs

## 🐛 Troubleshooting

### Service Not Responding
```bash
# Check if the service is running
netstat -ano | findstr "PORT_NUMBER"  # Windows
lsof -i :PORT_NUMBER                   # macOS/Linux

# Check service logs in the terminal where npm run dev:all is running
```

### Database Connection Issues
- Verify `DATABASE_URL` in your environment
- Check PostgreSQL/Supabase connection
- Look for "Database pool configured" log message

### Redis Connection Issues
- Verify `REDIS_URL` in your environment
- Ensure Redis is running locally or accessible

### Kafka Issues
- Verify Kafka/Redpanda is running on port 19092
- Check for "Kafka producer connected" message
- No SSL certificate errors should appear

## 📝 Quick Test Command

```bash
# One-liner to test all health endpoints
for port in 3000 3001 3002 3003 3004 3005 3006; do echo "Port $port:"; curl -s http://localhost:$port/health | jq .; done
```

## 🎉 What We've Implemented

✅ **Microservices Architecture**
- 7 independent services
- API Gateway with routing
- Service-to-service communication

✅ **Database Layer**
- Drizzle ORM with PostgreSQL
- Multi-tenancy support
- Connection pooling

✅ **Event-Driven Architecture**
- Kafka publisher worker
- Kafka consumer worker
- Event sourcing pattern

✅ **Email Provider Integration**
- Gmail provider
- Outlook provider
- Mock provider for testing

✅ **Infrastructure**
- Health checks
- Metrics endpoints
- Structured logging
- Error handling

✅ **Fixed Issues**
- Drizzle ORM schema syntax (partial indexes)
- PostgreSQL SSL certificate validation
- Windows PowerShell compatibility

## 🚀 Next Steps

1. Test authentication flow (login/signup)
2. Create test data in the database
3. Test CRUD operations for each service
4. Verify Kafka event flow
5. Test email sending functionality

---

**Created:** 2026-01-06
**Status:** All services operational ✅

