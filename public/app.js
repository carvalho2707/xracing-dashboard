// Chart.js default config
Chart.defaults.color = '#8B949E';
Chart.defaults.borderColor = 'rgba(48, 54, 61, 0.5)';

// Utility functions
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num?.toLocaleString() || '0';
}

function formatDistance(meters) {
  if (meters >= 1000000) return (meters / 1000).toFixed(0).toLocaleString() + ' km';
  if (meters >= 1000) return (meters / 1000).toFixed(1) + ' km';
  return meters?.toFixed(0) + ' m';
}

function formatDuration(ms) {
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return days + ' days';
  if (hours > 0) return hours + ' hours';
  const minutes = Math.floor(ms / 60000);
  return minutes + ' min';
}

function formatMonth(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
  return formatDate(dateStr);
}

// Chart instances
let userGrowthChart, recordingActivityChart, dailyRecordingsChart, geoChart;

// Fetch all data
async function fetchData(endpoint) {
  try {
    const response = await fetch(`/api/${endpoint}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return null;
  }
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
  const images = parseInt(data.total_images) || 0;
  const videos = parseInt(data.total_videos) || 0;
  document.getElementById('mediaBreakdown').textContent = `${formatNumber(images)} images, ${formatNumber(videos)} videos`;
}

// Format growth percentage with color
function formatGrowth(percent) {
  if (percent === null || percent === undefined) return { text: 'N/A', class: 'text-racing-muted' };
  const value = parseFloat(percent);
  if (value > 0) return { text: `+${value}%`, class: 'text-green-400' };
  if (value < 0) return { text: `${value}%`, class: 'text-red-400' };
  return { text: '0%', class: 'text-racing-muted' };
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

// Create user growth chart
async function createUserGrowthChart() {
  const data = await fetchData('user-growth');
  if (!data || data.length === 0) return;

  const ctx = document.getElementById('userGrowthChart').getContext('2d');

  if (userGrowthChart) userGrowthChart.destroy();

  userGrowthChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => formatMonth(d.month)),
      datasets: [{
        label: 'New Users',
        data: data.map(d => parseInt(d.count)),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(48, 54, 61, 0.3)' }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

// Create recording activity chart
async function createRecordingActivityChart() {
  const data = await fetchData('recording-activity');
  if (!data || data.length === 0) return;

  const ctx = document.getElementById('recordingActivityChart').getContext('2d');

  if (recordingActivityChart) recordingActivityChart.destroy();

  recordingActivityChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => formatMonth(d.month)),
      datasets: [{
        label: 'Recordings',
        data: data.map(d => parseInt(d.count)),
        backgroundColor: 'rgba(229, 57, 53, 0.8)',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(48, 54, 61, 0.3)' }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

// Create daily recordings chart
async function createDailyRecordingsChart() {
  const data = await fetchData('daily-recordings');
  if (!data || data.length === 0) return;

  const ctx = document.getElementById('dailyRecordingsChart').getContext('2d');

  if (dailyRecordingsChart) dailyRecordingsChart.destroy();

  dailyRecordingsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => formatDate(d.date)),
      datasets: [{
        label: 'Daily Recordings',
        data: data.map(d => parseInt(d.count)),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(48, 54, 61, 0.3)' }
        },
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 10 }
        }
      }
    }
  });
}

// Create geographic chart
async function createGeoChart() {
  const data = await fetchData('geographic');
  if (!data || data.length === 0) return;

  const ctx = document.getElementById('geoChart').getContext('2d');

  if (geoChart) geoChart.destroy();

  const colors = [
    '#E53935', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  geoChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.location_country || 'Unknown'),
      datasets: [{
        data: data.map(d => parseInt(d.count)),
        backgroundColor: data.map((_, i) => colors[i % colors.length]),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 12,
            padding: 8,
            font: { size: 11 }
          }
        }
      }
    }
  });
}

// Update top tracks table
async function updateTopTracks() {
  const data = await fetchData('top-tracks');
  if (!data) return;

  const tbody = document.getElementById('topTracksTable');
  tbody.innerHTML = data.map((track, i) => `
    <tr class="border-b border-racing-border/50 hover:bg-racing-border/20">
      <td class="py-3 px-2 text-racing-muted">${i + 1}</td>
      <td class="py-3 px-2">
        <span class="text-white font-medium">${track.name || 'Unnamed'}</span>
        <span class="ml-2 text-xs px-2 py-0.5 rounded ${track.type === 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}">
          ${track.type === 0 ? 'Open' : 'Closed'}
        </span>
      </td>
      <td class="py-3 px-2 text-racing-muted text-sm">
        ${track.location_city ? `${track.location_city}, ` : ''}${track.location_country || '-'}
      </td>
      <td class="py-3 px-2 text-right text-white">${formatNumber(parseInt(track.recordings_count))}</td>
      <td class="py-3 px-2 text-right text-racing-muted">${formatNumber(parseInt(track.unique_drivers_count))}</td>
    </tr>
  `).join('');
}

// Update top drivers table
async function updateTopDrivers() {
  const data = await fetchData('top-drivers');
  if (!data) return;

  const tbody = document.getElementById('topDriversTable');
  tbody.innerHTML = data.map((driver, i) => `
    <tr class="border-b border-racing-border/50 hover:bg-racing-border/20">
      <td class="py-3 px-2 text-racing-muted">${i + 1}</td>
      <td class="py-3 px-2">
        <span class="text-white font-medium">
          ${driver.username || `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Anonymous'}
        </span>
      </td>
      <td class="py-3 px-2 text-right text-white">${formatNumber(parseInt(driver.total_recordings))}</td>
      <td class="py-3 px-2 text-right text-racing-muted">${formatNumber(parseInt(driver.tracks_raced))}</td>
      <td class="py-3 px-2 text-right text-racing-muted">${formatNumber(parseInt(driver.follower_count))}</td>
    </tr>
  `).join('');
}

// Update recent activity
async function updateRecentActivity() {
  const data = await fetchData('recent-activity');
  if (!data) return;

  const container = document.getElementById('recentActivity');
  container.innerHTML = data.map(activity => `
    <div class="flex items-center justify-between p-3 rounded-lg bg-racing-dark/50 hover:bg-racing-border/30 transition-colors">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-racing-red/20 rounded-full flex items-center justify-center">
          <svg class="w-4 h-4 text-racing-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
        </div>
        <div>
          <p class="text-white text-sm">
            <span class="font-medium">${activity.username || 'Anonymous'}</span>
            <span class="text-racing-muted"> recorded at </span>
            <span class="font-medium">${activity.track_name || 'Unknown track'}</span>
          </p>
        </div>
      </div>
      <span class="text-racing-muted text-xs">${timeAgo(activity.created_at)}</span>
    </div>
  `).join('');
}

// Refresh all data
async function refreshData() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');

  await Promise.all([
    updateOverview(),
    updateSocialMetrics(),
    updateMediaStats(),
    updateGrowthRates(),
    createUserGrowthChart(),
    createRecordingActivityChart(),
    createDailyRecordingsChart(),
    createGeoChart(),
    updateTopTracks(),
    updateTopDrivers(),
    updateRecentActivity()
  ]);

  document.getElementById('loading').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
}

// Initialize
document.addEventListener('DOMContentLoaded', refreshData);

// Auto-refresh every 5 minutes
setInterval(refreshData, 300000);
