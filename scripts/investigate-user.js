// One-off: pull today's GA events for a specific user_id.
// Run with: APP_ENV=PROD node scripts/investigate-user.js <user_id>

require('dotenv').config();
process.env.APP_ENV = process.env.APP_ENV || 'PROD';

const { BigQuery } = require('@google-cloud/bigquery');
const path = require('path');
const { getAppStreamIds } = require('../src/analytics-streams');

const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID || '474857535';
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || 'xracing-912fc';
const DATASET_ID = `analytics_${GA4_PROPERTY_ID}`;

function makeClient() {
  if (process.env.GA4_CREDENTIALS_PATH) {
    return new BigQuery({
      projectId: GCP_PROJECT_ID,
      keyFilename: path.resolve(process.env.GA4_CREDENTIALS_PATH),
    });
  }
  throw new Error('GA4_CREDENTIALS_PATH not set');
}

async function main() {
  const userId = process.argv[2];
  if (!userId) throw new Error('Usage: node scripts/investigate-user.js <user_id>');

  const client = makeClient();
  const streamIds = getAppStreamIds();
  const todaySuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const intradayTable = `events_intraday_${todaySuffix}`;

  const [tables] = await client.query({
    query: `SELECT table_name FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.INFORMATION_SCHEMA.TABLES\`
            WHERE table_name = @tableName LIMIT 1`,
    params: { tableName: intradayTable },
  });

  const fromClause = tables.length
    ? `\`${GCP_PROJECT_ID}.${DATASET_ID}.${intradayTable}\``
    : `\`${GCP_PROJECT_ID}.${DATASET_ID}.events_*\``;

  const dateFilter = tables.length
    ? ''
    : `AND _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', CURRENT_DATE())`;

  const baseFilter = `
    stream_id IN UNNEST(@streamIds)
    AND user_id = @userId
    ${dateFilter}
  `;

  const params = { streamIds, userId };

  console.log('\n=== Source ===');
  console.log('Table:', fromClause);
  console.log('User:', userId);

  // 1) Summary
  const summarySql = `
    SELECT
      COUNT(*) AS total_events,
      COUNT(DISTINCT event_name) AS distinct_event_types,
      MIN(TIMESTAMP_MICROS(event_timestamp)) AS first_event_utc,
      MAX(TIMESTAMP_MICROS(event_timestamp)) AS last_event_utc,
      ANY_VALUE(device.operating_system) AS os,
      ANY_VALUE(device.mobile_model_name) AS device_model,
      ANY_VALUE(app_info.version) AS app_version,
      ANY_VALUE(geo.country) AS country
    FROM ${fromClause}
    WHERE ${baseFilter}
  `;
  const [summary] = await client.query({ query: summarySql, params });
  console.log('\n=== Summary ===');
  console.table(summary);

  // 2) Event counts
  const eventsSql = `
    SELECT event_name, COUNT(*) AS count
    FROM ${fromClause}
    WHERE ${baseFilter}
    GROUP BY event_name
    ORDER BY count DESC
  `;
  const [events] = await client.query({ query: eventsSql, params });
  console.log('\n=== Event breakdown ===');
  console.table(events);

  // 3) Screen views
  const screensSql = `
    SELECT
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key='firebase_screen') AS screen,
      COUNT(*) AS views
    FROM ${fromClause}
    WHERE ${baseFilter}
      AND event_name = 'screen_view'
    GROUP BY screen
    ORDER BY views DESC
  `;
  const [screens] = await client.query({ query: screensSql, params });
  console.log('\n=== Screens viewed ===');
  console.table(screens);

  // 4) Action types
  const actionsSql = `
    SELECT
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key='action_type') AS action_type,
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key='firebase_screen') AS screen,
      COUNT(*) AS count
    FROM ${fromClause}
    WHERE ${baseFilter}
      AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key='action_type') IS NOT NULL
    GROUP BY action_type, screen
    ORDER BY count DESC
  `;
  const [actions] = await client.query({ query: actionsSql, params });
  console.log('\n=== Action types ===');
  console.table(actions);

  // 5) Full timeline
  const timelineSql = `
    SELECT
      TIMESTAMP_MICROS(event_timestamp) AS ts,
      event_name,
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key='firebase_screen') AS screen,
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key='action_type') AS action_type,
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key='item_type') AS item_type,
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key='item_id') AS item_id,
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key='error_type') AS error_type,
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key='failure_stage') AS failure_stage
    FROM ${fromClause}
    WHERE ${baseFilter}
    ORDER BY event_timestamp ASC
  `;
  const [timeline] = await client.query({ query: timelineSql, params });
  console.log(`\n=== Timeline (${timeline.length} events) ===`);
  timeline.forEach((e) => {
    const ts = e.ts?.value || e.ts;
    const extras = [
      e.screen && `screen=${e.screen}`,
      e.action_type && `action=${e.action_type}`,
      e.item_type && `item_type=${e.item_type}`,
      e.item_id && `item_id=${e.item_id}`,
      e.error_type && `error=${e.error_type}`,
      e.failure_stage && `stage=${e.failure_stage}`,
    ]
      .filter(Boolean)
      .join('  ');
    console.log(`${ts}  ${e.event_name.padEnd(32)}  ${extras}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
