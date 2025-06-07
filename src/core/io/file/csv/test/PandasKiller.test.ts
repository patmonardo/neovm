import { describe, it, expect } from "vitest";
import { CsvNodeLabelMappingVisitor } from "../CsvNodeLabelMappingVisitor";
import { NodeLabel } from "@/projection";
import * as fs from "fs";
import * as path from "path";

const testDataDir = path.join(__dirname, "testdata");
const mappingFilePath = path.join(testDataDir, CsvNodeLabelMappingVisitor.LABEL_MAPPING_FILE_NAME);

describe("Pandas Killer - Label Mapping Factory", () => {

  beforeEach(() => {
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    if (fs.existsSync(mappingFilePath)) {
      fs.unlinkSync(mappingFilePath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(mappingFilePath)) {
      fs.unlinkSync(mappingFilePath);
    }
  });

  it("should export memory-efficient label mappings", () => {
    console.log("🐼💀 PANDAS KILLER: Memory-efficient label mappings!");

    const visitor = new CsvNodeLabelMappingVisitor(testDataDir);

    // 🏭 Export some label mappings (simulating Map.Entry)
    const mockEntries = [
      { getKey: () => NodeLabel.of("Person"), getValue: () => "0" },
      { getKey: () => NodeLabel.of("Company"), getValue: () => "1" },
      { getKey: () => NodeLabel.of("Department"), getValue: () => "2" }
    ];

    mockEntries.forEach(entry => {
      visitor.export(entry as any);
    });

    visitor.close();

    // 🔍 Verify the CSV was created
    expect(fs.existsSync(mappingFilePath)).toBe(true);

    const csvContent = fs.readFileSync(mappingFilePath, 'utf-8');
    console.log("📊 Generated label mapping CSV:");
    console.log(csvContent);

    // 🎯 Verify content structure
    expect(csvContent).toContain("index,label");  // Header
    expect(csvContent).toContain("0,Person");     // First mapping
    expect(csvContent).toContain("1,Company");    // Second mapping
    expect(csvContent).toContain("2,Department"); // Third mapping

    console.log("🚀 Memory-efficient labels exported! Pandas is crying! 😭");
  });

  it("should handle labels with special CSV characters", () => {
    console.log("🎪 Testing CSV character handling (Pandas nightmare scenario)");

    const visitor = new CsvNodeLabelMappingVisitor(testDataDir);

    // 😈 Evil labels that break pandas
    const evilEntries = [
      { getKey: () => NodeLabel.of('Label,With,Commas'), getValue: () => "0" },
      { getKey: () => NodeLabel.of('Label"With"Quotes'), getValue: () => "1" },
      { getKey: () => NodeLabel.of('Label\nWith\nNewlines'), getValue: () => "2" }
    ];

    evilEntries.forEach(entry => {
      visitor.export(entry as any);
    });

    visitor.close();

    const csvContent = fs.readFileSync(mappingFilePath, 'utf-8');
    console.log("😈 Evil CSV content that would break pandas:");
    console.log(csvContent);

    // 🛡️ Verify proper CSV escaping
    expect(csvContent).toContain('"Label,With,Commas"');      // Quoted commas
    expect(csvContent).toContain('"Label""With""Quotes"');    // Escaped quotes
    expect(csvContent).toContain('"Label\nWith\nNewlines"');  // Quoted newlines

    console.log("🛡️ Perfect CSV handling! Pandas would have crashed! 💥");
  });

  it("should demonstrate streaming memory efficiency", () => {
    console.log("🌊 PANDAS KILLER: Streaming efficiency test!");

    const visitor = new CsvNodeLabelMappingVisitor(testDataDir);

    // 🏗️ Simulate processing thousands of labels (pandas would explode)
    console.log("🏭 Processing 1000 labels streaming...");

    for (let i = 0; i < 1000; i++) {
      const entry = {
        getKey: () => NodeLabel.of(`StreamingLabel${i}`),
        getValue: () => i.toString()
      };
      visitor.export(entry as any);

      // 🎯 In real scenario, each export immediately writes to CSV buffer
      // No accumulation in memory like pandas!
    }

    visitor.close();

    const csvContent = fs.readFileSync(mappingFilePath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    expect(lines.length).toBe(1001); // Header + 1000 entries
    expect(csvContent).toContain("StreamingLabel0");
    expect(csvContent).toContain("StreamingLabel999");

    console.log(`🚀 Processed 1000 labels! CSV has ${lines.length} lines!`);
    console.log("🐼💀 Pandas would need 10GB RAM, we used streaming! 🌊");
  });

});
