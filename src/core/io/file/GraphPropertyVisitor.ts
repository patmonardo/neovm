import { InputEntityVisitor } from '@/api/import';

/**
 * Interface for objects that can be flushed (similar to Java's Flushable).
 */
export interface Flushable {
  flush(): void;
}

/**
 * Abstract base class for visiting graph properties during import/export operations.
 * Extends the InputEntityVisitor.Adapter to handle graph-level property processing.
 *
 * Graph properties are properties that belong to the graph itself rather than
 * to individual nodes or relationships.
 */
export abstract class GraphPropertyVisitor extends InputEntityVisitor.Adapter implements Flushable {
  /**
   * Flushes any buffered graph property data.
   * Subclasses should implement this to ensure data persistence.
   */
  abstract flush(): void;
}
