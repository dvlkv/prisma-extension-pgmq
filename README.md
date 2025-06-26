# Prisma PGMQ

A TypeScript library that provides a Prisma Client extension for PostgreSQL Message Queue (PGMQ), enabling type-safe message queue operations in your Prisma-based applications.

## Features

- 🔒 **Type-safe**: Full TypeScript support with proper type definitions
- 🔄 **Transaction-based**: All operations run within database transactions for data consistency
- 📝 **Raw SQL**: Direct PGMQ function calls via Prisma's raw query interface
- 🧪 **Well-tested**: Comprehensive unit and integration tests
- 📦 **Easy to use**: Simple API with both functional and class-based interfaces
- 🔌 **Prisma Integration**: Seamless integration with your existing Prisma setup

## Installation

```bash
npm install prisma-pgmq
# or
pnpm add prisma-pgmq
# or
yarn add prisma-pgmq
```

### Prerequisites

- PostgreSQL database with PGMQ extension installed
- Prisma Client v5.0.0 or higher
- Node.js 16+ 

### Installing PGMQ Extension

First, install and enable the PGMQ extension in your PostgreSQL database:

```sql
-- Install the extension (requires superuser privileges)
CREATE EXTENSION IF NOT EXISTS pgmq;
```

For more details on installing PGMQ, see the [official PGMQ documentation](https://github.com/tembo-io/pgmq).

## Quick Start

### Extension API (Recommended)

The Prisma Client extension provides automatic transaction management and seamless integration:

```typescript
import { PrismaClient } from '@prisma/client';
import { pgmqExtension } from 'prisma-pgmq';

const prisma = new PrismaClient().$extends(pgmqExtension);

// Create a queue
await prisma.pgmq.createQueue('my-work-queue');

// Send a message
const msgId = await prisma.pgmq.send('my-work-queue', {
  userId: 123,
  action: 'send-email',
  email: 'user@example.com'
});

// Read and process messages
const messages = await prisma.pgmq.read('my-work-queue', 30, 5);

for (const message of messages) {
  console.log('Processing message:', message.message);
  
  // Process the message...
  
  // Delete the message when done
  await prisma.pgmq.deleteMessage('my-work-queue', message.msg_id);
}
```

### Functional API (Advanced Usage)

For advanced usage, you can access the core functions directly within transactions:

```typescript
import { PrismaClient } from '@prisma/client';
import * as pgmq from 'prisma-pgmq';

const prisma = new PrismaClient();

// Create a queue
await prisma.$transaction(async (tx) => {
  await pgmq.createQueue(tx, 'my-work-queue');
});

// Send a message
await prisma.$transaction(async (tx) => {
  const msgId = await pgmq.send(tx, 'my-work-queue', {
    userId: 123,
    action: 'send-email',
    email: 'user@example.com'
  });
  console.log('Message sent with ID:', msgId);
});
```

### Manual Transaction Management

For complex operations spanning multiple PGMQ calls:

```typescript
const result = await prisma.pgmq.transaction(async (pgmq) => {
  // Send multiple related messages
  const msgId1 = await pgmq.send('queue1', { type: 'user-signup', userId: 123 });
  const msgId2 = await pgmq.send('queue2', { type: 'send-welcome-email', userId: 123 });
  
  // Update queue metrics
  const metrics = await pgmq.metrics('queue1');
  
  return { msgId1, msgId2, queueLength: metrics.queue_length };
});
```

## API Reference

### Message Operations

#### `send(queueName, message, delay?)`
Send a single message to a queue.

```typescript
// Send immediately
const msgId = await prisma.pgmq.send('my-queue', { data: 'hello' });

// Send with delay (seconds)
const msgId = await prisma.pgmq.send('my-queue', { data: 'hello' }, 30);

// Send with specific time
const msgId = await prisma.pgmq.send('my-queue', { data: 'hello' }, new Date('2024-01-01T10:00:00Z'));
```

#### `sendBatch(queueName, messages, delay?)`
Send multiple messages to a queue in a single operation.

```typescript
const msgIds = await prisma.pgmq.sendBatch('my-queue', [
  { id: 1, data: 'message 1' },
  { id: 2, data: 'message 2' },
  { id: 3, data: 'message 3' }
]);
```

#### `read(queueName, vt, qty?, conditional?)`
Read messages from a queue with visibility timeout.

```typescript
// Read up to 5 messages with 30 second visibility timeout
const messages = await prisma.pgmq.read('my-queue', 30, 5);

// Read with conditional filtering
const messages = await prisma.pgmq.read('my-queue', 30, 5, { priority: 'high' });
```

#### `readWithPoll(queueName, vt, qty?, maxPollSeconds?, pollIntervalMs?, conditional?)`
Read messages with polling (wait for messages if none available).

```typescript
// Poll for up to 10 seconds, checking every 500ms
const messages = await prisma.pgmq.readWithPoll('my-queue', 30, 1, 10, 500);
```

#### `pop(queueName)`
Read and immediately delete a message (atomic operation).

```typescript
const messages = await prisma.pgmq.pop('my-queue');
```

### Message Management

#### `deleteMessage(queueName, msgId)`
Delete a specific message.

```typescript
const deleted = await prisma.pgmq.deleteMessage('my-queue', 123);
```

#### `deleteBatch(queueName, msgIds)`
Delete multiple messages.

```typescript
const deletedIds = await prisma.pgmq.deleteBatch('my-queue', [123, 124, 125]);
```

#### `archive(queueName, msgId)`
Archive a message (move to archive table).

```typescript
const archived = await prisma.pgmq.archive('my-queue', 123);
```

#### `archiveBatch(queueName, msgIds)`
Archive multiple messages.

```typescript
const archivedIds = await prisma.pgmq.archiveBatch('my-queue', [123, 124, 125]);
```

### Queue Management

#### `createQueue(queueName)`
Create a new queue.

```typescript
await prisma.pgmq.createQueue('my-new-queue');
```

#### `createPartitionedQueue(queueName, partitionInterval?, retentionInterval?)`
Create a partitioned queue for high-throughput scenarios.

```typescript
await prisma.pgmq.createPartitionedQueue('high-volume-queue', '10000', '100000');
```

#### `createUnloggedQueue(queueName)`
Create an unlogged queue (better performance, less durability).

```typescript
await prisma.pgmq.createUnloggedQueue('temp-queue');
```

#### `dropQueue(queueName)`
Delete a queue and all its messages.

```typescript
const dropped = await prisma.pgmq.dropQueue('old-queue');
```

#### `purgeQueue(queueName)`
Remove all messages from a queue.

```typescript
const messageCount = await prisma.pgmq.purgeQueue('my-queue');
```

### Utilities

#### `setVt(queueName, msgId, vtOffset)`
Set visibility timeout for a specific message.

```typescript
const message = await prisma.pgmq.setVt('my-queue', 123, 60); // 60 seconds
```

#### `listQueues()`
Get information about all queues.

```typescript
const queues = await prisma.pgmq.listQueues();
console.log(queues); // [{ queue_name: 'my-queue', created_at: ..., is_partitioned: false }]
```

#### `metrics(queueName)`
Get metrics for a specific queue.

```typescript
const metrics = await prisma.pgmq.metrics('my-queue');
console.log(metrics);
// {
//   queue_name: 'my-queue',
//   queue_length: 5n,
//   newest_msg_age_sec: 10,
//   oldest_msg_age_sec: 300,
//   total_messages: 1000n,
//   scrape_time: 2024-01-01T10:00:00.000Z
// }
```

#### `metricsAll()`
Get metrics for all queues.

```typescript
const allMetrics = await prisma.pgmq.metricsAll();
```

## Type Definitions

### `Task`
```typescript
type Task = Record<string, unknown>;
```

### `MessageRecord`
```typescript
interface MessageRecord {
  msg_id: number;
  read_ct: number;
  enqueued_at: Date;
  vt: Date;
  message: Task;
}
```

### `QueueMetrics`
```typescript
interface QueueMetrics {
  queue_name: string;
  queue_length: number;
  newest_msg_age_sec: number | null;
  oldest_msg_age_sec: number | null;
  total_messages: number;
  scrape_time: Date;
}
```

### `QueueInfo`
```typescript
interface QueueInfo {
  queue_name: string;
  created_at: Date;
  is_partitioned: boolean;
  is_unlogged: boolean;
}
```

## Testing

The library includes both unit and integration tests:

```bash
# Run all tests
pnpm test

# Run only unit tests (no database required)
pnpm test:unit

# Run only integration tests (requires database)
pnpm test:db

# Run tests with coverage
pnpm test:coverage

# Watch mode for development
pnpm test:watch
```

### Setting up Integration Tests

Integration tests require a PostgreSQL database with the PGMQ extension. Set up your test database and configure the connection string in your environment.

## Best Practices

### 1. Use Appropriate Visibility Timeouts
Choose visibility timeouts based on your message processing time:

```typescript
// For quick operations (30 seconds)
const messages = await prisma.pgmq.read('quick-tasks', 30);

// For longer operations (5 minutes)
const messages = await prisma.pgmq.read('heavy-tasks', 300);
```

### 2. Handle Message Processing Failures
Always delete or archive messages after successful processing:

```typescript
const messages = await prisma.pgmq.read('my-queue', 30, 10);

for (const message of messages) {
  try {
    await processMessage(message.message);
    await prisma.pgmq.deleteMessage('my-queue', message.msg_id);
  } catch (error) {
    // Handle error - message will become visible again after timeout
    console.error('Failed to process message:', error);
    // Optionally archive failed messages
    await prisma.pgmq.archive('my-queue', message.msg_id);
  }
}
```

### 3. Use Transactions for Related Operations
Group related PGMQ operations in transactions:

```typescript
await prisma.pgmq.transaction(async (pgmq) => {
  // Send notification message
  const notificationId = await pgmq.send('notifications', {
    type: 'order-confirmation',
    orderId: order.id
  });
  
  // Send processing message
  const processingId = await pgmq.send('order-processing', {
    orderId: order.id,
    notificationId
  });
  
  return { notificationId, processingId };
});
```

### 4. Monitor Queue Metrics
Regularly check queue metrics to ensure healthy operation:

```typescript
const metrics = await prisma.pgmq.metrics('my-queue');

if (metrics.queue_length > 1000) {
  console.warn('Queue is getting full:', metrics.queue_length);
}

if (metrics.oldest_msg_age_sec && metrics.oldest_msg_age_sec > 3600) {
  console.warn('Messages are getting stale:', metrics.oldest_msg_age_sec);
}
```

## Examples

### Basic Worker Pattern

```typescript
import { PrismaClient } from '@prisma/client';
import { pgmqExtension } from 'prisma-pgmq';

const prisma = new PrismaClient().$extends(pgmqExtension);

// Producer
async function sendTask(taskData: any) {
  await prisma.pgmq.send('work-queue', {
    type: 'process-user-data',
    data: taskData,
    timestamp: Date.now()
  });
}

// Consumer
async function processMessages() {
  while (true) {
    const messages = await prisma.pgmq.readWithPoll('work-queue', 30, 5, 10, 1000);
    
    for (const message of messages) {
      try {
        // Process the message
        await handleTask(message.message);
        
        // Delete on success
        await prisma.pgmq.deleteMessage('work-queue', message.msg_id);
      } catch (error) {
        console.error('Task failed:', error);
        // Archive failed messages for later analysis
        await prisma.pgmq.archive('work-queue', message.msg_id);
      }
    }
  }
}

async function handleTask(task: any) {
  // Your business logic here
  console.log('Processing task:', task.type);
}
```

### Delayed Message Scheduling

```typescript
// Schedule a message for later processing
const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

await prisma.pgmq.send('scheduled-tasks', {
  type: 'send-reminder',
  userId: 123,
  reminder: 'Your subscription expires tomorrow'
}, futureDate);
```

### Priority Queue Pattern

```typescript
// Send high-priority message
await prisma.pgmq.send('tasks', {
  priority: 'high',
  type: 'urgent-processing',
  data: urgentData
});

// Read high-priority messages first
const highPriorityMessages = await prisma.pgmq.read('tasks', 30, 10, { priority: 'high' });

if (highPriorityMessages.length === 0) {
  // Fall back to normal priority
  const normalMessages = await prisma.pgmq.read('tasks', 30, 10, { priority: 'normal' });
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-username/prisma-pgmq.git
cd prisma-pgmq

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build the library
pnpm build

# Watch for changes during development
pnpm dev
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [PGMQ](https://github.com/tembo-io/pgmq) - PostgreSQL Message Queue extension
- [Prisma](https://www.prisma.io/) - Next-generation ORM for TypeScript & Node.js

## Related Projects

- [pgmq](https://github.com/tembo-io/pgmq) - The core PostgreSQL extension
- [pgmq-js](https://github.com/tembo-io/pgmq-js) - Alternative JavaScript client
