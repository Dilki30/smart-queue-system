let pollTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    Auth.requireLogin();
    const id = new URLSearchParams(window.location.search).get('id');

    if (id) {
        showTrackerFor(id);
    } else {
        showPicker();
    }

    document.getElementById('refreshBtn').addEventListener('click', () => {
        const currentId = new URLSearchParams(window.location.search).get('id');
        if (currentId) fetchStatus(currentId, true);
    });
});

async function showPicker() {
    document.getElementById('trackerView').style.display = 'none';
    const pickerView = document.getElementById('pickerView');
    pickerView.style.display = 'block';
    pickerView.innerHTML = `<div class="text-center py-4"><span class="spinner-border text-primary"></span></div>`;

    try {
        const { tickets } = await api_.get('/api/tickets/mine');
        const active = tickets.filter(t => t.status !== 'cancelled' && t.liveStatus !== 'completed');
        if (active.length === 0) {
            pickerView.innerHTML = `
                <div class="custom-card p-4 text-center">
                    <p class="text-muted mb-3">You have no active tickets right now.</p>
                    <a href="booking.html" class="btn btn-primary">Book an Appointment</a>
                </div>`;
            return;
        }
        pickerView.innerHTML = `<h5 class="mb-3">Select a ticket to track</h5>` + active.map(t => `
            <a href="queue.html?id=${t.id}" class="custom-card p-3 mb-3 d-block text-decoration-none text-reset selectable-card">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fs-4 fw-bold text-primary">${t.displayCode}</div>
                        <div class="small text-muted">${t.type === 'hospital' ? t.doctorName + ' · ' + t.hospitalName : t.serviceName + ' · ' + t.bankName}</div>
                    </div>
                    <i class="fas fa-chevron-right text-muted"></i>
                </div>
            </a>`).join('');
    } catch (err) {
        pickerView.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    }
}

function showTrackerFor(id) {
    document.getElementById('pickerView').style.display = 'none';
    document.getElementById('trackerView').style.display = 'block';
    fetchStatus(id);
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => fetchStatus(id), 5000);
}

async function fetchStatus(id, manualRefresh = false) {
    try {
        const { ticket } = await api_.get(`/api/tickets/${id}`);
        renderTracker(ticket);
        if (manualRefresh) showNotification('Queue status refreshed.');
        if (ticket.liveStatus === 'completed' || ticket.status === 'cancelled') {
            clearInterval(pollTimer);
        }
    } catch (err) {
        showNotification(err.message, 'danger');
    }
}

function renderTracker(t) {
    document.getElementById('myToken').textContent = t.displayCode;
    document.getElementById('myPosition').textContent = t.status === 'cancelled' ? '—' : t.position;
    document.getElementById('myWaitTime').textContent = t.status === 'cancelled' ? '—' : t.estimatedWaitMinutes;
    document.getElementById('nowServing').textContent = t.nowServing > 0 ? t.displayCode.split('-')[0] + '-' + String(t.nowServing).padStart(3, '0') : '—';

    const banner = document.getElementById('statusBanner');
    if (t.status === 'cancelled') {
        banner.className = 'custom-card p-3 bg-danger text-white';
        banner.innerHTML = '<h5 class="mb-0">This ticket was cancelled</h5>';
    } else if (t.liveStatus === 'completed') {
        banner.className = 'custom-card p-3 bg-success text-white';
        banner.innerHTML = '<h5 class="mb-0">✅ Completed — thank you!</h5>';
    } else if (t.liveStatus === 'almost') {
        banner.className = 'custom-card p-3 bg-warning text-dark';
        banner.innerHTML = '<h5 class="mb-0">🔔 Almost your turn — please be ready!</h5>';
    } else {
        banner.className = 'custom-card p-3 bg-primary text-white';
        banner.innerHTML = `<h5 class="mb-0">Now Serving: <span class="fw-bold fs-3 ms-2">${t.nowServing > 0 ? String(t.nowServing).padStart(3, '0') : '—'}</span></h5>`;
    }
}
