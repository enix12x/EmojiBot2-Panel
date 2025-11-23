let API_BASE = '';
let API_SECRET = '';

let currentUser = null;
let authToken = localStorage.getItem('authToken');
let vms = [];
let currentPage = 'emojis';

document.addEventListener('DOMContentLoaded', () => {
  if (window.PANEL_CONFIG && window.PANEL_CONFIG.apiUrl) {
    const apiUrl = window.PANEL_CONFIG.apiUrl;
    API_BASE = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
    API_SECRET = window.PANEL_CONFIG.apiSecret || '';
    console.log('API Base URL:', API_BASE);
  } else {
    console.error('PANEL_CONFIG or apiUrl not found!', window.PANEL_CONFIG);
    alert('Configuration error: API URL not set. Please check your config.json file.');
    return;
  }
  
  window.addEventListener('hashchange', handleRoute);
  
  const rulesAccepted = localStorage.getItem('rulesAccepted') === 'true';
  
  if (authToken) {
    checkAuth().then(() => {
      loadVMs();
      if (!rulesAccepted) {
        showRulesModal();
      } else {
        handleRoute();
      }
    });
  } else {
    showLogin();
  }
  
  setupEventListeners();

  const rulesCheckbox = document.getElementById('rules-accepted');
  const acceptBtn = document.getElementById('rules-accept-btn');
  if (rulesCheckbox && acceptBtn) {
    rulesCheckbox.addEventListener('change', function() {
      acceptBtn.disabled = !this.checked;
    });
  }
});


function handleRoute() {
  if (!currentUser) return;
  
  const hash = window.location.hash.slice(1) || 'emojis';
  currentPage = hash;
  

  document.querySelectorAll('.page-section').forEach(section => {
    section.classList.remove('active');
  });
  
  const pageElement = document.getElementById(`${hash}-page`);
  if (pageElement) {
    pageElement.classList.add('active');
  }
    // Update nav links
  document.querySelectorAll('#nav-pages .nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${hash}`) {
      link.classList.add('active');
    }
  });
  

  switch(hash) {
    case 'emojis':
      loadEmojis();
      break;
    case 'users':
      if (currentUser.is_admin) loadUsers();
      break;
    case 'administration':
      if (currentUser.is_admin) {
        loadBlockedDomains();
        loadEmojiRequests();
      }
      break;
  }
}

function navigate(page) {
  window.location.hash = page;
}

function apiRequest(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-secret': API_SECRET,
    ...(options.headers || {})
  };
  
  if (authToken && !options.skipAuth) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  return fetch(url, {
    ...options,
    headers
  });
}

async function loadVMs() {
  try {
    const response = await apiRequest(`${API_BASE}/vms`);
    if (response.ok) {
      const data = await response.json();
      vms = data.vms;
    }
  } catch (error) {
    console.error('Failed to load VMs:', error);
  }
}

function setupEventListeners() {
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  document.getElementById('register-form')?.addEventListener('submit', handleRegister);
}

function showRulesModal() {
  const modal = new bootstrap.Modal(document.getElementById('rulesModal'), {
    backdrop: 'static',
    keyboard: false
  });
  modal.show();
}

function acceptRules() {
  localStorage.setItem('rulesAccepted', 'true');
  const modal = bootstrap.Modal.getInstance(document.getElementById('rulesModal'));
  modal.hide();
  handleRoute();
}

async function checkAuth() {
  try {
    const response = await apiRequest(`${API_BASE}/me`);
    if (response.ok) {
      const data = await response.json();
      currentUser = data.user;
      showDashboard();
    } else {
      localStorage.removeItem('authToken');
      authToken = null;
      showLogin();
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    showLogin();
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const errorDiv = document.getElementById('login-error');
  errorDiv.style.display = 'none';
  
  try {
    const response = await apiRequest(`${API_BASE}/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      skipAuth: true
    });
    const data = await response.json();
    
    if (response.ok) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('authToken', authToken);
      showDashboard();
    } else {
      errorDiv.textContent = data.error || 'Login failed';
      errorDiv.style.display = 'block';
    }
  } catch (error) {
    errorDiv.textContent = 'Network error. Please try again.';
    errorDiv.style.display = 'block';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const errorDiv = document.getElementById('register-error');
  const successDiv = document.getElementById('register-success');
  errorDiv.style.display = 'none';
  successDiv.style.display = 'none';
  
  try {
    const response = await apiRequest(`${API_BASE}/register`, {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
      skipAuth: true
    });
    const data = await response.json();
    
    if (response.ok) {
      successDiv.style.display = 'block';
      document.getElementById('register-form').reset();
      setTimeout(() => showLogin(), 2000);
    } else {
      errorDiv.textContent = data.error || 'Registration failed';
      errorDiv.style.display = 'block';
    }
  } catch (error) {
    errorDiv.textContent = 'Network error. Please try again.';
    errorDiv.style.display = 'block';
  }
}

function showLogin() {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.getElementById('login-section').classList.add('active');
  document.getElementById('nav-login').style.display = 'block';
  document.getElementById('nav-register').style.display = 'block';
  document.getElementById('nav-user').style.display = 'none';
  document.getElementById('nav-pages').style.display = 'none';
}

function showRegister() {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.getElementById('register-section').classList.add('active');
}

async function showDashboard() {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.getElementById('nav-login').style.display = 'none';
  document.getElementById('nav-register').style.display = 'none';
  document.getElementById('nav-user').style.display = 'block';
  document.getElementById('nav-pages').style.display = 'flex';
  document.getElementById('user-name').textContent = currentUser.username;
  
  // Show/hide nav items based on role
      if (currentUser.is_admin) {
        document.getElementById('nav-users').style.display = 'block';
        document.getElementById('nav-admin').style.display = 'block';
      } else {
        document.getElementById('nav-users').style.display = 'none';
        document.getElementById('nav-admin').style.display = 'none';
      }
  
  handleRoute();
}

function logout() {
  localStorage.removeItem('authToken');
  authToken = null;
  currentUser = null;
  showLogin();
}

async function deleteMyAccount() {
  if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) return;
  
  try {
    const response = await apiRequest(`${API_BASE}/users/${currentUser.id}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      alert('Account deleted successfully.');
      logout();
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to delete account');
    }
  } catch (error) {
    console.error('Failed to delete account:', error);
    alert('Network error');
  }
}


async function loadUsers() {
  try {
    const response = await apiRequest(`${API_BASE}/users`);
    if (response.ok) {
      const data = await response.json();
      renderUsersTable(data.users);
    }
  } catch (error) {
    console.error('Failed to load users:', error);
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = users.map(user => {
    const role = user.is_admin ? 'admin' : (user.is_moderator ? 'moderator' : 'user');
    return `
    <tr>
      <td>${user.id}</td>
      <td>${user.username}</td>
      <td>${user.email}</td>
      <td>
        <select class="form-select form-select-sm" onchange="updateUserRole(${user.id}, this.value)" ${user.id === currentUser.id && user.is_admin ? 'disabled' : ''}>
          <option value="user" ${role === 'user' ? 'selected' : ''}>User</option>
          <option value="moderator" ${role === 'moderator' ? 'selected' : ''}>Moderator</option>
          <option value="admin" ${role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </td>
      <td>
        ${user.is_verified ? '<span class="badge badge-verified">Verified</span>' : '<span class="badge bg-warning">Unverified</span>'}
        ${user.is_blocked ? '<span class="badge badge-blocked">Blocked</span>' : ''}
      </td>
      <td>${new Date(user.created_at).toLocaleDateString()}</td>
      <td>
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" ${user.is_verified ? 'checked' : ''} onchange="updateUserVerified(${user.id}, this.checked)">
          <label class="form-check-label">Verified</label>
        </div>
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" ${user.is_blocked ? 'checked' : ''} onchange="updateUserBlocked(${user.id}, this.checked)">
          <label class="form-check-label">Blocked</label>
        </div>
        ${user.id !== currentUser.id ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">Delete</button>` : ''}
      </td>
    </tr>
    `;
  }).join('');
}

async function updateUserRole(userId, role) {
  try {
    const updates = {};
    if (role === 'admin') {
      updates.is_admin = true;
      updates.is_moderator = false;
    } else if (role === 'moderator') {
      updates.is_moderator = true;
      updates.is_admin = false;
    } else {
      updates.is_admin = false;
      updates.is_moderator = false;
    }
    
    const response = await apiRequest(`${API_BASE}/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    
    if (response.ok) {
      loadUsers();
    } else {
      alert('Failed to update user role');
    }
  } catch (error) {
    console.error('Failed to update user role:', error);
    alert('Network error');
  }
}

async function updateUserVerified(userId, verified) {
  try {
    const response = await apiRequest(`${API_BASE}/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_verified: verified })
    });
    
    if (!response.ok) {
      alert('Failed to update user');
    }
  } catch (error) {
    console.error('Failed to update user:', error);
    alert('Network error');
  }
}

async function updateUserBlocked(userId, blocked) {
  try {
    const response = await apiRequest(`${API_BASE}/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_blocked: blocked })
    });
    
    if (!response.ok) {
      alert('Failed to update user');
    }
  } catch (error) {
    console.error('Failed to update user:', error);
    alert('Network error');
  }
}

async function deleteUser(userId) {
  if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
  
  try {
    const response = await apiRequest(`${API_BASE}/users/${userId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      loadUsers();
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to delete user');
    }
  } catch (error) {
    console.error('Failed to delete user:', error);
    alert('Network error');
  }
}

async function loadEmojis() {
  try {
    const response = await apiRequest(`${API_BASE}/emojis`);
    if (response.ok) {
      const data = await response.json();
      renderEmojisTable(data.emojis);
    }
  } catch (error) {
    console.error('Failed to load emojis:', error);
  }
}

function renderEmojisTable(emojis) {
  const tbody = document.getElementById('emojis-table-body');
  if (emojis.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">No emojis created yet.</td></tr>';
    return;
  }
  
  tbody.innerHTML = emojis.map(emoji => `
    <tr>
      <td>${emoji.id}</td>
      <td><strong>${emoji.name}</strong></td>
      <td><img src="${emoji.web_address}" alt="${emoji.name}" class="emoji-preview" onerror="this.style.display='none'"></td>
      <td>${emoji.description}</td>
      <td>${emoji.vm_node_ids.join(', ') || 'None'}</td>
      <td>${emoji.created_by_username || 'Unknown'}</td>
      <td>
        ${(currentUser.is_admin || emoji.created_by === currentUser.id) ? `<button class="btn btn-sm btn-danger" onclick="deleteEmoji(${emoji.id})">Delete</button>` : ''}
      </td>
    </tr>
  `).join('');
}

function showCreateEmojiModal() {
  const vmCheckboxes = document.getElementById('vm-checkboxes');
  vmCheckboxes.innerHTML = vms.map(vm => `
    <div class="form-check">
      <input class="form-check-input" type="checkbox" value="${vm}" id="vm-${vm}" name="vm-node-ids">
      <label class="form-check-label" for="vm-${vm}">${vm}</label>
    </div>
  `).join('');
  
  const modal = new bootstrap.Modal(document.getElementById('createEmojiModal'));
  modal.show();
}

async function createEmoji() {
  const name = document.getElementById('emoji-name').value;
  const webAddress = document.getElementById('emoji-web-address').value;
  const description = document.getElementById('emoji-description').value;
  const checkboxes = document.querySelectorAll('input[name="vm-node-ids"]:checked');
  const vmNodeIds = Array.from(checkboxes).map(cb => cb.value);
  
  if (!name || !webAddress || !description || vmNodeIds.length === 0) {
    const errorDiv = document.getElementById('create-emoji-error');
    errorDiv.textContent = 'Please fill in all fields and select at least one VM.';
    errorDiv.style.display = 'block';
    return;
  }
  
  const errorDiv = document.getElementById('create-emoji-error');
  errorDiv.style.display = 'none';
  
  try {
    const response = await apiRequest(`${API_BASE}/emojis`, {
      method: 'POST',
      body: JSON.stringify({ name, web_address: webAddress, description, vm_node_ids: vmNodeIds })
    });
    const data = await response.json();
    
    if (response.ok) {
      const modal = bootstrap.Modal.getInstance(document.getElementById('createEmojiModal'));
      modal.hide();
      document.getElementById('create-emoji-form').reset();
      loadEmojis();
    } else {
      errorDiv.textContent = data.error || 'Failed to create emoji';
      errorDiv.style.display = 'block';
    }
  } catch (error) {
    errorDiv.textContent = 'Network error. Please try again.';
    errorDiv.style.display = 'block';
  }
}

async function deleteEmoji(emojiId) {
  if (!confirm('Are you sure you want to delete this emoji?')) return;
  
  try {
    const response = await apiRequest(`${API_BASE}/emojis/${emojiId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      loadEmojis();
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to delete emoji');
    }
  } catch (error) {
    console.error('Failed to delete emoji:', error);
    alert('Network error');
  }
}


async function loadEmojiRequests() {
  try {
    const response = await apiRequest(`${API_BASE}/emoji-requests?limit=100`);
    if (response.ok) {
      const data = await response.json();
      renderEmojiRequestsTable(data.requests);
    }
  } catch (error) {
    console.error('Failed to load emoji requests:', error);
  }
}

function renderEmojiRequestsTable(requests) {
  const tbody = document.getElementById('emoji-requests-table-body');
  if (requests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No emoji requests yet.</td></tr>';
    return;
  }
  
  tbody.innerHTML = requests.map(req => `
    <tr>
      <td>${req.id}</td>
      <td>${req.username || 'Unknown'}</td>
      <td>${req.emoji_name || 'Unknown'}</td>
      <td>${req.vm_node_id}</td>
      <td>${new Date(req.created_at).toLocaleString()}</td>
    </tr>
  `).join('');
}

async function loadBlockedDomains() {
  try {
    const response = await apiRequest(`${API_BASE}/blocked-domains`);
    if (response.ok) {
      const data = await response.json();
      renderBlockedDomainsTable(data.domains);
    }
  } catch (error) {
    console.error('Failed to load blocked domains:', error);
  }
}

function renderBlockedDomainsTable(domains) {
  const tbody = document.getElementById('blocked-domains-table-body');
  if (domains.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" class="text-center">No blocked domains.</td></tr>';
    return;
  }
  
  tbody.innerHTML = domains.map(domain => `
    <tr>
      <td><code>${domain}</code></td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="removeBlockedDomain('${domain}')">Remove</button>
      </td>
    </tr>
  `).join('');
}

function showAddDomainModal() {
  const modal = new bootstrap.Modal(document.getElementById('addDomainModal'));
  modal.show();
}

async function addBlockedDomain() {
  const domain = document.getElementById('blocked-domain').value.trim();
  if (!domain) {
    const errorDiv = document.getElementById('add-domain-error');
    errorDiv.textContent = 'Please enter a domain name.';
    errorDiv.style.display = 'block';
    return;
  }
  
  const errorDiv = document.getElementById('add-domain-error');
  errorDiv.style.display = 'none';
  
  try {
    const response = await apiRequest(`${API_BASE}/blocked-domains`, {
      method: 'POST',
      body: JSON.stringify({ domain })
    });
    
    if (response.ok) {
      const modal = bootstrap.Modal.getInstance(document.getElementById('addDomainModal'));
      modal.hide();
      document.getElementById('add-domain-form').reset();
      loadBlockedDomains();
    } else {
      const data = await response.json();
      errorDiv.textContent = data.error || 'Failed to add blocked domain';
      errorDiv.style.display = 'block';
    }
  } catch (error) {
    errorDiv.textContent = 'Network error. Please try again.';
    errorDiv.style.display = 'block';
  }
}

async function removeBlockedDomain(domain) {
  if (!confirm(`Are you sure you want to remove ${domain} from the blocked list?`)) return;
  
  try {
    const response = await apiRequest(`${API_BASE}/blocked-domains/${encodeURIComponent(domain)}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      loadBlockedDomains();
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to remove blocked domain');
    }
  } catch (error) {
    console.error('Failed to remove blocked domain:', error);
    alert('Network error');
  }
}

window.showLogin = showLogin;
window.showRegister = showRegister;
window.logout = logout;
window.deleteMyAccount = deleteMyAccount;
window.navigate = navigate;
window.acceptRules = acceptRules;
window.updateUserRole = updateUserRole;
window.updateUserVerified = updateUserVerified;
window.updateUserBlocked = updateUserBlocked;
window.deleteUser = deleteUser;
window.showCreateEmojiModal = showCreateEmojiModal;
window.createEmoji = createEmoji;
window.deleteEmoji = deleteEmoji;
window.loadEmojiRequests = loadEmojiRequests;
window.showAddDomainModal = showAddDomainModal;
window.addBlockedDomain = addBlockedDomain;
window.removeBlockedDomain = removeBlockedDomain;
