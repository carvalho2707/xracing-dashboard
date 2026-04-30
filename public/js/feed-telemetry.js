// Feed Telemetry page — reads from /api/feed-telemetry/*
// Populated from: feed_impressions, feed_interactions, feed_discovery_dismissals,
//                 plus a derived follow-through join against user_relationships.

let sourceChart, dailyChart, discoveryChart;

const SOURCE_LABELS = {
  s1_follow: 'Follow graph',
  s2_track: 'Raced tracks',
  s3_geo: 'Geo / nearby',
  s4_trending: 'Trending',
  s5_self: 'Self',
  d1_driver: 'D1 driver card',
  d2_event: 'D2 event card',
};

const SOURCE_COLORS = {
  s1_follow: '#E53935',
  s2_track: '#3B82F6',
  s3_geo: '#10B981',
  s4_trending: '#EAB308',
  s5_self: '#A78BFA',
  d1_driver: '#F472B6',
  d2_event: '#38BDF8',
};

function currentDays() {
  return parseInt(document.getElementById('daysSelect').value, 10) || 7;
}

function pct(v) {
  return v == null ? '—' : `${v}%`;
}

async function loadOverview() {
  const d = await fetchData(`feed-telemetry/overview?days=${currentDays()}`);
  if (!d) return;
  document.getElementById('impressions').textContent = formatNumber(+d.impressions || 0);
  document.getElementById('uniqueViewers').textContent = formatNumber(+d.unique_viewers || 0);
  document.getElementById('d1Impressions').textContent = formatNumber(+d.d1_impressions || 0);
  document.getElementById('d1DismissRate').textContent = pct(d.d1_dismissal_rate);
  document.getElementById('d1FollowRate').textContent = pct(d.d1_follow_through_rate);
}

async function loadSourceChart() {
  const data = await fetchData(`feed-telemetry/by-source?days=${currentDays()}`);
  const ctx = document.getElementById('sourceChart').getContext('2d');
  if (sourceChart) sourceChart.destroy();
  if (!data || data.length === 0) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    return;
  }
  sourceChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(r => SOURCE_LABELS[r.source] || r.source),
      datasets: [{
        data: data.map(r => +r.impressions),
        backgroundColor: data.map(r => SOURCE_COLORS[r.source] || '#8B949E'),
        borderColor: '#0D1117',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 10, padding: 10, usePointStyle: true } },
      },
    },
  });
}

async function loadDailyChart() {
  const data = await fetchData(`feed-telemetry/daily?days=14`);
  const ctx = document.getElementById('dailyChart').getContext('2d');
  if (dailyChart) dailyChart.destroy();
  if (!data || data.length === 0) return;
  dailyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(r => formatDate(r.day)),
      datasets: [{
        label: 'Impressions',
        data: data.map(r => +r.impressions),
        borderColor: '#E53935',
        backgroundColor: 'rgba(229, 57, 53, 0.1)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(48, 54, 61, 0.3)' }, ticks: { precision: 0 } },
        x: { grid: { display: false } },
      },
    },
  });
}

async function loadSourcePerformance() {
  const data = await fetchData(`feed-telemetry/source-performance?days=${currentDays()}`);
  const body = document.getElementById('sourcePerfBody');
  if (!data || data.length === 0) {
    body.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-racing-muted">No data yet</td></tr>`;
    return;
  }
  body.innerHTML = data.map(r => {
    const pill = `<span class="src-pill src-${r.source}">${SOURCE_LABELS[r.source] || r.source}</span>`;
    return `
      <tr>
        <td class="py-3 pr-4">${pill}</td>
        <td class="text-right py-3 pr-4 text-white font-medium">${formatNumber(+r.impressions)}</td>
        <td class="text-right py-3 pr-4 text-white">${formatNumber(+r.interactions)}</td>
        <td class="text-right py-3 text-white font-medium">${r.ctr_pct}%</td>
      </tr>
    `;
  }).join('');
}

const COHORT_LABELS = {
  brand_new: 'Brand new',
  low_context: 'Low context',
  active: 'Active',
  unknown: 'Unknown',
};

const COHORT_PILL_CLASSES = {
  brand_new: 'bg-emerald-500/20 text-emerald-400',
  low_context: 'bg-yellow-500/20 text-yellow-400',
  active: 'bg-blue-500/20 text-blue-400',
  unknown: 'bg-slate-500/20 text-slate-400',
};

async function loadCohortBreakdown() {
  const data = await fetchData(`feed-telemetry/by-cohort?days=${currentDays()}`);
  const body = document.getElementById('cohortBody');
  if (!data || data.length === 0) {
    body.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-racing-muted">No data yet</td></tr>`;
    return;
  }
  body.innerHTML = data.map(r => {
    const label = COHORT_LABELS[r.user_state] || r.user_state;
    const pillClass = COHORT_PILL_CLASSES[r.user_state] || 'bg-slate-500/20 text-slate-400';
    const followRate = r.d1_follow_through_rate == null ? '—' : `${r.d1_follow_through_rate}%`;
    return `
      <tr>
        <td class="py-3 pr-4"><span class="${pillClass} px-2 py-1 rounded text-xs uppercase font-semibold">${label}</span></td>
        <td class="text-right py-3 pr-4 text-white font-medium">${formatNumber(+r.impressions)}</td>
        <td class="text-right py-3 pr-4 text-white">${formatNumber(+r.unique_viewers)}</td>
        <td class="text-right py-3 pr-4 text-white">${formatNumber(+r.d1_impressions)}</td>
        <td class="text-right py-3 pr-4 text-white">${formatNumber(+r.d1_follow_through)}</td>
        <td class="text-right py-3 text-white font-medium">${followRate}</td>
      </tr>
    `;
  }).join('');
}

async function loadDiscoveryChart() {
  const data = await fetchData(`feed-telemetry/discovery-daily?days=14`);
  const ctx = document.getElementById('discoveryChart').getContext('2d');
  if (discoveryChart) discoveryChart.destroy();
  if (!data || data.length === 0) return;
  discoveryChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(r => formatDate(r.day)),
      datasets: [
        {
          label: 'Shown',
          data: data.map(r => +r.shown),
          backgroundColor: 'rgba(139, 148, 158, 0.4)',
          borderRadius: 4,
          stack: 'a',
        },
        {
          label: 'Dismissed',
          data: data.map(r => +r.dismissed),
          backgroundColor: 'rgba(229, 57, 53, 0.75)',
          borderRadius: 4,
          stack: 'b',
        },
        {
          label: 'Followed within 24h',
          data: data.map(r => +r.converted),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderRadius: 4,
          stack: 'b',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 10, padding: 15, usePointStyle: true } },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(48, 54, 61, 0.3)' }, ticks: { precision: 0 } },
        x: { grid: { display: false } },
      },
    },
  });
}

async function loadAll() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
  try {
    await Promise.all([
      loadOverview(),
      loadSourceChart(),
      loadDailyChart(),
      loadSourcePerformance(),
      loadCohortBreakdown(),
      loadDiscoveryChart(),
    ]);
  } finally {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('daysSelect').addEventListener('change', loadAll);
  loadAll();
});
