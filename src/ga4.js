// Google Analytics 4 Data API queries
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const path = require('path');

let analyticsClient = null;

// Production stream IDs (filter out dev and qa streams)
// Android prod: 10194581860, iOS prod: 10194592868
const PROD_STREAM_IDS = ['10194581860', '10194592868'];

function getClient() {
  if (!analyticsClient) {
    // Log configuration status
    console.log('=== GA4 Configuration ===');
    console.log('GA4_PROPERTY_ID:', process.env.GA4_PROPERTY_ID ? `${process.env.GA4_PROPERTY_ID}` : 'NOT SET');
    console.log('GA4_CREDENTIALS_BASE64:', process.env.GA4_CREDENTIALS_BASE64 ? `SET (${process.env.GA4_CREDENTIALS_BASE64.length} chars)` : 'NOT SET');
    console.log('GA4_CREDENTIALS_JSON:', process.env.GA4_CREDENTIALS_JSON ? `SET (${process.env.GA4_CREDENTIALS_JSON.length} chars)` : 'NOT SET');
    console.log('GA4_CREDENTIALS_PATH:', process.env.GA4_CREDENTIALS_PATH || 'NOT SET');
    console.log('PROD_STREAM_IDS filter:', PROD_STREAM_IDS.join(', '));
    console.log('=========================');

    // Support: base64 encoded JSON (Railway), raw JSON, or file path (local)
    if (process.env.GA4_CREDENTIALS_BASE64) {
      console.log('Using GA4_CREDENTIALS_BASE64 for authentication');
      const decoded = Buffer.from(process.env.GA4_CREDENTIALS_BASE64, 'base64').toString('utf8');
      const credentials = JSON.parse(decoded);
      console.log('Credentials parsed - project_id:', credentials.project_id, ', client_email:', credentials.client_email);
      analyticsClient = new BetaAnalyticsDataClient({ credentials });
    } else if (process.env.GA4_CREDENTIALS_JSON) {
      console.log('Using GA4_CREDENTIALS_JSON for authentication');
      const credentials = JSON.parse(process.env.GA4_CREDENTIALS_JSON);
      console.log('Credentials parsed - project_id:', credentials.project_id, ', client_email:', credentials.client_email);
      analyticsClient = new BetaAnalyticsDataClient({ credentials });
    } else if (process.env.GA4_CREDENTIALS_PATH) {
      console.log('Using GA4_CREDENTIALS_PATH for authentication:', process.env.GA4_CREDENTIALS_PATH);
      const credentialsPath = path.resolve(process.env.GA4_CREDENTIALS_PATH);
      analyticsClient = new BetaAnalyticsDataClient({ keyFilename: credentialsPath });
    } else {
      throw new Error('GA4 credentials not configured. Set GA4_CREDENTIALS_BASE64, GA4_CREDENTIALS_JSON, or GA4_CREDENTIALS_PATH');
    }
    console.log('GA4 client initialized successfully');
  }
  return analyticsClient;
}

function getPropertyId() {
  return `properties/${process.env.GA4_PROPERTY_ID}`;
}

// Filter to only include production streams (exclude dev and qa streams)
function getProdFilter() {
  if (!PROD_STREAM_IDS || PROD_STREAM_IDS.length === 0) {
    return null; // No filtering - show all streams
  }

  // Use OR filter for multiple stream IDs
  return {
    orGroup: {
      expressions: PROD_STREAM_IDS.map(streamId => ({
        filter: {
          fieldName: 'streamId',
          stringFilter: {
            matchType: 'EXACT',
            value: streamId
          }
        }
      }))
    }
  };
}

// Overview stats (last 30 days)
async function getOverviewStats() {
  const client = getClient();
  const filter = getProdFilter();
  const [response] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    ...(filter && { dimensionFilter: filter }),
    metrics: [
      { name: 'activeUsers' },
      { name: 'newUsers' },
      { name: 'sessions' },
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
      { name: 'engagedSessions' },
      { name: 'userEngagementDuration' }
    ]
  });

  const row = response.rows?.[0];
  if (!row) return null;

  return {
    activeUsers: parseInt(row.metricValues[0].value) || 0,
    newUsers: parseInt(row.metricValues[1].value) || 0,
    sessions: parseInt(row.metricValues[2].value) || 0,
    screenViews: parseInt(row.metricValues[3].value) || 0,
    avgSessionDuration: parseFloat(row.metricValues[4].value) || 0,
    engagedSessions: parseInt(row.metricValues[5].value) || 0,
    totalEngagementTime: parseFloat(row.metricValues[6].value) || 0
  };
}

// DAU/WAU/MAU
async function getActiveUserMetrics() {
  const client = getClient();
  const filter = getProdFilter();

  // Get DAU (today), WAU (last 7 days), MAU (last 30 days)
  const [dauResponse] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: 'today', endDate: 'today' }],
    ...(filter && { dimensionFilter: filter }),
    metrics: [{ name: 'activeUsers' }]
  });

  const [wauResponse] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    ...(filter && { dimensionFilter: filter }),
    metrics: [{ name: 'activeUsers' }]
  });

  const [mauResponse] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    ...(filter && { dimensionFilter: filter }),
    metrics: [{ name: 'activeUsers' }]
  });

  return {
    dau: parseInt(dauResponse.rows?.[0]?.metricValues[0].value) || 0,
    wau: parseInt(wauResponse.rows?.[0]?.metricValues[0].value) || 0,
    mau: parseInt(mauResponse.rows?.[0]?.metricValues[0].value) || 0
  };
}

// Daily active users (last 30 days)
async function getDailyActiveUsers(days = 30) {
  const client = getClient();
  const filter = getProdFilter();
  const [response] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    ...(filter && { dimensionFilter: filter }),
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'activeUsers' }, { name: 'newUsers' }],
    orderBys: [{ dimension: { dimensionName: 'date' } }]
  });

  return response.rows?.map(row => ({
    date: row.dimensionValues[0].value,
    activeUsers: parseInt(row.metricValues[0].value) || 0,
    newUsers: parseInt(row.metricValues[1].value) || 0
  })) || [];
}

// Top events
async function getTopEvents(limit = 20) {
  const client = getClient();
  const filter = getProdFilter();
  const [response] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    ...(filter && { dimensionFilter: filter }),
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit
  });

  return response.rows?.map(row => ({
    eventName: row.dimensionValues[0].value,
    count: parseInt(row.metricValues[0].value) || 0,
    users: parseInt(row.metricValues[1].value) || 0
  })) || [];
}

// Traffic sources / acquisition
async function getTrafficSources() {
  const client = getClient();
  const filter = getProdFilter();
  const [response] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    ...(filter && { dimensionFilter: filter }),
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }, { name: 'newUsers' }, { name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 10
  });

  return response.rows?.map(row => ({
    channel: row.dimensionValues[0].value,
    sessions: parseInt(row.metricValues[0].value) || 0,
    newUsers: parseInt(row.metricValues[1].value) || 0,
    activeUsers: parseInt(row.metricValues[2].value) || 0
  })) || [];
}

// Screen views (top screens)
async function getTopScreens(limit = 10) {
  const client = getClient();
  const filter = getProdFilter();
  const [response] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    ...(filter && { dimensionFilter: filter }),
    dimensions: [{ name: 'unifiedScreenName' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit
  });

  return response.rows?.map(row => ({
    screen: row.dimensionValues[0].value,
    views: parseInt(row.metricValues[0].value) || 0,
    users: parseInt(row.metricValues[1].value) || 0
  })) || [];
}

// Country breakdown
async function getCountryBreakdown(limit = 15, days = 30) {
  const client = getClient();
  const filter = getProdFilter();
  const [response] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    ...(filter && { dimensionFilter: filter }),
    dimensions: [{ name: 'country' }],
    metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
    limit
  });

  return response.rows?.map(row => ({
    country: row.dimensionValues[0].value,
    users: parseInt(row.metricValues[0].value) || 0,
    sessions: parseInt(row.metricValues[1].value) || 0
  })) || [];
}

// City breakdown
async function getCityBreakdown(limit = 15, days = 30) {
  const client = getClient();
  const filter = getProdFilter();
  const [response] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    ...(filter && { dimensionFilter: filter }),
    dimensions: [{ name: 'city' }, { name: 'country' }],
    metrics: [{ name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
    limit
  });

  return response.rows?.map(row => ({
    city: row.dimensionValues[0].value,
    country: row.dimensionValues[1].value,
    users: parseInt(row.metricValues[0].value) || 0
  })) || [];
}

// Device breakdown
async function getDeviceBreakdown(days = 30) {
  const client = getClient();
  const filter = getProdFilter();
  const [response] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    ...(filter && { dimensionFilter: filter }),
    dimensions: [{ name: 'platform' }],
    metrics: [{ name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }]
  });

  return response.rows?.map(row => ({
    platform: row.dimensionValues[0].value,
    users: parseInt(row.metricValues[0].value) || 0
  })) || [];
}

// Operating system breakdown
async function getOSBreakdown(days = 30) {
  const client = getClient();
  const filter = getProdFilter();
  const [response] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    ...(filter && { dimensionFilter: filter }),
    dimensions: [{ name: 'operatingSystem' }],
    metrics: [{ name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
    limit: 10
  });

  return response.rows?.map(row => ({
    os: row.dimensionValues[0].value,
    users: parseInt(row.metricValues[0].value) || 0
  })) || [];
}

// User retention (new vs returning)
async function getUserRetention() {
  const client = getClient();
  const filter = getProdFilter();
  const [response] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    ...(filter && { dimensionFilter: filter }),
    dimensions: [{ name: 'newVsReturning' }],
    metrics: [{ name: 'activeUsers' }, { name: 'sessions' }]
  });

  const result = { new: 0, returning: 0, newSessions: 0, returningSessions: 0 };
  response.rows?.forEach(row => {
    const type = row.dimensionValues[0].value;
    const users = parseInt(row.metricValues[0].value) || 0;
    const sessions = parseInt(row.metricValues[1].value) || 0;
    if (type === 'new') {
      result.new = users;
      result.newSessions = sessions;
    } else {
      result.returning = users;
      result.returningSessions = sessions;
    }
  });

  return result;
}

// Engagement rate over time
async function getEngagementTrend(days = 14) {
  const client = getClient();
  const filter = getProdFilter();
  const [response] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    ...(filter && { dimensionFilter: filter }),
    dimensions: [{ name: 'date' }],
    metrics: [
      { name: 'sessions' },
      { name: 'engagedSessions' },
      { name: 'averageSessionDuration' }
    ],
    orderBys: [{ dimension: { dimensionName: 'date' } }]
  });

  return response.rows?.map(row => ({
    date: row.dimensionValues[0].value,
    sessions: parseInt(row.metricValues[0].value) || 0,
    engagedSessions: parseInt(row.metricValues[1].value) || 0,
    avgDuration: parseFloat(row.metricValues[2].value) || 0,
    engagementRate: parseInt(row.metricValues[0].value) > 0
      ? (parseInt(row.metricValues[1].value) / parseInt(row.metricValues[0].value) * 100).toFixed(1)
      : 0
  })) || [];
}

// Debug function to test queries and filters
async function debugTest() {
  const client = getClient();

  // Test 1: Simple query without filter
  console.log('=== DEBUG: Testing simple query without filter ===');
  try {
    const [response1] = await client.runReport({
      property: getPropertyId(),
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      metrics: [{ name: 'activeUsers' }]
    });
    console.log('Simple query SUCCESS:', response1.rows?.[0]?.metricValues[0].value, 'users (all streams)');
  } catch (err) {
    console.log('Simple query FAILED:', err.message);
  }

  // Test 2: Query with streamId filter (prod only)
  console.log('=== DEBUG: Testing query with streamId filter ===');
  console.log('Filter config:', JSON.stringify(getProdFilter(), null, 2));
  try {
    const filter = getProdFilter();
    const [response2] = await client.runReport({
      property: getPropertyId(),
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      ...(filter && { dimensionFilter: filter }),
      metrics: [{ name: 'activeUsers' }]
    });
    console.log('Filtered query SUCCESS:', response2.rows?.[0]?.metricValues[0].value, 'users (prod only)');
  } catch (err) {
    console.log('Filtered query FAILED:', err.message);
  }

  return { status: 'debug complete - check server logs' };
}

// ============================================
// User Timeline & Screen Analysis Queries
// ============================================

// Get all events for a specific user within a date range
async function getUserEvents(userId, startDate, endDate) {
  const client = getClient();
  const prodFilter = getProdFilter();

  // Combine prod filter with user filter
  const userFilter = {
    filter: {
      fieldName: 'customUser:user_id',
      stringFilter: {
        matchType: 'EXACT',
        value: userId
      }
    }
  };

  // Build combined filter
  let dimensionFilter;
  if (prodFilter) {
    dimensionFilter = {
      andGroup: {
        expressions: [prodFilter, userFilter]
      }
    };
  } else {
    dimensionFilter = userFilter;
  }

  // Try with action_type, fall back if not registered
  let response;
  let hasActionType = false;

  try {
    [response] = await client.runReport({
      property: getPropertyId(),
      dateRanges: [{ startDate, endDate }],
      dimensionFilter,
      dimensions: [
        { name: 'date' },
        { name: 'eventName' },
        { name: 'customEvent:action_type' },
        { name: 'unifiedScreenName' }
      ],
      metrics: [
        { name: 'eventCount' }
      ],
      orderBys: [
        { dimension: { dimensionName: 'date' }, desc: true },
        { metric: { metricName: 'eventCount' }, desc: true }
      ],
      limit: 1000
    });
    hasActionType = true;
  } catch (err) {
    [response] = await client.runReport({
      property: getPropertyId(),
      dateRanges: [{ startDate, endDate }],
      dimensionFilter,
      dimensions: [
        { name: 'date' },
        { name: 'eventName' },
        { name: 'unifiedScreenName' }
      ],
      metrics: [
        { name: 'eventCount' }
      ],
      orderBys: [
        { dimension: { dimensionName: 'date' }, desc: true },
        { metric: { metricName: 'eventCount' }, desc: true }
      ],
      limit: 1000
    });
  }

  // Group events by date
  const eventsByDate = {};
  response.rows?.forEach(row => {
    const date = row.dimensionValues[0].value;
    const eventName = row.dimensionValues[1].value;
    const actionType = hasActionType ? (row.dimensionValues[2]?.value || null) : null;
    const screenName = hasActionType
      ? (row.dimensionValues[3]?.value || '(not set)')
      : (row.dimensionValues[2]?.value || '(not set)');
    const count = parseInt(row.metricValues[0].value) || 0;

    // Create meaningful action label
    const actionLabel = actionType && actionType !== '(not set)'
      ? actionType
      : eventName;

    if (!eventsByDate[date]) {
      eventsByDate[date] = { date, events: [], totalEvents: 0 };
    }
    eventsByDate[date].events.push({
      eventName,
      actionType,
      actionLabel,
      screenName,
      count
    });
    eventsByDate[date].totalEvents += count;
  });

  return Object.values(eventsByDate).sort((a, b) => b.date.localeCompare(a.date));
}

// Get all screens with their top actions
// Note: action_type needs to be registered as a custom dimension in GA4 to be queryable
async function getScreenActions(limit = 20) {
  const client = getClient();
  const filter = getProdFilter();

  // Try with action_type custom dimension first, fall back if not registered
  let response;
  let hasActionType = false;

  try {
    [response] = await client.runReport({
      property: getPropertyId(),
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      ...(filter && { dimensionFilter: filter }),
      dimensions: [
        { name: 'unifiedScreenName' },
        { name: 'eventName' },
        { name: 'customEvent:action_type' }  // Requires registration in GA4 Admin
      ],
      metrics: [
        { name: 'eventCount' },
        { name: 'activeUsers' }
      ],
      orderBys: [
        { metric: { metricName: 'eventCount' }, desc: true }
      ],
      limit: 2000
    });
    hasActionType = true;
  } catch (err) {
    // action_type not registered as custom dimension, fall back to basic query
    console.log('action_type dimension not available, using basic query');
    [response] = await client.runReport({
      property: getPropertyId(),
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      ...(filter && { dimensionFilter: filter }),
      dimensions: [
        { name: 'unifiedScreenName' },
        { name: 'eventName' }
      ],
      metrics: [
        { name: 'eventCount' },
        { name: 'activeUsers' }
      ],
      orderBys: [
        { metric: { metricName: 'eventCount' }, desc: true }
      ],
      limit: 2000
    });
  }

  // Group by screen
  const screenData = {};
  response.rows?.forEach(row => {
    const screenName = row.dimensionValues[0].value || '(not set)';
    const eventName = row.dimensionValues[1].value;
    const actionType = hasActionType ? (row.dimensionValues[2]?.value || null) : null;
    const eventCount = parseInt(row.metricValues[0].value) || 0;
    const users = parseInt(row.metricValues[1].value) || 0;

    // Create a meaningful action label
    // If action_type exists, use it (e.g., "share_recording")
    // Otherwise fall back to eventName (e.g., "screen_view")
    const actionLabel = actionType && actionType !== '(not set)'
      ? actionType
      : eventName;

    if (!screenData[screenName]) {
      screenData[screenName] = {
        screenName,
        totalEvents: 0,
        totalUsers: 0,
        actions: {}  // Use object to aggregate same actions
      };
    }
    screenData[screenName].totalEvents += eventCount;
    screenData[screenName].totalUsers = Math.max(screenData[screenName].totalUsers, users);

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
    screen.topActions = screen.actions.slice(0, 8);  // Show top 8 actions
  });

  // Sort screens by total events and limit
  return Object.values(screenData)
    .sort((a, b) => b.totalEvents - a.totalEvents)
    .slice(0, limit);
}

// Get detailed action breakdown for a specific screen
async function getScreenActionDetails(screenName, limit = 100) {
  const client = getClient();
  const prodFilter = getProdFilter();

  const screenFilter = {
    filter: {
      fieldName: 'unifiedScreenName',
      stringFilter: {
        matchType: 'EXACT',
        value: screenName
      }
    }
  };

  // Combine filters
  let dimensionFilter;
  if (prodFilter) {
    dimensionFilter = {
      andGroup: {
        expressions: [prodFilter, screenFilter]
      }
    };
  } else {
    dimensionFilter = screenFilter;
  }

  // Try with action_type, fall back if not registered
  let response;
  let hasActionType = false;

  try {
    [response] = await client.runReport({
      property: getPropertyId(),
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensionFilter,
      dimensions: [
        { name: 'eventName' },
        { name: 'customEvent:action_type' }
      ],
      metrics: [
        { name: 'eventCount' },
        { name: 'activeUsers' }
      ],
      orderBys: [
        { metric: { metricName: 'eventCount' }, desc: true }
      ],
      limit
    });
    hasActionType = true;
  } catch (err) {
    [response] = await client.runReport({
      property: getPropertyId(),
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensionFilter,
      dimensions: [
        { name: 'eventName' }
      ],
      metrics: [
        { name: 'eventCount' },
        { name: 'activeUsers' }
      ],
      orderBys: [
        { metric: { metricName: 'eventCount' }, desc: true }
      ],
      limit
    });
  }

  // Aggregate actions
  const actionsMap = {};
  response.rows?.forEach(row => {
    const eventName = row.dimensionValues[0].value;
    const actionType = hasActionType ? (row.dimensionValues[1]?.value || null) : null;
    const count = parseInt(row.metricValues[0].value) || 0;
    const users = parseInt(row.metricValues[1].value) || 0;

    // Use action_type if available, otherwise eventName
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
  const totalEvents = actions.reduce((sum, a) => sum + a.count, 0);
  const totalUsers = Math.max(...actions.map(a => a.users), 0);

  return {
    screenName,
    totalEvents,
    totalUsers,
    actions
  };
}

module.exports = {
  getOverviewStats,
  getActiveUserMetrics,
  getDailyActiveUsers,
  getTopEvents,
  getTrafficSources,
  getTopScreens,
  getCountryBreakdown,
  getCityBreakdown,
  getDeviceBreakdown,
  getOSBreakdown,
  getUserRetention,
  getEngagementTrend,
  debugTest,
  getUserEvents,
  getScreenActions,
  getScreenActionDetails
};
