import { GraphDimensions } from "@/core/GraphDimensions"; // Adjust path as needed
import { Concurrency } from "@/concurrency/Concurrency"; // Adjust path as needed
import { Estimate } from "./Estimate";
import { MemoryRange } from "./MemoryRange";
import { MemoryTree } from "./MemoryTree"; // Assuming MemoryTree.ts defines the interface and namespace
import { MemoryEstimation } from "./MemoryEstimation"; // Assuming MemoryEstimation.ts defines the interface

// --- Type Aliases ---

export type MemoryRangeModifier = (
  range: MemoryRange,
  dimensions: GraphDimensions,
  concurrency: Concurrency
) => MemoryRange;

export type MemoryEstimationSetup = (
  dimensions: GraphDimensions,
  concurrency: Concurrency
) => MemoryEstimation;

// --- Internal MemoryTree Implementations ---

abstract class BaseTreeImpl implements MemoryTree {
  constructor(private _description: string) {}

  description(): string {
    return this._description;
  }

  abstract memoryUsage(): MemoryRange;

  components(): MemoryTree[] {
    return [];
  }

  toString(): string {
    return this.description();
  }

  formatTree(indent?: string, sb?: string[]): string {
    const initialIndent = indent === undefined ? "" : indent;
    const stringBuilder = sb === undefined ? [] : sb;
    if (sb === undefined) {
      this._formatTreeRec(initialIndent, stringBuilder);
      return stringBuilder.join("\n");
    } else {
      this._formatTreeRec(initialIndent, stringBuilder);
      return ""; // Handled by root
    }
  }
  abstract _formatTreeRec(currentIndent: string, sb: string[]): void;
}

class LeafTreeImpl extends BaseTreeImpl {
  constructor(description: string, private range: MemoryRange) {
    super(description);
  }
  memoryUsage(): MemoryRange {
    return this.range;
  }
  _formatTreeRec(currentIndent: string, sb: string[]): void {
    sb.push(`${currentIndent}${this.description()}: ${this.range.toString()}`);
  }
}

class AndThenTreeImpl extends BaseTreeImpl {
  constructor(
    description: string,
    private delegateTree: MemoryTree, // Renamed to avoid conflict with class member
    private andThenOp: (range: MemoryRange) => MemoryRange
  ) {
    super(description);
  }
  memoryUsage(): MemoryRange {
    return this.andThenOp(this.delegateTree.memoryUsage());
  }
  components(): MemoryTree[] {
    return this.delegateTree.components();
  }
  _formatTreeRec(currentIndent: string, sb: string[]): void {
    sb.push(
      `${currentIndent}${this.description()}: ${this.memoryUsage().toString()}`
    );
    this.delegateTree._formatTreeRec(currentIndent + "  ", sb);
  }
}

class CompositeTreeImpl extends BaseTreeImpl {
  constructor(description: string, private _treeComponents: MemoryTree[]) {
    // Renamed
    super(description);
  }
  components(): MemoryTree[] {
    return this._treeComponents;
  }
  memoryUsage(): MemoryRange {
    return this._treeComponents
      .map((c) => c.memoryUsage())
      .reduce((acc, current) => acc.add(current), MemoryRange.empty());
  }
  _formatTreeRec(currentIndent: string, sb: string[]): void {
    sb.push(
      `${currentIndent}${this.description()}: ${this.memoryUsage().toString()}`
    );
    this._treeComponents.forEach((comp) =>
      comp._formatTreeRec(currentIndent + "  ", sb)
    );
  }
}

class CompositeMaxTreeImpl extends BaseTreeImpl {
  constructor(description: string, private _treeComponents: MemoryTree[]) {
    // Renamed
    super(description);
  }
  components(): MemoryTree[] {
    return this._treeComponents;
  }
  memoryUsage(): MemoryRange {
    return this._treeComponents
      .map((c) => c.memoryUsage())
      .reduce(
        (acc, current) => MemoryRange.maximum(acc, current),
        MemoryRange.empty()
      ); // Assuming MemoryRange.max exists
  }
  _formatTreeRec(currentIndent: string, sb: string[]): void {
    sb.push(
      `${currentIndent}${this.description()}: ${this.memoryUsage().toString()}`
    );
    this._treeComponents.forEach((comp) =>
      comp._formatTreeRec(currentIndent + "  ", sb)
    );
  }
}

class DelegateTreeImpl extends BaseTreeImpl {
  constructor(private delegateTree: MemoryTree, description: string) {
    // Renamed
    super(description);
  }
  components(): MemoryTree[] {
    return this.delegateTree.components();
  }
  memoryUsage(): MemoryRange {
    return this.delegateTree.memoryUsage();
  }
  _formatTreeRec(currentIndent: string, sb: string[]): void {
    sb.push(
      `${currentIndent}${this.description()}: ${this.memoryUsage().toString()}`
    );
    this.delegateTree._formatTreeRec(currentIndent + "  ", sb);
  }
}

const EMPTY_MEMORY_TREE_IMPL: MemoryTree = new (class extends BaseTreeImpl {
  constructor() {
    super("");
  }
  memoryUsage(): MemoryRange {
    return MemoryRange.empty();
  }
  _formatTreeRec(currentIndent: string, sb: string[]): void {
    sb.push(`${currentIndent}empty: ${MemoryRange.empty().toString()}`);
  }
})();

// --- Internal MemoryEstimation Implementations ---

abstract class BaseEstimationImpl implements MemoryEstimation {
  constructor(protected _estDescription: string) {} // Renamed
  description(): string {
    return this._estDescription;
  }
  abstract estimate(
    dimensions: GraphDimensions,
    concurrency: Concurrency
  ): MemoryTree;
  components(): MemoryEstimation[] {
    return [this];
  }
  toString(): string {
    return this.description();
  }
}

type MemoryResidentFunction = (
  dimensions: GraphDimensions,
  concurrency: Concurrency
) => MemoryRange;

class LeafEstimationImpl extends BaseEstimationImpl {
  constructor(description: string, private resident: MemoryResidentFunction) {
    super(description);
  }
  estimate(dimensions: GraphDimensions, concurrency: Concurrency): MemoryTree {
    const memoryRange = this.resident(dimensions, concurrency);
    return new LeafTreeImpl(this.description(), memoryRange);
  }
}

class SetupEstimationImpl extends BaseEstimationImpl {
  constructor(description: string, private setupFn: MemoryEstimationSetup) {
    // Renamed
    super(description);
  }
  estimate(dimensions: GraphDimensions, concurrency: Concurrency): MemoryTree {
    const estimation = this.setupFn(dimensions, concurrency);
    return estimation.estimate(dimensions, concurrency);
  }
}

class AndThenEstimationImpl extends BaseEstimationImpl {
  constructor(
    description: string,
    private delegateEst: MemoryEstimation, // Renamed
    private andThenMod: MemoryRangeModifier // Renamed
  ) {
    super(description);
  }
  components(): MemoryEstimation[] {
    return this.delegateEst.components().map(
      (e) => new AndThenEstimationImpl(e.description(), e, this.andThenMod) // Recursive call with Impl
    );
  }
  estimate(dimensions: GraphDimensions, concurrency: Concurrency): MemoryTree {
    const memoryTree = this.delegateEst.estimate(dimensions, concurrency);
    const rootModifierOp = (range: MemoryRange) =>
      this.andThenMod(range, dimensions, concurrency);
    return new AndThenTreeImpl(this.description(), memoryTree, rootModifierOp);
  }
}

class CompositeEstimationImpl extends BaseEstimationImpl {
  constructor(description: string, private _estComponents: MemoryEstimation[]) {
    // Renamed
    super(description);
  }
  components(): MemoryEstimation[] {
    return this._estComponents;
  }
  estimate(dimensions: GraphDimensions, concurrency: Concurrency): MemoryTree {
    const newComponents = this._estComponents.map((e) =>
      e.estimate(dimensions, concurrency)
    );
    return new CompositeTreeImpl(this.description(), newComponents);
  }
}

class DelegateEstimationImpl extends BaseEstimationImpl {
  constructor(private delegateEst: MemoryEstimation, description: string) {
    // Renamed
    super(description);
  }
  components(): MemoryEstimation[] {
    return this.delegateEst.components();
  }
  estimate(dimensions: GraphDimensions, concurrency: Concurrency): MemoryTree {
    return new DelegateTreeImpl(
      this.delegateEst.estimate(dimensions, concurrency),
      this.description()
    );
  }
}

class MaxEstimationImpl extends BaseEstimationImpl {
  private _estComponents: MemoryEstimation[]; // Renamed
  constructor(
    descriptionOrComponents: string | MemoryEstimation[],
    componentsArg?: MemoryEstimation[]
  ) {
    if (typeof descriptionOrComponents === "string") {
      super(descriptionOrComponents);
      this._estComponents = componentsArg!;
    } else {
      const defaultDesc =
        descriptionOrComponents.length === 2
          ? `max of ${descriptionOrComponents[0].description()} and ${descriptionOrComponents[1].description()}`
          : "max";
      super(defaultDesc);
      this._estComponents = descriptionOrComponents;
    }
  }
  estimate(dimensions: GraphDimensions, concurrency: Concurrency): MemoryTree {
    const childrenTrees = this._estComponents.map((component) =>
      component.estimate(dimensions, concurrency)
    );
    return new CompositeMaxTreeImpl(this.description(), childrenTrees);
  }
}

const NULL_ESTIMATION_IMPL: MemoryEstimation =
  new (class extends BaseEstimationImpl {
    constructor() {
      super("");
    }
    estimate(
      _dimensions: GraphDimensions,
      _concurrency: Concurrency
    ): MemoryTree {
      return EMPTY_MEMORY_TREE_IMPL;
    }
    components(): MemoryEstimation[] {
      return [];
    }
  })();

// --- Builder Implementation ---
// This class is defined before MemoryEstimations and will be assigned to MemoryEstimations.Builder
class BuilderImpl {
  private readonly _builderDescription: string; // Renamed
  private readonly _builderComponents: MemoryEstimation[] = []; // Renamed
  private _builderParent: BuilderImpl | null = null; // Renamed

  public constructor(description: string);
  public constructor(description: string, typeForInstanceField: string);
  public constructor(description: string, parentBuilder: BuilderImpl);
  public constructor(
    description: string,
    typeForField: string,
    parentBuilder: BuilderImpl
  );
  constructor(
    description: string,
    typeOrParent?: string | BuilderImpl,
    parentIfType?: BuilderImpl
  ) {
    this._builderDescription = description;
    if (parentIfType instanceof BuilderImpl) {
      this._builderParent = parentIfType;
      this._builderComponents.push(
        new LeafEstimationImpl("this.instance", (_dim, _conc) =>
          MemoryRange.of(Estimate.sizeOfInstance(typeOrParent as string))
        )
      );
    } else if (typeOrParent instanceof BuilderImpl) {
      this._builderParent = typeOrParent;
    } else if (typeof typeOrParent === "string") {
      this._builderParent = null;
      this._builderComponents.push(
        new LeafEstimationImpl("this.instance", (_dimensions, _concurrency) =>
          MemoryRange.of(Estimate.sizeOfInstance(typeOrParent))
        )
      );
    } else {
      this._builderParent = null;
    }
  }

  public startField(name: string): BuilderImpl;
  public startField(name: string, type: string): BuilderImpl;
  public startField(name: string, type?: string): BuilderImpl {
    return type === undefined
      ? new BuilderImpl(name, this)
      : new BuilderImpl(name, type, this);
  }

  public endField(): BuilderImpl {
    if (this._builderParent === null) {
      throw new Error("Cannot end field from root builder");
    }
    this._builderParent._builderComponents.push(
      MemoryEstimations.ofComponents(
        this._builderDescription,
        this._builderComponents
      ) // Call static
    );
    return this._builderParent;
  }

  public add(estimation: MemoryEstimation): BuilderImpl;
  public add(description: string, estimation: MemoryEstimation): BuilderImpl;
  public add(
    estOrDesc: MemoryEstimation | string,
    estArg?: MemoryEstimation
  ): BuilderImpl {
    if (typeof estOrDesc === "string") {
      this._builderComponents.push(
        MemoryEstimations.delegateEstimation(estArg!, estOrDesc)
      ); // Call static
    } else {
      this._builderComponents.push(estOrDesc);
    }
    return this;
  }

  public addComponentsOf(estimation: MemoryEstimation): BuilderImpl {
    this._builderComponents.push(...estimation.components());
    return this;
  }

  public field(description: string, type: string): BuilderImpl {
    this._builderComponents.push(
      new LeafEstimationImpl(description, (_dimensions, _concurrency) =>
        MemoryRange.of(Estimate.sizeOfInstance(type))
      )
    );
    return this;
  }

  public fixed(description: string, bytes: number): BuilderImpl;
  public fixed(description: string, range: MemoryRange): BuilderImpl;
  public fixed(
    description: string,
    val: number | MemoryRange
  ): BuilderImpl {
    const rangeVal =
      typeof val === "number" || typeof val === "bigint"
        ? MemoryRange.of(val)
        : val;
    this._builderComponents.push(MemoryEstimations.of(description, rangeVal)); // Call static
    return this;
  }

  public perNodeVector(
    desc: string,
    size: number | bigint,
    fn: (val: bigint) => bigint
  ): BuilderImpl {
    this._builderComponents.push(
      new LeafEstimationImpl(desc, (dims, _conc) =>
        MemoryRange.of(fn(BigInt(dims.nodeCount()) * BigInt(size)))
      )
    );
    return this;
  }

  public perNode(
    description: string,
    estimation: MemoryEstimation
  ): BuilderImpl;
  public perNode(
    description: string,
    fn: (nodeCount: bigint) => bigint
  ): BuilderImpl;
  public perNode(
    desc: string,
    estOrFn: MemoryEstimation | ((nc: bigint) => bigint)
  ): BuilderImpl {
    if (typeof estOrFn === "function")
      return this.perNodeVector(desc, 1n, estOrFn);
    this._builderComponents.push(
      MemoryEstimations.andThen(
        // Call static
        desc,
        estOrFn,
        (mem, dim, _conc) => mem.times(dim.nodeCount())
      )
    );
    return this;
  }

  public rangePerNode(
    description: string,
    fn: (nodeCount: number) => MemoryRange
  ): BuilderImpl {
    this._builderComponents.push(
      new LeafEstimationImpl(description, (dims, _conc) => fn(dims.nodeCount()))
    );
    return this;
  }

  public perGraphDimension(
    desc: string,
    fn: (dims: GraphDimensions, conc: Concurrency) => MemoryRange
  ): BuilderImpl {
    this._builderComponents.push(new LeafEstimationImpl(desc, fn));
    return this;
  }

  public rangePerGraphDimension(
    desc: string,
    fn: (dims: GraphDimensions, conc: Concurrency) => MemoryRange
  ): BuilderImpl {
    return this.perGraphDimension(desc, fn);
  }

  public perThread(description: string, bytes: number | bigint): BuilderImpl;
  public perThread(
    description: string,
    fn: (threadCount: number) => bigint
  ): BuilderImpl;
  public perThread(
    description: string,
    estimation: MemoryEstimation
  ): BuilderImpl;
  public perThread(description: string, range: MemoryRange): BuilderImpl;
  public perThread(
    desc: string,
    val:
      | number
      | bigint
      | ((tc: number) => bigint)
      | MemoryEstimation
      | MemoryRange
  ): BuilderImpl {
    if (typeof val === "number" || typeof val === "bigint") {
      this._builderComponents.push(
        MemoryEstimations.of(desc, (_dim, conc) =>
          MemoryRange.of(BigInt(conc.value()) * BigInt(val))
        )
      );
    } else if (typeof val === "function") {
      this._builderComponents.push(
        MemoryEstimations.of(desc, (_dim, conc) =>
          MemoryRange.of(val(conc.value()))
        )
      );
    } else if (
      "estimate" in val &&
      typeof (val as any).estimate === "function"
    ) {
      this._builderComponents.push(
        MemoryEstimations.andThen(
          desc,
          val as MemoryEstimation,
          (mem, _dim, conc) => mem.times(conc.value())
        )
      );
    } else {
      this._builderComponents.push(
        MemoryEstimations.of(desc, (_dim, conc) =>
          (val as MemoryRange).times(conc.value())
        )
      );
    }
    return this;
  }

  public maximum(components: MemoryEstimation[]): BuilderImpl;
  public maximum(description: string, components: MemoryEstimation[]): BuilderImpl;
  public maximum(
    descOrComps: string | MemoryEstimation[],
    compsArg?: MemoryEstimation[]
  ): BuilderImpl {
    if (typeof descOrComps === "string") {
      this._builderComponents.push(
        MemoryEstimations.maxEstimation(descOrComps, compsArg!)
      ); // Call static
    } else {
      this._builderComponents.push(
        MemoryEstimations.maxEstimation(descOrComps)
      ); // Call static
    }
    return this;
  }

  public build(): MemoryEstimation {
    if (this._builderParent !== null) {
      throw new Error(
        "build() must be called on the root builder. Current builder is for field: " +
          this._builderDescription
      );
    }
    return MemoryEstimations.ofComponents(
      this._builderDescription,
      this._builderComponents
    ); // Call static
  }
}

// --- MemoryEstimations Utility Class ---
export class MemoryEstimations {
  public static readonly RESIDENT_MEMORY = "residentMemory";
  public static readonly TEMPORARY_MEMORY = "temporaryMemory";

  public static empty(): MemoryEstimation {
    return NULL_ESTIMATION_IMPL;
  }

  public static maxEstimation(components: MemoryEstimation[]): MemoryEstimation;
  public static maxEstimation(
    description: string,
    components: MemoryEstimation[]
  ): MemoryEstimation;
  public static maxEstimation(
    descOrComps: string | MemoryEstimation[],
    compsArg?: MemoryEstimation[]
  ): MemoryEstimation {
    return typeof descOrComps === "string"
      ? new MaxEstimationImpl(descOrComps, compsArg!)
      : new MaxEstimationImpl(descOrComps);
  }

  public static delegateEstimation(
    delegate: MemoryEstimation,
    description: string
  ): MemoryEstimation {
    return new DelegateEstimationImpl(delegate, description);
  }

  public static of(instanceType: string): MemoryEstimation;
  public static of(
    description: string,
    resident: MemoryResidentFunction
  ): MemoryEstimation;
  public static of(description: string, range: MemoryRange): MemoryEstimation;
  public static of(
    descOrType: string,
    residentOrRange?: MemoryResidentFunction | MemoryRange
  ): MemoryEstimation {
    if (residentOrRange === undefined) {
      return new LeafEstimationImpl("instance", (_dims, _conc) =>
        MemoryRange.of(Estimate.sizeOfInstance(descOrType))
      );
    } else if (typeof residentOrRange === "function") {
      return new LeafEstimationImpl(descOrType, residentOrRange);
    } else {
      return new LeafEstimationImpl(
        descOrType,
        (_dim, _conc) => residentOrRange
      );
    }
  }

  // This is public static because BuilderImpl calls it.
  public static ofComponents(
    description: string,
    components: MemoryEstimation[]
  ): MemoryEstimation {
    return new CompositeEstimationImpl(description, components);
  }

  public static setup(
    description: string,
    setup: MemoryEstimationSetup
  ): MemoryEstimation;
  public static setup(
    description: string,
    fn: (dimensions: GraphDimensions) => MemoryEstimation
  ): MemoryEstimation;
  public static setup(
    desc: string,
    setupOrFn:
      | MemoryEstimationSetup
      | ((dims: GraphDimensions) => MemoryEstimation)
  ): MemoryEstimation {
    // Check the number of parameters the function expects (its arity)
    if (setupOrFn.length === 2) {
      // Expects (dimensions, concurrency)
      return new SetupEstimationImpl(desc, setupOrFn as MemoryEstimationSetup);
    } else {
      // Expects (dimensions)
      const fn = setupOrFn as (dimensions: GraphDimensions) => MemoryEstimation;
      // Adapt to MemoryEstimationSetup
      return new SetupEstimationImpl(desc, (dims, _conc) => fn(dims));
    }
  }

  public static andThen(
    delegate: MemoryEstimation,
    modifier: MemoryRangeModifier
  ): MemoryEstimation;
  public static andThen(
    delegate: MemoryEstimation,
    simpleModifier: (range: MemoryRange) => MemoryRange
  ): MemoryEstimation;
  public static andThen(
    description: string,
    delegate: MemoryEstimation,
    modifier: MemoryRangeModifier
  ): MemoryEstimation;
  public static andThen(
    // Implementation arguments
    arg1: string | MemoryEstimation,
    arg2:
      | MemoryEstimation // Only if arg1 is string
      | MemoryRangeModifier // If arg1 is MemoryEstimation OR (if arg1 is string AND this is arg3 effectively)
      | ((range: MemoryRange) => MemoryRange), // Only if arg1 is MemoryEstimation
    arg3?: MemoryRangeModifier // Only if arg1 is string
  ): MemoryEstimation {
    let descriptionToUse: string;
    let delegateToUse: MemoryEstimation;
    let modifierToUse: MemoryRangeModifier;

    if (typeof arg1 === "string") {
      // This matches: andThen(description: string, delegate: MemoryEstimation, modifier: MemoryRangeModifier)
      descriptionToUse = arg1;

      // Type check for arg2 (should be delegate)
      if (
        !(arg2 instanceof BaseEstimationImpl) &&
        typeof (arg2 as any)?.estimate !== "function"
      ) {
        throw new Error(
          "Invalid 'andThen' parameters: For the (string, MemoryEstimation, MemoryRangeModifier) overload, the second argument must be a MemoryEstimation."
        );
      }
      delegateToUse = arg2 as MemoryEstimation;

      // Type check for arg3 (should be modifier)
      if (typeof arg3 !== "function" || arg3.length !== 3) {
        throw new Error(
          "Invalid 'andThen' parameters: For the (string, MemoryEstimation, MemoryRangeModifier) overload, the third argument must be a MemoryRangeModifier function."
        );
      }
      modifierToUse = arg3;
    } else {
      // This matches:
      // 1. andThen(delegate: MemoryEstimation, modifier: MemoryRangeModifier)
      // 2. andThen(delegate: MemoryEstimation, simpleModifier: (range: MemoryRange) => MemoryRange)
      delegateToUse = arg1; // arg1 is MemoryEstimation
      descriptionToUse = delegateToUse.description();

      // arg2 is the modifier function (either MemoryRangeModifier or simpleModifier)
      if (typeof arg2 !== "function") {
        throw new Error(
          "Invalid 'andThen' parameters: When the first argument is a MemoryEstimation, the second argument must be a modifier function."
        );
      }
      const modifierFn = arg2;

      if (modifierFn.length === 3) {
        // It's already a MemoryRangeModifier
        modifierToUse = modifierFn as MemoryRangeModifier;
      } else if (modifierFn.length === 1) {
        // It's a simpleModifier: (range: MemoryRange) => MemoryRange
        // Adapt it to MemoryRangeModifier
        const unaryOp = modifierFn as (range: MemoryRange) => MemoryRange;
        modifierToUse = (range, _dimensions, _concurrency) => unaryOp(range);
      } else {
        throw new Error(
          "Invalid 'andThen' parameters: Modifier function has an unexpected number of arguments."
        );
      }
    }

    return new AndThenEstimationImpl(
      descriptionToUse,
      delegateToUse,
      modifierToUse
    );
  }

  public static Builder = BuilderImpl; // Assign the class itself

  public static builder(): BuilderImpl;
  public static builder(description: string): BuilderImpl;
  public static builder(description: string, type: string): BuilderImpl;
  public static builder(
    descOrType?: string,
    typeForDesc?: string
  ): BuilderImpl {
    if (descOrType === undefined) return new BuilderImpl("");
    if (typeForDesc === undefined) return new BuilderImpl(descOrType);
    return new BuilderImpl(descOrType, typeForDesc);
  }

  public static builderFromType(type: string): BuilderImpl {
    return new BuilderImpl(type, type);
  }

  @TestOnly
  static leafTree(description: string, memoryRange: MemoryRange): MemoryTree {
    return new LeafTreeImpl(description, memoryRange);
  }

  @TestOnly
  static compositeTree(
    description: string,
    components: MemoryTree[]
  ): MemoryTree {
    return new CompositeTreeImpl(description, components);
  }

  private constructor() {
    throw new Error(
      "MemoryEstimations is a utility class and cannot be instantiated"
    );
  }
}

// Helper annotation for clarity, no runtime effect in TS
function TestOnly(
  _target: any,
  _propertyKey?: string,
  _descriptor?: PropertyDescriptor
) {}
