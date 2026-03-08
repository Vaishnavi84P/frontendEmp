
// api.js
// This file handles all API calls to our Flask backend
// Backend is running on port 5000, all routes are under /api/v1/
// I'm using a simple fetch wrapper so I don't repeat headers everywhere


const BACKEND_URL = 'http://127.0.0.1:5000/api/v1';

// grab the token we stored during login
function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

// these headers go on every request
function makeHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
}

// generic fetch wrapper - handles errors in one place
async function callAPI(path, options = {}) {
  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      headers: makeHeaders(),
      ...options,
    });

    const result = await response.json();

    // if backend returned an error status, throw it so the UI can catch it

    if(!response.ok) {
      throw new Error(result.message || result.error || `Something Went Wrong (${response.status})`);
    }

    return result;
  } catch (err) {
    // make "Failed to fetch" more readable for the user
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error('Cannot reach the backend. Is Flask running on port 5000?');
    }
    throw err;
  }
}

// ── Authentication routes ────────────────────────────
// these match /api/v1/auth/... in auth_routes.py

export const authAPI = {
  // register a new user account
  register: (userData) =>
    callAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  // login and get back a JWT token
  login: (credentials) =>
    callAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  // logout - we wrap in catch so it doesn't break even if token expired
  logout: () =>
    callAPI('/auth/logout', { method: 'POST' }).catch(() => {}),

  // get current logged in user info
  me: () => callAPI('/auth/me'),

  // refresh the access token using refresh token
  refresh: () => callAPI('/auth/refresh', { method: 'POST' }),
};

// ── Employee routes ──────────────────────────────────
// these match /api/v1/employees/... in employee_routes.py
// Note: Flask Blueprint uses trailing slash so list/create need /employees/

export const employeeAPI = {
  // get all employees - supports pagination, search, department filter
  list: (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    return callAPI(`/employees/${queryString ? '?' + queryString : ''}`);
  },

  // get one employee by their DB id
  get: (id) => callAPI(`/employees/${id}`),

  // add a new employee - runs AI validation on backend
  create: (employeeData) =>
    callAPI('/employees/', {
      method: 'POST',
      body: JSON.stringify(employeeData),
    }),

  // update name/email/department for existing employee
  update: (id, changes) =>
    callAPI(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(changes),
    }),

  // soft delete - backend just sets is_active = false
  delete: (id) =>
    callAPI(`/employees/${id}`, { method: 'DELETE' }),

  // manually override validation status - manager can validate, flag, or reset to pending
  updateStatus: (id, status, reason = '') =>
    callAPI(`/employees/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    }),

  // download employee list as CSV/JSON
  export: () => callAPI('/employees/export'),

  // bulk upload via CSV file
  bulk: (formData) =>
    fetch(`${BACKEND_URL}/employees/bulk`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` }, // no Content-Type for FormData
      body: formData,
    }).then((r) => r.json()),
};

// ── Validation routes ────────────────────────────────
// check emails before saving employees

export const validateAPI = {
  // validate a single email - checks format, MX records, disposable domains
  email: (emailAddress) =>
    callAPI('/validate/email', {
      method: 'POST',
      body: JSON.stringify({ email: emailAddress }),
    }),

  // validate full employee record
  employee: (employeeData) =>
    callAPI('/validate/employee', {
      method: 'POST',
      body: JSON.stringify(employeeData),
    }),
};

// ── Analytics routes ─────────────────────────────────
// for the dashboard charts and logs page

export const analyticsAPI = {
  // summary numbers - total employees, flagged count, validation rate etc
  dashboard: () => callAPI('/analytics/dashboard'),

  // AI-generated insights about the data
  insights: () => callAPI('/analytics/insights'),

  // recent validation and audit logs
  logs: () => callAPI('/analytics/logs'),
};

//  Admin routes 
// only accessible to users with admin role

export const adminAPI = {
  // list all registered users
  users: () => callAPI('/admin/users'),

  // change a user's role (viewer/manager/admin)
  updateRole: (userId, newRole) =>
    callAPI(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: newRole }),
    }),

  // remove a user account
  deleteUser: (userId) =>
    callAPI(`/admin/users/${userId}`, { method: 'DELETE' }),
};