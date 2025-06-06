import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CsvSimpleWriter } from '../CsvSimpleWriter';
import * as fs from 'fs';
import * as path from 'path';

const testDir = path.join(__dirname, 'temp');
const testFile = path.join(testDir, 'test.csv');

describe('CsvSimpleWriter', () => {

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it('should create and write to CSV file', () => {
    const writer = new CsvSimpleWriter(testFile);

    expect(writer.isFileOpen()).toBe(true);
    expect(writer.getFilePath()).toBe(testFile);

    writer.writeRow(['name', 'age', 'city']);
    writer.writeRow(['Alice', '25', 'New York']);
    writer.writeRow(['Bob', '30', 'Boston']);

    writer.close();
    expect(writer.isFileOpen()).toBe(false);

    // Verify file content
    const content = fs.readFileSync(testFile, 'utf-8');
    const expectedContent = 'name,age,city\nAlice,25,New York\nBob,30,Boston\n';
    expect(content).toBe(expectedContent);
  });

  it('should handle multiple rows at once', () => {
    const writer = new CsvSimpleWriter(testFile);

    const rows = [
      ['header1', 'header2', 'header3'],
      ['value1', 'value2', 'value3'],
      ['data1', 'data2', 'data3']
    ];

    writer.writeRows(rows);
    writer.close();

    const content = fs.readFileSync(testFile, 'utf-8');
    expect(content).toContain('header1,header2,header3');
    expect(content).toContain('value1,value2,value3');
    expect(content).toContain('data1,data2,data3');
  });

  it('should throw error when writing to closed writer', () => {
    const writer = new CsvSimpleWriter(testFile);
    writer.close();

    expect(() => {
      writer.writeRow(['test']);
    }).toThrow('CSV writer is not open');
  });

});
