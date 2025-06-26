const { PrismaClient } = require('@prisma/client');
const { PrismaPGMQ } = require('prisma-pgmq');

// Shared configuration
const QUEUE_NAME = 'work-queue';
const VISIBILITY_TIMEOUT = 30;

// Producer - sends tasks to the queue
async function producer() {
  const prisma = new PrismaClient();
  const pgmq = new PrismaPGMQ(prisma);

  try {
    // Ensure queue exists
    await pgmq.createQueue(QUEUE_NAME).catch(() => {
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
      const msgId = await pgmq.send(QUEUE_NAME, task);
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
async function consumer(workerId) {
  const prisma = new PrismaClient();
  const pgmq = new PrismaPGMQ(prisma);

  console.log(`🔄 Worker ${workerId}: Starting consumer`);

  try {
    while (true) {
      // Poll for messages with a timeout
      const messages = await pgmq.readWithPoll(
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
        await pgmq.deleteMessage(QUEUE_NAME, message.msg_id);
        console.log(`✅ Worker ${workerId}: Completed message ${message.msg_id}`);
        
      } catch (processingError) {
        console.error(`❌ Worker ${workerId}: Failed to process message ${message.msg_id}:`, processingError);
        
        // Archive failed messages for later analysis
        await pgmq.archive(QUEUE_NAME, message.msg_id);
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
async function processTask(task, workerId) {
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

async function simulateEmailSending(task) {
  // Simulate email sending delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log(`📧 Email sent to ${task.recipient} using template ${task.template}`);
}

async function simulateImageProcessing(task) {
  // Simulate image processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log(`🖼️ Image ${task.imageId} processed with operation: ${task.operation}`);
}

async function simulateReportGeneration(task) {
  // Simulate report generation delay
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log(`📊 ${task.reportType} report generated for user ${task.userId}`);
}

// Monitor queue metrics
async function monitor() {
  const prisma = new PrismaClient();
  const pgmq = new PrismaPGMQ(prisma);

  try {
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Check every 10 seconds
      
      try {
        const metrics = await pgmq.metrics(QUEUE_NAME);
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
async function main() {
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
  node worker-pattern.js producer          # Send tasks to queue
  node worker-pattern.js consumer [id]     # Start a consumer worker
  node worker-pattern.js monitor           # Monitor queue metrics

Example:
  # Terminal 1: Start monitoring
  node worker-pattern.js monitor

  # Terminal 2: Start a consumer
  node worker-pattern.js consumer worker-1

  # Terminal 3: Start another consumer
  node worker-pattern.js consumer worker-2

  # Terminal 4: Send some tasks
  node worker-pattern.js producer
      `);
  }
}

main();