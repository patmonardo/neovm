import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Log, NoOpLog, ConsoleLog } from "@/utils/Log";

describe("Log System - Comprehensive Tests", () => {
  let consoleSpy: {
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    debug: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    // Spy on all console methods
    consoleSpy = {
      info: vi.spyOn(console, "info").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
      debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("NoOpLog - Silent Logger", () => {
    let logger: NoOpLog;

    beforeEach(() => {
      logger = new NoOpLog();
    });

    it("info methods do nothing", () => {
      logger.info("simple message");
      logger.info("format %s", "value");
      logger.info("multiple %s %d", "args", 42);

      expect(consoleSpy.info).not.toHaveBeenCalled();
    });

    it("warn methods do nothing", () => {
      const error = new Error("test error");

      logger.warn("simple warning");
      logger.warn("warning with error", error);
      logger.warn("format %s", "value");
      logger.warn("format %s %d", "args", 42);

      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });

    it("error methods do nothing", () => {
      const error = new Error("test error");

      logger.error("simple error");
      logger.error("error with error", error);
      logger.error("format %s", "value");
      logger.error("format %s with error", error, "value");

      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it("debug method does nothing", () => {
      logger.debug("debug %s", "message");

      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it("debug is always disabled", () => {
      expect(logger.isDebugEnabled()).toBe(false);
    });

    it("handles null and undefined gracefully", () => {
      expect(() => {
        logger.info(null as any);
        logger.warn(undefined as any);
        logger.error(null as any, undefined as any);
        logger.debug(undefined as any);
      }).not.toThrow();
    });
  });

  describe("ConsoleLog - Console Implementation", () => {
    let logger: ConsoleLog;

    beforeEach(() => {
      logger = new ConsoleLog();
    });

    describe("Info Logging", () => {
      it("logs simple info message", () => {
        logger.info("Hello World");

        expect(consoleSpy.info).toHaveBeenCalledTimes(1);
        expect(consoleSpy.info).toHaveBeenCalledWith("Hello World");
      });

      it("logs info with string formatting", () => {
        logger.info("Hello %s", "World");

        expect(consoleSpy.info).toHaveBeenCalledWith("Hello World");
      });

      it("logs info with number formatting", () => {
        logger.info("Count: %d", 42);

        expect(consoleSpy.info).toHaveBeenCalledWith("Count: 42");
      });

      it("logs info with JSON formatting", () => {
        const obj = { name: "test", value: 123 };
        logger.info("Object: %j", obj);

        expect(consoleSpy.info).toHaveBeenCalledWith(
          'Object: {"name":"test","value":123}'
        );
      });

      it("logs info with multiple format placeholders", () => {
        logger.info("User %s has %d points: %j", "Alice", 100, { level: 5 });

        expect(consoleSpy.info).toHaveBeenCalledWith(
          'User Alice has 100 points: {"level":5}'
        );
      });

      it("logs info with extra arguments", () => {
        logger.info("Base message %s", "formatted", "extra1", "extra2");

        expect(consoleSpy.info).toHaveBeenCalledWith(
          "Base message formatted extra1 extra2"
        );
      });

      it("handles missing format arguments", () => {
        logger.info("Missing %s %d args");

        expect(consoleSpy.info).toHaveBeenCalledWith("Missing %s %d args");
      });

      it("handles complex objects in extra args", () => {
        const obj = { complex: true, nested: { value: 42 } };
        logger.info("Message", obj, "string");

        expect(consoleSpy.info).toHaveBeenCalledWith(
          'Message {"complex":true,"nested":{"value":42}} string'
        );
      });
    });

    describe("Warn Logging", () => {
      it("logs simple warn message", () => {
        logger.warn("Warning message");

        expect(consoleSpy.warn).toHaveBeenCalledWith("Warning message");
      });

      it("logs warn with error object", () => {
        const error = new Error("Test error");
        logger.warn("Something went wrong", error);

        expect(consoleSpy.warn).toHaveBeenCalledWith(
          "Something went wrong",
          error
        );
      });

      it("logs warn with formatting", () => {
        logger.warn("Warning: %s failed with code %d", "operation", 404);

        expect(consoleSpy.warn).toHaveBeenCalledWith(
          "Warning: operation failed with code 404"
        );
      });

      it("logs warn with error and extra args", () => {
        const error = new Error("Test error");
        logger.warn("Format %s", "error", error, "extra");

        // Error objects stringify to "{}" because their properties aren't enumerable
        expect(consoleSpy.warn).toHaveBeenCalledWith("Format error {} extra");
      });

      it("distinguishes between error object and string arg", () => {
        // String as second argument (not error)
        logger.warn("Message %s", "arg1", "arg2");

        expect(consoleSpy.warn).toHaveBeenCalledWith("Message arg1 arg2");
      });

      it("handles error-like objects", () => {
        const errorLike = { message: "fake error", stack: "fake stack" };
        logger.warn("Fake error", errorLike);

        // Should treat as regular argument since it's not instanceof Error
        expect(consoleSpy.warn).toHaveBeenCalledWith(
          'Fake error {"message":"fake error","stack":"fake stack"}'
        );
      });
    });

    describe("Error Logging", () => {
      it("logs simple error message", () => {
        logger.error("Error message");

        expect(consoleSpy.error).toHaveBeenCalledWith("Error message");
      });

      it("logs error with error object", () => {
        const error = new Error("Test error");
        logger.error("Critical failure", error);

        expect(consoleSpy.error).toHaveBeenCalledWith(
          "Critical failure",
          error
        );
      });

      it("logs error with formatting", () => {
        logger.error("Error: %s at line %d", "syntax error", 42);

        expect(consoleSpy.error).toHaveBeenCalledWith(
          "Error: syntax error at line 42"
        );
      });

      it("logs error with error object and formatting", () => {
        const error = new Error("Test error");
        logger.error("Failed %s", error, "operation");

        expect(consoleSpy.error).toHaveBeenCalledWith(
          "Failed operation",
          error
        );
      });

      it("handles multiple error overloads correctly", () => {
        const error = new Error("Test error");

        // Test each overload
        logger.error("simple");
        logger.error("with error", error);
        logger.error("format %s", "arg");
        logger.error("format %s", error, "arg");

        expect(consoleSpy.error).toHaveBeenCalledTimes(4);
        expect(consoleSpy.error).toHaveBeenNthCalledWith(1, "simple");
        expect(consoleSpy.error).toHaveBeenNthCalledWith(
          2,
          "with error",
          error
        );
        expect(consoleSpy.error).toHaveBeenNthCalledWith(3, "format arg");
        expect(consoleSpy.error).toHaveBeenNthCalledWith(
          4,
          "format arg",
          error
        );
      });

      it("handles non-error objects in error position", () => {
        const notError = { message: "not an error" };
        logger.error("Message %s", notError, "extra");

        expect(consoleSpy.error).toHaveBeenCalledWith(
          'Message {"message":"not an error"} extra'
        );
      });
    });

    describe("Debug Logging", () => {
      it("logs debug when enabled", () => {
        // Mock debug as enabled
        vi.spyOn(logger, "isDebugEnabled").mockReturnValue(true);

        logger.debug("Debug %s", "message");

        expect(consoleSpy.debug).toHaveBeenCalledWith("Debug message");
      });

      it("skips debug when disabled", () => {
        // Mock debug as disabled
        vi.spyOn(logger, "isDebugEnabled").mockReturnValue(false);

        logger.debug("Debug %s", "message");

        expect(consoleSpy.debug).not.toHaveBeenCalled();
      });

      it("handles complex debug formatting", () => {
        vi.spyOn(logger, "isDebugEnabled").mockReturnValue(true);

        const obj = { debug: true, data: [1, 2, 3] };
        logger.debug("Debug info: %j with extra %s", obj, "data");

        expect(consoleSpy.debug).toHaveBeenCalledWith(
          'Debug info: {"debug":true,"data":[1,2,3]} with extra data'
        );
      });
    });

    describe("Debug Enablement", () => {
      let originalEnv: string | undefined;
      let originalDebug: string | undefined;

      beforeEach(() => {
        originalEnv = process.env.NODE_ENV;
        originalDebug = process.env.DEBUG;
      });

      afterEach(() => {
        if (originalEnv !== undefined) {
          process.env.NODE_ENV = originalEnv;
        } else {
          delete process.env.NODE_ENV;
        }

        if (originalDebug !== undefined) {
          process.env.DEBUG = originalDebug;
        } else {
          delete process.env.DEBUG;
        }
      });

      it("enables debug in development environment", () => {
        process.env.NODE_ENV = "development";
        delete process.env.DEBUG;

        const freshLogger = new ConsoleLog();
        expect(freshLogger.isDebugEnabled()).toBe(true);
      });

      it("enables debug when DEBUG=true", () => {
        process.env.NODE_ENV = "production";
        process.env.DEBUG = "true";

        const freshLogger = new ConsoleLog();
        expect(freshLogger.isDebugEnabled()).toBe(true);
      });

      it("disables debug in production without DEBUG flag", () => {
        process.env.NODE_ENV = "production";
        delete process.env.DEBUG;

        const freshLogger = new ConsoleLog();
        expect(freshLogger.isDebugEnabled()).toBe(false);
      });

      it("handles missing environment variables", () => {
        delete process.env.NODE_ENV;
        delete process.env.DEBUG;

        const freshLogger = new ConsoleLog();
        expect(freshLogger.isDebugEnabled()).toBe(false);
      });
    });

    describe("String Formatting Edge Cases", () => {
      it("handles empty format string", () => {
        logger.info("", "args", "ignored");

        expect(consoleSpy.info).toHaveBeenCalledWith(" args ignored");
      });

      it("handles format string with no placeholders", () => {
        logger.info("no placeholders", "arg1", "arg2");

        expect(consoleSpy.info).toHaveBeenCalledWith(
          "no placeholders arg1 arg2"
        );
      });

      it("handles more placeholders than arguments", () => {
        logger.info("too %s many %d placeholders %j");

        expect(consoleSpy.info).toHaveBeenCalledWith(
          "too %s many %d placeholders %j"
        );
      });

      it("handles escaped percent signs", () => {
        logger.info("literal % sign and %s", "formatted");

        expect(consoleSpy.info).toHaveBeenCalledWith(
          "literal % sign and formatted"
        );
      });

      it("handles null and undefined arguments", () => {
        logger.info("null: %s, undefined: %s", null, undefined);

        expect(consoleSpy.info).toHaveBeenCalledWith(
          "null: null, undefined: undefined"
        );
      });

      it("handles circular references in JSON", () => {
        const circular: any = { name: "test" };
        circular.self = circular;

        expect(() => {
          logger.info("Circular: %j", circular);
        }).toThrow();

        // Should handle JSON.stringify error gracefully
        expect(consoleSpy.info).not.toHaveBeenCalled();
      });

      it("formats numbers correctly", () => {
        logger.info("Numbers: %d, %d, %d", 42, 3.14, NaN);

        expect(consoleSpy.info).toHaveBeenCalledWith("Numbers: 42, 3.14, NaN");
      });

      it("handles functions as arguments", () => {
        const fn = () => "test";
        logger.info("Function: %s", fn);

        expect(consoleSpy.info).toHaveBeenCalledWith('Function: () => "test"');
      });
    });
  });

  describe("Log Factory Methods", () => {
    it("creates NoOp logger", () => {
      const logger = Log.noOp();

      expect(logger).toBeInstanceOf(NoOpLog);
      expect(logger.isDebugEnabled()).toBe(false);
    });

    it("creates Console logger", () => {
      const logger = Log.console();

      expect(logger).toBeInstanceOf(ConsoleLog);
    });

    it("creates prefixed logger with default ConsoleLog", () => {
      const logger = Log.withPrefix("TEST");

      logger.info("message");

      expect(consoleSpy.info).toHaveBeenCalledWith("[TEST] message");
    });

    it("creates prefixed logger with custom base", () => {
      const baseLogger = new NoOpLog();
      const logger = Log.withPrefix("CUSTOM", baseLogger);

      logger.info("message");

      // Should use NoOp base, so no console output
      expect(consoleSpy.info).not.toHaveBeenCalled();
    });
  });

  describe("PrefixedLog Implementation", () => {
    let baseLogger: ConsoleLog;
    let prefixedLogger: Log;

    beforeEach(() => {
      baseLogger = new ConsoleLog();
      prefixedLogger = Log.withPrefix("PREFIX", baseLogger);
    });

    it("prefixes info messages", () => {
      prefixedLogger.info("test message");

      expect(consoleSpy.info).toHaveBeenCalledWith("[PREFIX] test message");
    });

    it("prefixes info with formatting", () => {
      prefixedLogger.info("formatted %s", "message");

      expect(consoleSpy.info).toHaveBeenCalledWith(
        "[PREFIX] formatted message"
      );
    });

    it("prefixes warn messages", () => {
      prefixedLogger.warn("warning message");

      expect(consoleSpy.warn).toHaveBeenCalledWith("[PREFIX] warning message");
    });

    it("prefixes warn with error", () => {
      const error = new Error("test");
      prefixedLogger.warn("warning", error);

      expect(consoleSpy.warn).toHaveBeenCalledWith("[PREFIX] warning", error);
    });

    it("prefixes error messages", () => {
      prefixedLogger.error("error message");

      expect(consoleSpy.error).toHaveBeenCalledWith("[PREFIX] error message");
    });

    it("prefixes error with error object", () => {
      const error = new Error("test");
      prefixedLogger.error("error", error);

      expect(consoleSpy.error).toHaveBeenCalledWith("[PREFIX] error", error);
    });

    it("prefixes debug messages", () => {
      vi.spyOn(baseLogger, "isDebugEnabled").mockReturnValue(true);

      prefixedLogger.debug("debug %s", "message");

      expect(consoleSpy.debug).toHaveBeenCalledWith("[PREFIX] debug message");
    });

    it("delegates debug enablement to base logger", () => {
      const isEnabledSpy = vi
        .spyOn(baseLogger, "isDebugEnabled")
        .mockReturnValue(true);

      const result = prefixedLogger.isDebugEnabled();

      expect(result).toBe(true);
      expect(isEnabledSpy).toHaveBeenCalled();
    });

    it("handles complex prefix scenarios", () => {
      const complexPrefixed = Log.withPrefix("COMPLEX[123]", baseLogger);

      complexPrefixed.info("message with %s", "formatting");

      expect(consoleSpy.info).toHaveBeenCalledWith(
        "[COMPLEX[123]] message with formatting"
      );
    });

    it("handles empty prefix", () => {
      const emptyPrefixed = Log.withPrefix("", baseLogger);

      emptyPrefixed.info("message");

      expect(consoleSpy.info).toHaveBeenCalledWith("[] message");
    });
  });

  describe("Real-World Usage Scenarios", () => {
    let logger: ConsoleLog;

    beforeEach(() => {
      logger = new ConsoleLog();
    });

    it("handles typical application logging patterns", () => {
      logger.info("Application starting...");
      logger.info("Loaded %d configurations", 5);
      logger.warn("Deprecated feature used: %s", "oldApi");

      const error = new Error("Connection failed");
      logger.error("Database connection failed", error);

      logger.debug("Debug info: %j", { connection: "localhost:5432" });

      expect(consoleSpy.info).toHaveBeenCalledTimes(2);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });

    it("handles error propagation correctly", () => {
      const originalError = new Error("Original cause");
      originalError.stack = "Original stack trace";

      logger.error(
        "Operation failed due to %s",
        originalError,
        "network issue"
      );

      expect(consoleSpy.error).toHaveBeenCalledWith(
        "Operation failed due to network issue",
        originalError
      );
    });

    it("handles mixed argument types", () => {
      const data = {
        user: "alice",
        session: "12345",
        timestamp: new Date("2024-01-01T00:00:00Z"),
      };

      logger.info(
        "User %s logged in with session %s at %j",
        data.user,
        data.session,
        data.timestamp
      );

      expect(consoleSpy.info).toHaveBeenCalledWith(
        'User alice logged in with session 12345 at "2024-01-01T00:00:00.000Z"'
      );
    });

    it("performs well with many log calls", () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        logger.info("Log message %d with data %j", i, { iteration: i });
      }

      const duration = performance.now() - start;
      console.log(`1000 log calls took ${duration}ms`);

      expect(consoleSpy.info).toHaveBeenCalledTimes(1000);
      expect(duration).toBeLessThan(1000); // Should be fast
    });
  });

  describe("Interface Compliance", () => {
    it("NoOpLog implements Log interface completely", () => {
      const logger: Log = new NoOpLog();

      // Should have all required methods
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.debug).toBe("function");
      expect(typeof logger.isDebugEnabled).toBe("function");
    });

    it("ConsoleLog implements Log interface completely", () => {
      const logger: Log = new ConsoleLog();

      expect(typeof logger.info).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.debug).toBe("function");
      expect(typeof logger.isDebugEnabled).toBe("function");
    });

    it("PrefixedLog implements Log interface completely", () => {
      const logger: Log = Log.withPrefix("TEST");

      expect(typeof logger.info).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.debug).toBe("function");
      expect(typeof logger.isDebugEnabled).toBe("function");
    });
  });
});
