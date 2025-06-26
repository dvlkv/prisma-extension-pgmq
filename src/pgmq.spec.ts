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
} from './pgmq';

describe('PGMQ Functions with Real Database', () => {
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

  describe('Sending Messages', () => {
    describe('send', () => {
      it('should send a single message without delay', async () => {
        const message: Task = { id: 1, data: 'test' };

        const msgId = await prisma.$transaction(async (tx) => {
          return await send(tx, testQueueName, message);
        });

        expect(msgId).toBeGreaterThan(0);
      });

      it('should send a message with delay as number', async () => {
        const message: Task = { id: 1, data: 'test' };
        const delay = 5; // 5 seconds

        const msgId = await prisma.$transaction(async (tx) => {
          return await send(tx, testQueueName, message, delay);
        });

        expect(msgId).toBeGreaterThan(0);
      });

      it('should send a message with delay as Date', async () => {
        const message: Task = { id: 1, data: 'test' };
        const delay = new Date(Date.now() + 5000); // 5 seconds from now

        const msgId = await prisma.$transaction(async (tx) => {
          return await send(tx, testQueueName, message, delay);
        });

        expect(msgId).toBeGreaterThan(0);
      });
    });

    describe('sendBatch', () => {
      it('should send multiple messages without delay', async () => {
        const messages: Task[] = [
          { id: 1, data: 'test1' },
          { id: 2, data: 'test2' },
          { id: 3, data: 'test3' }
        ];

        const msgIds = await prisma.$transaction(async (tx) => {
          return await sendBatch(tx, testQueueName, messages);
        });

        expect(msgIds).toHaveLength(3);
        expect(msgIds.every(id => typeof id === 'bigint' && id > 0)).toBe(true);
      });

      it('should send multiple messages with delay', async () => {
        const messages: Task[] = [
          { id: 1, data: 'test1' },
          { id: 2, data: 'test2' }
        ];
        const delay = 10;

        const msgIds = await prisma.$transaction(async (tx) => {
          return await sendBatch(tx, testQueueName, messages, delay);
        });

        expect(msgIds).toHaveLength(2);
        expect(msgIds.every(id => typeof id === 'bigint' && id > 0)).toBe(true);
      });
    });
  });

  describe('Reading Messages', () => {
    beforeEach(async () => {
      // Send some test messages
      await prisma.$transaction(async (tx) => {
        await sendBatch(tx, testQueueName, [
          { id: 1, data: 'test1' },
          { id: 2, data: 'test2' },
          { id: 3, data: 'test3' }
        ]);
      });
    });

    describe('read', () => {
      it('should read messages with default parameters', async () => {
        const vt = 30;

        const messages = await prisma.$transaction(async (tx) => {
          return await read(tx, testQueueName, vt);
        });

        expect(messages).toHaveLength(1); // Default qty is 1
        expect(messages[0]).toHaveProperty('msg_id');
        expect(messages[0]).toHaveProperty('read_ct');
        expect(messages[0]).toHaveProperty('enqueued_at');
        expect(messages[0]).toHaveProperty('vt');
        expect(messages[0]).toHaveProperty('message');
        expect(messages[0].message).toEqual(expect.objectContaining({ id: 1, data: 'test1' }));
      });

      it('should read messages with custom quantity', async () => {
        const vt = 30;
        const qty = 2;

        const messages = await prisma.$transaction(async (tx) => {
          return await read(tx, testQueueName, vt, qty);
        });

        expect(messages).toHaveLength(2);
        expect(messages[0].message).toEqual(expect.objectContaining({ id: 1, data: 'test1' }));
        expect(messages[1].message).toEqual(expect.objectContaining({ id: 2, data: 'test2' }));
      });

      it('should read messages with conditional', async () => {
        const vt = 30;
        const conditional: Task = { id: 2 };

        const messages = await prisma.$transaction(async (tx) => {
          return await read(tx, testQueueName, vt, 1, conditional);
        });

        expect(messages).toHaveLength(1);
        expect(messages[0].message).toEqual(expect.objectContaining({ id: 2, data: 'test2' }));
      });
    });

    describe('readWithPoll', () => {
      it('should read messages with polling parameters', async () => {
        const vt = 30;
        const qty = 1;
        const maxPollSeconds = 2;
        const pollIntervalMs = 100;

        const messages = await prisma.$transaction(async (tx) => {
          return await readWithPoll(tx, testQueueName, vt, qty, maxPollSeconds, pollIntervalMs);
        });

        expect(messages).toHaveLength(1);
        expect(messages[0]).toHaveProperty('msg_id');
        expect(messages[0]).toHaveProperty('message');
      });
    });

    describe('pop', () => {
      it('should pop messages with default quantity', async () => {
        const messages = await prisma.$transaction(async (tx) => {
          return await pop(tx, testQueueName);
        });

        expect(messages).toHaveLength(1); // Default qty is 1
        expect(messages[0]).toHaveProperty('msg_id');
        expect(messages[0]).toHaveProperty('message');
      });
    });
  });

  describe('Deleting/Archiving Messages', () => {
    let msgId: number;

    beforeEach(async () => {
      // Send a test message and get its ID
      msgId = await prisma.$transaction(async (tx) => {
        return await send(tx, testQueueName, { id: 1, data: 'test' });
      });
    });

    describe('deleteMessage', () => {
      it('should delete a single message', async () => {
        const result = await prisma.$transaction(async (tx) => {
          return await deleteMessage(tx, testQueueName, msgId);
        });

        expect(result).toBe(true);
      });
    });

    describe('purgeQueue', () => {
      it('should purge all messages from queue', async () => {
        // Send some messages first
        await prisma.$transaction(async (tx) => {
          await sendBatch(tx, testQueueName, [
            { id: 1, data: 'test1' },
            { id: 2, data: 'test2' },
            { id: 3, data: 'test3' }
          ]);
        });

        const result = await prisma.$transaction(async (tx) => {
          return await purgeQueue(tx, testQueueName);
        });

        expect(result).toBeGreaterThan(0);
      });
    });

    describe('archive', () => {
      it('should archive a single message', async () => {
        const result = await prisma.$transaction(async (tx) => {
          return await archive(tx, testQueueName, msgId);
        });

        expect(result).toBe(true);
      });
    });

    describe('archiveBatch', () => {
      it('should archive multiple messages', async () => {
        const result = await prisma.$transaction(async (tx) => {
          return await archiveBatch(tx, testQueueName, [msgId]);
        });

        expect(result).toEqual([1n]); 
      });
    });
  });

  describe('Queue Management', () => {
    describe('createQueue', () => {
      it('should create a new queue', async () => {
        const newQueueName = `test_create_queue_${Date.now()}`;

        await prisma.$transaction(async (tx) => {
          await createQueue(tx, newQueueName);
        });

        // Verify queue was created by trying to send a message
        const msgId = await prisma.$transaction(async (tx) => {
          return await send(tx, newQueueName, { test: 'data' });
        });

        expect(msgId).toBeGreaterThan(0);

        // Clean up
        await prisma.$transaction(async (tx) => {
          await dropQueue(tx, newQueueName);
        });
      });
    });

    describe.skip('createPartitionedQueue', () => {
      it('should create a partitioned queue', async () => {
        const partitionedQueueName = `test_partitioned_queue_${Date.now()}`;

        await prisma.$transaction(async (tx) => {
          await createPartitionedQueue(tx, partitionedQueueName);
        });

        // Verify queue was created by trying to send a message
        const msgId = await prisma.$transaction(async (tx) => {
          return await send(tx, partitionedQueueName, { test: 'data' });
        });

        expect(msgId).toBeGreaterThan(0);

        // Clean up
        await prisma.$transaction(async (tx) => {
          await dropQueue(tx, partitionedQueueName);
        });
      });
    });

    describe('createUnloggedQueue', () => {
      it('should create an unlogged queue', async () => {
        const unloggedQueueName = `test_unlogged_queue_${Date.now()}`;

        await prisma.$transaction(async (tx) => {
          await createUnloggedQueue(tx, unloggedQueueName);
        });

        // Verify queue was created by trying to send a message
        const msgId = await prisma.$transaction(async (tx) => {
          return await send(tx, unloggedQueueName, { test: 'data' });
        });

        expect(msgId).toBeGreaterThan(0);

        // Clean up
        await prisma.$transaction(async (tx) => {
          await dropQueue(tx, unloggedQueueName);
        });
      });
    });

    describe('dropQueue', () => {
      it('should drop a queue', async () => {
        const queueToDrop = `test_drop_queue_${Date.now()}`;

        // Create a queue first
        await prisma.$transaction(async (tx) => {
          await createQueue(tx, queueToDrop);
        });

        // Drop the queue
        const result = await prisma.$transaction(async (tx) => {
          return await dropQueue(tx, queueToDrop);
        });

        expect(result).toBe(true);
      });
    });

    describe('detachArchive', () => {
      it('should detach archive from queue', async () => {
        await prisma.$transaction(async (tx) => {
          return await detachArchive(tx, testQueueName);
        });
      });
    });
  });

  describe('Utilities', () => {
    let msgId: number;

    beforeEach(async () => {
      // Send a test message
      msgId = await prisma.$transaction(async (tx) => {
        return await send(tx, testQueueName, { id: 1, data: 'test' });
      });
    });

    describe('setVt', () => {
      it('should set visibility timeout for a message', async () => {
        const vtOffset = 60;

        const message = await prisma.$transaction(async (tx) => {
          return await setVt(tx, testQueueName, msgId, vtOffset);
        });

        expect(message).toHaveProperty('msg_id', msgId);
        expect(message).toHaveProperty('read_ct');
        expect(message).toHaveProperty('enqueued_at');
        expect(message).toHaveProperty('vt');
        expect(message).toHaveProperty('message');
      });
    });

    describe('listQueues', () => {
      it('should list all queues', async () => {
        const queues = await prisma.$transaction(async (tx) => {
          return await listQueues(tx);
        });

        expect(Array.isArray(queues)).toBe(true);
        expect(queues.length).toBeGreaterThan(0);
        
        // Check if our test queue is in the list
        const testQueue = queues.find(q => q.queue_name === testQueueName);
        expect(testQueue).toBeDefined();
        expect(testQueue).toHaveProperty('queue_name');
        expect(testQueue).toHaveProperty('created_at');
        expect(testQueue).toHaveProperty('is_partitioned');
        expect(testQueue).toHaveProperty('is_unlogged');
      });
    });

    describe('metrics', () => {
      it('should get metrics for a specific queue', async () => {
        const queueMetrics = await prisma.$transaction(async (tx) => {
          return await metrics(tx, testQueueName);
        });

        expect(queueMetrics).toHaveProperty('queue_name', testQueueName);
        expect(queueMetrics).toHaveProperty('queue_length');
        expect(queueMetrics).toHaveProperty('newest_msg_age_sec');
        expect(queueMetrics).toHaveProperty('oldest_msg_age_sec');
        expect(queueMetrics).toHaveProperty('total_messages');
        expect(queueMetrics).toHaveProperty('scrape_time');
        expect(typeof queueMetrics.queue_length).toBe('bigint');
        expect(typeof queueMetrics.total_messages).toBe('bigint');
      });
    });

    describe('metricsAll', () => {
      it('should get metrics for all queues', async () => {
        const allMetrics = await prisma.$transaction(async (tx) => {
          return await metricsAll(tx);
        });

        expect(Array.isArray(allMetrics)).toBe(true);
        expect(allMetrics.length).toBeGreaterThan(0);
        
        // Check if our test queue metrics are included
        const testQueueMetrics = allMetrics.find(m => m.queue_name === testQueueName);
        expect(testQueueMetrics).toBeDefined();
        expect(testQueueMetrics).toHaveProperty('queue_name');
        expect(testQueueMetrics).toHaveProperty('queue_length');
        expect(testQueueMetrics).toHaveProperty('total_messages');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent queue gracefully', async () => {
      const nonExistentQueue = 'non_existent_queue_12345';

      await expect(
        prisma.$transaction(async (tx) => {
          return await send(tx, nonExistentQueue, { test: 'data' });
        })
      ).rejects.toThrow();
    });

    it('should handle empty message arrays in sendBatch', async () => {
      const messages: Task[] = [];

      const msgIds = await prisma.$transaction(async (tx) => {
        return await sendBatch(tx, testQueueName, messages);
      });

      expect(msgIds).toEqual([]);
    });

    it('should handle empty message arrays in deleteBatch', async () => {
      const msgIds: number[] = [];

      const result = await prisma.$transaction(async (tx) => {
        return await deleteBatch(tx, testQueueName, msgIds);
      });

      expect(result).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large message objects', async () => {
      const largeMessage: Task = {
        id: 1,
        data: 'x'.repeat(10000), // Large string
        metadata: {
          timestamp: Date.now(),
          tags: Array.from({ length: 1000 }, (_, i) => `tag-${i}`)
        }
      };

      const msgId = await prisma.$transaction(async (tx) => {
        return await send(tx, testQueueName, largeMessage);
      });

      expect(msgId).toBeGreaterThan(0);
    });

    it('should handle special characters in queue names', async () => {
      const specialQueueName = `test_queue_with_special_chars_@#$%^&*()_${Date.now()}`;

      await expect(async () => {
        await prisma.$transaction(async (tx) => {
          await createQueue(tx, specialQueueName);
        });
      }).rejects.toThrow(/ERROR: queue name contains invalid characters/);
    });

    it('should handle zero and negative values for vt', async () => {
      // Send a message first
      const msgId = await prisma.$transaction(async (tx) => {
        return await send(tx, testQueueName, { id: 1, data: 'test' });
      });

      // Try to read with zero vt
      const messages = await prisma.$transaction(async (tx) => {
        return await read(tx, testQueueName, 0);
      });

      // Should return empty array or handle gracefully
      expect(Array.isArray(messages)).toBe(true);
    });

    it('should handle very large vt values', async () => {
      // Send a message first
      const msgId = await prisma.$transaction(async (tx) => {
        return await send(tx, testQueueName, { id: 1, data: 'test' });
      });

      // Try to read with very large vt
      const messages = await prisma.$transaction(async (tx) => {
        return await read(tx, testQueueName, 999999999);
      });

      // Should handle gracefully
      expect(Array.isArray(messages)).toBe(true);
    });
  });
}); 