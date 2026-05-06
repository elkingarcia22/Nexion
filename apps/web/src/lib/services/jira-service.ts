import { supabase } from "@/lib/supabase";

export interface JiraConfig {
  siteUrl: string;
  email: string;
  apiToken: string;
}

export async function testJiraConnection(config: JiraConfig) {
  try {
    const response = await fetch('/api/jira/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });

    const result = await response.json();
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fetchJiraIssues(config: JiraConfig, jql: string = "updated >= -180d order by updated DESC") {
  try {
    let allIssues: any[] = [];
    const pageSize = 100;
    const totalToFetch = 1000;
    
    let nextPageToken: string | undefined = undefined;
    let isLast = false;

    while (!isLast && allIssues.length < totalToFetch) {
      
      const response: Response = await fetch('/api/jira/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          action: "fetch_issues",
          jql,
          nextPageToken,
          maxResults: pageSize
        })
      });

      const result: { success: boolean; data?: any; error?: string } = await response.json();
      
      if (result.success && result.data) {
        const pageIssues = result.data.issues || [];
        isLast = result.data.isLast;
        nextPageToken = result.data.nextPageToken;

        allIssues = [...allIssues, ...pageIssues];

        // Deduplicate
        const seen = new Set();
        allIssues = allIssues.filter(issue => {
          if (seen.has(issue.id)) return false;
          seen.add(issue.id);
          return true;
        });
      } else {
        console.warn("[JiraService] Failed to fetch page or no more issues:", result.error);
        break;
      }
    }

    return { success: true, issues: allIssues };
  } catch (error: any) {
    console.error("[JiraService] Error in fetchJiraIssues:", error);
    return { success: false, error: error.message };
  }
}
