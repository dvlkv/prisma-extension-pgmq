import { setupMockPrismaWithCapture, mockData } from '../mocks/prisma.mock';
import * as pgmq from '../../pgmq';

describe('PGMQ Unit Tests', () => {
  let mockPrisma: any;
  let queryCapture: any;
  let mockTx: any;

  beforeEach(() => {
    const setup = setupMockPrismaWithCapture();
    mockPrisma = setup.prisma;
    queryCapture = setup.queryCapture;
    mockTx = setup.mockTx;
  });

  describe('Sending Messages', () => {
    describe('send', () => {
      it('should generate correct SQL for sending a message without delay', async () => {
        const queueName = 'test-queue';
        const message = { id: 1, data: 'test' };
        
        // Mock the response
        mockTx.$queryRaw.mockResolvedValue([{ send: 123 }]);

        const result = await pgmq.send(mockTx, queueName, message);

        expect(result).toBe(123);
        expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);

        const query = queryCapture.getLastQuery();
        expect(query.method).toBe('$queryRaw');
        // Verify that the query was called with expected parameters
        expect(query.params).toContain(queueName);
        expect(query.params).toContain(message);
      });

      it('should generate correct SQL for sending a message with numeric delay', async () => {
        const queueName = 'test-queue';
        const message = { id: 1, data: 'test' };
        const delay = 5;
        
        mockTx.$queryRaw.mockResolvedValue([{ send: 124 }]);

        const result = await pgmq.send(mockTx, queueName, message, delay);

        expect(result).toBe(124);
        expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);

        const query = queryCapture.getLastQuery();
        expect(query.params).toContain(queueName);
        expect(query.params).toContain(message);
      });

      it('should generate correct SQL for sending a message with Date delay', async () => {
        const queueName = 'test-queue';
        const message = { id: 1, data: 'test' };
        const delay = new Date('2024-01-01T10:00:00Z');
        
        mockTx.$queryRaw.mockResolvedValue([{ send: 125 }]);

        const result = await pgmq.send(mockTx, queueName, message, delay);

        expect(result).toBe(125);
        expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);

        const query = queryCapture.getLastQuery();
        expect(query.params).toContain(queueName);
        expect(query.params).toContain(message);
      });
    });

    describe('sendBatch', () => {
      it('should generate correct SQL for sending batch messages', async () => {
        const queueName = 'test-queue';
        const messages = [
          { id: 1, data: 'test1' },
          { id: 2, data: 'test2' }
        ];
        
        mockTx.$queryRaw.mockResolvedValue([
          { send_batch: 123 },
          { send_batch: 124 }
        ]);

        const result = await pgmq.sendBatch(mockTx, queueName, messages);

        expect(result).toEqual([123, 124]);
        expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);

        const query = queryCapture.getLastQuery();
        expect(query.params).toContain(queueName);
        expect(query.params).toContain(messages);
      });

      it('should handle empty message arrays', async () => {
        const queueName = 'test-queue';
        const messages: any[] = [];
        
        mockTx.$queryRaw.mockResolvedValue([]);

        const result = await pgmq.sendBatch(mockTx, queueName, messages);

        expect(result).toEqual([]);
        expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Reading Messages', () => {
    describe('read', () => {
      it('should generate correct SQL for reading messages', async () => {
        const queueName = 'test-queue';
        const vt = 30;
        const qty = 2;
        const conditional = { type: 'urgent' };
        
        const mockMessages = [
          mockData.messageRecord({ msg_id: 1 }),
          mockData.messageRecord({ msg_id: 2 })
        ];
        
        mockTx.$queryRaw.mockResolvedValue(mockMessages);

        const result = await pgmq.read(mockTx, queueName, vt, qty, conditional);

        expect(result).toEqual(mockMessages);
        expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);

        const query = queryCapture.getLastQuery();
        expect(query.params).toContain(queueName);
        expect(query.params).toContain(conditional);
      });

      it('should use default parameters correctly', async () => {
        const queueName = 'test-queue';
        const vt = 30;
        
        const mockMessages = [mockData.messageRecord()];
        mockTx.$queryRaw.mockResolvedValue(mockMessages);

        const result = await pgmq.read(mockTx, queueName, vt);

        expect(result).toEqual(mockMessages);
        expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);

        const query = queryCapture.getLastQuery();
        expect(query.params).toContain(queueName);
      });
    });

    describe('readWithPoll', () => {
      it('should generate correct SQL for polling read', async () => {
        const queueName = 'test-queue';
        const vt = 30;
        const qty = 1;
        const maxPollSeconds = 5;
        const pollIntervalMs = 100;
        
        const mockMessages = [mockData.messageRecord()];
        mockTx.$queryRaw.mockResolvedValue(mockMessages);

        const result = await pgmq.readWithPoll(
          mockTx, 
          queueName, 
          vt, 
          qty, 
          maxPollSeconds, 
          pollIntervalMs
        );

        expect(result).toEqual(mockMessages);
        expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);

        const query = queryCapture.getLastQuery();
        expect(query.params).toContain(queueName);
      });
    });

    describe('pop', () => {
      it('should generate correct SQL for popping messages', async () => {
        const queueName = 'test-queue';
        
        const mockMessages = [mockData.messageRecord()];
        mockTx.$queryRaw.mockResolvedValue(mockMessages);

        const result = await pgmq.pop(mockTx, queueName);

        expect(result).toEqual(mockMessages);
        expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);

        const query = queryCapture.getLastQuery();
        expect(query.params).toContain(queueName);
      });
    });
  });

  describe('Deleting/Archiving Messages', () => {
    describe('deleteMessage', () => {
      it('should generate correct SQL for deleting a message', async () => {
        const queueName = 'test-queue';
        const msgId = 123;
        
        mockTx.$queryRaw.mockResolvedValue([{ delete: true }]);

        const result = await pgmq.deleteMessage(mockTx, queueName, msgId);

        expect(result).toBe(true);
        expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);

        const query = queryCapture.getLastQuery();
        expect(query.params).toContain(queueName);
      });
    });

    describe('deleteBatch', () => {
      it('should generate correct SQL for batch delete', async () => {
        const queueName = 'test-queue';
        const msgIds = [123, 124, 125];
        
        mockTx.$queryRaw.mockResolvedValue([
          { delete: 123 },
          { delete: 124 },
          { delete: 125 }
        ]);

        const result = await pgmq.deleteBatch(mockTx, queueName, msgIds);

        expect(result).toEqual([123, 124, 125]);
        expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);

        const query = queryCapture.getLastQuery();
        expect(query.params).toContain(queueName);
      });
    });

    describe('purgeQueue', () => {
      it('should generate correct SQL for purging queue', async () => {
        const queueName = 'test-queue';
        
        mockTx.$queryRaw.mockResolvedValue([{ purge_queue: 5 }]);

        const result = await pgmq.purgeQueue(mockTx, queueName);

        expect(result).toBe(5);
        expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);

        const query = queryCapture.getLastQuery();
        expect(query.params).toContain(queueName);
      });
    });

    describe('archive', () => {
      it('should generate correct SQL for archiving a message', async () => {
        const queueName = 'test-queue';
        const msgId = 123;
        
        mockTx.$queryRaw.mockResolvedValue([{ archive: true }]);

        const result = await pgmq.archive(mockTx, queueName, msgId);

        expect(result).toBe(true);
        expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);

        const query = queryCapture.getLastQuery();
        expect(query.params).toContain(queueName);
      });
    });

    describe('archiveBatch', () => {
      it('should generate correct SQL for batch archive', async () => {
        const queueName = 'test-queue';
        const msgIds = [123, 124];
        
        mockTx.$queryRaw.mockResolvedValue([
          { archive: 123 },
          { archive: 124 }
        ]);

        const result = await pgmq.archiveBatch(mockTx, queueName, msgIds);

        expect(result).toEqual([123, 124]);
        expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);

        const query = queryCapture.getLastQuery();
        expect(query.params).toContain(queueName);
      });
    });
  });

  describe('Queue Management', () => {
    describe('createQueue', () => {
      it('should generate correct SQL for creating queue', async () => {
        const queueName = 'test-queue';
        
        mockTx.$executeRaw.mockResolvedValue(0);

        await pgmq.createQueue(mockTx, queueName);

        expect(mockTx.$executeRaw).toHaveBeenCalledTimes(1);

        const query = queryCapture.getLastQuery();
        expect(query.method).toBe('$executeRaw');
        expect(query.params).toContain(queueName);
      });
    });

    describe('createPartitionedQueue', () => {
      it('should generate correct SQL for creating partitioned queue', async () => {
        const queueName = 'test-queue';
        const partitionInterval = '5000';
        const retentionInterval = '50000';
        
        mockTx.$executeRaw.mockResolvedValue(0);

        await pgmq.createPartitionedQueue(mockTx, queueName, partitionInterval, retentionInterval);

        expect(mockTx.$executeRaw).toHaveBeenCalledTimes(1);

        const query = queryCapture.getLastQuery();
        expect(query.method).toBe('$executeRaw');
        expect(query.params).toContain(queueName);
        expect(query.params).toContain(partitionInterval);
        expect(query.params).toContain(retentionInterval);
      });

      it('should use default partition parameters', async () => {
        const queueName = 'test-queue';
        
        mockTx.$executeRaw.mockResolvedValue(0);

        await pgmq.createPartitionedQueue(mockTx, queueName);

        expect(mockTx.$executeRaw).toHaveBeenCalledTimes(1);

        const query = queryCapture.getLastQuery();
        expect(query.params).toContain(queueName);
        expect(query.params).toContain('10000');
        expect(query.params).toContain('100000');
      });
    });

    describe('dropQueue', () => {
      it('should generate correct SQL for dropping queue', async () => {
        const queueName = 'test-queue';
        
        mockTx.$queryRaw.mockResolvedValue([{ drop_queue: true }]);

        const result = await pgmq.dropQueue(mockTx, queueName);

        expect(result).toBe(true);
        expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);

        const query = queryCapture.getLastQuery();
        expect(query.params).toContain(queueName);
      });
    });
  });

  describe('Utilities', () => {
    describe('setVt', () => {
      it('should generate correct SQL for setting visibility timeout', async () => {
        const queueName = 'test-queue';
        const msgId = 123;
        const vtOffset = 60;
        
        const mockMessage = mockData.messageRecord({ msg_id: msgId });
        mockTx.$queryRaw.mockResolvedValue([mockMessage]);

        const result = await pgmq.setVt(mockTx, queueName, msgId, vtOffset);

        expect(result).toEqual(mockMessage);
        expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);

        const query = queryCapture.getLastQuery();
        expect(query.params).toContain(queueName);
      });
    });

    describe('listQueues', () => {
      it('should generate correct SQL for listing queues', async () => {
        const mockQueues = [
          mockData.queueInfo({ queue_name: 'queue1' }),
          mockData.queueInfo({ queue_name: 'queue2' })
        ];
        
        mockTx.$queryRaw.mockResolvedValue(mockQueues);

        const result = await pgmq.listQueues(mockTx);

        expect(result).toEqual(mockQueues);
        expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
      });
    });

    describe('metrics', () => {
      it('should generate correct SQL for queue metrics', async () => {
        const queueName = 'test-queue';
        const mockMetrics = mockData.queueMetrics({ queue_name: queueName });
        
        mockTx.$queryRaw.mockResolvedValue([mockMetrics]);

        const result = await pgmq.metrics(mockTx, queueName);

        expect(result).toEqual(mockMetrics);
        expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);

        const query = queryCapture.getLastQuery();
        expect(query.params).toContain(queueName);
      });
    });

    describe('metricsAll', () => {
      it('should generate correct SQL for all queue metrics', async () => {
        const mockMetrics = [
          mockData.queueMetrics({ queue_name: 'queue1' }),
          mockData.queueMetrics({ queue_name: 'queue2' })
        ];
        
        mockTx.$queryRaw.mockResolvedValue(mockMetrics);

        const result = await pgmq.metricsAll(mockTx);

        expect(result).toEqual(mockMetrics);
        expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
      });
    });
  });
});