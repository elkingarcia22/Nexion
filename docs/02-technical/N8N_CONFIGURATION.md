# Nexión — n8n Cloud Configuration

**Status:** Active  
**Updated:** 2026-05-05  
**Owner:** Build / Automation

---

## Quick Reference

| Variable | Value | Purpose |
|----------|-------|---------|
| `N8N_BASE_URL` | `https://egarcia.app.n8n.cloud` | Base URL for n8n API calls |
| `N8N_API_KEY` | JWT token | Authenticate API calls from backend |
| `N8N_MCP_SERVER_URL` | `https://egarcia.app.n8n.cloud/mcp-server/http` | MCP server for Claude integration |
| `N8N_MCP_ACCESS_TOKEN` | JWT token | Authenticate MCP requests from Claude |

---

## Setup Checklist

- [x] n8n Cloud account created (egarcia@...)
- [x] API Key generated for public API
- [x] MCP Server enabled
- [x] MCP Access Token generated
- [x] Credentials stored in `.env.local` (NOT committed)
- [ ] Webhook endpoint created in Nexión for n8n callbacks
- [ ] Service created to dispatch n8n workflows
- [ ] First workflow tested (e.g., `add-source` or `process-source`)

---

## API Authentication

### Public API Calls (from Backend)

Use `N8N_API_KEY` as Bearer token:

```typescript
const response = await fetch('https://egarcia.app.n8n.cloud/api/v1/workflows', {
  headers: {
    'Authorization': `Bearer ${process.env.N8N_API_KEY}`,
    'Content-Type': 'application/json'
  }
});
```

### MCP Server (from Claude Code)

Configured in `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "type": "http",
      "url": "https://egarcia.app.n8n.cloud/mcp-server/http",
      "headers": {
        "Authorization": "Bearer <N8N_MCP_ACCESS_TOKEN>"
      }
    }
  }
}
```

---

## Workflow Dispatch Pattern

All workflow triggers from Nexión should follow this pattern:

```typescript
// In /apps/web/src/lib/services/n8n-service.ts
async function dispatchWorkflow(
  workflowId: string,
  data: Record<string, any>
): Promise<{ execution_id: string }> {
  const response = await fetch(
    `${process.env.N8N_BASE_URL}/api/v1/workflows/${workflowId}/execute`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.N8N_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data })
    }
  );

  if (!response.ok) {
    throw new Error(`Workflow dispatch failed: ${response.statusText}`);
  }

  return response.json();
}
```

---

## Webhook Endpoint Pattern

n8n will POST results to Nexión via webhook. Example:

```typescript
// In /apps/web/src/app/api/webhooks/n8n/route.ts
export async function POST(request: Request) {
  const payload = await request.json();
  
  // Validate webhook signature (if configured in n8n)
  // Save payload to database
  // Update UI state if needed
  
  return Response.json({ success: true });
}
```

Webhook URL in n8n: `https://your-app.com/api/webhooks/n8n`

---

## Workflows Currently in n8n

### Slack Integration (Exists)
- `slack-events-complete.json`
- `slack-events-workflow.json`

### Required (To Build - Release 1)
- `add-source` — Manual source intake
- `process-source` — Source processing + Gemini analysis
- `daily-run` — End-of-day consolidation

### Planned (Release 2+)
- `generate-task-proposals` — AI proposal generation
- `approve-task` — Approval handling
- `sync-okrs` — OKR sync from Google Sheets
- `sync-calendar` — Calendar integration

---

## Security Notes

⚠️ **Tokens Exposed Risk:**
- Slack token exposed in git history (2026-05-05)
- Status: Action needed — rotate token immediately

**Current State:**
- `.env.local` is `.gitignore`'d (safe)
- `.env.example` uses placeholder values (safe)
- Only actual tokens in `.env.local` (never commit)

---

## Testing the Connection

### 1. Via MCP (Claude Code)
```javascript
// Use the n8n-mcp server configured above
// Can list workflows, inspect execution history, etc.
```

### 2. Via Backend Service
```typescript
// Create a test endpoint
GET /api/test/n8n
// Returns: list of workflows from n8n API
```

### 3. Manual Webhook Test
```bash
curl -X POST https://your-app.com/api/webhooks/n8n \
  -H "Content-Type: application/json" \
  -d '{"test": "payload"}'
```

---

## Common Issues

| Issue | Solution |
|-------|----------|
| `401 Unauthorized` | Check `N8N_API_KEY` validity, may be expired |
| `Workflow not found` | Verify workflow ID matches n8n export |
| `CORS errors` | n8n Cloud CORS should be open, check headers |
| `Webhook not received` | Verify n8n has correct webhook URL + public IP |

---

## Next Steps

1. **Create n8n service** (`/apps/web/src/lib/services/n8n-service.ts`)
2. **Create webhook endpoint** (`/apps/web/src/app/api/webhooks/n8n/route.ts`)
3. **Refactor `/api/analyze`** to dispatch `process-source` workflow instead of calling Gemini directly
4. **Build first real workflow** in n8n (e.g., `add-source`)
5. **Test end-to-end** workflow dispatch + webhook callback

---

## References

- n8n API Docs: https://docs.n8n.io/api/
- n8n Cloud: https://app.n8n.cloud
- Nexión Architecture: `docs/02-technical/AUTOMATION_ARCHITECTURE.md`
