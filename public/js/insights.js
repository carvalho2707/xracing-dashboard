// Insights page - deeper product metrics

let ttsrChart, lpvChart;

function getDays() {
  return parseInt(document.getElementById('daysSelect').value) || 30;
}

// ============================================
// 1. Acquisition funnel
// ============================================
async function loadFunnel() {
  const days = getDays();
  const data = await fetchData(`insights/signup-funnel?days=${days}`);
  const container = document.getElementById('funnelSteps');
  if (!data) { container.innerHTML = '<p class="text-racing-muted text-sm">No data</p>'; return; }

  const firstOpen = data.first_open || 0;
  const ga4Signup = data.sign_up || 0;
  const dbSignup = data.signups || 0;
  const recAny = data.recorded_any || 0;
  const rec7d = data.recorded_within_7d || 0;
  const rec1d = data.recorded_within_1d || 0;

  const top = Math.max(firstOpen, ga4Signup, dbSignup, 1);
  const steps = [
    { label: 'App installs (GA4 first_open)', value: firstOpen, sub: 'top of funnel' },
    { label: 'Signups (GA4 sign_up event)',   value: ga4Signup, sub: firstOpen > 0 ? `${(100*ga4Signup/firstOpen).toFixed(1)}% of installs` : '' },
    { label: 'Signups landed in DB',          value: dbSignup,  sub: ga4Signup > 0 ? `${(100*dbSignup/ga4Signup).toFixed(1)}% of GA4 signups` : '' },
    { label: 'Recorded within 1 day',         value: rec1d,     sub: dbSignup > 0 ? `${(100*rec1d/dbSignup).toFixed(1)}% of signups` : '' },
    { label: 'Recorded within 7 days',        value: rec7d,     sub: dbSignup > 0 ? `${(100*rec7d/dbSignup).toFixed(1)}% of signups` : '' },
    { label: 'Ever recorded',                 value: recAny,    sub: dbSignup > 0 ? `${(100*recAny/dbSignup).toFixed(1)}% of signups` : '' },
  ];

  container.innerHTML = steps.map(s => {
    const pct = Math.max(0, Math.min(100, (s.value / top) * 100));
    return `
      <div>
        <div class="flex justify-between text-sm mb-1">
          <span class="text-racing-text">${s.label}</span>
          <span class="text-white font-medium">${formatNumber(s.value)}<span class="text-racing-muted text-xs ml-2">${s.sub}</span></span>
        </div>
        <div class="source-bar"><div class="source-bar-fill bg-racing-red" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join('');
}

// ============================================
// 2. Time-to-second-recording
// ============================================
async function loadTTSR() {
  const data = await fetchData('insights/time-to-second-recording');
  if (!data) return;

  document.getElementById('ttsrMedian').textContent = data.median_days != null ? `${data.median_days}d` : '—';
  document.getElementById('ttsrUsers').textContent = formatNumber(data.users_with_2plus);
  const total = (data.users_with_2plus || 0) + (data.users_with_only_1 || 0);
  const pct = total > 0 ? ((100 * data.users_with_2plus / total).toFixed(1)) : '0';
  document.getElementById('ttsrRetained').textContent = `${pct}% of recorders made a 2nd`;

  const ctx = document.getElementById('ttsrChart').getContext('2d');
  if (ttsrChart) ttsrChart.destroy();
  ttsrChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['≤ 1 day', '2–7 days', '8–30 days', '> 30 days'],
      datasets: [{
        data: [data.within_1d, data.within_7d, data.within_30d, data.over_30d],
        backgroundColor: ['#34D399', '#60A5FA', '#FACC15', '#F87171'],
        borderRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(48,54,61,0.3)' }, ticks: { precision: 0 } },
        x: { grid: { display: false } }
      }
    }
  });
}

// ============================================
// 3. Feature retention lift
// ============================================
async function loadLift() {
  const rows = await fetchData('insights/feature-retention-lift');
  const tbody = document.querySelector('#liftTable tbody');
  if (!rows) { tbody.innerHTML = ''; return; }

  tbody.innerHTML = rows.map(r => {
    const lift = r.lift_pts;
    const liftStr = lift == null ? '-' : `${lift > 0 ? '+' : ''}${(+lift).toFixed(1)} pts`;
    const liftCls = lift == null ? '' : (lift > 0 ? 'pos' : (lift < 0 ? 'neg' : ''));
    return `<tr>
      <td class="text-white">${r.feature}</td>
      <td class="num">${formatNumber(r.adopters)}</td>
      <td class="num">${r.retention_adopters != null ? r.retention_adopters + '%' : '-'}</td>
      <td class="num">${r.retention_non != null ? r.retention_non + '%' : '-'}</td>
      <td class="num ${liftCls}">${liftStr}</td>
    </tr>`;
  }).join('');
}

// ============================================
// 4. View concentration
// ============================================
async function loadViewConc() {
  const d = await fetchData('insights/view-concentration');
  const c = document.getElementById('viewConc');
  if (!d) { c.innerHTML = ''; return; }
  const tile = (label, val, sub) => `
    <div class="metric-card rounded-xl p-4">
      <p class="text-racing-muted text-xs mb-1">${label}</p>
      <p class="text-2xl font-bold text-white">${val == null ? '-' : val + '%'}</p>
      ${sub ? `<p class="text-xs text-racing-muted mt-1">${sub}</p>` : ''}
    </div>`;
  c.innerHTML = [
    tile('Top 1% of recordings', d.top_1_pct_share, 'of all views'),
    tile('Top 10% of recordings', d.top_10_pct_share, 'of all views'),
    tile('Top 25% of recordings', d.top_25_pct_share, 'of all views'),
    tile('Top 50% of recordings', d.top_50_pct_share, 'of all views'),
  ].join('');
}

// ============================================
// 5. Track concentration
// ============================================
async function loadTrackConc() {
  const d = await fetchData('insights/track-concentration');
  const c = document.getElementById('trackConc');
  if (!d) { c.innerHTML = ''; return; }
  const tile = (label, val, sub) => `
    <div class="metric-card rounded-xl p-4">
      <p class="text-racing-muted text-xs mb-1">${label}</p>
      <p class="text-2xl font-bold text-white">${val == null ? '-' : val + '%'}</p>
      ${sub ? `<p class="text-xs text-racing-muted mt-1">${sub}</p>` : ''}
    </div>`;
  c.innerHTML = [
    tile('Top 1 track', d.top_1_share, `${formatNumber(d.active_tracks)} active tracks`),
    tile('Top 10 tracks', d.top_10_share, 'of all recordings'),
    tile('Top 20% of tracks', d.top_20_pct_share, 'of all recordings'),
    `<div class="metric-card rounded-xl p-4">
       <p class="text-racing-muted text-xs mb-1">Total track recordings</p>
       <p class="text-2xl font-bold text-white">${formatNumber(d.total_track_recordings)}</p>
     </div>`,
  ].join('');
}

// ============================================
// 6. Likes per view trend
// ============================================
async function loadLPV() {
  const rows = await fetchData('insights/likes-per-view');
  if (!rows || rows.length === 0) return;
  const ctx = document.getElementById('lpvChart').getContext('2d');
  if (lpvChart) lpvChart.destroy();
  lpvChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: rows.map(r => formatMonth(r.month)),
      datasets: [{
        label: 'Likes per 100 views',
        data: rows.map(r => parseFloat(r.likes_per_100_views) || 0),
        borderColor: '#E53935',
        backgroundColor: 'rgba(229,57,53,0.1)',
        fill: true, tension: 0.4, pointRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(48,54,61,0.3)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

// ============================================
// 7. Reach split
// ============================================
async function loadReachSplit() {
  const days = getDays();
  const rows = await fetchData(`insights/feed-reach-split?days=${days}`);
  const c = document.getElementById('reachSplit');
  if (!rows || rows.length === 0) {
    c.innerHTML = '<p class="text-racing-muted text-sm">No feed impressions in window</p>';
    return;
  }
  const buckets = {};
  let total = 0;
  rows.forEach(r => {
    const imp = parseInt(r.impressions) || 0;
    total += imp;
    if (!buckets[r.bucket]) buckets[r.bucket] = { total: 0, sources: [] };
    buckets[r.bucket].total += imp;
    buckets[r.bucket].sources.push({ source: r.source, impressions: imp });
  });

  const colorFor = b => ({
    'Follow graph': 'bg-red-500',
    'Discovery':    'bg-blue-500',
    'Suggestions':  'bg-pink-500',
    'Other':        'bg-racing-border'
  }[b] || 'bg-racing-border');

  c.innerHTML = Object.entries(buckets).map(([bucket, b]) => {
    const pct = total > 0 ? (100 * b.total / total).toFixed(1) : 0;
    const subList = b.sources.map(s => `<span class="text-xs text-racing-muted mr-3">${s.source}: ${formatNumber(s.impressions)}</span>`).join('');
    return `
      <div>
        <div class="flex justify-between text-sm mb-1">
          <span class="text-white font-medium">${bucket}</span>
          <span class="text-white">${formatNumber(b.total)} <span class="text-racing-muted">(${pct}%)</span></span>
        </div>
        <div class="source-bar mb-1"><div class="source-bar-fill ${colorFor(bucket)}" style="width:${pct}%"></div></div>
        <div>${subList}</div>
      </div>
    `;
  }).join('');
}

// ============================================
// 8. Creator amplification
// ============================================
async function loadAmplify() {
  const rows = await fetchData('insights/creator-amplification?limit=20');
  const tbody = document.querySelector('#amplifyTable tbody');
  if (!rows || rows.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="text-racing-muted">No data</td></tr>'; return; }
  tbody.innerHTML = rows.map(r => {
    const name = (r.first_name || r.last_name)
      ? `${r.first_name || ''} ${r.last_name || ''}`.trim()
      : r.username;
    return `<tr>
      <td class="text-white">${name}<span class="text-racing-muted text-xs ml-2">@${r.username}</span></td>
      <td class="num">${formatNumber(r.follower_count)}</td>
      <td class="num">${formatNumber(r.recordings)}</td>
      <td class="num">${formatNumber(r.total_views)}</td>
      <td class="num text-white">${(+r.views_per_follower).toFixed(2)}</td>
    </tr>`;
  }).join('');
}

// ============================================
// 9. Creator PMF
// ============================================
async function loadPMF() {
  const d = await fetchData('insights/creator-pmf?days=90');
  if (!d) return;
  document.getElementById('pmfRecPct').textContent = d.pct_recordings_engaged != null ? `${d.pct_recordings_engaged}%` : '-';
  document.getElementById('pmfRecAbs').textContent = `${formatNumber(d.engaged_recordings)} of ${formatNumber(d.recordings)}`;
  document.getElementById('pmfCreatorPct').textContent = d.pct_creators_engaged != null ? `${d.pct_creators_engaged}%` : '-';
  document.getElementById('pmfCreatorAbs').textContent = `${formatNumber(d.creators_with_any_engagement)} of ${formatNumber(d.creators)} creators`;
}

// ============================================
// 10. Geographic opportunity
// ============================================
async function loadGeo() {
  const rows = await fetchData('insights/geo-opportunity?limit=25');
  const tbody = document.querySelector('#geoTable tbody');
  if (!rows || rows.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="text-racing-muted">No data</td></tr>'; return; }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="text-white">${r.country}</td>
      <td class="num">${formatNumber(r.unique_drivers)}</td>
      <td class="num">${formatNumber(r.recordings)}</td>
      <td class="num">${formatNumber(r.recordings_30d)}</td>
      <td class="num">${(+r.recordings_per_driver).toFixed(2)}</td>
    </tr>
  `).join('');
}

// ============================================
// Refresh
// ============================================
async function refreshData() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');

  await Promise.all([
    loadFunnel(),
    loadTTSR(),
    loadLift(),
    loadViewConc(),
    loadTrackConc(),
    loadLPV(),
    loadReachSplit(),
    loadAmplify(),
    loadPMF(),
    loadGeo()
  ]);

  document.getElementById('loading').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('daysSelect').addEventListener('change', refreshData);
  refreshData();
});
