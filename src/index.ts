import { genkit, defineFlow, defineTool, runFlow, z } from 'genkit';
import * as fs from 'fs';
import * as path from 'path';

// ─── Genkit Instance ─────────────────────────────────────────────────────────

export const ai = genkit({});

// ─── Types ───────────────────────────────────────────────────────────────────

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['todo', 'in-progress', 'done']),
  file: z.string().optional(),
  createdAt: z.string(),
});

export type Task = z.infer<typeof TaskSchema>;

// ─── Tools ───────────────────────────────────────────────────────────────────

export const createTaskTool = defineTool(
  {
    name: 'createTask',
    description: 'Create a new task from a code review issue. Extract the issue type, description, and assign priority.',
    inputSchema: z.object({
      type: z.enum(['BUG', 'WARNING', 'TODO', 'ISSUE', 'OPTIMIZATION', 'CONCERN']),
      description: z.string(),
      file: z.string().optional(),
    }),
    outputSchema: TaskSchema,
  },
  async (input) => {
    let priority: 'low' | 'medium' | 'high' = 'medium';
    if (input.type === 'BUG' || input.type === 'WARNING') priority = 'high';
    else if (input.type === 'TODO') priority = 'low';

    return {
      id: `TASK-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: `[LLM Review] ${input.type}: ${input.description.slice(0, 50)}${input.description.length > 50 ? '...' : ''}`,
      description: input.description,
      priority,
      status: 'todo',
      file: input.file,
      createdAt: new Date().toISOString(),
    };
  }
);

export const listTasksTool = defineTool(
  {
    name: 'listTasks',
    description: 'List all tasks from the tasks.json file in the workspace.',
    inputSchema: z.object({
      workspaceDir: z.string(),
      status: z.enum(['todo', 'in-progress', 'done']).optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
    }),
    outputSchema: z.array(TaskSchema),
  },
  async (input) => {
    const tasksFilePath = path.join(input.workspaceDir, 'tasks.json');
    if (!fs.existsSync(tasksFilePath)) return [];

    const tasks: Task[] = JSON.parse(fs.readFileSync(tasksFilePath, 'utf8'));
    let filtered = tasks;
    if (input.status) filtered = filtered.filter(t => t.status === input.status);
    if (input.priority) filtered = filtered.filter(t => t.priority === input.priority);
    return filtered;
  }
);

export const updateTaskTool = defineTool(
  {
    name: 'updateTask',
    description: 'Update a task status or fields in tasks.json.',
    inputSchema: z.object({
      workspaceDir: z.string(),
      taskId: z.string(),
      status: z.enum(['todo', 'in-progress', 'done']).optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
    }),
    outputSchema: TaskSchema.nullable(),
  },
  async (input) => {
    const tasksFilePath = path.join(input.workspaceDir, 'tasks.json');
    if (!fs.existsSync(tasksFilePath)) return null;

    const tasks: Task[] = JSON.parse(fs.readFileSync(tasksFilePath, 'utf8'));
    const task = tasks.find(t => t.id === input.taskId);
    if (!task) return null;

    if (input.status) task.status = input.status;
    if (input.priority) task.priority = input.priority;

    fs.writeFileSync(tasksFilePath, JSON.stringify(tasks, null, 2));
    return task;
  }
);

// ─── Flows ───────────────────────────────────────────────────────────────────

// Regex-based flow (fast, no LLM needed)
export const parseReviewToTasksFlow = defineFlow(
  {
    name: 'parseReviewToTasks',
    inputSchema: z.string(),
    outputSchema: z.array(TaskSchema),
  },
  async (reviewText) => {
    const tasks: Task[] = [];
    const lines = reviewText.split('\n');
    let taskIdCounter = 1;

    for (const line of lines) {
      const trimmed = line.trim();
      const issueMatch = trimmed.match(/^-\s*(BUG|WARNING|TODO|ISSUE|OPTIMIZATION|CONCERN)\b:?\s*(.*)$/i) ||
                         trimmed.match(/^-\s*\[\s*\]\s*(.*)$/);

      if (issueMatch) {
        const type = (issueMatch[1] || 'ISSUE') as string;
        const description = issueMatch[2] || issueMatch[1];

        let priority: 'low' | 'medium' | 'high' = 'medium';
        if (type.toUpperCase() === 'BUG' || type.toUpperCase() === 'WARNING') priority = 'high';
        else if (type.toUpperCase() === 'TODO') priority = 'low';

        tasks.push({
          id: `TASK-${Date.now()}-${taskIdCounter++}`,
          title: `[LLM Review] ${type}: ${description.slice(0, 50)}${description.length > 50 ? '...' : ''}`,
          description,
          priority,
          status: 'todo',
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Fallback: extract bullet points if no structured issues found
    if (tasks.length === 0) {
      let currentSection = '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('###') || trimmed.startsWith('##')) {
          currentSection = trimmed.replace(/^#+\s*/, '');
        } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          const desc = trimmed.replace(/^[-*]\s*/, '');
          tasks.push({
            id: `TASK-${Date.now()}-${taskIdCounter++}`,
            title: `[LLM Review] ${currentSection || 'Issue'}: ${desc.slice(0, 50)}`,
            description: desc,
            priority: 'medium',
            status: 'todo',
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    return tasks;
  }
);

// LLM-powered flow (smarter extraction using Genkit generate)
export const aiParseReviewToTasksFlow = defineFlow(
  {
    name: 'aiParseReviewToTasks',
    inputSchema: z.string(),
    outputSchema: z.array(TaskSchema),
  },
  async (reviewText) => {
    const { output } = await ai.generate({
      model: 'openai/gpt-4o-mini',
      prompt: `You are a code review analyst. Parse the following code review output into structured tasks.

For each issue found, extract:
- type: BUG, WARNING, TODO, ISSUE, OPTIMIZATION, or CONCERN
- description: The full issue description
- file: The file path if mentioned
- priority: high (for BUG/WARNING), medium (for ISSUE/OPTIMIZATION), low (for TODO/CONCERN)

Return a JSON array of tasks. Only return the JSON, no other text.

Code Review:
${reviewText}`,
      output: { schema: z.array(TaskSchema) },
    });

    return output ?? [];
  }
);

// ─── Helper Functions ────────────────────────────────────────────────────────

export async function createTasksFromReview(reviewText: string, workspaceDir: string, useAI = false): Promise<Task[]> {
  const tasks = useAI
    ? await runFlow(aiParseReviewToTasksFlow, reviewText)
    : await runFlow(parseReviewToTasksFlow, reviewText);

  if (tasks.length > 0) {
    const tasksFilePath = path.join(workspaceDir, 'tasks.json');
    let existingTasks: Task[] = [];
    if (fs.existsSync(tasksFilePath)) {
      try {
        existingTasks = JSON.parse(fs.readFileSync(tasksFilePath, 'utf8'));
      } catch { /* ignore */ }
    }
    existingTasks.push(...tasks);
    fs.writeFileSync(tasksFilePath, JSON.stringify(existingTasks, null, 2));
    console.log(`\n📋 [Genkit Flow] Created ${tasks.length} tasks from LLM Review in ${tasksFilePath}`);
  }
  return tasks;
}

export async function getTasks(workspaceDir: string, filters?: { status?: string; priority?: string }): Promise<Task[]> {
  return runFlow(listTasksTool, { workspaceDir, ...filters } as any);
}

export async function updateTask(workspaceDir: string, taskId: string, updates: { status?: string; priority?: string }): Promise<Task | null> {
  return runFlow(updateTaskTool as any, { workspaceDir, taskId, ...updates } as any);
}
