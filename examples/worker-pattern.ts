import { PrismaClient } from '@prisma/client';
import { pgmqExtension } from 'prisma-pgmq';

// Shared configuration
const QUEUE_NAME = 'work-queue';
const VISIBILITY_TIMEOUT = 30;

// Producer - sends tasks to the queue
async function producer(): Promise<void> {
  const prisma = new PrismaClient().$extends(pgmqExtension);

  try {
    // Ensure queue exists
    await prisma.pgmq.createQueue(QUEUE_NAME).catch(() => {
      // Queue might already exist, ignore error
    });

    // Send some example tasks
    const tasks = [
      { type: 'email', recipient: 'user1@example.com', template: 'welcome' },
      { type: 'email', recipient: 'user2@example.com', template: 'newsletter' },
      { type: 'process-image', imageId: 'img-123', operation: 'resize' },
      { type: 'generate-report', userId: 456, reportType: 'monthly' },
      { type: 'email', recipient: 'user3@example.com', template: 'reminder' }
    ];

    console.log('🚀 Producer: Sending tasks to queue...');
    for (const task of tasks) {
      const msgId = await prisma.pgmq.send(QUEUE_NAME, task);
      console.log(`📤 Sent task: ${task.type} (ID: ${msgId})`);
      
      // Small delay between sends
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('✅ Producer: All tasks sent');
  } catch (error) {
    console.error('❌ Producer error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Consumer - processes tasks from the queue
async function consumer(workerId: string): Promise<void> {
  const prisma = new PrismaClient().$extends(pgmqExtension);

  console.log(`🔄 Worker ${workerId}: Starting consumer`);

      try {
      while (true) {
        // Poll for messages with a timeout
        const messages = await prisma.pgmq.readWithPoll(
          QUEUE_NAME,
          VISIBILITY_TIMEOUT,
          1, // Process one message at a time
          5, // Poll for up to 5 seconds
          1000 // Check every 1 second
        );

        if (messages.length === 0) {
          console.log(`⏰ Worker ${workerId}: No messages, continuing to poll...`);
          continue;
        }

        const message = messages[0];
        console.log(`📨 Worker ${workerId}: Processing message ${message.msg_id}`);

        try {
          // Simulate task processing based on type
          await processTask(message.message, workerId);
          
          // Delete message after successful processing
          await prisma.pgmq.deleteMessage(QUEUE_NAME, message.msg_id);
          console.log(`✅ Worker ${workerId}: Completed message ${message.msg_id}`);
          
        } catch (processingError) {
          console.error(`❌ Worker ${workerId}: Failed to process message ${message.msg_id}:`, processingError);
          
          // Archive failed messages for later analysis
          await prisma.pgmq.archive(QUEUE_NAME, message.msg_id);
          console.log(`📁 Worker ${workerId}: Archived failed message ${message.msg_id}`);
        }
      }
  } catch (error) {
    console.error(`❌ Worker ${workerId} error:`, error);
  } finally {
    await prisma.$disconnect();
  }
}

// Task processing logic
async function processTask(task: any, workerId: string): Promise<void> {
  console.log(`🔧 Worker ${workerId}: Processing ${task.type}`);
  
  switch (task.type) {
    case 'email':
      await simulateEmailSending(task);
      break;
    case 'process-image':
      await simulateImageProcessing(task);
      break;
    case 'generate-report':
      await simulateReportGeneration(task);
      break;
    default:
      console.log(`⚠️ Worker ${workerId}: Unknown task type: ${task.type}`);
  }
}

async function simulateEmailSending(task: any): Promise<void> {
  // Simulate email sending delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log(`📧 Email sent to ${task.recipient} using template ${task.template}`);
}

async function simulateImageProcessing(task: any): Promise<void> {
  // Simulate image processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log(`🖼️ Image ${task.imageId} processed with operation: ${task.operation}`);
}

async function simulateReportGeneration(task: any): Promise<void> {
  // Simulate report generation delay
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log(`📊 ${task.reportType} report generated for user ${task.userId}`);
}

// Monitor queue metrics
async function monitor(): Promise<void> {
  const prisma = new PrismaClient().$extends(pgmqExtension);

  try {
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Check every 10 seconds
      
      try {
        const metrics = await prisma.pgmq.metrics(QUEUE_NAME);
        console.log(`📊 Queue metrics: ${Number(metrics.queue_length)} messages pending, ${Number(metrics.total_messages)} total processed`);
        
        if (metrics.oldest_msg_age_sec && metrics.oldest_msg_age_sec > 60) {
          console.log(`⚠️ Warning: Oldest message is ${metrics.oldest_msg_age_sec} seconds old`);
        }
      } catch (error) {
        // Queue might not exist yet
        console.log('📊 Queue not ready for metrics yet...');
      }
    }
  } catch (error) {
    console.error('❌ Monitor error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'producer':
      await producer();
      break;
    case 'consumer':
      const workerId = args[1] || '1';
      await consumer(workerId);
      break;
    case 'monitor':
      await monitor();
      break;
    default:
      console.log(`
Usage:
  tsx worker-pattern.ts producer          # Send tasks to queue
  tsx worker-pattern.ts consumer [id]     # Start a consumer worker
  tsx worker-pattern.ts monitor           # Monitor queue metrics

Example:
  # Terminal 1: Start monitoring
  tsx worker-pattern.ts monitor

  # Terminal 2: Start a consumer
  tsx worker-pattern.ts consumer worker-1

  # Terminal 3: Start another consumer
  tsx worker-pattern.ts consumer worker-2

  # Terminal 4: Send some tasks
  tsx worker-pattern.ts producer
      `);
  }
}

main();