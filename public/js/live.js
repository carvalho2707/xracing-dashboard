// Live page specific JavaScript

// Update live recordings status
async function updateLiveRecordings() {
  const data = await fetchData('live');
  if (!data) return;

  document.getElementById('liveCount').textContent = parseInt(data.live_count) || 0;
  document.getElementById('uploadingCount').textContent = parseInt(data.uploading_count) || 0;
  document.getElementById('endedCount').textContent = parseInt(data.ended_count) || 0;
  document.getElementById('liveDrivers').textContent = parseInt(data.live_drivers) || 0;
  document.getElementById('liveTracks').textContent = parseInt(data.live_tracks) || 0;
}

// Update live monitoring table
async function updateLiveMonitoring() {
  const data = await fetchData('live-monitoring');
  if (!data) return;

  const tbody = document.getElementById('liveMonitoringTable');
  const activeCount = document.getElementById('activeCount');

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="py-8 text-center text-racing-muted">No active recordings</td></tr>';
    activeCount.textContent = '0 recordings';
    return;
  }

  activeCount.textContent = `${data.length} recording${data.length !== 1 ? 's' : ''}`;

  tbody.innerHTML = data.map(rec => `
    <tr class="border-b border-racing-border/50 hover:bg-racing-border/20">
      <td class="py-3 px-2">
        <span class="text-white font-medium">
          ${rec.username || `${rec.first_name || ''} ${rec.last_name || ''}`.trim() || 'Anonymous'}
        </span>
      </td>
      <td class="py-3 px-2 text-racing-muted text-sm">
        ${rec.track_name || [rec.location_city, rec.location_country].filter(Boolean).join(', ') || '-'}
      </td>
      <td class="py-3 px-2 text-racing-muted text-sm whitespace-nowrap">${formatDateTime(rec.start_time)}</td>
      <td class="py-3 px-2">
        <span class="px-2 py-1 rounded text-xs font-medium text-white ${STATUS_COLORS[rec.status] || 'bg-gray-500'}">
          ${STATUS_NAMES[rec.status] || 'UNKNOWN'}
        </span>
      </td>
    </tr>
  `).join('');
}

// Refresh all data
async function refreshData() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');

  await Promise.all([
    updateLiveRecordings(),
    updateLiveMonitoring()
  ]);

  document.getElementById('loading').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
}

// Initialize
document.addEventListener('DOMContentLoaded', refreshData);

// Auto-refresh every 30 seconds for live data
setInterval(refreshData, 30000);
