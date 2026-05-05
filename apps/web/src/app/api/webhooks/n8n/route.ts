/**
 * Webhook Endpoint for n8n Workflow Results
 *
 * n8n sends workflow execution results here.
 * Handles callbacks from:
 * - process-source
 * - daily-run
 * - sync-okrs
 * - etc.
 *
 * Reference: docs/02-technical/N8N_CONFIGURATION.md
 */

import { NextRequest, NextResponse } from 'next/server'

interface N8nWebhookPayload {
  execution_id: string
  workflow_id: string
  workflow_name: string
  status: 'success' | 'error'
  execution_data?: Record<string, any>
  error_message?: string
  timestamp: string
}

/**
 * POST /api/webhooks/n8n
 *
 * Receives workflow completion events from n8n.
 */
export async function POST(request: NextRequest) {
  try {
    const payload: N8nWebhookPayload = await request.json()

    console.log('[n8n webhook] Received:', {
      workflow: payload.workflow_name,
      status: payload.status,
      execution_id: payload.execution_id
    })

    // TODO: Validate webhook signature (configure in n8n)
    // const signature = request.headers.get('x-n8n-signature')
    // if (!validateSignature(payload, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    // }

    // Route to appropriate handler based on workflow
    switch (payload.workflow_name) {
      case 'add-source':
        return handleAddSourceComplete(payload)

      case 'process-source':
        return handleProcessSourceComplete(payload)

      case 'daily-run':
        return handleDailyRunComplete(payload)

      case 'sync-okrs':
        return handleSyncOkrsComplete(payload)

      default:
        console.warn(`[n8n webhook] Unknown workflow: ${payload.workflow_name}`)
        return NextResponse.json({ received: true })
    }
  } catch (error) {
    console.error('[n8n webhook] Error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Handler for add-source workflow completion
 */
async function handleAddSourceComplete(payload: N8nWebhookPayload) {
  if (payload.status === 'error') {
    console.error('[n8n] add-source failed:', payload.error_message)
    // TODO: Update source status to 'error' in Supabase
    // TODO: Notify user of failure
    return NextResponse.json({ status: 'error_logged' })
  }

  // TODO: Extract source data from payload.execution_data
  // TODO: Save to Supabase sources table
  // TODO: Trigger process-source workflow
  // TODO: Update UI via socket or polling

  console.log('[n8n] add-source completed successfully')
  return NextResponse.json({ status: 'processed' })
}

/**
 * Handler for process-source workflow completion
 */
async function handleProcessSourceComplete(payload: N8nWebhookPayload) {
  if (payload.status === 'error') {
    console.error('[n8n] process-source failed:', payload.error_message)
    // TODO: Update source status to 'error' in Supabase
    return NextResponse.json({ status: 'error_logged' })
  }

  // TODO: Extract analysis results from payload.execution_data
  // Should contain:
  // - summary
  // - findings
  // - proposed_tasks
  // - alerts
  // - metrics
  // - insights
  // - feedback
  // - objective_links

  // TODO: Save analysis to Supabase
  // TODO: Create task_proposals if applicable
  // TODO: Trigger day consolidation
  // TODO: Update source status to 'processed'

  console.log('[n8n] process-source completed successfully')
  return NextResponse.json({ status: 'processed' })
}

/**
 * Handler for daily-run workflow completion
 */
async function handleDailyRunComplete(payload: N8nWebhookPayload) {
  if (payload.status === 'error') {
    console.error('[n8n] daily-run failed:', payload.error_message)
    // TODO: Log error for debugging
    // TODO: Send alert to user if critical
    return NextResponse.json({ status: 'error_logged' })
  }

  // TODO: Extract daily summary from payload.execution_data
  // TODO: Save DaySummary to Supabase
  // TODO: Create update_proposals if applicable
  // TODO: Mark auto-updates as applied or pending approval

  console.log('[n8n] daily-run completed successfully')
  return NextResponse.json({ status: 'processed' })
}

/**
 * Handler for sync-okrs workflow completion
 */
async function handleSyncOkrsComplete(payload: N8nWebhookPayload) {
  if (payload.status === 'error') {
    console.error('[n8n] sync-okrs failed:', payload.error_message)
    return NextResponse.json({ status: 'error_logged' })
  }

  // TODO: Extract OKR data from payload.execution_data
  // TODO: Update objectives and krs tables in Supabase
  // TODO: Refresh any linked tasks/metrics

  console.log('[n8n] sync-okrs completed successfully')
  return NextResponse.json({ status: 'processed' })
}

/**
 * GET /api/webhooks/n8n (for testing)
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    message: 'n8n webhook endpoint is ready',
    configure_url: 'https://egarcia.app.n8n.cloud',
    webhook_url: 'https://your-app.com/api/webhooks/n8n'
  })
}
