import { CsvImportFileUtil } from "../CsvImportFileUtil";
import * as fs from "fs";
import * as path from "path";

describe("CsvImportFileUtil - File Discovery Debug", () => {
  const referenceGraphStoreDir = "/home/pat/VSCode/neovm/src/tools/reference-graphstore";

  it("🔍 DEBUG: File Discovery Analysis", () => {
    console.log("🔍 === CSVIMPORTFILEUTIL FILE DISCOVERY DEBUG ===");
    console.log(`📁 Target directory: ${referenceGraphStoreDir}`);

    // 1. Check if directory exists
    if (!fs.existsSync(referenceGraphStoreDir)) {
      console.log("❌ Reference graphstore directory does not exist!");
      return;
    }

    // 2. List all files in directory
    const allFiles = fs.readdirSync(referenceGraphStoreDir);
    console.log(`\n📋 All files in directory (${allFiles.length}):`);
    allFiles.forEach((file, index) => {
      const filePath = path.join(referenceGraphStoreDir, file);
      const isDir = fs.statSync(filePath).isDirectory();
      console.log(`  ${index + 1}. ${isDir ? '📁' : '📄'} ${file}`);
    });

    // 3. Test node header file discovery
    console.log("\n👥 === NODE HEADER FILE DISCOVERY ===");
    try {
      const nodeHeaderFiles = CsvImportFileUtil.getNodeHeaderFiles(referenceGraphStoreDir);
      console.log(`📊 Node header files found: ${nodeHeaderFiles.length}`);
      nodeHeaderFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${path.basename(file)}`);
      });

      if (nodeHeaderFiles.length === 0) {
        console.log("⚠️ No node header files found!");
        console.log("🔧 Expected pattern: /^nodes(_\\w+)*_header\\.csv$/");

        // Show which files would match
        const nodePattern = /^nodes(_\w+)*_header\.csv$/;
        console.log("📋 Files tested against node pattern:");
        allFiles.forEach(file => {
          const matches = nodePattern.test(file);
          console.log(`  ${file}: ${matches ? '✅' : '❌'}`);
        });
      }
    } catch (error) {
      console.log(`❌ Node header discovery failed: ${(error as Error).message}`);
    }

    // 4. Test relationship header file discovery
    console.log("\n🔗 === RELATIONSHIP HEADER FILE DISCOVERY ===");
    try {
      const relationshipHeaderFiles = CsvImportFileUtil.getRelationshipHeaderFiles(referenceGraphStoreDir);
      console.log(`📊 Relationship header files found: ${relationshipHeaderFiles.length}`);
      relationshipHeaderFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${path.basename(file)}`);
      });

      if (relationshipHeaderFiles.length === 0) {
        console.log("⚠️ No relationship header files found!");
        console.log("🔧 Expected pattern: /^relationships(_\\w+)+_header\\.csv$/");

        // Show which files would match
        const relPattern = /^relationships(_\w+)+_header\.csv$/;
        console.log("📋 Files tested against relationship pattern:");
        allFiles.forEach(file => {
          const matches = relPattern.test(file);
          console.log(`  ${file}: ${matches ? '✅' : '❌'}`);
        });
      }
    } catch (error) {
      console.log(`❌ Relationship header discovery failed: ${(error as Error).message}`);
    }

    // 5. Test graph property header file discovery
    console.log("\n🌐 === GRAPH PROPERTY HEADER FILE DISCOVERY ===");
    try {
      const graphPropertyHeaderFiles = CsvImportFileUtil.getGraphPropertyHeaderFiles(referenceGraphStoreDir);
      console.log(`📊 Graph property header files found: ${graphPropertyHeaderFiles.length}`);
      graphPropertyHeaderFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${path.basename(file)}`);
      });

      if (graphPropertyHeaderFiles.length === 0) {
        console.log("⚠️ No graph property header files found!");
        console.log("🔧 Expected pattern: /^graph_property(_\\w+)+_header\\.csv$/");

        // Show which files would match
        const graphPattern = /^graph_property(_\w+)+_header\.csv$/;
        console.log("📋 Files tested against graph property pattern:");
        allFiles.forEach(file => {
          const matches = graphPattern.test(file);
          console.log(`  ${file}: ${matches ? '✅' : '❌'}`);
        });
      }
    } catch (error) {
      console.log(`❌ Graph property header discovery failed: ${(error as Error).message}`);
    }
  });

  it("🗂️ DEBUG: Header to Data File Mapping", () => {
    console.log("🗂️ === HEADER TO DATA FILE MAPPING DEBUG ===");

    // 1. Test node mapping
    console.log("\n👥 Node header to data mapping:");
    try {
      const nodeMapping = CsvImportFileUtil.nodeHeaderToFileMapping(referenceGraphStoreDir);
      console.log(`📊 Node mappings found: ${nodeMapping.size}`);

      if (nodeMapping.size > 0) {
        for (const [headerPath, dataPaths] of nodeMapping.entries()) {
          console.log(`\n📄 Header: ${path.basename(headerPath)}`);
          console.log(`  📂 Full path: ${headerPath}`);
          console.log(`  📊 Data files: ${dataPaths.length}`);
          dataPaths.forEach((dataPath, index) => {
            console.log(`    ${index + 1}. ${path.basename(dataPath)}`);
          });

          if (dataPaths.length === 0) {
            console.log("  ⚠️ No data files found for this header");

            // Debug the data file pattern
            const headerFileName = path.basename(headerPath);
            const dataFilePattern = new RegExp(
              headerFileName.replace("_header", "(_\\d+)").replace(/\./g, "\\.")
            );
            console.log(`  🔧 Expected data pattern: ${dataFilePattern}`);

            // Check which files in directory would match
            const allFiles = fs.readdirSync(referenceGraphStoreDir);
            console.log("  📋 Files tested against data pattern:");
            allFiles.forEach(file => {
              const matches = dataFilePattern.test(file);
              console.log(`    ${file}: ${matches ? '✅' : '❌'}`);
            });
          }
        }
      } else {
        console.log("❌ No node header mappings found");
      }
    } catch (error) {
      console.log(`❌ Node mapping failed: ${(error as Error).message}`);
    }

    // 2. Test relationship mapping
    console.log("\n🔗 Relationship header to data mapping:");
    try {
      const relationshipMapping = CsvImportFileUtil.relationshipHeaderToFileMapping(referenceGraphStoreDir);
      console.log(`📊 Relationship mappings found: ${relationshipMapping.size}`);

      if (relationshipMapping.size > 0) {
        for (const [headerPath, dataPaths] of relationshipMapping.entries()) {
          console.log(`\n📄 Header: ${path.basename(headerPath)}`);
          console.log(`  📊 Data files: ${dataPaths.length}`);
          dataPaths.forEach((dataPath, index) => {
            console.log(`    ${index + 1}. ${path.basename(dataPath)}`);
          });

          if (dataPaths.length === 0) {
            console.log("  ⚠️ No data files found for this header");
          }
        }
      } else {
        console.log("❌ No relationship header mappings found");
      }
    } catch (error) {
      console.log(`❌ Relationship mapping failed: ${(error as Error).message}`);
    }

    // 3. Test graph property mapping
    console.log("\n🌐 Graph property header to data mapping:");
    try {
      const graphPropertyMapping = CsvImportFileUtil.graphPropertyHeaderToFileMapping(referenceGraphStoreDir);
      console.log(`📊 Graph property mappings found: ${graphPropertyMapping.size}`);

      if (graphPropertyMapping.size > 0) {
        for (const [headerPath, dataPaths] of graphPropertyMapping.entries()) {
          console.log(`\n📄 Header: ${path.basename(headerPath)}`);
          console.log(`  📊 Data files: ${dataPaths.length}`);
          dataPaths.forEach((dataPath, index) => {
            console.log(`    ${index + 1}. ${path.basename(dataPath)}`);
          });
        }
      } else {
        console.log("❌ No graph property header mappings found");
      }
    } catch (error) {
      console.log(`❌ Graph property mapping failed: ${(error as Error).message}`);
    }
  });

  it("🏷️ DEBUG: Label and Type Inference", () => {
    console.log("🏷️ === LABEL AND TYPE INFERENCE DEBUG ===");

    // Get all files that look like headers
    const allFiles = fs.readdirSync(referenceGraphStoreDir);
    const headerFiles = allFiles.filter(file => file.includes('header'));

    console.log(`\n📋 Testing label/type inference on ${headerFiles.length} header files:`);

    headerFiles.forEach((file, index) => {
      console.log(`\n📄 File ${index + 1}: ${file}`);

      if (file.startsWith('nodes_')) {
        // Test node label inference
        const labels = CsvImportFileUtil.inferNodeLabelsFromFileName(file);
        console.log(`  🏷️ Inferred node labels: ${labels.length > 0 ? labels.join(', ') : 'None'}`);

        // Show parsing steps
        const withoutPrefix = file.replace(/^nodes_/, "");
        const withoutSuffix = withoutPrefix.replace(/_?header\.csv$/, "");
        console.log(`  🔧 Parsing: "${file}" → "${withoutPrefix}" → "${withoutSuffix}" → [${withoutSuffix.split('_').join(', ')}]`);

      } else if (file.startsWith('relationships_')) {
        // Test relationship type inference
        try {
          const type = file.replace(/relationships_|_header\.csv/g, "");
          console.log(`  🔗 Inferred relationship type: ${type}`);
          console.log(`  🔧 Parsing: "${file}" → "${type}"`);
        } catch (error) {
          console.log(`  ❌ Type inference failed: ${(error as Error).message}`);
        }
      }
    });
  });

  it("📄 DEBUG: Pattern Analysis", () => {
    console.log("📄 === REGEX PATTERN ANALYSIS ===");

    const allFiles = fs.readdirSync(referenceGraphStoreDir);

    const patterns = [
      {
        name: "Node headers",
        regex: /^nodes(_\w+)*_header\.csv$/,
        description: "Matches: nodes_Label_header.csv, nodes_header.csv"
      },
      {
        name: "Relationship headers",
        regex: /^relationships(_\w+)+_header\.csv$/,
        description: "Matches: relationships_TYPE_header.csv (requires at least one type)"
      },
      {
        name: "Graph property headers",
        regex: /^graph_property(_\w+)+_header\.csv$/,
        description: "Matches: graph_property_name_header.csv"
      }
    ];

    patterns.forEach((pattern, index) => {
      console.log(`\n🔍 Pattern ${index + 1}: ${pattern.name}`);
      console.log(`  📋 Regex: ${pattern.regex}`);
      console.log(`  📄 Description: ${pattern.description}`);
      console.log("  📊 File matches:");

      let matchCount = 0;
      allFiles.forEach(file => {
        const matches = pattern.regex.test(file);
        if (matches) {
          console.log(`    ✅ ${file}`);
          matchCount++;
        }
      });

      if (matchCount === 0) {
        console.log("    ❌ No files match this pattern");
        console.log("    📋 All files tested:");
        allFiles.forEach(file => {
          console.log(`      ${file}: ${pattern.regex.test(file) ? '✅' : '❌'}`);
        });
      }
    });
  });
});
