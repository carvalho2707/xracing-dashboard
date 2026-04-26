// Onboarding Funnel page — first_open → signup → tutorial → first recording
// Data sources: GA4 events + screen views, BigQuery for recording_poll_failed params.

let currentPlatform = 'all';

function getDays() {
  return parseInt(document.getElementById('daysSelect').value) || 30;
}

function pctStr(num, denom, digits = 1) {
  if (!denom) return '—';
  return `${(100 * num / denom).toFixed(digits)}%`;
}

function stepBarColor(pctOfPrev) {
  if (pctOfPrev >= 80) return 'bg-emerald-500';
  if (pctOfPrev >= 50) return 'bg-yellow-500';
  return 'bg-racing-red';
}

async function loadFunnel() {
  const days = getDays();
  const data = await fetchData(`ga4/onboarding-funnel?days=${days}&platform=${encodeURIComponent(currentPlatform)}`);
  const container = document.getElementById('funnelSteps');
  if (!data || !data.steps) {
    container.innerHTML = '<p class="text-racing-muted text-sm">No data</p>';
    return;
  }

  const top = data.steps[0]?.users || 0;

  // Headline cards
  const signup = data.steps.find(s => s.key === 'sign_up')?.users || 0;
  const recCompleted = data.steps.find(s => s.key === 'recording_completed')?.users || 0;
  document.getElementById('statFirstOpen').textContent = formatNumber(top);
  document.getElementById('statSignup').textContent = formatNumber(signup);
  document.getElementById('statSignupPct').textContent = `${pctStr(signup, top)} of opens`;
  document.getElementById('statRecorded').textContent = formatNumber(recCompleted);
  document.getElementById('statRecordedPct').textContent = `${pctStr(recCompleted, top)} of opens`;
  document.getElementById('statUninstalls').textContent = formatNumber(data.uninstalls || 0);
  document.getElementById('statUninstallsPct').textContent = `${pctStr(data.uninstalls || 0, top)} of opens`;

  // Funnel rows
  container.innerHTML = data.steps.map((s, i) => {
    const widthPct = top > 0 ? Math.max(2, (s.users / top) * 100) : 0;
    const color = stepBarColor(s.pctOfPrev);
    const stepOver = i === 0 ? '' : `<span class="text-xs ${s.pctOfPrev > 100 ? 'warn' : (s.pctOfPrev >= 80 ? 'pos' : (s.pctOfPrev >= 50 ? 'warn' : 'neg'))} ml-2">${s.pctOfPrev}%↻</span>`;
    return `
      <div>
        <div class="flex justify-between items-baseline text-sm mb-1 gap-3">
          <div>
            <span class="text-racing-text">${s.label}</span>
            <span class="step-source ml-2">${s.source}</span>
          </div>
          <div>
            <span class="text-white font-medium">${formatNumber(s.users)}</span>
            <span class="text-racing-muted text-xs ml-2">${s.pctOfTop}% of opens</span>
            ${stepOver}
          </div>
        </div>
        <div class="source-bar"><div class="source-bar-fill ${color}" style="width:${widthPct}%"></div></div>
      </div>
    `;
  }).join('');
}

async function loadPlatformSplit() {
  const days = getDays();
  const data = await fetchData(`ga4/onboarding-funnel/by-platform?days=${days}`);
  const tbody = document.querySelector('#platformTable tbody');
  if (!data || !Array.isArray(data)) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-racing-muted">No data</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(row => {
    const get = (key) => row.steps.find(s => s.key === key)?.users || 0;
    const opens = get('first_open');
    const signup = get('sign_up');
    const tut = get('tutorial_complete');
    const recStart = get('recording_started');
    const recDone = get('recording_completed');
    return `
      <tr>
        <td>${row.platform}</td>
        <td class="num">${formatNumber(opens)}</td>
        <td class="num">${formatNumber(signup)}</td>
        <td class="num">${formatNumber(tut)}</td>
        <td class="num">${formatNumber(recStart)}</td>
        <td class="num">${formatNumber(recDone)}</td>
        <td class="num">${pctStr(signup, opens)}</td>
        <td class="num">${pctStr(recDone, opens)}</td>
        <td class="num neg">${formatNumber(row.uninstalls || 0)}</td>
      </tr>
    `;
  }).join('');
}

async function loadValidationFailures() {
  const days = getDays();
  const data = await fetchData(`ga4/validation-failures?days=${days}`);
  const tbody = document.querySelector('#errorTypeTable tbody');
  if (!data) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-racing-muted">No data</td></tr>';
    return;
  }

  tbody.innerHTML = (data.byErrorType || []).map(r => `
    <tr>
      <td>${r.errorType}</td>
      <td class="num">${formatNumber(r.events)}</td>
      <td class="num">${formatNumber(r.users)}</td>
    </tr>
  `).join('') || '<tr><td colspan="3" class="text-racing-muted">No failures in window</td></tr>';

  document.getElementById('vfFailed').textContent = formatNumber(data.totalFailed || 0);
  document.getElementById('vfUsers').textContent = formatNumber(data.failedUsers || 0);
  document.getElementById('vfTotal').textContent = formatNumber(data.totalPolls || 0);
  document.getElementById('vfRate').textContent = pctStr(data.totalFailed || 0, data.totalPolls || 0);
}

async function refreshData() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
  try {
    await Promise.all([loadFunnel(), loadPlatformSplit(), loadValidationFailures()]);
  } finally {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('daysSelect').addEventListener('change', refreshData);
  document.querySelectorAll('#platformTabs .platform-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#platformTabs .platform-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentPlatform = tab.dataset.platform;
      loadFunnel();
    });
  });
  refreshData();
});
