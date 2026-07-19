let currentTicket = null;

document.addEventListener('DOMContentLoaded', () => {
    Auth.requireLogin();
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
        window.location.href = 'history.html';
        return;
    }
    loadTicket(id);

    document.getElementById('downloadBtn').addEventListener('click', downloadTicket);
    document.getElementById('cancelTicketBtn').addEventListener('click', () => cancelTicket(id));
});

async function loadTicket(id) {
    const box = document.getElementById('ticketBox');
    try {
        const { ticket } = await api_.get(`/api/tickets/${id}`);
        currentTicket = ticket;
        renderTicket(ticket);
    } catch (err) {
        box.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    }
}

function renderTicket(t) {
    const isHospital = t.type === 'hospital';
    const placeName = isHospital ? t.hospitalName : t.bankName;
    const serviceLine = isHospital ? `${t.doctorName} — ${t.specialization}` : `${t.serviceName} (${t.counter})`;
    const whenLine = isHospital ? `${t.date} at ${t.time}` : `Today, ${t.date}`;

    const statusBadge = {
        completed: '<span class="badge bg-success">Completed</span>',
        almost: '<span class="badge bg-warning text-dark">Almost your turn</span>',
        waiting: '<span class="badge bg-primary">Waiting</span>',
        cancelled: '<span class="badge bg-danger">Cancelled</span>'
    }[t.liveStatus] || '';

    document.getElementById('ticketBox').innerHTML = `
        <div class="custom-card p-4 text-center border-primary border-top border-5" id="printableTicket">
            <div class="mb-2"><i class="fas ${isHospital ? 'fa-hospital' : 'fa-building-columns'} fa-2x text-primary"></i></div>
            <h6 class="text-muted mb-0">${placeName}</h6>
            <h1 class="display-3 fw-bold text-primary my-2">${t.displayCode}</h1>
            <p class="mb-1">${serviceLine}</p>
            <p class="text-muted small mb-3">${whenLine}</p>
            <div class="mb-3">${statusBadge}</div>
            <div class="row">
                <div class="col-6"><h6 class="text-muted small">Position</h6><h4>${t.status === 'cancelled' ? '—' : t.position}</h4></div>
                <div class="col-6"><h6 class="text-muted small">Est. Wait</h6><h4>${t.status === 'cancelled' ? '—' : t.estimatedWaitMinutes + 'm'}</h4></div>
            </div>
        </div>`;

    const cancelBtn = document.getElementById('cancelTicketBtn');
    cancelBtn.style.display = (t.status === 'cancelled' || t.liveStatus === 'completed') ? 'none' : 'inline-block';

    const trackBtn = document.getElementById('trackBtn');
    trackBtn.style.display = (t.status === 'cancelled') ? 'none' : 'inline-block';
    trackBtn.href = `queue.html?id=${t.id}`;
}

function downloadTicket() {
    if (!currentTicket) return;
    const t = currentTicket;
    const isHospital = t.type === 'hospital';

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: [90, 140] });

    doc.setFillColor(13, 110, 253);
    doc.rect(0, 0, 90, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text('SmartQueue Ticket', 45, 11, { align: 'center' });

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.text(isHospital ? t.hospitalName : t.bankName, 45, 28, { align: 'center' });

    doc.setFontSize(30);
    doc.setTextColor(13, 110, 253);
    doc.text(t.displayCode, 45, 45, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    let y = 58;
    const line = (label, value) => {
        doc.setFont(undefined, 'bold');
        doc.text(label, 10, y);
        doc.setFont(undefined, 'normal');
        doc.text(String(value), 35, y);
        y += 8;
    };

    if (isHospital) {
        line('Doctor:', t.doctorName);
        line('Specialty:', t.specialization);
        line('Date:', t.date);
        line('Time:', t.time);
    } else {
        line('Service:', t.serviceName);
        line('Counter:', t.counter);
        line('Date:', t.date);
    }
    line('Position:', t.status === 'cancelled' ? '-' : t.position);
    line('Est. wait:', t.status === 'cancelled' ? '-' : t.estimatedWaitMinutes + ' min');
    line('Issued:', new Date(t.createdAt).toLocaleString());

    doc.setDrawColor(200, 200, 200);
    doc.line(10, y + 2, 80, y + 2);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Please arrive 10 minutes before your position is called.', 45, y + 9, { align: 'center', maxWidth: 70 });

    doc.save(`ticket-${t.displayCode}.pdf`);
}

async function cancelTicket(id) {
    if (!confirm('Cancel this ticket? This cannot be undone.')) return;
    try {
        const { ticket } = await api('/api/tickets/' + id + '/cancel', { method: 'POST' });
        currentTicket = ticket;
        renderTicket(ticket);
        showNotification('Ticket cancelled.');
    } catch (err) {
        showNotification(err.message, 'danger');
    }
}
