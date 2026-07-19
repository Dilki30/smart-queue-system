document.addEventListener('DOMContentLoaded', () => {
    Auth.requireLogin();
    loadHistory();
});

async function loadHistory() {
    const tbody = document.getElementById('historyBody');
    try {
        const { tickets } = await api_.get('/api/tickets/mine');
        if (tickets.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No bookings yet. <a href="booking.html">Book one now</a>.</td></tr>`;
            return;
        }
        tbody.innerHTML = tickets.map(t => {
            const isHospital = t.type === 'hospital';
            const badge = {
                completed: '<span class="badge bg-success">Completed</span>',
                almost: '<span class="badge bg-warning text-dark">Almost</span>',
                waiting: '<span class="badge bg-primary">Waiting</span>',
                cancelled: '<span class="badge bg-danger">Cancelled</span>'
            }[t.status === 'cancelled' ? 'cancelled' : t.liveStatus] || '';

            return `<tr>
                <td><strong>${t.displayCode}</strong></td>
                <td>${isHospital ? '<i class="fas fa-hospital me-1"></i>Hospital' : '<i class="fas fa-building-columns me-1"></i>Bank'}</td>
                <td>${isHospital ? t.doctorName : t.serviceName}</td>
                <td>${t.date}${t.time ? ' ' + t.time : ''}</td>
                <td>${badge}</td>
                <td><a href="ticket.html?id=${t.id}" class="btn btn-sm btn-outline-primary">View</a></td>
            </tr>`;
        }).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">${err.message}</td></tr>`;
    }
}
