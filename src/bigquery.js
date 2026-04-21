// BigQuery queries for GA4 event data
// This gives us access to ALL event parameters without needing to register custom dimensions

const { BigQuery } = require('@google-cloud/bigquery');
const path = require('path');
const {
  getAppStreamEnv,
  getAppStreamIds,
  getWebStreamIds,
  getGrowthStreamIds
} = require('./analytics-streams');

let bigqueryClient = null;

// GA4 Property ID determines the dataset name
const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID || '474857535';
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || 'xracing-912fc';
const DATASET_ID = `analytics_${GA4_PROPERTY_ID}`;
const APP_STREAM_IDS = getAppStreamIds();
const WEB_STREAM_IDS = getWebStreamIds();
const GROWTH_STREAM_IDS = getGrowthStreamIds();

// Check if a table exists in BigQuery
async function tableExists(client, tableName) {
  try {
    const query = `
      SELECT 1 FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.INFORMATION_SCHEMA.TABLES\`
      WHERE table_name = @tableName
      LIMIT 1
    `;
    const [rows] = await client.query({ query, params: { tableName } });
    return rows.length > 0;
  } catch (err) {
    return false;
  }
}

function getClient() {
  if (!bigqueryClient) {
    console.log('BigQuery app stream filter:', getAppStreamEnv(), APP_STREAM_IDS.join(', '));
    console.log('BigQuery web stream filter:', WEB_STREAM_IDS.join(', '));
    console.log('BigQuery growth stream filter:', GROWTH_STREAM_IDS.join(', '));

    // Use same credentials as GA4
    if (process.env.GA4_CREDENTIALS_BASE64) {
      const decoded = Buffer.from(process.env.GA4_CREDENTIALS_BASE64, 'base64').toString('utf8');
      const credentials = JSON.parse(decoded);
      bigqueryClient = new BigQuery({
        projectId: GCP_PROJECT_ID,
        credentials
      });
    } else if (process.env.GA4_CREDENTIALS_JSON) {
      const credentials = JSON.parse(process.env.GA4_CREDENTIALS_JSON);
      bigqueryClient = new BigQuery({
        projectId: GCP_PROJECT_ID,
        credentials
      });
    } else if (process.env.GA4_CREDENTIALS_PATH) {
      const credentialsPath = path.resolve(process.env.GA4_CREDENTIALS_PATH);
      bigqueryClient = new BigQuery({
        projectId: GCP_PROJECT_ID,
        keyFilename: credentialsPath
      });
    } else {
      throw new Error('BigQuery credentials not configured');
    }
  }
  return bigqueryClient;
}

// Helper to get event parameter value from the event_params array
const getEventParam = (paramName, type = 'string') => {
  const valueField = type === 'int' ? 'value.int_value'
    : type === 'double' ? 'value.double_value'
    : 'value.string_value';
  return `(SELECT ${valueField} FROM UNNEST(event_params) WHERE key = '${paramName}')`;
};

function appStreamFilter(prefix = 'AND') {
  return APP_STREAM_IDS.length ? `${prefix} stream_id IN UNNEST(@streamIds)` : '';
}

function withAppStreamParams(params = {}) {
  return APP_STREAM_IDS.length ? { ...params, streamIds: APP_STREAM_IDS } : params;
}

function growthStreamFilter(prefix = 'AND') {
  return GROWTH_STREAM_IDS.length ? `${prefix} stream_id IN UNNEST(@growthStreamIds)` : '';
}

function withGrowthStreamParams(params = {}) {
  return GROWTH_STREAM_IDS.length ? { ...params, growthStreamIds: GROWTH_STREAM_IDS } : params;
}

async function buildAppTableQuery(client, days) {
  const todaySuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const intradayTable = `events_intraday_${todaySuffix}`;
  const hasIntraday = await tableExists(client, intradayTable);
  const streamCondition = appStreamFilter();
  const streamConditionOnly = appStreamFilter('WHERE');

  if (days === 0) {
    if (!hasIntraday) {
      return null;
    }
    return `
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.${intradayTable}\`
      ${streamConditionOnly}
    `;
  }

  const baseQuery = `
    SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_*\`
    WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
      ${streamCondition}
  `;

  if (hasIntraday) {
    return `
      ${baseQuery}
      UNION ALL
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.${intradayTable}\`
      ${streamConditionOnly}
    `;
  }

  return baseQuery;
}

async function buildGrowthTableQuery(client, days) {
  const todaySuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const intradayTable = `events_intraday_${todaySuffix}`;
  const hasIntraday = await tableExists(client, intradayTable);
  const streamCondition = growthStreamFilter();
  const streamConditionOnly = growthStreamFilter('WHERE');

  if (days === 0) {
    if (!hasIntraday) {
      return null;
    }
    return `
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.${intradayTable}\`
      ${streamConditionOnly}
    `;
  }

  const baseQuery = `
    SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_*\`
    WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
      ${streamCondition}
  `;

  if (hasIntraday) {
    return `
      ${baseQuery}
      UNION ALL
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.${intradayTable}\`
      ${streamConditionOnly}
    `;
  }

  return baseQuery;
}

// Owner user IDs to exclude from analytics
const OWNER_USER_IDS = [
  'hZMCPNFAZddzS7bwqgzb91VOysx2',
  'ZT87DvPwt3NnWtIlJGmwXRINIvX2',
  'Kw1RU3ufAAcYlmGgMyWACbn6t6U2',
];

// Get screen actions with full action_type detail (last 30 days)
async function getScreenActions(days = 30, userId = null, excludeOwners = false) {
  const client = getClient();

  const userFilter = userId ? `AND user_id = @userId` : '';
  const ownerFilter = excludeOwners ? `AND user_id NOT IN UNNEST(@excludedUsers)` : '';
  const tableQuery = await buildAppTableQuery(client, days);
  if (!tableQuery) return [];

  const query = `
    WITH all_events AS (
      ${tableQuery}
    )
    SELECT
      ${getEventParam('firebase_screen')} as screen_name,
      event_name,
      ${getEventParam('action_type')} as action_type,
      COUNT(*) as event_count,
      COUNT(DISTINCT user_pseudo_id) as unique_users
    FROM all_events
    WHERE ${getEventParam('firebase_screen')} IS NOT NULL
      ${userFilter}
      ${ownerFilter}
    GROUP BY screen_name, event_name, action_type
    ORDER BY event_count DESC
    LIMIT 2000
  `;

  let params = {};
  if (userId) params.userId = userId;
  if (excludeOwners) params.excludedUsers = OWNER_USER_IDS;
  params = withAppStreamParams(params);
  const [rows] = await client.query({ query, params });

  // Group by screen
  const screenData = {};
  rows.forEach(row => {
    const screenName = row.screen_name || '(not set)';
    const eventName = row.event_name;
    const actionType = row.action_type || null;
    const eventCount = parseInt(row.event_count) || 0;
    const users = parseInt(row.unique_users) || 0;

    // Use action_type if available, otherwise eventName
    const actionLabel = actionType && actionType !== '(not set)'
      ? actionType
      : eventName;

    if (!screenData[screenName]) {
      screenData[screenName] = {
        screenName,
        totalEvents: 0,
        totalUsers: 0,
        screenViews: 0,
        screenViewUsers: 0,
        actions: {}
      };
    }
    screenData[screenName].totalEvents += eventCount;
    screenData[screenName].totalUsers = Math.max(screenData[screenName].totalUsers, users);

    // Separate screen_view and system events from actions
    if (eventName === 'screen_view') {
      screenData[screenName].screenViews += eventCount;
      screenData[screenName].screenViewUsers = Math.max(screenData[screenName].screenViewUsers, users);
      return; // Don't add to actions
    }

    // Skip system events that aren't real user actions
    if (['user_engagement', 'session_start', 'first_visit', 'app_remove', 'app_background', 'app_foreground'].includes(eventName)) {
      return;
    }

    // Aggregate same actions
    if (!screenData[screenName].actions[actionLabel]) {
      screenData[screenName].actions[actionLabel] = {
        actionLabel,
        eventName,
        actionType,
        count: 0,
        users: 0
      };
    }
    screenData[screenName].actions[actionLabel].count += eventCount;
    screenData[screenName].actions[actionLabel].users = Math.max(
      screenData[screenName].actions[actionLabel].users,
      users
    );
  });

  // Convert actions object to array and sort
  Object.values(screenData).forEach(screen => {
    screen.actions = Object.values(screen.actions).sort((a, b) => b.count - a.count);
    screen.topActions = screen.actions.slice(0, 8);
  });

  return Object.values(screenData)
    .sort((a, b) => b.totalEvents - a.totalEvents)
    .slice(0, 30);
}

// Get detailed actions for a specific screen
async function getScreenActionDetails(screenName, days = 30, userId = null, excludeOwners = false) {
  const client = getClient();

  const userFilter = userId ? `AND user_id = @userId` : '';
  const ownerFilter = excludeOwners ? `AND user_id NOT IN UNNEST(@excludedUsers)` : '';
  const tableQuery = await buildAppTableQuery(client, days);
  if (!tableQuery) {
    return {
      screenName,
      totalEvents: 0,
      totalUsers: 0,
      screenViews: 0,
      screenViewUsers: 0,
      actions: []
    };
  }

  const query = `
    WITH all_events AS (
      ${tableQuery}
    )
    SELECT
      event_name,
      ${getEventParam('action_type')} as action_type,
      COUNT(*) as event_count,
      COUNT(DISTINCT user_pseudo_id) as unique_users
    FROM all_events
    WHERE ${getEventParam('firebase_screen')} = @screenName
      ${userFilter}
      ${ownerFilter}
    GROUP BY event_name, action_type
    ORDER BY event_count DESC
    LIMIT 100
  `;

  let params = { screenName };
  if (userId) params.userId = userId;
  if (excludeOwners) params.excludedUsers = OWNER_USER_IDS;
  params = withAppStreamParams(params);
  const [rows] = await client.query({ query, params });

  // Aggregate actions, separate screen_view
  const actionsMap = {};
  let screenViews = 0;
  let screenViewUsers = 0;

  rows.forEach(row => {
    const eventName = row.event_name;
    const actionType = row.action_type || null;
    const count = parseInt(row.event_count) || 0;
    const users = parseInt(row.unique_users) || 0;

    // Separate screen_view
    if (eventName === 'screen_view') {
      screenViews += count;
      screenViewUsers = Math.max(screenViewUsers, users);
      return;
    }

    // Skip system events that aren't real user actions
    if (['user_engagement', 'session_start', 'first_visit', 'app_remove', 'app_background', 'app_foreground'].includes(eventName)) {
      return;
    }

    const actionLabel = actionType && actionType !== '(not set)'
      ? actionType
      : eventName;

    if (!actionsMap[actionLabel]) {
      actionsMap[actionLabel] = {
        actionLabel,
        eventName,
        actionType,
        count: 0,
        users: 0
      };
    }
    actionsMap[actionLabel].count += count;
    actionsMap[actionLabel].users = Math.max(actionsMap[actionLabel].users, users);
  });

  const actions = Object.values(actionsMap).sort((a, b) => b.count - a.count);
  const totalEvents = actions.reduce((sum, a) => sum + a.count, 0) + screenViews;
  const totalUsers = Math.max(...actions.map(a => a.users), 0);

  return {
    screenName,
    totalEvents,
    totalUsers,
    screenViews,
    screenViewUsers,
    actions
  };
}

// Get user events with EXACT timestamps (for crash debugging)
async function getUserEvents(userId, startDate, endDate) {
  const client = getClient();

  // Convert dates to BigQuery format (YYYYMMDD)
  const startSuffix = startDate.replace(/-/g, '');
  const endSuffix = endDate.replace(/-/g, '');

  // Check if the date range includes today — if so, include intraday table
  const todaySuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const includesToday = endSuffix >= todaySuffix;

  let intradayUnion = '';
  if (includesToday) {
    const intradayTable = `events_intraday_${todaySuffix}`;
    const hasIntraday = await tableExists(client, intradayTable);
    if (hasIntraday) {
      intradayUnion = `
        UNION ALL
        SELECT event_timestamp, event_name, event_params, user_id
        FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.${intradayTable}\`
        WHERE user_id = @userId
          ${appStreamFilter()}
      `;
    }
  }

  // Fetch all event_params as a JSON object for maximum flexibility
  const query = `
    WITH all_events AS (
      SELECT event_timestamp, event_name, event_params, user_id
      FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_*\`
      WHERE _TABLE_SUFFIX BETWEEN @startSuffix AND @endSuffix
        AND user_id = @userId
        ${appStreamFilter()}
      ${intradayUnion}
    )
    SELECT
      TIMESTAMP_MICROS(event_timestamp) as event_time,
      event_name,
      (
        SELECT ARRAY_AGG(STRUCT(key, value.string_value, value.int_value, value.double_value))
        FROM UNNEST(event_params)
      ) as params
    FROM all_events
    ORDER BY event_timestamp DESC
    LIMIT 1000
  `;

  const [rows] = await client.query({
    query,
    params: withAppStreamParams({ userId, startSuffix, endSuffix })
  });

  // Helper to convert params array to object
  const paramsToObject = (params) => {
    if (!params) return {};
    const obj = {};
    params.forEach(p => {
      // Use string_value, or convert int/double to string if present
      const value = p.string_value ||
        (p.int_value !== null ? String(p.int_value) : null) ||
        (p.double_value !== null ? String(p.double_value) : null);
      if (value !== null) {
        obj[p.key] = value;
      }
    });
    return obj;
  };

  // Group events by date, but keep exact timestamps
  const eventsByDate = {};
  rows.forEach(row => {
    const eventTime = new Date(row.event_time.value);
    const dateKey = eventTime.toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = eventTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const eventName = row.event_name;
    const params = paramsToObject(row.params);
    const actionType = params.action_type || null;
    const actionLabel = actionType || eventName;

    if (!eventsByDate[dateKey]) {
      eventsByDate[dateKey] = { date: dateKey, events: [], totalEvents: 0 };
    }

    eventsByDate[dateKey].events.push({
      time: timeStr,
      timestamp: eventTime.toISOString(),
      eventName,
      actionType,
      actionLabel,
      screenName: params.screen_name || params.firebase_screen || '(not set)',
      // Include ALL params for maximum flexibility
      params
    });
    eventsByDate[dateKey].totalEvents += 1;
  });

  return Object.values(eventsByDate).sort((a, b) => b.date.localeCompare(a.date));
}

// ============================================
// WEB ANALYTICS FUNCTIONS
// ============================================

// Helper to build table query for web analytics, checking if intraday table exists
async function buildWebTableQuery(client, days, streamFilter = true) {
  const todaySuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const intradayTable = `events_intraday_${todaySuffix}`;
  const streamIn = WEB_STREAM_IDS.map(id => `'${id}'`).join(', ');
  const streamCondition = streamFilter ? `AND stream_id IN (${streamIn})` : '';
  const streamConditionOnly = streamFilter ? `WHERE stream_id IN (${streamIn})` : '';

  // Check if intraday table exists
  const hasIntraday = await tableExists(client, intradayTable);

  if (days === 0) {
    // Today only - need intraday table
    if (!hasIntraday) {
      // No intraday table exists - return empty query that will return no results
      return `SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_*\` WHERE FALSE`;
    }
    return `
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.${intradayTable}\`
      ${streamConditionOnly}
    `;
  } else {
    // Historical data - optionally include intraday if it exists
    const baseQuery = `
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_*\`
      WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
        ${streamCondition}
    `;

    if (hasIntraday) {
      return `
        ${baseQuery}
        UNION ALL
        SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.${intradayTable}\`
        ${streamConditionOnly}
      `;
    }
    return baseQuery;
  }
}

// Get web analytics overview (page views, sessions, users)
async function getWebOverview(days = 30) {
  const client = getClient();
  const tableQuery = await buildWebTableQuery(client, days);

  const query = `
    WITH all_events AS (
      ${tableQuery}
    )
    SELECT
      COUNT(*) as total_events,
      COUNT(DISTINCT user_pseudo_id) as unique_visitors,
      COUNTIF(event_name = 'page_view') as page_views,
      COUNTIF(event_name = 'session_start') as sessions,
      COUNTIF(event_name = 'first_visit') as new_visitors,
      COUNT(DISTINCT ${getEventParam('ga_session_id', 'int')}) as unique_sessions
    FROM all_events
  `;

  const [rows] = await client.query({ query });
  return rows[0] || {};
}

// Get web page views breakdown
async function getWebPages(days = 30) {
  const client = getClient();
  const tableQuery = await buildWebTableQuery(client, days);

  const query = `
    WITH all_events AS (
      ${tableQuery}
    )
    SELECT
      ${getEventParam('screen_name')} as screen_name,
      COUNT(*) as views,
      COUNT(DISTINCT user_pseudo_id) as unique_visitors,
      AVG(${getEventParam('engagement_time_msec', 'int')}) as avg_engagement_ms
    FROM all_events
    WHERE event_name = 'screen_view'
    GROUP BY screen_name
    ORDER BY views DESC
    LIMIT 50
  `;

  const [rows] = await client.query({ query });

  return rows.map(row => ({
    screenName: row.screen_name || '(not set)',
    views: parseInt(row.views) || 0,
    uniqueVisitors: parseInt(row.unique_visitors) || 0,
    avgEngagementSec: row.avg_engagement_ms ? Math.round(row.avg_engagement_ms / 1000) : 0
  }));
}

// Get web traffic sources
async function getWebTrafficSources(days = 30) {
  const client = getClient();
  const tableQuery = await buildWebTableQuery(client, days);

  const query = `
    WITH all_events AS (
      ${tableQuery}
    ),
    session_sources AS (
      SELECT
        user_pseudo_id,
        ${getEventParam('ga_session_id', 'int')} as session_id,
        COALESCE(traffic_source.source, '(direct)') as source,
        COALESCE(traffic_source.medium, '(none)') as medium,
        COALESCE(traffic_source.name, '(not set)') as campaign
      FROM all_events
      WHERE event_name = 'session_start'
    )
    SELECT
      source,
      medium,
      COUNT(DISTINCT session_id) as sessions,
      COUNT(DISTINCT user_pseudo_id) as users
    FROM session_sources
    GROUP BY source, medium
    ORDER BY sessions DESC
    LIMIT 20
  `;

  const [rows] = await client.query({ query });

  return rows.map(row => ({
    source: row.source || '(direct)',
    medium: row.medium || '(none)',
    sessions: parseInt(row.sessions) || 0,
    users: parseInt(row.users) || 0
  }));
}

// Get web user engagement metrics
async function getWebEngagement(days = 30) {
  const client = getClient();
  const tableQuery = await buildWebTableQuery(client, days);

  const query = `
    WITH all_events AS (
      ${tableQuery}
    ),
    user_events AS (
      SELECT
        event_name,
        ${getEventParam('link_url')} as link_url,
        ${getEventParam('outbound')} as outbound,
        COUNT(*) as event_count,
        COUNT(DISTINCT user_pseudo_id) as unique_users
      FROM all_events
      WHERE event_name IN ('click', 'scroll', 'file_download', 'video_start', 'video_progress', 'video_complete', 'form_start', 'form_submit')
      GROUP BY event_name, link_url, outbound
    )
    SELECT * FROM user_events
    ORDER BY event_count DESC
    LIMIT 50
  `;

  const [rows] = await client.query({ query });

  // Group by event type
  const engagement = {
    clicks: [],
    scrolls: 0,
    downloads: [],
    videos: [],
    forms: []
  };

  rows.forEach(row => {
    const count = parseInt(row.event_count) || 0;
    const users = parseInt(row.unique_users) || 0;

    switch (row.event_name) {
      case 'click':
        if (row.link_url) {
          engagement.clicks.push({
            url: row.link_url,
            outbound: row.outbound === 'true',
            count,
            users
          });
        }
        break;
      case 'scroll':
        engagement.scrolls += count;
        break;
      case 'file_download':
        engagement.downloads.push({ count, users });
        break;
      case 'video_start':
      case 'video_progress':
      case 'video_complete':
        engagement.videos.push({ event: row.event_name, count, users });
        break;
      case 'form_start':
      case 'form_submit':
        engagement.forms.push({ event: row.event_name, count, users });
        break;
    }
  });

  return engagement;
}

// Get web events over time (for charts)
async function getWebEventsOverTime(days = 30) {
  const client = getClient();
  const tableQuery = await buildWebTableQuery(client, days);

  const query = `
    WITH all_events AS (
      ${tableQuery}
    )
    SELECT
      FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%Y%m%d', event_date)) as date,
      COUNTIF(event_name = 'page_view') as page_views,
      COUNTIF(event_name = 'session_start') as sessions,
      COUNT(DISTINCT user_pseudo_id) as visitors
    FROM all_events
    GROUP BY date
    ORDER BY date ASC
  `;

  const [rows] = await client.query({ query });

  return rows.map(row => ({
    date: row.date,
    pageViews: parseInt(row.page_views) || 0,
    sessions: parseInt(row.sessions) || 0,
    visitors: parseInt(row.visitors) || 0
  }));
}

// Get all unique action_types in the system (for reference)
async function getAllActionTypes(days = 30) {
  const client = getClient();

  const query = `
    SELECT
      ${getEventParam('action_type')} as action_type,
      COUNT(*) as count
    FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_*\`
    WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
      ${appStreamFilter()}
      AND ${getEventParam('action_type')} IS NOT NULL
    GROUP BY action_type
    ORDER BY count DESC
  `;

  const [rows] = await client.query({ query, params: withAppStreamParams() });
  return rows.map(r => ({ actionType: r.action_type, count: parseInt(r.count) }));
}

// Test BigQuery connection
async function testConnection() {
  const client = getClient();

  try {
    const query = `
      SELECT COUNT(*) as total_events
      FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_*\`
      WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))
        ${appStreamFilter()}
    `;
    const [rows] = await client.query({ query, params: withAppStreamParams() });
    return {
      success: true,
      totalEvents7d: parseInt(rows[0].total_events),
      dataset: DATASET_ID,
      appStreamEnv: getAppStreamEnv(),
      appStreamIds: APP_STREAM_IDS,
      webStreamIds: WEB_STREAM_IDS,
      growthStreamIds: GROWTH_STREAM_IDS
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      dataset: DATASET_ID,
      appStreamEnv: getAppStreamEnv(),
      appStreamIds: APP_STREAM_IDS,
      webStreamIds: WEB_STREAM_IDS,
      growthStreamIds: GROWTH_STREAM_IDS
    };
  }
}

// Get app store download button clicks
async function getWebDownloadClicks(days = 30) {
  const client = getClient();
  const tableQuery = await buildWebTableQuery(client, days);

  // Query for clicks on app store links
  const query = `
    WITH all_events AS (
      ${tableQuery}
    ),
    store_clicks AS (
      SELECT
        ${getEventParam('link_url')} as link_url,
        ${getEventParam('outbound')} as outbound,
        user_pseudo_id,
        geo.country as country
      FROM all_events
      WHERE event_name = 'click'
        AND (
          ${getEventParam('link_url')} LIKE '%apps.apple.com%'
          OR ${getEventParam('link_url')} LIKE '%play.google.com%'
          OR ${getEventParam('link_url')} LIKE '%itunes.apple.com%'
          OR ${getEventParam('link_url')} LIKE '%apple.com/app-store%'
        )
    )
    SELECT
      CASE
        WHEN link_url LIKE '%play.google.com%' THEN 'android'
        ELSE 'ios'
      END as platform,
      COUNT(*) as clicks,
      COUNT(DISTINCT user_pseudo_id) as unique_clickers
    FROM store_clicks
    GROUP BY platform
    ORDER BY clicks DESC
  `;

  // Query for clicks by country
  const countryQuery = `
    WITH all_events AS (
      ${tableQuery}
    ),
    store_clicks AS (
      SELECT
        ${getEventParam('link_url')} as link_url,
        user_pseudo_id,
        geo.country as country
      FROM all_events
      WHERE event_name = 'click'
        AND (
          ${getEventParam('link_url')} LIKE '%apps.apple.com%'
          OR ${getEventParam('link_url')} LIKE '%play.google.com%'
          OR ${getEventParam('link_url')} LIKE '%itunes.apple.com%'
          OR ${getEventParam('link_url')} LIKE '%apple.com/app-store%'
        )
    )
    SELECT
      country,
      COUNT(*) as clicks,
      COUNT(DISTINCT user_pseudo_id) as unique_clickers
    FROM store_clicks
    WHERE country IS NOT NULL AND country != ''
    GROUP BY country
    ORDER BY clicks DESC
    LIMIT 10
  `;

  // Query for total visitors (for CTR calculation)
  const visitorsQuery = `
    WITH all_events AS (
      ${tableQuery}
    )
    SELECT COUNT(DISTINCT user_pseudo_id) as total_visitors
    FROM all_events
  `;

  const [platformRows] = await client.query({ query });
  const [countryRows] = await client.query({ query: countryQuery });
  const [visitorRows] = await client.query({ query: visitorsQuery });

  const totalVisitors = parseInt(visitorRows[0]?.total_visitors) || 0;

  const platforms = platformRows.map(row => ({
    platform: row.platform,
    clicks: parseInt(row.clicks) || 0,
    uniqueClickers: parseInt(row.unique_clickers) || 0
  }));

  const totalClicks = platforms.reduce((sum, p) => sum + p.clicks, 0);
  const totalUniqueClickers = platforms.reduce((sum, p) => sum + p.uniqueClickers, 0);
  const ctr = totalVisitors > 0 ? ((totalUniqueClickers / totalVisitors) * 100).toFixed(2) : 0;

  return {
    totalClicks,
    totalUniqueClickers,
    totalVisitors,
    ctr,
    platforms,
    byCountry: countryRows.map(row => ({
      country: row.country || '(not set)',
      clicks: parseInt(row.clicks) || 0,
      uniqueClickers: parseInt(row.unique_clickers) || 0
    }))
  };
}

// Get web visitors by country
async function getWebCountries(days = 30) {
  const client = getClient();
  const tableQuery = await buildWebTableQuery(client, days);

  const query = `
    WITH all_events AS (
      ${tableQuery}
    )
    SELECT
      geo.country as country,
      COUNT(DISTINCT user_pseudo_id) as visitors,
      COUNTIF(event_name = 'session_start') as sessions,
      COUNTIF(event_name = 'page_view') as page_views
    FROM all_events
    WHERE geo.country IS NOT NULL AND geo.country != ''
    GROUP BY country
    ORDER BY visitors DESC
    LIMIT 30
  `;

  const [rows] = await client.query({ query });

  return rows.map(row => ({
    country: row.country || '(not set)',
    visitors: parseInt(row.visitors) || 0,
    sessions: parseInt(row.sessions) || 0,
    pageViews: parseInt(row.page_views) || 0
  }));
}

// Get web visitors by city (with country)
async function getWebCities(days = 30) {
  const client = getClient();
  const tableQuery = await buildWebTableQuery(client, days);

  const query = `
    WITH all_events AS (
      ${tableQuery}
    )
    SELECT
      geo.country as country,
      geo.city as city,
      geo.region as region,
      COUNT(DISTINCT user_pseudo_id) as visitors,
      COUNTIF(event_name = 'session_start') as sessions
    FROM all_events
    WHERE geo.city IS NOT NULL AND geo.city != '' AND geo.city != '(not set)'
    GROUP BY country, city, region
    ORDER BY visitors DESC
    LIMIT 50
  `;

  const [rows] = await client.query({ query });

  return rows.map(row => ({
    country: row.country || '(not set)',
    city: row.city || '(not set)',
    region: row.region || '',
    visitors: parseInt(row.visitors) || 0,
    sessions: parseInt(row.sessions) || 0
  }));
}

// Get web visitors by device/browser/OS
async function getWebDevices(days = 30) {
  const client = getClient();
  const tableQuery = await buildWebTableQuery(client, days);

  // Query for device categories
  const categoryQuery = `
    WITH all_events AS (
      ${tableQuery}
    )
    SELECT
      device.category as category,
      COUNT(DISTINCT user_pseudo_id) as visitors
    FROM all_events
    WHERE device.category IS NOT NULL
    GROUP BY category
    ORDER BY visitors DESC
  `;

  // Query for browsers
  const browserQuery = `
    WITH all_events AS (
      ${tableQuery}
    )
    SELECT
      device.web_info.browser as browser,
      COUNT(DISTINCT user_pseudo_id) as visitors
    FROM all_events
    WHERE device.web_info.browser IS NOT NULL AND device.web_info.browser != ''
    GROUP BY browser
    ORDER BY visitors DESC
    LIMIT 10
  `;

  // Query for operating systems
  const osQuery = `
    WITH all_events AS (
      ${tableQuery}
    )
    SELECT
      device.operating_system as os,
      COUNT(DISTINCT user_pseudo_id) as visitors
    FROM all_events
    WHERE device.operating_system IS NOT NULL AND device.operating_system != ''
    GROUP BY os
    ORDER BY visitors DESC
    LIMIT 10
  `;

  // Query for languages
  const langQuery = `
    WITH all_events AS (
      ${tableQuery}
    )
    SELECT
      device.language as language,
      COUNT(DISTINCT user_pseudo_id) as visitors
    FROM all_events
    WHERE device.language IS NOT NULL AND device.language != ''
    GROUP BY language
    ORDER BY visitors DESC
    LIMIT 10
  `;

  const [categoryRows] = await client.query({ query: categoryQuery });
  const [browserRows] = await client.query({ query: browserQuery });
  const [osRows] = await client.query({ query: osQuery });
  const [langRows] = await client.query({ query: langQuery });

  return {
    categories: categoryRows.map(row => ({
      category: row.category || '(not set)',
      visitors: parseInt(row.visitors) || 0
    })),
    browsers: browserRows.map(row => ({
      browser: row.browser || '(not set)',
      visitors: parseInt(row.visitors) || 0
    })),
    operatingSystems: osRows.map(row => ({
      os: row.os || '(not set)',
      visitors: parseInt(row.visitors) || 0
    })),
    languages: langRows.map(row => ({
      language: row.language || '(not set)',
      visitors: parseInt(row.visitors) || 0
    }))
  };
}

module.exports = {
  getScreenActions,
  getScreenActionDetails,
  getUserEvents,
  getAllActionTypes,
  testConnection,
  // Web analytics
  getWebOverview,
  getWebPages,
  getWebTrafficSources,
  getWebEngagement,
  getWebEventsOverTime,
  getWebCountries,
  getWebCities,
  getWebDevices,
  getWebDownloadClicks
};
