# n8n Integration Checklist

**Status:** In Progress  
**Owner:** Build  
**Updated:** 2026-05-05

---

## ✅ Completed

- [x] n8n Cloud account created
- [x] API Key generated
- [x] MCP Server enabled
- [x] MCP Access Token created
- [x] Base URL documented: `https://egarcia.app.n8n.cloud`
- [x] Configuration documented: `N8N_CONFIGURATION.md`
- [x] n8n Service created: `lib/services/n8n-service.ts`
- [x] Webhook endpoint created: `app/api/webhooks/n8n/route.ts`
- [x] Security audit: `SECURITY_TOKENS_STATUS.md`

---

## 🔄 In Progress

- [ ] Test n8n API connection
- [ ] Build first workflow: `add-source`
- [ ] Test workflow dispatch from backend
- [ ] Configure webhook in n8n
- [ ] Test webhook callback

---

## 📋 Next Steps

### Phase 1: Verify Connection (Today)

```bash
# Test n8n API connectivity
curl -X GET "https://egarcia.app.n8n.cloud/api/v1/workflows" \
  -H "Authorization: Bearer $N8N_API_KEY"

# Expected response: list of workflows
```

**In Code:**
```typescript
// Test via n8n-service
const workflows = await n8nService.listWorkflows()
console.log('Workflows:', workflows)
```

**Acceptance Criteria:**
- ✅ API returns 200 OK
- ✅ Workflow list is populated
- ✅ No authentication errors

---

### Phase 2: Build First Workflow (Days 1-2)

**Workflow:** `add-source` (Manual source intake)

**Trigger:** HTTP webhook from Nexión frontend

**Steps:**
1. Receive source data (link, name, workspace_id)
2. Validate URL format
3. Register source in Supabase with status `pending`
4. Trigger `process-source` workflow
5. Return source_id to frontend

**Expected Completion:**
- [ ] Workflow created in n8n
- [ ] Export saved to `/automation/n8n/workflows/add-source.json`
- [ ] Webhook URL configured in n8n
- [ ] Test data flows through system

---

### Phase 3: Test Dispatch from Backend (Days 2-3)

**Create Endpoint:** `POST /api/sources/add`

```typescript
export async function POST(request: Request) {
  const { link, name } = await request.json()
  
  // Dispatch to n8n
  const executionId = await n8nService.dispatchWorkflow('add-source', {
    link,
    name,
    workspace_id: getCurrentWorkspaceId(),
  })
  
  return NextResponse.json({ execution_id: executionId })
}
```

**Test:**
```bash
curl -X POST http://localhost:3000/api/sources/add \
  -H "Content-Type: application/json" \
  -d '{"link": "https://example.com", "name": "Example"}'
```

**Acceptance Criteria:**
- ✅ API accepts request
- ✅ Workflow execution starts in n8n
- ✅ Execution ID returned
- ✅ Workflow executes without errors

---

### Phase 4: Configure Webhook (Days 3-4)

**In n8n:**
1. Go to workflow `add-source`
2. Add "Webhook" node at end
3. Set method: POST
4. Set URL: `https://your-app.com/api/webhooks/n8n`
5. Save & activate webhook

**In Nexión:**
- [x] Webhook endpoint already created: `/api/webhooks/n8n`
- [x] Handler for `add-source` exists
- [ ] TODO: Implement actual database writes in handler

**Test:**
```bash
# Manually trigger webhook from n8n
curl -X POST http://localhost:3000/api/webhooks/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_name": "add-source",
    "status": "success",
    "execution_id": "123",
    "execution_data": {"source_id": "src_abc"}
  }'
```

**Acceptance Criteria:**
- ✅ Webhook receives POST requests
- ✅ Handler processes data correctly
- ✅ Database updates reflect webhook changes
- ✅ UI reflects changes (via refresh or real-time)

---

### Phase 5: Build Second Workflow (Days 4-5)

**Workflow:** `process-source` (Source analysis + Gemini)

**Trigger:** Automatic (from `add-source` completion) or manual

**Steps:**
1. Receive source_id
2. Fetch source content from URL
3. Call Gemini API with analysis prompt
4. Parse structured response
5. Save findings, tasks, insights, etc. to Supabase
6. Update source status to `processed`
7. Trigger day consolidation (if relevant)

**Note:** This replaces the current hardcoded `/api/analyze` endpoint.

**Expected Completion:**
- [ ] Workflow created in n8n
- [ ] Refactor `/api/analyze` to dispatch n8n instead
- [ ] Webhook handler for `process-source` implemented
- [ ] End-to-end flow tested

---

### Phase 6: Enable Real-Time Updates (Days 5-7)

Currently webhooks are fire-and-forget. Need to:
- [ ] Add Socket.io or Server-Sent Events for real-time UI updates
- [ ] Emit events from webhook handlers
- [ ] Subscribe in frontend components
- [ ] Show workflow progress in UI

---

## 🚀 Release 1 Completion Criteria

All must be true:

- [x] n8n credentials configured
- [x] Backend service created
- [x] Webhook endpoint created
- [ ] `add-source` workflow built + tested
- [ ] `process-source` workflow built + tested
- [ ] `/api/sources/add` endpoint working
- [ ] `/api/webhooks/n8n` receiving & processing data
- [ ] UI reflects source state changes
- [ ] End-to-end flow: Frontend → n8n → Supabase → UI ✅

---

## 📖 Documentation

- ✅ `N8N_CONFIGURATION.md` — Setup & authentication
- ✅ `SECURITY_TOKENS_STATUS.md` — Token management
- ✅ `N8N_INTEGRATION_CHECKLIST.md` — This file
- ⏳ Workflow documentation (to be created per workflow)

---

## 🔧 Implementation Order

1. Verify API connection (tests above)
2. Build `add-source` workflow
3. Test dispatch from backend
4. Configure webhook in n8n
5. Implement webhook handlers
6. Build `process-source` workflow
7. Refactor `/api/analyze` to use n8n
8. Add real-time UI updates
9. Load test with multiple sources
10. Deploy to production

---

## 🆘 Troubleshooting

| Issue | Debug Steps |
|-------|------------|
| `401 Unauthorized` | Verify `N8N_API_KEY` in `.env.local` matches n8n |
| Workflow not found | Check workflow ID matches n8n export |
| Webhook not firing | Verify URL is public + n8n webhook node is active |
| Data not saving | Check webhook handler for database errors |
| No UI update | Verify socket.io/SSE is wired + frontend subscribed |

---

## 📞 Contacts

- **n8n Support:** https://community.n8n.io
- **n8n Docs:** https://docs.n8n.io
- **Claude Code:** In-app help or `/help`
