# ClickProps CRM Authentication & Authorization

## Login Flow

### Credentials Provider
```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "sales_manager",
      "orgId": "org-id"
    }
  }
}
```

## Session Details

- **Strategy:** JWT (NextAuth.js)
- **Max Age:** 30 days
- **Update Age:** 24 hours (silent refresh after 24h of inactivity)
- **Storage:** Secure HTTP-only cookie
- **Environment:** `NEXTAUTH_SECRET` (min 32 chars)

## 6 Role Hierarchy

ClickProps uses a priority-based role system. Users can have multiple roles; the highest-priority role is used.

| Role | Priority | Permissions |
|------|----------|-------------|
| **super_admin** | 6 | Full system access, user management, org settings, audit logs |
| **admin** | 5 | Full access within org, configure projects, users, commission rules |
| **sales_manager** | 4 | Manage sales team, view/edit all leads & bookings, approve commissions |
| **backoffice** | 3 | Data entry, process payments, manage documents, customer support |
| **agent** | 2 | View own leads & bookings, update status, record communications |
| **customer** | 1 | Self-service portal, view own bookings & documents (future) |

## Role-Based Access Control (RBAC)

### Sample Middleware Check
```typescript
// In API routes
const auth = await requireAuth(['admin', 'sales_manager']);
if (!auth.authorized) {
  return auth.status === 401 ? unauthorized() : forbidden();
}
```

### Permission Model

**Resources:** lead, booking, project, agent, customer, report

**Actions:** create, read, update, delete, export

**Example RBAC Rules:**

| Role | Leads | Bookings | Payments | Commissions |
|------|-------|----------|----------|-------------|
| super_admin | All | All | All | All |
| admin | All | All | All | All |
| sales_manager | All | All | View | Approve |
| backoffice | View | Update | Create/Verify | View |
| agent | Own only | Own only | View own | View own |
| customer | Own leads | Own bookings | View own | N/A |

## Request Authentication

1. **Login** → Credentials checked, JWT issued
2. **Session Cookie** → Sent with every request (automatic)
3. **JWT Validation** → Checked on each API call
4. **Role Check** → Endpoint verifies role permissions
5. **Org Scoping** → Data queries filtered by user's orgId

## Session Refresh

- **Automatic:** After 24h of activity, session silently updates
- **Manual:** Call `getSession()` in frontend to refresh
- **Expiry:** Session expires after 30 days; user must re-login

## Error Codes

- `401 Unauthorized` - No valid session (user not logged in)
- `403 Forbidden` - Valid session but insufficient role/permissions
- `400 Bad Request` - Invalid credentials

## Account Status

Users can be in three statuses:

- **active** - Can login normally
- **inactive** - Blocked, cannot login (admin action)
- **suspended** - Violates terms, cannot login (super_admin action)
- **deleted** (soft-delete) - Marked as deleted, cannot login

## Example Frontend Login

```typescript
import { signIn } from 'next-auth/react';

export async function loginUser(email: string, password: string) {
  const result = await signIn('credentials', {
    email,
    password,
    redirect: false,
  });

  if (result?.error) {
    console.error('Login failed:', result.error);
  } else {
    console.log('Login successful');
  }
}
```

## Example Protected API Route

```typescript
import { requireAuth } from '@/lib/auth';

export async function GET(req) {
  const auth = await requireAuth(['admin', 'sales_manager']);
  if (!auth.authorized) {
    return auth.status === 401 ? unauthorized() : forbidden();
  }

  // User is authenticated and has required role
  const user = auth.user; // { id, email, role, orgId }
  // Proceed with business logic
}
```

## Multi-Organization Support

Each user belongs to one organization (orgId). APIs automatically scope data to user's org:

```typescript
// All queries include: WHERE orgId = session.user.orgId
const leads = await prisma.lead.findMany({
  where: { orgId: user.orgId }, // Always scoped
});
```

## Token Content (JWT Payload)

```json
{
  "id": "user-id",
  "email": "user@example.com",
  "role": "sales_manager",
  "orgId": "org-id",
  "iat": 1234567890,
  "exp": 1234654290,
  "iss": "clickprops"
}
```

## Logout

```typescript
import { signOut } from 'next-auth/react';

await signOut({ redirect: true, callbackUrl: '/auth/signin' });
```

Session cookie is cleared and user is redirected to login page.
