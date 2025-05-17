import { Username } from "./Username";

/**
 * Simulates the registration of a Username provider in a global registry.
 * This is a TypeScript/Node.js adaptation of the Neo4j extension pattern.
 */
export class UsernameExtension {
  static EXTENSION_TYPE = "GLOBAL";
  static NAME = "gds.username";

  /**
   * Registers the Username provider in the given registry.
   * @param registry The global procedures registry (or DI container)
   */
  static register(registry: GlobalProceduresRegistry) {
    registry.registerComponent(Username, UsernameExtension.createUsername, true);
  }

  /**
   * Factory method to create a Username from a context.
   * @param context The procedure or request context
   */
  static createUsername(context: Context): Username {
    const subject = context.securityContext().subject();
    const username = subject.executingUser();
    return new Username(username);
  }
}

/**
 * Minimal interfaces to represent dependencies.
 * In a real system, these would be more fully featured or imported.
 */
export interface GlobalProceduresRegistry {
  registerComponent<T>(
    clazz: new (...args: any[]) => T,
    factory: (context: Context) => T,
    singleton: boolean
  ): void;
}

export interface Context {
  securityContext(): {
    subject(): {
      executingUser(): string;
    };
  };
}
