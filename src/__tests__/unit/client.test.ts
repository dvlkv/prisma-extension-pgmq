import { setupMockPrismaWithCapture, mockData } from '../mocks/prisma.mock';
import { PrismaPGMQ } from '../../client';

describe('PrismaPGMQ Client Tests', () => {
  let mockPrisma: any;
  let queryCapture: any;
  let mockTx: any;
  let client: PrismaPGMQ;

  beforeEach(() => {
    const setup = setupMockPrismaWithCapture();
    mockPrisma = setup.prisma;
    queryCapture = setup.queryCapture;
    mockTx = setup.mockTx;
    
    client = new PrismaPGMQ(mockPrisma);
  });

  describe('Transaction Wrapper', () => {
    it('should wrap operations in transactions correctly', async () => {
      const queueName = 'test-queue';
      const message = { id: 1, data: 'test' };
      
      mockTx.$queryRaw.mockResolvedValue([{ send: 123 }]);

      const result = await client.send(queueName, message);

      expect(result).toBe(123);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should allow manual transaction management', async () => {
      const queueName = 'test-queue';
      const message = { id: 1, data: 'test' };
      
      mockTx.$queryRaw.mockResolvedValue([{ send: 123 }]);

      const result = await client.transaction(async (pgmq) => {
        const msgId = await pgmq.send(queueName, message);
        return { msgId, processed: true };
      });

      expect(result).toEqual({ msgId: 123, processed: true });
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Convenience Methods', () => {
    it('should provide send convenience method', async () => {
      const queueName = 'test-queue';
      const message = { id: 1, data: 'test' };
      
      mockTx.$queryRaw.mockResolvedValue([{ send: 123 }]);

      const result = await client.send(queueName, message);

      expect(result).toBe(123);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should provide sendBatch convenience method', async () => {
      const queueName = 'test-queue';
      const messages = [{ id: 1, data: 'test1' }, { id: 2, data: 'test2' }];
      
      mockTx.$queryRaw.mockResolvedValue([
        { send_batch: 123 },
        { send_batch: 124 }
      ]);

      const result = await client.sendBatch(queueName, messages);

      expect(result).toEqual([123, 124]);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should provide read convenience method', async () => {
      const queueName = 'test-queue';
      const vt = 30;
      
      const mockMessages = [mockData.messageRecord()];
      mockTx.$queryRaw.mockResolvedValue(mockMessages);

      const result = await client.read(queueName, vt);

      expect(result).toEqual(mockMessages);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should provide readWithPoll convenience method', async () => {
      const queueName = 'test-queue';
      const vt = 30;
      
      const mockMessages = [mockData.messageRecord()];
      mockTx.$queryRaw.mockResolvedValue(mockMessages);

      const result = await client.readWithPoll(queueName, vt);

      expect(result).toEqual(mockMessages);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should provide queue management convenience methods', async () => {
      const queueName = 'test-queue';
      
      // Test createQueue
      mockTx.$executeRaw.mockResolvedValue(0);
      await client.createQueue(queueName);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

      // Test dropQueue
      mockTx.$queryRaw.mockResolvedValue([{ drop_queue: true }]);
      const dropResult = await client.dropQueue(queueName);
      expect(dropResult).toBe(true);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it('should provide utility convenience methods', async () => {
      // Test listQueues
      const mockQueues = [mockData.queueInfo()];
      mockTx.$queryRaw.mockResolvedValue(mockQueues);
      
      const queues = await client.listQueues();
      expect(queues).toEqual(mockQueues);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

      // Test metrics
      const queueName = 'test-queue';
      const mockMetrics = mockData.queueMetrics();
      mockTx.$queryRaw.mockResolvedValue([mockMetrics]);
      
      const metrics = await client.metrics(queueName);
      expect(metrics).toEqual(mockMetrics);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should propagate transaction errors', async () => {
      const error = new Error('Database connection failed');
      mockPrisma.$transaction.mockRejectedValue(error);

      await expect(client.send('test-queue', { data: 'test' }))
        .rejects.toThrow('Database connection failed');
    });

    it('should propagate query errors within transactions', async () => {
      const error = new Error('Invalid queue name');
      mockTx.$queryRaw.mockRejectedValue(error);

      await expect(client.send('invalid-queue', { data: 'test' }))
        .rejects.toThrow('Invalid queue name');
    });
  });
});