import { ElementProjection } from '@/ElementProjection';
import { NodeLabel } from '@/NodeLabel';
import { RelationshipType } from '@/RelationshipType';
import { GraphStore } from '@/api/GraphStore';
import { formatWithLocale } from '@/utils/StringFormatting';
import { join } from '@/utils/StringJoining';

/**
 * Utility class for validating element types in a graph
 */
export class ElementTypeValidator {
    // Private constructor to prevent instantiation
    private constructor() { }

    /**
     * Resolves node labels from string identifiers
     */
    public static resolve(graphStore: GraphStore, labelFilterNames: string[]): Set<NodeLabel> {
        return labelFilterNames.includes(ElementProjection.PROJECT_ALL)
            ? graphStore.nodeLabels()
            : new Set(labelFilterNames.map(name => NodeLabel.of(name)));
    }

    /**
     * Resolves relationship types from string identifiers
     */
    public static resolveTypes(graphStore: GraphStore, relFilterNames: string[]): Set<RelationshipType> {
        return relFilterNames.includes(ElementProjection.PROJECT_ALL)
            ? graphStore.relationshipTypes()
            : new Set(relFilterNames.map(name => RelationshipType.of(name)));
    }

    /**
     * Validates that all specified node labels exist in the graph
     */
    public static validate(graphStore: GraphStore, labelFilter: Set<NodeLabel>, filterName: string): void {
        const availableLabels = graphStore.nodeLabels();

        const invalidLabels = Array.from(labelFilter)
            .filter(label => !availableLabels.has(label))
            .map(label => label.name());

        if (invalidLabels.length > 0) {
            throw new Error(formatWithLocale(
                "Could not find the specified %s of %s. Available labels are %s.",
                filterName,
                join(invalidLabels),
                join(Array.from(availableLabels).map(label => label.name()))
            ));
        }
    }

    /**
     * Validates that all specified relationship types exist in the graph
     */
    public static validateTypes(graphStore: GraphStore, relFilter: Set<RelationshipType>, filterName: string): void {
        const availableTypes = graphStore.relationshipTypes();

        const invalidLabels = Array.from(relFilter)
            .filter(type => !availableTypes.has(type))
            .map(type => type.name());

        if (invalidLabels.length > 0) {
            throw new Error(formatWithLocale(
                "Could not find the specified %s of %s. Available relationship types are %s.",
                filterName,
                join(invalidLabels),
                join(Array.from(availableTypes).map(type => type.name()))
            ));
        }
    }

    /**
     * Resolves and validates node labels in one step
     */
    public static resolveAndValidate(
        graphStore: GraphStore,
        labelFilterNames: string[],
        filterName: string
    ): Set<NodeLabel> {
        const nodeLabels = this.resolve(graphStore, labelFilterNames);
        this.validate(graphStore, nodeLabels, filterName);

        return nodeLabels;
    }

    /**
     * Resolves and validates relationship types in one step
     */
    public static resolveAndValidateTypes(
        graphStore: GraphStore,
        relFilterNames: string[],
        filterName: string
    ): Set<RelationshipType> {
        const relFilter = this.resolveTypes(graphStore, relFilterNames);
        this.validateTypes(graphStore, relFilter, filterName);

        return relFilter;
    }
}
