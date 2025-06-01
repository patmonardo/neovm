/**
 * GROUP - ID GROUPING FOR BATCH IMPORTS
 *
 * Group of input ids. Used primarily in mapping otherwise equal ids into different groups.
 * Simple record from Neo4j batch import API.
 */

export class Group {
  constructor(
    public readonly id: number,
    public readonly name: string | null,
    public readonly specificIdType: string | null
  ) {}

  descriptiveName(): string {
    return this.name !== null ? this.name : "global id space";
  }

  hashCode(): number {
    const prime = 31;
    let result = 1;
    result = prime * result + this.id;
    return result;
  }

  equals(obj: any): boolean {
    return obj instanceof Group && obj.id === this.id;
  }

  toString(): string {
    return this.descriptiveName();
  }
}
