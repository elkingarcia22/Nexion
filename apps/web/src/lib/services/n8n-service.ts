/**
 * n8n Service — Workflow Orchestration
 *
 * Handles all communication with n8n Cloud API for workflow dispatch,
 * status checking, and execution monitoring.
 *
 * Reference: docs/02-technical/N8N_CONFIGURATION.md
 */

interface WorkflowDispatchResponse {
  id: string
  url: string
  mode: string
  execution: {
    id: string
    mode: string
    status: string
  }
}

interface WorkflowExecutionStatus {
  id: string
  workflowId: string
  mode: string
  status: 'new' | 'running' | 'success' | 'error' | 'waiting'
  startedAt: string
  stoppedAt?: string
  data?: Record<string, any>
  error?: string
}

class N8nService {
  private baseUrl: string
  private apiKey: string

  constructor() {
    this.baseUrl = process.env.N8N_BASE_URL || ''
    this.apiKey = process.env.N8N_API_KEY || ''

    if (!this.baseUrl || !this.apiKey) {
      throw new Error(
        'n8n configuration missing. Set N8N_BASE_URL and N8N_API_KEY in .env.local'
      )
    }
  }

  /**
   * Dispatch a workflow by ID with input data
   *
   * @param workflowId - The workflow ID from n8n
   * @param data - Input data for the workflow
   * @returns Execution ID for tracking
   */
  async dispatchWorkflow(
    workflowId: string,
    data: Record<string, any>
  ): Promise<string> {
    const url = `${this.baseUrl}/api/v1/workflows/${workflowId}/execute`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(
          `n8n dispatch failed (${response.status}): ${error}`
        )
      }

      const result: WorkflowDispatchResponse = await response.json()
      return result.execution.id
    } catch (error) {
      console.error('[n8n] Dispatch error:', error)
      throw error
    }
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId: string): Promise<WorkflowExecutionStatus> {
    const url = `${this.baseUrl}/api/v1/executions/${executionId}`

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(
          `Status check failed (${response.status})`
        )
      }

      return response.json()
    } catch (error) {
      console.error('[n8n] Status check error:', error)
      throw error
    }
  }

  /**
   * List all workflows
   */
  async listWorkflows(): Promise<Array<{ id: string; name: string }>> {
    const url = `${this.baseUrl}/api/v1/workflows`

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`List workflows failed (${response.status})`)
      }

      const result = await response.json()
      return result.data || []
    } catch (error) {
      console.error('[n8n] List workflows error:', error)
      throw error
    }
  }
}

// Export singleton instance
export const n8nService = new N8nService()
