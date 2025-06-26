import { PrismaClient } from '@prisma/client';
import { pgmqExtension } from 'prisma-pgmq';

async function main(): Promise<void> {
  // Initialize Prisma client with PGMQ extension
  const prisma = new PrismaClient().$extends(pgmqExtension);

  try {
    // Create a queue
    console.log('Creating queue...');
    await prisma.pgmq.createQueue('example-queue');

    // Send a message
    console.log('Sending message...');
    const msgId = await prisma.pgmq.send('example-queue', {
      userId: 123,
      action: 'process-data',
      timestamp: Date.now(),
      data: {
        filename: 'document.pdf',
        size: 1024
      }
    });
    console.log('Message sent with ID:', msgId);

    // Send multiple messages
    console.log('Sending batch messages...');
    const msgIds = await prisma.pgmq.sendBatch('example-queue', [
      { type: 'email', recipient: 'user1@example.com' },
      { type: 'email', recipient: 'user2@example.com' },
      { type: 'sms', recipient: '+1234567890' }
    ]);
    console.log('Batch messages sent with IDs:', msgIds);

    // Read messages
    console.log('Reading messages...');
    const messages = await prisma.pgmq.read('example-queue', 30, 5); // 30s visibility timeout, max 5 messages
    console.log('Received messages:', messages.length);

    // Process messages
    for (const message of messages) {
      console.log('Processing message:', message.msg_id, message.message);
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Delete message after processing
      await prisma.pgmq.deleteMessage('example-queue', message.msg_id);
      console.log('Message', message.msg_id, 'processed and deleted');
    }

    // Get queue metrics
    const metrics = await prisma.pgmq.metrics('example-queue');
    console.log('Queue metrics:', {
      queueName: metrics.queue_name,
      queueLength: Number(metrics.queue_length),
      totalMessages: Number(metrics.total_messages)
    });

    // Clean up
    await prisma.pgmq.dropQueue('example-queue');
    console.log('Queue dropped');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();