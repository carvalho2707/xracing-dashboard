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

// Load download clicks (most important metric)
async function loadDownloadClicks() {
  const data = await fetchData(`web/download-clicks?days=${daysFilter}`);

  if (!data) {
    document.getElementById('downloadClicks').textContent = '0';
    document.getElementById('downloadCTR').textContent = '0%';
    document.getElementById('iosClicks').textContent = '0';
    document.getElementById('androidClicks').textContent = '0';
    return;
  }

  document.getElementById('downloadClicks').textContent = formatNumber(data.totalClicks || 0);
  document.getElementById('downloadCTR').textContent = `${data.ctr || 0}%`;

  const iosData = data.platforms?.find(p => p.platform === 'ios');
  const androidData = data.platforms?.find(p => p.platform === 'android');

  document.getElementById('iosClicks').textContent = formatNumber(iosData?.clicks || 0);
  document.getElementById('androidClicks').textContent = formatNumber(androidData?.clicks || 0);

  // Show countries if we have data
  const countryContainer = document.getElementById('downloadsByCountry');
  const countryList = document.getElementById('downloadCountryList');

  if (data.byCountry && data.byCountry.length > 0) {
    countryContainer.classList.remove('hidden');
    countryList.innerHTML = data.byCountry.slice(0, 10).map(c => {
      const flag = getCountryFlag(c.country);
      return `
        <div class="bg-racing-dark/50 rounded-lg p-2 flex items-center justify-between">
          <span class="text-sm">${flag} ${c.country}</span>
          <span class="text-sm font-bold text-white">${c.clicks}</span>
        </div>
      `;
    }).join('');
  } else {
    countryContainer.classList.add('hidden');
  }
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

// Get country flag emoji from country name
function getCountryFlag(country) {
  const flags = {
    'United States': '🇺🇸',
    'United Kingdom': '🇬🇧',
    'Canada': '🇨🇦',
    'Australia': '🇦🇺',
    'Germany': '🇩🇪',
    'France': '🇫🇷',
    'Spain': '🇪🇸',
    'Italy': '🇮🇹',
    'Netherlands': '🇳🇱',
    'Belgium': '🇧🇪',
    'Switzerland': '🇨🇭',
    'Austria': '🇦🇹',
    'Portugal': '🇵🇹',
    'Brazil': '🇧🇷',
    'Mexico': '🇲🇽',
    'Japan': '🇯🇵',
    'South Korea': '🇰🇷',
    'China': '🇨🇳',
    'India': '🇮🇳',
    'Singapore': '🇸🇬',
    'New Zealand': '🇳🇿',
    'Ireland': '🇮🇪',
    'Sweden': '🇸🇪',
    'Norway': '🇳🇴',
    'Denmark': '🇩🇰',
    'Finland': '🇫🇮',
    'Poland': '🇵🇱',
    'Czech Republic': '🇨🇿',
    'Czechia': '🇨🇿',
    'Hungary': '🇭🇺',
    'Russia': '🇷🇺',
    'South Africa': '🇿🇦',
    'Argentina': '🇦🇷',
    'Chile': '🇨🇱',
    'Colombia': '🇨🇴',
    'Thailand': '🇹🇭',
    'Malaysia': '🇲🇾',
    'Indonesia': '🇮🇩',
    'Philippines': '🇵🇭',
    'Vietnam': '🇻🇳',
    'Turkey': '🇹🇷',
    'Israel': '🇮🇱',
    'United Arab Emirates': '🇦🇪',
    'Saudi Arabia': '🇸🇦',
    'Egypt': '🇪🇬',
    'Greece': '🇬🇷',
    'Romania': '🇷🇴',
    'Ukraine': '🇺🇦'
  };
  return flags[country] || '🌍';
}

// Load countries data
async function loadCountries() {
  const data = await fetchData(`web/countries?days=${daysFilter}`);
  const container = document.getElementById('countries');

  if (!data || data.length === 0) {
    container.innerHTML = `<div class="text-sm text-racing-muted py-4">No country data available</div>`;
    return;
  }

  const maxVisitors = Math.max(...data.map(c => c.visitors));

  container.innerHTML = data.slice(0, 10).map(country => {
    const percentage = (country.visitors / maxVisitors * 100).toFixed(0);
    const flag = getCountryFlag(country.country);

    return `
      <div class="bg-racing-dark/50 rounded-lg p-2.5">
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-2">
            <span class="text-base">${flag}</span>
            <span class="text-sm text-white">${country.country}</span>
          </div>
          <div class="text-right">
            <span class="text-sm font-bold text-white">${formatNumber(country.visitors)}</span>
            <span class="text-xs text-racing-muted ml-1">visitors</span>
          </div>
        </div>
        <div class="source-bar">
          <div class="source-bar-fill bg-blue-500" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// Load cities data
async function loadCities() {
  const data = await fetchData(`web/cities?days=${daysFilter}`);
  const container = document.getElementById('cities');

  if (!data || data.length === 0) {
    container.innerHTML = `<div class="text-sm text-racing-muted py-4">No city data available</div>`;
    return;
  }

  const maxVisitors = Math.max(...data.map(c => c.visitors));

  container.innerHTML = data.slice(0, 10).map(city => {
    const percentage = (city.visitors / maxVisitors * 100).toFixed(0);
    const flag = getCountryFlag(city.country);
    const location = city.region ? `${city.city}, ${city.region}` : city.city;

    return `
      <div class="bg-racing-dark/50 rounded-lg p-2.5">
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="text-base flex-shrink-0">${flag}</span>
            <span class="text-sm text-white truncate" title="${location}, ${city.country}">${location}</span>
          </div>
          <div class="text-right flex-shrink-0 ml-2">
            <span class="text-sm font-bold text-white">${formatNumber(city.visitors)}</span>
          </div>
        </div>
        <div class="source-bar">
          <div class="source-bar-fill bg-green-500" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// Load devices data
async function loadDevices() {
  const data = await fetchData(`web/devices?days=${daysFilter}`);

  if (!data) {
    document.getElementById('deviceCategories').innerHTML = `<div class="text-sm text-racing-muted py-4">No data</div>`;
    document.getElementById('browsers').innerHTML = `<div class="text-sm text-racing-muted py-4">No data</div>`;
    document.getElementById('operatingSystems').innerHTML = `<div class="text-sm text-racing-muted py-4">No data</div>`;
    document.getElementById('languages').innerHTML = `<div class="text-sm text-racing-muted py-4">No data</div>`;
    return;
  }

  // Device categories
  const categoryContainer = document.getElementById('deviceCategories');
  if (data.categories && data.categories.length > 0) {
    const maxCat = Math.max(...data.categories.map(c => c.visitors));
    categoryContainer.innerHTML = data.categories.map(cat => {
      const pct = (cat.visitors / maxCat * 100).toFixed(0);
      const icon = cat.category === 'desktop' ? '💻' : cat.category === 'mobile' ? '📱' : cat.category === 'tablet' ? '📱' : '🖥️';
      return `
        <div class="flex items-center justify-between text-sm py-1">
          <span class="text-racing-text">${icon} ${cat.category}</span>
          <span class="text-white font-medium">${formatNumber(cat.visitors)}</span>
        </div>
        <div class="source-bar mb-1">
          <div class="source-bar-fill bg-purple-500" style="width: ${pct}%"></div>
        </div>
      `;
    }).join('');
  } else {
    categoryContainer.innerHTML = `<div class="text-sm text-racing-muted py-2">No data</div>`;
  }

  // Browsers
  const browserContainer = document.getElementById('browsers');
  if (data.browsers && data.browsers.length > 0) {
    const maxBrowser = Math.max(...data.browsers.map(b => b.visitors));
    browserContainer.innerHTML = data.browsers.slice(0, 5).map(browser => {
      const pct = (browser.visitors / maxBrowser * 100).toFixed(0);
      return `
        <div class="flex items-center justify-between text-sm py-1">
          <span class="text-racing-text truncate mr-2">${browser.browser}</span>
          <span class="text-white font-medium">${formatNumber(browser.visitors)}</span>
        </div>
        <div class="source-bar mb-1">
          <div class="source-bar-fill bg-orange-500" style="width: ${pct}%"></div>
        </div>
      `;
    }).join('');
  } else {
    browserContainer.innerHTML = `<div class="text-sm text-racing-muted py-2">No data</div>`;
  }

  // Operating Systems
  const osContainer = document.getElementById('operatingSystems');
  if (data.operatingSystems && data.operatingSystems.length > 0) {
    const maxOS = Math.max(...data.operatingSystems.map(o => o.visitors));
    osContainer.innerHTML = data.operatingSystems.slice(0, 5).map(os => {
      const pct = (os.visitors / maxOS * 100).toFixed(0);
      return `
        <div class="flex items-center justify-between text-sm py-1">
          <span class="text-racing-text truncate mr-2">${os.os}</span>
          <span class="text-white font-medium">${formatNumber(os.visitors)}</span>
        </div>
        <div class="source-bar mb-1">
          <div class="source-bar-fill bg-cyan-500" style="width: ${pct}%"></div>
        </div>
      `;
    }).join('');
  } else {
    osContainer.innerHTML = `<div class="text-sm text-racing-muted py-2">No data</div>`;
  }

  // Languages
  const langContainer = document.getElementById('languages');
  if (data.languages && data.languages.length > 0) {
    const maxLang = Math.max(...data.languages.map(l => l.visitors));
    langContainer.innerHTML = data.languages.slice(0, 5).map(lang => {
      const pct = (lang.visitors / maxLang * 100).toFixed(0);
      // Format language code to be more readable
      const langName = lang.language.split('-')[0].toUpperCase();
      return `
        <div class="flex items-center justify-between text-sm py-1">
          <span class="text-racing-text">${langName}</span>
          <span class="text-white font-medium">${formatNumber(lang.visitors)}</span>
        </div>
        <div class="source-bar mb-1">
          <div class="source-bar-fill bg-pink-500" style="width: ${pct}%"></div>
        </div>
      `;
    }).join('');
  } else {
    langContainer.innerHTML = `<div class="text-sm text-racing-muted py-2">No data</div>`;
  }
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
    loadDownloadClicks(),
    loadOverview(),
    loadPages(),
    loadTrafficSources(),
    loadEngagement(),
    loadTrafficChart(),
    loadCountries(),
    loadCities(),
    loadDevices()
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
