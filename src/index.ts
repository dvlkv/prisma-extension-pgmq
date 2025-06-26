// Prisma Client extension (recommended)
export { default as pgmqExtension } from './pgmq-extension';

// Type exports
export type {
  Task,
  MessageRecord,
  QueueMetrics,
  QueueInfo,
} from './pgmq-extension';

export * as pgmq from './pgmq';