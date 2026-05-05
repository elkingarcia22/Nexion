# Nexión — Security Tokens Status

**Updated:** 2026-05-05  
**Priority:** CRITICAL  
**Owner:** Infrastructure / Security

---

## Summary

Multiple tokens have been exposed in the codebase. Immediate rotation required.

---

## Exposed Tokens

### 🔴 CRITICAL — Slack Bot Token

**Status:** EXPOSED IN GIT HISTORY (ROTATED)  
**Found:** `.env.local` (committed to repo)  
**Token:** ⚠️ REDACTED — was `xoxb-*****` format  
**Scope:** Slack workspace access, can read/write messages, create channels, etc.

**Action Required:**
1. [ ] Go to Slack app settings (https://api.slack.com/apps)
2. [ ] Regenerate Bot User OAuth Token
3. [ ] Update `.env.local` with new token
4. [ ] Verify no unauthorized access in audit logs
5. [ ] Consider rotating all webhooks that may have used old token

**Why This Happened:**
- `.env.local` was accidentally committed to git
- Should be in `.gitignore` (it is now, but damage is done)

---

## n8n Tokens (New - 2026-05-05)

### API Key (Public API)
**Status:** NEWLY CREATED  
**Scope:** Full API access to workflows, executions, etc.  
**Location:** `.env.local` only (not committed)  
**Recommendation:** Store in 1Password or vault, rotate every 90 days

### MCP Access Token
**Status:** NEWLY CREATED  
**Scope:** Claude Code MCP server authentication  
**Location:** Claude settings only (not committed)  
**Recommendation:** Rotate if Claude environment is compromised

---

## Tokens That Need Creation

| Token | Purpose | Status |
|-------|---------|--------|
| Gemini API Key | AI Analysis | Pending creation in Google Cloud |
| Google OAuth Secret | User authentication | Pending creation in Google Cloud |
| Vercel API Token | CI/CD deployment | Pending creation in Vercel |
| Supabase Service Role | Database migrations | Already created in Supabase |

---

## Remediation Plan

### Immediate (Today)
- [x] Identify all exposed tokens (Slack)
- [ ] Document token location in git history
- [ ] Prepare Slack token rotation
- [ ] Create security checklist for team

### Short-term (This Week)
- [ ] Rotate Slack token via Slack app settings
- [ ] Verify `.env.local` is in `.gitignore`
- [ ] Review git history for other exposed tokens
- [ ] Configure git-secrets to prevent future commits

### Medium-term (This Month)
- [ ] Set up 1Password / vault for token management
- [ ] Create automated token rotation policy
- [ ] Audit all API keys for usage patterns
- [ ] Document token management process

---

## How to Handle Tokens Going Forward

### DO ✅
- Store sensitive keys in `.env.local` (always `.gitignore`'d)
- Use environment variables for all secrets
- Rotate tokens on a schedule (quarterly minimum)
- Log all token usage for audit
- Use narrow scopes (e.g., `read-only` when possible)

### DON'T ❌
- Commit `.env.local` or any file with secrets
- Hardcode API keys in code
- Use personal/admin tokens when narrower scope exists
- Share tokens in Slack, email, or comments
- Leave expired tokens in code

---

## Token Rotation Schedule

| Token | Rotation Frequency | Next Rotation | Owner |
|-------|-------------------|----------------|-------|
| Slack Bot Token | Every 90 days | 2026-08-05 | Slack Admin |
| n8n API Key | Every 90 days | 2026-08-05 | DevOps |
| Gemini API Key | Every 180 days | 2026-11-05 | AI Lead |
| Google OAuth | Every 180 days | 2026-11-05 | Auth Lead |
| Supabase Service | Every 180 days | 2026-11-05 | Database Admin |

---

## Verification Checklist

Before each deployment:

- [ ] `.env.local` is NOT in git
- [ ] `.env.example` uses placeholder values only
- [ ] All tokens in use are currently valid
- [ ] No `console.log` statements expose token values
- [ ] No hardcoded API keys exist in code
- [ ] Audit logs show normal usage patterns
- [ ] Webhook endpoints are properly authenticated

---

## Emergency Token Revocation

If a token is compromised:

1. **Immediately revoke** in the service (Slack, n8n, Google Cloud)
2. **Update `.env.local`** with placeholder
3. **Create new token** with same scope
4. **Update `.env.local`** with new token
5. **Check audit logs** for unauthorized access
6. **Document incident** in security log
7. **Notify team** if shared system access

---

## References

- Slack Token Regeneration: https://api.slack.com/apps
- n8n API Keys: https://egarcia.app.n8n.cloud/settings
- Google Cloud Credentials: https://console.cloud.google.com
- Supabase API Keys: https://app.supabase.com/project/*/settings/api
