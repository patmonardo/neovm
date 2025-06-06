import { NodeFileHeader, CSV_NODE_ID_COLUMN } from '../../NodeFileHeader';
import { readFileSync } from 'fs';
import { join } from 'path';

describe("NodeFileHeader with Real CSV Files", () => {

  const testDataDir = join(__dirname, 'testdata');

  it("📁 Reading Real CSV Files", () => {
    console.log("📁 === READING REAL CSV FILES ===");

    const csvFiles = [
      { name: 'users.csv', expectedLabels: ['Person'] },
      { name: 'companies.csv', expectedLabels: ['Company', 'Organization'] },
      { name: 'products.csv', expectedLabels: ['Product'] }
    ];

    csvFiles.forEach(file => {
      console.log(`\n📄 Processing ${file.name}:`);

      try {
        const csvContent = readFileSync(join(testDataDir, file.name), 'utf-8');
        const lines = csvContent.trim().split('\n');
        const headers = lines[0].split(',');
        const sampleRow = lines[1].split(',');

        console.log("  Headers:", headers);
        console.log("  Sample row:", sampleRow);
        console.log("  Expected labels:", file.expectedLabels);

        // Try to create NodeFileHeader (might still fail due to missing imports)
        try {
          const nodeHeader = NodeFileHeader.of(headers, file.expectedLabels);
          console.log("  ✅ Successfully parsed headers");
          console.log("  📊 Properties:", nodeHeader.propertyMappings().length);
        } catch (error) {
          console.log("  ❌ Header parsing failed:", error.message);
        }

      } catch (error) {
        console.log("  ❌ File reading failed:", error.message);
      }
    });

    // ▶️ CLICK -> Read real CSV files!
  });

  it("🔍 Manual Header Analysis", () => {
    console.log("🔍 === MANUAL HEADER ANALYSIS ===");

    // Parse headers manually to understand the format
    const headerExamples = [
      ":ID,name:string,age:int,email:string,isActive:boolean,:LABEL",
      ":ID,name:string,industry:string,employees:int,revenue:double,founded:int,:LABEL",
      ":START_ID,:END_ID,:TYPE,since:string,strength:double"
    ];

    headerExamples.forEach((headerLine, index) => {
      console.log(`\n📋 Header ${index + 1}: ${headerLine}`);

      const columns = headerLine.split(',');
      console.log("  Parsed columns:");

      columns.forEach((col, colIndex) => {
        if (col.includes(':')) {
          const [name, type] = col.split(':');
          console.log(`    ${colIndex}: ${name} (${type})`);
        } else {
          console.log(`    ${colIndex}: ${col} (special column)`);
        }
      });

      // Identify special columns
      const specialCols = columns.filter(col =>
        col === ':ID' || col === ':LABEL' || col === ':START_ID' ||
        col === ':END_ID' || col === ':TYPE'
      );
      console.log("  Special columns:", specialCols);

      const propertyCols = columns.filter(col =>
        col.includes(':') && !specialCols.includes(col)
      );
      console.log("  Property columns:", propertyCols);
    });

    // ▶️ CLICK -> Analyze header formats manually!
  });

  it("🧪 CSV Data Type Analysis", () => {
    console.log("🧪 === CSV DATA TYPE ANALYSIS ===");

    // Analyze what data types we're dealing with
    const dataTypes = [
      { csvType: 'string', examples: ['Alice Johnson', 'TechCorp', 'alice@example.com'] },
      { csvType: 'int', examples: ['28', '1500', '2010'] },
      { csvType: 'double', examples: ['75000000.50', '1299.99', '0.8'] },
      { csvType: 'boolean', examples: ['true', 'false'] }
    ];

    dataTypes.forEach(dataType => {
      console.log(`\n🔢 Type: ${dataType.csvType}`);
      console.log("  Examples:", dataType.examples);

      // Show what parsing might look like
      console.log("  Parsed values:");
      dataType.examples.forEach(example => {
        let parsed;
        try {
          switch (dataType.csvType) {
            case 'int':
              parsed = parseInt(example);
              break;
            case 'double':
              parsed = parseFloat(example);
              break;
            case 'boolean':
              parsed = example === 'true';
              break;
            default:
              parsed = example; // string
          }
          console.log(`    "${example}" → ${parsed} (${typeof parsed})`);
        } catch (error) {
          console.log(`    "${example}" → PARSE ERROR`);
        }
      });
    });

    // ▶️ CLICK -> Analyze CSV data types!
  });

});
