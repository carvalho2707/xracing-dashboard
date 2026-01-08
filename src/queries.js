const db = require('./db');

const queries = {
  // Live recordings count (status = 0 is LIVE, 1 = UPLOADING, 2 = ENDED today)
  async getLiveRecordings() {
    const result = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 0) as live_count,
        COUNT(DISTINCT driver_id) FILTER (WHERE status = 0) as live_drivers,
        COUNT(DISTINCT track_id) FILTER (WHERE status = 0) as live_tracks,
        COUNT(*) FILTER (WHERE status = 1) as uploading_count,
        COUNT(*) FILTER (WHERE status = 2 AND created_at >= CURRENT_DATE) as ended_count
      FROM recordings
      WHERE deleted_at IS NULL
    `);
    return result.rows[0];
  },

  // Live monitoring - recordings from current day
  async getLiveMonitoring(limit = 50) {
    const result = await db.query(`
      SELECT
        r.id,
        u.username,
        u.first_name,
        u.last_name,
        r.status,
        r.created_at as start_time,
        t.name as track_name,
        r.location_city,
        r.location_country
      FROM recordings r
      JOIN users u ON r.driver_id = u.id
      LEFT JOIN tracks t ON r.track_id = t.id
      WHERE r.deleted_at IS NULL
        AND r.created_at >= CURRENT_DATE
      ORDER BY r.created_at DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
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

  // Cumulative total recordings over time (last 12 months)
  async getCumulativeRecordingGrowth() {
    const result = await db.query(`
      WITH monthly_counts AS (
        SELECT
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as new_recordings
        FROM recordings
        WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
      ),
      recordings_before AS (
        SELECT COUNT(*) as count
        FROM recordings
        WHERE deleted_at IS NULL AND created_at < DATE_TRUNC('month', NOW() - INTERVAL '11 months')
      )
      SELECT
        mc.month,
        mc.new_recordings,
        rb.count + SUM(mc.new_recordings) OVER (ORDER BY mc.month) as cumulative_total
      FROM monthly_counts mc, recordings_before rb
      ORDER BY mc.month
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

  // Likes per month (last 12 months)
  async getLikesActivity() {
    const result = await db.query(`
      SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count
      FROM likes
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `);
    return result.rows;
  },

  // Comments per month (last 12 months)
  async getCommentsActivity() {
    const result = await db.query(`
      SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count
      FROM comments
      WHERE deleted = false AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `);
    return result.rows;
  },

  // Media uploads per month (last 12 months)
  async getMediaActivity() {
    const result = await db.query(`
      SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count
      FROM media
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `);
    return result.rows;
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

  // Recent users
  async getRecentUsers(limit = 10) {
    const result = await db.query(`
      SELECT
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.email,
        u.created_at
      FROM users u
      ORDER BY u.created_at DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  },

  // Recent tracks
  async getRecentTracks(limit = 10) {
    const result = await db.query(`
      SELECT
        t.id,
        t.name,
        t.location_city,
        t.location_country,
        t.type,
        u.username as created_by_username,
        t.created_at
      FROM tracks t
      LEFT JOIN users u ON t.creator_id = u.id
      ORDER BY t.created_at DESC
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
  },

  // Views summary stats
  async getViewsStats() {
    const result = await db.query(`
      SELECT
        COALESCE(SUM(r.total_views), 0) as total_recording_views,
        COALESCE(SUM(r.live_views), 0) as total_recording_live_views,
        COALESCE(SUM(e.total_views), 0) as total_event_views,
        COALESCE(SUM(e.live_views), 0) as total_event_live_views
      FROM recordings r
      FULL OUTER JOIN events e ON false
      WHERE r.deleted_at IS NULL OR e.deleted_at IS NULL
    `);
    // Need separate queries for accurate results
    const recordingsResult = await db.query(`
      SELECT
        COALESCE(SUM(total_views), 0) as total_views,
        COALESCE(SUM(live_views), 0) as live_views
      FROM recordings
      WHERE deleted_at IS NULL
    `);
    const eventsResult = await db.query(`
      SELECT
        COALESCE(SUM(total_views), 0) as total_views,
        COALESCE(SUM(live_views), 0) as live_views
      FROM events
      WHERE deleted_at IS NULL
    `);
    return {
      recording_total_views: recordingsResult.rows[0].total_views,
      recording_live_views: recordingsResult.rows[0].live_views,
      event_total_views: eventsResult.rows[0].total_views,
      event_live_views: eventsResult.rows[0].live_views
    };
  },

  // Top recordings by total views
  async getTopViewedRecordings(limit = 10) {
    const result = await db.query(`
      SELECT
        r.id,
        r.total_views,
        r.live_views,
        r.like_count,
        r.comment_count,
        u.username as driver_username,
        u.first_name as driver_first_name,
        u.last_name as driver_last_name,
        t.name as track_name,
        r.location_city,
        r.location_country,
        r.created_at
      FROM recordings r
      JOIN users u ON r.driver_id = u.id
      LEFT JOIN tracks t ON r.track_id = t.id
      WHERE r.deleted_at IS NULL AND r.total_views > 0
      ORDER BY r.total_views DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  },

  // Top recordings by live views (noTrack recordings)
  async getTopLiveViewedRecordings(limit = 10) {
    const result = await db.query(`
      SELECT
        r.id,
        r.total_views,
        r.live_views,
        r.like_count,
        r.comment_count,
        u.username as driver_username,
        u.first_name as driver_first_name,
        u.last_name as driver_last_name,
        r.location_city,
        r.location_country,
        r.created_at
      FROM recordings r
      JOIN users u ON r.driver_id = u.id
      WHERE r.deleted_at IS NULL
        AND r.live_views > 0
        AND r.track_id IS NULL
      ORDER BY r.live_views DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  },

  // Top events by total views
  async getTopViewedEvents(limit = 10) {
    const result = await db.query(`
      SELECT
        e.id,
        e.total_views,
        e.live_views,
        e.like_count,
        e.comment_count,
        e.recording_count,
        e.driver_count,
        t.name as track_name,
        t.location_city,
        t.location_country,
        e.created_at
      FROM events e
      JOIN tracks t ON e.track_id = t.id
      WHERE e.deleted_at IS NULL AND e.total_views > 0
      ORDER BY e.total_views DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  },

  // Top events by live views
  async getTopLiveViewedEvents(limit = 10) {
    const result = await db.query(`
      SELECT
        e.id,
        e.total_views,
        e.live_views,
        e.like_count,
        e.comment_count,
        e.recording_count,
        e.driver_count,
        t.name as track_name,
        t.location_city,
        t.location_country,
        e.created_at
      FROM events e
      JOIN tracks t ON e.track_id = t.id
      WHERE e.deleted_at IS NULL AND e.live_views > 0
      ORDER BY e.live_views DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  },

  // ============================================
  // PRODUCT ANALYTICS - Tier 1: Survival Metrics
  // ============================================

  // Activation rate: % of users who completed at least 1 recording
  async getActivationMetrics() {
    const result = await db.query(`
      WITH user_activation AS (
        SELECT
          u.id,
          u.created_at as signup_date,
          MIN(r.created_at) as first_recording_date,
          CASE WHEN COUNT(r.id) > 0 THEN true ELSE false END as is_activated
        FROM users u
        LEFT JOIN recordings r ON u.id = r.driver_id AND r.deleted_at IS NULL AND r.status = 2
        GROUP BY u.id, u.created_at
      )
      SELECT
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE is_activated) as activated_users,
        ROUND(COUNT(*) FILTER (WHERE is_activated)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as activation_rate,
        -- Last 7 days cohort
        COUNT(*) FILTER (WHERE signup_date >= NOW() - INTERVAL '7 days') as signups_7d,
        COUNT(*) FILTER (WHERE signup_date >= NOW() - INTERVAL '7 days' AND is_activated) as activated_7d,
        ROUND(
          COUNT(*) FILTER (WHERE signup_date >= NOW() - INTERVAL '7 days' AND is_activated)::numeric /
          NULLIF(COUNT(*) FILTER (WHERE signup_date >= NOW() - INTERVAL '7 days'), 0) * 100, 1
        ) as activation_rate_7d,
        -- Last 30 days cohort
        COUNT(*) FILTER (WHERE signup_date >= NOW() - INTERVAL '30 days') as signups_30d,
        COUNT(*) FILTER (WHERE signup_date >= NOW() - INTERVAL '30 days' AND is_activated) as activated_30d,
        ROUND(
          COUNT(*) FILTER (WHERE signup_date >= NOW() - INTERVAL '30 days' AND is_activated)::numeric /
          NULLIF(COUNT(*) FILTER (WHERE signup_date >= NOW() - INTERVAL '30 days'), 0) * 100, 1
        ) as activation_rate_30d
      FROM user_activation
    `);
    return result.rows[0];
  },

  // D1/D7/D30 Retention - cohort based
  async getRetentionCohorts() {
    const result = await db.query(`
      WITH user_cohorts AS (
        SELECT
          u.id as user_id,
          u.created_at::date as signup_date,
          DATE_TRUNC('day', NOW())::date - u.created_at::date as days_since_signup
        FROM users u
      ),
      user_activity AS (
        SELECT
          uc.user_id,
          uc.signup_date,
          uc.days_since_signup,
          -- Check if user had any recording on day 1 (next day after signup)
          EXISTS (
            SELECT 1 FROM recordings r
            WHERE r.driver_id = uc.user_id
              AND r.deleted_at IS NULL
              AND r.created_at::date = uc.signup_date + INTERVAL '1 day'
          ) as active_d1,
          -- Check if user had any recording between day 1-7
          EXISTS (
            SELECT 1 FROM recordings r
            WHERE r.driver_id = uc.user_id
              AND r.deleted_at IS NULL
              AND r.created_at::date > uc.signup_date
              AND r.created_at::date <= uc.signup_date + INTERVAL '7 days'
          ) as active_d7,
          -- Check if user had any recording between day 1-30
          EXISTS (
            SELECT 1 FROM recordings r
            WHERE r.driver_id = uc.user_id
              AND r.deleted_at IS NULL
              AND r.created_at::date > uc.signup_date
              AND r.created_at::date <= uc.signup_date + INTERVAL '30 days'
          ) as active_d30
        FROM user_cohorts uc
      )
      SELECT
        -- D1 retention (users who signed up 1+ days ago)
        COUNT(*) FILTER (WHERE days_since_signup >= 1) as eligible_d1,
        COUNT(*) FILTER (WHERE days_since_signup >= 1 AND active_d1) as retained_d1,
        ROUND(
          COUNT(*) FILTER (WHERE days_since_signup >= 1 AND active_d1)::numeric /
          NULLIF(COUNT(*) FILTER (WHERE days_since_signup >= 1), 0) * 100, 1
        ) as retention_d1,
        -- D7 retention (users who signed up 7+ days ago)
        COUNT(*) FILTER (WHERE days_since_signup >= 7) as eligible_d7,
        COUNT(*) FILTER (WHERE days_since_signup >= 7 AND active_d7) as retained_d7,
        ROUND(
          COUNT(*) FILTER (WHERE days_since_signup >= 7 AND active_d7)::numeric /
          NULLIF(COUNT(*) FILTER (WHERE days_since_signup >= 7), 0) * 100, 1
        ) as retention_d7,
        -- D30 retention (users who signed up 30+ days ago)
        COUNT(*) FILTER (WHERE days_since_signup >= 30) as eligible_d30,
        COUNT(*) FILTER (WHERE days_since_signup >= 30 AND active_d30) as retained_d30,
        ROUND(
          COUNT(*) FILTER (WHERE days_since_signup >= 30 AND active_d30)::numeric /
          NULLIF(COUNT(*) FILTER (WHERE days_since_signup >= 30), 0) * 100, 1
        ) as retention_d30
      FROM user_activity
    `);
    return result.rows[0];
  },

  // DAU/WAU/MAU from database (users who recorded)
  async getActiveUsersDB(days = 7) {
    const result = await db.query(`
      SELECT
        -- DAU: users who recorded today
        COUNT(DISTINCT driver_id) FILTER (WHERE created_at::date = CURRENT_DATE) as dau,
        -- WAU: users who recorded in last 7 days
        COUNT(DISTINCT driver_id) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as wau,
        -- MAU: users who recorded in last 30 days
        COUNT(DISTINCT driver_id) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as mau
      FROM recordings
      WHERE deleted_at IS NULL
    `);
    const row = result.rows[0];
    return {
      dau: parseInt(row.dau) || 0,
      wau: parseInt(row.wau) || 0,
      mau: parseInt(row.mau) || 0,
      stickiness: row.wau > 0 ? Math.round((row.dau / row.wau) * 100) : 0,
      stickiness_mau: row.mau > 0 ? Math.round((row.dau / row.mau) * 100) : 0
    };
  },

  // Daily active users trend (for chart)
  async getDailyActiveUsersTrend(days = 7) {
    const result = await db.query(`
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '${days - 1} days',
          CURRENT_DATE,
          '1 day'::interval
        )::date as date
      ),
      daily_activity AS (
        SELECT
          created_at::date as date,
          COUNT(DISTINCT driver_id) as active_users
        FROM recordings
        WHERE deleted_at IS NULL
          AND created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY created_at::date
      ),
      daily_signups AS (
        SELECT
          created_at::date as date,
          COUNT(*) as new_users
        FROM users
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY created_at::date
      )
      SELECT
        ds.date,
        COALESCE(da.active_users, 0) as active_users,
        COALESCE(dns.new_users, 0) as new_users
      FROM date_series ds
      LEFT JOIN daily_activity da ON ds.date = da.date
      LEFT JOIN daily_signups dns ON ds.date = dns.date
      ORDER BY ds.date
    `, []);
    return result.rows;
  },

  // ============================================
  // PRODUCT ANALYTICS - Tier 2: Growth Health
  // ============================================

  // Daily signups trend
  async getDailySignups(days = 7) {
    const result = await db.query(`
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '${days - 1} days',
          CURRENT_DATE,
          '1 day'::interval
        )::date as date
      )
      SELECT
        ds.date,
        COUNT(u.id) as signups
      FROM date_series ds
      LEFT JOIN users u ON u.created_at::date = ds.date
      GROUP BY ds.date
      ORDER BY ds.date
    `, []);
    return result.rows;
  },

  // Recordings per active user
  async getRecordingsPerUser() {
    const result = await db.query(`
      WITH active_users AS (
        SELECT
          driver_id,
          COUNT(*) as recording_count
        FROM recordings
        WHERE deleted_at IS NULL
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY driver_id
      )
      SELECT
        COUNT(*) as active_users,
        SUM(recording_count) as total_recordings,
        ROUND(AVG(recording_count)::numeric, 2) as avg_recordings_per_user,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY recording_count) as median_recordings,
        MAX(recording_count) as max_recordings
      FROM active_users
    `);
    return result.rows[0];
  },

  // ============================================
  // PRODUCT ANALYTICS - Tier 3: Engagement Depth
  // ============================================

  // Social engagement metrics per active user
  async getSocialEngagementRate() {
    const result = await db.query(`
      WITH active_users AS (
        SELECT DISTINCT driver_id as user_id
        FROM recordings
        WHERE deleted_at IS NULL
          AND created_at >= NOW() - INTERVAL '30 days'
      ),
      social_activity AS (
        SELECT
          (SELECT COUNT(*) FROM likes WHERE created_at >= NOW() - INTERVAL '30 days') as total_likes,
          (SELECT COUNT(*) FROM comments WHERE deleted = false AND created_at >= NOW() - INTERVAL '30 days') as total_comments,
          (SELECT COUNT(*) FROM user_relationships WHERE relationship_type = 'following' AND status = 'active' AND created_at >= NOW() - INTERVAL '30 days') as total_follows
      )
      SELECT
        (SELECT COUNT(*) FROM active_users) as active_users,
        sa.total_likes,
        sa.total_comments,
        sa.total_follows,
        sa.total_likes + sa.total_comments + sa.total_follows as total_social_actions,
        ROUND((sa.total_likes + sa.total_comments + sa.total_follows)::numeric / NULLIF((SELECT COUNT(*) FROM active_users), 0), 2) as actions_per_user
      FROM social_activity sa
    `);
    return result.rows[0];
  },

  // Lookup user by username (for User Timeline feature)
  async getUserByUsername(username) {
    const result = await db.query(`
      SELECT id, username, first_name, last_name, email, created_at
      FROM users
      WHERE username ILIKE $1
      LIMIT 1
    `, [username]);
    return result.rows[0] || null;
  },

  // Get all users for dropdown (sorted by name)
  async getAllUsers() {
    const result = await db.query(`
      SELECT id, username, first_name, last_name
      FROM users
      ORDER BY
        COALESCE(NULLIF(first_name, ''), username) ASC,
        COALESCE(NULLIF(last_name, ''), '') ASC
    `);
    return result.rows;
  },

  // Feature adoption rates
  async getFeatureAdoption() {
    const result = await db.query(`
      WITH total_users AS (
        SELECT COUNT(*) as count FROM users
      ),
      active_users_30d AS (
        SELECT COUNT(DISTINCT driver_id) as count
        FROM recordings
        WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '30 days'
      )
      SELECT
        -- Track creators
        (SELECT COUNT(DISTINCT creator_id) FROM tracks) as track_creators,
        ROUND((SELECT COUNT(DISTINCT creator_id) FROM tracks)::numeric / NULLIF((SELECT count FROM total_users), 0) * 100, 1) as track_creator_rate,
        -- Users who liked something
        (SELECT COUNT(DISTINCT user_id) FROM likes) as users_who_liked,
        ROUND((SELECT COUNT(DISTINCT user_id) FROM likes)::numeric / NULLIF((SELECT count FROM total_users), 0) * 100, 1) as like_adoption_rate,
        -- Users who commented
        (SELECT COUNT(DISTINCT user_id) FROM comments WHERE deleted = false) as users_who_commented,
        ROUND((SELECT COUNT(DISTINCT user_id) FROM comments WHERE deleted = false)::numeric / NULLIF((SELECT count FROM total_users), 0) * 100, 1) as comment_adoption_rate,
        -- Users who follow someone
        (SELECT COUNT(DISTINCT user_id) FROM user_relationships WHERE relationship_type = 'following' AND status = 'active') as users_who_follow,
        ROUND((SELECT COUNT(DISTINCT user_id) FROM user_relationships WHERE relationship_type = 'following' AND status = 'active')::numeric / NULLIF((SELECT count FROM total_users), 0) * 100, 1) as follow_adoption_rate,
        -- Users who uploaded media
        (SELECT COUNT(DISTINCT driver_id) FROM media) as users_with_media,
        ROUND((SELECT COUNT(DISTINCT driver_id) FROM media)::numeric / NULLIF((SELECT count FROM total_users), 0) * 100, 1) as media_adoption_rate
      FROM total_users
    `);
    return result.rows[0];
  },

  // Get track names by IDs (for RTDB enrichment)
  async getTracksByIds(trackIds) {
    if (!trackIds || trackIds.length === 0) return {};

    const result = await db.query(`
      SELECT id, name, location_city, location_country
      FROM tracks
      WHERE id = ANY($1)
    `, [trackIds]);

    // Return as a map: { trackId: { name, location_city, location_country } }
    const trackMap = {};
    result.rows.forEach(row => {
      trackMap[row.id] = {
        name: row.name,
        locationCity: row.location_city,
        locationCountry: row.location_country
      };
    });
    return trackMap;
  },

  // Get recording details by IDs (for RTDB enrichment)
  async getRecordingsByIds(recordingIds) {
    if (!recordingIds || recordingIds.length === 0) return {};

    const result = await db.query(`
      SELECT
        r.id,
        r.status,
        r.created_at,
        u.username,
        u.first_name,
        u.last_name
      FROM recordings r
      JOIN users u ON r.driver_id = u.id
      WHERE r.id = ANY($1)
    `, [recordingIds]);

    // Return as a map: { recordingId: { ... } }
    const recordingMap = {};
    result.rows.forEach(row => {
      recordingMap[row.id] = {
        status: row.status,
        createdAt: row.created_at,
        username: row.username,
        firstName: row.first_name,
        lastName: row.last_name
      };
    });
    return recordingMap;
  }
};

module.exports = queries;
