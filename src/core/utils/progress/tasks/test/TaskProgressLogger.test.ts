import { describe, it, expect, beforeEach } from 'vitest';
import { TaskProgressLogger } from '../TaskProgressLogger';
import { Task } from '../Task';
import { LeafTask } from '../LeafTask';
import { IterativeTask, IterativeTaskMode } from '../IterativeTask';
import { ConsoleLog } from '@/utils/Log';
import { Concurrency } from '@/concurrency';

describe('TaskProgressLogger - Comprehensive Tests', () => {
  let logger: TaskProgressLogger;
  let baseTask: Task;
  let log: ConsoleLog;

  beforeEach(() => {
    baseTask = new LeafTask('Main task', 1000);
    log = new ConsoleLog();
    logger = new TaskProgressLogger(log, baseTask, Concurrency.of(2));
  });

  describe('Basic Creation and Inheritance', () => {
    it('creates logger successfully', () => {
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(TaskProgressLogger);
    });

    it('extends BatchingProgressLogger', () => {
      expect(logger.logProgress).toBeDefined();
      expect(logger.logMessage).toBeDefined();
      expect(logger.release).toBeDefined();
    });

    it('creates with different concurrency levels', () => {
      const concurrencies = [1, 4, 8, 16];

      concurrencies.forEach(concurrency => {
        const concurrentLogger = new TaskProgressLogger(
          log,
          new LeafTask(`Concurrent task ${concurrency}`, 1000),
          Concurrency.of(concurrency)
        );

        expect(concurrentLogger).toBeInstanceOf(TaskProgressLogger);
        concurrentLogger.release();
      });
    });

    it('creates with different base task types', () => {
      const leafTask = new LeafTask('Simple leaf', 500);
      const containerTask = new Task('Container task', [new LeafTask('Nested', 100)]);
      const iterativeTask = new IterativeTask('Iterative', [], () => [], IterativeTaskMode.FIXED);

      const tasks = [leafTask, containerTask, iterativeTask];

      tasks.forEach((task, index) => {
        const taskLogger = new TaskProgressLogger(
          log,
          task,
          Concurrency.of(2)
        );

        expect(taskLogger).toBeInstanceOf(TaskProgressLogger);
        taskLogger.release();
      });
    });
  });

  describe('Task Lifecycle Logging - Basic Patterns', () => {
    it('logs begin subtask without parent', () => {
      const task = new LeafTask('Test task', 500);

      expect(() => {
        logger.logBeginSubTask(task, null);
        logger.release();
      }).not.toThrow();
    });

    it('logs begin subtask with parent', () => {
      const parentTask = new LeafTask('Parent task', 1000);
      const childTask = new LeafTask('Child task', 500);

      expect(() => {
        logger.logBeginSubTask(childTask, parentTask);
        logger.release();
      }).not.toThrow();
    });

    it('logs complete task lifecycle with progress', () => {
      const task = new LeafTask('Complete lifecycle', 800);

      expect(() => {
        logger.logBeginSubTask(task, null);
        logger.logProgress(200);
        logger.logMessage('Quarter complete');
        logger.logProgress(300);
        logger.logMessage('More than half complete');
        logger.logProgress(300);
        logger.logMessage('Task nearly finished');
        logger.logEndSubTask(task, null);
        logger.release();
      }).not.toThrow();
    });

    it('logs end subtask without parent', () => {
      const task = new LeafTask('Test task', 500);

      expect(() => {
        logger.logBeginSubTask(task, null);
        logger.logProgress(250);
        logger.logProgress(250);
        logger.logEndSubTask(task, null);
        logger.release();
      }).not.toThrow();
    });

    it('logs end subtask with parent', () => {
      const parentTask = new LeafTask('Parent task', 1000);
      const childTask = new LeafTask('Child task', 500);

      expect(() => {
        logger.logBeginSubTask(childTask, parentTask);
        logger.logProgress(200);
        logger.logProgress(300);
        logger.logEndSubTask(childTask, parentTask);
        logger.release();
      }).not.toThrow();
    });

    it('handles multiple sibling tasks with detailed progress', () => {
      const parent = new LeafTask('Parent', 1000);
      const child1 = new LeafTask('Data Loading', 300);
      const child2 = new LeafTask('Data Processing', 400);
      const child3 = new LeafTask('Data Saving', 300);

      expect(() => {
        logger.logBeginSubTask(parent, null);
        logger.logMessage('Starting multi-phase operation');

        logger.logBeginSubTask(child1, parent);
        logger.logProgress(150);
        logger.logMessage('Loading first batch');
        logger.logProgress(150);
        logger.logMessage('Loading complete');
        logger.logEndSubTask(child1, parent);

        logger.logBeginSubTask(child2, parent);
        logger.logProgress(100);
        logger.logMessage('Processing first pass');
        logger.logProgress(150);
        logger.logMessage('Processing second pass');
        logger.logProgress(150);
        logger.logMessage('Processing complete');
        logger.logEndSubTask(child2, parent);

        logger.logBeginSubTask(child3, parent);
        logger.logProgress(300);
        logger.logMessage('Saving complete');
        logger.logEndSubTask(child3, parent);

        logger.logMessage('Multi-phase operation completed');
        logger.logEndSubTask(parent, null);
        logger.release();
      }).not.toThrow();
    });

    it('handles nested task hierarchies', () => {
      const level1 = new LeafTask('Level 1', 1000);
      const level2 = new LeafTask('Level 2', 500);
      const level3 = new LeafTask('Level 3', 200);

      expect(() => {
        logger.logBeginSubTask(level1, null);
        logger.logMessage('Starting level 1');

        logger.logBeginSubTask(level2, level1);
        logger.logMessage('Starting level 2');

        logger.logBeginSubTask(level3, level2);
        logger.logProgress(100);
        logger.logMessage('Level 3 halfway');
        logger.logProgress(100);
        logger.logMessage('Level 3 complete');
        logger.logEndSubTask(level3, level2);

        logger.logProgress(300);
        logger.logMessage('Level 2 complete');
        logger.logEndSubTask(level2, level1);

        logger.logProgress(500);
        logger.logMessage('Level 1 complete');
        logger.logEndSubTask(level1, null);

        logger.release();
      }).not.toThrow();
    });
  });

  describe('Task Failure Logging - Comprehensive', () => {
    it('logs subtask failure without parent', () => {
      const task = new LeafTask('Failing task', 500);

      expect(() => {
        logger.logBeginSubTask(task, null);
        logger.logProgress(250);
        logger.logMessage('Error detected during processing');
        logger.logEndSubTaskWithFailure(task, null);
        logger.release();
      }).not.toThrow();
    });

    it('logs subtask failure with parent', () => {
      const parentTask = new LeafTask('Parent task', 1000);
      const childTask = new LeafTask('Failing child', 500);

      expect(() => {
        logger.logBeginSubTask(childTask, parentTask);
        logger.logProgress(100);
        logger.logMessage('Child task encountering issues');
        logger.logProgress(50);
        logger.logMessage('Child task failed');
        logger.logEndSubTaskWithFailure(childTask, parentTask);
        logger.release();
      }).not.toThrow();
    });

    it('handles cascading failures with detailed logging', () => {
      const grandparent = new LeafTask('Database Operation', 1000);
      const parent = new LeafTask('Transaction', 600);
      const child = new LeafTask('Query Execution', 300);

      expect(() => {
        logger.logBeginSubTask(grandparent, null);
        logger.logMessage('Starting database operation');

        logger.logBeginSubTask(parent, grandparent);
        logger.logMessage('Beginning transaction');

        logger.logBeginSubTask(child, parent);
        logger.logProgress(150);
        logger.logMessage('Executing queries');
        logger.logMessage('Database connection lost');

        logger.logEndSubTaskWithFailure(child, parent);
        logger.logMessage('Rolling back transaction');
        logger.logEndSubTaskWithFailure(parent, grandparent);
        logger.logMessage('Database operation failed');
        logger.logEndSubTaskWithFailure(grandparent, null);

        logger.release();
      }).not.toThrow();
    });

    it('handles partial success with failure recovery', () => {
      const container = new LeafTask('Container', 1000);
      const success1 = new LeafTask('Success 1', 300);
      const failure = new LeafTask('Failure', 400);
      const success2 = new LeafTask('Success 2', 300);

      expect(() => {
        logger.logBeginSubTask(container, null);
        logger.logMessage('Starting batch operation');

        logger.logBeginSubTask(success1, container);
        logger.logProgress(300);
        logger.logMessage('First operation succeeded');
        logger.logEndSubTask(success1, container);

        logger.logBeginSubTask(failure, container);
        logger.logProgress(200);
        logger.logMessage('Second operation encountering problems');
        logger.logMessage('Second operation failed - continuing');
        logger.logEndSubTaskWithFailure(failure, container);

        logger.logBeginSubTask(success2, container);
        logger.logProgress(300);
        logger.logMessage('Third operation succeeded');
        logger.logEndSubTask(success2, container);

        logger.logMessage('Batch operation completed with partial success');
        logger.logEndSubTask(container, null);
        logger.release();
      }).not.toThrow();
    });

    it('handles multiple failure types', () => {
      const failures = [
        new LeafTask('Timeout failure', 200),
        new LeafTask('Network failure', 300),
        new LeafTask('Validation failure', 150)
      ];

      expect(() => {
        failures.forEach((task, index) => {
          logger.logBeginSubTask(task, null);
          logger.logProgress(50);
          logger.logMessage(`Failure type ${index + 1} detected`);
          logger.logEndSubTaskWithFailure(task, null);
        });
        logger.release();
      }).not.toThrow();
    });
  });

  describe('Iterative Task Support - All Modes', () => {
    it('handles fixed mode iterative tasks with multiple iterations', () => {
      const subtask1 = new LeafTask('Batch 1', 100);
      const subtask2 = new LeafTask('Batch 2', 150);
      const subtask3 = new LeafTask('Batch 3', 200);

      const iterativeTask = new IterativeTask(
        'Fixed iterations',
        [subtask1, subtask2, subtask3],
        () => [new LeafTask('Dynamic task', 100)],
        IterativeTaskMode.FIXED
      );

      expect(() => {
        logger.logBeginSubTask(subtask1, iterativeTask);
        logger.logProgress(100);
        logger.logMessage('Batch 1 processing complete');
        logger.logEndSubTask(subtask1, iterativeTask);

        logger.logBeginSubTask(subtask2, iterativeTask);
        logger.logProgress(75);
        logger.logMessage('Batch 2 first phase');
        logger.logProgress(75);
        logger.logMessage('Batch 2 processing complete');
        logger.logEndSubTask(subtask2, iterativeTask);

        logger.logBeginSubTask(subtask3, iterativeTask);
        logger.logProgress(200);
        logger.logMessage('Batch 3 processing complete');
        logger.logEndSubTask(subtask3, iterativeTask);

        logger.release();
      }).not.toThrow();
    });

    it('handles dynamic mode iterative tasks', () => {
      const subtask = new LeafTask('Dynamic task', 100);
      const iterativeTask = new IterativeTask(
        'Dynamic iterations',
        [subtask],
        () => [new LeafTask('Dynamic task', 100)],
        IterativeTaskMode.DYNAMIC
      );

      expect(() => {
        for (let i = 1; i <= 5; i++) {
          const iterationTask = new LeafTask('Dynamic task', 100);
          logger.logBeginSubTask(iterationTask, iterativeTask);
          logger.logProgress(50);
          logger.logMessage(`Dynamic iteration ${i} halfway`);
          logger.logProgress(50);
          logger.logMessage(`Dynamic iteration ${i} complete`);
          logger.logEndSubTask(iterationTask, iterativeTask);
        }
        logger.release();
      }).not.toThrow();
    });

    it('handles open mode iterative tasks', () => {
      const subtask = new LeafTask('Open task', 100);
      const iterativeTask = new IterativeTask(
        'Open iterations',
        [subtask],
        () => [new LeafTask('Open task', 100)],
        IterativeTaskMode.OPEN
      );

      expect(() => {
        for (let i = 1; i <= 4; i++) {
          const openTask = new LeafTask('Open task', 100);
          logger.logBeginSubTask(openTask, iterativeTask);
          logger.logProgress(25);
          logger.logMessage(`Open iteration ${i} quarter complete`);
          logger.logProgress(75);
          logger.logMessage(`Open iteration ${i} complete`);
          logger.logEndSubTask(openTask, iterativeTask);
        }
        logger.release();
      }).not.toThrow();
    });

    it('handles iterative tasks with mixed results', () => {
      const subtask1 = new LeafTask('Success iteration', 100);
      const subtask2 = new LeafTask('Failing iteration', 100);
      const subtask3 = new LeafTask('Recovery iteration', 100);

      const iterativeTask = new IterativeTask(
        'Mixed results iterations',
        [subtask1, subtask2, subtask3],
        () => [],
        IterativeTaskMode.FIXED
      );

      expect(() => {
        logger.logBeginSubTask(subtask1, iterativeTask);
        logger.logProgress(100);
        logger.logMessage('First iteration succeeded');
        logger.logEndSubTask(subtask1, iterativeTask);

        logger.logBeginSubTask(subtask2, iterativeTask);
        logger.logProgress(50);
        logger.logMessage('Second iteration encountered error');
        logger.logEndSubTaskWithFailure(subtask2, iterativeTask);

        logger.logBeginSubTask(subtask3, iterativeTask);
        logger.logProgress(100);
        logger.logMessage('Third iteration recovered successfully');
        logger.logEndSubTask(subtask3, iterativeTask);

        logger.release();
      }).not.toThrow();
    });

    it('handles large scale iterative processing', () => {
      const iterativeTask = new IterativeTask(
        'Large scale processing',
        [],
        () => [],
        IterativeTaskMode.DYNAMIC
      );

      expect(() => {
        for (let batch = 1; batch <= 10; batch++) {
          const batchTask = new LeafTask(`Processing batch ${batch}`, 1000);
          logger.logBeginSubTask(batchTask, iterativeTask);

          for (let chunk = 1; chunk <= 10; chunk++) {
            logger.logProgress(100);
            if (chunk % 5 === 0) {
              logger.logMessage(`Batch ${batch} - chunk ${chunk} checkpoint`);
            }
          }

          logger.logMessage(`Batch ${batch} processing complete`);
          logger.logEndSubTask(batchTask, iterativeTask);
        }
        logger.release();
      }).not.toThrow();
    });
  });

  describe('Progress Logging Integration - Advanced', () => {
    it('combines task logging with comprehensive progress logging', () => {
      const task = new LeafTask('Complex progress task', 2000);

      expect(() => {
        logger.logBeginSubTask(task, null);
        logger.logMessage('Starting complex processing');

        logger.logProgress(400);
        logger.logMessage('Phase 1: Data loading complete');

        logger.logProgress(600);
        logger.logMessage('Phase 2: Data processing complete');

        logger.logProgress(500);
        logger.logMessage('Phase 3: Data validation complete');

        logger.logProgress(500);
        logger.logMessage('Phase 4: Data saving complete');
        logger.logMessage('All phases completed successfully');

        logger.logEndSubTask(task, null);
        logger.release();
      }).not.toThrow();
    });

    it('handles volume reset patterns with different task sizes', () => {
      const smallTask = new LeafTask('Small task', 100);
      const largeTask = new LeafTask('Large task', 5000);
      const mediumTask = new LeafTask('Medium task', 1000);

      expect(() => {
        logger.logBeginSubTask(smallTask, null);
        logger.logProgress(100);
        logger.logMessage('Small task completed');
        logger.logEndSubTask(smallTask, null);

        logger.logBeginSubTask(largeTask, null);
        logger.logMessage('Starting large task');
        logger.logProgress(1000);
        logger.logMessage('Large task 20% complete');
        logger.logProgress(2000);
        logger.logMessage('Large task 60% complete');
        logger.logProgress(2000);
        logger.logMessage('Large task completed');
        logger.logEndSubTask(largeTask, null);

        logger.logBeginSubTask(mediumTask, null);
        logger.logProgress(500);
        logger.logMessage('Medium task halfway');
        logger.logProgress(500);
        logger.logMessage('Medium task completed');
        logger.logEndSubTask(mediumTask, null);

        logger.release();
      }).not.toThrow();
    });

    it('tracks progress with fine-grained updates', () => {
      const task = new LeafTask('Fine-grained task', 1000);

      expect(() => {
        logger.logBeginSubTask(task, null);
        logger.logMessage('Starting fine-grained processing');

        for (let i = 1; i <= 20; i++) {
          logger.logProgress(50);
          if (i % 5 === 0) {
            logger.logMessage(`Completed ${i * 5}% of processing`);
          }
        }

        logger.logMessage('Fine-grained processing completed');
        logger.logEndSubTask(task, null);
        logger.release();
      }).not.toThrow();
    });

    it('handles progress logging without messages', () => {
      const task = new LeafTask('Silent progress task', 800);

      expect(() => {
        logger.logBeginSubTask(task, null);

        // Just progress without messages
        logger.logProgress(200);
        logger.logProgress(200);
        logger.logProgress(200);
        logger.logProgress(200);

        logger.logEndSubTask(task, null);
        logger.release();
      }).not.toThrow();
    });

    it('handles incremental progress logging', () => {
      const task = new LeafTask('Incremental task', 500);

      expect(() => {
        logger.logBeginSubTask(task, null);
        logger.logMessage('Starting incremental processing');

        // Use parameterless logProgress() for single unit increments
        for (let i = 0; i < 500; i++) {
          logger.logProgress(); // Single unit increment
          if (i % 100 === 99) {
            logger.logMessage(`Processed ${i + 1} items`);
          }
        }

        logger.logMessage('Incremental processing completed');
        logger.logEndSubTask(task, null);
        logger.release();
      }).not.toThrow();
    });
  });

  describe('Custom TaskVisitor Support', () => {
    it('creates with custom visitor implementations', () => {
      const customVisitor = {
        visitLeafTask: (task: any) => {
          console.log(`Custom leaf processing: ${task.getDescription()}`);
        },
        visitIntermediateTask: (task: any) => {
          console.log(`Custom intermediate: ${task.getDescription()}`);
        },
        visitIterativeTask: (task: any) => {
          console.log(`Custom iterative: ${task.getDescription()}`);
        },
        visit: (task: any) => {
          console.log(`Custom visit: ${task.getDescription()}`);
        }
      };

      const customLogger = new TaskProgressLogger(
        log,
        baseTask,
        Concurrency.of(4),
        customVisitor
      );

      expect(customLogger).toBeInstanceOf(TaskProgressLogger);

      expect(() => {
        const task = new LeafTask('Custom visitor task', 500);
        customLogger.logBeginSubTask(task, null);
        customLogger.logProgress(250);
        customLogger.logMessage('Custom visitor processing');
        customLogger.logProgress(250);
        customLogger.logMessage('Custom visitor completed');
        customLogger.logEndSubTask(task, null);
        customLogger.release();
      }).not.toThrow();
    });

    it('handles visitor patterns with complex hierarchies', () => {
      const mockVisitor = {
        visitLeafTask: () => {},
        visitIntermediateTask: () => {},
        visitIterativeTask: () => {},
        visit: () => {}
      };

      const visitorLogger = new TaskProgressLogger(
        log,
        baseTask,
        Concurrency.of(2),
        mockVisitor
      );

      expect(() => {
        const parent = new LeafTask('Parent with visitor', 800);
        const child1 = new LeafTask('Child 1', 300);
        const child2 = new LeafTask('Child 2', 500);

        visitorLogger.logBeginSubTask(parent, null);

        visitorLogger.logBeginSubTask(child1, parent);
        visitorLogger.logProgress(300);
        visitorLogger.logMessage('Child 1 with visitor complete');
        visitorLogger.logEndSubTask(child1, parent);

        visitorLogger.logBeginSubTask(child2, parent);
        visitorLogger.logProgress(500);
        visitorLogger.logMessage('Child 2 with visitor complete');
        visitorLogger.logEndSubTask(child2, parent);

        visitorLogger.logEndSubTask(parent, null);
        visitorLogger.release();
      }).not.toThrow();
    });
  });

  describe('Real-World Algorithm Simulations', () => {
    it('simulates comprehensive ETL pipeline', () => {
      const pipeline = new LeafTask('ETL Pipeline', 10000);
      const extraction = new LeafTask('Data Extraction', 2000);
      const transformation = new LeafTask('Data Transformation', 6000);
      const loading = new LeafTask('Data Loading', 2000);

      expect(() => {
        logger.logBeginSubTask(pipeline, null);
        logger.logMessage('Starting comprehensive ETL pipeline');

        logger.logBeginSubTask(extraction, pipeline);
        logger.logMessage('Beginning data extraction');
        logger.logProgress(500);
        logger.logMessage('Connected to source database');
        logger.logProgress(1000);
        logger.logMessage('Extracted raw data');
        logger.logProgress(500);
        logger.logMessage('Data extraction completed');
        logger.logEndSubTask(extraction, pipeline);

        logger.logBeginSubTask(transformation, pipeline);
        logger.logMessage('Beginning data transformation');
        logger.logProgress(1500);
        logger.logMessage('Data cleaning completed');
        logger.logProgress(2000);
        logger.logMessage('Data normalization completed');
        logger.logProgress(1500);
        logger.logMessage('Data enrichment completed');
        logger.logProgress(1000);
        logger.logMessage('Data transformation completed');
        logger.logEndSubTask(transformation, pipeline);

        logger.logBeginSubTask(loading, pipeline);
        logger.logMessage('Beginning data loading');
        logger.logProgress(1000);
        logger.logMessage('Target database prepared');
        logger.logProgress(1000);
        logger.logMessage('Data loading completed');
        logger.logEndSubTask(loading, pipeline);

        logger.logMessage('ETL pipeline completed successfully');
        logger.logEndSubTask(pipeline, null);
        logger.release();
      }).not.toThrow();
    });

    it('simulates machine learning training workflow', () => {
      const training = new LeafTask('ML Training', 8000);
      const dataPrep = new LeafTask('Data Preparation', 1500);
      const training_phase = new LeafTask('Model Training', 5000);
      const validation = new LeafTask('Model Validation', 1500);

      expect(() => {
        logger.logBeginSubTask(training, null);
        logger.logMessage('Starting ML training workflow');

        logger.logBeginSubTask(dataPrep, training);
        logger.logMessage('Preparing training data');
        logger.logProgress(500);
        logger.logMessage('Data loaded and preprocessed');
        logger.logProgress(500);
        logger.logMessage('Features extracted');
        logger.logProgress(500);
        logger.logMessage('Data preparation completed');
        logger.logEndSubTask(dataPrep, training);

        logger.logBeginSubTask(training_phase, training);
        logger.logMessage('Beginning model training');
        for (let epoch = 1; epoch <= 10; epoch++) {
          logger.logProgress(500);
          logger.logMessage(`Epoch ${epoch} completed`);
        }
        logger.logMessage('Model training completed');
        logger.logEndSubTask(training_phase, training);

        logger.logBeginSubTask(validation, training);
        logger.logMessage('Validating trained model');
        logger.logProgress(750);
        logger.logMessage('Validation metrics computed');
        logger.logProgress(750);
        logger.logMessage('Model validation completed');
        logger.logEndSubTask(validation, training);

        logger.logMessage('ML training workflow completed');
        logger.logEndSubTask(training, null);
        logger.release();
      }).not.toThrow();
    });

    it('simulates distributed graph processing', () => {
      const graphProcessing = new LeafTask('Graph Processing', 12000);

      expect(() => {
        logger.logBeginSubTask(graphProcessing, null);
        logger.logMessage('Starting distributed graph processing');

        // Simulate multiple worker phases
        for (let phase = 1; phase <= 3; phase++) {
          logger.logMessage(`Starting phase ${phase}`);

          for (let worker = 1; worker <= 4; worker++) {
            const workerTask = new LeafTask(`Phase ${phase} Worker ${worker}`, 1000);
            logger.logBeginSubTask(workerTask, graphProcessing);

            logger.logProgress(250);
            logger.logMessage(`Phase ${phase} Worker ${worker}: initialization complete`);
            logger.logProgress(500);
            logger.logMessage(`Phase ${phase} Worker ${worker}: processing complete`);
            logger.logProgress(250);
            logger.logMessage(`Phase ${phase} Worker ${worker}: cleanup complete`);

            logger.logEndSubTask(workerTask, graphProcessing);
          }

          logger.logMessage(`Phase ${phase} completed`);
        }

        logger.logMessage('Distributed graph processing completed');
        logger.logEndSubTask(graphProcessing, null);
        logger.release();
      }).not.toThrow();
    });
  });

  describe('Edge Cases and Stress Testing', () => {
    it('handles zero volume tasks gracefully', () => {
      const zeroTask = new LeafTask('Zero volume task', 0);

      expect(() => {
        logger.logBeginSubTask(zeroTask, null);
        logger.logMessage('Processing zero volume task');
        logger.logProgress(100); // Should handle division by zero gracefully
        logger.logMessage('Zero volume task completed');
        logger.logEndSubTask(zeroTask, null);
        logger.release();
      }).not.toThrow();
    });

    it('handles high-frequency progress updates', () => {
      const stressTask = new LeafTask('High frequency task', 5000);

      expect(() => {
        logger.logBeginSubTask(stressTask, null);
        logger.logMessage('Starting high-frequency progress logging');

        for (let i = 1; i <= 100; i++) {
          logger.logProgress(50);
          if (i % 20 === 0) {
            logger.logMessage(`Completed ${i} batches`);
          }
        }

        logger.logMessage('High-frequency logging completed');
        logger.logEndSubTask(stressTask, null);
        logger.release();
      }).not.toThrow();
    });

    it('handles extremely large volumes', () => {
      const massiveTask = new LeafTask('Massive task', 1000000);

      expect(() => {
        logger.logBeginSubTask(massiveTask, null);
        logger.logMessage('Processing massive dataset');
        logger.logProgress(250000);
        logger.logMessage('25% of massive dataset processed');
        logger.logProgress(500000);
        logger.logMessage('75% of massive dataset processed');
        logger.logProgress(250000);
        logger.logMessage('Massive dataset processing completed');
        logger.logEndSubTask(massiveTask, null);
        logger.release();
      }).not.toThrow();
    });

    it('handles rapid task creation and cleanup', () => {
      expect(() => {
        logger.logMessage('Starting rapid task sequence');

        for (let i = 0; i < 25; i++) {
          const rapidTask = new LeafTask(`Rapid task ${i}`, 100);
          logger.logBeginSubTask(rapidTask, null);
          logger.logProgress(100);
          if (i % 10 === 9) {
            logger.logMessage(`Completed rapid task batch ${Math.floor(i / 10) + 1}`);
          }
          logger.logEndSubTask(rapidTask, null);
        }

        logger.logMessage('Rapid task sequence completed');
        logger.release();
      }).not.toThrow();
    });
  });

  describe('Resource Management and Cleanup', () => {
    it('handles proper resource cleanup', () => {
      const resourceTask = new LeafTask('Resource management task', 1000);

      expect(() => {
        logger.logBeginSubTask(resourceTask, null);
        logger.logMessage('Allocating resources');
        logger.logProgress(300);
        logger.logMessage('Resources allocated successfully');
        logger.logProgress(400);
        logger.logMessage('Resource processing completed');
        logger.logProgress(300);
        logger.logMessage('Resources released successfully');
        logger.logEndSubTask(resourceTask, null);
        logger.release();
      }).not.toThrow();
    });

    it('handles cleanup during active tasks', () => {
      const activeTask = new LeafTask('Active cleanup task', 1000);

      expect(() => {
        logger.logBeginSubTask(activeTask, null);
        logger.logProgress(500);
        logger.logMessage('Task interrupted - testing cleanup');
        // Don't end subtask - test cleanup during active task
        logger.release();
      }).not.toThrow();
    });

    it('handles multiple logger instances without conflicts', () => {
      const logger2 = new TaskProgressLogger(
        log,
        new LeafTask('Second logger task', 500),
        Concurrency.of(1)
      );

      const logger3 = new TaskProgressLogger(
        log,
        new LeafTask('Third logger task', 300),
        Concurrency.of(3)
      );

      expect(() => {
        const task1 = new LeafTask('Logger 1 task', 400);
        const task2 = new LeafTask('Logger 2 task', 600);
        const task3 = new LeafTask('Logger 3 task', 200);

        logger.logBeginSubTask(task1, null);
        logger.logProgress(400);
        logger.logMessage('Logger 1 completed');
        logger.logEndSubTask(task1, null);

        logger2.logBeginSubTask(task2, null);
        logger2.logProgress(600);
        logger2.logMessage('Logger 2 completed');
        logger2.logEndSubTask(task2, null);

        logger3.logBeginSubTask(task3, null);
        logger3.logProgress(200);
        logger3.logMessage('Logger 3 completed');
        logger3.logEndSubTask(task3, null);

        logger.release();
        logger2.release();
        logger3.release();
      }).not.toThrow();
    });
  });
});
