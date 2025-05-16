import { NodeLabel } from '../../NodeLabel';
import { PropertyMapping } from '../../PropertyMapping';
import { PropertyMappings } from '../../PropertyMappings';
import { IdMap } from '../../api/IdMap';
import { PropertyState } from '../../api/PropertyState';
import { NodePropertyStore } from '../../api/properties/nodes/NodePropertyStore';
import { NodePropertyValues } from '../../api/properties/nodes/NodePropertyValues';
import { MutableNodeSchema, NodeSchema } from '../../api/schema/MutableNodeSchema';
import { ImmutablePropertySchema } from '../../api/schema/ImmutablePropertySchema';
import { ImmutableNodeProperty } from '../../api/properties/nodes/NodeProperty';
// Ensure DefaultValue and ValueType are correctly imported/used by the above placeholders

/**
 * Represents the nodes of a graph, including their schema, ID mapping, and properties.
 */
export interface Nodes {
  /**
   * @returns The schema defining labels and properties of the nodes.
   */
  schema(): NodeSchema;

  /**
   * @returns The ID map for translating between original and mapped node IDs.
   */
  idMap(): IdMap;

  /**
   * @returns The store for node properties.
   *          If no properties are defined, this will be an empty store.
   */
  properties(): NodePropertyStore;
}

/**
 * Concrete implementation of the Nodes interface.
 * This stands in for the Immutables-generated class (e.g., ImmutableNodes).
 */
class ConcreteNodes implements Nodes {
  private readonly _schema: NodeSchema;
  private readonly _idMap: IdMap;
  private readonly _properties: NodePropertyStore;

  constructor(schema: NodeSchema, idMap: IdMap, properties: NodePropertyStore) {
    this._schema = schema;
    this._idMap = idMap;
    this._properties = properties;
  }

  schema(): NodeSchema {
    return this._schema;
  }

  idMap(): IdMap {
    return this._idMap;
  }

  properties(): NodePropertyStore {
    return this._properties;
  }

  /**
   * Static factory method to construct Nodes instances.
   */
  public static of(
    idMap: IdMap,
    propertyMappings: Map<NodeLabel, PropertyMappings>, // Java: Map<NodeLabel, PropertyMappings>
    propertyValuesMap: Map<PropertyMapping, NodePropertyValues<any>>, // Java: Map<PropertyMapping, NodePropertyValues>
    propertyState: PropertyState
  ): Nodes {
    const mutableNodeSchema = MutableNodeSchema.empty();
    const nodePropertyStoreBuilder = NodePropertyStore.builder();

    propertyMappings.forEach((mappingsForLabel, nodeLabel) => {
      if (mappingsForLabel.mappings().length === 0) {
        mutableNodeSchema.addLabel(nodeLabel);
      } else {
        mappingsForLabel.mappings().forEach(currentPropertyMapping => {
          // Find the corresponding NodePropertyValues.
          // This relies on PropertyMapping having a way to be uniquely identified if used as a Map key.
          // A common approach is to use a string representation of its key components.
          // For this translation, we'll iterate to find it based on propertyKey name for robustness with object keys.
          let nodePropertyValues: NodePropertyValues<any> | undefined;
          for (const [pmKey, npv] of propertyValuesMap.entries()) {
            if (pmKey.propertyKey().key === currentPropertyMapping.propertyKey().key) {
              nodePropertyValues = npv;
              break;
            }
          }

          if (!nodePropertyValues) {
            // This indicates an inconsistency if a mapping exists but its values don't.
            // GDS might throw here or have specific fallback logic.
            // For now, we'll log a warning and skip this property.
            console.warn(
              `NodePropertyValues not found for property mapping: '${currentPropertyMapping.propertyKey().key}' on label '${nodeLabel.name()}'. Skipping this property.`
            );
            return; // Continue to the next propertyMapping
          }

          const defaultValue = currentPropertyMapping.defaultValue().isUserDefined()
            ? currentPropertyMapping.defaultValue()
            : nodePropertyValues.valueType().fallbackValue();

          const propSchema = ImmutablePropertySchema.builder()
            .key(currentPropertyMapping.propertyKey())
            .valueType(nodePropertyValues.valueType())
            .defaultValue(defaultValue)
            .state(propertyState)
            .build();

          mutableNodeSchema.addProperty(nodeLabel, propSchema.key(), propSchema);
          nodePropertyStoreBuilder.putProperty(
            propSchema.key(),
            ImmutableNodeProperty.of(nodePropertyValues, propSchema)
          );
        });
      }
    });

    return new ConcreteNodes(mutableNodeSchema, idMap, nodePropertyStoreBuilder.build());
  }
}

// Export a factory object to mimic the static method on the interface if desired
export const NodesFactory = {
  of: ConcreteNodes.of,
};
