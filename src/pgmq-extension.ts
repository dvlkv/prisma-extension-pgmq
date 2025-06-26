import { Prisma } from '@prisma/client/extension';
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
 * import { pgmqExtension } from 'prisma-extension-pgmq';
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
export default Prisma.defineExtension({
    name: 'prisma-extension-pgmq',
    client: {
        $pgmq: {
            /**
             * Send a single message to a queue
             */
            async send(queueName: string, msg: Task, delay?: number | Date): Promise<number> {
                const prisma = Prisma.getExtensionContext(this);
                return pgmqCore.send(prisma as any, queueName, msg, delay);
            },

            /**
             * Send multiple messages to a queue in a batch
             */
            async sendBatch(queueName: string, msgs: Task[], delay?: number | Date): Promise<number[]> {
                const prisma = Prisma.getExtensionContext(this);
                return pgmqCore.sendBatch(prisma as any, queueName, msgs, delay);
            },

            /**
             * Read messages from a queue with visibility timeout
             */
            async read(queueName: string, vt: number, qty: number = 1, conditional: Task = {}): Promise<MessageRecord[]> {
                const prisma = Prisma.getExtensionContext(this);
                return pgmqCore.read(prisma as any, queueName, vt, qty, conditional);
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
                const prisma = Prisma.getExtensionContext(this);
                return pgmqCore.readWithPoll(prisma as any, queueName, vt, qty, maxPollSeconds, pollIntervalMs, conditional);
            },

            /**
             * Pop (read and delete) messages atomically
             */
            async pop(queueName: string): Promise<MessageRecord[]> {
                const prisma = Prisma.getExtensionContext(this);
                return pgmqCore.pop(prisma as any, queueName);
            },

            /**
             * Delete a specific message by ID
             */
            async deleteMessage(queueName: string, msgId: number): Promise<boolean> {
                const prisma = Prisma.getExtensionContext(this);
                return pgmqCore.deleteMessage(prisma as any, queueName, msgId);
            },

            /**
             * Delete multiple messages by IDs
             */
            async deleteBatch(queueName: string, msgIds: number[]): Promise<number[]> {
                const prisma = Prisma.getExtensionContext(this);
                return pgmqCore.deleteBatch(prisma as any, queueName, msgIds);
            },

            /**
             * Remove all messages from a queue
             */
            async purgeQueue(queueName: string): Promise<number> {
                const prisma = Prisma.getExtensionContext(this);
                return pgmqCore.purgeQueue(prisma as any, queueName);
            },

            /**
             * Archive a message (move to archive table)
             */
            async archive(queueName: string, msgId: number): Promise<boolean> {
                const prisma = Prisma.getExtensionContext(this);
                return pgmqCore.archive(prisma as any, queueName, msgId);
            },

            /**
             * Archive multiple messages
             */
            async archiveBatch(queueName: string, msgIds: number[]): Promise<number[]> {
                const prisma = Prisma.getExtensionContext(this);
                return pgmqCore.archiveBatch(prisma as any, queueName, msgIds);
            },

            /**
             * Create a new queue
             */
            async createQueue(queueName: string): Promise<void> {
                const prisma = Prisma.getExtensionContext(this);
                return pgmqCore.createQueue(prisma as any, queueName);
            },

            /**
             * Create a partitioned queue for high-throughput scenarios
             */
            async createPartitionedQueue(
                queueName: string,
                partitionInterval: string = '10000',
                retentionInterval: string = '100000'
            ): Promise<void> {
                const prisma = Prisma.getExtensionContext(this);
                return pgmqCore.createPartitionedQueue(prisma as any, queueName, partitionInterval, retentionInterval);
            },

            /**
             * Create an unlogged queue (better performance, less durability)
             */
            async createUnloggedQueue(queueName: string): Promise<void> {
                const prisma = Prisma.getExtensionContext(this);
                return pgmqCore.createUnloggedQueue(prisma as any, queueName);
            },

            /**
             * Detach archive from a queue
             */
            async detachArchive(queueName: string): Promise<void> {
                const prisma = Prisma.getExtensionContext(this);
                return pgmqCore.detachArchive(prisma as any, queueName);
            },

            /**
             * Drop a queue and all its messages
             */
            async dropQueue(queueName: string): Promise<boolean> {
                const prisma = Prisma.getExtensionContext(this);
                return pgmqCore.dropQueue(prisma as any, queueName);
            },

            /**
             * Set visibility timeout for a specific message
             */
            async setVt(queueName: string, msgId: number, vtOffset: number): Promise<MessageRecord> {
                const prisma = Prisma.getExtensionContext(this);
                return pgmqCore.setVt(prisma as any, queueName, msgId, vtOffset);
            },

            /**
             * List all queues
             */
            async listQueues(): Promise<QueueInfo[]> {
                const prisma = Prisma.getExtensionContext(this);
                return pgmqCore.listQueues(prisma as any);
            },

            /**
             * Get metrics for a specific queue
             */
            async metrics(queueName: string): Promise<QueueMetrics> {
                const prisma = Prisma.getExtensionContext(this);
                return pgmqCore.metrics(prisma as any, queueName);
            },

            /**
             * Get metrics for all queues
             */
            async metricsAll(): Promise<QueueMetrics[]> {
                const prisma = Prisma.getExtensionContext(this);
                return pgmqCore.metricsAll(prisma as any);
            }
        },
    },
});