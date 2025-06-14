import { NodeLabel, RelationshipType } from "@/api";
import { PropertyMapping } from "@/projection";
import { ValueType } from "@/api";

/**
 * ENHANCED MULTIMEDIA PROJECTION CONFIG
 *
 * Beyond GDS limitations - supports full multimedia pipeline configuration
 */
export interface MultimediaProjectionConfig {
  // ====================================================================
  // BASIC PROJECTION SETTINGS (GDS-compatible)
  // ====================================================================

  /** Graph name for identification */
  graphName: string;

  /** User/owner of the projection */
  username: string;

  // ====================================================================
  // NODE CONFIGURATION (Enhanced beyond GDS)
  // ====================================================================

  /** Which node labels to include in projection */
  nodeProjections: NodeProjectionConfig;

  /** Enhanced node properties (multimedia support) */
  nodeProperties: EnhancedPropertyMappings;

  // ====================================================================
  // RELATIONSHIP CONFIGURATION (Revolutionary vs GDS)
  // ====================================================================

  /** Which relationship types to include */
  relationshipProjections: RelationshipProjectionConfig;

  /** BREAKTHROUGH: Rich relationship properties (vs GDS single numeric) */
  relationshipProperties: EnhancedPropertyMappings;

  // ====================================================================
  // MULTIMEDIA ENHANCEMENTS (Beyond GDS)
  // ====================================================================

  /** Multimedia processing pipeline configuration */
  multimediaConfig?: MultimediaProcessingConfig;

  /** ML/AI model integration settings */
  mlConfig?: MLProcessingConfig;

  /** Real-time streaming configuration */
  streamingConfig?: StreamingConfig;

  // ====================================================================
  // PROCESSING SETTINGS
  // ====================================================================

  /** Concurrency level for loading */
  readConcurrency: number;

  /** Progress logging enabled */
  logProgress: boolean;

  /** Job ID for tracking */
  jobId?: string;
}

// ====================================================================
// NODE PROJECTION CONFIGURATION
// ====================================================================

export interface NodeProjectionConfig {
  /** Include all node labels (wildcard) */
  includeAll: boolean;

  /** Specific labels to include */
  labels: Set<NodeLabel>;

  /** Labels to exclude (if includeAll = true) */
  excludeLabels?: Set<NodeLabel>;

  // ✅ ENHANCED: Multimedia-specific node types
  multimediaTypes?: Set<MultimediaNodeType>;
}

export enum MultimediaNodeType {
  DOCUMENT = "DOCUMENT",
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  AUDIO = "AUDIO",
  PERSON = "PERSON",
  LOCATION = "LOCATION",
  TOPIC = "TOPIC",
  ENTITY = "ENTITY"
}

// ====================================================================
// RELATIONSHIP PROJECTION CONFIGURATION
// ====================================================================

export interface RelationshipProjectionConfig {
  /** Include all relationship types */
  includeAll: boolean;

  /** Specific types to include */
  types: Set<RelationshipType>;

  /** Types to exclude */
  excludeTypes?: Set<RelationshipType>;

  /** Relationship orientation (NATURAL, REVERSE, UNDIRECTED) */
  orientation: RelationshipOrientation;

  /** How to handle multiple edges between same nodes */
  aggregation: RelationshipAggregation;

  // ✅ ENHANCED: Rich relationship semantics
  semanticTypes?: Set<SemanticRelationshipType>;
}

export enum RelationshipOrientation {
  NATURAL = "NATURAL",     // A -> B
  REVERSE = "REVERSE",     // A <- B
  UNDIRECTED = "UNDIRECTED" // A <-> B
}

export enum RelationshipAggregation {
  NONE = "NONE",       // Keep all edges
  SUM = "SUM",         // Sum numeric properties
  MAX = "MAX",         // Take maximum value
  MIN = "MIN",         // Take minimum value
  COUNT = "COUNT",     // Count edges only
  FIRST = "FIRST",     // Keep first encountered
  LAST = "LAST"        // Keep last encountered
}

export enum SemanticRelationshipType {
  MENTIONS = "MENTIONS",
  CONTAINS = "CONTAINS",
  SIMILAR_TO = "SIMILAR_TO",
  PART_OF = "PART_OF",
  CREATED_BY = "CREATED_BY",
  OCCURS_IN = "OCCURS_IN",
  RELATED_TO = "RELATED_TO"
}

// ====================================================================
// ENHANCED PROPERTY MAPPINGS (Beyond GDS)
// ====================================================================

export interface EnhancedPropertyMappings {
  /** Property mappings list */
  mappings: EnhancedPropertyMapping[];

  /** Default processing for unmapped properties */
  defaultHandling: PropertyDefaultHandling;
}

export interface EnhancedPropertyMapping {
  /** Source property key in raw data */
  sourceKey: string;

  /** Target property key in graph store */
  targetKey: string;

  /** Expected/required value type */
  valueType: ValueType;

  /** Default value if property missing */
  defaultValue?: any;

  /** Transformation function to apply */
  transformation?: PropertyTransformation;

  // ✅ MULTIMEDIA ENHANCEMENTS
  /** Multimedia processing configuration */
  multimediaProcessing?: MultimediaPropertyConfig;

  /** ML model to apply for feature extraction */
  mlModel?: MLModelConfig;
}

export enum PropertyDefaultHandling {
  SKIP = "SKIP",           // Skip properties not explicitly mapped
  INCLUDE_ALL = "INCLUDE_ALL", // Include all properties as-is
  INCLUDE_COMPATIBLE = "INCLUDE_COMPATIBLE" // Include only compatible types
}

export enum PropertyTransformation {
  NONE = "NONE",
  NORMALIZE = "NORMALIZE",     // Normalize numeric values
  TOKENIZE = "TOKENIZE",       // Tokenize text
  EMBED = "EMBED",             // Generate embeddings
  EXTRACT_FEATURES = "EXTRACT_FEATURES", // Extract ML features
  RESIZE_IMAGE = "RESIZE_IMAGE", // Resize images
  TRANSCRIBE_AUDIO = "TRANSCRIBE_AUDIO" // Speech-to-text
}

// ====================================================================
// MULTIMEDIA PROCESSING CONFIGURATION
// ====================================================================

export interface MultimediaProcessingConfig {
  /** Image processing settings */
  imageProcessing: ImageProcessingConfig;

  /** Audio processing settings */
  audioProcessing: AudioProcessingConfig;

  /** Video processing settings */
  videoProcessing: VideoProcessingConfig;

  /** Text/NLP processing settings */
  textProcessing: TextProcessingConfig;
}

export interface ImageProcessingConfig {
  /** Generate thumbnails */
  generateThumbnails: boolean;

  /** Extract visual features */
  extractFeatures: boolean;

  /** Perform object detection */
  objectDetection: boolean;

  /** Maximum image size to process */
  maxSize: { width: number; height: number };

  /** Supported formats */
  supportedFormats: string[];
}

export interface AudioProcessingConfig {
  /** Perform speech-to-text */
  speechToText: boolean;

  /** Extract audio features */
  extractFeatures: boolean;

  /** Music analysis (tempo, key, etc.) */
  musicAnalysis: boolean;

  /** Maximum duration to process (seconds) */
  maxDuration: number;
}

export interface VideoProcessingConfig {
  /** Extract key frames */
  extractKeyFrames: boolean;

  /** Perform object detection on frames */
  objectDetection: boolean;

  /** Extract audio track for processing */
  extractAudio: boolean;

  /** Maximum video length to process (seconds) */
  maxDuration: number;
}

export interface TextProcessingConfig {
  /** Perform NER (Named Entity Recognition) */
  namedEntityRecognition: boolean;

  /** Generate text embeddings */
  generateEmbeddings: boolean;

  /** Perform sentiment analysis */
  sentimentAnalysis: boolean;

  /** Extract topics */
  topicExtraction: boolean;

  /** Maximum text length to process */
  maxLength: number;
}

// ====================================================================
// ML/AI CONFIGURATION
// ====================================================================

export interface MLProcessingConfig {
  /** Available ML models */
  models: MLModelConfig[];

  /** Default embedding model */
  defaultEmbeddingModel: string;

  /** GPU acceleration enabled */
  useGPU: boolean;

  /** Batch size for ML processing */
  batchSize: number;
}

export interface MLModelConfig {
  /** Model identifier */
  modelId: string;

  /** Model type */
  modelType: MLModelType;

  /** Input data types this model accepts */
  inputTypes: ValueType[];

  /** Output data type */
  outputType: ValueType;

  /** Model configuration parameters */
  parameters: Record<string, any>;
}

export enum MLModelType {
  TEXT_EMBEDDING = "TEXT_EMBEDDING",
  IMAGE_EMBEDDING = "IMAGE_EMBEDDING",
  AUDIO_EMBEDDING = "AUDIO_EMBEDDING",
  OBJECT_DETECTION = "OBJECT_DETECTION",
  SENTIMENT_ANALYSIS = "SENTIMENT_ANALYSIS",
  NAMED_ENTITY_RECOGNITION = "NAMED_ENTITY_RECOGNITION",
  SPEECH_TO_TEXT = "SPEECH_TO_TEXT",
  IMAGE_CLASSIFICATION = "IMAGE_CLASSIFICATION"
}

// ====================================================================
// STREAMING CONFIGURATION
// ====================================================================

export interface StreamingConfig {
  /** Enable real-time streaming updates */
  enabled: boolean;

  /** Streaming source configuration */
  sources: StreamingSourceConfig[];

  /** Buffer size for streaming data */
  bufferSize: number;

  /** Processing interval (milliseconds) */
  processingInterval: number;
}

export interface StreamingSourceConfig {
  /** Source identifier */
  sourceId: string;

  /** Source type */
  sourceType: StreamingSourceType;

  /** Connection configuration */
  connection: Record<string, any>;

  /** Data transformation pipeline */
  transformations: PropertyTransformation[];
}

export enum StreamingSourceType {
  KAFKA = "KAFKA",
  WEBSOCKET = "WEBSOCKET",
  HTTP_STREAM = "HTTP_STREAM",
  FILE_WATCHER = "FILE_WATCHER",
  DATABASE_CHANGE_STREAM = "DATABASE_CHANGE_STREAM"
}

// ====================================================================
// BUILDER PATTERN (GDS-style but enhanced)
// ====================================================================

export class MultimediaProjectionConfigBuilder {
  private _config: Partial<MultimediaProjectionConfig> = {
    readConcurrency: 4,
    logProgress: true,
    nodeProjections: { includeAll: false, labels: new Set() },
    relationshipProjections: {
      includeAll: false,
      types: new Set(),
      orientation: RelationshipOrientation.NATURAL,
      aggregation: RelationshipAggregation.NONE
    },
    nodeProperties: { mappings: [], defaultHandling: PropertyDefaultHandling.INCLUDE_COMPATIBLE },
    relationshipProperties: { mappings: [], defaultHandling: PropertyDefaultHandling.INCLUDE_COMPATIBLE }
  };

  static create(): MultimediaProjectionConfigBuilder {
    return new MultimediaProjectionConfigBuilder();
  }

  graphName(name: string): MultimediaProjectionConfigBuilder {
    this._config.graphName = name;
    return this;
  }

  username(username: string): MultimediaProjectionConfigBuilder {
    this._config.username = username;
    return this;
  }

  // ✅ SIMPLIFIED NODE CONFIGURATION
  includeAllNodes(): MultimediaProjectionConfigBuilder {
    this._config.nodeProjections!.includeAll = true;
    return this;
  }

  includeNodeLabels(...labels: string[]): MultimediaProjectionConfigBuilder {
    labels.forEach(label =>
      this._config.nodeProjections!.labels.add(NodeLabel.of(label))
    );
    return this;
  }

  // ✅ SIMPLIFIED RELATIONSHIP CONFIGURATION
  includeAllRelationships(): MultimediaProjectionConfigBuilder {
    this._config.relationshipProjections!.includeAll = true;
    return this;
  }

  includeRelationshipTypes(...types: string[]): MultimediaProjectionConfigBuilder {
    types.forEach(type =>
      this._config.relationshipProjections!.types.add(RelationshipType.of(type))
    );
    return this;
  }

  // ✅ MULTIMEDIA ENHANCEMENTS
  enableMultimediaProcessing(): MultimediaProjectionConfigBuilder {
    this._config.multimediaConfig = {
      imageProcessing: {
        generateThumbnails: true,
        extractFeatures: true,
        objectDetection: false,
        maxSize: { width: 2048, height: 2048 },
        supportedFormats: ['jpg', 'jpeg', 'png', 'webp']
      },
      audioProcessing: {
        speechToText: true,
        extractFeatures: true,
        musicAnalysis: false,
        maxDuration: 600 // 10 minutes
      },
      videoProcessing: {
        extractKeyFrames: true,
        objectDetection: false,
        extractAudio: true,
        maxDuration: 1800 // 30 minutes
      },
      textProcessing: {
        namedEntityRecognition: true,
        generateEmbeddings: true,
        sentimentAnalysis: true,
        topicExtraction: true,
        maxLength: 100000
      }
    };
    return this;
  }

  enableMLProcessing(): MultimediaProjectionConfigBuilder {
    this._config.mlConfig = {
      models: [],
      defaultEmbeddingModel: "sentence-transformers/all-MiniLM-L6-v2",
      useGPU: false,
      batchSize: 32
    };
    return this;
  }

  build(): MultimediaProjectionConfig {
    if (!this._config.graphName || !this._config.username) {
      throw new Error("GraphName and username are required");
    }

    return this._config as MultimediaProjectionConfig;
  }
}

// ====================================================================
// USAGE EXAMPLES
// ====================================================================

// ✅ SIMPLE CONFIGURATION (GDS-like)
const basicConfig = MultimediaProjectionConfigBuilder
  .create()
  .graphName("my-graph")
  .username("developer")
  .includeAllNodes()
  .includeAllRelationships()
  .build();

// ✅ MULTIMEDIA CONFIGURATION (Enhanced)
const multimediaConfig = MultimediaProjectionConfigBuilder
  .create()
  .graphName("multimedia-knowledge-graph")
  .username("ml-engineer")
  .includeNodeLabels("Document", "Image", "Video", "Person", "Topic")
  .includeRelationshipTypes("CONTAINS", "MENTIONS", "SIMILAR_TO")
  .enableMultimediaProcessing()
  .enableMLProcessing()
  .build();

// ✅ ADVANCED CONFIGURATION (Full power)
const advancedConfig = MultimediaProjectionConfigBuilder
  .create()
  .graphName("advanced-multimedia-pipeline")
  .username("data-scientist")
  .includeNodeLabels("Document", "Image", "Video", "Audio", "Person", "Entity")
  .includeRelationshipTypes("MENTIONS", "CONTAINS", "CREATED_BY", "SIMILAR_TO")
  .enableMultimediaProcessing()
  .enableMLProcessing()
  .build();
