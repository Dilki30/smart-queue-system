document.addEventListener('DOMContentLoaded', () => {
    // Basic security check: Make sure they are actually an admin
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }
    loadAllTickets();
});

async function loadAllTickets() {
    const tbody = document.getElementById('adminTicketList');
    try {
        // Fetching all tickets from the backend
        const data = await api_.get('/api/admin/tickets');
        
        // Handle variations in how your backend might return the data
        const tickets = data.tickets || data; 

        if (!tickets || tickets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No appointments found in the system.</td></tr>';
            return;
        }

        // Sort tickets by newest first
        tickets.reverse();

        tbody.innerHTML = tickets.map(t => `
            <tr>
                <td class="align-middle"><strong>${t.displayCode || t.id.substring(0,6)}</strong></td>
                <td class="align-middle">
                    ${t.type === 'hospital' 
                        ? '<span class="badge bg-info text-dark"><i class="fas fa-hospital me-1"></i>Hospital</span>' 
                        : '<span class="badge bg-secondary"><i class="fas fa-building-columns me-1"></i>Bank</span>'}
                </td>
                <td class="align-middle">
                    <div class="small fw-bold">${t.doctorName || t.serviceName || 'N/A'}</div>
                    <div class="text-muted small">${t.hospitalName || t.bankName || ''}</div>
                </td>
                <td class="align-middle">
                    <span class="badge ${getStatusColor(t)}">${(t.status === 'cancelled' ? 'Cancelled' : (t.liveStatus || t.status)).toUpperCase()}</span>
                </td>
                <td class="align-middle">
                    <a href="ticket.html?id=${t.id}" class="btn btn-sm btn-outline-primary" target="_blank">View</a>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4"><i class="fas fa-exclamation-triangle me-2"></i>Error loading tickets: ${err.message}</td></tr>`;
    }
}

function getStatusColor(t) {
    if (t.status === 'cancelled') return 'bg-danger';
    if (t.liveStatus === 'completed') return 'bg-success';
    if (t.liveStatus === 'almost') return 'bg-warning text-dark';
    return 'bg-primary';
}