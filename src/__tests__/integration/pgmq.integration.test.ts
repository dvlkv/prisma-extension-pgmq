// Integration tests - require actual database connection
// To run: npm run test:db

import { PrismaClient } from '@prisma/client';
import {
  send,
  sendBatch,
  read,
  readWithPoll,
  pop,
  deleteMessage,
  purgeQueue,
  archive,
  archiveBatch,
  createQueue,
  createPartitionedQueue,
  createUnloggedQueue,
  detachArchive,
  dropQueue,
  setVt,
  listQueues,
  metrics,
  metricsAll,
  type Task,
  deleteBatch
} from '../../pgmq';

describe('PGMQ Integration Tests (requires database)', () => {
  let prisma: PrismaClient;
  let testQueueName: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Generate unique queue name for each test
    testQueueName = `test_queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create a test queue
    await prisma.$transaction(async (tx) => {
      await createQueue(tx, testQueueName);
    });
  });

  afterEach(async () => {
    // Clean up test queue
    try {
      await prisma.$transaction(async (tx) => {
        await dropQueue(tx, testQueueName);
      });
    } catch (error) {
      // Queue might already be dropped, ignore errors
    }
  });

  describe('Basic Operations', () => {
    it('should send and read messages', async () => {
      const message: Task = { id: 1, data: 'test message' };

      // Send message
      const msgId = await prisma.$transaction(async (tx) => {
        return await send(tx, testQueueName, message);
      });

      expect(msgId).toBeGreaterThan(0);

      // Read message
      const messages = await prisma.$transaction(async (tx) => {
        return await read(tx, testQueueName, 30);
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]?.message).toEqual(message);
    });

    it('should handle batch operations', async () => {
      const messages: Task[] = [
        { id: 1, data: 'test1' },
        { id: 2, data: 'test2' },
        { id: 3, data: 'test3' }
      ];

      // Send batch
      const msgIds = await prisma.$transaction(async (tx) => {
        return await sendBatch(tx, testQueueName, messages);
      });

      expect(msgIds).toHaveLength(3);

      // Read messages
      const readMessages = await prisma.$transaction(async (tx) => {
        return await read(tx, testQueueName, 30, 3);
      });

      expect(readMessages).toHaveLength(3);
    });

    it('should delete messages correctly', async () => {
      const message: Task = { id: 1, data: 'test' };

      // Send message
      const msgId = await prisma.$transaction(async (tx) => {
        return await send(tx, testQueueName, message);
      });

      // Delete message
      const deleted = await prisma.$transaction(async (tx) => {
        return await deleteMessage(tx, testQueueName, msgId);
      });

      expect(deleted).toBe(true);
    });
  });

  describe('Queue Management', () => {
    it('should create and drop queues', async () => {
      const tempQueueName = `temp_queue_${Date.now()}`;

      // Create queue
      await prisma.$transaction(async (tx) => {
        await createQueue(tx, tempQueueName);
      });

      // Verify queue exists by sending a message
      const msgId = await prisma.$transaction(async (tx) => {
        return await send(tx, tempQueueName, { test: 'data' });
      });

      expect(msgId).toBeGreaterThan(0);

      // Drop queue
      const dropped = await prisma.$transaction(async (tx) => {
        return await dropQueue(tx, tempQueueName);
      });

      expect(dropped).toBe(true);
    });

    it('should list queues', async () => {
      const queues = await prisma.$transaction(async (tx) => {
        return await listQueues(tx);
      });

      expect(Array.isArray(queues)).toBe(true);
      expect(queues.some(q => q.queue_name === testQueueName)).toBe(true);
    });

    it('should get queue metrics', async () => {
      // Send some messages first
      await prisma.$transaction(async (tx) => {
        await sendBatch(tx, testQueueName, [
          { id: 1, data: 'test1' },
          { id: 2, data: 'test2' }
        ]);
      });

      const queueMetrics = await prisma.$transaction(async (tx) => {
        return await metrics(tx, testQueueName);
      });

      expect(queueMetrics.queue_name).toBe(testQueueName);
      expect(typeof queueMetrics.queue_length).toBe('bigint');
      expect(typeof queueMetrics.total_messages).toBe('bigint');
    });
  });

  describe('Advanced Features', () => {
    it('should handle message visibility timeout', async () => {
      const message: Task = { id: 1, data: 'test' };

      // Send message
      const msgId = await prisma.$transaction(async (tx) => {
        return await send(tx, testQueueName, message);
      });

      // Set visibility timeout
      const updatedMessage = await prisma.$transaction(async (tx) => {
        return await setVt(tx, testQueueName, msgId, 60);
      });

      expect(updatedMessage.msg_id).toBe(msgId);
    });

    it('should handle polling read', async () => {
      // This test may take longer due to polling
      const message: Task = { id: 1, data: 'test' };

      // Send message
      await prisma.$transaction(async (tx) => {
        return await send(tx, testQueueName, message);
      });

      // Poll for messages
      const messages = await prisma.$transaction(async (tx) => {
        return await readWithPoll(tx, testQueueName, 30, 1, 2, 100);
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]?.message).toEqual(message);
    });

    it('should archive messages', async () => {
      const message: Task = { id: 1, data: 'test' };

      // Send message
      const msgId = await prisma.$transaction(async (tx) => {
        return await send(tx, testQueueName, message);
      });

      // Archive message
      const archived = await prisma.$transaction(async (tx) => {
        return await archive(tx, testQueueName, msgId);
      });

      expect(archived).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent queue', async () => {
      const nonExistentQueue = 'non_existent_queue_12345';

      await expect(
        prisma.$transaction(async (tx) => {
          return await send(tx, nonExistentQueue, { test: 'data' });
        })
      ).rejects.toThrow();
    });

    it('should handle invalid message IDs', async () => {
      const invalidMsgId = 999999;

      const result = await prisma.$transaction(async (tx) => {
        return await deleteMessage(tx, testQueueName, invalidMsgId);
      });

      // Should return false for non-existent message
      expect(result).toBe(false);
    });
  });
});