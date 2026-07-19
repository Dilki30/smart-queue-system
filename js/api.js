/* ===========================================
   API client — talks to the backend (same origin).
   Handles auth token storage + JSON requests.
   =========================================== */

const API_BASE = ''; // same origin as the page (backend serves the frontend too)

const Auth = {
    TOKEN_KEY: 'sq_token',
    USER_KEY: 'sq_user',

    getToken() { return localStorage.getItem(this.TOKEN_KEY); },
    getUser() {
        const raw = localStorage.getItem(this.USER_KEY);
        return raw ? JSON.parse(raw) : null;
    },
    setSession(token, user) {
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    },
    clearSession() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
    },
    isLoggedIn() { return !!this.getToken(); },

    // Call at the top of any page that requires login.
    requireLogin() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
        }
    },

    logout() {
        api('/api/auth/logout', { method: 'POST' }).catch(() => {});
        this.clearSession();
        window.location.href = 'login.html';
    }
};

async function api(path, options = {}) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    const token = Auth.getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    let res;
    try {
        res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
    } catch (err) {
        throw new Error('Could not reach the server. Is the backend running?');
    }

    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    const data = isJson ? await res.json().catch(() => ({})) : null;

    if (!res.ok) {
        if (res.status === 401) {
            Auth.clearSession();
        }
        throw new Error((data && data.error) || `Request failed (${res.status})`);
    }
    return data;
}

const api_ = {
    get: (path) => api(path, { method: 'GET' }),
    post: (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) }),
    put: (path, body) => api(path, { method: 'PUT', body: JSON.stringify(body || {}) }),
};
