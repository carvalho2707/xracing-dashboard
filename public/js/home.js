// Home page specific JavaScript

let usersSparkline, recordingsSparkline;

// Update live recordings count in header (from RTDB)
async function updateLiveCount() {
  const data = await fetchData('rtdb/live');
  if (!data) return;

  const liveCount = data.totals?.liveRecordingsCount || 0;
  document.getElementById('headerLiveCount').textContent = liveCount;
}

// Update overview stats
async function updateOverview() {
  const data = await fetchData('overview');
  if (!data) return;

  document.getElementById('totalUsers').textContent = formatNumber(parseInt(data.total_users));
  document.getElementById('newUsers7d').textContent = `+${formatNumber(parseInt(data.new_users_7d))} this week`;
  document.getElementById('totalRecordings').textContent = formatNumber(parseInt(data.total_recordings));
  document.getElementById('recordings30d').textContent = `+${formatNumber(parseInt(data.recordings_30d))} last 30 days`;
  document.getElementById('totalTracks').textContent = formatNumber(parseInt(data.total_tracks));
  document.getElementById('totalEvents').textContent = formatNumber(parseInt(data.total_events));
  document.getElementById('totalDistance').textContent = formatDistance(parseFloat(data.total_distance_meters));
  document.getElementById('totalTime').textContent = formatDuration(parseInt(data.total_time_ms));
}

// Update social metrics
async function updateSocialMetrics() {
  const data = await fetchData('social-metrics');
  if (!data) return;

  document.getElementById('totalLikes').textContent = formatNumber(parseInt(data.total_likes));
  document.getElementById('totalComments').textContent = formatNumber(parseInt(data.total_comments));
}

// Update media stats
async function updateMediaStats() {
  const data = await fetchData('media-stats');
  if (!data) return;

  document.getElementById('totalMedia').textContent = formatNumber(parseInt(data.total_media));
}

// Update growth rates
async function updateGrowthRates() {
  const data = await fetchData('growth-rates');
  if (!data) return;

  // Users WoW
  const usersWow = formatGrowth(data.users_wow_percent);
  document.getElementById('usersWow').textContent = usersWow.text;
  document.getElementById('usersWow').className = `text-3xl font-bold ${usersWow.class}`;
  document.getElementById('usersWowDetail').textContent = `${data.users_this_week || 0} vs ${data.users_last_week || 0}`;

  // Users MoM
  const usersMom = formatGrowth(data.users_mom_percent);
  document.getElementById('usersMom').textContent = usersMom.text;
  document.getElementById('usersMom').className = `text-3xl font-bold ${usersMom.class}`;
  document.getElementById('usersMomDetail').textContent = `${data.users_this_month || 0} vs ${data.users_last_month || 0}`;

  // Recordings WoW
  const recordingsWow = formatGrowth(data.recordings_wow_percent);
  document.getElementById('recordingsWow').textContent = recordingsWow.text;
  document.getElementById('recordingsWow').className = `text-3xl font-bold ${recordingsWow.class}`;
  document.getElementById('recordingsWowDetail').textContent = `${data.recordings_this_week || 0} vs ${data.recordings_last_week || 0}`;

  // Recordings MoM
  const recordingsMom = formatGrowth(data.recordings_mom_percent);
  document.getElementById('recordingsMom').textContent = recordingsMom.text;
  document.getElementById('recordingsMom').className = `text-3xl font-bold ${recordingsMom.class}`;
  document.getElementById('recordingsMomDetail').textContent = `${data.recordings_this_month || 0} vs ${data.recordings_last_month || 0}`;
}

// Update views stats
async function updateViewsStats() {
  const data = await fetchData('views-stats');
  if (!data) return;

  document.getElementById('totalRecordingViews').textContent = formatNumber(parseInt(data.recording_total_views) || 0);
  document.getElementById('totalRecordingLiveViews').textContent = formatNumber(parseInt(data.recording_live_views) || 0);
  document.getElementById('totalEventViews').textContent = formatNumber(parseInt(data.event_total_views) || 0);
  document.getElementById('totalEventLiveViews').textContent = formatNumber(parseInt(data.event_live_views) || 0);
}

// Update user engagement stats
async function updateEngagement() {
  const data = await fetchData('user-engagement');
  if (!data) return;

  const totalUsers = parseInt(data.total_users) || 0;
  const activeUsers = parseInt(data.active_users) || 0;
  const activePercent = totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0;
  document.getElementById('activeUsersPercent').textContent = `${activePercent}%`;
}

// Create users sparkline chart
async function createUsersSparkline() {
  const data = await fetchData('user-growth');
  if (!data || data.length === 0) return;

  const ctx = document.getElementById('usersSparkline')?.getContext('2d');
  if (!ctx) return;

  if (usersSparkline) usersSparkline.destroy();

  // Take last 6 months for sparkline
  const recentData = data.slice(-6);

  usersSparkline = new Chart(ctx, {
    type: 'line',
    data: {
      labels: recentData.map(d => formatMonth(d.month)),
      datasets: [{
        data: recentData.map(d => parseInt(d.count)),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      scales: {
        x: { display: false },
        y: { display: false }
      }
    }
  });
}

// Create recordings sparkline chart
async function createRecordingsSparkline() {
  const data = await fetchData('recording-activity');
  if (!data || data.length === 0) return;

  const ctx = document.getElementById('recordingsSparkline')?.getContext('2d');
  if (!ctx) return;

  if (recordingsSparkline) recordingsSparkline.destroy();

  // Take last 6 months for sparkline
  const recentData = data.slice(-6);

  recordingsSparkline = new Chart(ctx, {
    type: 'line',
    data: {
      labels: recentData.map(d => formatMonth(d.month)),
      datasets: [{
        data: recentData.map(d => parseInt(d.count)),
        borderColor: '#E53935',
        backgroundColor: 'rgba(229, 57, 53, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      scales: {
        x: { display: false },
        y: { display: false }
      }
    }
  });
}

// Refresh all data
async function refreshData() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');

  await Promise.all([
    updateLiveCount(),
    updateOverview(),
    updateSocialMetrics(),
    updateMediaStats(),
    updateGrowthRates(),
    updateViewsStats(),
    updateEngagement(),
    createUsersSparkline(),
    createRecordingsSparkline()
  ]);

  document.getElementById('loading').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
}

// Initialize
document.addEventListener('DOMContentLoaded', refreshData);

// Auto-refresh every 5 minutes
setInterval(refreshData, 300000);

// Refresh live count every 30 seconds
setInterval(updateLiveCount, 30000);
