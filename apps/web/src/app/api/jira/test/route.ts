import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const bodyData = await req.json();
    const { siteUrl, email, apiToken, action, jql, startAt, maxResults, nextPageToken } = bodyData;

    if (!siteUrl || !email || !apiToken) {
      return NextResponse.json({ success: false, error: "Missing credentials" }, { status: 400 });
    }

    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
    
    // Determine endpoint based on action
    let endpoint = `${siteUrl}/rest/api/3/myself`;
    let method = 'GET';
    let body = undefined;

    if (action === "fetch_issues") {
      endpoint = `${siteUrl}/rest/api/3/search/jql`;
      method = 'POST';
      const payload: any = {
        jql: jql || "order by created DESC",
        maxResults: maxResults || 100,
        fields: ["summary", "status", "subtasks", "labels", "customfield_10001", "description", "priority", "assignee", "issuetype", "comment", "duedate", "reporter", "created", "updated"],
        expand: "changelog"
      };
      
      if (nextPageToken) {
        payload.nextPageToken = nextPageToken;
      }
      
      body = JSON.stringify(payload);
      console.log(`[JiraProxy] Fetching issues with POST: ${endpoint}`);
    }

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({ 
        success: false, 
        error: errorData.errorMessages?.[0] || `Jira responded with ${response.status}: ${response.statusText}` 
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ 
      success: true, 
      data, 
      debug: { endpoint, startAt, method } 
    });
  } catch (error: any) {
    console.error("[JiraProxyError]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
