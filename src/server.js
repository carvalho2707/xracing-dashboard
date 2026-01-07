require('dotenv').config();
const express = require('express');
const path = require('path');
const queries = require('./queries');
const ga4 = require('./ga4');

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
