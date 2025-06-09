import {
  Context,
  SecurityContext,
  AuthSubject,
  User,
  ExecutionConfig,
  ExecutionMode,
  LogLevel,
  ExecutionMetrics,
  Transaction,
} from "./Context";

/**
 * Basic implementation of Context for standalone NeoVM execution.
 * Provides all required functionality with sensible defaults.
 */
export class BasicContext implements Context {
  private readonly user: User | null;
  private readonly sessionUser: string | null;
  private readonly parameters: Map<string, any>;
  private readonly config: ExecutionConfig;
  private readonly executionMode: ExecutionMode;
  private readonly startTime: number;
  private readonly securityCtx: SecurityContext;

  constructor(options: ContextOptions = {}) {
    this.user = options.user || null;
    this.sessionUser = options.sessionUser || null;
    this.parameters = new Map(options.parameters || []);
    this.config = { ...options.config };
    this.executionMode = options.executionMode || ExecutionMode.STANDALONE;
    this.startTime = Date.now();
    this.securityCtx = new BasicSecurityContext(this.user);
  }

  // User and Security Context
  public getUser(): User | null {
    return this.user;
  }

  public getSessionUser(): string | null {
    return this.sessionUser;
  }

  public securityContext(): SecurityContext {
    return this.securityCtx;
  }

  // Execution Environment
  public getParameters(): Map<string, any> {
    return this.parameters;
  }

  public getConfig(): ExecutionConfig {
    return this.config;
  }

  public getExecutionMode(): ExecutionMode {
    return this.executionMode;
  }

  // Resource Management
  public getAllocatedMemory(): number {
    return this.config.maxMemory || 0;
  }

  public getMaxMemory(): number {
    return this.config.maxMemory || Number.MAX_SAFE_INTEGER;
  }

  public getConcurrency(): number {
    return this.config.concurrency || 1;
  }

  // Logging and Monitoring
  public getLogLevel(): LogLevel {
    return this.config.logLevel || LogLevel.INFO;
  }

  public isDebugEnabled(): boolean {
    return this.config.debugEnabled || this.getLogLevel() === LogLevel.DEBUG;
  }

  public getMetrics(): ExecutionMetrics {
    return {
      startTime: this.startTime,
      memoryUsed: 0, // Would be updated by runtime
      cpuTime: Date.now() - this.startTime,
      tasksCompleted: 0,
      errorsCount: 0,
    };
  }

  // Transaction Context (optional for Neo4j interop)
  public getTransaction(): Transaction | null {
    return null; // Not supported in basic context
  }

  public getDatabaseName(): string {
    return "neovm";
  }
}

/**
 * Basic security context implementation.
 */
class BasicSecurityContext implements SecurityContext {
  private readonly authSubject: AuthSubject;

  constructor(user: User | null) {
    this.authSubject = new BasicAuthSubject(user);
  }

  public subject(): AuthSubject {
    return this.authSubject;
  }

  public isAuthenticated(): boolean {
    return this.authSubject.isAuthenticated();
  }

  public hasRole(role: string): boolean {
    return (
      this.authSubject.isAuthenticated() &&
      (this.getUserRoles().includes(role) ||
        this.getUserRoles().includes("admin"))
    );
  }

  public getRoles(): string[] {
    return this.getUserRoles();
  }

  private getUserRoles(): string[] {
    // Access user through context would be circular, so we'll need the user passed in
    // This is a simplified implementation
    return ["user"];
  }
}

/**
 * Basic authentication subject implementation.
 */
class BasicAuthSubject implements AuthSubject {
  private readonly user: User | null;

  constructor(user: User | null) {
    this.user = user;
  }

  public executingUser(): string {
    return this.user?.username || "anonymous";
  }

  public authenticatedUser(): string {
    return this.user?.username || "anonymous";
  }

  public isAuthenticated(): boolean {
    return this.user?.isAuthenticated || false;
  }

  public hasUsername(username: string): boolean {
    return this.user?.username === username;
  }
}

/**
 * Options for creating a BasicContext.
 */
export interface ContextOptions {
  user?: User | null;
  sessionUser?: string | null;
  parameters?: [string, any][];
  config?: ExecutionConfig;
  executionMode?: ExecutionMode;
}
