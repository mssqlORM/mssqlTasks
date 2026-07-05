# mssqlTasks

Genkit-integrated task manager for database schema issues and LLM review task generation.

## Features

- **LLM Review Parsing** — Convert code review output into structured tasks
- **Genkit Flows** — AI-powered task extraction from natural language
- **Priority Management** — Auto-assign priority based on issue type (BUG, WARNING, TODO)
- **Task Persistence** — Save tasks to `tasks.json` for tracking

## Installation

```bash
npm install mssql-tasks
```

## Usage

```typescript
import { createTasksFromReview } from 'mssql-tasks';

const tasks = await createTasksFromReview(reviewText, workspaceDir);
```

### Genkit Flow

```typescript
import { parseReviewToTasksFlow, runFlow } from 'mssql-tasks';

const tasks = await runFlow(parseReviewToTasksFlow, reviewText);
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
| `mssqlCli` | Calls `createTasksFromReview()` after LLM code review |
| `mssqlAgent` | Uses task format for issue tracking |

## License

MIT
