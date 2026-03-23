# ClickProps CRM API Documentation

Complete reference for all REST API endpoints. All endpoints require authentication (JWT token via NextAuth.js) unless noted.

## Authentication

All requests require a valid session. Session is obtained by login via `/api/auth/signin`.

**Error Codes:**
- `401 Unauthorized` - Missing or invalid session
- `403 Forbidden` - Insufficient role permissions
- `400 Bad Request` - Invalid input/schema validation failed
- `404 Not Found` - Resource does not exist
- `500 Internal Server Error` - Server error

---

## LEADS

### List Leads
```http
GET /api/leads?page=1&limit=20&status=new&priority=high&search=john
```
**Auth Required:** super_admin, admin, sales_manager, backoffice, agent

**Query Params:**
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `status` (enum: new, contacted, qualified, negotiation, site_visit, proposal_sent, won, lost, junk)
- `priority` (enum: low, medium, high, urgent)
- `agentId` (string) - Filter by assigned agent
- `projectId` (string) - Filter by project
- `sourceId` (string) - Filter by lead source
- `search` (string) - Search name/phone/email
- `from` (ISO date) - Start date
- `to` (ISO date) - End date

**Response:** `{ leads: [...], pagination: { page, limit, total, pages } }`

### Create Lead
```http
POST /api/leads
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9999999999",
  "budget": 5000000,
  "status": "new",
  "priority": "high",
  "sourceId": "source-id",
  "projectId": "project-id"
}
```
**Auth Required:** super_admin, admin, sales_manager, agent

**Response:** `{ id, name, email, phone, status, ... }`

### Get Lead
```http
GET /api/leads/:id
```
**Response:** Full lead object with communications, activities, tasks

### Update Lead
```http
PUT /api/leads/:id
Content-Type: application/json

{
  "status": "qualified",
  "priority": "urgent",
  "assignedToId": "user-id"
}
```

---

## BOOKINGS

### List Bookings
```http
GET /api/bookings?page=1&status=confirmed&projectId=proj-id
```
**Query Params:**
- `page`, `limit`, `status` (pending, confirmed, agreement_signed, registration_done, possession_given, cancelled, refunded)
- `projectId`, `customerId`, `agentId`
- `from`, `to` (date range)

**Response:** `{ bookings: [...], pagination: {...} }`

### Create Booking
```http
POST /api/bookings
Content-Type: application/json

{
  "customerId": "customer-id",
  "projectId": "project-id",
  "plotId": "plot-id",
  "flatId": "flat-id",
  "totalAmount": 5000000,
  "discountAmount": 100000,
  "netAmount": 4900000,
  "bookingDate": "2024-03-18T00:00:00Z"
}
```
**Auth Required:** super_admin, admin, sales_manager

**Response:** `{ id, bookingNumber, status, ... }`

### Get Booking Details
```http
GET /api/bookings/:id
```
**Response:** Full booking with payments, installments, refunds, commissions

### Update Booking Status
```http
PATCH /api/bookings/:id
Content-Type: application/json

{
  "status": "agreement_signed",
  "agreementDate": "2024-03-18T00:00:00Z"
}
```

---

## PROJECTS

### List Projects
```http
GET /api/projects?page=1&status=under_construction&city=Bangalore
```
**Query Params:**
- `status` (upcoming, under_construction, ready_to_move, completed, on_hold, cancelled)
- `type` (residential, commercial, mixed, villa, plot, apartment)
- `city`, `search`

**Response:** `{ projects: [...], pagination: {...} }`

### Create Project
```http
POST /api/projects
Content-Type: application/json

{
  "name": "Sri Sai Gardens",
  "slug": "sri-sai-gardens",
  "type": "residential",
  "status": "upcoming",
  "address": "Whitefield, Bangalore",
  "city": "Bangalore",
  "totalUnits": 150
}
```

### Get Project
```http
GET /api/projects/:id
```
**Response:** Project with plots, flats, amenities, images

---

## AGENTS

### List Agents
```http
GET /api/agents?isActive=true&page=1
```
**Response:** `{ agents: [...], pagination: {...} }`

### Get Agent Details
```http
GET /api/agents/:id
```
**Response:** Agent with bookings, commissions, team info

### List Agent Commissions
```http
GET /api/agents/:id/commissions?status=pending
```
**Status:** pending, approved, paid, cancelled, clawed_back

---

## CUSTOMERS

### List Customers
```http
GET /api/customers?page=1&search=john
```

### Create Customer
```http
POST /api/customers
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9999999999",
  "city": "Bangalore",
  "panNumber": "AAXYZ1234K"
}
```

### Get Customer
```http
GET /api/customers/:id
```
**Response:** Customer with bookings, contacts, documents

---

## HEALTH & METRICS

### Health Check
```http
GET /api/health
```
**Response:** `{ status: 'healthy', database: 'ok', redis: 'ok', timestamp: '...' }`

### Prometheus Metrics
```http
GET /api/metrics
```
**Format:** Prometheus text format for Grafana scraping

---

## Common Response Format

**Success:**
```json
{ "success": true, "data": {...} }
```

**Error:**
```json
{ "success": false, "error": "Error message", "code": "ERROR_CODE" }
```

**Pagination:**
```json
{
  "page": 1,
  "limit": 20,
  "total": 245,
  "pages": 13
}
```

---

## Rate Limiting

No explicit rate limiting. Implement at Nginx level if needed.

## CORS

Enabled for same-origin requests. Adjust in middleware if needed.
