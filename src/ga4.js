// Google Analytics 4 Data API queries
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const path = require('path');

let analyticsClient = null;

// Production bundle ID (filter out dev and qa)
const PROD_APP_ID = 'com.filipecarvalho.xracing8';

function getClient() {
  if (!analyticsClient) {
    // Support both file path (local) and JSON string (Railway/production)
    if (process.env.GA4_CREDENTIALS_JSON) {
      // Parse JSON from environment variable
      const credentials = JSON.parse(process.env.GA4_CREDENTIALS_JSON);
      analyticsClient = new BetaAnalyticsDataClient({ credentials });
    } else if (process.env.GA4_CREDENTIALS_PATH) {
      // Use file path for local development
      const credentialsPath = path.resolve(process.env.GA4_CREDENTIALS_PATH);
      analyticsClient = new BetaAnalyticsDataClient({ keyFilename: credentialsPath });
    } else {
      throw new Error('GA4 credentials not configured. Set GA4_CREDENTIALS_JSON or GA4_CREDENTIALS_PATH');
    }
  }
  return analyticsClient;
}

function getPropertyId() {
  return `properties/${process.env.GA4_PROPERTY_ID}`;
}

// Filter to only include production app (exclude .dev and .qa bundle IDs)
function getProdFilter() {
  return {
    filter: {
      fieldName: 'appId',
      stringFilter: {
        matchType: 'EXACT',
        value: PROD_APP_ID
      }
    }
  };
}

// Overview stats (last 30 days)
async function getOverviewStats() {
  const client = getClient();
  const [response] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    dimensionFilter: getProdFilter(),
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

  // Get DAU (today), WAU (last 7 days), MAU (last 30 days)
  const [dauResponse] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: 'today', endDate: 'today' }],
    dimensionFilter: getProdFilter(),
    metrics: [{ name: 'activeUsers' }]
  });

  const [wauResponse] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    dimensionFilter: getProdFilter(),
    metrics: [{ name: 'activeUsers' }]
  });

  const [mauResponse] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    dimensionFilter: getProdFilter(),
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
  const [response] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    dimensionFilter: getProdFilter(),
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
  const [response] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    dimensionFilter: getProdFilter(),
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
  const [response] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    dimensionFilter: getProdFilter(),
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
  const [response] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    dimensionFilter: getProdFilter(),
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
async function getCountryBreakdown(limit = 15) {
  const client = getClient();
  const [response] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    dimensionFilter: getProdFilter(),
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

// Device breakdown
async function getDeviceBreakdown() {
  const client = getClient();
  const [response] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    dimensionFilter: getProdFilter(),
    dimensions: [{ name: 'platform' }],
    metrics: [{ name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }]
  });

  return response.rows?.map(row => ({
    platform: row.dimensionValues[0].value,
    users: parseInt(row.metricValues[0].value) || 0
  })) || [];
}

// User retention (new vs returning)
async function getUserRetention() {
  const client = getClient();
  const [response] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    dimensionFilter: getProdFilter(),
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
  const [response] = await client.runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    dimensionFilter: getProdFilter(),
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

module.exports = {
  getOverviewStats,
  getActiveUserMetrics,
  getDailyActiveUsers,
  getTopEvents,
  getTrafficSources,
  getTopScreens,
  getCountryBreakdown,
  getDeviceBreakdown,
  getUserRetention,
  getEngagementTrend
};
