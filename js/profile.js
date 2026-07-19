document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireLogin();

    const user = Auth.getUser();
    if (user) {
        document.getElementById('name').value = user.name || '';
        document.getElementById('phone').value = user.phone || '';
        document.getElementById('email').value = user.email || '';
    }

    document.getElementById('profileForm').addEventListener('submit', saveProfile);
});

async function saveProfile(e) {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword || confirmNewPassword) {
        if (newPassword !== confirmNewPassword) {
            showNotification('New passwords do not match.', 'danger');
            return;
        }
        if (newPassword.length < 8) {
            showNotification('New password must be at least 8 characters.', 'danger');
            return;
        }
        if (!currentPassword) {
            showNotification('Enter your current password to set a new one.', 'danger');
            return;
        }
    }

    try {
        const body = { name, phone };
        if (newPassword) {
            body.currentPassword = currentPassword;
            body.newPassword = newPassword;
        }
        const { user } = await api_.put('/api/auth/profile', body);
        localStorage.setItem('sq_user', JSON.stringify(user));
        showNotification('Profile updated successfully!');
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmNewPassword').value = '';
    } catch (err) {
        showNotification(err.message, 'danger');
    }
}
