import { PrismaClient, Prisma } from '@prisma/client';
import * as pgmq from './pgmq';
import type { Task, MessageRecord, QueueMetrics, QueueInfo } from './pgmq';

/**
 * PrismaPGMQ - A wrapper class for convenient usage of PGMQ functions
 * 
 * This class provides a more convenient interface for using PGMQ functions
 * while maintaining the transaction-based approach for data consistency.
 * 
 * @example
 * ```typescript
 * const client = new PrismaPGMQ(prisma);
 * 
 * // Send a message
 * const msgId = await client.send('my-queue', { data: 'hello' });
 * 
 * // Read messages
 * const messages = await client.read('my-queue', 30);
 * ```
 */
export class PrismaPGMQ {
  constructor(private prisma: PrismaClient) {}

  /**
   * Execute PGMQ operations within a transaction
   */
  async transaction<T>(
    callback: (pgmq: PGMQTransactionClient) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const pgmqClient = new PGMQTransactionClient(tx);
      return callback(pgmqClient);
    });
  }

  // Convenience methods that auto-wrap in transactions
  async send(queueName: string, msg: Task, delay?: number | Date): Promise<number> {
    return this.transaction(async (tx) => tx.send(queueName, msg, delay));
  }

  async sendBatch(queueName: string, msgs: Task[], delay?: number | Date): Promise<number[]> {
    return this.transaction(async (tx) => tx.sendBatch(queueName, msgs, delay));
  }

  async read(queueName: string, vt: number, qty = 1, conditional: Task = {}): Promise<MessageRecord[]> {
    return this.transaction(async (tx) => tx.read(queueName, vt, qty, conditional));
  }

  async readWithPoll(
    queueName: string,
    vt: number,
    qty = 1,
    maxPollSeconds = 5,
    pollIntervalMs = 100,
    conditional: Task = {}
  ): Promise<MessageRecord[]> {
    return this.transaction(async (tx) => 
      tx.readWithPoll(queueName, vt, qty, maxPollSeconds, pollIntervalMs, conditional)
    );
  }

  async pop(queueName: string): Promise<MessageRecord[]> {
    return this.transaction(async (tx) => tx.pop(queueName));
  }

  async deleteMessage(queueName: string, msgId: number): Promise<boolean> {
    return this.transaction(async (tx) => tx.deleteMessage(queueName, msgId));
  }

  async deleteBatch(queueName: string, msgIds: number[]): Promise<number[]> {
    return this.transaction(async (tx) => tx.deleteBatch(queueName, msgIds));
  }

  async purgeQueue(queueName: string): Promise<number> {
    return this.transaction(async (tx) => tx.purgeQueue(queueName));
  }

  async archive(queueName: string, msgId: number): Promise<boolean> {
    return this.transaction(async (tx) => tx.archive(queueName, msgId));
  }

  async archiveBatch(queueName: string, msgIds: number[]): Promise<number[]> {
    return this.transaction(async (tx) => tx.archiveBatch(queueName, msgIds));
  }

  async createQueue(queueName: string): Promise<void> {
    return this.transaction(async (tx) => tx.createQueue(queueName));
  }

  async createPartitionedQueue(queueName: string, partitionInterval = '10000', retentionInterval = '100000'): Promise<void> {
    return this.transaction(async (tx) => tx.createPartitionedQueue(queueName, partitionInterval, retentionInterval));
  }

  async createUnloggedQueue(queueName: string): Promise<void> {
    return this.transaction(async (tx) => tx.createUnloggedQueue(queueName));
  }

  async detachArchive(queueName: string): Promise<void> {
    return this.transaction(async (tx) => tx.detachArchive(queueName));
  }

  async dropQueue(queueName: string): Promise<boolean> {
    return this.transaction(async (tx) => tx.dropQueue(queueName));
  }

  async setVt(queueName: string, msgId: number, vtOffset: number): Promise<MessageRecord> {
    return this.transaction(async (tx) => tx.setVt(queueName, msgId, vtOffset));
  }

  async listQueues(): Promise<QueueInfo[]> {
    return this.transaction(async (tx) => tx.listQueues());
  }

  async metrics(queueName: string): Promise<QueueMetrics> {
    return this.transaction(async (tx) => tx.metrics(queueName));
  }

  async metricsAll(): Promise<QueueMetrics[]> {
    return this.transaction(async (tx) => tx.metricsAll());
  }
}

/**
 * Transaction-scoped PGMQ client
 * This provides the same interface as the module functions but bound to a transaction
 */
export class PGMQTransactionClient {
  constructor(private tx: Prisma.TransactionClient) {}

  async send(queueName: string, msg: Task, delay?: number | Date): Promise<number> {
    return pgmq.send(this.tx, queueName, msg, delay);
  }

  async sendBatch(queueName: string, msgs: Task[], delay?: number | Date): Promise<number[]> {
    return pgmq.sendBatch(this.tx, queueName, msgs, delay);
  }

  async read(queueName: string, vt: number, qty = 1, conditional: Task = {}): Promise<MessageRecord[]> {
    return pgmq.read(this.tx, queueName, vt, qty, conditional);
  }

  async readWithPoll(
    queueName: string,
    vt: number,
    qty = 1,
    maxPollSeconds = 5,
    pollIntervalMs = 100,
    conditional: Task = {}
  ): Promise<MessageRecord[]> {
    return pgmq.readWithPoll(this.tx, queueName, vt, qty, maxPollSeconds, pollIntervalMs, conditional);
  }

  async pop(queueName: string): Promise<MessageRecord[]> {
    return pgmq.pop(this.tx, queueName);
  }

  async deleteMessage(queueName: string, msgId: number): Promise<boolean> {
    return pgmq.deleteMessage(this.tx, queueName, msgId);
  }

  async deleteBatch(queueName: string, msgIds: number[]): Promise<number[]> {
    return pgmq.deleteBatch(this.tx, queueName, msgIds);
  }

  async purgeQueue(queueName: string): Promise<number> {
    return pgmq.purgeQueue(this.tx, queueName);
  }

  async archive(queueName: string, msgId: number): Promise<boolean> {
    return pgmq.archive(this.tx, queueName, msgId);
  }

  async archiveBatch(queueName: string, msgIds: number[]): Promise<number[]> {
    return pgmq.archiveBatch(this.tx, queueName, msgIds);
  }

  async createQueue(queueName: string): Promise<void> {
    return pgmq.createQueue(this.tx, queueName);
  }

  async createPartitionedQueue(queueName: string, partitionInterval = '10000', retentionInterval = '100000'): Promise<void> {
    return pgmq.createPartitionedQueue(this.tx, queueName, partitionInterval, retentionInterval);
  }

  async createUnloggedQueue(queueName: string): Promise<void> {
    return pgmq.createUnloggedQueue(this.tx, queueName);
  }

  async detachArchive(queueName: string): Promise<void> {
    return pgmq.detachArchive(this.tx, queueName);
  }

  async dropQueue(queueName: string): Promise<boolean> {
    return pgmq.dropQueue(this.tx, queueName);
  }

  async setVt(queueName: string, msgId: number, vtOffset: number): Promise<MessageRecord> {
    return pgmq.setVt(this.tx, queueName, msgId, vtOffset);
  }

  async listQueues(): Promise<QueueInfo[]> {
    return pgmq.listQueues(this.tx);
  }

  async metrics(queueName: string): Promise<QueueMetrics> {
    return pgmq.metrics(this.tx, queueName);
  }

  async metricsAll(): Promise<QueueMetrics[]> {
    return pgmq.metricsAll(this.tx);
  }
}