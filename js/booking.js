/* Booking wizard: Hospital (hospital -> doctor by disease -> date/slot)
   and Bank (bank -> search need -> service) flows. */

const state = {
    mode: null,        // 'hospital' | 'bank'
    hospital: null,
    doctor: null,
    availability: null,
    selectedDate: null,
    selectedTime: null,
    bank: null,
    service: null
};

document.addEventListener('DOMContentLoaded', () => {
    Auth.requireLogin();

    document.getElementById('chooseHospitalBtn').addEventListener('click', () => startHospitalFlow());
    document.getElementById('chooseBankBtn').addEventListener('click', () => startBankFlow());

    document.getElementById('backToTypeBtn').addEventListener('click', showTypeStep);
    document.getElementById('backToHospitalListBtn').addEventListener('click', () => goToStep('hospitalList'));
    document.getElementById('backToDoctorListBtn').addEventListener('click', () => goToStep('doctorList'));
    document.getElementById('backToBankListBtn').addEventListener('click', () => goToStep('bankList'));

    document.getElementById('doctorSearchInput').addEventListener('input', debounce(loadDoctors, 300));
    document.getElementById('serviceSearchInput').addEventListener('input', debounce(loadServices, 300));

    document.getElementById('confirmSlotBtn').addEventListener('click', confirmHospitalBooking);
    document.getElementById('confirmServiceBtn').addEventListener('click', confirmBankBooking);
});

function debounce(fn, delay) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

const STEPS = ['type', 'hospitalList', 'doctorList', 'slots', 'bankList', 'services'];
function goToStep(name) {
    STEPS.forEach(s => {
        document.getElementById('step-' + s).style.display = (s === name) ? 'block' : 'none';
    });
}

function showTypeStep() { state.mode = null; goToStep('type'); }

/* ---------------- HOSPITAL FLOW ---------------- */

function startHospitalFlow() {
    state.mode = 'hospital';
    goToStep('hospitalList');
    loadHospitals();
}

async function loadHospitals() {
    const container = document.getElementById('hospitalListContainer');
    container.innerHTML = spinnerHTML();
    try {
        const { hospitals } = await api_.get('/api/hospitals');
        container.innerHTML = hospitals.map(h => `
            <div class="col-md-6">
                <div class="custom-card p-3 h-100 selectable-card" onclick="selectHospital('${h.id}', '${escapeAttr(h.name)}')">
                    <h5 class="mb-1"><i class="fas fa-hospital text-primary me-2"></i>${h.name}</h5>
                    <p class="text-muted mb-0"><i class="fas fa-map-marker-alt me-1"></i>${h.location}</p>
                </div>
            </div>`).join('');
    } catch (err) {
        container.innerHTML = errorHTML(err.message);
    }
}

function selectHospital(id, name) {
    state.hospital = { id, name };
    document.getElementById('selectedHospitalName').textContent = name;
    document.getElementById('doctorSearchInput').value = '';
    goToStep('doctorList');
    loadDoctors();
}

async function loadDoctors() {
    const container = document.getElementById('doctorListContainer');
    container.innerHTML = spinnerHTML();
    const search = document.getElementById('doctorSearchInput').value.trim();
    try {
        const params = search ? ('?disease=' + encodeURIComponent(search)) : '';
        const { doctors } = await api_.get(`/api/hospitals/${state.hospital.id}/doctors${params}`);
        if (doctors.length === 0) {
            container.innerHTML = `<div class="col-12"><p class="text-muted text-center py-3">No doctors match "${escapeHtml(search)}". Try a different symptom or condition.</p></div>`;
            return;
        }
        container.innerHTML = doctors.map(d => `
            <div class="col-md-6">
                <div class="custom-card p-3 h-100 selectable-card" onclick='selectDoctor(${JSON.stringify(d.id)}, ${JSON.stringify(d.name)}, ${JSON.stringify(d.specialization)})'>
                    <h5 class="mb-1"><i class="fas fa-user-doctor text-primary me-2"></i>${d.name}</h5>
                    <p class="text-muted mb-1">${d.specialization}</p>
                    <p class="small mb-0">${(d.diseases || []).slice(0, 4).map(x => `<span class="badge bg-secondary-subtle text-secondary-emphasis me-1">${x}</span>`).join('')}</p>
                </div>
            </div>`).join('');
    } catch (err) {
        container.innerHTML = errorHTML(err.message);
    }
}

async function selectDoctor(id, name, specialization) {
    state.doctor = { id, name, specialization };
    document.getElementById('selectedDoctorName').textContent = `${name} — ${specialization}`;
    goToStep('slots');

    const dateTabs = document.getElementById('dateTabs');
    const slotGrid = document.getElementById('slotGrid');
    dateTabs.innerHTML = spinnerHTML();
    slotGrid.innerHTML = '';
    document.getElementById('confirmSlotBtn').disabled = true;

    try {
        const data = await api_.get(`/api/doctors/${id}/availability`);
        state.availability = data;
        state.selectedDate = null;
        state.selectedTime = null;

        dateTabs.innerHTML = data.days.map((day, i) => `
            <button type="button" class="btn btn-outline-primary date-tab ${i === 0 ? 'active' : ''}" data-date="${day.date}" onclick="selectDate('${day.date}')">
                ${formatDateLabel(day.date)}
            </button>`).join('');

        if (data.days.length > 0) selectDate(data.days[0].date);
    } catch (err) {
        dateTabs.innerHTML = errorHTML(err.message);
    }
}

function selectDate(date) {
    state.selectedDate = date;
    state.selectedTime = null;
    document.getElementById('confirmSlotBtn').disabled = true;

    document.querySelectorAll('.date-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.date === date);
    });

    const day = state.availability.days.find(d => d.date === date);
    const slotGrid = document.getElementById('slotGrid');
    if (!day || day.slots.length === 0) {
        slotGrid.innerHTML = `<p class="text-muted">No slots available this day.</p>`;
        return;
    }
    slotGrid.innerHTML = day.slots.map(s => `
        <button type="button" class="btn slot-btn ${s.remaining === 0 ? 'btn-secondary disabled' : 'btn-outline-primary'}"
            ${s.remaining === 0 ? 'disabled' : `onclick="selectTime('${s.time}', this)"`}>
            ${s.time} ${s.remaining === 0 ? '<span class="small d-block">Full</span>' : `<span class="small d-block">${s.remaining} left</span>`}
        </button>`).join('');
}

function selectTime(time, btnEl) {
    state.selectedTime = time;
    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
    document.getElementById('confirmSlotBtn').disabled = false;
}

async function confirmHospitalBooking() {
    const btn = document.getElementById('confirmSlotBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Booking...';
    try {
        const { ticket } = await api_.post('/api/bookings/hospital', {
            doctorId: state.doctor.id,
            date: state.selectedDate,
            time: state.selectedTime
        });
        window.location.href = `ticket.html?id=${ticket.id}`;
    } catch (err) {
        showNotification(err.message, 'danger');
        btn.disabled = false;
        btn.innerHTML = 'Confirm Booking';
    }
}

/* ---------------- BANK FLOW ---------------- */

function startBankFlow() {
    state.mode = 'bank';
    goToStep('bankList');
    loadBanks();
}

async function loadBanks() {
    const container = document.getElementById('bankListContainer');
    container.innerHTML = spinnerHTML();
    try {
        const { banks } = await api_.get('/api/banks');
        container.innerHTML = banks.map(b => `
            <div class="col-md-6">
                <div class="custom-card p-3 h-100 selectable-card" onclick="selectBank('${b.id}', '${escapeAttr(b.name)}')">
                    <h5 class="mb-1"><i class="fas fa-building-columns text-primary me-2"></i>${b.name}</h5>
                    <p class="text-muted mb-0"><i class="fas fa-map-marker-alt me-1"></i>${b.location}</p>
                </div>
            </div>`).join('');
    } catch (err) {
        container.innerHTML = errorHTML(err.message);
    }
}

function selectBank(id, name) {
    state.bank = { id, name };
    document.getElementById('selectedBankName').textContent = name;
    document.getElementById('serviceSearchInput').value = '';
    state.service = null;
    document.getElementById('confirmServiceBtn').disabled = true;
    goToStep('services');
    loadServices();
}

async function loadServices() {
    const container = document.getElementById('serviceListContainer');
    container.innerHTML = spinnerHTML();
    const search = document.getElementById('serviceSearchInput').value.trim();
    try {
        const params = search ? ('?search=' + encodeURIComponent(search)) : '';
        const { services } = await api_.get(`/api/banks/${state.bank.id}/services${params}`);
        if (services.length === 0) {
            container.innerHTML = `<p class="text-muted text-center py-3">No matching service for "${escapeHtml(search)}". Try: withdraw, deposit, renew card, loan, new account...</p>`;
            return;
        }
        container.innerHTML = services.map(s => `
            <div class="list-group-item list-group-item-action service-item" onclick='selectService(${JSON.stringify(s.id)}, ${JSON.stringify(s.name)}, this)'>
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${s.name}</strong>
                        <div class="small text-muted">${s.counter} · approx. ${s.avgServiceMinutes} min</div>
                    </div>
                    <i class="fas fa-chevron-right text-muted"></i>
                </div>
            </div>`).join('');
    } catch (err) {
        container.innerHTML = errorHTML(err.message);
    }
}

function selectService(id, name, el) {
    state.service = { id, name };
    document.querySelectorAll('.service-item').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('confirmServiceBtn').disabled = false;
}

async function confirmBankBooking() {
    const btn = document.getElementById('confirmServiceBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Getting number...';
    try {
        const { ticket } = await api_.post('/api/bookings/bank', {
            bankId: state.bank.id,
            serviceId: state.service.id
        });
        window.location.href = `ticket.html?id=${ticket.id}`;
    } catch (err) {
        showNotification(err.message, 'danger');
        btn.disabled = false;
        btn.innerHTML = 'Get Queue Number';
    }
}

/* ---------------- helpers ---------------- */

function formatDateLabel(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((d - today) / 86400000);
    const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return label;
}

function spinnerHTML() {
    return `<div class="text-center py-4 w-100"><span class="spinner-border text-primary"></span></div>`;
}
function errorHTML(msg) {
    return `<div class="alert alert-danger">${escapeHtml(msg)}</div>`;
}
function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(str) {
    return String(str).replace(/'/g, "\\'");
}
