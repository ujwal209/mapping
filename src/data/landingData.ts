export const CONNECTOR_CATEGORIES = [
  'All',
  'Lakehouse',
  'Warehouse',
  'RDBMS',
  'CRM & ERP',
  'Document DB',
  'Object Storage',
] as const;

export type ConnectorKey =
  | 'fabric'
  | 'dynamics'
  | 'snowflake'
  | 'databricks'
  | 'postgres'
  | 'sqlserver'
  | 'oracle'
  | 'mongodb'
  | 'bigquery'
  | 'salesforce'
  | 's3'
  | 'azure';

export interface ConnectorItem {
  key: ConnectorKey;
  name: string;
  category: Exclude<(typeof CONNECTOR_CATEGORIES)[number], 'All'>;
  desc: string;
}

export const CONNECTORS: ConnectorItem[] = [
  {
    key: 'fabric',
    name: 'Microsoft Fabric',
    category: 'Lakehouse',
    desc: 'Read and write your Fabric tables and files.',
  },
  {
    key: 'dynamics',
    name: 'Dynamics 365',
    category: 'CRM & ERP',
    desc: 'Pull accounts, contacts, and orders.',
  },
  {
    key: 'snowflake',
    name: 'Snowflake',
    category: 'Warehouse',
    desc: 'Copy tables in and out of your warehouse.',
  },
  {
    key: 'databricks',
    name: 'Databricks',
    category: 'Lakehouse',
    desc: 'Move data to and from your lakehouse.',
  },
  {
    key: 'postgres',
    name: 'PostgreSQL',
    category: 'RDBMS',
    desc: 'Copy rows, keep types intact.',
  },
  {
    key: 'sqlserver',
    name: 'SQL Server',
    category: 'RDBMS',
    desc: 'Read and write your SQL Server databases.',
  },
  {
    key: 'oracle',
    name: 'Oracle Database',
    category: 'RDBMS',
    desc: 'Pull data out of legacy Oracle systems.',
  },
  {
    key: 'mongodb',
    name: 'MongoDB Atlas',
    category: 'Document DB',
    desc: 'Read and write your documents.',
  },
  {
    key: 'bigquery',
    name: 'BigQuery',
    category: 'Warehouse',
    desc: 'Copy tables to and from BigQuery.',
  },
  {
    key: 'salesforce',
    name: 'Salesforce',
    category: 'CRM & ERP',
    desc: 'Sync your Salesforce records.',
  },
  {
    key: 's3',
    name: 'Amazon S3',
    category: 'Object Storage',
    desc: 'Read and write files from any bucket.',
  },
  {
    key: 'azure',
    name: 'Azure Data Lake',
    category: 'Object Storage',
    desc: 'Read and write files from your storage account.',
  },
];

export const FEATURES = [
  {
    title: 'Connect in minutes',
    desc: 'Add any database, warehouse, or file store. We check the connection and read the schema for you.',
  },
  {
    title: 'One shared vocabulary',
    desc: 'Define what "customer" or "order" means once, and reuse it across every system.',
  },
  {
    title: 'Column matching that helps',
    desc: 'We suggest which source columns line up with which target columns. You review and approve.',
  },
  {
    title: 'Locked, versioned mappings',
    desc: 'Approve a mapping once and it never changes. Want a change? Make a new version.',
  },
  {
    title: 'Catch problems before they hit',
    desc: 'If the source schema changes unexpectedly, we stop the run before anything is written.',
  },
  {
    title: 'See where every row came from',
    desc: 'Click any target row and see the exact source record that produced it.',
  },
];

export const STEPS = [
  {
    num: '01',
    phase: 'Discover',
    title: 'Connect',
    desc: 'Add your source and destination. We test the connection for you.',
  },
  {
    num: '02',
    phase: 'Align',
    title: 'Match columns',
    desc: 'Pick which source column goes to which target column. We suggest matches, you decide.',
  },
  {
    num: '03',
    phase: 'Lock',
    title: 'Approve',
    desc: "Lock the mapping once you're happy. It can't be changed by accident.",
  },
  {
    num: '04',
    phase: 'Verify',
    title: 'Copy & check',
    desc: 'We copy the data, compare both sides, and hand you a signed report.',
  },
];

export const FAQS = [
  {
    q: 'What happens if the source database changes?',
    a: 'We check the source before every run. If something important changed (a column was removed or the type changed), we stop the run before touching your target. You decide whether to fix the mapping or approve a one-off override.',
  },
  {
    q: 'Can I undo a migration?',
    a: 'Yes. Rollback creates a separate, audited compensation record — the original run is preserved forever.',
  },
  {
    q: 'How do I know the data actually arrived?',
    a: 'Every run compares row counts, column types, and checksums across both sides and hands you a signed report.',
  },
  {
    q: 'Can I see where a specific row came from?',
    a: 'Yes. Click any target row to see the exact source record, mapping version, and run timestamp that produced it.',
  },
];