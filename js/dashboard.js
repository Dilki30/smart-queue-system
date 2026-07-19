document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireLogin();
    const user = Auth.getUser();
    if (user) document.getElementById('welcomeName').textContent = user.name.split(' ')[0];

    try {
        const { tickets } = await api_.get('/api/tickets/mine');
        const total = tickets.length;
        const completed = tickets.filter(t => t.liveStatus === 'completed' && t.status !== 'cancelled').length;
        const waiting = tickets.filter(t => (t.liveStatus === 'waiting' || t.liveStatus === 'almost') && t.status !== 'cancelled').length;

        document.getElementById('statTotal').textContent = total;
        document.getElementById('statCompleted').textContent = completed;
        document.getElementById('statWaiting').textContent = waiting;

        const active = tickets.find(t => t.status !== 'cancelled' && (t.liveStatus === 'waiting' || t.liveStatus === 'almost'));
        const activeBox = document.getElementById('activeTicketBox');
        if (active) {
            activeBox.style.display = 'block';
            activeBox.innerHTML = `
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                        <div class="text-muted small">Active ticket</div>
                        <div class="fs-4 fw-bold text-primary">${active.displayCode}</div>
                        <div class="small">${active.type === 'hospital' ? (active.doctorName + ' · ' + active.hospitalName) : (active.serviceName + ' · ' + active.bankName)}</div>
                    </div>
                    <a href="queue.html?id=${active.id}" class="btn btn-primary">Track Live Queue</a>
                </div>`;
        }
    } catch (err) {
        showNotification(err.message, 'danger');
    }
});
