/**
 * Shared categorization logic for tasks/items
 * Used by both /day/today and /tasks to ensure consistent team assignment
 */

export const categorizeItem = (item: any, objectives: any[] = [], jiraTasks: any[] = []) => {
  const context = String(item.team || item.category || "").toLowerCase();
  const title = String(item.title || "").toLowerCase();
  const content = String(item.description || item.content || item.comentario || "").toLowerCase();
  const combinedText = `${context} ${title} ${content}`.toLowerCase();

  const linkedGoal = objectives.find(o => o.id === item.goal_id);
  const goalContext = linkedGoal ? `${linkedGoal.title} ${linkedGoal.team}`.toLowerCase() : "";

  const linkedJira = jiraTasks.find(j => j.external_key === item.linked_jira_key);
  const jiraContext = linkedJira ? `${linkedJira.title} ${linkedJira.team}`.toLowerCase() : "";

  const fullContext = `${combinedText} ${goalContext} ${jiraContext}`;

  if ((fullContext.includes("talent") || fullContext.includes("culture") || fullContext.includes("growth") ||
       fullContext.includes("nom 035") || fullContext.includes("nom-035")) &&
      !fullContext.includes("hiring") && !fullContext.includes("utu") && !fullContext.includes("talent-os")) return 'talent';

  if (fullContext.includes("hiring") || fullContext.includes("utu") || fullContext.includes("talent-os") || fullContext.includes("recruit") ||
      fullContext.includes("contratación") || fullContext.includes("reclutamiento")) return 'hiring';

  if (fullContext.includes("ux") || fullContext.includes("design") || fullContext.includes("diseño") || fullContext.includes("triada") ||
      fullContext.includes("ux_team")) return 'ux';

  return 'otras';
};

export const getResponsable = (item: any): string => {
  return item.responsible ||
         item.assignee_name ||
         item.metadata?.responsable ||
         item.assignee?.displayName ||
         "Sin asignar";
};
