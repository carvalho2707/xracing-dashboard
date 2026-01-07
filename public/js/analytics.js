// Analytics page specific JavaScript (GA4)

let dailyUsersChart, engagementChart, trafficChart, countryChart;

// Format duration (seconds to readable)
function formatDurationSeconds(seconds) {
  if (seconds >= 3600) {
    return Math.floor(seconds / 3600) + 'h ' + Math.floor((seconds % 3600) / 60) + 'm';
  }
  if (seconds >= 60) {
    return Math.floor(seconds / 60) + 'm ' + Math.floor(seconds % 60) + 's';
  }
  return Math.floor(seconds) + 's';
}

// Format GA4 date (YYYYMMDD to readable)
function formatGA4Date(dateStr) {
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Update DAU/WAU/MAU
async function updateActiveUsers() {
  const data = await fetchData('ga4/active-users');
  if (!data) return;

  document.getElementById('dauCount').textContent = formatNumber(data.dau);
  document.getElementById('wauCount').textContent = formatNumber(data.wau);
  document.getElementById('mauCount').textContent = formatNumber(data.mau);
}

// Update overview stats
async function updateOverview() {
  const data = await fetchData('ga4/overview');
  if (!data) return;

  document.getElementById('totalSessions').textContent = formatNumber(data.sessions);
  document.getElementById('screenViews').textContent = formatNumber(data.screenViews);
  document.getElementById('avgSession').textContent = formatDurationSeconds(data.avgSessionDuration);
  document.getElementById('newUsers').textContent = formatNumber(data.newUsers);
}

// Update retention stats
async function updateRetention() {
  const data = await fetchData('ga4/retention');
  if (!data) return;

  document.getElementById('retentionNew').textContent = formatNumber(data.new);
  document.getElementById('retentionReturning').textContent = formatNumber(data.returning);
  document.getElementById('retentionNewSessions').textContent = formatNumber(data.newSessions);
  document.getElementById('retentionReturnSessions').textContent = formatNumber(data.returningSessions);
}

// Create daily users chart
async function createDailyUsersChart() {
  const data = await fetchData('ga4/daily-users?days=30');
  if (!data || data.length === 0) return;

  const ctx = document.getElementById('dailyUsersChart').getContext('2d');
  if (dailyUsersChart) dailyUsersChart.destroy();

  dailyUsersChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => formatGA4Date(d.date)),
      datasets: [
        {
          label: 'Active Users',
          data: data.map(d => d.activeUsers),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 2
        },
        {
          label: 'New Users',
          data: data.map(d => d.newUsers),
          borderColor: '#10B981',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0.4,
          pointRadius: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { boxWidth: 12, padding: 15 }
        }
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

// Create engagement chart
async function createEngagementChart() {
  const data = await fetchData('ga4/engagement?days=14');
  if (!data || data.length === 0) return;

  const ctx = document.getElementById('engagementChart').getContext('2d');
  if (engagementChart) engagementChart.destroy();

  engagementChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => formatGA4Date(d.date)),
      datasets: [{
        label: 'Engagement Rate %',
        data: data.map(d => parseFloat(d.engagementRate)),
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
          max: 100,
          grid: { color: 'rgba(48, 54, 61, 0.3)' },
          ticks: { callback: v => v + '%' }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

// Create traffic sources chart
async function createTrafficChart() {
  const data = await fetchData('ga4/traffic');
  if (!data || data.length === 0) return;

  const ctx = document.getElementById('trafficChart').getContext('2d');
  if (trafficChart) trafficChart.destroy();

  const colors = ['#E53935', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  trafficChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.channel),
      datasets: [{
        data: data.map(d => d.sessions),
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
          labels: { boxWidth: 12, padding: 10, font: { size: 11 } }
        }
      }
    }
  });
}

// Create country chart
async function createCountryChart() {
  const data = await fetchData('ga4/countries?limit=10');
  if (!data || data.length === 0) return;

  const ctx = document.getElementById('countryChart').getContext('2d');
  if (countryChart) countryChart.destroy();

  countryChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.country),
      datasets: [{
        label: 'Users',
        data: data.map(d => d.users),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: 'rgba(48, 54, 61, 0.3)' }
        },
        y: {
          grid: { display: false }
        }
      }
    }
  });
}

// Update top events table
async function updateTopEvents() {
  const data = await fetchData('ga4/events?limit=15');
  if (!data) return;

  const tbody = document.getElementById('topEventsTable');
  tbody.innerHTML = data.map(event => `
    <tr class="border-b border-racing-border/50 hover:bg-racing-border/20">
      <td class="py-2 px-2">
        <span class="text-white text-sm font-mono">${event.eventName}</span>
      </td>
      <td class="py-2 px-2 text-right text-white">${formatNumber(event.count)}</td>
      <td class="py-2 px-2 text-right text-racing-muted">${formatNumber(event.users)}</td>
    </tr>
  `).join('');
}

// Update top screens table
async function updateTopScreens() {
  const data = await fetchData('ga4/screens?limit=15');
  if (!data) return;

  const tbody = document.getElementById('topScreensTable');
  tbody.innerHTML = data.map(screen => `
    <tr class="border-b border-racing-border/50 hover:bg-racing-border/20">
      <td class="py-2 px-2">
        <span class="text-white text-sm">${screen.screen || '(not set)'}</span>
      </td>
      <td class="py-2 px-2 text-right text-white">${formatNumber(screen.views)}</td>
      <td class="py-2 px-2 text-right text-racing-muted">${formatNumber(screen.users)}</td>
    </tr>
  `).join('');
}

// Refresh all data
async function refreshData() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');

  await Promise.all([
    updateActiveUsers(),
    updateOverview(),
    updateRetention(),
    createDailyUsersChart(),
    createEngagementChart(),
    createTrafficChart(),
    createCountryChart(),
    updateTopEvents(),
    updateTopScreens()
  ]);

  document.getElementById('loading').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
}

// Initialize
document.addEventListener('DOMContentLoaded', refreshData);

// Auto-refresh every 5 minutes
setInterval(refreshData, 300000);
