// One-off: investigate user activity TODAY in PROD, excluding owner IDs.
// Run with: APP_ENV=PROD node scripts/investigate-today.js

require('dotenv').config();
process.env.APP_ENV = process.env.APP_ENV || 'PROD';

const { BigQuery } = require('@google-cloud/bigquery');
const path = require('path');
const { getAppStreamIds } = require('../src/analytics-streams');
const { OWNER_USER_IDS } = require('../src/owners');

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
  const client = makeClient();
  const streamIds = getAppStreamIds();
  const todaySuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const intradayTable = `events_intraday_${todaySuffix}`;

  // Confirm intraday table exists
  const [tables] = await client.query({
    query: `SELECT table_name FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.INFORMATION_SCHEMA.TABLES\`
            WHERE table_name = @tableName LIMIT 1`,
    params: { tableName: intradayTable },
  });
  if (!tables.length) {
    console.log(`No intraday table for ${todaySuffix} yet — falling back to most recent events_ table.`);
  }

  const fromClause = tables.length
    ? `\`${GCP_PROJECT_ID}.${DATASET_ID}.${intradayTable}\``
    : `\`${GCP_PROJECT_ID}.${DATASET_ID}.events_*\``;

  const dateFilter = tables.length
    ? ''
    : `AND _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))`;

  const baseFilter = `
    stream_id IN UNNEST(@streamIds)
    AND (user_id IS NULL OR user_id NOT IN UNNEST(@ownerIds))
    ${dateFilter}
  `;

  const params = { streamIds, ownerIds: OWNER_USER_IDS };

  console.log('\n=== Source ===');
  console.log('Table:', fromClause);
  console.log('App streams:', streamIds.join(', '));
  console.log('Excluded owner IDs:', OWNER_USER_IDS.join(', '));

  // 1) High-level user counts
  const summarySql = `
    SELECT
      COUNT(DISTINCT user_pseudo_id) AS unique_devices,
      COUNT(DISTINCT user_id)        AS unique_signed_in_users,
      COUNT(*)                       AS total_events,
      MIN(TIMESTAMP_MICROS(event_timestamp)) AS first_event_utc,
      MAX(TIMESTAMP_MICROS(event_timestamp)) AS last_event_utc
    FROM ${fromClause}
    WHERE ${baseFilter}
  `;
  const [summary] = await client.query({ query: summarySql, params });
  console.log('\n=== Today summary (PROD app streams, owners excluded) ===');
  console.table(summary);

  // 2) Top events
  const eventsSql = `
    SELECT
      event_name,
      COUNT(*) AS event_count,
      COUNT(DISTINCT user_pseudo_id) AS unique_devices,
      COUNT(DISTINCT user_id)        AS signed_in_users
    FROM ${fromClause}
    WHERE ${baseFilter}
    GROUP BY event_name
    ORDER BY event_count DESC
    LIMIT 30
  `;
  const [events] = await client.query({ query: eventsSql, params });
  console.log('\n=== Top events today ===');
  console.table(events);

  // 3) Top screens viewed
  const screensSql = `
    SELECT
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key='firebase_screen') AS screen,
      COUNT(*) AS views,
      COUNT(DISTINCT user_pseudo_id) AS unique_devices
    FROM ${fromClause}
    WHERE ${baseFilter}
      AND event_name = 'screen_view'
    GROUP BY screen
    ORDER BY views DESC
    LIMIT 20
  `;
  const [screens] = await client.query({ query: screensSql, params });
  console.log('\n=== Top screens today ===');
  console.table(screens);

  // 4) Action_type breakdown (in-app interactions)
  const actionsSql = `
    SELECT
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key='action_type') AS action_type,
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key='firebase_screen') AS screen,
      COUNT(*) AS count,
      COUNT(DISTINCT user_pseudo_id) AS unique_devices
    FROM ${fromClause}
    WHERE ${baseFilter}
      AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key='action_type') IS NOT NULL
    GROUP BY action_type, screen
    ORDER BY count DESC
    LIMIT 30
  `;
  const [actions] = await client.query({ query: actionsSql, params });
  console.log('\n=== Top in-app actions today ===');
  console.table(actions);

  // 5) Per-user breakdown — what each signed-in user did
  const perUserSql = `
    SELECT
      user_id,
      COUNT(*) AS events,
      COUNT(DISTINCT (SELECT value.string_value FROM UNNEST(event_params) WHERE key='firebase_screen')) AS screens_visited,
      ARRAY_AGG(DISTINCT event_name IGNORE NULLS LIMIT 20) AS event_types,
      MIN(TIMESTAMP_MICROS(event_timestamp)) AS first_seen_utc,
      MAX(TIMESTAMP_MICROS(event_timestamp)) AS last_seen_utc,
      ANY_VALUE(device.operating_system) AS os,
      ANY_VALUE(geo.country) AS country
    FROM ${fromClause}
    WHERE ${baseFilter}
      AND user_id IS NOT NULL
    GROUP BY user_id
    ORDER BY events DESC
    LIMIT 50
  `;
  const [perUser] = await client.query({ query: perUserSql, params });
  console.log('\n=== Per signed-in user activity ===');
  perUser.forEach((u) => {
    console.log(
      `\nuser_id=${u.user_id} | events=${u.events} | screens=${u.screens_visited} | os=${u.os} | country=${u.country}`
    );
    console.log(
      `  first=${u.first_seen_utc?.value || u.first_seen_utc}  last=${u.last_seen_utc?.value || u.last_seen_utc}`
    );
    console.log(`  event_types: ${(u.event_types || []).join(', ')}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
