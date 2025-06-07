import { describe, it, expect } from "vitest";
import { CsvRelationshipTypeMappingVisitor } from "../CsvRelationshipTypeMappingVisitor";
import { RelationshipType } from "@/projection";
import * as fs from "fs";
import * as path from "path";

const testDataDir = path.join(__dirname, "testdata");
const mappingFilePath = path.join(
  testDataDir,
  CsvRelationshipTypeMappingVisitor.TYPE_MAPPING_FILE_NAME
);

describe("CsvRelationshipTypeMappingVisitor - Fixed Version", () => {
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

  it("should export relationship type mappings using clean TypeScript interface", async () => {
    console.log("🔗 Testing relationship type mapping export");

    const visitor = new CsvRelationshipTypeMappingVisitor(testDataDir);

    // ✅ Clean TypeScript usage
    visitor.export({
      type: RelationshipType.of("KNOWS"),
      index: "0",
    });

    visitor.export({
      type: RelationshipType.of("WORKS_AT"),
      index: "1",
    });

    await visitor.close();

    const csvContent = fs.readFileSync(mappingFilePath, "utf-8");
    console.log("📊 Generated CSV:");
    console.log(csvContent);

    expect(csvContent).toContain("index,type");
    expect(csvContent).toContain("0,KNOWS");
    expect(csvContent).toContain("1,WORKS_AT");

    console.log("✅ Clean TypeScript mapping works!");
  });

  it("should export using convenience method", async () => {
    console.log("🎯 Testing convenience export method");

    const visitor = new CsvRelationshipTypeMappingVisitor(testDataDir);

    // ✅ Even simpler usage
    visitor.exportMapping(RelationshipType.of("FOLLOWS"), "42");
    visitor.exportMapping(RelationshipType.of("LIKES"), "99");

    await visitor.close();

    const csvContent = fs.readFileSync(mappingFilePath, "utf-8");

    expect(csvContent).toContain("42,FOLLOWS");
    expect(csvContent).toContain("99,LIKES");

    console.log("✅ Convenience method works perfectly!");
  });
});
