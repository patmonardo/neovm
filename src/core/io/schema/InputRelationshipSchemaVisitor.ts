/**
 * INPUT RELATIONSHIP SCHEMA VISITOR - PURE VISITOR INTERFACE
 *
 * Visitor interface for processing relationship schema elements.
 * Uses visitor pattern (boolean returns) with state storage in concrete classes.
 */

import { RelationshipType } from '@/projection/RelationshipType';
import { Direction } from '@/api/schema/Direction';
import { Aggregation } from '@/core/Aggregation';
import { InputSchemaVisitor } from './InputSchemaVisitor';
import { ElementSchemaVisitor } from './ElementSchemaVisitor';

export interface InputRelationshipSchemaVisitor extends InputSchemaVisitor {
  /**
   * Visit relationship type.
   */
  relationshipType(relationshipType: RelationshipType): boolean;

  /**
   * Visit aggregation method.
   */
  aggregation(aggregation: Aggregation): boolean;

  /**
   * Visit relationship direction.
   */
  direction(direction: Direction): boolean;
}

export namespace InputRelationshipSchemaVisitor {
  /**
   * Default adapter implementation with no-op visitor methods.
   */
  export abstract class Adapter extends ElementSchemaVisitor implements InputRelationshipSchemaVisitor {
    relationshipType(relationshipType: RelationshipType): boolean {
      return true;
    }

    aggregation(aggregation: Aggregation): boolean {
      return true;
    }

    direction(direction: Direction): boolean {
      return true;
    }
  }
}
