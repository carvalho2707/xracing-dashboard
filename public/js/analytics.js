// Product Analytics page JavaScript

let dailyActiveChart, signupsChart;

// ============================================
// Tier 1: Survival Metrics
// ============================================

async function updateActivation() {
  const data = await fetchData('analytics/activation');
  if (!data) return;

  document.getElementById('activationRate').textContent =
    data.activation_rate ? `${data.activation_rate}%` : '0%';
  document.getElementById('activationRate7d').textContent =
    data.activation_rate_7d ? `${data.activation_rate_7d}%` : '0%';

  // Update funnel
  document.getElementById('funnelTotal').textContent = formatNumber(data.total_users);
  document.getElementById('funnelActivated').textContent =
    `${formatNumber(data.activated_users)} (${data.activation_rate || 0}%)`;
  document.getElementById('funnelActivatedBar').style.width = `${data.activation_rate || 0}%`;
}

async function updateRetention() {
  const data = await fetchData('analytics/retention');
  if (!data) return;

  document.getElementById('retentionD1').textContent =
    data.retention_d1 ? `${data.retention_d1}%` : '0%';
  document.getElementById('retentionD7').textContent =
    data.retention_d7 ? `${data.retention_d7}%` : '0%';
}

async function updateActiveUsers() {
  const data = await fetchData('analytics/active-users');
  if (!data) return;

  document.getElementById('dauCount').textContent = formatNumber(data.dau);
  document.getElementById('wauCount').textContent = formatNumber(data.wau);
  document.getElementById('mauCount').textContent = formatNumber(data.mau);
  document.getElementById('stickiness').textContent = `${data.stickiness}%`;
  document.getElementById('activeUsers7d').textContent = formatNumber(data.wau);
}

async function createDailyActiveChart() {
  const data = await fetchData('analytics/daily-active?days=7');
  if (!data || data.length === 0) return;

  const ctx = document.getElementById('dailyActiveChart').getContext('2d');
  if (dailyActiveChart) dailyActiveChart.destroy();

  dailyActiveChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => formatDate(d.date)),
      datasets: [
        {
          label: 'Active Users',
          data: data.map(d => d.active_users),
          borderColor: '#E53935',
          backgroundColor: 'rgba(229, 57, 53, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#E53935'
        },
        {
          label: 'New Signups',
          data: data.map(d => d.new_users),
          borderColor: '#3B82F6',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#3B82F6'
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
          labels: { boxWidth: 12, padding: 15, usePointStyle: true }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(48, 54, 61, 0.3)' },
          ticks: { precision: 0 }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

// ============================================
// Tier 2: Growth Health
// ============================================

async function updateSignups() {
  const data = await fetchData('analytics/signups?days=7');
  if (!data || data.length === 0) return;

  const total = data.reduce((sum, d) => sum + parseInt(d.signups), 0);
  document.getElementById('signups7d').textContent = formatNumber(total);

  const ctx = document.getElementById('signupsChart').getContext('2d');
  if (signupsChart) signupsChart.destroy();

  signupsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => formatDate(d.date)),
      datasets: [{
        label: 'Signups',
        data: data.map(d => d.signups),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 4,
        barThickness: 24
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
          grid: { color: 'rgba(48, 54, 61, 0.3)' },
          ticks: { precision: 0 }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

async function updateRecordingsPerUser() {
  const data = await fetchData('analytics/recordings-per-user');
  if (!data) return;

  document.getElementById('avgRecordingsPerUser').textContent =
    data.avg_recordings_per_user || '0';
  document.getElementById('medianRecordings').textContent =
    data.median_recordings || '0';
}

// ============================================
// Tier 3: Engagement Depth
// ============================================

async function updateSocialEngagement() {
  const data = await fetchData('analytics/social-engagement');
  if (!data) return;

  document.getElementById('socialActionsPerUser').textContent =
    data.actions_per_user || '0';
  document.getElementById('totalLikes').textContent = formatNumber(data.total_likes);
  document.getElementById('totalComments').textContent = formatNumber(data.total_comments);
  document.getElementById('totalFollows').textContent = formatNumber(data.total_follows);
  document.getElementById('activeUsers30d').textContent = formatNumber(data.active_users);
}

async function updateFeatureAdoption() {
  const data = await fetchData('analytics/feature-adoption');
  if (!data) return;

  // Update circular progress indicators
  updateCircularProgress('trackCreatorCircle', 'trackCreatorRate', data.track_creator_rate);
  updateCircularProgress('likeCircle', 'likeRate', data.like_adoption_rate);
  updateCircularProgress('commentCircle', 'commentRate', data.comment_adoption_rate);
  updateCircularProgress('followCircle', 'followRate', data.follow_adoption_rate);
  updateCircularProgress('mediaCircle', 'mediaRate', data.media_adoption_rate);
}

function updateCircularProgress(circleId, rateId, rate) {
  const circle = document.getElementById(circleId);
  const rateEl = document.getElementById(rateId);

  if (!circle || !rateEl) return;

  const circumference = 226.2; // 2 * PI * 36
  const offset = circumference - (circumference * (rate || 0) / 100);

  circle.style.strokeDashoffset = offset;
  rateEl.textContent = rate ? `${rate}%` : '0%';
}

// ============================================
// Demographics & Technology
// ============================================

const countryFlags = {
  'United States': '\u{1F1FA}\u{1F1F8}', 'United Kingdom': '\u{1F1EC}\u{1F1E7}',
  'Canada': '\u{1F1E8}\u{1F1E6}', 'Australia': '\u{1F1E6}\u{1F1FA}',
  'Germany': '\u{1F1E9}\u{1F1EA}', 'France': '\u{1F1EB}\u{1F1F7}',
  'Spain': '\u{1F1EA}\u{1F1F8}', 'Italy': '\u{1F1EE}\u{1F1F9}',
  'Netherlands': '\u{1F1F3}\u{1F1F1}', 'Belgium': '\u{1F1E7}\u{1F1EA}',
  'Switzerland': '\u{1F1E8}\u{1F1ED}', 'Austria': '\u{1F1E6}\u{1F1F9}',
  'Portugal': '\u{1F1F5}\u{1F1F9}', 'Brazil': '\u{1F1E7}\u{1F1F7}',
  'Mexico': '\u{1F1F2}\u{1F1FD}', 'Japan': '\u{1F1EF}\u{1F1F5}',
  'South Korea': '\u{1F1F0}\u{1F1F7}', 'China': '\u{1F1E8}\u{1F1F3}',
  'India': '\u{1F1EE}\u{1F1F3}', 'Singapore': '\u{1F1F8}\u{1F1EC}',
  'New Zealand': '\u{1F1F3}\u{1F1FF}', 'Ireland': '\u{1F1EE}\u{1F1EA}',
  'Sweden': '\u{1F1F8}\u{1F1EA}', 'Norway': '\u{1F1F3}\u{1F1F4}',
  'Denmark': '\u{1F1E9}\u{1F1F0}', 'Finland': '\u{1F1EB}\u{1F1EE}',
  'Poland': '\u{1F1F5}\u{1F1F1}', 'Czech Republic': '\u{1F1E8}\u{1F1FF}',
  'Czechia': '\u{1F1E8}\u{1F1FF}', 'Hungary': '\u{1F1ED}\u{1F1FA}',
  'Russia': '\u{1F1F7}\u{1F1FA}', 'South Africa': '\u{1F1FF}\u{1F1E6}',
  'Argentina': '\u{1F1E6}\u{1F1F7}', 'Chile': '\u{1F1E8}\u{1F1F1}',
  'Colombia': '\u{1F1E8}\u{1F1F4}', 'Thailand': '\u{1F1F9}\u{1F1ED}',
  'Malaysia': '\u{1F1F2}\u{1F1FE}', 'Indonesia': '\u{1F1EE}\u{1F1E9}',
  'Philippines': '\u{1F1F5}\u{1F1ED}', 'Vietnam': '\u{1F1FB}\u{1F1F3}',
  'Turkey': '\u{1F1F9}\u{1F1F7}', 'Israel': '\u{1F1EE}\u{1F1F1}',
  'United Arab Emirates': '\u{1F1E6}\u{1F1EA}', 'Saudi Arabia': '\u{1F1F8}\u{1F1E6}',
  'Egypt': '\u{1F1EA}\u{1F1EC}', 'Greece': '\u{1F1EC}\u{1F1F7}',
  'Romania': '\u{1F1F7}\u{1F1F4}', 'Ukraine': '\u{1F1FA}\u{1F1E6}'
};

function getFlag(country) {
  return countryFlags[country] || '\u{1F30D}';
}

async function loadAppCountries() {
  const data = await fetchData('ga4/countries?days=7&limit=10');
  const container = document.getElementById('appCountries');

  if (!data || data.length === 0) {
    container.innerHTML = '<div class="text-sm text-racing-muted py-4">No country data available</div>';
    return;
  }

  const maxUsers = Math.max(...data.map(c => c.users));

  container.innerHTML = data.map(country => {
    const pct = (country.users / maxUsers * 100).toFixed(0);
    const flag = getFlag(country.country);
    return `
      <div class="bg-racing-dark/50 rounded-lg p-2.5">
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-2">
            <span class="text-base">${flag}</span>
            <span class="text-sm text-white">${country.country}</span>
          </div>
          <div class="text-right">
            <span class="text-sm font-bold text-white">${formatNumber(country.users)}</span>
            <span class="text-xs text-racing-muted ml-1">users</span>
          </div>
        </div>
        <div class="source-bar">
          <div class="source-bar-fill bg-blue-500" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

async function loadAppCities() {
  const data = await fetchData('ga4/cities?days=7&limit=10');
  const container = document.getElementById('appCities');

  if (!data || data.length === 0) {
    container.innerHTML = '<div class="text-sm text-racing-muted py-4">No city data available</div>';
    return;
  }

  const maxUsers = Math.max(...data.map(c => c.users));

  container.innerHTML = data.map(city => {
    const pct = (city.users / maxUsers * 100).toFixed(0);
    const flag = getFlag(city.country);
    return `
      <div class="bg-racing-dark/50 rounded-lg p-2.5">
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="text-base flex-shrink-0">${flag}</span>
            <span class="text-sm text-white truncate" title="${city.city}, ${city.country}">${city.city}</span>
          </div>
          <div class="text-right flex-shrink-0 ml-2">
            <span class="text-sm font-bold text-white">${formatNumber(city.users)}</span>
          </div>
        </div>
        <div class="source-bar">
          <div class="source-bar-fill bg-green-500" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

async function loadAppOS() {
  const data = await fetchData('ga4/os?days=7');
  const container = document.getElementById('appOS');

  if (!data || data.length === 0) {
    container.innerHTML = '<div class="text-sm text-racing-muted py-4">No OS data available</div>';
    return;
  }

  const maxUsers = Math.max(...data.map(o => o.users));

  container.innerHTML = data.map(os => {
    const pct = (os.users / maxUsers * 100).toFixed(0);
    return `
      <div class="flex items-center justify-between text-sm py-1">
        <span class="text-racing-text truncate mr-2">${os.os}</span>
        <span class="text-white font-medium">${formatNumber(os.users)}</span>
      </div>
      <div class="source-bar mb-1">
        <div class="source-bar-fill bg-cyan-500" style="width: ${pct}%"></div>
      </div>
    `;
  }).join('');
}

// ============================================
// Refresh & Initialize
// ============================================

async function refreshData() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');

  await Promise.all([
    // Tier 1
    updateActivation(),
    updateRetention(),
    updateActiveUsers(),
    createDailyActiveChart(),
    // Tier 2
    updateSignups(),
    updateRecordingsPerUser(),
    // Tier 3
    updateSocialEngagement(),
    updateFeatureAdoption(),
    // Demographics & Technology
    loadAppCountries(),
    loadAppCities(),
    loadAppOS()
  ]);

  document.getElementById('loading').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', refreshData);

// Auto-refresh every 5 minutes
setInterval(refreshData, 300000);
