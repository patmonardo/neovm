import * as fs from "fs";
import * as path from "path";

/**
 * Creates a complete, realistic CSV GraphStore for testing.
 * This represents a small social network with users, posts, and companies.
 *
 * This is our "ground truth" - a working CSV representation of a graph
 * that all our tests can use without recreating test data every time.
 */
export function createReferenceGraphStore(baseDir: string): void {
  console.log("🏗️ Creating Reference CSV GraphStore...");

  // Ensure base directory exists
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  // Create subdirectories
  const headersDir = path.join(baseDir, "headers");
  const dataDir = path.join(baseDir, "data");
  fs.mkdirSync(headersDir, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });

  // Create all schema and metadata files
  createSchemaFiles(baseDir);
  createNodeFiles(headersDir, dataDir);
  createRelationshipFiles(headersDir, dataDir);
  createGraphPropertyFiles(headersDir, dataDir);
  createMappingFiles(baseDir);
  createMetadataFiles(baseDir);

  console.log("✅ Reference CSV GraphStore created successfully!");
}

function createSchemaFiles(baseDir: string): void {
  console.log("📋 Creating schema files...");

  // NODE SCHEMA - Complete schema for all node types
  const nodeSchemaContent = `label,propertyKey,valueType,defaultValue,state
User,username,STRING,,PERSISTENT
User,email,STRING,,PERSISTENT
User,age,LONG,"DefaultValue(25)",PERSISTENT
User,verified,BOOLEAN,"DefaultValue(false)",PERSISTENT
User,followers,LONG,"DefaultValue(0)",PERSISTENT
User,bio,STRING,,PERSISTENT
Post,id,STRING,,PERSISTENT
Post,title,STRING,,PERSISTENT
Post,content,STRING,,PERSISTENT
Post,timestamp,STRING,,PERSISTENT
Post,likes,LONG,"DefaultValue(0)",PERSISTENT
Post,public,BOOLEAN,"DefaultValue(true)",PERSISTENT
Company,name,STRING,,PERSISTENT
Company,industry,STRING,"DefaultValue(Technology)",PERSISTENT
Company,employees,LONG,"DefaultValue(100)",PERSISTENT
Company,founded,LONG,,PERSISTENT
Company,revenue,DOUBLE,,PERSISTENT
Tag,name,STRING,,PERSISTENT
Tag,category,STRING,,PERSISTENT`;

  fs.writeFileSync(path.join(baseDir, "node-schema.csv"), nodeSchemaContent);

  // RELATIONSHIP SCHEMA - Complete schema for all relationship types
  const relationshipSchemaContent = `startLabel,type,endLabel,propertyKey,valueType,defaultValue,state
User,FOLLOWS,User,since,STRING,,PERSISTENT
User,FOLLOWS,User,notifications,BOOLEAN,"DefaultValue(true)",PERSISTENT
User,POSTED,Post,timestamp,STRING,,PERSISTENT
User,LIKED,Post,timestamp,STRING,,PERSISTENT
User,WORKS_AT,Company,position,STRING,,PERSISTENT
User,WORKS_AT,Company,salary,DOUBLE,,PERSISTENT
User,WORKS_AT,Company,startDate,STRING,,PERSISTENT
Post,TAGGED_WITH,Tag,confidence,DOUBLE,"DefaultValue(1.0)",PERSISTENT
Company,LOCATED_IN,Company,relationship,STRING,,PERSISTENT`;

  fs.writeFileSync(path.join(baseDir, "relationship-schema.csv"), relationshipSchemaContent);

  // GRAPH PROPERTY SCHEMA - Metadata about the graph itself
  const graphPropertySchemaContent = `propertyKey,valueType,defaultValue,state
name,STRING,,PERSISTENT
description,STRING,,PERSISTENT
version,STRING,"DefaultValue(1.0)",PERSISTENT
created,STRING,,PERSISTENT
lastModified,STRING,,PERSISTENT
nodeCount,LONG,"DefaultValue(0)",PERSISTENT
relationshipCount,LONG,"DefaultValue(0)",PERSISTENT`;

  fs.writeFileSync(path.join(baseDir, "graph-property-schema.csv"), graphPropertySchemaContent);

  console.log("✅ Schema files created");
}

function createNodeFiles(headersDir: string, dataDir: string): void {
  console.log("👥 Creating node files...");

  // USER NODES
  const userHeaderContent = `:ID,username:string,email:string,age:long,verified:boolean,followers:long,bio:string,:LABEL`;
  fs.writeFileSync(path.join(headersDir, "nodes_User_header.csv"), userHeaderContent);

  const userDataContent = `user_001,alice_dev,alice@example.com,28,true,1250,Full-stack developer passionate about graph databases,User
user_002,bob_data,bob@company.com,34,true,890,Data scientist working on ML and graph analytics,User
user_003,charlie_design,charlie@design.com,26,false,340,UX designer creating beautiful interfaces,User
user_004,diana_pm,diana@startup.com,31,true,675,Product manager building the future of social networks,User
user_005,eve_researcher,eve@university.edu,29,true,2100,PhD researcher in distributed systems and graph theory,User
user_006,frank_junior,frank@newbie.com,22,false,45,Junior developer learning TypeScript and graph databases,User`;

  fs.writeFileSync(path.join(dataDir, "nodes_User_data.csv"), userDataContent);

  // POST NODES
  const postHeaderContent = `:ID,title:string,content:string,timestamp:string,likes:long,public:boolean,:LABEL`;
  fs.writeFileSync(path.join(headersDir, "nodes_Post_header.csv"), postHeaderContent);

  const postDataContent = `post_001,Introduction to Graph Databases,Graph databases are revolutionary for connected data. They excel at traversing relationships and finding patterns that relational databases struggle with.,2024-01-15T10:30:00Z,42,true,Post
post_002,TypeScript Tips for Graph Processing,Working with graphs in TypeScript requires careful type definitions. Here are my favorite patterns for type-safe graph operations.,2024-01-16T14:20:00Z,38,true,Post
post_003,Building Scalable Data Pipelines,Modern data pipelines need to handle streaming data efficiently. CSV processing is just the beginning of a larger data flow.,2024-01-17T09:15:00Z,56,true,Post
post_004,The Future of Social Networks,Decentralized social networks built on graph infrastructure could revolutionize how we connect and share information.,2024-01-18T16:45:00Z,89,true,Post
post_005,Learning Graph Algorithms,Started implementing PageRank from scratch. The math is beautiful but the implementation details are tricky!,2024-01-19T11:30:00Z,23,true,Post
post_006,My First Open Source Contribution,Just submitted my first PR to a graph database project. Nervous but excited to contribute to the community!,2024-01-20T13:20:00Z,67,true,Post`;

  fs.writeFileSync(path.join(dataDir, "nodes_Post_data.csv"), postDataContent);

  // COMPANY NODES
  const companyHeaderContent = `:ID,name:string,industry:string,employees:long,founded:long,revenue:double,:LABEL`;
  fs.writeFileSync(path.join(headersDir, "nodes_Company_header.csv"), companyHeaderContent);

  const companyDataContent = `company_001,GraphTech Solutions,Technology,1500,2015,125000000.50,Company
company_002,DataFlow Systems,Analytics,800,2018,45000000.25,Company
company_003,Creative Designs Inc,Design,250,2020,8500000.75,Company
company_004,InnovateLab Startup,Technology,45,2022,2100000.00,Company
company_005,University Research Center,Education,320,2010,0.00,Company`;

  fs.writeFileSync(path.join(dataDir, "nodes_Company_data.csv"), companyDataContent);

  // TAG NODES
  const tagHeaderContent = `:ID,name:string,category:string,:LABEL`;
  fs.writeFileSync(path.join(headersDir, "nodes_Tag_header.csv"), tagHeaderContent);

  const tagDataContent = `tag_001,typescript,programming,Tag
tag_002,graphs,data-structures,Tag
tag_003,databases,technology,Tag
tag_004,machine-learning,ai,Tag
tag_005,design,creative,Tag
tag_006,social-networks,platforms,Tag
tag_007,algorithms,computer-science,Tag
tag_008,open-source,community,Tag`;

  fs.writeFileSync(path.join(dataDir, "nodes_Tag_data.csv"), tagDataContent);

  console.log("✅ Node files created");
}

function createRelationshipFiles(headersDir: string, dataDir: string): void {
  console.log("🔗 Creating relationship files...");

  // FOLLOWS RELATIONSHIPS
  const followsHeaderContent = `:START_ID,:END_ID,:TYPE,since:string,notifications:boolean`;
  fs.writeFileSync(path.join(headersDir, "relationships_FOLLOWS_header.csv"), followsHeaderContent);

  const followsDataContent = `user_001,user_002,FOLLOWS,2023-06-15,true
user_001,user_005,FOLLOWS,2023-08-20,true
user_002,user_001,FOLLOWS,2023-06-20,true
user_002,user_003,FOLLOWS,2023-07-10,false
user_002,user_004,FOLLOWS,2023-09-05,true
user_003,user_001,FOLLOWS,2023-07-01,true
user_004,user_002,FOLLOWS,2023-09-10,true
user_004,user_005,FOLLOWS,2023-10-15,true
user_005,user_001,FOLLOWS,2023-08-25,true
user_005,user_002,FOLLOWS,2023-09-01,false
user_006,user_001,FOLLOWS,2024-01-10,true
user_006,user_005,FOLLOWS,2024-01-12,true`;

  fs.writeFileSync(path.join(dataDir, "relationships_FOLLOWS_data.csv"), followsDataContent);

  // POSTED RELATIONSHIPS
  const postedHeaderContent = `:START_ID,:END_ID,:TYPE,timestamp:string`;
  fs.writeFileSync(path.join(headersDir, "relationships_POSTED_header.csv"), postedHeaderContent);

  const postedDataContent = `user_001,post_001,POSTED,2024-01-15T10:30:00Z
user_002,post_002,POSTED,2024-01-16T14:20:00Z
user_002,post_003,POSTED,2024-01-17T09:15:00Z
user_004,post_004,POSTED,2024-01-18T16:45:00Z
user_006,post_005,POSTED,2024-01-19T11:30:00Z
user_006,post_006,POSTED,2024-01-20T13:20:00Z`;

  fs.writeFileSync(path.join(dataDir, "relationships_POSTED_data.csv"), postedDataContent);

  // LIKED RELATIONSHIPS
  const likedHeaderContent = `:START_ID,:END_ID,:TYPE,timestamp:string`;
  fs.writeFileSync(path.join(headersDir, "relationships_LIKED_header.csv"), likedHeaderContent);

  const likedDataContent = `user_002,post_001,LIKED,2024-01-15T11:00:00Z
user_003,post_001,LIKED,2024-01-15T12:30:00Z
user_004,post_001,LIKED,2024-01-15T14:15:00Z
user_005,post_001,LIKED,2024-01-15T16:20:00Z
user_001,post_002,LIKED,2024-01-16T15:00:00Z
user_003,post_002,LIKED,2024-01-16T16:30:00Z
user_001,post_003,LIKED,2024-01-17T10:00:00Z
user_004,post_003,LIKED,2024-01-17T11:45:00Z
user_005,post_003,LIKED,2024-01-17T13:20:00Z
user_001,post_004,LIKED,2024-01-18T17:30:00Z
user_002,post_004,LIKED,2024-01-18T18:00:00Z
user_003,post_004,LIKED,2024-01-18T19:15:00Z
user_005,post_005,LIKED,2024-01-19T12:00:00Z
user_001,post_006,LIKED,2024-01-20T14:00:00Z`;

  fs.writeFileSync(path.join(dataDir, "relationships_LIKED_data.csv"), likedDataContent);

  // WORKS_AT RELATIONSHIPS
  const worksAtHeaderContent = `:START_ID,:END_ID,:TYPE,position:string,salary:double,startDate:string`;
  fs.writeFileSync(path.join(headersDir, "relationships_WORKS_AT_header.csv"), worksAtHeaderContent);

  const worksAtDataContent = `user_001,company_001,WORKS_AT,Senior Software Engineer,125000.00,2022-03-15
user_002,company_002,WORKS_AT,Lead Data Scientist,135000.00,2021-09-01
user_003,company_003,WORKS_AT,Senior UX Designer,95000.00,2023-01-10
user_004,company_004,WORKS_AT,Product Manager,110000.00,2022-11-20
user_005,company_005,WORKS_AT,Research Scientist,89000.00,2020-08-01
user_006,company_001,WORKS_AT,Junior Developer,75000.00,2023-10-15`;

  fs.writeFileSync(path.join(dataDir, "relationships_WORKS_AT_data.csv"), worksAtDataContent);

  // TAGGED_WITH RELATIONSHIPS
  const taggedWithHeaderContent = `:START_ID,:END_ID,:TYPE,confidence:double`;
  fs.writeFileSync(path.join(headersDir, "relationships_TAGGED_WITH_header.csv"), taggedWithHeaderContent);

  const taggedWithDataContent = `post_001,tag_003,TAGGED_WITH,0.95
post_001,tag_002,TAGGED_WITH,0.88
post_002,tag_001,TAGGED_WITH,0.92
post_002,tag_002,TAGGED_WITH,0.85
post_003,tag_003,TAGGED_WITH,0.78
post_004,tag_006,TAGGED_WITH,0.93
post_004,tag_002,TAGGED_WITH,0.67
post_005,tag_007,TAGGED_WITH,0.89
post_005,tag_002,TAGGED_WITH,0.91
post_006,tag_008,TAGGED_WITH,0.96`;

  fs.writeFileSync(path.join(dataDir, "relationships_TAGGED_WITH_data.csv"), taggedWithDataContent);

  console.log("✅ Relationship files created");
}

function createGraphPropertyFiles(headersDir: string, dataDir: string): void {
  console.log("📊 Creating graph property files...");

  const graphPropertyHeaderContent = `name:string,description:string,version:string,created:string,lastModified:string,nodeCount:long,relationshipCount:long`;
  fs.writeFileSync(path.join(headersDir, "graph_property_metadata_header.csv"), graphPropertyHeaderContent);

  const graphPropertyDataContent = `Social Network Demo Graph,A complete social network graph for testing CSV import functionality with realistic data including users posts companies and relationships,1.2.0,2024-01-01T00:00:00Z,2024-01-20T15:30:00Z,21,32`;
  fs.writeFileSync(path.join(dataDir, "graph_property_metadata_data.csv"), graphPropertyDataContent);

  console.log("✅ Graph property files created");
}

function createMappingFiles(baseDir: string): void {
  console.log("🗺️ Creating mapping files...");

  // LABEL MAPPINGS
  const labelMappingContent = `index,label
0,User
1,Post
2,Company
3,Tag`;

  fs.writeFileSync(path.join(baseDir, "label-mappings.csv"), labelMappingContent);

  // TYPE MAPPINGS
  const typeMappingContent = `index,type
0,FOLLOWS
1,POSTED
2,LIKED
3,WORKS_AT
4,TAGGED_WITH`;

  fs.writeFileSync(path.join(baseDir, "type-mappings.csv"), typeMappingContent);

  console.log("✅ Mapping files created");
}

function createMetadataFiles(baseDir: string): void {
  console.log("📝 Creating metadata files...");

  // USER INFO
  const userInfoContent = `userName
test_user_social_network`;

  fs.writeFileSync(path.join(baseDir, "user-info.csv"), userInfoContent);

  // GRAPH INFO
  const graphInfoContent = `graphName
SocialNetworkDemo`;

  fs.writeFileSync(path.join(baseDir, "graph-info.csv"), graphInfoContent);

  // CAPABILITIES (optional)
  const capabilitiesContent = `capability,enabled
STREAMING_IMPORT,true
SCHEMA_VALIDATION,true
ERROR_RECOVERY,true
PROGRESS_TRACKING,true
MEMORY_OPTIMIZATION,true`;

  fs.writeFileSync(path.join(baseDir, "capabilities.csv"), capabilitiesContent);

  console.log("✅ Metadata files created");
}

// Create the reference store when this module is imported
const referenceStoreDir = path.join(__dirname, "..", "testdata", "reference-graphstore");
createReferenceGraphStore(referenceStoreDir);

export { referenceStoreDir };
