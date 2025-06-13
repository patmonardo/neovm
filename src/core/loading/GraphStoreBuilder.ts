import { DatabaseInfo } from "@/api/DatabaseInfo";
import { MutableGraphSchema } from "@/api/schema";
import { GraphPropertyStore } from "@/api/properties";
import { Concurrency } from "@/concurrency";
import { Capabilities } from "./Capabilities";
import { CSRGraphStore } from "./CSRGraphStore";
import { Nodes } from "./Nodes";
import { RelationshipImportResult } from "./RelationshipImportResult";

/**
 * GraphStoreBuilder collects parameters and invokes the static factory method:
 * CSRGraphStore.of(..).
 * Call the build() method to get a result of type CSRGraphStore.
 *
 * GraphStoreBuilder is not thread-safe and generally should not be stored in a field or collection,
 * but instead used immediately to create instances.
 */
export class GraphStoreBuilder {
  private static readonly INIT_BIT_DATABASE_INFO = 0x1;
  private static readonly INIT_BIT_CAPABILITIES = 0x2;
  private static readonly INIT_BIT_SCHEMA = 0x4;
  private static readonly INIT_BIT_NODES = 0x8;
  private static readonly INIT_BIT_RELATIONSHIP_IMPORT_RESULT = 0x10;
  private static readonly INIT_BIT_CONCURRENCY = 0x20;

  private initBits = 0x3f; // All required bits set initially

  private _databaseInfo?: DatabaseInfo;
  private _capabilities?: Capabilities;
  private _schema?: MutableGraphSchema;
  private _nodes?: Nodes;
  private _relationshipImportResult?: RelationshipImportResult;
  private _graphProperties?: GraphPropertyStore;
  private _concurrency?: Concurrency;
  private _zoneId?: string; // Using string instead of ZoneId for simplicity

  /**
   * Creates a GraphStoreBuilder factory builder.
   *
   */
  constructor() {}

  /**
   * Initializes the value for the databaseInfo attribute.
   */
  databaseInfo(databaseInfo: DatabaseInfo): GraphStoreBuilder {
    if (!databaseInfo) {
      throw new Error("databaseInfo cannot be null");
    }
    this._databaseInfo = databaseInfo;
    this.initBits &= ~GraphStoreBuilder.INIT_BIT_DATABASE_INFO;
    return this;
  }

  /**
   * Initializes the value for the capabilities attribute.
   */
  capabilities(capabilities: Capabilities): GraphStoreBuilder {
    if (!capabilities) {
      throw new Error("capabilities cannot be null");
    }
    this._capabilities = capabilities;
    this.initBits &= ~GraphStoreBuilder.INIT_BIT_CAPABILITIES;
    return this;
  }

  /**
   * Initializes the value for the schema attribute.
   */
  schema(schema: MutableGraphSchema): GraphStoreBuilder {
    if (!schema) {
      throw new Error("schema cannot be null");
    }
    this._schema = schema;
    this.initBits &= ~GraphStoreBuilder.INIT_BIT_SCHEMA;
    return this;
  }

  /**
   * Initializes the value for the nodes attribute.
   */
  nodes(nodes: Nodes): GraphStoreBuilder {
    if (!nodes) {
      throw new Error("nodes cannot be null");
    }
    this._nodes = nodes;
    this.initBits &= ~GraphStoreBuilder.INIT_BIT_NODES;
    return this;
  }

  /**
   * Initializes the value for the relationshipImportResult attribute.
   */
  relationshipImportResult(
    relationshipImportResult: RelationshipImportResult
  ): GraphStoreBuilder {
    if (!relationshipImportResult) {
      throw new Error("relationshipImportResult cannot be null");
    }
    this._relationshipImportResult = relationshipImportResult;
    this.initBits &= ~GraphStoreBuilder.INIT_BIT_RELATIONSHIP_IMPORT_RESULT;
    return this;
  }

  /**
   * Initializes the optional value graphProperties.
   */
  graphProperties(graphProperties?: GraphPropertyStore): GraphStoreBuilder {
    this._graphProperties = graphProperties;
    return this;
  }

  /**
   * Initializes the value for the concurrency attribute.
   */
  concurrency(concurrency: Concurrency): GraphStoreBuilder {
    if (!concurrency) {
      throw new Error("concurrency cannot be null");
    }
    this._concurrency = concurrency;
    this.initBits &= ~GraphStoreBuilder.INIT_BIT_CONCURRENCY;
    return this;
  }

  /**
   * Initializes the optional value zoneId.
   */
  zoneId(zoneId?: string): GraphStoreBuilder {
    this._zoneId = zoneId;
    return this;
  }

  /**
   * Invokes CSRGraphStore.of(..) using the collected parameters and returns the result.
   * @throws Error if any required attributes are missing
   */
  build(): CSRGraphStore {
    this.checkRequiredAttributes();

    return CSRGraphStore.of(
      this._databaseInfo!,
      this._capabilities!,
      this._schema!,
      this._nodes!,
      this._relationshipImportResult!,
      this._graphProperties,
      this._concurrency!,
      this._zoneId
    );
  }

  private databaseInfoIsSet(): boolean {
    return (this.initBits & GraphStoreBuilder.INIT_BIT_DATABASE_INFO) === 0;
  }

  private capabilitiesIsSet(): boolean {
    return (this.initBits & GraphStoreBuilder.INIT_BIT_CAPABILITIES) === 0;
  }

  private schemaIsSet(): boolean {
    return (this.initBits & GraphStoreBuilder.INIT_BIT_SCHEMA) === 0;
  }

  private nodesIsSet(): boolean {
    return (this.initBits & GraphStoreBuilder.INIT_BIT_NODES) === 0;
  }

  private relationshipImportResultIsSet(): boolean {
    return (
      (this.initBits &
        GraphStoreBuilder.INIT_BIT_RELATIONSHIP_IMPORT_RESULT) ===
      0
    );
  }

  private concurrencyIsSet(): boolean {
    return (this.initBits & GraphStoreBuilder.INIT_BIT_CONCURRENCY) === 0;
  }

  private checkRequiredAttributes(): void {
    if (this.initBits !== 0) {
      throw new Error(this.formatRequiredAttributesMessage());
    }
  }

  private formatRequiredAttributesMessage(): string {
    const attributes: string[] = [];
    if (!this.databaseInfoIsSet()) attributes.push("databaseInfo");
    if (!this.capabilitiesIsSet()) attributes.push("capabilities");
    if (!this.schemaIsSet()) attributes.push("schema");
    if (!this.nodesIsSet()) attributes.push("nodes");
    if (!this.relationshipImportResultIsSet())
      attributes.push("relationshipImportResult");
    if (!this.concurrencyIsSet()) attributes.push("concurrency");

    return `Cannot build GraphStore, some of required attributes are not set: ${attributes.join(
      ", "
    )}`;
  }
}
