/**
 * GRAPH STORE CATALOG ENTRY - SIMPLE RECORD
 *
 * Immutable record containing graph store, config, and result store.
 */

import { GraphStore } from '@/api';
import { GraphProjectConfig } from '@/config';
import { ResultStore } from '@/api'; // TODO: Import real ResultStore

export class GraphStoreCatalogEntry {
  constructor(
    public readonly graphStore: GraphStore,    // TODO: Import real GraphStore
    public readonly config: GraphProjectConfig,        // TODO: Import real GraphProjectConfig
    public readonly resultStore: ResultStore    // TODO: Import real ResultStore
  ) {}
}
