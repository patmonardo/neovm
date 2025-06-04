import { LogLevel } from '../LogLevel';

describe('LogLevel - String Enum with Namespace', () => {
  describe('Enum Values', () => {
    it('has string enum values', () => {
      expect(LogLevel.WARNING).toBe('WARNING');
      expect(LogLevel.INFO).toBe('INFO');
      expect(LogLevel.DEBUG).toBe('DEBUG');

      expect(typeof LogLevel.WARNING).toBe('string');
      expect(typeof LogLevel.INFO).toBe('string');
      expect(typeof LogLevel.DEBUG).toBe('string');
    });
  });

  describe('fromString Parsing', () => {
    it('parses exact matches', () => {
      expect(LogLevel.fromString('WARNING')).toBe(LogLevel.WARNING);
      expect(LogLevel.fromString('INFO')).toBe(LogLevel.INFO);
      expect(LogLevel.fromString('DEBUG')).toBe(LogLevel.DEBUG);
    });

    it('handles case insensitivity', () => {
      expect(LogLevel.fromString('warning')).toBe(LogLevel.WARNING);
      expect(LogLevel.fromString('info')).toBe(LogLevel.INFO);
      expect(LogLevel.fromString('debug')).toBe(LogLevel.DEBUG);
    });

    it('supports WARN alias', () => {
      expect(LogLevel.fromString('WARN')).toBe(LogLevel.WARNING);
      expect(LogLevel.fromString('warn')).toBe(LogLevel.WARNING);
    });

    it('throws for unknown levels', () => {
      expect(() => LogLevel.fromString('ERROR')).toThrow('Unknown log level: ERROR');
      expect(() => LogLevel.fromString('TRACE')).toThrow('Unknown log level: TRACE');
      expect(() => LogLevel.fromString('')).toThrow('Unknown log level: ');
    });
  });

  describe('Priority System', () => {
    it('returns correct priorities', () => {
      expect(LogLevel.getPriority(LogLevel.WARNING)).toBe(3);
      expect(LogLevel.getPriority(LogLevel.INFO)).toBe(2);
      expect(LogLevel.getPriority(LogLevel.DEBUG)).toBe(1);
    });

    it('priorities are ordered correctly', () => {
      const warningPri = LogLevel.getPriority(LogLevel.WARNING);
      const infoPri = LogLevel.getPriority(LogLevel.INFO);
      const debugPri = LogLevel.getPriority(LogLevel.DEBUG);

      expect(warningPri).toBeGreaterThan(infoPri);
      expect(infoPri).toBeGreaterThan(debugPri);
    });
  });

  describe('shouldLog Filtering', () => {
    it('WARNING threshold only allows WARNING', () => {
      expect(LogLevel.shouldLog(LogLevel.WARNING, LogLevel.WARNING)).toBe(true);
      expect(LogLevel.shouldLog(LogLevel.INFO, LogLevel.WARNING)).toBe(false);
      expect(LogLevel.shouldLog(LogLevel.DEBUG, LogLevel.WARNING)).toBe(false);
    });

    it('INFO threshold allows WARNING and INFO', () => {
      expect(LogLevel.shouldLog(LogLevel.WARNING, LogLevel.INFO)).toBe(true);
      expect(LogLevel.shouldLog(LogLevel.INFO, LogLevel.INFO)).toBe(true);
      expect(LogLevel.shouldLog(LogLevel.DEBUG, LogLevel.INFO)).toBe(false);
    });

    it('DEBUG threshold allows all levels', () => {
      expect(LogLevel.shouldLog(LogLevel.WARNING, LogLevel.DEBUG)).toBe(true);
      expect(LogLevel.shouldLog(LogLevel.INFO, LogLevel.DEBUG)).toBe(true);
      expect(LogLevel.shouldLog(LogLevel.DEBUG, LogLevel.DEBUG)).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('getAllLevels returns ordered array', () => {
      const levels = LogLevel.getAllLevels();
      expect(levels).toEqual([LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARNING]);
    });

    it('getDefault returns INFO', () => {
      expect(LogLevel.getDefault()).toBe(LogLevel.INFO);
    });
  });

  describe('Real Usage', () => {
    it('supports log filtering workflow', () => {
      const messages = [
        { level: LogLevel.DEBUG, text: 'Debug message' },
        { level: LogLevel.INFO, text: 'Info message' },
        { level: LogLevel.WARNING, text: 'Warning message' }
      ];

      const infoAndUp = messages.filter(msg =>
        LogLevel.shouldLog(msg.level, LogLevel.INFO)
      );

      expect(infoAndUp).toHaveLength(2);
      expect(infoAndUp[0].text).toBe('Info message');
      expect(infoAndUp[1].text).toBe('Warning message');
    });

    it('supports configuration from strings', () => {
      function createLogger(levelStr: string) {
        const threshold = LogLevel.fromString(levelStr);
        return {
          log: (level: LogLevel, msg: string) =>
            LogLevel.shouldLog(level, threshold) ? `[${level}] ${msg}` : null
        };
      }

      const infoLogger = createLogger('INFO');

      expect(infoLogger.log(LogLevel.WARNING, 'test')).toBe('[WARNING] test');
      expect(infoLogger.log(LogLevel.INFO, 'test')).toBe('[INFO] test');
      expect(infoLogger.log(LogLevel.DEBUG, 'test')).toBeNull();
    });

    it('works with priority-based operations', () => {
      const levels = [LogLevel.DEBUG, LogLevel.WARNING, LogLevel.INFO];

      // Sort by priority (highest first)
      const sorted = levels.sort((a, b) =>
        LogLevel.getPriority(b) - LogLevel.getPriority(a)
      );

      expect(sorted).toEqual([LogLevel.WARNING, LogLevel.INFO, LogLevel.DEBUG]);
    });

    it('handles mixed case and aliases in real scenarios', () => {
      const configStrings = ['warn', 'INFO', 'Debug'];
      const parsedLevels = configStrings.map(LogLevel.fromString);

      expect(parsedLevels).toEqual([
        LogLevel.WARNING,
        LogLevel.INFO,
        LogLevel.DEBUG
      ]);
    });
  });
});
