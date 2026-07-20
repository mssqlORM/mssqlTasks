# an5Tasks

Genkit v1.39-powered task manager for database schema issues and LLM review task generation.

## Features

- **Regex-based task extraction** — Fast, no LLM needed
- **AI-powered task extraction** — Smarter extraction using Genkit `generate()`
- **Task management tools** — Create, list, update tasks
- **Genkit tools** — Register tools for LLM tool-calling

## Installation

```bash
npm install an5-tasks
```

## Usage

```typescript
import { createTasksFromReview, getTasks, updateTask } from 'an5-tasks';

// Regex-based (fast, no LLM)
const tasks = await createTasksFromReview(reviewText, workspaceDir);

// AI-powered (smarter extraction)
const tasks = await createTasksFromReview(reviewText, workspaceDir, true);

// List tasks
const todoTasks = await getTasks(workspaceDir, { status: 'todo' });

// Update task
await updateTask(workspaceDir, 'TASK-1234', { status: 'done' });
```

### Genkit Flows

```typescript
import { runFlow } from 'genkit';
import { parseReviewToTasksFlow, aiParseReviewToTasksFlow } from 'an5-tasks';

// Regex-based
const tasks = await runFlow(parseReviewToTasksFlow, reviewText);

// AI-powered
const tasks = await runFlow(aiParseReviewToTasksFlow, reviewText);
```

### Genkit Tools

```typescript
import { ai, createTaskTool, listTasksTool } from 'an5-tasks';

// Create a task
const task = await ai.run(createTaskTool, {
  type: 'BUG',
  description: 'Null pointer in UserService',
});

// List tasks
const tasks = await ai.run(listTasksTool, {
  workspaceDir: '/path/to/workspace',
});
```

## Task Format

```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'done';
  file?: string;
  createdAt: string;
}
```

## Development

```bash
npm run build    # Compile TypeScript
npm test         # Run smoke tests
```

## Cross-Repo

| Consumer | How |
|----------|-----|
| `an5Cli` | Calls `createTasksFromReview()` after LLM code review |
| `an5Agent` | Uses task format for issue tracking |

## Genkit Features

| Feature | Status |
|---------|--------|
| `genkit()` | ✅ Used |
| `defineFlow()` | ✅ Used |
| `defineTool()` | ✅ Used |
| `runFlow()` | ✅ Used |
| `generate()` | ✅ Used |
| `definePrompt()` | Available |
| Session/memory | Available |
| Streaming | Available |

See [docs/genkit.md](../docs/genkit.md) for full Genkit integration guide.

## License

MIT
