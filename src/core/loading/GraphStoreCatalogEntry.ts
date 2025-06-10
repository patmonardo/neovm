import { GraphStore } from "@/api";
import { GraphProjectConfig } from "@/config";
import { ResultStore } from "@/api"; // TODO: Import real ResultStore

/**
 * GRAPH STORE CATALOG ENTRY - SIMPLE RECORD
 *
 * Immutable record containing graph store, config, and result store.
 */

export class GraphStoreCatalogEntry {
  constructor(
    public readonly graphStore: GraphStore,
    public readonly config: GraphProjectConfig,
    public readonly resultStore: ResultStore
  ) {}
}
