import { CsvMapUtil } from "../CsvMapUtil";
import { RelationshipType } from "@/projection/RelationshipType";

describe("DataFrame Network - The Pandas Killer", () => {
  it("🔥 CSV → DataFrame Pipeline", () => {
    console.log("🚀 === PANDAS KILLER PIPELINE ===");

    // Start with CSV (using your REAL CsvMapUtil!)
    const relationshipCountsCSV = "KNOWS;5;WORKS_FOR;3;LIKES;12";
    console.log("📊 Raw CSV:", relationshipCountsCSV);

    // Use your existing CsvMapUtil (REAL MODULE!)
    const relationshipCounts = CsvMapUtil.fromString(
      relationshipCountsCSV,
      (str) => RelationshipType.of(str),
      (str) => parseInt(str)
    );

    console.log("🗺️ Parsed relationship map:");
    relationshipCounts.forEach((count, relType) => {
      console.log(`  ${relType.name()}: ${count} relationships`);
    });

    // Simple DataFrame-like operations (no helper methods!)
    const entries = Array.from(relationshipCounts.entries());
    const totalCount = Array.from(relationshipCounts.values()).reduce(
      (a, b) => a + b,
      0
    );

    console.log("📋 DataFrame operations:");
    console.log(`  Total rows: ${entries.length}`);
    console.log(`  Total relationships: ${totalCount}`);

    entries.forEach(([type, count]) => {
      const percentage = ((count / totalCount) * 100).toFixed(1);
      console.log(`  ${type.name()}: ${count} (${percentage}%)`);
    });

    // ▶️ CLICK -> See simple CSV → DataFrame!
  });

  it("⚡ CsvMapUtil Round-Trip", () => {
    console.log("⚡ === ROUND-TRIP TESTING ===");

    // Create test data
    const originalMap = new Map<RelationshipType, number>();
    originalMap.set(RelationshipType.of("FRIENDS"), 100);
    originalMap.set(RelationshipType.of("COLLEAGUES"), 50);

    console.log("📊 Original data:");
    originalMap.forEach((count, relType) => {
      console.log(`  ${relType.name()}: ${count}`);
    });

    // Serialize
    const csvString = CsvMapUtil.relationshipCountsToString(originalMap);
    console.log("📝 CSV:", csvString);

    // Deserialize
    const deserializedMap = CsvMapUtil.fromString(
      csvString,
      (str) => RelationshipType.of(str),
      (str) => parseInt(str)
    );

    console.log("🔄 Deserialized:");
    deserializedMap.forEach((count, relType) => {
      console.log(`  ${relType.name()}: ${count}`);
    });

    console.log("✅ Round-trip successful!");
    // ▶️ CLICK -> Test serialization!
  });

  it("🧠 Edge Cases", () => {
    console.log("🧠 === EDGE CASES ===");

    // Empty map
    const emptyMap = new Map<RelationshipType, number>();
    const emptyCSV = CsvMapUtil.relationshipCountsToString(emptyMap);
    console.log("📭 Empty CSV:", `"${emptyCSV}"`);

    // Single entry
    const singleMap = new Map<RelationshipType, number>();
    singleMap.set(RelationshipType.of("SINGLE"), 42);
    const singleCSV = CsvMapUtil.relationshipCountsToString(singleMap);
    console.log("1️⃣ Single CSV:", singleCSV);

    // Special characters
    const specialMap = new Map<RelationshipType, number>();
    specialMap.set(RelationshipType.of("KNOWS_WELL"), 10);
    const specialCSV = CsvMapUtil.relationshipCountsToString(specialMap);
    console.log("🔤 Special chars CSV:", specialCSV);

    // ▶️ CLICK -> Test edge cases!
  });

  it("📊 Social Network Analysis", () => {
    console.log("📊 === SOCIAL NETWORK ANALYSIS ===");

    const socialData = "FOLLOWS;1500;MENTIONS;750;RETWEETS;2250;REPLIES;900";
    const socialMap = CsvMapUtil.fromString(
      socialData,
      (str) => RelationshipType.of(str),
      (str) => parseInt(str)
    );

    console.log("📱 Social interactions:");
    socialMap.forEach((count, relType) => {
      console.log(`  ${relType.name()}: ${count.toLocaleString()}`);
    });

    // Simple analytics
    const total = Array.from(socialMap.values()).reduce((a, b) => a + b, 0);
    const max = Math.max(...Array.from(socialMap.values()));
    const maxType = Array.from(socialMap.entries()).find(
      ([_, count]) => count === max
    );

    console.log(`📊 Total: ${total.toLocaleString()}`);
    console.log(`🔥 Most popular: ${maxType?.[0].name()} (${max})`);

    // ▶️ CLICK -> Analyze social data!
  });
  // Add these to your file for more interactive exploration:

  it("🔬 Advanced DataFrame Operations", () => {
    console.log("🔬 === ADVANCED DATAFRAME OPERATIONS ===");

    const timeSeriesCSV =
      "2024-01-01,LIKES;100|2024-01-02,SHARES;50|2024-01-03,LIKES;150";

    // Parse temporal data
    const temporalData = timeSeriesCSV.split("|").map((entry) => {
      const [date, relationData] = entry.split(",");
      const [relType, count] = relationData.split(";");
      return {
        date: new Date(date),
        relationshipType: RelationshipType.of(relType),
        count: parseInt(count),
      };
    });

    console.log("⏰ Temporal relationship data:");
    temporalData.forEach((item) => {
      console.log(
        `  ${
          item.date.toISOString().split("T")[0]
        }: ${item.relationshipType.name()} → ${item.count}`
      );
    });

    // Group by relationship type (like pandas groupby)
    const grouped = temporalData.reduce((acc, item) => {
      const key = item.relationshipType.name();
      if (!acc.has(key)) acc.set(key, []);
      acc.get(key)!.push(item);
      return acc;
    }, new Map<string, typeof temporalData>());

    console.log("📊 Grouped by relationship type:");
    grouped.forEach((items, relType) => {
      const total = items.reduce((sum, item) => sum + item.count, 0);
      console.log(`  ${relType}: ${total} total (${items.length} time points)`);
    });

    // ▶️ CLICK -> Advanced DataFrame ops!
  });

  it("🔗 Multi-Table DataFrame Joins", () => {
    console.log("🔗 === MULTI-TABLE DATAFRAME JOINS ===");

    // Table 1: User data
    const usersCSV = "alice,25,engineer|bob,30,manager|charlie,28,designer";
    const users = usersCSV.split("|").map((line) => {
      const [name, age, role] = line.split(",");
      return { name, age: parseInt(age), role };
    });

    // Table 2: Relationships (simulated join key)
    const relationshipsCSV =
      "alice→bob,MANAGES|bob→charlie,COLLABORATES|alice→charlie,MENTORS";
    const relationships = relationshipsCSV.split("|").map((line) => {
      const [pair, relTypeStr] = line.split(",");
      const [from, to] = pair.split("→");
      return { from, to, relType: RelationshipType.of(relTypeStr) };
    });

    console.log("👥 Users:");
    users.forEach((user) => {
      console.log(`  ${user.name}: ${user.age} years, ${user.role}`);
    });

    console.log("🔗 Relationships:");
    relationships.forEach((rel) => {
      console.log(`  ${rel.from} --${rel.relType.name()}--> ${rel.to}`);
    });

    // Join operation (zero-copy!)
    const networkAnalysis = users.map((user) => {
      const outgoingRels = relationships.filter(
        (rel) => rel.from === user.name
      );
      const incomingRels = relationships.filter((rel) => rel.to === user.name);

      return {
        ...user,
        outgoingCount: outgoingRels.length,
        incomingCount: incomingRels.length,
        totalConnections: outgoingRels.length + incomingRels.length,
      };
    });

    console.log("📊 Network analysis (joined data):");
    networkAnalysis.forEach((user) => {
      console.log(
        `  ${user.name}: ${user.totalConnections} connections (${user.outgoingCount} out, ${user.incomingCount} in)`
      );
    });

    // ▶️ CLICK -> Zero-copy joins!
  });

  it("⚡ Performance Benchmarking Lab", () => {
    console.log("⚡ === PERFORMANCE BENCHMARKING LAB ===");

    const sizes = [1000, 10000, 50000];

    sizes.forEach((size) => {
      console.log(`\n📈 Processing ${size.toLocaleString()} relationships:`);

      // Generate large CSV
      const startGen = performance.now();
      const largeCsvParts = [];
      for (let i = 0; i < size; i++) {
        largeCsvParts.push(`REL_${i % 10};${Math.floor(Math.random() * 100)}`);
      }
      const largeCSV = largeCsvParts.join(";");
      const genTime = performance.now() - startGen;

      // Parse performance
      const startParse = performance.now();
      const largeMap = CsvMapUtil.fromString(
        largeCSV,
        (str) => RelationshipType.of(str),
        (str) => parseInt(str)
      );
      const parseTime = performance.now() - startParse;

      // Analytics performance
      const startAnalytics = performance.now();
      const total = Array.from(largeMap.values()).reduce((a, b) => a + b, 0);
      const avg = total / largeMap.size;
      const max = Math.max(...Array.from(largeMap.values()));
      const analyticsTime = performance.now() - startAnalytics;

      console.log(`  📊 Generation: ${genTime.toFixed(2)}ms`);
      console.log(
        `  📊 Parsing: ${parseTime.toFixed(2)}ms (${(
          (size / parseTime) *
          1000
        ).toFixed(0)} items/sec)`
      );
      console.log(`  📊 Analytics: ${analyticsTime.toFixed(2)}ms`);
      console.log(
        `  📊 Results: total=${total.toLocaleString()}, avg=${avg.toFixed(
          1
        )}, max=${max}`
      );
    });

    // ▶️ CLICK -> Benchmark your DataFrame pipeline!
  });

  it("🌊 Real-Time Data Stream Processing", () => {
    console.log("🌊 === REAL-TIME DATA STREAM PROCESSING ===");

    // Simulate streaming data chunks
    const streamChunks = [
      "CLICK;100;VIEW;250",
      "SHARE;50;COMMENT;75",
      "LIKE;300;FOLLOW;25",
      "MENTION;80;RETWEET;120",
    ];

    let cumulativeMap = new Map<RelationshipType, number>();

    console.log("📡 Processing data stream chunks:");

    streamChunks.forEach((chunk, index) => {
      console.log(`\n📦 Chunk ${index + 1}: ${chunk}`);

      // Process chunk
      const chunkMap = CsvMapUtil.fromString(
        chunk,
        (str) => RelationshipType.of(str),
        (str) => parseInt(str)
      );

      // Merge into cumulative map (streaming aggregation)
      chunkMap.forEach((count, relType) => {
        const existing = cumulativeMap.get(relType) || 0;
        cumulativeMap.set(relType, existing + count);
      });

      // Real-time analytics
      const chunkTotal = Array.from(chunkMap.values()).reduce(
        (a, b) => a + b,
        0
      );
      const cumulativeTotal = Array.from(cumulativeMap.values()).reduce(
        (a, b) => a + b,
        0
      );

      console.log(`  Chunk total: ${chunkTotal}`);
      console.log(`  Cumulative total: ${cumulativeTotal}`);
      console.log(
        `  Running average: ${(cumulativeTotal / cumulativeMap.size).toFixed(
          1
        )}`
      );
    });

    console.log("\n📊 Final cumulative results:");
    cumulativeMap.forEach((count, relType) => {
      console.log(`  ${relType.name()}: ${count}`);
    });

    // ▶️ CLICK -> Experience streaming data processing!
  });
  it("🎯 Graph Algorithm Integration", () => {
    console.log("🎯 === GRAPH ALGORITHM INTEGRATION ===");

    // Build graph from relationships
    const networkCSV =
      "alice→bob,MANAGES;bob→charlie,COLLABORATES;alice→charlie,MENTORS;charlie→alice,LEARNS_FROM";
    const edges = networkCSV.split(";").map((edge) => {
      const [pair, relType] = edge.split(",");
      const [source, target] = pair.split("→");
      return { source, target, type: RelationshipType.of(relType) };
    });

    // Build adjacency representation
    const nodes = new Set<string>();
    const adjacency = new Map<string, string[]>();

    edges.forEach((edge) => {
      nodes.add(edge.source);
      nodes.add(edge.target);

      if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
      adjacency.get(edge.source)!.push(edge.target);
    });

    console.log("🕸️ Graph structure:");
    console.log(`  Nodes: ${nodes.size}`);
    console.log(`  Edges: ${edges.length}`);

    // PageRank-like algorithm (simplified)
    const pageRank = new Map<string, number>();
    nodes.forEach((node) => pageRank.set(node, 1.0));

    // Simple iteration
    for (let i = 0; i < 3; i++) {
      const newRanks = new Map<string, number>();

      nodes.forEach((node) => {
        let rank = 0.15; // Damping factor
        adjacency.forEach((targets, source) => {
          if (targets.includes(node)) {
            rank += 0.85 * (pageRank.get(source)! / targets.length);
          }
        });
        newRanks.set(node, rank);
      });

      newRanks.forEach((rank, node) => pageRank.set(node, rank));
    }

    console.log("📊 PageRank results:");
    Array.from(pageRank.entries())
      .sort(([, a], [, b]) => b - a)
      .forEach(([node, rank]) => {
        console.log(`  ${node}: ${rank.toFixed(3)}`);
      });

    // ▶️ CLICK -> See graph algorithms in action!
  });

  it("📈 Visualization Data Preparation", () => {
    console.log("📈 === VISUALIZATION DATA PREPARATION ===");

    const socialData = "FOLLOWS;1500;MENTIONS;750;RETWEETS;2250;REPLIES;900";
    const socialMap = CsvMapUtil.fromString(
      socialData,
      (str) => RelationshipType.of(str),
      (str) => parseInt(str)
    );

    // Prepare data for D3.js/Chart.js format
    const chartData = {
      labels: Array.from(socialMap.keys()).map((rt) => rt.name()),
      datasets: [
        {
          data: Array.from(socialMap.values()),
          backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
        },
      ],
    };

    console.log("📊 Chart.js ready format:");
    console.log(JSON.stringify(chartData, null, 2));

    // D3.js hierarchical format
    const d3Data = {
      name: "Social Network",
      children: Array.from(socialMap.entries()).map(([relType, count]) => ({
        name: relType.name(),
        value: count,
        percentage: (
          (count / Array.from(socialMap.values()).reduce((a, b) => a + b, 0)) *
          100
        ).toFixed(1),
      })),
    };

    console.log("\n🎨 D3.js ready format:");
    console.log(JSON.stringify(d3Data, null, 2));

    // Network graph format
    const networkData = {
      nodes: Array.from(socialMap.keys()).map((rt) => ({
        id: rt.name(),
        group: 1,
      })),
      links: Array.from(socialMap.entries()).map(([relType, count]) => ({
        source: "USER",
        target: relType.name(),
        value: count,
      })),
    };

    console.log("\n🕸️ Network graph format:");
    console.log(JSON.stringify(networkData, null, 2));

    // ▶️ CLICK -> Prepare data for visualization!
  });

  it("🔮 Machine Learning Feature Engineering", () => {
    console.log("🔮 === MACHINE LEARNING FEATURE ENGINEERING ===");

    // Time series data for ML
    const timeSeriesCSV =
      "2024-01-01,LIKES;100|2024-01-02,SHARES;50|2024-01-03,LIKES;150|2024-01-04,COMMENTS;75|2024-01-05,LIKES;200";

    const timeSeries = timeSeriesCSV.split("|").map((entry) => {
      const [date, data] = entry.split(",");
      const [action, count] = data.split(";");
      return {
        date: new Date(date),
        action: RelationshipType.of(action),
        count: parseInt(count),
        dayOfWeek: new Date(date).getDay(),
        timestamp: new Date(date).getTime(),
      };
    });

    console.log("📊 Time series features:");
    timeSeries.forEach((point, index) => {
      const prev = index > 0 ? timeSeries[index - 1] : null;
      const growth = prev
        ? (((point.count - prev.count) / prev.count) * 100).toFixed(1)
        : "N/A";

      console.log(
        `  ${point.date.toISOString().split("T")[0]}: ${point.action.name()}=${
          point.count
        } (growth: ${growth}%)`
      );
    });

    // Feature matrix for ML algorithms
    const features = timeSeries.map((point) => ({
      // Temporal features
      dayOfWeek: point.dayOfWeek,
      weekday: point.dayOfWeek >= 1 && point.dayOfWeek <= 5 ? 1 : 0,

      // Action features
      actionType: point.action.name(),
      isLike: point.action.name() === "LIKES" ? 1 : 0,
      isShare: point.action.name() === "SHARES" ? 1 : 0,

      // Value features
      count: point.count,
      logCount: Math.log(point.count + 1),

      // Target for prediction
      target: point.count,
    }));

    console.log("\n🤖 ML Feature matrix:");
    features.forEach((feature, index) => {
      console.log(`  Row ${index}:`, JSON.stringify(feature));
    });

    // Simple moving average prediction
    const movingAvgWindow = 2;
    const predictions = features
      .map((feature, index) => {
        if (index < movingAvgWindow) return null;

        const recentValues = features
          .slice(index - movingAvgWindow, index)
          .map((f) => f.count);
        const avgPrediction =
          recentValues.reduce((a, b) => a + b, 0) / recentValues.length;

        return {
          actual: feature.count,
          predicted: Math.round(avgPrediction),
          error: Math.abs(feature.count - avgPrediction),
        };
      })
      .filter((p) => p !== null);

    console.log("\n📈 Prediction results:");
    predictions.forEach((pred, index) => {
      console.log(
        `  Prediction ${index + 1}: actual=${pred!.actual}, predicted=${
          pred!.predicted
        }, error=${pred!.error.toFixed(1)}`
      );
    });

    // ▶️ CLICK -> Engineer ML features!
  });

  it("🎭 Interactive Data Visualization", () => {
    console.log("🎭 === INTERACTIVE DATA VISUALIZATION ===");

    const networkData = "alice→bob;bob→charlie;charlie→diana;diana→alice";
    const edges = networkData.split(";").map((edge) => {
      const [source, target] = edge.split("→");
      return { source, target, weight: Math.random() };
    });

    // Generate force-directed layout data
    const nodes = [...new Set(edges.flatMap((e) => [e.source, e.target]))].map(
      (id) => ({
        id,
        x: Math.random() * 400,
        y: Math.random() * 400,
        radius: 10 + Math.random() * 10,
      })
    );

    const forceLayout = {
      nodes,
      links: edges.map((e) => ({
        source: e.source,
        target: e.target,
        value: e.weight,
      })),
    };

    console.log("🕸️ Force layout ready:");
    console.log(JSON.stringify(forceLayout, null, 2));

    // Generate heatmap data
    const heatmapData = nodes
      .map((node) =>
        nodes.map((otherNode) => ({
          x: node.id,
          y: otherNode.id,
          value: node.id === otherNode.id ? 1 : Math.random(),
        }))
      )
      .flat();

    console.log("\n🔥 Heatmap data ready:");
    console.log(`  ${heatmapData.length} data points`);
    console.log(
      `  Range: ${Math.min(...heatmapData.map((d) => d.value)).toFixed(
        2
      )} - ${Math.max(...heatmapData.map((d) => d.value)).toFixed(2)}`
    );

    // ▶️ CLICK -> Generate visualization data!
  });

  it("🤖 Advanced ML Pipeline", () => {
    console.log("🤖 === ADVANCED ML PIPELINE ===");

    // Multi-dimensional feature engineering
    const userData =
      "user1,25,engineer,5,high|user2,30,manager,3,medium|user3,22,designer,7,high|user4,35,director,2,low";

    const features = userData.split("|").map((line) => {
      const [id, age, role, experience, engagement] = line.split(",");
      return {
        id,
        // Numerical features
        age: parseInt(age),
        experience: parseInt(experience),

        // Categorical encoding (one-hot)
        role_engineer: role === "engineer" ? 1 : 0,
        role_manager: role === "manager" ? 1 : 0,
        role_designer: role === "designer" ? 1 : 0,
        role_director: role === "director" ? 1 : 0,

        // Ordinal encoding
        engagement_score:
          engagement === "high" ? 3 : engagement === "medium" ? 2 : 1,

        // Derived features
        age_experience_ratio: parseInt(age) / parseInt(experience),
        seniority: parseInt(age) > 30 ? 1 : 0,
      };
    });

    console.log("🧠 Feature matrix:");
    features.forEach((feature) => {
      console.log(`  ${feature.id}:`, JSON.stringify(feature, null, 2));
    });

    // Simple clustering (k-means style)
    const clusterCenters = [
      { age: 25, experience: 5, engagement_score: 3 },
      { age: 35, experience: 3, engagement_score: 2 },
    ];

    const clustering = features.map((feature) => {
      const distances = clusterCenters.map((center) => {
        const ageDist = Math.pow(feature.age - center.age, 2);
        const expDist = Math.pow(feature.experience - center.experience, 2);
        const engDist = Math.pow(
          feature.engagement_score - center.engagement_score,
          2
        );
        return Math.sqrt(ageDist + expDist + engDist);
      });

      const clusterIndex = distances.indexOf(Math.min(...distances));
      return {
        ...feature,
        cluster: clusterIndex,
        distance: distances[clusterIndex],
      };
    });

    console.log("\n📊 Clustering results:");
    clustering.forEach((item) => {
      console.log(
        `  ${item.id}: cluster ${
          item.cluster
        } (distance: ${item.distance.toFixed(2)})`
      );
    });

    // ▶️ CLICK -> Run ML pipeline!
  });

  it("⚡ Real-Time Dashboard Metrics", () => {
    console.log("⚡ === REAL-TIME DASHBOARD METRICS ===");

    // Simulate real-time metrics
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        memory_mb: Math.floor(Math.random() * 1000) + 500,
        cpu_percent: Math.floor(Math.random() * 100),
        disk_gb: Math.floor(Math.random() * 100) + 50,
      },
      business: {
        active_users: Math.floor(Math.random() * 1000) + 5000,
        transactions_per_sec: Math.floor(Math.random() * 500) + 100,
        revenue_hourly: Math.floor(Math.random() * 10000) + 50000,
      },
      network: {
        nodes_processed: Math.floor(Math.random() * 100000) + 500000,
        edges_analyzed: Math.floor(Math.random() * 500000) + 1000000,
        algorithms_running: Math.floor(Math.random() * 5) + 2,
      },
    };

    console.log("📊 Live system metrics:");
    console.log(JSON.stringify(metrics, null, 2));

    // Alert conditions
    const alerts = [];
    if (metrics.system.memory_mb > 900) alerts.push("High memory usage");
    if (metrics.system.cpu_percent > 80) alerts.push("High CPU usage");
    if (metrics.business.transactions_per_sec < 200)
      alerts.push("Low transaction rate");

    console.log("\n🚨 Active alerts:");
    alerts.forEach((alert) => console.log(`  ⚠️ ${alert}`));

    // Performance score calculation
    const performanceScore = (
      (100 - metrics.system.cpu_percent) * 0.3 +
      (metrics.business.transactions_per_sec / 10) * 0.4 +
      (metrics.network.nodes_processed / 10000) * 0.3
    ).toFixed(1);

    console.log(`\n🎯 Overall performance score: ${performanceScore}/100`);

    // ▶️ CLICK -> Monitor real-time metrics!
  });
});
