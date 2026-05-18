import { loadConfig } from './config.js';
import { createTaskBuilderServer } from './server.js';
import { TasksStore } from './tasks-store.js';

const config = loadConfig();
const store = new TasksStore(config);

const { port } = await createTaskBuilderServer(config, store);
console.log(`figma-task-builder listening on http://${config.httpHost}:${port}`);
console.log(`  drafts: ${config.tasksDir}`);
console.log(`  harbor: ${config.harborTasksDir}`);
