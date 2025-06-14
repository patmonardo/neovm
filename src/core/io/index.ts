export * from "./EntityLongIdVisitor";
export * from "./GraphStoreExporter";
export * from "./GraphStoreExporterBaseConfig";
export * from "./GraphStoreGraphPropertyVisitor";
export * from "./GraphStoreRelationshipVisitor";
export * from "./GraphStoreInput";
export * from "./IdentifierMapper";
export * from "./MetaDataStore";
export * from "./NodeStore";
export * from "./RelationshipStore";

/**
 * Interface for objects that can be flushed (similar to Java's Flushable).
 */
export interface Flushable {
  flush(): void;
}
