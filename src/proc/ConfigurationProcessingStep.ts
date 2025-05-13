import * as tsMorph from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import * as fs from 'fs-extra'; // Using fs-extra for ensureDirSync
import *path from 'path';

import { TsSpec } from './TsSpec'; // Your TsSpec interface
import { TsConfigParser } from './TsConfigParser'; // Your parser class/module
import { TsGenerateConfiguration } from './TsGenerateConfiguration'; // Your generator class/module
import { CONFIGURATION_DECORATOR_NAME, ConfigurationDecoratorOptions } from '../../src/annotations/Configuration'; // Assuming your decorator and its options interface

const CONFIG_CLASS_SUFFIX = "Impl";

export interface Logger {
  info: (message: string) => void;
  warn: (message: string, node?: tsMorph.Node) => void;
  error: (message: string, node?: tsMorph.Node) => void;
}

export enum ProcessResult {
  PROCESSED,
  INVALID,
  // RETRY, // Retry is complex and often not needed for basic TS code generators
}

/**
 * Determines the name for the generated configuration implementation class.
 * If the @Configuration decorator has a 'name' option, that is used.
 * Otherwise, it's the annotated interface/class name + "Impl".
 */
function determineGeneratedClassName(
  annotatedNode: tsMorph.InterfaceDeclaration | tsMorph.ClassDeclaration,
  decoratorOptions: ConfigurationDecoratorOptions | undefined
): string {
  const baseName = annotatedNode.getNameOrThrow();
  if (decoratorOptions?.name && decoratorOptions.name.trim() !== "") {
    return decoratorOptions.name.trim();
  }
  return baseName + CONFIG_CLASS_SUFFIX;
}

/**
 * Validates if the name of the class to be generated is different from the
 * name of the annotated interface/class.
 */
function isValidGeneratedClassName(
  annotatedNodeName: string,
  generatedClassName: string
): boolean {
  return annotatedNodeName !== generatedClassName;
}

/**
 * Processes a single TypeScript interface or class declaration that is expected
 * to be decorated with @Configuration.
 *
 * @param annotatedNode The ts-morph Node (InterfaceDeclaration or ClassDeclaration).
 * @param decorator The ts-morph DecoratorNode for @Configuration.
 * @param tsConfigParser Instance of TsConfigParser.
 * @param tsGenerateConfiguration Instance of TsGenerateConfiguration.
 * @param outputDirectory The directory where generated files should be written.
 * @param logger A logger instance.
 * @returns ProcessResult indicating success or failure.
 */
export function processConfigurationNode(
  annotatedNode: tsMorph.InterfaceDeclaration | tsMorph.ClassDeclaration,
  decorator: tsMorph.Decorator,
  tsConfigParser: TsConfigParser,
  tsGenerateConfiguration: TsGenerateConfiguration,
  outputDirectory: string,
  logger: Logger
): ProcessResult {
  // --- Validation 1: Check if it's an interface (GDS Java is strict) ---
  // You can choose to be less strict in TypeScript and allow classes too.
  // For this translation, let's keep it similar to GDS.
  if (annotatedNode.getKind() !== SyntaxKind.InterfaceDeclaration) {
    logger.error(
      `The @${CONFIGURATION_DECORATOR_NAME} decorator should be applied to an interface. Found on a ${SyntaxKind[annotatedNode.getKind()]}.`,
      annotatedNode
    );
    return ProcessResult.INVALID;
  }
  const annotatedInterface = annotatedNode as tsMorph.InterfaceDeclaration;


  // --- Extract decorator options ---
  // This requires your @Configuration decorator to store options in a way that's
  // accessible or parsable here. For simplicity, let's assume options are simple literals.
  let decoratorOptions: ConfigurationDecoratorOptions | undefined = undefined;
  const decoratorArgs = decorator.getArguments();
  if (decoratorArgs.length > 0 && decoratorArgs[0].getKind() === SyntaxKind.ObjectLiteralExpression) {
      try {
          // This is a simplified way to get options. For complex objects, you might need a more robust parser.
          const optionsObject = decoratorArgs[0].asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
          const nameProperty = optionsObject.getProperty("name");
          if (nameProperty && nameProperty.isKind(SyntaxKind.PropertyAssignment)) {
              const initializer = nameProperty.getInitializerIfKind(SyntaxKind.StringLiteral);
              if (initializer) {
                  decoratorOptions = { name: initializer.getLiteralValue() };
              }
          }
          // ... parse other options if your @Configuration decorator has them ...
      } catch (e) {
          logger.warn(`Could not parse options for @${CONFIGURATION_DECORATOR_NAME} on ${annotatedInterface.getName()}`, decorator);
      }
  }

  // --- Parsing: Create TsSpec ---
  let tsSpec: TsSpec;
  try {
    tsSpec = tsConfigParser.parse(annotatedInterface, decoratorOptions);
  } catch (e: any) {
    logger.error(`Error parsing configuration spec for ${annotatedInterface.getName()}: ${e.message}`, annotatedInterface);
    return ProcessResult.INVALID;
  }

  // --- Determine and Validate Generated Class Name ---
  const generatedClassName = determineGeneratedClassName(annotatedInterface, decoratorOptions);

  if (!isValidGeneratedClassName(annotatedInterface.getNameOrThrow(), generatedClassName)) {
    logger.error(
      `Name of generated class ('${generatedClassName}') must be different from the name of the annotated interface ('${annotatedInterface.getNameOrThrow()}'). Provide a 'name' option in @${CONFIGURATION_DECORATOR_NAME}.`,
      annotatedInterface
    );
    return ProcessResult.INVALID;
  }

  // --- Generation: Create TypeScript code string ---
  let generatedTsCode: string;
  try {
    generatedTsCode = tsGenerateConfiguration.generateConfigImpl(tsSpec, generatedClassName);
  } catch (e: any) {
    logger.error(`Error generating configuration code for ${generatedClassName}: ${e.message}`, annotatedInterface);
    return ProcessResult.INVALID;
  }

  // --- Writing: Write the generated file ---
  try {
    fs.ensureDirSync(outputDirectory); // Ensure the output directory exists
    const outputFilePath = path.join(outputDirectory, `${generatedClassName}.ts`);
    fs.writeFileSync(outputFilePath, generatedTsCode);
    logger.info(`Successfully generated: ${outputFilePath}`);
    return ProcessResult.PROCESSED;
  } catch (e: any) {
    logger.error(
      `Could not write generated config file ${generatedClassName}.ts: ${e.message}`,
      annotatedInterface
    );
    // In a more complex system, this might be a RETRY if it's a transient file system issue.
    // For a build script, it's often treated as INVALID/error.
    return ProcessResult.INVALID;
  }
}

/**
 * Main function to find and process all @Configuration decorated nodes in a project.
 * This is the conceptual equivalent of the `ConfigurationProcessor.steps()` and
 * `ConfigurationProcessingStep.process(elementsByAnnotation)` combined.
 */
export async function processAllConfigurations(
    project: tsMorph.Project,
    outputDirectory: string,
    logger: Logger
): Promise<void> {
    logger.info("Starting configuration processing...");
    const tsConfigParser = new TsConfigParser(logger); // Assuming TsConfigParser takes a logger
    const tsGenerateConfiguration = new TsGenerateConfiguration(); // Assuming default constructor

    let processedCount = 0;
    let errorCount = 0;

    const sourceFiles = project.getSourceFiles();
    for (const sourceFile of sourceFiles) {
        // Iterate over interfaces (and classes if you decide to support them)
        const interfaces = sourceFile.getInterfaces();
        for (const interfaceDeclaration of interfaces) {
            const configDecorator = interfaceDeclaration.getDecorator(CONFIGURATION_DECORATOR_NAME);
            if (configDecorator) {
                logger.info(`Found @${CONFIGURATION_DECORATOR_NAME} on: ${interfaceDeclaration.getName()} in ${sourceFile.getFilePath()}`);
                const result = processConfigurationNode(
                    interfaceDeclaration,
                    configDecorator,
                    tsConfigParser,
                    tsGenerateConfiguration,
                    outputDirectory,
                    logger
                );
                if (result === ProcessResult.PROCESSED) {
                    processedCount++;
                } else {
                    errorCount++;
                }
            }
        }
        // Optionally, iterate over classes if you want to support @Configuration on classes
        // const classes = sourceFile.getClasses();
        // for (const classDeclaration of classes) { ... }
    }

    logger.info(`Configuration processing finished. Processed: ${processedCount}, Errors: ${errorCount}.`);
    if (errorCount > 0) {
        // Optionally throw an error to fail the build script
        // throw new Error(`${errorCount} errors occurred during configuration processing.`);
    }
}
