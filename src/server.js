require('dotenv').config();
const express = require('express');
const path = require('path');
const queries = require('./queries');

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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`XRacing Dashboard running on port ${PORT}`);
});
