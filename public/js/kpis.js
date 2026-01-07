// KPIs page specific JavaScript

// Chart instances
let totalUsersChart, newUsersChart, recordingActivityChart, dailyRecordingsChart, geoChart, engagementChart;

// Map instances
let heatmapMap = null;
let heatmapLayer = null;

// Update views stats
async function updateViewsStats() {
  const data = await fetchData('views-stats');
  if (!data) return;

  document.getElementById('totalRecordingViews').textContent = formatNumber(parseInt(data.recording_total_views) || 0);
  document.getElementById('totalRecordingLiveViews').textContent = formatNumber(parseInt(data.recording_live_views) || 0);
  document.getElementById('totalEventViews').textContent = formatNumber(parseInt(data.event_total_views) || 0);
  document.getElementById('totalEventLiveViews').textContent = formatNumber(parseInt(data.event_live_views) || 0);
}

// Create total users chart (cumulative)
async function createTotalUsersChart() {
  const data = await fetchData('cumulative-user-growth');
  if (!data || data.length === 0) return;

  const ctx = document.getElementById('totalUsersChart').getContext('2d');

  if (totalUsersChart) totalUsersChart.destroy();

  totalUsersChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => formatMonth(d.month)),
      datasets: [{
        label: 'Total Users',
        data: data.map(d => parseInt(d.cumulative_total)),
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
          grid: { color: 'rgba(48, 54, 61, 0.3)' }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

// Create new users per month chart
async function createNewUsersChart() {
  const data = await fetchData('user-growth');
  if (!data || data.length === 0) return;

  const ctx = document.getElementById('newUsersChart').getContext('2d');

  if (newUsersChart) newUsersChart.destroy();

  newUsersChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => formatMonth(d.month)),
      datasets: [{
        label: 'New Users',
        data: data.map(d => parseInt(d.count)),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
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

// Create user engagement chart
async function createEngagementChart() {
  const data = await fetchData('user-engagement');
  if (!data) return;

  // Update KPI values
  const totalUsers = parseInt(data.total_users) || 0;
  const activeUsers = parseInt(data.active_users) || 0;
  const activePercent = totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0;
  document.getElementById('activeUsersPercent').textContent = `${activePercent}%`;
  document.getElementById('avgRecordingsActive').textContent = data.avg_recordings_active_users || '0';

  const ctx = document.getElementById('engagementChart').getContext('2d');

  if (engagementChart) engagementChart.destroy();

  const labels = ['0', '1', '2-5', '6-20', '21-50', '51+'];
  const values = [
    parseInt(data.users_0_recordings) || 0,
    parseInt(data.users_1_recording) || 0,
    parseInt(data.users_2_5_recordings) || 0,
    parseInt(data.users_6_20_recordings) || 0,
    parseInt(data.users_21_50_recordings) || 0,
    parseInt(data.users_51_plus_recordings) || 0
  ];

  engagementChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Users',
        data: values,
        backgroundColor: [
          'rgba(107, 114, 128, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)'
        ],
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
          grid: { display: false },
          title: {
            display: true,
            text: 'Recordings',
            color: '#8B949E'
          }
        }
      }
    }
  });
}

// Toggle heatmap fullscreen
function toggleHeatmapFullscreen() {
  const card = document.getElementById('heatmapCard');
  const expandIcon = document.getElementById('heatmapExpandIcon');
  const shrinkIcon = document.getElementById('heatmapShrinkIcon');

  card.classList.toggle('fullscreen');
  expandIcon.classList.toggle('hidden');
  shrinkIcon.classList.toggle('hidden');

  // Invalidate map size after transition
  setTimeout(() => {
    if (heatmapMap) {
      heatmapMap.invalidateSize();
    }
  }, 100);
}

// Close fullscreen on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const card = document.getElementById('heatmapCard');
    if (card && card.classList.contains('fullscreen')) {
      toggleHeatmapFullscreen();
    }
  }
});

// Create/update heatmap
async function createHeatmap() {
  const data = await fetchData('heatmap-locations');
  if (!data || data.length === 0) {
    document.getElementById('heatmapCount').textContent = '0 locations';
    return;
  }

  document.getElementById('heatmapCount').textContent = `${formatNumber(data.length)} locations`;

  // Convert to heatmap format: [lat, lng, intensity]
  const heatData = data.map(d => [parseFloat(d.lat), parseFloat(d.lng), 1]);

  // Initialize map if not already done
  if (!heatmapMap) {
    heatmapMap = L.map('heatmap', {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([40, 0], 2);

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(heatmapMap);
  }

  // Remove existing heatmap layer if present
  if (heatmapLayer) {
    heatmapMap.removeLayer(heatmapLayer);
  }

  // Add heatmap layer
  heatmapLayer = L.heatLayer(heatData, {
    radius: 20,
    blur: 15,
    maxZoom: 10,
    max: 1,
    gradient: {
      0.0: '#0D1117',
      0.2: '#3B82F6',
      0.4: '#10B981',
      0.6: '#F59E0B',
      0.8: '#E53935',
      1.0: '#FFFFFF'
    }
  }).addTo(heatmapMap);

  // Fit bounds to data if we have points
  if (heatData.length > 0) {
    const bounds = L.latLngBounds(heatData.map(d => [d[0], d[1]]));
    heatmapMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
  }
}

// Refresh all data
async function refreshData() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');

  await Promise.all([
    updateViewsStats(),
    createTotalUsersChart(),
    createNewUsersChart(),
    createRecordingActivityChart(),
    createDailyRecordingsChart(),
    createGeoChart(),
    createEngagementChart()
  ]);

  document.getElementById('loading').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');

  // Create heatmap after dashboard is visible (needs container dimensions)
  await createHeatmap();
}

// Initialize
document.addEventListener('DOMContentLoaded', refreshData);

// Auto-refresh every 5 minutes
setInterval(refreshData, 300000);
