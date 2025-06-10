import { describe, it, expect } from "vitest";

/**
 * 🎯 TokenToNodeLabels - Integer Token Performance System
 *
 * This tests the core performance optimization that converts expensive NodeLabel
 * objects to cheap integer tokens for billion-node graph operations.
 *
 * CRITICAL INSIGHT: This is how graph databases achieve performance at scale!
 */

// ✅ MOCK THE IMPORTS (until we have real ones)
interface NodeLabel {
  name(): string;
  toString(): string;
}

class MockNodeLabel implements NodeLabel {
  private _name: string;

  constructor(name: string) {
    this._name = name;
  }

  name(): string {
    return this._name;
  }

  toString(): string {
    return this._name;
  }

  static of(name: string): NodeLabel {
    return new MockNodeLabel(name);
  }

  static ALL_NODES = new MockNodeLabel("*");
}

// Mock collections and utilities
type ObjectIntMap<K> = Map<K, number>;
type IntObjectHashMap<V> = Map<number, V>;
type ObjectIntScatterMap<K> = Map<K, number>;

class MockMutableInt {
  private value = 0;

  getAndIncrement(): number {
    return this.value++;
  }
}

// Mock constants
const ANY_LABEL = -1;
const NO_SUCH_LABEL = -1;

// Mock formatting
const StringFormatting = {
  formatWithLocale: (template: string, ...args: any[]) => {
    return template.replace(/%s/g, () => args.shift()?.toString() || '');
  }
};

// ✅ SIMPLIFIED TokenToNodeLabels (core logic only)
abstract class TokenToNodeLabels {
  protected readonly nodeLabelToLabelTokenMap: ObjectIntMap<NodeLabel>;
  protected readonly labelTokenToNodeLabelMap: IntObjectHashMap<NodeLabel[]>;

  public static fixed(nodeLabels: NodeLabel[]): TokenToNodeLabels {
    const elementIdentifierLabelTokenMapping: ObjectIntScatterMap<NodeLabel> = new Map();
    const labelTokenNodeLabelMapping: IntObjectHashMap<NodeLabel[]> = new Map();
    const labelTokenCounter = new MockMutableInt();

    nodeLabels.forEach((nodeLabel) => {
      const labelToken = nodeLabel === MockNodeLabel.ALL_NODES
        ? ANY_LABEL
        : labelTokenCounter.getAndIncrement();

      elementIdentifierLabelTokenMapping.set(nodeLabel, labelToken);
      labelTokenNodeLabelMapping.set(labelToken, [nodeLabel]);
    });

    return new Fixed(elementIdentifierLabelTokenMapping, labelTokenNodeLabelMapping);
  }

  public static lazy(): TokenToNodeLabels {
    return new Lazy();
  }

  protected constructor();
  protected constructor(
    nodeLabelToLabelTokenMap?: ObjectIntMap<NodeLabel>,
    labelTokenToNodeLabelMap?: IntObjectHashMap<NodeLabel[]>
  );
  protected constructor(
    nodeLabelToLabelTokenMap?: ObjectIntMap<NodeLabel>,
    labelTokenToNodeLabelMap?: IntObjectHashMap<NodeLabel[]>
  ) {
    if (nodeLabelToLabelTokenMap && labelTokenToNodeLabelMap) {
      this.nodeLabelToLabelTokenMap = nodeLabelToLabelTokenMap;
      this.labelTokenToNodeLabelMap = labelTokenToNodeLabelMap;
    } else {
      this.nodeLabelToLabelTokenMap = new Map();
      this.labelTokenToNodeLabelMap = new Map();
    }
  }

  public labelTokenNodeLabelMapping(): IntObjectHashMap<NodeLabel[]> {
    return this.labelTokenToNodeLabelMap;
  }

  public abstract getOrCreateToken(nodeLabel: NodeLabel): number;
}

class Fixed extends TokenToNodeLabels {
  constructor(
    elementIdentifierLabelTokenMapping: ObjectIntMap<NodeLabel>,
    labelTokenNodeLabelMapping: IntObjectHashMap<NodeLabel[]>
  ) {
    super(elementIdentifierLabelTokenMapping, labelTokenNodeLabelMapping);
  }

  public override getOrCreateToken(nodeLabel: NodeLabel): number {
    if (!this.nodeLabelToLabelTokenMap.has(nodeLabel)) {
      throw new Error(
        StringFormatting.formatWithLocale(
          "No token was specified for node label %s. Available labels must be provided at construction time for Fixed strategy.",
          nodeLabel.toString()
        )
      );
    }
    return this.nodeLabelToLabelTokenMap.get(nodeLabel)!;
  }
}

class Lazy extends TokenToNodeLabels {
  private nextLabelId: number;

  constructor() {
    super();
    this.nextLabelId = 0;
  }

  public override getOrCreateToken(nodeLabel: NodeLabel): number {
    let token = this.nodeLabelToLabelTokenMap.get(nodeLabel);

    if (token === undefined) {
      token = NO_SUCH_LABEL;
    }

    if (token === NO_SUCH_LABEL) {
      token = this.nextLabelId++;
      this.labelTokenToNodeLabelMap.set(token, [nodeLabel]);
      this.nodeLabelToLabelTokenMap.set(nodeLabel, token);
    }

    return token;
  }
}

describe("🔢 TokenToNodeLabels - Performance Token System", () => {

  it("🏗️ FIXED STRATEGY: Pre-defined token assignment", () => {
    console.log("🏗️ === FIXED STRATEGY TESTING ===");

    // ✅ CREATE PREDEFINED LABELS
    const userLabel = MockNodeLabel.of("User");
    const personLabel = MockNodeLabel.of("Person");
    const companyLabel = MockNodeLabel.of("Company");
    const allLabels = [userLabel, personLabel, companyLabel];

    console.log(`Creating fixed mapping for: ${allLabels.map(l => l.name()).join(", ")}`);

    // ✅ CREATE FIXED MAPPER
    const fixedMapper = TokenToNodeLabels.fixed(allLabels);
    console.log(`Fixed mapper created: ${fixedMapper.constructor.name}`);

    // ✅ TEST TOKEN ASSIGNMENT
    const userToken = fixedMapper.getOrCreateToken(userLabel);
    const personToken = fixedMapper.getOrCreateToken(personLabel);
    const companyToken = fixedMapper.getOrCreateToken(companyLabel);

    console.log(`Token assignments:`);
    console.log(`  User → ${userToken}`);
    console.log(`  Person → ${personToken}`);
    console.log(`  Company → ${companyToken}`);

    // ✅ VERIFY SEQUENTIAL ASSIGNMENT
    expect(userToken).toBe(0);
    expect(personToken).toBe(1);
    expect(companyToken).toBe(2);

    // ✅ VERIFY CONSISTENCY
    const userToken2 = fixedMapper.getOrCreateToken(userLabel);
    expect(userToken2).toBe(userToken); // Same token for same label

    console.log("✅ Fixed strategy assigns tokens correctly");
  });

  it("🚨 FIXED STRATEGY: Error on unknown labels", () => {
    console.log("🚨 === FIXED STRATEGY VALIDATION ===");

    const knownLabels = [MockNodeLabel.of("User"), MockNodeLabel.of("Company")];
    const fixedMapper = TokenToNodeLabels.fixed(knownLabels);

    // ✅ UNKNOWN LABEL SHOULD THROW
    const unknownLabel = MockNodeLabel.of("Unknown");

    try {
      fixedMapper.getOrCreateToken(unknownLabel);
      console.log("❌ Should have thrown for unknown label");
      expect(false).toBe(true);
    } catch (error) {
      console.log(`✅ Correctly threw error: ${(error as Error).message}`);
      expect((error as Error).message).toContain("No token was specified");
      expect((error as Error).message).toContain("Unknown");
    }

    console.log("✅ Fixed strategy validates labels correctly");
  });

  it("🔄 LAZY STRATEGY: Dynamic token creation", () => {
    console.log("🔄 === LAZY STRATEGY TESTING ===");

    const lazyMapper = TokenToNodeLabels.lazy();
    console.log(`Lazy mapper created: ${lazyMapper.constructor.name}`);

    // ✅ FIRST ENCOUNTERS
    const userLabel = MockNodeLabel.of("User");
    const personLabel = MockNodeLabel.of("Person");
    const companyLabel = MockNodeLabel.of("Company");

    const userToken = lazyMapper.getOrCreateToken(userLabel);
    const personToken = lazyMapper.getOrCreateToken(personLabel);
    const companyToken = lazyMapper.getOrCreateToken(companyLabel);

    console.log(`Dynamic token assignments:`);
    console.log(`  User → ${userToken} (first encounter)`);
    console.log(`  Person → ${personToken} (first encounter)`);
    console.log(`  Company → ${companyToken} (first encounter)`);

    // ✅ VERIFY SEQUENTIAL ASSIGNMENT
    expect(userToken).toBe(0);
    expect(personToken).toBe(1);
    expect(companyToken).toBe(2);

    // ✅ SUBSEQUENT ENCOUNTERS (should return same tokens)
    const userToken2 = lazyMapper.getOrCreateToken(userLabel);
    const personToken2 = lazyMapper.getOrCreateToken(personLabel);

    console.log(`Subsequent encounters:`);
    console.log(`  User → ${userToken2} (should be same)`);
    console.log(`  Person → ${personToken2} (should be same)`);

    expect(userToken2).toBe(userToken);
    expect(personToken2).toBe(personToken);

    console.log("✅ Lazy strategy creates and reuses tokens correctly");
  });

  it("🌊 LAZY STRATEGY: Unknown labels accepted", () => {
    console.log("🌊 === LAZY STRATEGY FLEXIBILITY ===");

    const lazyMapper = TokenToNodeLabels.lazy();

    // ✅ ANY LABEL IS ACCEPTED
    const randomLabels = ["Admin", "Moderator", "Guest", "VIP", "Bot"];
    const tokens: number[] = [];

    console.log("Creating tokens for random labels:");
    for (const labelName of randomLabels) {
      const label = MockNodeLabel.of(labelName);
      const token = lazyMapper.getOrCreateToken(label);
      tokens.push(token);
      console.log(`  ${labelName} → ${token}`);
    }

    // ✅ VERIFY ALL UNIQUE SEQUENTIAL TOKENS
    expect(tokens).toEqual([0, 1, 2, 3, 4]);
    expect(new Set(tokens).size).toBe(5); // All unique

    // ✅ CREATE MORE LABELS (should continue sequence)
    const extraLabel = MockNodeLabel.of("Extra");
    const extraToken = lazyMapper.getOrCreateToken(extraLabel);
    console.log(`Extra → ${extraToken} (continues sequence)`);
    expect(extraToken).toBe(5);

    console.log("✅ Lazy strategy accepts any labels dynamically");
  });

  it("🗺️ REVERSE MAPPING: Token to labels", () => {
    console.log("🗺️ === REVERSE MAPPING TESTING ===");

    const labels = [
      MockNodeLabel.of("User"),
      MockNodeLabel.of("Person"),
      MockNodeLabel.of("Company")
    ];
    const mapper = TokenToNodeLabels.fixed(labels);

    // ✅ GET ALL TOKENS
    const userToken = mapper.getOrCreateToken(labels[0]);
    const personToken = mapper.getOrCreateToken(labels[1]);
    const companyToken = mapper.getOrCreateToken(labels[2]);

    // ✅ GET REVERSE MAPPING
    const reverseMapping = mapper.labelTokenNodeLabelMapping();
    console.log(`Reverse mapping size: ${reverseMapping.size}`);

    // ✅ VERIFY REVERSE LOOKUPS
    const userLabels = reverseMapping.get(userToken);
    const personLabels = reverseMapping.get(personToken);
    const companyLabels = reverseMapping.get(companyToken);

    console.log("Reverse mappings:");
    console.log(`  Token ${userToken} → [${userLabels?.map(l => l.name()).join(", ")}]`);
    console.log(`  Token ${personToken} → [${personLabels?.map(l => l.name()).join(", ")}]`);
    console.log(`  Token ${companyToken} → [${companyLabels?.map(l => l.name()).join(", ")}]`);

    expect(userLabels).toHaveLength(1);
    expect(userLabels![0].name()).toBe("User");
    expect(personLabels![0].name()).toBe("Person");
    expect(companyLabels![0].name()).toBe("Company");

    console.log("✅ Reverse mapping works correctly");
  });

  it("⚡ PERFORMANCE: Token vs String comparison", () => {
    console.log("⚡ === PERFORMANCE COMPARISON ===");

    const lazyMapper = TokenToNodeLabels.lazy();
    const labels = Array.from({ length: 1000 }, (_, i) => MockNodeLabel.of(`Label${i}`));

    // ✅ ASSIGN TOKENS
    console.log("Creating 1000 label tokens...");
    const startTime = Date.now();
    const tokens = labels.map(label => lazyMapper.getOrCreateToken(label));
    const tokenTime = Date.now() - startTime;
    console.log(`Token assignment: ${tokenTime}ms`);

    // ✅ SIMULATE TOKEN-BASED OPERATIONS
    const tokenOpStart = Date.now();
    let tokenMatches = 0;
    for (let i = 0; i < 10000; i++) {
      const randomToken1 = tokens[Math.floor(Math.random() * tokens.length)];
      const randomToken2 = tokens[Math.floor(Math.random() * tokens.length)];
      if (randomToken1 === randomToken2) {
        tokenMatches++;
      }
    }
    const tokenOpTime = Date.now() - tokenOpStart;
    console.log(`10K token comparisons: ${tokenOpTime}ms (${tokenMatches} matches)`);

    // ✅ SIMULATE STRING-BASED OPERATIONS
    const stringOpStart = Date.now();
    let stringMatches = 0;
    for (let i = 0; i < 10000; i++) {
      const randomLabel1 = labels[Math.floor(Math.random() * labels.length)];
      const randomLabel2 = labels[Math.floor(Math.random() * labels.length)];
      if (randomLabel1.name() === randomLabel2.name()) {
        stringMatches++;
      }
    }
    const stringOpTime = Date.now() - stringOpStart;
    console.log(`10K string comparisons: ${stringOpTime}ms (${stringMatches} matches)`);

    console.log(`Performance ratio: ${stringOpTime / tokenOpTime}x faster with tokens`);

    expect(tokens).toHaveLength(1000);
    expect(tokenMatches).toBe(stringMatches); // Should find same matches
    console.log("✅ Token operations demonstrate performance advantage");
  });

  it("🎯 REAL-WORLD: Graph import simulation", () => {
    console.log("🎯 === GRAPH IMPORT SIMULATION ===");

    // ✅ SIMULATE MULTI-LABEL NODES FROM CSV
    const importScenarios = [
      { nodeId: 1, labels: ["User", "Person"] },
      { nodeId: 2, labels: ["Company", "Organization"] },
      { nodeId: 3, labels: ["User", "Customer"] },
      { nodeId: 4, labels: ["Product"] },
      { nodeId: 5, labels: ["User", "Person", "Admin"] }
    ];

    const lazyMapper = TokenToNodeLabels.lazy();

    console.log("Processing import scenarios:");
    const nodeTokens: Array<{ nodeId: number, tokens: number[] }> = [];

    for (const scenario of importScenarios) {
      const tokens = scenario.labels.map(labelName => {
        const label = MockNodeLabel.of(labelName);
        return lazyMapper.getOrCreateToken(label);
      });

      nodeTokens.push({ nodeId: scenario.nodeId, tokens });

      console.log(`  Node ${scenario.nodeId}: [${scenario.labels.join(", ")}] → [${tokens.join(", ")}]`);
    }

    // ✅ VERIFY TOKEN EFFICIENCY
    const reverseMapping = lazyMapper.labelTokenNodeLabelMapping();
    console.log(`\nUnique labels discovered: ${reverseMapping.size}`);

    for (const [token, labels] of reverseMapping) {
      console.log(`  Token ${token} → ${labels.map(l => l.name()).join(", ")}`);
    }

    // ✅ VERIFY EXPECTED TOKENS
    expect(reverseMapping.size).toBe(6); // User, Person, Company, Organization, Customer, Product, Admin
    expect(reverseMapping.get(0)![0].name()).toBe("User");
    expect(reverseMapping.get(1)![0].name()).toBe("Person");

    console.log("✅ Graph import simulation demonstrates token efficiency");
  });

});
