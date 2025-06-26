import { Prisma } from '@prisma/client';
import * as pgmqCore from './pgmq';

export type Task = Record<string, unknown>;

export interface MessageRecord {
  msg_id: number;
  read_ct: number;
  enqueued_at: Date;
  vt: Date;
  message: Task;
}

export interface QueueMetrics {
  queue_name: string;
  queue_length: number;
  newest_msg_age_sec: number | null;
  oldest_msg_age_sec: number | null;
  total_messages: number;
  scrape_time: Date;
}

export interface QueueInfo {
  queue_name: string;
  created_at: Date;
  is_partitioned: boolean;
  is_unlogged: boolean;
}

/**
 * Prisma PGMQ Extension
 * 
 * Adds PostgreSQL Message Queue (PGMQ) functionality to Prisma Client.
 * 
 * @example
 * ```typescript
 * import { PrismaClient } from '@prisma/client';
 * import { pgmqExtension } from 'prisma-pgmq';
 * 
 * const prisma = new PrismaClient().$extends(pgmqExtension);
 * 
 * // Send a message
 * const msgId = await prisma.pgmq.send('my-queue', { userId: 123, action: 'process' });
 * 
 * // Read messages
 * const messages = await prisma.pgmq.read('my-queue', 30, 5);
 * 
 * // Delete processed messages
 * await prisma.pgmq.deleteMessage('my-queue', msgId);
 * ```
 */
export default Prisma.defineExtension((client) => {
  return client.$extends({
    name: 'prisma-pgmq',
    client: {
      pgmq: {
        /**
         * Send a single message to a queue
         */
        async send(queueName: string, msg: Task, delay?: number | Date): Promise<number> {
          return await client.$transaction(async (tx) => {
            return pgmqCore.send(tx as any, queueName, msg, delay);
          });
        },

        /**
         * Send multiple messages to a queue in a batch
         */
        async sendBatch(queueName: string, msgs: Task[], delay?: number | Date): Promise<number[]> {
          return await client.$transaction(async (tx) => {
            return pgmqCore.sendBatch(tx as any, queueName, msgs, delay);
          });
        },

        /**
         * Read messages from a queue with visibility timeout
         */
        async read(queueName: string, vt: number, qty: number = 1, conditional: Task = {}): Promise<MessageRecord[]> {
          return await client.$transaction(async (tx) => {
            return pgmqCore.read(tx as any, queueName, vt, qty, conditional);
          });
        },

        /**
         * Read messages with polling - waits for messages if none available
         */
        async readWithPoll(
          queueName: string,
          vt: number,
          qty: number = 1,
          maxPollSeconds: number = 5,
          pollIntervalMs: number = 100,
          conditional: Task = {}
        ): Promise<MessageRecord[]> {
          return await client.$transaction(async (tx) => {
            return pgmqCore.readWithPoll(tx as any, queueName, vt, qty, maxPollSeconds, pollIntervalMs, conditional);
          });
        },

        /**
         * Pop (read and delete) messages atomically
         */
        async pop(queueName: string): Promise<MessageRecord[]> {
          return await client.$transaction(async (tx) => {
            return pgmqCore.pop(tx as any, queueName);
          });
        },

        /**
         * Delete a specific message by ID
         */
        async deleteMessage(queueName: string, msgId: number): Promise<boolean> {
          return await client.$transaction(async (tx) => {
            return pgmqCore.deleteMessage(tx as any, queueName, msgId);
          });
        },

        /**
         * Delete multiple messages by IDs
         */
        async deleteBatch(queueName: string, msgIds: number[]): Promise<number[]> {
          return await client.$transaction(async (tx) => {
            return pgmqCore.deleteBatch(tx as any, queueName, msgIds);
          });
        },

        /**
         * Remove all messages from a queue
         */
        async purgeQueue(queueName: string): Promise<number> {
          return await client.$transaction(async (tx) => {
            return pgmqCore.purgeQueue(tx as any, queueName);
          });
        },

        /**
         * Archive a message (move to archive table)
         */
        async archive(queueName: string, msgId: number): Promise<boolean> {
          return await client.$transaction(async (tx) => {
            return pgmqCore.archive(tx as any, queueName, msgId);
          });
        },

        /**
         * Archive multiple messages
         */
        async archiveBatch(queueName: string, msgIds: number[]): Promise<number[]> {
          return await client.$transaction(async (tx) => {
            return pgmqCore.archiveBatch(tx as any, queueName, msgIds);
          });
        },

        /**
         * Create a new queue
         */
        async createQueue(queueName: string): Promise<void> {
          return await client.$transaction(async (tx) => {
            return pgmqCore.createQueue(tx as any, queueName);
          });
        },

        /**
         * Create a partitioned queue for high-throughput scenarios
         */
        async createPartitionedQueue(
          queueName: string,
          partitionInterval: string = '10000',
          retentionInterval: string = '100000'
        ): Promise<void> {
          return await client.$transaction(async (tx) => {
            return pgmqCore.createPartitionedQueue(tx as any, queueName, partitionInterval, retentionInterval);
          });
        },

        /**
         * Create an unlogged queue (better performance, less durability)
         */
        async createUnloggedQueue(queueName: string): Promise<void> {
          return await client.$transaction(async (tx) => {
            return pgmqCore.createUnloggedQueue(tx as any, queueName);
          });
        },

        /**
         * Detach archive from a queue
         */
        async detachArchive(queueName: string): Promise<void> {
          return await client.$transaction(async (tx) => {
            return pgmqCore.detachArchive(tx as any, queueName);
          });
        },

        /**
         * Drop a queue and all its messages
         */
        async dropQueue(queueName: string): Promise<boolean> {
          return await client.$transaction(async (tx) => {
            return pgmqCore.dropQueue(tx as any, queueName);
          });
        },

        /**
         * Set visibility timeout for a specific message
         */
        async setVt(queueName: string, msgId: number, vtOffset: number): Promise<MessageRecord> {
          return await client.$transaction(async (tx) => {
            return pgmqCore.setVt(tx as any, queueName, msgId, vtOffset);
          });
        },

        /**
         * List all queues
         */
        async listQueues(): Promise<QueueInfo[]> {
          return await client.$transaction(async (tx) => {
            return pgmqCore.listQueues(tx as any);
          });
        },

        /**
         * Get metrics for a specific queue
         */
        async metrics(queueName: string): Promise<QueueMetrics> {
          return await client.$transaction(async (tx) => {
            return pgmqCore.metrics(tx as any, queueName);
          });
        },

        /**
         * Get metrics for all queues
         */
        async metricsAll(): Promise<QueueMetrics[]> {
          return await client.$transaction(async (tx) => {
            return pgmqCore.metricsAll(tx as any);
          });
        },

        /**
         * Execute multiple PGMQ operations within a single transaction
         * 
         * @example
         * ```typescript
         * const result = await prisma.pgmq.transaction(async (pgmq) => {
         *   const msgId1 = await pgmq.send('queue1', { type: 'email', userId: 123 });
         *   const msgId2 = await pgmq.send('queue2', { type: 'sms', userId: 123 });
         *   return { msgId1, msgId2 };
         * });
         * ```
         */
        async transaction<T>(
          callback: (pgmq: {
            send: (queueName: string, msg: Task, delay?: number | Date) => Promise<number>;
            sendBatch: (queueName: string, msgs: Task[], delay?: number | Date) => Promise<number[]>;
            read: (queueName: string, vt: number, qty?: number, conditional?: Task) => Promise<MessageRecord[]>;
            readWithPoll: (queueName: string, vt: number, qty?: number, maxPollSeconds?: number, pollIntervalMs?: number, conditional?: Task) => Promise<MessageRecord[]>;
            pop: (queueName: string) => Promise<MessageRecord[]>;
            deleteMessage: (queueName: string, msgId: number) => Promise<boolean>;
            deleteBatch: (queueName: string, msgIds: number[]) => Promise<number[]>;
            purgeQueue: (queueName: string) => Promise<number>;
            archive: (queueName: string, msgId: number) => Promise<boolean>;
            archiveBatch: (queueName: string, msgIds: number[]) => Promise<number[]>;
            createQueue: (queueName: string) => Promise<void>;
            createPartitionedQueue: (queueName: string, partitionInterval?: string, retentionInterval?: string) => Promise<void>;
            createUnloggedQueue: (queueName: string) => Promise<void>;
            detachArchive: (queueName: string) => Promise<void>;
            dropQueue: (queueName: string) => Promise<boolean>;
            setVt: (queueName: string, msgId: number, vtOffset: number) => Promise<MessageRecord>;
            listQueues: () => Promise<QueueInfo[]>;
            metrics: (queueName: string) => Promise<QueueMetrics>;
            metricsAll: () => Promise<QueueMetrics[]>;
          }) => Promise<T>
        ): Promise<T> {
          return await client.$transaction(async (tx) => {
            // Create a transaction-bound version of pgmqCore
            const txPgmq = {
              send: (queueName: string, msg: Task, delay?: number | Date) => 
                pgmqCore.send(tx as any, queueName, msg, delay),
              sendBatch: (queueName: string, msgs: Task[], delay?: number | Date) => 
                pgmqCore.sendBatch(tx as any, queueName, msgs, delay),
              read: (queueName: string, vt: number, qty?: number, conditional?: Task) => 
                pgmqCore.read(tx as any, queueName, vt, qty, conditional),
              readWithPoll: (queueName: string, vt: number, qty?: number, maxPollSeconds?: number, pollIntervalMs?: number, conditional?: Task) => 
                pgmqCore.readWithPoll(tx as any, queueName, vt, qty, maxPollSeconds, pollIntervalMs, conditional),
              pop: (queueName: string) => 
                pgmqCore.pop(tx as any, queueName),
              deleteMessage: (queueName: string, msgId: number) => 
                pgmqCore.deleteMessage(tx as any, queueName, msgId),
              deleteBatch: (queueName: string, msgIds: number[]) => 
                pgmqCore.deleteBatch(tx as any, queueName, msgIds),
              purgeQueue: (queueName: string) => 
                pgmqCore.purgeQueue(tx as any, queueName),
              archive: (queueName: string, msgId: number) => 
                pgmqCore.archive(tx as any, queueName, msgId),
              archiveBatch: (queueName: string, msgIds: number[]) => 
                pgmqCore.archiveBatch(tx as any, queueName, msgIds),
              createQueue: (queueName: string) => 
                pgmqCore.createQueue(tx as any, queueName),
              createPartitionedQueue: (queueName: string, partitionInterval?: string, retentionInterval?: string) => 
                pgmqCore.createPartitionedQueue(tx as any, queueName, partitionInterval, retentionInterval),
              createUnloggedQueue: (queueName: string) => 
                pgmqCore.createUnloggedQueue(tx as any, queueName),
              detachArchive: (queueName: string) => 
                pgmqCore.detachArchive(tx as any, queueName),
              dropQueue: (queueName: string) => 
                pgmqCore.dropQueue(tx as any, queueName),
              setVt: (queueName: string, msgId: number, vtOffset: number) => 
                pgmqCore.setVt(tx as any, queueName, msgId, vtOffset),
              listQueues: () => 
                pgmqCore.listQueues(tx as any),
              metrics: (queueName: string) => 
                pgmqCore.metrics(tx as any, queueName),
              metricsAll: () => 
                pgmqCore.metricsAll(tx as any),
            };
            
            return callback(txPgmq);
          });
        },
      },
    },
  });
});