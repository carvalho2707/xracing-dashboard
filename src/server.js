require('dotenv').config();
const express = require('express');
const path = require('path');
const queries = require('./queries');
const ga4 = require('./ga4');
const bigquery = require('./bigquery');
const firebase = require('./firebase');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.get('/api/live', async (req, res) => {
  try {
    const data = await queries.getLiveRecordings();
    res.json(data);
  } catch (error) {
    console.error('Error fetching live recordings:', error);
    res.status(500).json({ error: 'Failed to fetch live recordings' });
  }
});

app.get('/api/live-monitoring', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const data = await queries.getLiveMonitoring(limit);
    res.json(data);
  } catch (error) {
    console.error('Error fetching live monitoring:', error);
    res.status(500).json({ error: 'Failed to fetch live monitoring' });
  }
});

// Firebase RTDB - Real-time live recordings
app.get('/api/rtdb/live', async (req, res) => {
  try {
    const data = await firebase.getLiveSummary();
    res.json(data);
  } catch (error) {
    console.error('Error fetching RTDB live data:', error);
    res.status(500).json({ error: 'Failed to fetch RTDB live data' });
  }
});

app.get('/api/rtdb/live/tracks', async (req, res) => {
  try {
    const data = await firebase.getLiveTrackRecordings();
    res.json(data);
  } catch (error) {
    console.error('Error fetching RTDB track recordings:', error);
    res.status(500).json({ error: 'Failed to fetch track recordings' });
  }
});

app.get('/api/rtdb/live/notrack', async (req, res) => {
  try {
    const data = await firebase.getLiveNoTrackRecordings();
    res.json(data);
  } catch (error) {
    console.error('Error fetching RTDB noTrack recordings:', error);
    res.status(500).json({ error: 'Failed to fetch noTrack recordings' });
  }
});

app.get('/api/overview', async (req, res) => {
  try {
    const stats = await queries.getOverviewStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching overview:', error);
    res.status(500).json({ error: 'Failed to fetch overview stats' });
  }
});

app.get('/api/user-growth', async (req, res) => {
  try {
    const data = await queries.getUserGrowth();
    res.json(data);
  } catch (error) {
    console.error('Error fetching user growth:', error);
    res.status(500).json({ error: 'Failed to fetch user growth' });
  }
});

app.get('/api/cumulative-user-growth', async (req, res) => {
  try {
    const data = await queries.getCumulativeUserGrowth();
    res.json(data);
  } catch (error) {
    console.error('Error fetching cumulative user growth:', error);
    res.status(500).json({ error: 'Failed to fetch cumulative user growth' });
  }
});

app.get('/api/recording-activity', async (req, res) => {
  try {
    const data = await queries.getRecordingActivity();
    res.json(data);
  } catch (error) {
    console.error('Error fetching recording activity:', error);
    res.status(500).json({ error: 'Failed to fetch recording activity' });
  }
});

app.get('/api/cumulative-recording-growth', async (req, res) => {
  try {
    const data = await queries.getCumulativeRecordingGrowth();
    res.json(data);
  } catch (error) {
    console.error('Error fetching cumulative recording growth:', error);
    res.status(500).json({ error: 'Failed to fetch cumulative recording growth' });
  }
});

app.get('/api/top-tracks', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await queries.getTopTracks(limit);
    res.json(data);
  } catch (error) {
    console.error('Error fetching top tracks:', error);
    res.status(500).json({ error: 'Failed to fetch top tracks' });
  }
});

app.get('/api/top-drivers', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await queries.getTopDrivers(limit);
    res.json(data);
  } catch (error) {
    console.error('Error fetching top drivers:', error);
    res.status(500).json({ error: 'Failed to fetch top drivers' });
  }
});

app.get('/api/social-metrics', async (req, res) => {
  try {
    const data = await queries.getSocialMetrics();
    res.json(data);
  } catch (error) {
    console.error('Error fetching social metrics:', error);
    res.status(500).json({ error: 'Failed to fetch social metrics' });
  }
});

app.get('/api/likes-activity', async (req, res) => {
  try {
    const data = await queries.getLikesActivity();
    res.json(data);
  } catch (error) {
    console.error('Error fetching likes activity:', error);
    res.status(500).json({ error: 'Failed to fetch likes activity' });
  }
});

app.get('/api/comments-activity', async (req, res) => {
  try {
    const data = await queries.getCommentsActivity();
    res.json(data);
  } catch (error) {
    console.error('Error fetching comments activity:', error);
    res.status(500).json({ error: 'Failed to fetch comments activity' });
  }
});

app.get('/api/media-activity', async (req, res) => {
  try {
    const data = await queries.getMediaActivity();
    res.json(data);
  } catch (error) {
    console.error('Error fetching media activity:', error);
    res.status(500).json({ error: 'Failed to fetch media activity' });
  }
});

app.get('/api/recording-status', async (req, res) => {
  try {
    const data = await queries.getRecordingStatusDistribution();
    res.json(data);
  } catch (error) {
    console.error('Error fetching recording status:', error);
    res.status(500).json({ error: 'Failed to fetch recording status' });
  }
});

app.get('/api/validation-status', async (req, res) => {
  try {
    const data = await queries.getValidationDistribution();
    res.json(data);
  } catch (error) {
    console.error('Error fetching validation status:', error);
    res.status(500).json({ error: 'Failed to fetch validation status' });
  }
});

app.get('/api/geographic', async (req, res) => {
  try {
    const data = await queries.getGeographicDistribution();
    res.json(data);
  } catch (error) {
    console.error('Error fetching geographic data:', error);
    res.status(500).json({ error: 'Failed to fetch geographic data' });
  }
});

app.get('/api/daily-recordings', async (req, res) => {
  try {
    const data = await queries.getDailyRecordings();
    res.json(data);
  } catch (error) {
    console.error('Error fetching daily recordings:', error);
    res.status(500).json({ error: 'Failed to fetch daily recordings' });
  }
});

app.get('/api/recent-activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const data = await queries.getRecentActivity(limit);
    res.json(data);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

app.get('/api/recent-users', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await queries.getRecentUsers(limit);
    res.json(data);
  } catch (error) {
    console.error('Error fetching recent users:', error);
    res.status(500).json({ error: 'Failed to fetch recent users' });
  }
});

app.get('/api/recent-tracks', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await queries.getRecentTracks(limit);
    res.json(data);
  } catch (error) {
    console.error('Error fetching recent tracks:', error);
    res.status(500).json({ error: 'Failed to fetch recent tracks' });
  }
});

app.get('/api/performance', async (req, res) => {
  try {
    const data = await queries.getPerformanceMetrics();
    res.json(data);
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

app.get('/api/events-stats', async (req, res) => {
  try {
    const data = await queries.getEventsStats();
    res.json(data);
  } catch (error) {
    console.error('Error fetching events stats:', error);
    res.status(500).json({ error: 'Failed to fetch events stats' });
  }
});

app.get('/api/growth-rates', async (req, res) => {
  try {
    const data = await queries.getGrowthRates();
    res.json(data);
  } catch (error) {
    console.error('Error fetching growth rates:', error);
    res.status(500).json({ error: 'Failed to fetch growth rates' });
  }
});

app.get('/api/user-engagement', async (req, res) => {
  try {
    const data = await queries.getUserEngagement();
    res.json(data);
  } catch (error) {
    console.error('Error fetching user engagement:', error);
    res.status(500).json({ error: 'Failed to fetch user engagement' });
  }
});

app.get('/api/media-stats', async (req, res) => {
  try {
    const data = await queries.getMediaStats();
    res.json(data);
  } catch (error) {
    console.error('Error fetching media stats:', error);
    res.status(500).json({ error: 'Failed to fetch media stats' });
  }
});

app.get('/api/heatmap-locations', async (req, res) => {
  try {
    const data = await queries.getHeatmapLocations();
    res.json(data);
  } catch (error) {
    console.error('Error fetching heatmap locations:', error);
    res.status(500).json({ error: 'Failed to fetch heatmap locations' });
  }
});

app.get('/api/views-stats', async (req, res) => {
  try {
    const data = await queries.getViewsStats();
    res.json(data);
  } catch (error) {
    console.error('Error fetching views stats:', error);
    res.status(500).json({ error: 'Failed to fetch views stats' });
  }
});

app.get('/api/top-viewed-recordings', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await queries.getTopViewedRecordings(limit);
    res.json(data);
  } catch (error) {
    console.error('Error fetching top viewed recordings:', error);
    res.status(500).json({ error: 'Failed to fetch top viewed recordings' });
  }
});

app.get('/api/top-live-viewed-recordings', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await queries.getTopLiveViewedRecordings(limit);
    res.json(data);
  } catch (error) {
    console.error('Error fetching top live viewed recordings:', error);
    res.status(500).json({ error: 'Failed to fetch top live viewed recordings' });
  }
});

app.get('/api/top-viewed-events', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await queries.getTopViewedEvents(limit);
    res.json(data);
  } catch (error) {
    console.error('Error fetching top viewed events:', error);
    res.status(500).json({ error: 'Failed to fetch top viewed events' });
  }
});

app.get('/api/top-live-viewed-events', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await queries.getTopLiveViewedEvents(limit);
    res.json(data);
  } catch (error) {
    console.error('Error fetching top live viewed events:', error);
    res.status(500).json({ error: 'Failed to fetch top live viewed events' });
  }
});

// GA4 Analytics API Routes
app.get('/api/ga4/overview', async (req, res) => {
  try {
    const data = await ga4.getOverviewStats();
    res.json(data);
  } catch (error) {
    console.error('Error fetching GA4 overview:', error);
    res.status(500).json({ error: 'Failed to fetch GA4 overview' });
  }
});

app.get('/api/ga4/active-users', async (req, res) => {
  try {
    const data = await ga4.getActiveUserMetrics();
    res.json(data);
  } catch (error) {
    console.error('Error fetching GA4 active users:', error);
    res.status(500).json({ error: 'Failed to fetch GA4 active users' });
  }
});

app.get('/api/ga4/daily-users', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await ga4.getDailyActiveUsers(days);
    res.json(data);
  } catch (error) {
    console.error('Error fetching GA4 daily users:', error);
    res.status(500).json({ error: 'Failed to fetch GA4 daily users' });
  }
});

app.get('/api/ga4/events', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const data = await ga4.getTopEvents(limit);
    res.json(data);
  } catch (error) {
    console.error('Error fetching GA4 events:', error);
    res.status(500).json({ error: 'Failed to fetch GA4 events' });
  }
});

app.get('/api/ga4/traffic', async (req, res) => {
  try {
    const data = await ga4.getTrafficSources();
    res.json(data);
  } catch (error) {
    console.error('Error fetching GA4 traffic:', error);
    res.status(500).json({ error: 'Failed to fetch GA4 traffic' });
  }
});

app.get('/api/ga4/screens', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await ga4.getTopScreens(limit);
    res.json(data);
  } catch (error) {
    console.error('Error fetching GA4 screens:', error);
    res.status(500).json({ error: 'Failed to fetch GA4 screens' });
  }
});

app.get('/api/ga4/countries', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 15;
    const data = await ga4.getCountryBreakdown(limit);
    res.json(data);
  } catch (error) {
    console.error('Error fetching GA4 countries:', error);
    res.status(500).json({ error: 'Failed to fetch GA4 countries' });
  }
});

app.get('/api/ga4/devices', async (req, res) => {
  try {
    const data = await ga4.getDeviceBreakdown();
    res.json(data);
  } catch (error) {
    console.error('Error fetching GA4 devices:', error);
    res.status(500).json({ error: 'Failed to fetch GA4 devices' });
  }
});

app.get('/api/ga4/retention', async (req, res) => {
  try {
    const data = await ga4.getUserRetention();
    res.json(data);
  } catch (error) {
    console.error('Error fetching GA4 retention:', error);
    res.status(500).json({ error: 'Failed to fetch GA4 retention' });
  }
});

app.get('/api/ga4/engagement', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 14;
    const data = await ga4.getEngagementTrend(days);
    res.json(data);
  } catch (error) {
    console.error('Error fetching GA4 engagement:', error);
    res.status(500).json({ error: 'Failed to fetch GA4 engagement' });
  }
});

// GA4 Debug endpoint - check server logs for output
app.get('/api/ga4/debug', async (req, res) => {
  try {
    const data = await ga4.debugTest();
    res.json(data);
  } catch (error) {
    console.error('Error in GA4 debug:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// User Timeline & Screen Analysis API Routes
// ============================================

// Lookup user by username
app.get('/api/users/lookup', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    const user = await queries.getUserByUsername(username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error looking up user:', error);
    res.status(500).json({ error: 'Failed to lookup user' });
  }
});

// Get all users for dropdown
app.get('/api/users', async (req, res) => {
  try {
    const users = await queries.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ============================================
// BigQuery Routes (for detailed event analysis)
// ============================================

// Test BigQuery connection
app.get('/api/bigquery/test', async (req, res) => {
  try {
    const result = await bigquery.testConnection();
    res.json(result);
  } catch (error) {
    console.error('BigQuery test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user events timeline from BigQuery (with exact timestamps!)
app.get('/api/ga4/user-events', async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    // Default to last 7 days
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const data = await bigquery.getUserEvents(userId, start, end);
    res.json(data);
  } catch (error) {
    console.error('Error fetching user events:', error);
    res.status(500).json({ error: 'Failed to fetch user events' });
  }
});

// Get all screens with their actions (from BigQuery - full action_type access)
app.get('/api/ga4/screen-actions', async (req, res) => {
  try {
    const days = req.query.days !== undefined ? parseInt(req.query.days) : 30;
    const userId = req.query.userId || null;
    const excludeOwners = req.query.excludeOwners === 'true';
    const data = await bigquery.getScreenActions(days, userId, excludeOwners);
    res.json(data);
  } catch (error) {
    console.error('Error fetching screen actions:', error);
    res.status(500).json({ error: 'Failed to fetch screen actions' });
  }
});

// Get detailed actions for a specific screen
app.get('/api/ga4/screen-actions/:screenName', async (req, res) => {
  try {
    const { screenName } = req.params;
    const days = req.query.days !== undefined ? parseInt(req.query.days) : 30;
    const userId = req.query.userId || null;
    const excludeOwners = req.query.excludeOwners === 'true';
    const data = await bigquery.getScreenActionDetails(screenName, days, userId, excludeOwners);
    res.json(data);
  } catch (error) {
    console.error('Error fetching screen action details:', error);
    res.status(500).json({ error: 'Failed to fetch screen action details' });
  }
});

// Get all action_types in the system
app.get('/api/bigquery/action-types', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await bigquery.getAllActionTypes(days);
    res.json(data);
  } catch (error) {
    console.error('Error fetching action types:', error);
    res.status(500).json({ error: 'Failed to fetch action types' });
  }
});

// ============================================
// Web Analytics Routes (Marketing Website)
// ============================================

// Get web analytics overview
app.get('/api/web/overview', async (req, res) => {
  try {
    const days = req.query.days !== undefined ? parseInt(req.query.days) : 30;
    const data = await bigquery.getWebOverview(days);
    res.json(data);
  } catch (error) {
    console.error('Error fetching web overview:', error);
    res.status(500).json({ error: 'Failed to fetch web overview' });
  }
});

// Get web page views breakdown
app.get('/api/web/pages', async (req, res) => {
  try {
    const days = req.query.days !== undefined ? parseInt(req.query.days) : 30;
    const data = await bigquery.getWebPages(days);
    res.json(data);
  } catch (error) {
    console.error('Error fetching web pages:', error);
    res.status(500).json({ error: 'Failed to fetch web pages' });
  }
});

// Get web traffic sources
app.get('/api/web/traffic-sources', async (req, res) => {
  try {
    const days = req.query.days !== undefined ? parseInt(req.query.days) : 30;
    const data = await bigquery.getWebTrafficSources(days);
    res.json(data);
  } catch (error) {
    console.error('Error fetching web traffic sources:', error);
    res.status(500).json({ error: 'Failed to fetch web traffic sources' });
  }
});

// Get web engagement metrics
app.get('/api/web/engagement', async (req, res) => {
  try {
    const days = req.query.days !== undefined ? parseInt(req.query.days) : 30;
    const data = await bigquery.getWebEngagement(days);
    res.json(data);
  } catch (error) {
    console.error('Error fetching web engagement:', error);
    res.status(500).json({ error: 'Failed to fetch web engagement' });
  }
});

// Get web events over time (for charts)
app.get('/api/web/events-over-time', async (req, res) => {
  try {
    const days = req.query.days !== undefined ? parseInt(req.query.days) : 30;
    const data = await bigquery.getWebEventsOverTime(days);
    res.json(data);
  } catch (error) {
    console.error('Error fetching web events over time:', error);
    res.status(500).json({ error: 'Failed to fetch web events over time' });
  }
});

// ============================================
// Product Analytics API Routes (Tier 1/2/3)
// ============================================

// Tier 1: Activation metrics
app.get('/api/analytics/activation', async (req, res) => {
  try {
    const data = await queries.getActivationMetrics();
    res.json(data);
  } catch (error) {
    console.error('Error fetching activation metrics:', error);
    res.status(500).json({ error: 'Failed to fetch activation metrics' });
  }
});

// Tier 1: Retention cohorts (D1/D7/D30)
app.get('/api/analytics/retention', async (req, res) => {
  try {
    const data = await queries.getRetentionCohorts();
    res.json(data);
  } catch (error) {
    console.error('Error fetching retention cohorts:', error);
    res.status(500).json({ error: 'Failed to fetch retention cohorts' });
  }
});

// Tier 1: DAU/WAU/MAU stickiness
app.get('/api/analytics/active-users', async (req, res) => {
  try {
    const data = await queries.getActiveUsersDB();
    res.json(data);
  } catch (error) {
    console.error('Error fetching active users:', error);
    res.status(500).json({ error: 'Failed to fetch active users' });
  }
});

// Tier 1: Daily active users trend
app.get('/api/analytics/daily-active', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const data = await queries.getDailyActiveUsersTrend(days);
    res.json(data);
  } catch (error) {
    console.error('Error fetching daily active users:', error);
    res.status(500).json({ error: 'Failed to fetch daily active users' });
  }
});

// Tier 2: Daily signups
app.get('/api/analytics/signups', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const data = await queries.getDailySignups(days);
    res.json(data);
  } catch (error) {
    console.error('Error fetching daily signups:', error);
    res.status(500).json({ error: 'Failed to fetch daily signups' });
  }
});

// Tier 2: Recordings per user
app.get('/api/analytics/recordings-per-user', async (req, res) => {
  try {
    const data = await queries.getRecordingsPerUser();
    res.json(data);
  } catch (error) {
    console.error('Error fetching recordings per user:', error);
    res.status(500).json({ error: 'Failed to fetch recordings per user' });
  }
});

// Tier 3: Social engagement rate
app.get('/api/analytics/social-engagement', async (req, res) => {
  try {
    const data = await queries.getSocialEngagementRate();
    res.json(data);
  } catch (error) {
    console.error('Error fetching social engagement:', error);
    res.status(500).json({ error: 'Failed to fetch social engagement' });
  }
});

// Tier 3: Feature adoption
app.get('/api/analytics/feature-adoption', async (req, res) => {
  try {
    const data = await queries.getFeatureAdoption();
    res.json(data);
  } catch (error) {
    console.error('Error fetching feature adoption:', error);
    res.status(500).json({ error: 'Failed to fetch feature adoption' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`xracing dashboard running on port ${PORT}`);
});
