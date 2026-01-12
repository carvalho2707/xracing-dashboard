// Web Analytics page JavaScript

let daysFilter = 7;
let trafficChart = null;

// Get source color based on source/medium
function getSourceColor(source, medium) {
  const s = source.toLowerCase();
  const m = medium.toLowerCase();

  if (s === 'google' || s.includes('google')) return 'bg-blue-500';
  if (s === 'facebook' || s === 'instagram' || s === 'meta') return 'bg-indigo-500';
  if (s === 'twitter' || s === 'x') return 'bg-sky-400';
  if (s === 'linkedin') return 'bg-blue-600';
  if (s === 'youtube') return 'bg-red-500';
  if (s === 'tiktok') return 'bg-pink-500';
  if (m === 'organic') return 'bg-green-500';
  if (m === 'cpc' || m === 'paid') return 'bg-yellow-500';
  if (m === 'email') return 'bg-purple-500';
  if (m === 'referral') return 'bg-orange-500';
  if (s === '(direct)') return 'bg-gray-500';

  return 'bg-racing-border';
}

// Format URL for display (remove protocol and trailing slash)
function formatUrl(url) {
  if (!url || url === '(not set)') return '(not set)';
  try {
    const parsed = new URL(url);
    let path = parsed.pathname;
    if (path === '/') return 'Homepage';
    // Remove trailing slash
    if (path.endsWith('/')) path = path.slice(0, -1);
    return path;
  } catch {
    return url;
  }
}

// Format source/medium for display
function formatSourceMedium(source, medium) {
  if (source === '(direct)' && medium === '(none)') return 'Direct';
  if (medium === '(none)' || medium === '(not set)') return source;
  return `${source} / ${medium}`;
}

// Load overview stats
async function loadOverview() {
  const data = await fetchData(`web/overview?days=${daysFilter}`);
  if (!data) return;

  document.getElementById('pageViews').textContent = formatNumber(parseInt(data.page_views) || 0);
  document.getElementById('sessions').textContent = formatNumber(parseInt(data.sessions) || 0);
  document.getElementById('uniqueVisitors').textContent = formatNumber(parseInt(data.unique_visitors) || 0);
  document.getElementById('newVisitors').textContent = formatNumber(parseInt(data.new_visitors) || 0);
  document.getElementById('totalEvents').textContent = formatNumber(parseInt(data.total_events) || 0);

  // Calculate pages per session
  const pageViews = parseInt(data.page_views) || 0;
  const sessions = parseInt(data.sessions) || 1;
  const pagesPerSession = (pageViews / sessions).toFixed(1);
  document.getElementById('pagesPerSession').textContent = pagesPerSession;
}

// Load top pages
async function loadPages() {
  const data = await fetchData(`web/pages?days=${daysFilter}`);
  const container = document.getElementById('topPages');

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-racing-muted">
        No page data available yet
      </div>
    `;
    return;
  }

  const maxViews = Math.max(...data.map(p => p.views));

  container.innerHTML = data.slice(0, 10).map(page => {
    const percentage = (page.views / maxViews * 100).toFixed(0);
    const url = formatUrl(page.pageUrl);

    return `
      <div class="bg-racing-dark/50 rounded-lg p-3">
        <div class="flex items-center justify-between mb-2">
          <div class="flex-1 min-w-0 mr-4">
            <p class="text-sm text-white font-medium truncate" title="${page.pageUrl}">${url}</p>
            <p class="text-xs text-racing-muted truncate">${page.pageTitle || '(no title)'}</p>
          </div>
          <div class="text-right flex-shrink-0">
            <p class="text-sm font-bold text-white">${formatNumber(page.views)}</p>
            <p class="text-xs text-racing-muted">${formatNumber(page.uniqueVisitors)} visitors</p>
          </div>
        </div>
        <div class="source-bar">
          <div class="source-bar-fill bg-racing-red" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// Load traffic sources
async function loadTrafficSources() {
  const data = await fetchData(`web/traffic-sources?days=${daysFilter}`);
  const container = document.getElementById('trafficSources');

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-racing-muted">
        No traffic source data available yet
      </div>
    `;
    return;
  }

  const maxSessions = Math.max(...data.map(s => s.sessions));

  container.innerHTML = data.slice(0, 10).map(source => {
    const percentage = (source.sessions / maxSessions * 100).toFixed(0);
    const label = formatSourceMedium(source.source, source.medium);
    const colorClass = getSourceColor(source.source, source.medium);

    return `
      <div class="bg-racing-dark/50 rounded-lg p-3">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full ${colorClass}"></div>
            <span class="text-sm text-white font-medium">${label}</span>
          </div>
          <div class="text-right">
            <span class="text-sm font-bold text-white">${formatNumber(source.sessions)}</span>
            <span class="text-xs text-racing-muted ml-2">${formatNumber(source.users)} users</span>
          </div>
        </div>
        <div class="source-bar">
          <div class="source-bar-fill ${colorClass}" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// Load engagement metrics
async function loadEngagement() {
  const data = await fetchData(`web/engagement?days=${daysFilter}`);
  const container = document.getElementById('engagement');

  if (!data) {
    container.innerHTML = `
      <div class="col-span-full text-center py-8 text-racing-muted">
        No engagement data available yet
      </div>
    `;
    return;
  }

  const totalClicks = data.clicks.reduce((sum, c) => sum + c.count, 0);
  const formStarts = data.forms.find(f => f.event === 'form_start')?.count || 0;
  const formSubmits = data.forms.find(f => f.event === 'form_submit')?.count || 0;
  const videoStarts = data.videos.find(v => v.event === 'video_start')?.count || 0;

  container.innerHTML = `
    <div class="stat-card rounded-xl p-4 text-center">
      <p class="text-racing-muted text-xs mb-1">Link Clicks</p>
      <p class="text-2xl font-bold text-blue-400">${formatNumber(totalClicks)}</p>
    </div>
    <div class="stat-card rounded-xl p-4 text-center">
      <p class="text-racing-muted text-xs mb-1">Scroll Events</p>
      <p class="text-2xl font-bold text-orange-400">${formatNumber(data.scrolls)}</p>
    </div>
    <div class="stat-card rounded-xl p-4 text-center">
      <p class="text-racing-muted text-xs mb-1">Form Submissions</p>
      <p class="text-2xl font-bold text-green-400">${formatNumber(formSubmits)}</p>
      ${formStarts > 0 ? `<p class="text-xs text-racing-muted">${formStarts} started</p>` : ''}
    </div>
    <div class="stat-card rounded-xl p-4 text-center">
      <p class="text-racing-muted text-xs mb-1">Video Plays</p>
      <p class="text-2xl font-bold text-purple-400">${formatNumber(videoStarts)}</p>
    </div>
  `;
}

// Load and render traffic chart
async function loadTrafficChart() {
  const data = await fetchData(`web/events-over-time?days=${daysFilter}`);

  if (!data || data.length === 0) {
    return;
  }

  const ctx = document.getElementById('trafficChart').getContext('2d');

  // Destroy existing chart if any
  if (trafficChart) {
    trafficChart.destroy();
  }

  trafficChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => formatDate(d.date)),
      datasets: [
        {
          label: 'Page Views',
          data: data.map(d => d.pageViews),
          borderColor: '#E53935',
          backgroundColor: 'rgba(229, 57, 53, 0.1)',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Sessions',
          data: data.map(d => d.sessions),
          borderColor: '#60A5FA',
          backgroundColor: 'rgba(96, 165, 250, 0.1)',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Visitors',
          data: data.map(d => d.visitors),
          borderColor: '#34D399',
          backgroundColor: 'rgba(52, 211, 153, 0.1)',
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(48, 54, 61, 0.3)'
          }
        }
      }
    }
  });
}

// Handle days filter change
async function onDaysFilterChange() {
  const value = document.getElementById('daysFilter').value;
  daysFilter = parseInt(value);
  await refreshData();
}

// Refresh all data
async function refreshData() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');

  await Promise.all([
    loadOverview(),
    loadPages(),
    loadTrafficSources(),
    loadEngagement(),
    loadTrafficChart()
  ]);

  document.getElementById('loading').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  refreshData();
});

// Auto-refresh every 5 minutes
setInterval(() => {
  refreshData();
}, 300000);
