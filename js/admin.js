document.addEventListener('DOMContentLoaded', () => {
    loadAdminTickets();
});

async function loadAdminTickets() {
    const tbody = document.getElementById('adminTicketList');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><span class="spinner-border text-primary"></span></td></tr>';

    try {
        const data = await api_.get('/api/admin/tickets');
        const tickets = data.tickets || [];

        if (tickets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No appointments found in the system.</td></tr>';
            return;
        }

        tbody.innerHTML = tickets.map(t => {
            const isHospital = t.type === 'hospital';
            const typeBadge = isHospital 
                ? '<span class="badge bg-info text-dark"><i class="fas fa-hospital me-1"></i>Hospital</span>' 
                : '<span class="badge bg-warning text-dark"><i class="fas fa-building-columns me-1"></i>Bank</span>';

            let statusBadge = '<span class="badge bg-primary">Waiting</span>';
            if (t.status === 'cancelled') statusBadge = '<span class="badge bg-danger">Cancelled</span>';
            if (t.status === 'completed') statusBadge = '<span class="badge bg-success">Completed</span>';

            const details = isHospital 
                ? `<strong>${t.hospitalName || 'Hospital'}</strong><br><small class="text-muted">${t.doctorName || ''}</small>`
                : `<strong>${t.bankName || 'Bank'}</strong><br><small class="text-muted">${t.serviceName || ''}</small>`;

            const dateSlot = t.date ? `${t.date} (${t.slot || 'N/A'})` : (t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A');

            const actionBtn = t.status === 'cancelled' 
                ? '<button class="btn btn-sm btn-secondary" disabled>Cancelled</button>'
                : `<button class="btn btn-sm btn-outline-danger" onclick="cancelAdminTicket('${t.id}')"><i class="fas fa-times me-1"></i>Cancel</button>`;

            return `
                <tr>
                    <td><strong class="text-primary fs-5">${t.tokenNumber || t.token || t.id}</strong></td>
                    <td>${typeBadge}</td>
                    <td>${details}</td>
                    <td><small>${dateSlot}</small></td>
                    <td>${statusBadge}</td>
                    <td>${actionBtn}</td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error('Failed to load tickets:', err);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4"><i class="fas fa-exclamation-triangle me-2"></i>Error loading tickets: ${err.message || 'Could not reach server'}</td></tr>`;
    }
}

async function cancelAdminTicket(id) {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
        await api_.post(`/api/tickets/${id}/cancel`);
        if (typeof showToast === 'function') {
            showToast('Appointment cancelled successfully', 'success');
        } else {
            alert('Appointment cancelled successfully!');
        }
        loadAdminTickets();
    } catch (err) {
        alert(err.message || 'Failed to cancel appointment');
    }
}

function adminLogout() {
    localStorage.clear();
    window.location.href = 'login.html';
}