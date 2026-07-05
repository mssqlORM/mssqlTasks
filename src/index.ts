import { defineFlow, runFlow } from '@genkit-ai/flow';
import * as fs from 'fs';
import * as path from 'path';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'done';
  file?: string;
  createdAt: string;
}

// Genkit Flow to parse code review into structured tasks
export const parseReviewToTasksFlow = defineFlow(
  {
    name: 'parseReviewToTasks',
  },
  async (reviewText: string): Promise<Task[]> => {
    const tasks: Task[] = [];
    const lines = reviewText.split('\n');
    let taskIdCounter = 1;

    for (const line of lines) {
      const trimmed = line.trim();
      const issueMatch = trimmed.match(/^-\s*(BUG|WARNING|TODO|ISSUE|OPTIMIZATION|CONCERN)\b:?\s*(.*)$/i) || 
                         trimmed.match(/^-\s*\[\s*\]\s*(.*)$/);
      
      if (issueMatch) {
        const type = issueMatch[1] || 'ISSUE';
        const description = issueMatch[2] || issueMatch[1];
        
        let priority: 'low' | 'medium' | 'high' = 'medium';
        if (type.toUpperCase() === 'BUG' || type.toUpperCase() === 'WARNING') {
          priority = 'high';
        } else if (type.toUpperCase() === 'TODO') {
          priority = 'low';
        }

        tasks.push({
          id: `TASK-${Date.now()}-${taskIdCounter++}`,
          title: `[LLM Review] ${type}: ${description.slice(0, 50)}${description.length > 50 ? '...' : ''}`,
          description,
          priority,
          status: 'todo',
          createdAt: new Date().toISOString()
        });
      }
    }

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
            createdAt: new Date().toISOString()
          });
        }
      }
    }

    return tasks;
  }
);

export async function createTasksFromReview(reviewText: string, workspaceDir: string): Promise<Task[]> {
  const tasks = await runFlow(parseReviewToTasksFlow, reviewText);
  if (tasks.length > 0) {
    const tasksFilePath = path.join(workspaceDir, 'tasks.json');
    let existingTasks: Task[] = [];
    if (fs.existsSync(tasksFilePath)) {
      try {
        existingTasks = JSON.parse(fs.readFileSync(tasksFilePath, 'utf8'));
      } catch {}
    }
    existingTasks.push(...tasks);
    fs.writeFileSync(tasksFilePath, JSON.stringify(existingTasks, null, 2));
    console.log(`\n📋 [Genkit Flow] Created ${tasks.length} tasks from LLM Review in ${tasksFilePath}`);
  }
  return tasks;
}
