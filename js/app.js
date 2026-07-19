document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    const togglePasswordBtn = document.getElementById('togglePassword');
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', function () {
            const pwdInput = document.getElementById('password');
            const icon = this.querySelector('i');
            if (pwdInput.type === 'password') {
                pwdInput.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                pwdInput.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });
    }
});

/* =========================================
   CORE FUNCTIONS (used across multiple pages)
   ========================================= */

function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = document.getElementById('theme-icon');
    const currentTheme = localStorage.getItem('theme') || 'light';

    document.documentElement.setAttribute('data-theme', currentTheme);

    if (themeToggleBtn && themeIcon) {
        themeIcon.className = currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        themeToggleBtn.addEventListener('click', () => {
            let newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            themeIcon.className = newTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        });
    }
}

function showNotification(message, type = 'primary') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toastHTML = `
        <div class="toast show align-items-center text-white bg-${type} border-0 mb-2" role="alert">
          <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()"></button>
          </div>
        </div>`;
    container.insertAdjacentHTML('beforeend', toastHTML);
    setTimeout(() => { if (container.lastChild) container.lastChild.remove(); }, 5000);
}

/* =========================================
   PASSWORD STRENGTH (Register page)
   ========================================= */
function checkStrength() {
    const pwd = document.getElementById('password').value;
    const bar = document.getElementById('strengthBar');
    const text = document.getElementById('strengthText');

    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.match(/[a-z]+/)) strength++;
    if (pwd.match(/[A-Z]+/)) strength++;
    if (pwd.match(/[0-9]+/)) strength++;

    bar.className = 'password-strength w-100 ';
    if (pwd.length === 0) {
        bar.classList.add('bg-secondary');
        text.innerText = "Password must be at least 8 characters long.";
    } else if (strength < 2) {
        bar.classList.add('bg-danger');
        text.innerText = "Weak";
    } else if (strength === 3) {
        bar.classList.add('bg-warning');
        text.innerText = "Medium";
    } else {
        bar.classList.add('bg-success');
        text.innerText = "Strong";
    }
    checkMatch();
}

function checkMatch() {
    const pwd = document.getElementById('password').value;
    const confirmPwd = document.getElementById('confirmPassword').value;
    const error = document.getElementById('matchError');
    if (confirmPwd.length > 0 && pwd !== confirmPwd) {
        error.style.display = 'block';
    } else {
        error.style.display = 'none';
    }
}
