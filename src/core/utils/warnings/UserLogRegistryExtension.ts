// --- Placeholder: org.neo4j.configuration.Config ---
// filepath: /home/pat/VSCode/neovm/src/kernel/configuration/Config.ts
export interface Config {
  get<T>(setting: any): T; // Simplified
  // Add other methods if used by the extension
}

// --- Placeholder: org.neo4j.gds.core.utils.progress.ProgressFeatureSettings ---
// filepath: /home/pat/VSCode/neovm/src/core/utils/progress/ProgressFeatureSettings.ts
export const ProgressFeatureSettings = {
  progress_tracking_enabled: 'gds.progress_tracking.enabled' // Example setting key
};

// --- Placeholder: org.neo4j.graphdb.GraphDatabaseService ---
// filepath: /home/pat/VSCode/neovm/src/graphdb/GraphDatabaseService.ts
export interface GraphDatabaseService {
  databaseName(): string;
  // Add other methods if used
}

// --- Placeholder: org.neo4j.kernel.api.procedure.GlobalProcedures ---
// filepath: /home/pat/VSCode/neovm/src/kernel/api/procedure/GlobalProcedures.ts
export interface GlobalProcedures {
  registerComponent<T>(
    type: new (...args: any[]) => T, // Class type
    instanceOrProvider: T | ((ctx: any) => T), // Instance or factory function
    isSingleton: boolean
  ): void;
  // Add other methods if used
}

// --- Placeholder: org.neo4j.kernel.extension.ExtensionType ---
// filepath: /home/pat/VSCode/neovm/src/kernel/extension/ExtensionType.ts
export enum ExtensionType {
  DATABASE = 'DATABASE',
  // other types
}

// --- Placeholder: org.neo4j.kernel.extension.context.ExtensionContext ---
// filepath: /home/pat/VSCode/neovm/src/kernel/extension/context/ExtensionContext.ts
export interface ExtensionContext {
  dependencySatisfier(): { // Simplified
    satisfyDependency(dependency: any): void;
  };
  // Add other methods if used
}

// --- Placeholder: org.neo4j.kernel.lifecycle.Lifecycle ---
// filepath: /home/pat/VSCode/neovm/src/kernel/lifecycle/Lifecycle.ts
export interface Lifecycle {
  init?(): Promise<void> | void;
  start?(): Promise<void> | void;
  stop?(): Promise<void> | void;
  shutdown?(): Promise<void> | void;
}

// --- Placeholder: org.neo4j.kernel.lifecycle.LifecycleAdapter ---
// filepath: /home/pat/VSCode/neovm/src/kernel/lifecycle/LifecycleAdapter.ts
import { Lifecycle } from './Lifecycle';
export class LifecycleAdapter implements Lifecycle {
  // No-op implementations
  public async init(): Promise<void> {}
  public async start(): Promise<void> {}
  public async stop(): Promise<void> {}
  public async shutdown(): Promise<void> {}
}

// --- Placeholder: org.neo4j.kernel.extension.ExtensionFactory ---
// filepath: /home/pat/VSCode/neovm/src/kernel/extension/ExtensionFactory.ts
import { ExtensionContext } from './context/ExtensionContext';
import { ExtensionType } from './ExtensionType';
import { Lifecycle } from '../lifecycle/Lifecycle';

export abstract class ExtensionFactory<T_Dependencies> {
  protected extensionType: ExtensionType;
  protected name: string;

  constructor(type: ExtensionType, name: string) {
    this.extensionType = type;
    this.name = name;
  }

  public abstract newInstance(context: ExtensionContext, dependencies: T_Dependencies): Lifecycle;
}

// --- Placeholder: org.neo4j.logging.internal.LogService ---
// filepath: /home/pat/VSCode/neovm/src/logging/internal/LogService.ts
export interface LogService {
  getUserLog(clazz: any): any; // Simplified
  // Add other methods if used
}
