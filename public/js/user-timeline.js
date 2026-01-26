// User Timeline page JavaScript

let currentUser = null;
let selectedUser = null; // User selected from autocomplete
let userAutocomplete = null;

// Initialize date inputs with default values (last 7 days)
function initDateInputs() {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  document.getElementById('endDate').value = today.toISOString().split('T')[0];
  document.getElementById('startDate').value = weekAgo.toISOString().split('T')[0];
}

// Format GA4 date (YYYYMMDD) to readable format
function formatGA4Date(dateStr) {
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Get event category for color coding (uses actionLabel for better matching)
function getEventCategory(label) {
  const labelUpper = label.toUpperCase();
  const categories = {
    recording: ['RECORDING', 'LAP', 'SESSION', 'TRACK'],
    auth: ['LOGIN', 'SIGN_UP', 'LOGOUT', 'AUTH', 'REGISTER'],
    social: ['LIKE', 'COMMENT', 'FOLLOW', 'SHARE', 'PROFILE'],
    navigation: ['SCREEN_VIEW', 'TAB', 'CLICK', 'TAP', 'VIEW', 'OPEN', 'CLOSE'],
    app: ['APP_LAUNCH', 'APP_FOREGROUND', 'APP_BACKGROUND', 'APP_CLOSE', 'FIRST_OPEN']
  };

  for (const [category, patterns] of Object.entries(categories)) {
    if (patterns.some(p => labelUpper.includes(p))) {
      return category;
    }
  }
  return 'other';
}

// Format action label for display (convert snake_case to readable)
function formatActionLabel(label) {
  return label
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Get color for event category
function getCategoryColor(category) {
  const colors = {
    recording: 'bg-racing-red text-white',
    auth: 'bg-green-500 text-white',
    social: 'bg-pink-500 text-white',
    navigation: 'bg-blue-500 text-white',
    app: 'bg-purple-500 text-white',
    other: 'bg-racing-border text-white'
  };
  return colors[category] || colors.other;
}

// Hide all result states
function hideAllStates() {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('errorState').classList.add('hidden');
  document.getElementById('noDataState').classList.add('hidden');
  document.getElementById('timelineResults').classList.add('hidden');
  document.getElementById('userInfo').classList.add('hidden');
}

// Show error state
function showError(message) {
  hideAllStates();
  document.getElementById('errorMessage').textContent = message;
  document.getElementById('errorState').classList.remove('hidden');
}

// Search for user and load their events
async function searchUser() {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  // Use selected user from autocomplete, or try to lookup by input value
  if (!selectedUser) {
    const username = document.getElementById('usernameInput').value.trim();
    if (!username) {
      showError('Please select a user');
      return;
    }

    // Try to lookup by username if user typed manually
    hideAllStates();
    document.getElementById('loading').classList.remove('hidden');

    try {
      const userResponse = await fetch(`/api/users/lookup?username=${encodeURIComponent(username)}`);
      if (!userResponse.ok) {
        if (userResponse.status === 404) {
          showError(`User "${username}" not found`);
          return;
        }
        throw new Error('Failed to lookup user');
      }
      selectedUser = await userResponse.json();
    } catch (error) {
      showError(error.message || 'Failed to lookup user');
      return;
    }
  }

  hideAllStates();
  document.getElementById('loading').classList.remove('hidden');

  try {
    currentUser = selectedUser;

    // Show user info
    document.getElementById('userInfo').classList.remove('hidden');
    document.getElementById('userName').textContent =
      `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || currentUser.username;
    document.getElementById('userEmail').textContent = currentUser.email || '-';
    document.getElementById('userIdDisplay').textContent = currentUser.id;
    document.getElementById('userCreatedAt').textContent = formatDate(currentUser.created_at);

    // Now fetch their GA4 events
    const eventsUrl = `/api/ga4/user-events?userId=${currentUser.id}&startDate=${startDate}&endDate=${endDate}`;
    const eventsResponse = await fetch(eventsUrl);

    if (!eventsResponse.ok) {
      throw new Error('Failed to fetch user events');
    }

    const events = await eventsResponse.json();

    document.getElementById('loading').classList.add('hidden');

    if (!events || events.length === 0) {
      document.getElementById('noDataState').classList.remove('hidden');
      return;
    }

    // Show timeline
    renderTimeline(events);

  } catch (error) {
    console.error('Error:', error);
    showError(error.message || 'An error occurred');
  }
}

// Render the timeline
function renderTimeline(data) {
  document.getElementById('timelineResults').classList.remove('hidden');

  // Calculate totals
  const totalDays = data.length;
  const totalEvents = data.reduce((sum, day) => sum + day.totalEvents, 0);

  document.getElementById('totalDays').textContent = totalDays;
  document.getElementById('totalEvents').textContent = formatNumber(totalEvents);

  // Render timeline
  const timeline = document.getElementById('timeline');
  timeline.innerHTML = data.map(day => {
    const eventsHtml = day.events.map(event => {
      const label = event.actionLabel || event.eventName;
      const category = getEventCategory(label);
      const colorClass = getCategoryColor(category);
      const displayLabel = formatActionLabel(label);

      // Show event type badge if action_type is different from eventName
      const eventBadge = event.actionType && event.actionType !== '(not set)'
        ? `<span class="text-xs px-1 py-0.5 rounded bg-racing-border/50 text-racing-muted">${event.eventName}</span>`
        : '';

      // Show exact time if available (from BigQuery), otherwise show count
      const timeOrCount = event.time
        ? `<span class="text-xs text-cyan-400 font-mono">${event.time}</span>`
        : `<span class="text-sm font-medium text-white">${event.count}x</span>`;

      // Show all params dynamically (excluding system/internal ones)
      const params = event.params || {};
      const excludeParams = [
        'screen_name', 'firebase_screen', 'action_type', 'timestamp', 'ga_session_id', 'ga_session_number',
        'engaged_session_event', 'firebase_event_origin', 'firebase_screen_class',
        'firebase_screen_id', 'firebase_previous_screen', 'firebase_previous_class',
        'firebase_previous_id', 'entrances', 'session_engaged', 'page_title',
        'page_location', 'page_referrer', 'engagement_time_msec'
      ];

      // Color coding for different param types
      const paramColors = {
        item_id: 'text-cyan-400',
        item_type: 'text-cyan-400',
        recording_id: 'text-cyan-400',
        track_id: 'text-green-400',
        event_id: 'text-yellow-400',
        driver_id: 'text-purple-400',
        user_id: 'text-pink-400',
        error_type: 'text-red-400',
        error_message: 'text-red-400',
        content_type: 'text-blue-400',
        method: 'text-blue-400',
        source: 'text-orange-400',
        search_query: 'text-indigo-400',
      };

      const contextParts = [];
      Object.entries(params).forEach(([key, value]) => {
        if (excludeParams.includes(key) || !value) return;
        const color = paramColors[key] || 'text-racing-muted';
        const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        contextParts.push(`<span class="inline-flex flex-wrap items-baseline gap-1"><span class="${color}">${displayKey}:</span> <span class="font-mono break-all">${value}</span></span>`);
      });

      const contextHtml = contextParts.length > 0
        ? `<div class="text-xs text-racing-muted mt-1 flex flex-wrap gap-x-3 gap-y-1 overflow-hidden break-words">${contextParts.join('')}</div>`
        : '';

      return `
        <div class="py-2 border-b border-racing-border/30 last:border-0">
          <div class="flex flex-col sm:flex-row sm:items-center gap-2">
            <div class="flex items-center gap-2 flex-wrap">
              ${timeOrCount}
              <span class="px-2 py-1 text-xs font-medium rounded ${colorClass} whitespace-nowrap">
                ${displayLabel}
              </span>
              ${eventBadge}
            </div>
            <span class="text-sm text-racing-muted truncate">${event.screenName}</span>
          </div>
          ${contextHtml}
        </div>
      `;
    }).join('');

    return `
      <div class="timeline-date">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-3">
          <h4 class="text-white font-medium text-sm sm:text-base">${formatGA4Date(day.date)}</h4>
          <span class="text-sm text-racing-muted">${day.totalEvents} events</span>
        </div>
        <div class="bg-racing-dark/50 rounded-lg p-3 sm:p-4 overflow-hidden">
          ${eventsHtml}
        </div>
      </div>
    `;
  }).join('');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initDateInputs();

  // Initialize user autocomplete
  userAutocomplete = initUserAutocomplete('usernameInput',
    // onSelect callback
    (user) => {
      selectedUser = user;
    },
    // onClear callback
    () => {
      selectedUser = null;
    }
  );

  // Allow Enter key to search
  document.getElementById('usernameInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchUser();
    }
  });
});
