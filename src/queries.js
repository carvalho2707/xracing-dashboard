const db = require('./db');

const queries = {
  // Overview KPIs
  async getOverviewStats() {
    const result = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30d,
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_7d,
        (SELECT COUNT(*) FROM recordings WHERE deleted_at IS NULL) as total_recordings,
        (SELECT COUNT(*) FROM recordings WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '30 days') as recordings_30d,
        (SELECT COUNT(*) FROM tracks) as total_tracks,
        (SELECT COUNT(*) FROM events WHERE deleted_at IS NULL) as total_events,
        (SELECT COALESCE(SUM(total_distance), 0) FROM user_stats) as total_distance_meters,
        (SELECT COALESCE(SUM(total_time_recording), 0) FROM user_stats) as total_time_ms
    `);
    return result.rows[0];
  },

  // User growth over time (last 12 months)
  async getUserGrowth() {
    const result = await db.query(`
      SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `);
    return result.rows;
  },

  // Recording activity over time (last 12 months)
  async getRecordingActivity() {
    const result = await db.query(`
      SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count
      FROM recordings
      WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `);
    return result.rows;
  },

  // Top tracks by recordings
  async getTopTracks(limit = 10) {
    const result = await db.query(`
      SELECT
        t.id,
        t.name,
        t.location_city,
        t.location_country,
        t.type,
        COALESCE(ts.recordings_count, 0) as recordings_count,
        COALESCE(ts.unique_drivers_count, 0) as unique_drivers_count
      FROM tracks t
      LEFT JOIN track_stats ts ON t.id = ts.track_id
      ORDER BY COALESCE(ts.recordings_count, 0) DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  },

  // Top drivers by recordings
  async getTopDrivers(limit = 10) {
    const result = await db.query(`
      SELECT
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.follower_count,
        COALESCE(us.total_recordings, 0) as total_recordings,
        COALESCE(us.total_distance, 0) as total_distance,
        COALESCE(us.tracks_raced, 0) as tracks_raced
      FROM users u
      LEFT JOIN user_stats us ON u.id = us.user_id
      ORDER BY COALESCE(us.total_recordings, 0) DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  },

  // Social engagement metrics
  async getSocialMetrics() {
    const result = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM likes) as total_likes,
        (SELECT COUNT(*) FROM comments WHERE deleted = false) as total_comments,
        (SELECT COUNT(*) FROM user_relationships WHERE relationship_type = 'following' AND status = 'active') as total_follows,
        (SELECT COUNT(*) FROM likes WHERE created_at >= NOW() - INTERVAL '7 days') as likes_7d,
        (SELECT COUNT(*) FROM comments WHERE deleted = false AND created_at >= NOW() - INTERVAL '7 days') as comments_7d
    `);
    return result.rows[0];
  },

  // Recording status distribution
  async getRecordingStatusDistribution() {
    const result = await db.query(`
      SELECT
        status,
        COUNT(*) as count
      FROM recordings
      WHERE deleted_at IS NULL
      GROUP BY status
      ORDER BY count DESC
    `);
    return result.rows;
  },

  // Validation status distribution
  async getValidationDistribution() {
    const result = await db.query(`
      SELECT
        validation_status,
        COUNT(*) as count
      FROM recordings
      WHERE deleted_at IS NULL
      GROUP BY validation_status
      ORDER BY count DESC
    `);
    return result.rows;
  },

  // Geographic distribution
  async getGeographicDistribution() {
    const result = await db.query(`
      SELECT
        location_country,
        COUNT(*) as count
      FROM recordings
      WHERE deleted_at IS NULL AND location_country IS NOT NULL
      GROUP BY location_country
      ORDER BY count DESC
      LIMIT 15
    `);
    return result.rows;
  },

  // Daily active recordings (last 30 days)
  async getDailyRecordings() {
    const result = await db.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM recordings
      WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);
    return result.rows;
  },

  // Recent activity feed
  async getRecentActivity(limit = 20) {
    const result = await db.query(`
      SELECT
        'recording' as type,
        r.id,
        u.username,
        t.name as track_name,
        r.created_at
      FROM recordings r
      JOIN users u ON r.driver_id = u.id
      LEFT JOIN tracks t ON r.track_id = t.id
      WHERE r.deleted_at IS NULL
      ORDER BY r.created_at DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  },

  // Average speeds and lap times
  async getPerformanceMetrics() {
    const result = await db.query(`
      SELECT
        AVG(max_speed) as avg_max_speed,
        AVG(total_distance) as avg_distance,
        AVG(number_of_laps) as avg_laps_per_recording,
        (SELECT AVG(lap_time) FROM laps WHERE lap_time > 0) as avg_lap_time
      FROM recordings
      WHERE deleted_at IS NULL AND max_speed IS NOT NULL
    `);
    return result.rows[0];
  },

  // Events statistics
  async getEventsStats() {
    const result = await db.query(`
      SELECT
        COUNT(*) as total_events,
        SUM(recording_count) as total_event_recordings,
        SUM(driver_count) as total_event_drivers,
        AVG(recording_count) as avg_recordings_per_event
      FROM events
      WHERE deleted_at IS NULL
    `);
    return result.rows[0];
  }
};

module.exports = queries;
