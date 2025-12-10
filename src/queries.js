const db = require('./db');

const queries = {
  // Live recordings count (status = 0 is LIVE)
  async getLiveRecordings() {
    const result = await db.query(`
      SELECT
        COUNT(*) as live_count,
        COUNT(DISTINCT driver_id) as live_drivers,
        COUNT(DISTINCT track_id) as live_tracks
      FROM recordings
      WHERE status = 0 AND deleted_at IS NULL
    `);
    return result.rows[0];
  },

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

  // New users per month (last 12 months)
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

  // Cumulative total users over time (last 12 months)
  async getCumulativeUserGrowth() {
    const result = await db.query(`
      WITH monthly_counts AS (
        SELECT
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as new_users
        FROM users
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
      ),
      users_before AS (
        SELECT COUNT(*) as count
        FROM users
        WHERE created_at < DATE_TRUNC('month', NOW() - INTERVAL '11 months')
      )
      SELECT
        mc.month,
        mc.new_users,
        ub.count + SUM(mc.new_users) OVER (ORDER BY mc.month) as cumulative_total
      FROM monthly_counts mc, users_before ub
      ORDER BY mc.month
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
        r.location_city,
        r.location_country,
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
  },

  // Media/uploads statistics
  async getMediaStats() {
    const result = await db.query(`
      SELECT
        COUNT(*) as total_media,
        COUNT(*) FILTER (WHERE type = 0) as total_images,
        COUNT(*) FILTER (WHERE type = 1) as total_videos,
        COUNT(*) FILTER (WHERE type = 2) as total_audio,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as media_7d,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as media_30d
      FROM media
    `);
    return result.rows[0];
  },

  // User engagement metrics - recordings per user distribution
  async getUserEngagement() {
    const result = await db.query(`
      WITH user_recording_counts AS (
        SELECT
          u.id,
          COALESCE(us.total_recordings, 0) as recording_count
        FROM users u
        LEFT JOIN user_stats us ON u.id = us.user_id
      )
      SELECT
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE recording_count > 0) as active_users,
        COUNT(*) FILTER (WHERE recording_count = 0) as users_0_recordings,
        COUNT(*) FILTER (WHERE recording_count = 1) as users_1_recording,
        COUNT(*) FILTER (WHERE recording_count BETWEEN 2 AND 5) as users_2_5_recordings,
        COUNT(*) FILTER (WHERE recording_count BETWEEN 6 AND 20) as users_6_20_recordings,
        COUNT(*) FILTER (WHERE recording_count BETWEEN 21 AND 50) as users_21_50_recordings,
        COUNT(*) FILTER (WHERE recording_count > 50) as users_51_plus_recordings,
        ROUND(AVG(recording_count)::numeric, 1) as avg_recordings_all_users,
        ROUND(AVG(recording_count) FILTER (WHERE recording_count > 0)::numeric, 1) as avg_recordings_active_users
      FROM user_recording_counts
    `);
    return result.rows[0];
  },

  // Growth rates (WoW and MoM) for users and recordings
  async getGrowthRates() {
    const result = await db.query(`
      WITH weekly_users AS (
        SELECT
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as this_week,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days') as last_week
        FROM users
      ),
      monthly_users AS (
        SELECT
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as this_month,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days') as last_month
        FROM users
      ),
      weekly_recordings AS (
        SELECT
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as this_week,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days') as last_week
        FROM recordings
        WHERE deleted_at IS NULL
      ),
      monthly_recordings AS (
        SELECT
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as this_month,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days') as last_month
        FROM recordings
        WHERE deleted_at IS NULL
      )
      SELECT
        wu.this_week as users_this_week,
        wu.last_week as users_last_week,
        CASE WHEN wu.last_week > 0 THEN ROUND(((wu.this_week - wu.last_week)::numeric / wu.last_week) * 100, 1) ELSE NULL END as users_wow_percent,
        mu.this_month as users_this_month,
        mu.last_month as users_last_month,
        CASE WHEN mu.last_month > 0 THEN ROUND(((mu.this_month - mu.last_month)::numeric / mu.last_month) * 100, 1) ELSE NULL END as users_mom_percent,
        wr.this_week as recordings_this_week,
        wr.last_week as recordings_last_week,
        CASE WHEN wr.last_week > 0 THEN ROUND(((wr.this_week - wr.last_week)::numeric / wr.last_week) * 100, 1) ELSE NULL END as recordings_wow_percent,
        mr.this_month as recordings_this_month,
        mr.last_month as recordings_last_month,
        CASE WHEN mr.last_month > 0 THEN ROUND(((mr.this_month - mr.last_month)::numeric / mr.last_month) * 100, 1) ELSE NULL END as recordings_mom_percent
      FROM weekly_users wu, monthly_users mu, weekly_recordings wr, monthly_recordings mr
    `);
    return result.rows[0];
  },

  // Heatmap locations - one point per recording
  async getHeatmapLocations() {
    const result = await db.query(`
      SELECT DISTINCT ON (r.id)
        rdp.latitude as lat,
        rdp.longitude as lng
      FROM recordings r
      JOIN recording_data_points rdp ON rdp.recording_id = r.id
      WHERE r.deleted_at IS NULL
        AND rdp.latitude != 0
        AND rdp.longitude != 0
      ORDER BY r.id, rdp.timestamp ASC
    `);
    return result.rows;
  }
};

module.exports = queries;
