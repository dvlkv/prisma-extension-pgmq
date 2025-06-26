import { setupMockPrismaWithCapture, mockData } from '../mocks/prisma.mock';
import pgmqExtension from '../../pgmq-extension';

describe('PGMQ Extension Tests', () => {
  let extendedPrisma: any;

  beforeEach(() => {
    const setup = setupMockPrismaWithCapture();
    const mockPrisma = setup.prisma;
    
    // Apply the extension to the mock prisma
    extendedPrisma = mockPrisma.$extends(pgmqExtension);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Extension API - Message Operations', () => {
    describe('send', () => {
      it('should send a message using the extension API', async () => {
        const queueName = 'test-queue';
        const message = { id: 1, data: 'test' };
        
        // Mock the transaction and response
        extendedPrisma.$transaction.mockImplementation(async (callback: any) => {
          const mockTx = {
            $queryRaw: jest.fn().mockResolvedValue([{ send: 123 }])
          };
          return callback(mockTx);
        });

        const result = await extendedPrisma.pgmq.send(queueName, message);

        expect(result).toBe(123);
        expect(extendedPrisma.$transaction).toHaveBeenCalledTimes(1);
      });

      it('should send a message with delay using the extension API', async () => {
        const queueName = 'test-queue';
        const message = { id: 1, data: 'test' };
        const delay = 30;
        
        extendedPrisma.$transaction.mockImplementation(async (callback: any) => {
          const mockTx = {
            $queryRaw: jest.fn().mockResolvedValue([{ send: 124 }])
          };
          return callback(mockTx);
        });

        const result = await extendedPrisma.pgmq.send(queueName, message, delay);

        expect(result).toBe(124);
        expect(extendedPrisma.$transaction).toHaveBeenCalledTimes(1);
      });
    });

    describe('sendBatch', () => {
      it('should send batch messages using the extension API', async () => {
        const queueName = 'test-queue';
        const messages = [
          { id: 1, data: 'test1' },
          { id: 2, data: 'test2' }
        ];
        
        extendedPrisma.$transaction.mockImplementation(async (callback: any) => {
          const mockTx = {
            $queryRaw: jest.fn().mockResolvedValue([
              { send_batch: 123 },
              { send_batch: 124 }
            ])
          };
          return callback(mockTx);
        });

        const result = await extendedPrisma.pgmq.sendBatch(queueName, messages);

        expect(result).toEqual([123, 124]);
        expect(extendedPrisma.$transaction).toHaveBeenCalledTimes(1);
      });
    });

    describe('read', () => {
      it('should read messages using the extension API', async () => {
        const queueName = 'test-queue';
        const vt = 30;
        const qty = 2;
        
        const mockMessages = [
          mockData.messageRecord({ msg_id: 1 }),
          mockData.messageRecord({ msg_id: 2 })
        ];
        
        extendedPrisma.$transaction.mockImplementation(async (callback: any) => {
          const mockTx = {
            $queryRaw: jest.fn().mockResolvedValue(mockMessages)
          };
          return callback(mockTx);
        });

        const result = await extendedPrisma.pgmq.read(queueName, vt, qty);

        expect(result).toEqual(mockMessages);
        expect(extendedPrisma.$transaction).toHaveBeenCalledTimes(1);
      });
    });

    describe('deleteMessage', () => {
      it('should delete a message using the extension API', async () => {
        const queueName = 'test-queue';
        const msgId = 123;
        
        extendedPrisma.$transaction.mockImplementation(async (callback: any) => {
          const mockTx = {
            $queryRaw: jest.fn().mockResolvedValue([{ delete: true }])
          };
          return callback(mockTx);
        });

        const result = await extendedPrisma.pgmq.deleteMessage(queueName, msgId);

        expect(result).toBe(true);
        expect(extendedPrisma.$transaction).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Extension API - Queue Management', () => {
    describe('createQueue', () => {
      it('should create a queue using the extension API', async () => {
        const queueName = 'test-queue';
        
        extendedPrisma.$transaction.mockImplementation(async (callback: any) => {
          const mockTx = {
            $executeRaw: jest.fn().mockResolvedValue(0)
          };
          return callback(mockTx);
        });

        await extendedPrisma.pgmq.createQueue(queueName);

        expect(extendedPrisma.$transaction).toHaveBeenCalledTimes(1);
      });
    });

    describe('dropQueue', () => {
      it('should drop a queue using the extension API', async () => {
        const queueName = 'test-queue';
        
        extendedPrisma.$transaction.mockImplementation(async (callback: any) => {
          const mockTx = {
            $queryRaw: jest.fn().mockResolvedValue([{ drop_queue: true }])
          };
          return callback(mockTx);
        });

        const result = await extendedPrisma.pgmq.dropQueue(queueName);

        expect(result).toBe(true);
        expect(extendedPrisma.$transaction).toHaveBeenCalledTimes(1);
      });
    });

    describe('listQueues', () => {
      it('should list queues using the extension API', async () => {
        const mockQueues = [
          mockData.queueInfo({ queue_name: 'queue1' }),
          mockData.queueInfo({ queue_name: 'queue2' })
        ];
        
        extendedPrisma.$transaction.mockImplementation(async (callback: any) => {
          const mockTx = {
            $queryRaw: jest.fn().mockResolvedValue(mockQueues)
          };
          return callback(mockTx);
        });

        const result = await extendedPrisma.pgmq.listQueues();

        expect(result).toEqual(mockQueues);
        expect(extendedPrisma.$transaction).toHaveBeenCalledTimes(1);
      });
    });

    describe('metrics', () => {
      it('should get queue metrics using the extension API', async () => {
        const queueName = 'test-queue';
        const mockMetrics = mockData.queueMetrics({ queue_name: queueName });
        
        extendedPrisma.$transaction.mockImplementation(async (callback: any) => {
          const mockTx = {
            $queryRaw: jest.fn().mockResolvedValue([mockMetrics])
          };
          return callback(mockTx);
        });

        const result = await extendedPrisma.pgmq.metrics(queueName);

        expect(result).toEqual(mockMetrics);
        expect(extendedPrisma.$transaction).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Extension API - Transaction Method', () => {
    it('should execute multiple operations in a transaction', async () => {
      const queueName1 = 'queue1';
      const queueName2 = 'queue2';
      const message1 = { type: 'email', userId: 123 };
      const message2 = { type: 'sms', userId: 123 };
      
      extendedPrisma.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          $queryRaw: jest.fn()
            .mockResolvedValueOnce([{ send: 101 }])  // First send
            .mockResolvedValueOnce([{ send: 102 }])  // Second send
            .mockResolvedValueOnce([mockData.queueMetrics({ queue_name: queueName1 })])  // Metrics
        };
        return callback(mockTx);
      });

      const result = await extendedPrisma.pgmq.transaction(async (pgmq: any) => {
        const msgId1 = await pgmq.send(queueName1, message1);
        const msgId2 = await pgmq.send(queueName2, message2);
        const metrics = await pgmq.metrics(queueName1);
        
        return { msgId1, msgId2, queueLength: metrics.queue_length };
      });

      expect(result.msgId1).toBe(101);
      expect(result.msgId2).toBe(102);
      expect(result.queueLength).toBeDefined();
      expect(extendedPrisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Extension Structure', () => {
    it('should have pgmq namespace with all methods', async () => {
      expect(extendedPrisma.pgmq).toBeDefined();
      expect(typeof extendedPrisma.pgmq.send).toBe('function');
      expect(typeof extendedPrisma.pgmq.sendBatch).toBe('function');
      expect(typeof extendedPrisma.pgmq.read).toBe('function');
      expect(typeof extendedPrisma.pgmq.readWithPoll).toBe('function');
      expect(typeof extendedPrisma.pgmq.pop).toBe('function');
      expect(typeof extendedPrisma.pgmq.deleteMessage).toBe('function');
      expect(typeof extendedPrisma.pgmq.deleteBatch).toBe('function');
      expect(typeof extendedPrisma.pgmq.purgeQueue).toBe('function');
      expect(typeof extendedPrisma.pgmq.archive).toBe('function');
      expect(typeof extendedPrisma.pgmq.archiveBatch).toBe('function');
      expect(typeof extendedPrisma.pgmq.createQueue).toBe('function');
      expect(typeof extendedPrisma.pgmq.createPartitionedQueue).toBe('function');
      expect(typeof extendedPrisma.pgmq.createUnloggedQueue).toBe('function');
      expect(typeof extendedPrisma.pgmq.detachArchive).toBe('function');
      expect(typeof extendedPrisma.pgmq.dropQueue).toBe('function');
      expect(typeof extendedPrisma.pgmq.setVt).toBe('function');
      expect(typeof extendedPrisma.pgmq.listQueues).toBe('function');
      expect(typeof extendedPrisma.pgmq.metrics).toBe('function');
      expect(typeof extendedPrisma.pgmq.metricsAll).toBe('function');
      expect(typeof extendedPrisma.pgmq.transaction).toBe('function');
    });
  });
});