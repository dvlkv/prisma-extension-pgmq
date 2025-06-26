import { mockDeep, MockProxy, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient, Prisma } from '@prisma/client';

export type MockPrismaClient = MockProxy<PrismaClient>;
export type MockTransactionClient = DeepMockProxy<Prisma.TransactionClient>;

/**
 * Create a mocked Prisma client for testing
 */
export function createMockPrismaClient(): MockPrismaClient {
  return mockDeep<PrismaClient>();
}

/**
 * Create a mocked transaction client for testing
 */
export function createMockTransactionClient(): MockTransactionClient {
  return mockDeep<Prisma.TransactionClient>();
}

/**
 * Query capture utility for testing actual SQL queries
 */
export class QueryCapture {
  private queries: Array<{ method: string; query: any; params: any[] }> = [];

  capture(method: string, query: any, ...params: any[]) {
    this.queries.push({ method, query, params });
    return this.getDefaultResponse(method);
  }

  getQueries() {
    return [...this.queries];
  }

  getLastQuery() {
    return this.queries[this.queries.length - 1];
  }

  clear() {
    this.queries = [];
  }

  private getDefaultResponse(method: string) {
    switch (method) {
      case '$queryRaw':
        return Promise.resolve([]);
      case '$executeRaw':
        return Promise.resolve(0);
      default:
        return Promise.resolve(undefined);
    }
  }
}

/**
 * Setup mock Prisma client with query capture
 */
export function setupMockPrismaWithCapture(): {
  prisma: MockPrismaClient;
  queryCapture: QueryCapture;
  mockTx: MockTransactionClient;
} {
  const queryCapture = new QueryCapture();
  const prisma = createMockPrismaClient();
  const mockTx = createMockTransactionClient();

  // Setup query capture for transaction client
  mockTx.$queryRaw.mockImplementation((query: any, ...args: any[]) => 
    queryCapture.capture('$queryRaw', query, ...args) as any
  );
  
  mockTx.$executeRaw.mockImplementation((query: any, ...args: any[]) => 
    queryCapture.capture('$executeRaw', query, ...args) as any
  );

  // Setup transaction mock to use our mock transaction client
  prisma.$transaction.mockImplementation(async (callback) => {
    if (typeof callback === 'function') {
      return callback(mockTx as any);
    }
    return callback;
  });

  return { prisma, queryCapture, mockTx };
}

/**
 * Mock data generators for testing
 */
export const mockData = {
  messageRecord: (overrides: Partial<any> = {}) => ({
    msg_id: 1,
    read_ct: 0,
    enqueued_at: new Date(),
    vt: new Date(),
    message: { id: 1, data: 'test' },
    ...overrides,
  }),

  queueMetrics: (overrides: Partial<any> = {}) => ({
    queue_name: 'test-queue',
    queue_length: BigInt(5),
    newest_msg_age_sec: 10,
    oldest_msg_age_sec: 100,
    total_messages: BigInt(10),
    scrape_time: new Date(),
    ...overrides,
  }),

  queueInfo: (overrides: Partial<any> = {}) => ({
    queue_name: 'test-queue',
    created_at: new Date(),
    is_partitioned: false,
    is_unlogged: false,
    ...overrides,
  }),

  task: (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    data: 'test message',
    timestamp: Date.now(),
    ...overrides,
  }),
};