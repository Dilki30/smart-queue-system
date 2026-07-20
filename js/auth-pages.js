/* Login + Register page logic */

document.addEventListener('DOMContentLoaded', () => {
    // If already logged in, skip straight to the dashboard.
    // However, if it's the admin token, we don't want them redirected back to user dashboard.
    if (Auth.isLoggedIn() && (document.getElementById('loginForm') || document.getElementById('registerForm'))) {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'dashboard.html';
        }
        return;
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const registerForm = document.getElementById('registerForm');
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
});

async function handleLogin(e) {
    e.preventDefault();
    
    // Using .toLowerCase() and .trim() ensures capital letters or spaces won't break the admin login
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value.trim();
    const errorBox = document.getElementById('authError');
    const btn = e.target.querySelector('button[type="submit"]');

    // 👑 BULLETPROOF ADMIN BYPASS LOGIC 
    if (email === 'admin@admin.com' && password === 'JAPURA') {
        // Force the browser to save the admin identity directly
        localStorage.setItem('token', 'admin-token');
        localStorage.setItem('user', JSON.stringify({ name: 'System Admin', role: 'admin' }));
        
        window.location.href = 'admin.html';
        return; // Stop the regular login process
    }

    errorBox.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Logging in...';

    try {
        const data = await api_.post('/api/auth/login', { email, password });
        Auth.setSession(data.token, data.user);
        
        // Save phone separately for your SMS integration later
        if (data.user && data.user.phone) {
            localStorage.setItem('phone', data.user.phone); 
        }

        window.location.href = 'dashboard.html';
    } catch (err) {
        errorBox.textContent = err.message;
        errorBox.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = 'Login';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorBox = document.getElementById('authError');
    const btn = e.target.querySelector('button[type="submit"]');

    errorBox.style.display = 'none';

    if (password !== confirmPassword) {
        errorBox.textContent = 'Passwords do not match.';
        errorBox.style.display = 'block';
        return;
    }
    if (password.length < 8) {
        errorBox.textContent = 'Password must be at least 8 characters long.';
        errorBox.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating account...';

    try {
        const data = await api_.post('/api/auth/register', { name, email, phone, password });
        Auth.setSession(data.token, data.user);
        
        // Save phone separately for your SMS integration later
        localStorage.setItem('phone', phone);

        window.location.href = 'dashboard.html';
    } catch (err) {
        errorBox.textContent = err.message;
        errorBox.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = 'Register';
    }
}
