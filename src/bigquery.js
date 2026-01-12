// BigQuery queries for GA4 event data
// This gives us access to ALL event parameters without needing to register custom dimensions

const { BigQuery } = require('@google-cloud/bigquery');
const path = require('path');

let bigqueryClient = null;

// GA4 Property ID determines the dataset name
const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID || '474857535';
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || 'xracing-912fc';
const DATASET_ID = `analytics_${GA4_PROPERTY_ID}`;

function getClient() {
  if (!bigqueryClient) {

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

  // For today (days=0), use intraday table; otherwise use regular events tables
  // For days >= 1, we combine both regular and intraday tables to get complete data
  const todaySuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  let tableQuery;
  if (days === 0) {
    // Today only - just intraday
    tableQuery = `
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_intraday_${todaySuffix}\`
    `;
  } else {
    // Historical + intraday for complete data
    tableQuery = `
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_*\`
      WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
      UNION ALL
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_intraday_${todaySuffix}\`
    `;
  }

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

  const params = {};
  if (userId) params.userId = userId;
  if (excludeOwners) params.excludedUsers = OWNER_USER_IDS;
  const options = Object.keys(params).length > 0 ? { query, params } : { query };
  const [rows] = await client.query(options);

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

  // For today (days=0), use intraday table; otherwise combine regular + intraday
  const todaySuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  let tableQuery;
  if (days === 0) {
    tableQuery = `
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_intraday_${todaySuffix}\`
    `;
  } else {
    tableQuery = `
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_*\`
      WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
      UNION ALL
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_intraday_${todaySuffix}\`
    `;
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

  const params = { screenName };
  if (userId) params.userId = userId;
  if (excludeOwners) params.excludedUsers = OWNER_USER_IDS;
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

  // Fetch all event_params as a JSON object for maximum flexibility
  const query = `
    SELECT
      TIMESTAMP_MICROS(event_timestamp) as event_time,
      event_name,
      (
        SELECT ARRAY_AGG(STRUCT(key, value.string_value, value.int_value, value.double_value))
        FROM UNNEST(event_params)
      ) as params
    FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_*\`
    WHERE _TABLE_SUFFIX BETWEEN @startSuffix AND @endSuffix
      AND user_id = @userId
    ORDER BY event_timestamp DESC
    LIMIT 1000
  `;

  const [rows] = await client.query({
    query,
    params: { userId, startSuffix, endSuffix }
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

// Web Analytics Stream ID (marketing website)
const WEB_STREAM_ID = '13282628457';

// ============================================
// WEB ANALYTICS FUNCTIONS
// ============================================

// Get web analytics overview (page views, sessions, users)
async function getWebOverview(days = 30) {
  const client = getClient();

  const todaySuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  let tableQuery;
  if (days === 0) {
    tableQuery = `
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_intraday_${todaySuffix}\`
      WHERE stream_id = '${WEB_STREAM_ID}'
    `;
  } else {
    tableQuery = `
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_*\`
      WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
        AND stream_id = '${WEB_STREAM_ID}'
      UNION ALL
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_intraday_${todaySuffix}\`
      WHERE stream_id = '${WEB_STREAM_ID}'
    `;
  }

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

  const todaySuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  let tableQuery;
  if (days === 0) {
    tableQuery = `
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_intraday_${todaySuffix}\`
      WHERE stream_id = '${WEB_STREAM_ID}'
    `;
  } else {
    tableQuery = `
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_*\`
      WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
        AND stream_id = '${WEB_STREAM_ID}'
      UNION ALL
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_intraday_${todaySuffix}\`
      WHERE stream_id = '${WEB_STREAM_ID}'
    `;
  }

  const query = `
    WITH all_events AS (
      ${tableQuery}
    )
    SELECT
      ${getEventParam('page_location')} as page_url,
      ${getEventParam('page_title')} as page_title,
      COUNT(*) as views,
      COUNT(DISTINCT user_pseudo_id) as unique_visitors,
      AVG(${getEventParam('engagement_time_msec', 'int')}) as avg_engagement_ms
    FROM all_events
    WHERE event_name = 'page_view'
    GROUP BY page_url, page_title
    ORDER BY views DESC
    LIMIT 50
  `;

  const [rows] = await client.query({ query });

  return rows.map(row => ({
    pageUrl: row.page_url || '(not set)',
    pageTitle: row.page_title || '(not set)',
    views: parseInt(row.views) || 0,
    uniqueVisitors: parseInt(row.unique_visitors) || 0,
    avgEngagementSec: row.avg_engagement_ms ? Math.round(row.avg_engagement_ms / 1000) : 0
  }));
}

// Get web traffic sources
async function getWebTrafficSources(days = 30) {
  const client = getClient();

  const todaySuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  let tableQuery;
  if (days === 0) {
    tableQuery = `
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_intraday_${todaySuffix}\`
      WHERE stream_id = '${WEB_STREAM_ID}'
    `;
  } else {
    tableQuery = `
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_*\`
      WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
        AND stream_id = '${WEB_STREAM_ID}'
      UNION ALL
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_intraday_${todaySuffix}\`
      WHERE stream_id = '${WEB_STREAM_ID}'
    `;
  }

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

  const todaySuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  let tableQuery;
  if (days === 0) {
    tableQuery = `
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_intraday_${todaySuffix}\`
      WHERE stream_id = '${WEB_STREAM_ID}'
    `;
  } else {
    tableQuery = `
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_*\`
      WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
        AND stream_id = '${WEB_STREAM_ID}'
      UNION ALL
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_intraday_${todaySuffix}\`
      WHERE stream_id = '${WEB_STREAM_ID}'
    `;
  }

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

  const todaySuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  let tableQuery;
  if (days === 0) {
    tableQuery = `
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_intraday_${todaySuffix}\`
      WHERE stream_id = '${WEB_STREAM_ID}'
    `;
  } else {
    tableQuery = `
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_*\`
      WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
        AND stream_id = '${WEB_STREAM_ID}'
      UNION ALL
      SELECT * FROM \`${GCP_PROJECT_ID}.${DATASET_ID}.events_intraday_${todaySuffix}\`
      WHERE stream_id = '${WEB_STREAM_ID}'
    `;
  }

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
      AND ${getEventParam('action_type')} IS NOT NULL
    GROUP BY action_type
    ORDER BY count DESC
  `;

  const [rows] = await client.query({ query });
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
    `;
    const [rows] = await client.query({ query });
    return {
      success: true,
      totalEvents7d: parseInt(rows[0].total_events),
      dataset: DATASET_ID
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      dataset: DATASET_ID
    };
  }
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
  getWebEventsOverTime
};
