import { describe, it, expect } from "vitest";
import { CsvNodeLabelMappingVisitor } from "../CsvNodeLabelMappingVisitor";
import { NodeLabel } from "@/projection";
import * as fs from "fs";
import * as path from "path";

const testDataDir = path.join(__dirname, "testdata");
const mappingFilePath = path.join(testDataDir, CsvNodeLabelMappingVisitor.LABEL_MAPPING_FILE_NAME);

describe("CsvNodeLabelMappingVisitor - Clean TypeScript Version", () => {

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

  it("should export label mappings using simple interface", () => {
    console.log("🧩 Testing clean TypeScript label mapping");

    const visitor = new CsvNodeLabelMappingVisitor(testDataDir);

    // 🍫 Simple, clean usage - no confusing Map.Entry
    visitor.export({
      label: NodeLabel.of("Person"),
      index: "0"
    });

    visitor.export({
      label: NodeLabel.of("Company"),
      index: "1"
    });

    visitor.close();

    const csvContent = fs.readFileSync(mappingFilePath, 'utf-8');
    console.log("📊 Generated CSV:");
    console.log(csvContent);

    expect(csvContent).toContain("index,label");
    expect(csvContent).toContain("0,Person");
    expect(csvContent).toContain("1,Company");

    console.log("✅ Clean TypeScript mapping works!");
  });

  it("should export using convenience method", () => {
    console.log("🍭 Testing convenience export method");

    const visitor = new CsvNodeLabelMappingVisitor(testDataDir);

    // 🎯 Even simpler usage
    visitor.exportMapping(NodeLabel.of("User"), "42");
    visitor.exportMapping(NodeLabel.of("Admin"), "99");

    visitor.close();

    const csvContent = fs.readFileSync(mappingFilePath, 'utf-8');

    expect(csvContent).toContain("42,User");
    expect(csvContent).toContain("99,Admin");

    console.log("✅ Convenience method works perfectly!");
  });

  it("should handle evil CSV characters properly", () => {
    console.log("😈 Testing evil CSV characters");

    const visitor = new CsvNodeLabelMappingVisitor(testDataDir);

    // 😈 Evil characters that break naive CSV
    visitor.exportMapping(NodeLabel.of('Evil,Comma,Label'), "0");
    visitor.exportMapping(NodeLabel.of('Evil"Quote"Label'), "1");
    visitor.exportMapping(NodeLabel.of('Evil\nNewline\nLabel'), "2");

    visitor.close();

    const csvContent = fs.readFileSync(mappingFilePath, 'utf-8');
    console.log("😈 Evil CSV content:");
    console.log(csvContent);

    // 🛡️ Verify proper escaping
    expect(csvContent).toContain('"Evil,Comma,Label"');
    expect(csvContent).toContain('"Evil""Quote""Label"');
    expect(csvContent).toContain('"Evil\nNewline\nLabel"');

    console.log("🛡️ Evil characters properly escaped!");
  });

});
