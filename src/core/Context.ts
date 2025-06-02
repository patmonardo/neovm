/**
 * Core execution context for NeoVM operations.
 * Provides user authentication, security context, and execution environment.
 * Designed for GDS interop while remaining standalone-capable.
 */
export interface Context {
  // User and Security Context
  getUser(): User | null;
  getSessionUser(): string | null;
  securityContext(): SecurityContext;

  // Execution Environment
  getParameters(): Map<string, any>;
  getConfig(): ExecutionConfig;
  getExecutionMode(): ExecutionMode;

  // Resource Management
  getAllocatedMemory(): number;
  getMaxMemory(): number;
  getConcurrency(): number;

  // Logging and Monitoring
  getLogLevel(): LogLevel;
  isDebugEnabled(): boolean;
  getMetrics(): ExecutionMetrics;

  // Transaction Context (for future Neo4j interop)
  getTransaction?(): Transaction | null;
  getDatabaseName?(): string;
}

/**
 * Security context providing user authentication and authorization.
 * Compatible with Neo4j security model.
 */
export interface SecurityContext {
  subject(): AuthSubject;
  isAuthenticated(): boolean;
  hasRole(role: string): boolean;
  getRoles(): string[];
}

/**
 * Authentication subject representing the executing user.
 * Maps to Neo4j's AuthSubject for interop.
 */
export interface AuthSubject {
  executingUser(): string;
  authenticatedUser(): string;
  isAuthenticated(): boolean;
  hasUsername(username: string): boolean;
}

/**
 * User information with roles and permissions.
 */
export interface User {
  readonly username: string;
  readonly roles: string[];
  readonly isAuthenticated: boolean;
  readonly permissions: string[];
}

/**
 * Execution configuration for algorithms and operations.
 */
export interface ExecutionConfig {
  readonly concurrency?: number;
  readonly maxMemory?: number;
  readonly logLevel?: LogLevel;
  readonly debugEnabled?: boolean;
  readonly [key: string]: any;
}

/**
 * Execution mode for different runtime environments.
 */
export enum ExecutionMode {
  STANDALONE = 'standalone',
  NEO4J_EMBEDDED = 'neo4j-embedded',
  NEO4J_FABRIC = 'neo4j-fabric',
  DISTRIBUTED = 'distributed'
}

/**
 * Log levels for execution context.
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Execution metrics and performance data.
 */
export interface ExecutionMetrics {
  readonly startTime: number;
  readonly memoryUsed: number;
  readonly cpuTime: number;
  readonly tasksCompleted: number;
  readonly errorsCount: number;
}

/**
 * Transaction context for database operations.
 */
export interface Transaction {
  readonly id: string;
  readonly startTime: number;
  isOpen(): boolean;
  commit(): void;
  rollback(): void;
}
