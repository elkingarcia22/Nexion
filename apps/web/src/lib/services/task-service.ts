import { supabase } from "@/lib/supabase";

export interface Task {
  id?: string;
  workspace_id: string;
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  assignee_id?: string;
  reporter_id?: string;
  due_date?: string;
  team?: string;
  labels?: string[];
  subtasks?: any[];
  activity?: any[];
  proposal_status?: string;
  goal_id?: string;
  parent_id?: string;
  updated_at?: string;
  created_at?: string;
}

export async function getTasks(workspaceId: string, date?: string) {
  const isDemo = typeof window !== 'undefined' && localStorage.getItem('NEXION_DEMO_MODE') === 'true';

  if (isDemo) {
    console.log("DEMO_MODE: Returning mock tasks");
    return {
      success: true,
      data: [
        {
          id: "mock-1",
          workspace_id: workspaceId,
          title: "Finalizar propuesta SteelCore",
          description: "Revisar los términos legales y comerciales para la firma final.",
          priority: "High",
          status: "Pendiente",
          assignee_id: "me",
          due_date: new Date().toISOString(),
          team: "Legal",
          labels: ["Urgente", "Alianza"],
          activity: [
            { id: 1, type: "comment", user: "Elkin García", text: "Ya hablé con el cliente, están de acuerdo.", timestamp: new Date().toISOString() }
          ],
          subtasks: [
            { id: "sub-1", title: "Revisar cláusula 4.2", status: "Pendiente", priority: "High", assignee_id: "me" },
            { id: "sub-2", title: "Validar con el equipo legal", status: "Listo", priority: "Medium", assignee_id: "me" }
          ]
        }
      ]
    };
  }

  // Fetch all tasks for the workspace
  const { data: allTasks, error: taskError } = await supabase
    .from("task_proposals")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: false });
  
  if (taskError) {
    console.error("Error fetching tasks:", taskError);
    return { success: false, error: taskError.message };
  }

  // Fetch all comments for these tasks
  const taskIds = allTasks.map(t => t.id);
  const { data: allComments, error: commentError } = await supabase
    .from("task_comments")
    .select("*")
    .in("task_id", taskIds)
    .order('created_at', { ascending: false });

  // Separate tasks into parents and children (subtasks)
  const parents = allTasks.filter((t: any) => !t.parent_id);
  const children = allTasks.filter((t: any) => t.parent_id);

  // Nest subtasks and comments into parents
  const nestedTasks = parents.map((p: any) => ({
    ...p,
    subtasks: children.filter((c: any) => c.parent_id === p.id),
    activity: (allComments || [])
      .filter((c: any) => c.task_id === p.id)
      .map((c: any) => ({
        id: c.id,
        type: "comment",
        user: c.user_name || "Usuario",
        text: c.content,
        timestamp: c.created_at
      }))
  }));

  return { success: true, data: nestedTasks };
}

export async function createOrUpdateTask(task: Task) {
  const isDemo = typeof window !== 'undefined' && localStorage.getItem('NEXION_DEMO_MODE') === 'true';
  
  if (isDemo) {
    console.log("DEMO_MODE: Using mock createOrUpdateTask");
    return { success: true, data: { ...task, id: task.id || "mock-" + Date.now() } };
  }

  const { subtasks, activity, ...taskToSave } = task;

  // 1. Upsert the main task
  const { data, error } = await supabase
    .from("task_proposals")
    .upsert({
      ...taskToSave,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id'
    })
    .select();

  if (error) {
    console.error("Error saving task:", error);
    return { success: false, error: error.message };
  }

  const savedTask = data[0];

  // 2. Handle subtasks
  if (subtasks) {
    // Optional: Delete existing subtasks that are no longer in the list? 
    // For now, just upsert.
    for (const sub of subtasks) {
      const isNew = !sub.id || typeof sub.id === 'number'; // Temporary IDs are numbers
      await supabase.from("task_proposals").upsert({
        id: isNew ? undefined : sub.id,
        parent_id: savedTask.id,
        workspace_id: task.workspace_id,
        title: sub.title,
        status: sub.status || 'todo',
        priority: sub.priority || 'medium',
        assignee_id: sub.assignee_id || task.assignee_id,
        updated_at: new Date().toISOString(),
      });
    }
  }

  // 3. Handle comments
  if (activity) {
    const comments = activity.filter(a => a.type === "comment");
    for (const comment of comments) {
      const isNew = !comment.id || typeof comment.id === 'number';
      await supabase.from("task_comments").upsert({
        id: isNew ? undefined : comment.id,
        task_id: savedTask.id,
        content: comment.text,
        user_name: comment.user,
        created_at: comment.timestamp || new Date().toISOString()
      });
    }
  }

  return { success: true, data: savedTask };
}

export async function reorderTasks(taskIds: string[]) {
  const isDemo = typeof window !== 'undefined' && localStorage.getItem('NEXION_DEMO_MODE') === 'true';
  if (isDemo) return { success: true };

  // Batch update positions
  const updates = taskIds.map((id, index) => ({
    id,
    position: index,
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from("task_proposals")
    .upsert(updates, { onConflict: 'id' });

  if (error) {
    console.error("Error reordering tasks:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteTask(id: string) {
  const { error } = await supabase
    .from("task_proposals")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting task:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
