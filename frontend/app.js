// ============================================
// COMFORTCAN MÉXICO - APP.JS
// ============================================

const API_URL = 'https://comfortcan-api.onrender.com'; // Cambiar por tu URL de Render

// ============================================
// ESTADO GLOBAL
// ============================================
let authToken = localStorage.getItem('authToken');
let currentUser = null;
let catalogoServicios = [];
let catalogoPaseos = [];
let propietarios = [];
let perros = [];
let cargosPendientes = [];

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    if (authToken) {
        showApp();
        loadInitialData();
    } else {
        showLogin();
    }
    setupEventListeners();
});

function setupEventListeners() {
    // Login form
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    
    // Navegación sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            navigateToSection(section);
        });
    });
    
    // Tabs dentro de secciones
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            const container = btn.closest('.section');
            switchTab(container, tab);
        });
    });
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    
    // Forms
    document.getElementById('formNuevoDueno')?.addEventListener('submit', handleNuevoDueno);
    document.getElementById('formNuevoPerro')?.addEventListener('submit', handleNuevoPerro);
    document.getElementById('formCheckIn')?.addEventListener('submit', handleCheckIn);
    document.getElementById('formNuevoPaseo')?.addEventListener('submit', handleNuevoPaseo);
    document.getElementById('formNuevoCargo')?.addEventListener('submit', handleNuevoCargo);
    document.getElementById('formServicio')?.addEventListener('submit', handleGuardarServicio);
    document.getElementById('formPaseo')?.addEventListener('submit', handleGuardarPaseo);
    
    // Búsquedas
    document.getElementById('buscarExpediente')?.addEventListener('input', buscarExpedientes);
    document.getElementById('buscarGestion')?.addEventListener('input', buscarGestion);
    
    // Selects dinámicos
    document.getElementById('selectDuenoPerro')?.addEventListener('change', cargarPerrosDueno);
    document.getElementById('selectDuenoCheckIn')?.addEventListener('change', cargarPerrosCheckIn);
    document.getElementById('selectDuenoPaseo')?.addEventListener('change', cargarPerrosPaseo);
    document.getElementById('selectDuenoCargo')?.addEventListener('change', cargarPerrosCargo);
    
    // Calcular total check-in
    document.getElementById('diasEstancia')?.addEventListener('input', calcularTotalCheckIn);
    document.getElementById('selectServicioCheckIn')?.addEventListener('change', calcularTotalCheckIn);
    
    // Foto upload preview
    document.getElementById('fotoPerro')?.addEventListener('change', previewFoto);
}

// ============================================
// AUTENTICACIÓN
// ============================================
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Error de autenticación');
        }
        
        authToken = data.access_token;
        localStorage.setItem('authToken', authToken);
        currentUser = data.user;
        
        showApp();
        loadInitialData();
        
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    authToken = null;
    currentUser = null;
    showLogin();
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
}

function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
}

// ============================================
// NAVEGACIÓN
// ============================================
function navigateToSection(sectionId) {
    // Actualizar nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionId) {
            item.classList.add('active');
        }
    });
    
    // Mostrar sección
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId)?.classList.add('active');
    
    // Cargar datos según sección
    switch(sectionId) {
        case 'paseos':
            cargarPaseos();
            break;
        case 'caja':
            cargarCargos();
            break;
        case 'expedientes':
            cargarExpedientes();
            break;
        case 'gestion':
            cargarGestion();
            break;
        case 'configuracion':
            cargarConfiguracion();
            break;
    }
    
    // Cerrar sidebar en móvil
    document.querySelector('.sidebar')?.classList.remove('open');
}

function switchTab(container, tabId) {
    container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabId) btn.classList.add('active');
    });
    
    container.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    container.querySelector(`#${tabId}`)?.classList.add('active');
}

// ============================================
// API HELPERS
// ============================================
async function apiGet(endpoint) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!response.ok) {
        if (response.status === 401) handleLogout();
        throw new Error('Error en la petición');
    }
    return response.json();
}

async function apiPost(endpoint, data) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error en la petición');
    }
    return response.json();
}

async function apiPut(endpoint, data) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error en la petición');
    }
    return response.json();
}

async function apiDelete(endpoint) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!response.ok) throw new Error('Error al eliminar');
    return true;
}

// ============================================
// CARGA INICIAL DE DATOS
// ============================================
async function loadInitialData() {
    try {
        showLoading();
        
        // Cargar catálogos y datos base en paralelo
        const [servicios, paseos, props, dogs] = await Promise.all([
            apiGet('/catalogo-servicios/'),
            apiGet('/catalogo-paseos/'),
            apiGet('/propietarios/'),
            apiGet('/perros/')
        ]);
        
        catalogoServicios = servicios;
        catalogoPaseos = paseos;
        propietarios = props;
        perros = dogs;
        
        // Llenar selects
        llenarSelectPropietarios();
        llenarSelectServicios();
        llenarSelectPaseos();
        
        hideLoading();
    } catch (error) {
        console.error('Error cargando datos:', error);
        hideLoading();
        showToast('Error cargando datos', 'error');
    }
}

function llenarSelectPropietarios() {
    const selects = [
        'selectDuenoPerro',
        'selectDuenoCheckIn', 
        'selectDuenoPaseo',
        'selectDuenoCargo'
    ];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Seleccionar dueño...</option>';
            propietarios.forEach(p => {
                select.innerHTML += `<option value="${p.id}">${p.nombre} - ${p.telefono}</option>`;
            });
        }
    });
}

function llenarSelectServicios() {
    const select = document.getElementById('selectServicioCheckIn');
    if (select) {
        select.innerHTML = '<option value="">Seleccionar servicio...</option>';
        catalogoServicios.forEach(s => {
            select.innerHTML += `<option value="${s.id}" data-precio="${s.precio}">${s.nombre} - $${s.precio}/día</option>`;
        });
    }
}

function llenarSelectPaseos() {
    const select = document.getElementById('selectTipoPaseo');
    if (select) {
        select.innerHTML = '<option value="">Seleccionar tipo...</option>';
        catalogoPaseos.forEach(p => {
            select.innerHTML += `<option value="${p.id}" data-precio="${p.precio}">${p.nombre} - $${p.precio}</option>`;
        });
    }
}

// ============================================
// RECEPCIÓN - NUEVO DUEÑO
// ============================================
async function handleNuevoDueno(e) {
    e.preventDefault();
    
    const data = {
        nombre: document.getElementById('nombreDueno').value,
        telefono: document.getElementById('telefonoDueno').value,
        email: document.getElementById('emailDueno').value || null,
        direccion: document.getElementById('direccionDueno').value || null,
        notas: document.getElementById('notasDueno').value || null
    };
    
    try {
        const nuevo = await apiPost('/propietarios/', data);
        propietarios.push(nuevo);
        llenarSelectPropietarios();
        
        e.target.reset();
        showToast('Dueño registrado exitosamente', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================
// RECEPCIÓN - NUEVO PERRO
// ============================================
async function cargarPerrosDueno() {
    // Solo para mostrar perros existentes del dueño si se necesita
}

function previewFoto(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('previewFoto');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = '<span>📷 Sin foto</span>';
    }
}

async function handleNuevoPerro(e) {
    e.preventDefault();
    
    const propietarioId = document.getElementById('selectDuenoPerro').value;
    if (!propietarioId) {
        showToast('Selecciona un dueño', 'error');
        return;
    }
    
    let fotoUrl = null;
    const fotoInput = document.getElementById('fotoPerro');
    
    // Subir foto si existe
    if (fotoInput.files[0]) {
        try {
            const formData = new FormData();
            formData.append('file', fotoInput.files[0]);
            
            const response = await fetch(`${API_URL}/upload/foto`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` },
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                fotoUrl = result.url;
            }
        } catch (error) {
            console.error('Error subiendo foto:', error);
        }
    }
    
    const data = {
        propietario_id: propietarioId,
        nombre: document.getElementById('nombrePerro').value,
        raza: document.getElementById('razaPerro').value || null,
        peso: parseFloat(document.getElementById('pesoPerro').value) || null,
        edad_anos: parseInt(document.getElementById('edadPerro').value) || null,
        sexo: document.getElementById('sexoPerro').value || null,
        color: document.getElementById('colorPerro').value || null,
        esterilizado: document.getElementById('esterilizadoPerro').checked,
        foto_url: fotoUrl,
        vacuna_rabia: document.getElementById('vacunaRabia').checked,
        vacuna_rabia_fecha: document.getElementById('fechaRabia').value || null,
        vacuna_multiple: document.getElementById('vacunaMultiple').checked,
        vacuna_multiple_fecha: document.getElementById('fechaMultiple').value || null,
        desparasitado: document.getElementById('desparasitado').checked,
        desparasitado_fecha: document.getElementById('fechaDesparasitado').value || null,
        condiciones_medicas: document.getElementById('condicionesMedicas').value || null,
        notas: document.getElementById('notasPerro').value || null
    };
    
    try {
        const nuevo = await apiPost('/perros/', data);
        perros.push(nuevo);
        
        e.target.reset();
        document.getElementById('previewFoto').innerHTML = '<span>📷 Sin foto</span>';
        showToast('Perro registrado exitosamente', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================
// RECEPCIÓN - CHECK-IN
// ============================================
async function cargarPerrosCheckIn() {
    const propietarioId = document.getElementById('selectDuenoCheckIn').value;
    const selectPerro = document.getElementById('selectPerroCheckIn');
    
    selectPerro.innerHTML = '<option value="">Seleccionar perro...</option>';
    
    if (propietarioId) {
        const perrosDueno = perros.filter(p => p.propietario_id === propietarioId);
        perrosDueno.forEach(p => {
            selectPerro.innerHTML += `<option value="${p.id}">${p.nombre} (${p.raza || 'Sin raza'})</option>`;
        });
    }
}

function calcularTotalCheckIn() {
    const dias = parseInt(document.getElementById('diasEstancia').value) || 0;
    const selectServicio = document.getElementById('selectServicioCheckIn');
    const precio = parseFloat(selectServicio.selectedOptions[0]?.dataset.precio) || 0;
    
    const total = dias * precio;
    document.getElementById('totalCheckIn').textContent = `$${total.toFixed(2)}`;
}

async function handleCheckIn(e) {
    e.preventDefault();
    
    const perroId = document.getElementById('selectPerroCheckIn').value;
    const servicioId = document.getElementById('selectServicioCheckIn').value;
    const dias = parseInt(document.getElementById('diasEstancia').value);
    
    if (!perroId || !servicioId || !dias) {
        showToast('Completa todos los campos', 'error');
        return;
    }
    
    const servicio = catalogoServicios.find(s => s.id === servicioId);
    const fechaEntrada = document.getElementById('fechaEntrada').value || new Date().toISOString().split('T')[0];
    
    // Calcular fecha salida
    const entrada = new Date(fechaEntrada);
    entrada.setDate(entrada.getDate() + dias);
    const fechaSalida = entrada.toISOString().split('T')[0];
    
    const data = {
        perro_id: perroId,
        servicio_id: servicioId,
        fecha_entrada: fechaEntrada,
        fecha_salida: fechaSalida,
        dias_reservados: dias,
        precio_total: dias * servicio.precio,
        notas: document.getElementById('notasCheckIn').value || null
    };
    
    try {
        await apiPost('/estancias/', data);
        e.target.reset();
        document.getElementById('totalCheckIn').textContent = '$0.00';
        showToast('Check-in realizado exitosamente', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================
// PASEOS Y AGENDA
// ============================================
async function cargarPerrosPaseo() {
    const propietarioId = document.getElementById('selectDuenoPaseo').value;
    const selectPerro = document.getElementById('selectPerroPaseo');
    
    selectPerro.innerHTML = '<option value="">Seleccionar perro...</option>';
    
    if (propietarioId) {
        const perrosDueno = perros.filter(p => p.propietario_id === propietarioId);
        perrosDueno.forEach(p => {
            selectPerro.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
        });
    }
}

async function handleNuevoPaseo(e) {
    e.preventDefault();
    
    const perroId = document.getElementById('selectPerroPaseo').value;
    const tipoPaseoId = document.getElementById('selectTipoPaseo').value;
    
    if (!perroId || !tipoPaseoId) {
        showToast('Selecciona perro y tipo de paseo', 'error');
        return;
    }
    
    const tipoPaseo = catalogoPaseos.find(p => p.id === tipoPaseoId);
    
    const data = {
        perro_id: perroId,
        tipo_paseo_id: tipoPaseoId,
        fecha: document.getElementById('fechaPaseo').value || new Date().toISOString().split('T')[0],
        hora: document.getElementById('horaPaseo').value || null,
        precio: tipoPaseo.precio,
        pagado: document.getElementById('paseoPagado').checked,
        notas: document.getElementById('notasPaseo').value || null
    };
    
    try {
        await apiPost('/paseos/', data);
        e.target.reset();
        cargarPaseos();
        showToast('Paseo registrado', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function cargarPaseos() {
    try {
        const paseos = await apiGet('/paseos/');
        renderPaseos(paseos);
    } catch (error) {
        console.error('Error cargando paseos:', error);
    }
}

function renderPaseos(paseos) {
    const container = document.getElementById('listaPaseos');
    if (!container) return;
    
    if (paseos.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay paseos registrados</p>';
        return;
    }
    
    // Agrupar por fecha
    const porFecha = {};
    paseos.forEach(p => {
        const fecha = p.fecha;
        if (!porFecha[fecha]) porFecha[fecha] = [];
        porFecha[fecha].push(p);
    });
    
    let html = '';
    Object.keys(porFecha).sort().reverse().forEach(fecha => {
        html += `<div class="paseo-grupo">
            <h4 class="fecha-grupo">${formatDate(fecha)}</h4>`;
        
        porFecha[fecha].forEach(paseo => {
            const perro = perros.find(p => p.id === paseo.perro_id);
            const tipo = catalogoPaseos.find(t => t.id === paseo.tipo_paseo_id);
            
            html += `
            <div class="paseo-card ${paseo.pagado ? 'pagado' : 'pendiente'}">
                <div class="paseo-info">
                    <span class="perro-nombre">${perro?.nombre || 'Desconocido'}</span>
                    <span class="paseo-tipo">${tipo?.nombre || paseo.tipo_paseo_id}</span>
                    ${paseo.hora ? `<span class="paseo-hora">🕐 ${paseo.hora}</span>` : ''}
                </div>
                <div class="paseo-precio">
                    <span>$${paseo.precio}</span>
                    <span class="status-badge ${paseo.pagado ? 'pagado' : 'pendiente'}">
                        ${paseo.pagado ? '✓ Pagado' : 'Pendiente'}
                    </span>
                </div>
                <div class="paseo-actions">
                    ${!paseo.pagado ? `<button class="btn btn-sm btn-success" onclick="marcarPaseoPagado('${paseo.id}')">Marcar pagado</button>` : ''}
                    <button class="btn btn-sm btn-danger" onclick="eliminarPaseo('${paseo.id}')">🗑</button>
                </div>
            </div>`;
        });
        
        html += '</div>';
    });
    
    container.innerHTML = html;
}

async function marcarPaseoPagado(id) {
    try {
        await apiPut(`/paseos/${id}`, { pagado: true });
        cargarPaseos();
        showToast('Paseo marcado como pagado', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function eliminarPaseo(id) {
    if (!confirm('¿Eliminar este paseo?')) return;
    
    try {
        await apiDelete(`/paseos/${id}`);
        cargarPaseos();
        showToast('Paseo eliminado', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================
// CAJA Y TICKET
// ============================================
async function cargarPerrosCargo() {
    const propietarioId = document.getElementById('selectDuenoCargo').value;
    const selectPerro = document.getElementById('selectPerroCargo');
    
    selectPerro.innerHTML = '<option value="">Seleccionar perro...</option>';
    
    if (propietarioId) {
        const perrosDueno = perros.filter(p => p.propietario_id === propietarioId);
        perrosDueno.forEach(p => {
            selectPerro.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
        });
    }
}

async function handleNuevoCargo(e) {
    e.preventDefault();
    
    const perroId = document.getElementById('selectPerroCargo').value;
    const concepto = document.getElementById('conceptoCargo').value;
    const monto = parseFloat(document.getElementById('montoCargo').value);
    
    if (!perroId || !concepto || !monto) {
        showToast('Completa todos los campos', 'error');
        return;
    }
    
    const data = {
        perro_id: perroId,
        concepto: concepto,
        monto: monto,
        pagado: false
    };
    
    try {
        await apiPost('/cargos/', data);
        e.target.reset();
        cargarCargos();
        showToast('Cargo agregado', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function cargarCargos() {
    try {
        const cargos = await apiGet('/cargos/?pagado=false');
        cargosPendientes = cargos;
        renderCargos(cargos);
    } catch (error) {
        console.error('Error cargando cargos:', error);
    }
}

function renderCargos(cargos) {
    const container = document.getElementById('listaCargos');
    if (!container) return;
    
    if (cargos.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay cargos pendientes</p>';
        document.getElementById('totalCargos').textContent = '$0.00';
        return;
    }
    
    let total = 0;
    let html = '<div class="cargos-list">';
    
    cargos.forEach(cargo => {
        const perro = perros.find(p => p.id === cargo.perro_id);
        total += cargo.monto;
        
        html += `
        <div class="cargo-item">
            <div class="cargo-info">
                <span class="cargo-perro">${perro?.nombre || 'Desconocido'}</span>
                <span class="cargo-concepto">${cargo.concepto}</span>
            </div>
            <div class="cargo-monto">$${cargo.monto.toFixed(2)}</div>
            <div class="cargo-actions">
                <button class="btn btn-sm btn-danger" onclick="eliminarCargo('${cargo.id}')">🗑</button>
            </div>
        </div>`;
    });
    
    html += '</div>';
    container.innerHTML = html;
    document.getElementById('totalCargos').textContent = `$${total.toFixed(2)}`;
}

async function eliminarCargo(id) {
    if (!confirm('¿Eliminar este cargo?')) return;
    
    try {
        await apiDelete(`/cargos/${id}`);
        cargarCargos();
        showToast('Cargo eliminado', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================
// GENERAR TICKET
// ============================================
async function generarTicket() {
    if (cargosPendientes.length === 0) {
        showToast('No hay cargos para generar ticket', 'error');
        return;
    }
    
    // Agrupar cargos por perro/propietario
    const perroId = cargosPendientes[0].perro_id;
    const perro = perros.find(p => p.id === perroId);
    const propietario = propietarios.find(p => p.id === perro?.propietario_id);
    
    const ticketData = {
        perro_id: perroId,
        cargos_ids: cargosPendientes.map(c => c.id),
        subtotal: cargosPendientes.reduce((sum, c) => sum + c.monto, 0),
        descuento: 0,
        total: cargosPendientes.reduce((sum, c) => sum + c.monto, 0)
    };
    
    try {
        const ticket = await apiPost('/tickets/', ticketData);
        mostrarTicket(ticket, perro, propietario, cargosPendientes);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function mostrarTicket(ticket, perro, propietario, cargos) {
    const modal = document.getElementById('modalTicket');
    const contenido = document.getElementById('ticketContenido');
    
    const fecha = new Date().toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    let itemsHtml = '';
    cargos.forEach(c => {
        itemsHtml += `
        <tr>
            <td>${c.concepto}</td>
            <td class="text-right">$${c.monto.toFixed(2)}</td>
        </tr>`;
    });
    
    contenido.innerHTML = `
    <div class="ticket" id="ticketParaImprimir">
        <div class="ticket-header">
            <img src="logo.png" alt="ComfortCan" class="ticket-logo">
            <h2>ComfortCan México</h2>
            <p>Hotel & Guardería Canina</p>
            <p class="ticket-fecha">${fecha}</p>
            <p class="ticket-folio">Folio: ${ticket.folio}</p>
        </div>
        
        <div class="ticket-cliente">
            <p><strong>Cliente:</strong> ${propietario?.nombre || 'N/A'}</p>
            <p><strong>Mascota:</strong> ${perro?.nombre || 'N/A'}</p>
        </div>
        
        <table class="ticket-items">
            <thead>
                <tr>
                    <th>Concepto</th>
                    <th class="text-right">Monto</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>
        
        <div class="ticket-total">
            <div class="total-row">
                <span>Subtotal:</span>
                <span>$${ticket.subtotal.toFixed(2)}</span>
            </div>
            ${ticket.descuento > 0 ? `
            <div class="total-row descuento">
                <span>Descuento:</span>
                <span>-$${ticket.descuento.toFixed(2)}</span>
            </div>` : ''}
            <div class="total-row total-final">
                <span>TOTAL:</span>
                <span>$${ticket.total.toFixed(2)}</span>
            </div>
        </div>
        
        <div class="ticket-footer">
            <p>¡Gracias por su preferencia!</p>
            <p>🐕 ComfortCan México 🐕</p>
        </div>
    </div>`;
    
    modal.classList.add('active');
}

function cerrarModalTicket() {
    document.getElementById('modalTicket').classList.remove('active');
}

function imprimirTicket() {
    const contenido = document.getElementById('ticketParaImprimir').innerHTML;
    const ventana = window.open('', '_blank');
    
    ventana.document.write(`
    <html>
    <head>
        <title>Ticket ComfortCan</title>
        <style>
            body { font-family: 'Courier New', monospace; padding: 10px; max-width: 300px; margin: 0 auto; }
            .ticket-header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .ticket-logo { max-width: 100px; }
            .ticket-header h2 { margin: 10px 0 5px; font-size: 18px; }
            .ticket-header p { margin: 2px 0; font-size: 12px; }
            .ticket-cliente { padding: 10px 0; border-bottom: 1px dashed #000; font-size: 12px; }
            .ticket-items { width: 100%; border-collapse: collapse; font-size: 12px; }
            .ticket-items th, .ticket-items td { padding: 5px 0; text-align: left; }
            .text-right { text-align: right; }
            .ticket-total { border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; }
            .total-row { display: flex; justify-content: space-between; font-size: 12px; }
            .total-final { font-weight: bold; font-size: 16px; margin-top: 5px; }
            .ticket-footer { text-align: center; margin-top: 15px; font-size: 11px; border-top: 1px dashed #000; padding-top: 10px; }
        </style>
    </head>
    <body>${contenido}</body>
    </html>`);
    
    ventana.document.close();
    ventana.print();
}

function descargarTicket() {
    // Usar html2canvas si está disponible, sino solo imprimir
    imprimirTicket();
}

async function confirmarPago() {
    if (!confirm('¿Confirmar pago de todos los cargos?')) return;
    
    try {
        // Marcar todos los cargos como pagados
        for (const cargo of cargosPendientes) {
            await apiPut(`/cargos/${cargo.id}`, { pagado: true });
        }
        
        cerrarModalTicket();
        cargarCargos();
        showToast('Pago confirmado exitosamente', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================
// EXPEDIENTES
// ============================================
async function cargarExpedientes() {
    renderExpedientes(perros);
}

function buscarExpedientes(e) {
    const busqueda = e.target.value.toLowerCase();
    
    const filtrados = perros.filter(p => {
        const propietario = propietarios.find(prop => prop.id === p.propietario_id);
        return p.nombre.toLowerCase().includes(busqueda) ||
               propietario?.nombre.toLowerCase().includes(busqueda);
    });
    
    renderExpedientes(filtrados);
}

function renderExpedientes(lista) {
    const container = document.getElementById('listaExpedientes');
    if (!container) return;
    
    if (lista.length === 0) {
        container.innerHTML = '<p class="empty-state">No se encontraron expedientes</p>';
        return;
    }
    
    let html = '<div class="expedientes-grid">';
    
    lista.forEach(perro => {
        const propietario = propietarios.find(p => p.id === perro.propietario_id);
        
        html += `
        <div class="expediente-card" onclick="verExpediente('${perro.id}')">
            <div class="expediente-foto">
                ${perro.foto_url ? 
                    `<img src="${perro.foto_url}" alt="${perro.nombre}">` : 
                    '<span class="no-foto">🐕</span>'}
            </div>
            <div class="expediente-info">
                <h4>${perro.nombre}</h4>
                <p class="raza">${perro.raza || 'Sin raza'}</p>
                <p class="dueno">👤 ${propietario?.nombre || 'Sin dueño'}</p>
            </div>
            <div class="expediente-vacunas">
                <span class="${perro.vacuna_rabia ? 'ok' : 'pending'}">🦠 Rabia</span>
                <span class="${perro.vacuna_multiple ? 'ok' : 'pending'}">💉 Múltiple</span>
            </div>
        </div>`;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

async function verExpediente(perroId) {
    const perro = perros.find(p => p.id === perroId);
    const propietario = propietarios.find(p => p.id === perro?.propietario_id);
    
    if (!perro) return;
    
    // Cargar historial
    let estancias = [];
    let paseos = [];
    let tickets = [];
    
    try {
        [estancias, paseos, tickets] = await Promise.all([
            apiGet(`/estancias/?perro_id=${perroId}`),
            apiGet(`/paseos/?perro_id=${perroId}`),
            apiGet(`/tickets/?perro_id=${perroId}`)
        ]);
    } catch (error) {
        console.error('Error cargando historial:', error);
    }
    
    const modal = document.getElementById('modalExpediente');
    const contenido = document.getElementById('expedienteContenido');
    
    contenido.innerHTML = `
    <div class="expediente-detalle">
        <div class="expediente-header">
            <div class="foto-grande">
                ${perro.foto_url ? 
                    `<img src="${perro.foto_url}" alt="${perro.nombre}">` : 
                    '<span class="no-foto">🐕</span>'}
            </div>
            <div class="info-principal">
                <h2>${perro.nombre}</h2>
                <p><strong>Raza:</strong> ${perro.raza || 'No especificada'}</p>
                <p><strong>Edad:</strong> ${perro.edad_anos ? perro.edad_anos + ' años' : 'No especificada'}</p>
                <p><strong>Peso:</strong> ${perro.peso ? perro.peso + ' kg' : 'No especificado'}</p>
                <p><strong>Sexo:</strong> ${perro.sexo || 'No especificado'}</p>
                <p><strong>Color:</strong> ${perro.color || 'No especificado'}</p>
                <p><strong>Esterilizado:</strong> ${perro.esterilizado ? 'Sí' : 'No'}</p>
            </div>
        </div>
        
        <div class="seccion-expediente">
            <h3>👤 Propietario</h3>
            <p><strong>Nombre:</strong> ${propietario?.nombre || 'N/A'}</p>
            <p><strong>Teléfono:</strong> ${propietario?.telefono || 'N/A'}</p>
            <p><strong>Email:</strong> ${propietario?.email || 'N/A'}</p>
        </div>
        
        <div class="seccion-expediente">
            <h3>💉 Vacunas y Salud</h3>
            <div class="vacunas-grid">
                <div class="vacuna-item ${perro.vacuna_rabia ? 'ok' : 'pending'}">
                    <span class="vacuna-nombre">Rabia</span>
                    <span class="vacuna-status">${perro.vacuna_rabia ? '✓' : '✗'}</span>
                    ${perro.vacuna_rabia_fecha ? `<span class="vacuna-fecha">${formatDate(perro.vacuna_rabia_fecha)}</span>` : ''}
                </div>
                <div class="vacuna-item ${perro.vacuna_multiple ? 'ok' : 'pending'}">
                    <span class="vacuna-nombre">Múltiple</span>
                    <span class="vacuna-status">${perro.vacuna_multiple ? '✓' : '✗'}</span>
                    ${perro.vacuna_multiple_fecha ? `<span class="vacuna-fecha">${formatDate(perro.vacuna_multiple_fecha)}</span>` : ''}
                </div>
                <div class="vacuna-item ${perro.desparasitado ? 'ok' : 'pending'}">
                    <span class="vacuna-nombre">Desparasitado</span>
                    <span class="vacuna-status">${perro.desparasitado ? '✓' : '✗'}</span>
                    ${perro.desparasitado_fecha ? `<span class="vacuna-fecha">${formatDate(perro.desparasitado_fecha)}</span>` : ''}
                </div>
            </div>
            ${perro.condiciones_medicas ? `<p><strong>Condiciones médicas:</strong> ${perro.condiciones_medicas}</p>` : ''}
        </div>
        
        <div class="seccion-expediente">
            <h3>🏨 Historial de Estancias (${estancias.length})</h3>
            ${estancias.length > 0 ? `
            <div class="historial-lista">
                ${estancias.slice(0, 5).map(e => `
                    <div class="historial-item">
                        <span>${formatDate(e.fecha_entrada)} - ${formatDate(e.fecha_salida)}</span>
                        <span>${e.dias_reservados} días</span>
                        <span>$${e.precio_total}</span>
                    </div>
                `).join('')}
            </div>` : '<p class="empty-state">Sin estancias registradas</p>'}
        </div>
        
        <div class="seccion-expediente">
            <h3>🦮 Historial de Paseos (${paseos.length})</h3>
            ${paseos.length > 0 ? `
            <div class="historial-lista">
                ${paseos.slice(0, 5).map(p => `
                    <div class="historial-item">
                        <span>${formatDate(p.fecha)}</span>
                        <span>$${p.precio}</span>
                        <span class="status-badge ${p.pagado ? 'pagado' : 'pendiente'}">${p.pagado ? 'Pagado' : 'Pendiente'}</span>
                    </div>
                `).join('')}
            </div>` : '<p class="empty-state">Sin paseos registrados</p>'}
        </div>
        
        <div class="seccion-expediente">
            <h3>🧾 Tickets (${tickets.length})</h3>
            ${tickets.length > 0 ? `
            <div class="historial-lista">
                ${tickets.slice(0, 5).map(t => `
                    <div class="historial-item">
                        <span>Folio: ${t.folio}</span>
                        <span>${formatDate(t.created_at)}</span>
                        <span>$${t.total}</span>
                    </div>
                `).join('')}
            </div>` : '<p class="empty-state">Sin tickets registrados</p>'}
        </div>
        
        ${perro.notas ? `
        <div class="seccion-expediente">
            <h3>📝 Notas</h3>
            <p>${perro.notas}</p>
        </div>` : ''}
    </div>`;
    
    modal.classList.add('active');
}

function cerrarModalExpediente() {
    document.getElementById('modalExpediente').classList.remove('active');
}

// ============================================
// GESTIÓN DE DATOS
// ============================================
async function cargarGestion() {
    renderGestion(perros, propietarios);
}

function buscarGestion(e) {
    const busqueda = e.target.value.toLowerCase();
    
    const perrosFiltrados = perros.filter(p => 
        p.nombre.toLowerCase().includes(busqueda)
    );
    
    const propietariosFiltrados = propietarios.filter(p => 
        p.nombre.toLowerCase().includes(busqueda) ||
        p.telefono.includes(busqueda)
    );
    
    renderGestion(perrosFiltrados, propietariosFiltrados);
}

function renderGestion(listaPerros, listaPropietarios) {
    const containerPerros = document.getElementById('gestionPerros');
    const containerDuenos = document.getElementById('gestionDuenos');
    
    // Renderizar perros
    if (containerPerros) {
        let html = '<h3>🐕 Perros</h3><div class="gestion-lista">';
        listaPerros.forEach(p => {
            html += `
            <div class="gestion-item">
                <span class="nombre">${p.nombre}</span>
                <span class="detalle">${p.raza || 'Sin raza'}</span>
                <div class="actions">
                    <button class="btn btn-sm btn-primary" onclick="editarPerro('${p.id}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarPerro('${p.id}')">🗑</button>
                </div>
            </div>`;
        });
        html += '</div>';
        containerPerros.innerHTML = html;
    }
    
    // Renderizar propietarios
    if (containerDuenos) {
        let html = '<h3>👤 Propietarios</h3><div class="gestion-lista">';
        listaPropietarios.forEach(p => {
            html += `
            <div class="gestion-item">
                <span class="nombre">${p.nombre}</span>
                <span class="detalle">${p.telefono}</span>
                <div class="actions">
                    <button class="btn btn-sm btn-primary" onclick="editarPropietario('${p.id}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarPropietario('${p.id}')">🗑</button>
                </div>
            </div>`;
        });
        html += '</div>';
        containerDuenos.innerHTML = html;
    }
}

async function editarPerro(id) {
    const perro = perros.find(p => p.id === id);
    if (!perro) return;
    
    const nombre = prompt('Nombre del perro:', perro.nombre);
    if (nombre === null) return;
    
    const raza = prompt('Raza:', perro.raza || '');
    
    try {
        const actualizado = await apiPut(`/perros/${id}`, { nombre, raza });
        const index = perros.findIndex(p => p.id === id);
        perros[index] = { ...perros[index], ...actualizado };
        cargarGestion();
        showToast('Perro actualizado', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function eliminarPerro(id) {
    if (!confirm('¿Eliminar este perro? Esta acción no se puede deshacer.')) return;
    
    try {
        await apiDelete(`/perros/${id}`);
        perros = perros.filter(p => p.id !== id);
        cargarGestion();
        showToast('Perro eliminado', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function editarPropietario(id) {
    const prop = propietarios.find(p => p.id === id);
    if (!prop) return;
    
    const nombre = prompt('Nombre:', prop.nombre);
    if (nombre === null) return;
    
    const telefono = prompt('Teléfono:', prop.telefono);
    
    try {
        const actualizado = await apiPut(`/propietarios/${id}`, { nombre, telefono });
        const index = propietarios.findIndex(p => p.id === id);
        propietarios[index] = { ...propietarios[index], ...actualizado };
        cargarGestion();
        llenarSelectPropietarios();
        showToast('Propietario actualizado', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function eliminarPropietario(id) {
    if (!confirm('¿Eliminar este propietario? Se eliminarán también sus perros.')) return;
    
    try {
        await apiDelete(`/propietarios/${id}`);
        propietarios = propietarios.filter(p => p.id !== id);
        perros = perros.filter(p => p.propietario_id !== id);
        cargarGestion();
        llenarSelectPropietarios();
        showToast('Propietario eliminado', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================
// CONFIGURACIÓN - CATÁLOGOS
// ============================================
async function cargarConfiguracion() {
    renderCatalogoServicios();
    renderCatalogoPaseos();
}

function renderCatalogoServicios() {
    const container = document.getElementById('listaServicios');
    if (!container) return;
    
    let html = '';
    catalogoServicios.forEach(s => {
        html += `
        <div class="catalogo-item">
            <span class="nombre">${s.nombre}</span>
            <span class="precio">$${s.precio}/día</span>
            <div class="actions">
                <button class="btn btn-sm btn-primary" onclick="editarServicio('${s.id}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="eliminarServicio('${s.id}')">🗑</button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

function renderCatalogoPaseos() {
    const container = document.getElementById('listaPaseosConfig');
    if (!container) return;
    
    let html = '';
    catalogoPaseos.forEach(p => {
        html += `
        <div class="catalogo-item">
            <span class="nombre">${p.nombre}</span>
            <span class="precio">$${p.precio}</span>
            <div class="actions">
                <button class="btn btn-sm btn-primary" onclick="editarTipoPaseo('${p.id}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="eliminarTipoPaseo('${p.id}')">🗑</button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

async function handleGuardarServicio(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('nombreServicio').value;
    const precio = parseFloat(document.getElementById('precioServicio').value);
    
    try {
        const nuevo = await apiPost('/catalogo-servicios/', { nombre, precio, activo: true });
        catalogoServicios.push(nuevo);
        renderCatalogoServicios();
        llenarSelectServicios();
        e.target.reset();
        showToast('Servicio agregado', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function editarServicio(id) {
    const servicio = catalogoServicios.find(s => s.id === id);
    if (!servicio) return;
    
    const nombre = prompt('Nombre del servicio:', servicio.nombre);
    if (nombre === null) return;
    
    const precio = prompt('Precio por día:', servicio.precio);
    if (precio === null) return;
    
    try {
        await apiPut(`/catalogo-servicios/${id}`, { nombre, precio: parseFloat(precio) });
        const index = catalogoServicios.findIndex(s => s.id === id);
        catalogoServicios[index] = { ...catalogoServicios[index], nombre, precio: parseFloat(precio) };
        renderCatalogoServicios();
        llenarSelectServicios();
        showToast('Servicio actualizado', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function eliminarServicio(id) {
    if (!confirm('¿Eliminar este servicio?')) return;
    
    try {
        await apiDelete(`/catalogo-servicios/${id}`);
        catalogoServicios = catalogoServicios.filter(s => s.id !== id);
        renderCatalogoServicios();
        llenarSelectServicios();
        showToast('Servicio eliminado', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleGuardarPaseo(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('nombreTipoPaseo').value;
    const precio = parseFloat(document.getElementById('precioTipoPaseo').value);
    
    try {
        const nuevo = await apiPost('/catalogo-paseos/', { nombre, precio, activo: true });
        catalogoPaseos.push(nuevo);
        renderCatalogoPaseos();
        llenarSelectPaseos();
        e.target.reset();
        showToast('Tipo de paseo agregado', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function editarTipoPaseo(id) {
    const paseo = catalogoPaseos.find(p => p.id === id);
    if (!paseo) return;
    
    const nombre = prompt('Nombre del tipo de paseo:', paseo.nombre);
    if (nombre === null) return;
    
    const precio = prompt('Precio:', paseo.precio);
    if (precio === null) return;
    
    try {
        await apiPut(`/catalogo-paseos/${id}`, { nombre, precio: parseFloat(precio) });
        const index = catalogoPaseos.findIndex(p => p.id === id);
        catalogoPaseos[index] = { ...catalogoPaseos[index], nombre, precio: parseFloat(precio) };
        renderCatalogoPaseos();
        llenarSelectPaseos();
        showToast('Tipo de paseo actualizado', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function eliminarTipoPaseo(id) {
    if (!confirm('¿Eliminar este tipo de paseo?')) return;
    
    try {
        await apiDelete(`/catalogo-paseos/${id}`);
        catalogoPaseos = catalogoPaseos.filter(p => p.id !== id);
        renderCatalogoPaseos();
        llenarSelectPaseos();
        showToast('Tipo de paseo eliminado', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================
// UTILIDADES
// ============================================
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showLoading() {
    document.getElementById('loadingOverlay')?.classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay')?.classList.remove('active');
}

// Toggle sidebar en móvil
function toggleSidebar() {
    document.querySelector('.sidebar')?.classList.toggle('open');
}
