// ============================================
// COMFORTCAN MÉXICO - APP.JS v3
// ============================================

const API_URL = 'https://comfortcan-api.onrender.com';

// Estado global
let authToken = localStorage.getItem('authToken');
let propietarios = [];
let perros = [];
let catalogoServicios = [];
let catalogoPaseos = [];
let cargosActuales = [];
let serviciosSeleccionados = [];

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

function showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app-screen').classList.add('hidden');
}

function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
}

function setupEventListeners() {
    // Login
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    
    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
    
    // Sidebar toggle mobile
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });
    
    // Navegación
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            navigateToSection(section);
        });
    });
    
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            switchTab(tab, tabId);
        });
    });
    
    // Forms
    document.getElementById('form-propietario')?.addEventListener('submit', handleNuevoPropietario);
    document.getElementById('form-perro')?.addEventListener('submit', handleNuevoPerro);
    document.getElementById('form-paseo')?.addEventListener('submit', handleNuevoPaseo);
    
    // Botones
    document.getElementById('btn-confirmar-estancia')?.addEventListener('click', handleCheckIn);
    document.getElementById('btn-agregar-cargo')?.addEventListener('click', handleAgregarCargo);
    document.getElementById('btn-generar-ticket')?.addEventListener('click', generarTicket);
    document.getElementById('btn-confirmar-pago')?.addEventListener('click', confirmarPago);
    document.getElementById('btn-imprimir')?.addEventListener('click', imprimirTicket);
    document.getElementById('btn-descargar')?.addEventListener('click', descargarTicket);
    document.getElementById('btn-guardar-servicio')?.addEventListener('click', handleNuevoServicio);
    document.getElementById('btn-guardar-tipo-paseo')?.addEventListener('click', handleNuevoTipoPaseo);
    document.getElementById('btn-agregar-servicio')?.addEventListener('click', agregarServicioCheckIn);
    
    // Selects dinámicos
    document.getElementById('caja-perro')?.addEventListener('change', cargarCargosPerro);
    document.getElementById('expediente-perro')?.addEventListener('change', cargarExpediente);
    document.getElementById('paseo-tipo')?.addEventListener('change', mostrarPrecioPaseo);
    document.getElementById('checkin-entrada')?.addEventListener('change', calcularTotalCheckIn);
    document.getElementById('checkin-salida')?.addEventListener('change', calcularTotalCheckIn);
    
    // Filtros
    document.getElementById('filtro-expediente')?.addEventListener('input', filtrarExpedientes);
    document.getElementById('filtro-paseo-perro')?.addEventListener('change', filtrarPaseos);
    
    // Desparasitación dinámica
    document.getElementById('perro-desparasitacion-tipo')?.addEventListener('change', toggleDesparasitacion);
    
    // Gestión
    document.querySelectorAll('input[name="gestion-tipo"]').forEach(radio => {
        radio.addEventListener('change', toggleGestionTipo);
    });
    document.getElementById('gestion-perro-select')?.addEventListener('change', () => {
        const id = document.getElementById('gestion-perro-select').value;
        if (id) editarExpedienteCompleto(id);
    });
    document.getElementById('gestion-cliente-select')?.addEventListener('change', cargarFormularioCliente);
    
    // File uploads
    document.getElementById('foto-perro-input')?.addEventListener('change', (e) => previewImage(e, 'foto-perro-preview'));
    document.getElementById('foto-cartilla-input')?.addEventListener('change', (e) => previewImage(e, 'foto-cartilla-preview'));
}

function toggleDesparasitacion() {
    const tipo = document.getElementById('perro-desparasitacion-tipo').value;
    const internaDiv = document.getElementById('desparasitacion-interna');
    const externaDiv = document.getElementById('desparasitacion-externa');
    
    internaDiv?.classList.add('hidden');
    externaDiv?.classList.add('hidden');
    
    if (tipo === 'Interna' || tipo === 'Dual') {
        internaDiv?.classList.remove('hidden');
    }
    if (tipo === 'Externa' || tipo === 'Dual') {
        externaDiv?.classList.remove('hidden');
    }
}

// ============================================
// AUTENTICACIÓN
// ============================================
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    
    try {
        showLoading();
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Error de autenticación');
        }
        
        authToken = data.access_token;
        localStorage.setItem('authToken', authToken);
        
        showApp();
        loadInitialData();
        
    } catch (error) {
        hideLoading();
        errorEl.textContent = error.message;
        errorEl.classList.remove('hidden');
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    authToken = null;
    showLogin();
}

// ============================================
// API HELPERS
// ============================================
async function apiGet(endpoint) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (response.status === 401) {
        handleLogout();
        throw new Error('Sesión expirada');
    }
    if (!response.ok) throw new Error('Error en petición');
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
        const err = await response.json();
        throw new Error(err.detail || 'Error en petición');
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
    if (!response.ok) throw new Error('Error al actualizar');
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
// CARGA INICIAL
// ============================================
async function loadInitialData() {
    try {
        showLoading();
        
        const [props, dogs, servicios, paseos] = await Promise.all([
            apiGet('/propietarios'),
            apiGet('/perros'),
            apiGet('/catalogo-servicios'),
            apiGet('/catalogo-paseos')
        ]);
        
        propietarios = props || [];
        perros = dogs || [];
        catalogoServicios = servicios || [];
        catalogoPaseos = paseos || [];
        
        llenarSelectPropietarios();
        llenarSelectPerros();
        llenarSelectServicios();
        llenarSelectPaseos();
        
        hideLoading();
        showToast('Datos cargados', 'success');
        
    } catch (error) {
        hideLoading();
        showToast('Error cargando datos: ' + error.message, 'error');
    }
}

function llenarSelectPropietarios() {
    const selects = ['perro-propietario', 'gestion-cliente-select'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = '<option value="">-- Seleccionar dueño --</option>';
            propietarios.forEach(p => {
                select.innerHTML += `<option value="${p.id}">${p.nombre} - ${p.telefono || 'Sin tel'}</option>`;
            });
        }
    });
}

function llenarSelectPerros() {
    const selects = ['checkin-perro', 'paseo-perro', 'filtro-paseo-perro', 'caja-perro', 'expediente-perro', 'gestion-perro-select'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            const defaultText = id === 'filtro-paseo-perro' ? 'Todos' : '-- Seleccionar perro --';
            select.innerHTML = `<option value="">${defaultText}</option>`;
            perros.forEach(p => {
                const dueno = propietarios.find(prop => prop.id === p.propietario_id);
                select.innerHTML += `<option value="${p.id}">${p.nombre} (${dueno?.nombre || 'Sin dueño'})</option>`;
            });
        }
    });
}

function llenarSelectServicios() {
    const select = document.getElementById('checkin-servicio');
    if (select) {
        select.innerHTML = '<option value="">-- Seleccionar servicio --</option>';
        catalogoServicios.forEach(s => {
            const tipoCobro = s.tipo_cobro === 'unico' ? '(único)' : '(por día)';
            select.innerHTML += `<option value="${s.id}" data-precio="${s.precio}" data-tipo="${s.tipo_cobro || 'por_dia'}" data-nombre="${s.nombre}">${s.nombre} - $${s.precio} ${tipoCobro}</option>`;
        });
    }
    renderTablaServicios();
}

function llenarSelectPaseos() {
    const select = document.getElementById('paseo-tipo');
    if (select) {
        select.innerHTML = '<option value="">-- Seleccionar --</option>';
        catalogoPaseos.forEach(p => {
            select.innerHTML += `<option value="${p.id}" data-precio="${p.precio}">${p.nombre} - $${p.precio}</option>`;
        });
    }
    renderTablaPaseos();
}

// ============================================
// NAVEGACIÓN
// ============================================
function navigateToSection(sectionId) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionId);
    });
    
    document.querySelectorAll('.section').forEach(section => {
        section.classList.toggle('active', section.id === `section-${sectionId}`);
    });
    
    document.getElementById('sidebar').classList.remove('open');
    
    if (sectionId === 'paseos') cargarPaseos();
    if (sectionId === 'expedientes') renderListaExpedientes();
    if (sectionId === 'configuracion') {
        renderTablaServicios();
        renderTablaPaseos();
    }
}

function switchTab(clickedTab, tabId) {
    const container = clickedTab.closest('.section');
    
    container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    clickedTab.classList.add('active');
    
    container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${tabId}`)?.classList.add('active');
}

// ============================================
// RECEPCIÓN - NUEVO PROPIETARIO
// ============================================
async function handleNuevoPropietario(e) {
    e.preventDefault();
    
    const data = {
        nombre: document.getElementById('prop-nombre').value,
        telefono: document.getElementById('prop-telefono').value || null,
        direccion: document.getElementById('prop-direccion').value || null,
        email: document.getElementById('prop-email').value || null
    };
    
    try {
        showLoading();
        const nuevo = await apiPost('/propietarios', data);
        propietarios.push(nuevo);
        llenarSelectPropietarios();
        e.target.reset();
        hideLoading();
        showToast('Cliente guardado exitosamente', 'success');
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

// ============================================
// RECEPCIÓN - NUEVO PERRO
// ============================================
function previewImage(e, previewId) {
    const file = e.target.files[0];
    const preview = document.getElementById(previewId);
    
    if (file && preview) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            preview.src = ev.target.result;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

async function handleNuevoPerro(e) {
    e.preventDefault();
    
    const propietarioId = document.getElementById('perro-propietario').value;
    if (!propietarioId) {
        showToast('Selecciona un dueño primero', 'error');
        return;
    }
    
    showLoading();
    
    let fotoPerroUrl = null;
    let fotoCartillaUrl = null;
    
    const fotoPerroInput = document.getElementById('foto-perro-input');
    const fotoCartillaInput = document.getElementById('foto-cartilla-input');
    
    if (fotoPerroInput?.files[0]) {
        try {
            const formData = new FormData();
            formData.append('file', fotoPerroInput.files[0]);
            const response = await fetch(`${API_URL}/upload/foto-perro/temp`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` },
                body: formData
            });
            if (response.ok) {
                const result = await response.json();
                fotoPerroUrl = result.url;
            }
        } catch (err) {
            console.error('Error subiendo foto perro:', err);
        }
    }
    
    if (fotoCartillaInput?.files[0]) {
        try {
            const formData = new FormData();
            formData.append('file', fotoCartillaInput.files[0]);
            const response = await fetch(`${API_URL}/upload/foto-cartilla/temp`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` },
                body: formData
            });
            if (response.ok) {
                const result = await response.json();
                fotoCartillaUrl = result.url;
            }
        } catch (err) {
            console.error('Error subiendo cartilla:', err);
        }
    }
    
    const generoEl = document.querySelector('input[name="perro-genero"]:checked');
    
    const data = {
        propietario_id: propietarioId,
        nombre: document.getElementById('perro-nombre').value,
        raza: document.getElementById('perro-raza').value || null,
        edad: document.getElementById('perro-edad').value || null,
        genero: generoEl?.value || null,
        peso_kg: parseFloat(document.getElementById('perro-peso').value) || null,
        fecha_pesaje: document.getElementById('perro-fecha-pesaje').value || null,
        medicamentos: document.getElementById('perro-medicamentos').value || null,
        esterilizado: document.getElementById('perro-esterilizado').checked,
        alergias: document.getElementById('perro-alergias').value || null,
        veterinario: document.getElementById('perro-veterinario').value || null,
        desparasitacion_tipo: document.getElementById('perro-desparasitacion-tipo').value || null,
        desparasitacion_producto_int: document.getElementById('perro-despara-producto-int')?.value || null,
        desparasitacion_fecha_int: document.getElementById('perro-despara-fecha-int')?.value || null,
        desparasitacion_producto_ext: document.getElementById('perro-despara-producto-ext')?.value || null,
        desparasitacion_fecha_ext: document.getElementById('perro-despara-fecha-ext')?.value || null,
        vacuna_rabia_estado: document.getElementById('vacuna-rabia-estado')?.value || 'Pendiente',
        vacuna_rabia_vence: document.getElementById('vacuna-rabia-vence')?.value || null,
        vacuna_sextuple_estado: document.getElementById('vacuna-sextuple-estado')?.value || 'Pendiente',
        vacuna_sextuple_vence: document.getElementById('vacuna-sextuple-vence')?.value || null,
        vacuna_bordetella_estado: document.getElementById('vacuna-bordetella-estado')?.value || 'Pendiente',
        vacuna_bordetella_vence: document.getElementById('vacuna-bordetella-vence')?.value || null,
        vacuna_giardia_estado: document.getElementById('vacuna-giardia-estado')?.value || 'Pendiente',
        vacuna_giardia_vence: document.getElementById('vacuna-giardia-vence')?.value || null,
        vacuna_extra_nombre: document.getElementById('vacuna-extra-nombre')?.value || null,
        vacuna_extra_estado: document.getElementById('vacuna-extra-estado')?.value || null,
        vacuna_extra_vence: document.getElementById('vacuna-extra-vence')?.value || null,
        foto_perro_url: fotoPerroUrl,
        foto_cartilla_url: fotoCartillaUrl
    };
    
    try {
        const nuevo = await apiPost('/perros', data);
        perros.push(nuevo);
        llenarSelectPerros();
        e.target.reset();
        document.getElementById('foto-perro-preview')?.classList.add('hidden');
        document.getElementById('foto-cartilla-preview')?.classList.add('hidden');
        document.getElementById('desparasitacion-interna')?.classList.add('hidden');
        document.getElementById('desparasitacion-externa')?.classList.add('hidden');
        hideLoading();
        showToast('Perro registrado exitosamente', 'success');
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}
// ==================== PARTE 3: CHECK-IN, PASEOS Y CAJA ====================

// Variables globales para check-in
let perroSeleccionadoCheckIn = null;

// Cargar perros en el select de check-in
async function cargarPerrosCheckIn() {
    try {
        const perros = await apiRequest('/perros/');
        const select = document.getElementById('checkInPerro');
        if (!select) return;
        
        select.innerHTML = '<option value="">Seleccionar perro...</option>';
        perros.forEach(p => {
            select.innerHTML += `<option value="${p.id}" data-propietario="${p.propietario_id}">${p.nombre} (${p.propietario_nombre || 'Sin dueño'})</option>`;
        });
    } catch (error) {
        console.error('Error cargando perros para check-in:', error);
    }
}

// Cargar servicios disponibles en el dropdown
async function cargarServiciosDropdown() {
    try {
        const servicios = await apiRequest('/catalogo-servicios/');
        const select = document.getElementById('servicioDropdown');
        if (!select) return;
        
        select.innerHTML = '<option value="">Agregar servicio...</option>';
        servicios.forEach(s => {
            const tipoCobro = s.tipo_cobro || 'por_dia';
            select.innerHTML += `<option value="${s.id}" data-nombre="${s.nombre}" data-precio="${s.precio}" data-tipo="${tipoCobro}">${s.nombre} - $${s.precio} (${tipoCobro === 'unico' ? 'único' : 'por día'})</option>`;
        });
    } catch (error) {
        console.error('Error cargando servicios:', error);
    }
}

// Agregar servicio al check-in
function agregarServicioCheckIn() {
    const select = document.getElementById('servicioDropdown');
    if (!select || !select.value) return;
    
    const option = select.options[select.selectedIndex];
    const servicioId = parseInt(select.value);
    
    // Verificar si ya está agregado
    if (serviciosSeleccionados.find(s => s.id === servicioId)) {
        alert('Este servicio ya está agregado');
        select.value = '';
        return;
    }
    
    serviciosSeleccionados.push({
        id: servicioId,
        nombre: option.dataset.nombre,
        precio: parseFloat(option.dataset.precio),
        tipo_cobro: option.dataset.tipo
    });
    
    select.value = '';
    renderServiciosSeleccionados();
    calcularTotalCheckIn();
}

// Quitar servicio del check-in
function quitarServicioCheckIn(servicioId) {
    serviciosSeleccionados = serviciosSeleccionados.filter(s => s.id !== servicioId);
    renderServiciosSeleccionados();
    calcularTotalCheckIn();
}

// Renderizar servicios seleccionados como tags
function renderServiciosSeleccionados() {
    const container = document.getElementById('serviciosSeleccionados');
    if (!container) return;
    
    if (serviciosSeleccionados.length === 0) {
        container.innerHTML = '<span class="text-muted">No hay servicios seleccionados</span>';
        return;
    }
    
    container.innerHTML = serviciosSeleccionados.map(s => `
        <span class="servicio-tag">
            ${s.nombre} - $${s.precio} (${s.tipo_cobro === 'unico' ? 'único' : 'por día'})
            <button type="button" onclick="quitarServicioCheckIn(${s.id})" class="btn-quitar">&times;</button>
        </span>
    `).join('');
}

// Calcular total del check-in
function calcularTotalCheckIn() {
    const fechaEntrada = document.getElementById('checkInFechaEntrada')?.value;
    const fechaSalida = document.getElementById('checkInFechaSalida')?.value;
    const totalSpan = document.getElementById('checkInTotal');
    
    if (!fechaEntrada || !fechaSalida || !totalSpan) return;
    
    const entrada = new Date(fechaEntrada);
    const salida = new Date(fechaSalida);
    const dias = Math.max(1, Math.ceil((salida - entrada) / (1000 * 60 * 60 * 24)));
    
    let total = 0;
    serviciosSeleccionados.forEach(s => {
        if (s.tipo_cobro === 'unico') {
            total += s.precio; // Cobro único
        } else {
            total += s.precio * dias; // Cobro por día
        }
    });
    
    totalSpan.textContent = `$${total.toFixed(2)} (${dias} día${dias > 1 ? 's' : ''})`;
    
    // Mostrar desglose
    const desglose = document.getElementById('checkInDesglose');
    if (desglose) {
        desglose.innerHTML = serviciosSeleccionados.map(s => {
            if (s.tipo_cobro === 'unico') {
                return `<div>${s.nombre}: $${s.precio} (único)</div>`;
            } else {
                return `<div>${s.nombre}: $${s.precio} x ${dias} días = $${(s.precio * dias).toFixed(2)}</div>`;
            }
        }).join('');
    }
}

// Manejar check-in
async function handleCheckIn(e) {
    e.preventDefault();
    
    const perroId = document.getElementById('checkInPerro')?.value;
    const fechaEntrada = document.getElementById('checkInFechaEntrada')?.value;
    const fechaSalida = document.getElementById('checkInFechaSalida')?.value;
    const notas = document.getElementById('checkInNotas')?.value || '';
    
    if (!perroId || !fechaEntrada || !fechaSalida) {
        alert('Por favor completa todos los campos requeridos');
        return;
    }
    
    if (serviciosSeleccionados.length === 0) {
        alert('Por favor selecciona al menos un servicio');
        return;
    }
    
    // Calcular días y total
    const entrada = new Date(fechaEntrada);
    const salida = new Date(fechaSalida);
    const dias = Math.max(1, Math.ceil((salida - entrada) / (1000 * 60 * 60 * 24)));
    
    let total = 0;
    const serviciosConCosto = serviciosSeleccionados.map(s => {
        let costoServicio;
        if (s.tipo_cobro === 'unico') {
            costoServicio = s.precio;
        } else {
            costoServicio = s.precio * dias;
        }
        total += costoServicio;
        return {
            servicio_id: s.id,
            nombre: s.nombre,
            precio_unitario: s.precio,
            tipo_cobro: s.tipo_cobro,
            dias: s.tipo_cobro === 'unico' ? 1 : dias,
            subtotal: costoServicio
        };
    });
    
    try {
        const checkIn = await apiRequest('/checkin/', 'POST', {
            perro_id: parseInt(perroId),
            fecha_entrada: fechaEntrada,
            fecha_salida: fechaSalida,
            servicios: serviciosConCosto,
            notas: notas,
            total: total,
            estado: 'activo'
        });
        
        alert('Check-in registrado exitosamente');
        
        // Limpiar formulario
        document.getElementById('checkInForm')?.reset();
        serviciosSeleccionados = [];
        renderServiciosSeleccionados();
        document.getElementById('checkInTotal').textContent = '$0.00';
        document.getElementById('checkInDesglose').innerHTML = '';
        
        // Recargar lista
        await cargarCheckIns();
        
    } catch (error) {
        console.error('Error en check-in:', error);
        alert('Error al registrar check-in: ' + error.message);
    }
}

// Cargar lista de check-ins activos
async function cargarCheckIns() {
    try {
        const checkins = await apiRequest('/checkins/');
        const lista = document.getElementById('listaCheckIns');
        if (!lista) return;
        
        if (checkins.length === 0) {
            lista.innerHTML = '<p class="text-muted">No hay check-ins activos</p>';
            return;
        }
        
        lista.innerHTML = checkins.map(c => `
            <div class="checkin-card ${c.estado === 'activo' ? 'activo' : ''}">
                <div class="checkin-header">
                    <strong>${c.perro_nombre || 'Perro'}</strong>
                    <span class="badge ${c.estado === 'activo' ? 'badge-success' : 'badge-secondary'}">${c.estado}</span>
                </div>
                <div class="checkin-body">
                    <p>Entrada: ${formatDate(c.fecha_entrada)}</p>
                    <p>Salida: ${formatDate(c.fecha_salida)}</p>
                    <p>Total: $${c.total?.toFixed(2) || '0.00'}</p>
                </div>
                <div class="checkin-actions">
                    ${c.estado === 'activo' ? `<button onclick="checkOut(${c.id})" class="btn btn-warning btn-sm">Check-out</button>` : ''}
                    <button onclick="verDetalleCheckIn(${c.id})" class="btn btn-info btn-sm">Ver</button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando check-ins:', error);
    }
}

// Realizar check-out
async function checkOut(checkinId) {
    if (!confirm('¿Confirmar check-out?')) return;
    
    try {
        await apiRequest(`/checkin/${checkinId}/checkout`, 'POST');
        alert('Check-out realizado');
        await cargarCheckIns();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// ==================== PASEOS ====================

async function cargarPerrosPaseos() {
    try {
        const perros = await apiRequest('/perros/');
        const select = document.getElementById('paseoPerro');
        if (!select) return;
        
        select.innerHTML = '<option value="">Seleccionar perro...</option>';
        perros.forEach(p => {
            select.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
        });
    } catch (error) {
        console.error('Error cargando perros para paseos:', error);
    }
}

async function handlePaseo(e) {
    e.preventDefault();
    
    const perroId = document.getElementById('paseoPerro')?.value;
    const fecha = document.getElementById('paseoFecha')?.value;
    const duracion = document.getElementById('paseoDuracion')?.value;
    const precio = document.getElementById('paseoPrecio')?.value;
    const notas = document.getElementById('paseoNotas')?.value || '';
    
    if (!perroId || !fecha || !duracion || !precio) {
        alert('Por favor completa todos los campos requeridos');
        return;
    }
    
    try {
        await apiRequest('/paseos/', 'POST', {
            perro_id: parseInt(perroId),
            fecha: fecha,
            duracion: parseInt(duracion),
            precio: parseFloat(precio),
            notas: notas
        });
        
        alert('Paseo registrado exitosamente');
        document.getElementById('paseoForm')?.reset();
        await cargarPaseos();
        
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function cargarPaseos() {
    try {
        const paseos = await apiRequest('/paseos/');
        const lista = document.getElementById('listaPaseos');
        if (!lista) return;
        
        if (paseos.length === 0) {
            lista.innerHTML = '<p class="text-muted">No hay paseos registrados</p>';
            return;
        }
        
        lista.innerHTML = paseos.map(p => `
            <div class="paseo-card">
                <strong>${p.perro_nombre || 'Perro'}</strong>
                <p>Fecha: ${formatDate(p.fecha)}</p>
                <p>Duración: ${p.duracion} min</p>
                <p>Precio: $${p.precio?.toFixed(2)}</p>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando paseos:', error);
    }
}

// ==================== CAJA ====================

async function cargarMovimientosCaja() {
    try {
        // Cargar todos los movimientos (check-ins, paseos, otros)
        const [checkins, paseos, movimientos] = await Promise.all([
            apiRequest('/checkins/?estado=completado'),
            apiRequest('/paseos/'),
            apiRequest('/movimientos-caja/')
        ]);
        
        const lista = document.getElementById('listaMovimientos');
        if (!lista) return;
        
        // Combinar todos los movimientos
        let todosMovimientos = [];
        
        // Agregar check-ins
        checkins.forEach(c => {
            todosMovimientos.push({
                tipo: 'Check-in',
                descripcion: `Hospedaje - ${c.perro_nombre}`,
                fecha: c.fecha_salida || c.fecha_entrada,
                monto: c.total || 0,
                estado: c.pagado ? 'Pagado' : 'Pendiente'
            });
        });
        
        // Agregar paseos
        paseos.forEach(p => {
            todosMovimientos.push({
                tipo: 'Paseo',
                descripcion: `Paseo - ${p.perro_nombre}`,
                fecha: p.fecha,
                monto: p.precio || 0,
                estado: p.pagado ? 'Pagado' : 'Pendiente'
            });
        });
        
        // Agregar otros movimientos
        movimientos.forEach(m => {
            todosMovimientos.push({
                tipo: m.tipo,
                descripcion: m.descripcion,
                fecha: m.fecha,
                monto: m.monto,
                estado: 'Registrado'
            });
        });
        
        // Ordenar por fecha descendente
        todosMovimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        
        if (todosMovimientos.length === 0) {
            lista.innerHTML = '<p class="text-muted">No hay movimientos registrados</p>';
            return;
        }
        
        // Calcular totales
        const totalIngresos = todosMovimientos.reduce((sum, m) => sum + (m.monto > 0 ? m.monto : 0), 0);
        const totalPendiente = todosMovimientos.filter(m => m.estado === 'Pendiente').reduce((sum, m) => sum + m.monto, 0);
        
        // Mostrar totales
        document.getElementById('totalIngresos').textContent = `$${totalIngresos.toFixed(2)}`;
        document.getElementById('totalPendiente').textContent = `$${totalPendiente.toFixed(2)}`;
        
        lista.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Descripción</th>
                        <th>Monto</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${todosMovimientos.map(m => `
                        <tr>
                            <td>${formatDate(m.fecha)}</td>
                            <td>${m.tipo}</td>
                            <td>${m.descripcion}</td>
                            <td>$${m.monto.toFixed(2)}</td>
                            <td><span class="badge ${m.estado === 'Pagado' ? 'badge-success' : 'badge-warning'}">${m.estado}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
    } catch (error) {
        console.error('Error cargando movimientos de caja:', error);
    }
}

// Filtrar caja por fechas
async function filtrarCaja() {
    const fechaInicio = document.getElementById('cajaFechaInicio')?.value;
    const fechaFin = document.getElementById('cajaFechaFin')?.value;
    
    if (!fechaInicio || !fechaFin) {
        alert('Selecciona ambas fechas');
        return;
    }
    
    try {
        const movimientos = await apiRequest(`/movimientos-caja/?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`);
        // Re-renderizar con filtro
        // ... similar a cargarMovimientosCaja pero con filtro
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Generar ticket de caja
async function generarTicketCaja(movimientoId, tipo) {
    try {
        let datos;
        if (tipo === 'checkin') {
            datos = await apiRequest(`/checkin/${movimientoId}`);
        } else if (tipo === 'paseo') {
            datos = await apiRequest(`/paseo/${movimientoId}`);
        }
        
        mostrarTicket(datos, tipo);
    } catch (error) {
        alert('Error generando ticket: ' + error.message);
    }
}

// Mostrar ticket para impresión/descarga
function mostrarTicket(datos, tipo) {
    const ticketHTML = `
        <div class="ticket-container" id="ticketParaDescargar">
            <div class="ticket-header">
                <h2>ComfortCan México</h2>
                <p>Hotel & Adiestramiento Canino</p>
            </div>
            <hr>
            <div class="ticket-body">
                <p><strong>Fecha:</strong> ${formatDate(new Date())}</p>
                <p><strong>Tipo:</strong> ${tipo === 'checkin' ? 'Hospedaje' : 'Paseo'}</p>
                <p><strong>Mascota:</strong> ${datos.perro_nombre || 'N/A'}</p>
                ${tipo === 'checkin' ? `
                    <p><strong>Entrada:</strong> ${formatDate(datos.fecha_entrada)}</p>
                    <p><strong>Salida:</strong> ${formatDate(datos.fecha_salida)}</p>
                ` : `
                    <p><strong>Fecha:</strong> ${formatDate(datos.fecha)}</p>
                    <p><strong>Duración:</strong> ${datos.duracion} min</p>
                `}
                <hr>
                <h4>Servicios:</h4>
                ${datos.servicios ? datos.servicios.map(s => `
                    <p>${s.nombre}: $${s.subtotal?.toFixed(2) || s.precio}</p>
                `).join('') : `<p>Servicio: $${datos.precio?.toFixed(2)}</p>`}
                <hr>
                <h3>TOTAL: $${datos.total?.toFixed(2) || datos.precio?.toFixed(2)}</h3>
            </div>
            <div class="ticket-footer">
                <p>¡Gracias por su preferencia!</p>
            </div>
        </div>
    `;
    
    // Mostrar en modal
    const modal = document.getElementById('ticketModal');
    const contenido = document.getElementById('ticketContenido');
    if (modal && contenido) {
        contenido.innerHTML = ticketHTML;
        modal.style.display = 'block';
    }
}

// Descargar ticket como imagen
function descargarTicket() {
    const ticket = document.getElementById('ticketParaDescargar');
    if (!ticket) return;
    
    // Usar html2canvas si está disponible
    if (typeof html2canvas !== 'undefined') {
        html2canvas(ticket).then(canvas => {
            const link = document.createElement('a');
            link.download = `ticket_${Date.now()}.png`;
            link.href = canvas.toDataURL();
            link.click();
        });
    } else {
        // Alternativa: imprimir
        window.print();
    }
}

// Cerrar modal de ticket
function cerrarTicketModal() {
    const modal = document.getElementById('ticketModal');
    if (modal) modal.style.display = 'none';
}
// ==================== PARTE 4: EXPEDIENTES ====================

let expedienteActual = null;

// Cargar lista de expedientes (perros)
async function cargarExpedientes() {
    try {
        const perros = await apiRequest('/perros/');
        renderExpedientes(perros);
    } catch (error) {
        console.error('Error cargando expedientes:', error);
    }
}

// Renderizar expedientes en grid
function renderExpedientes(perros) {
    const container = document.getElementById('expedientesGrid');
    if (!container) return;
    
    if (perros.length === 0) {
        container.innerHTML = '<p class="text-muted">No hay expedientes registrados</p>';
        return;
    }
    
    container.innerHTML = perros.map(p => `
        <div class="expediente-card" onclick="verExpediente(${p.id})">
            <div class="expediente-foto">
                ${p.foto_url ? `<img src="${p.foto_url}" alt="${p.nombre}">` : `<div class="sin-foto">${p.nombre.charAt(0)}</div>`}
            </div>
            <div class="expediente-info">
                <h4>${p.nombre}</h4>
                <p>${p.raza || 'Sin raza'}</p>
                <p class="propietario">${p.propietario_nombre || 'Sin dueño'}</p>
            </div>
        </div>
    `).join('');
}

// Filtrar expedientes por búsqueda
function filtrarExpedientes() {
    const busqueda = document.getElementById('busquedaExpediente')?.value.toLowerCase() || '';
    const cards = document.querySelectorAll('.expediente-card');
    
    cards.forEach(card => {
        const nombre = card.querySelector('h4')?.textContent.toLowerCase() || '';
        const raza = card.querySelector('p')?.textContent.toLowerCase() || '';
        const propietario = card.querySelector('.propietario')?.textContent.toLowerCase() || '';
        
        if (nombre.includes(busqueda) || raza.includes(busqueda) || propietario.includes(busqueda)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Ver expediente completo
async function verExpediente(perroId) {
    try {
        const [perro, propietario, historial] = await Promise.all([
            apiRequest(`/perro/${perroId}`),
            apiRequest(`/perro/${perroId}/propietario`).catch(() => null),
            apiRequest(`/perro/${perroId}/historial`).catch(() => [])
        ]);
        
        expedienteActual = { perro, propietario, historial };
        
        mostrarModalExpediente(perro, propietario, historial);
        
    } catch (error) {
        console.error('Error cargando expediente:', error);
        alert('Error al cargar expediente');
    }
}

// Mostrar modal de expediente
function mostrarModalExpediente(perro, propietario, historial) {
    const modal = document.getElementById('expedienteModal');
    const contenido = document.getElementById('expedienteContenido');
    if (!modal || !contenido) return;
    
    contenido.innerHTML = `
        <div class="expediente-detalle">
            <!-- Sección de fotos -->
            <div class="expediente-fotos">
                <h4>Fotos</h4>
                <div class="fotos-grid">
                    <div class="foto-principal">
                        ${perro.foto_url ? `<img src="${perro.foto_url}" alt="${perro.nombre}">` : `<div class="sin-foto-grande">${perro.nombre.charAt(0)}</div>`}
                        <label class="btn btn-sm btn-secondary">
                            Cambiar foto
                            <input type="file" accept="image/*" onchange="subirFotoPerro(${perro.id}, this)" style="display:none">
                        </label>
                    </div>
                    <div class="foto-cartilla">
                        <h5>Cartilla de Vacunación</h5>
                        ${perro.cartilla_url ? `<img src="${perro.cartilla_url}" alt="Cartilla" onclick="verImagenGrande('${perro.cartilla_url}')">` : '<p class="text-muted">Sin cartilla</p>'}
                        <label class="btn btn-sm btn-secondary">
                            ${perro.cartilla_url ? 'Cambiar' : 'Subir'} cartilla
                            <input type="file" accept="image/*" onchange="subirCartilla(${perro.id}, this)" style="display:none">
                        </label>
                    </div>
                </div>
            </div>
            
            <!-- Información del perro -->
            <div class="expediente-info-completa">
                <h4>Información del Perro</h4>
                <form id="formEditarPerro" onsubmit="guardarEdicionPerro(event, ${perro.id})">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Nombre</label>
                            <input type="text" id="editPerroNombre" value="${perro.nombre || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Raza</label>
                            <input type="text" id="editPerroRaza" value="${perro.raza || ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Color</label>
                            <input type="text" id="editPerroColor" value="${perro.color || ''}">
                        </div>
                        <div class="form-group">
                            <label>Tamaño</label>
                            <select id="editPerroTamano">
                                <option value="pequeño" ${perro.tamano === 'pequeño' ? 'selected' : ''}>Pequeño</option>
                                <option value="mediano" ${perro.tamano === 'mediano' ? 'selected' : ''}>Mediano</option>
                                <option value="grande" ${perro.tamano === 'grande' ? 'selected' : ''}>Grande</option>
                                <option value="gigante" ${perro.tamano === 'gigante' ? 'selected' : ''}>Gigante</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Edad (años)</label>
                            <select id="editPerroEdad">
                                ${[...Array(16).keys()].map(i => `<option value="${i}" ${perro.edad == i ? 'selected' : ''}>${i} ${i === 1 ? 'año' : 'años'}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Sexo</label>
                            <select id="editPerroSexo">
                                <option value="macho" ${perro.sexo === 'macho' ? 'selected' : ''}>Macho</option>
                                <option value="hembra" ${perro.sexo === 'hembra' ? 'selected' : ''}>Hembra</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>¿Esterilizado?</label>
                            <select id="editPerroEsterilizado">
                                <option value="true" ${perro.esterilizado ? 'selected' : ''}>Sí</option>
                                <option value="false" ${!perro.esterilizado ? 'selected' : ''}>No</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Peso (kg)</label>
                            <input type="number" step="0.1" id="editPerroPeso" value="${perro.peso || ''}">
                        </div>
                    </div>
                    
                    <h5>Vacunas y Desparasitación</h5>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Vacuna Rabia</label>
                            <input type="date" id="editPerroRabia" value="${perro.vacuna_rabia || ''}">
                        </div>
                        <div class="form-group">
                            <label>Vacuna Múltiple</label>
                            <input type="date" id="editPerroMultiple" value="${perro.vacuna_multiple || ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Desparasitación Interna</label>
                            <input type="date" id="editPerroDesparasitacionInt" value="${perro.desparasitacion_fecha_int || ''}">
                        </div>
                        <div class="form-group">
                            <label>Desparasitación Externa</label>
                            <input type="date" id="editPerroDesparasitacionExt" value="${perro.desparasitacion_fecha_ext || ''}">
                        </div>
                    </div>
                    
                    <h5>Información Médica</h5>
                    <div class="form-group">
                        <label>Alergias</label>
                        <textarea id="editPerroAlergias">${perro.alergias || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Padecimientos</label>
                        <textarea id="editPerroPadecimientos">${perro.padecimientos || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Indicaciones Especiales</label>
                        <textarea id="editPerroIndicaciones">${perro.indicaciones_especiales || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Veterinario</label>
                        <input type="text" id="editPerroVeterinario" value="${perro.veterinario || ''}">
                    </div>
                    <div class="form-group">
                        <label>Teléfono Veterinario</label>
                        <input type="tel" id="editPerroVetTel" value="${perro.veterinario_telefono || ''}">
                    </div>
                    
                    <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                </form>
            </div>
            
            <!-- Información del propietario -->
            ${propietario ? `
            <div class="expediente-propietario">
                <h4>Propietario</h4>
                <form id="formEditarPropietario" onsubmit="guardarEdicionPropietario(event, ${propietario.id})">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Nombre</label>
                            <input type="text" id="editPropNombre" value="${propietario.nombre || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Teléfono</label>
                            <input type="tel" id="editPropTelefono" value="${propietario.telefono || ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="editPropEmail" value="${propietario.email || ''}">
                        </div>
                        <div class="form-group">
                            <label>Dirección</label>
                            <input type="text" id="editPropDireccion" value="${propietario.direccion || ''}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Contacto Emergencia</label>
                        <input type="text" id="editPropEmergencia" value="${propietario.contacto_emergencia || ''}">
                    </div>
                    <div class="form-group">
                        <label>Teléfono Emergencia</label>
                        <input type="tel" id="editPropEmergenciaTel" value="${propietario.telefono_emergencia || ''}">
                    </div>
                    <button type="submit" class="btn btn-primary">Guardar Propietario</button>
                </form>
            </div>
            ` : ''}
            
            <!-- Historial de tickets -->
            <div class="expediente-tickets">
                <h4>Historial de Servicios</h4>
                <div class="tickets-grid">
                    ${historial.length > 0 ? historial.map(h => `
                        <div class="ticket-mini" onclick="verTicketHistorial(${h.id}, '${h.tipo}')">
                            <div class="ticket-mini-header">
                                <span class="tipo">${h.tipo === 'checkin' ? '🏨' : '🦮'}</span>
                                <span class="fecha">${formatDate(h.fecha)}</span>
                            </div>
                            <div class="ticket-mini-body">
                                <p>${h.tipo === 'checkin' ? 'Hospedaje' : 'Paseo'}</p>
                                <p class="monto">$${h.total?.toFixed(2) || h.precio?.toFixed(2) || '0.00'}</p>
                            </div>
                        </div>
                    `).join('') : '<p class="text-muted">Sin historial de servicios</p>'}
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

// Guardar edición del perro
async function guardarEdicionPerro(e, perroId) {
    e.preventDefault();
    
    const datos = {
        nombre: document.getElementById('editPerroNombre')?.value,
        raza: document.getElementById('editPerroRaza')?.value,
        color: document.getElementById('editPerroColor')?.value,
        tamano: document.getElementById('editPerroTamano')?.value,
        edad: parseInt(document.getElementById('editPerroEdad')?.value) || 0,
        sexo: document.getElementById('editPerroSexo')?.value,
        esterilizado: document.getElementById('editPerroEsterilizado')?.value === 'true',
        peso: parseFloat(document.getElementById('editPerroPeso')?.value) || null,
        vacuna_rabia: document.getElementById('editPerroRabia')?.value || null,
        vacuna_multiple: document.getElementById('editPerroMultiple')?.value || null,
        desparasitacion_fecha_int: document.getElementById('editPerroDesparasitacionInt')?.value || null,
        desparasitacion_fecha_ext: document.getElementById('editPerroDesparasitacionExt')?.value || null,
        alergias: document.getElementById('editPerroAlergias')?.value,
        padecimientos: document.getElementById('editPerroPadecimientos')?.value,
        indicaciones_especiales: document.getElementById('editPerroIndicaciones')?.value,
        veterinario: document.getElementById('editPerroVeterinario')?.value,
        veterinario_telefono: document.getElementById('editPerroVetTel')?.value
    };
    
    try {
        await apiRequest(`/perro/${perroId}`, 'PUT', datos);
        alert('Información del perro actualizada');
        await cargarExpedientes();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Guardar edición del propietario
async function guardarEdicionPropietario(e, propietarioId) {
    e.preventDefault();
    
    const datos = {
        nombre: document.getElementById('editPropNombre')?.value,
        telefono: document.getElementById('editPropTelefono')?.value,
        email: document.getElementById('editPropEmail')?.value,
        direccion: document.getElementById('editPropDireccion')?.value,
        contacto_emergencia: document.getElementById('editPropEmergencia')?.value,
        telefono_emergencia: document.getElementById('editPropEmergenciaTel')?.value
    };
    
    try {
        await apiRequest(`/propietario/${propietarioId}`, 'PUT', datos);
        alert('Información del propietario actualizada');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Subir foto del perro
async function subirFotoPerro(perroId, input) {
    if (!input.files || !input.files[0]) return;
    
    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`${API_URL}/perro/${perroId}/foto`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        if (!response.ok) throw new Error('Error subiendo foto');
        
        alert('Foto actualizada');
        await verExpediente(perroId);
        
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Subir cartilla de vacunación
async function subirCartilla(perroId, input) {
    if (!input.files || !input.files[0]) return;
    
    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`${API_URL}/perro/${perroId}/cartilla`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        if (!response.ok) throw new Error('Error subiendo cartilla');
        
        alert('Cartilla actualizada');
        await verExpediente(perroId);
        
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Ver imagen en grande
function verImagenGrande(url) {
    const modal = document.getElementById('imagenModal');
    const img = document.getElementById('imagenGrande');
    if (modal && img) {
        img.src = url;
        modal.style.display = 'block';
    }
}

// Ver ticket del historial
async function verTicketHistorial(id, tipo) {
    try {
        let datos;
        if (tipo === 'checkin') {
            datos = await apiRequest(`/checkin/${id}`);
        } else {
            datos = await apiRequest(`/paseo/${id}`);
        }
        mostrarTicket(datos, tipo);
    } catch (error) {
        alert('Error cargando ticket');
    }
}

// Cerrar modal de expediente
function cerrarExpedienteModal() {
    const modal = document.getElementById('expedienteModal');
    if (modal) modal.style.display = 'none';
}

// Cerrar modal de imagen
function cerrarImagenModal() {
    const modal = document.getElementById('imagenModal');
    if (modal) modal.style.display = 'none';
}
// ==================== PARTE 5: CONFIGURACIÓN Y UTILIDADES ====================

// ==================== CONFIGURACIÓN ====================

// Cargar catálogo de servicios
async function cargarCatalogoServicios() {
    try {
        const servicios = await apiRequest('/catalogo-servicios/');
        const tabla = document.getElementById('tablaServicios');
        if (!tabla) return;
        
        if (servicios.length === 0) {
            tabla.innerHTML = '<tr><td colspan="5" class="text-muted">No hay servicios configurados</td></tr>';
            return;
        }
        
        tabla.innerHTML = servicios.map(s => `
            <tr>
                <td>${s.nombre}</td>
                <td>$${s.precio.toFixed(2)}</td>
                <td>${s.tipo_cobro === 'unico' ? 'Único' : 'Por día'}</td>
                <td>${s.activo ? '✅ Activo' : '❌ Inactivo'}</td>
                <td>
                    <button onclick="editarServicio(${s.id})" class="btn btn-sm btn-info">Editar</button>
                    <button onclick="eliminarServicio(${s.id})" class="btn btn-sm btn-danger">Eliminar</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando catálogo:', error);
    }
}

// Agregar nuevo servicio
async function handleNuevoServicio(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('servicioNombre')?.value;
    const precio = document.getElementById('servicioPrecio')?.value;
    const tipoCobro = document.getElementById('servicioTipoCobro')?.value;
    
    if (!nombre || !precio) {
        alert('Completa todos los campos');
        return;
    }
    
    try {
        await apiRequest('/catalogo-servicios/', 'POST', {
            nombre: nombre,
            precio: parseFloat(precio),
            tipo_cobro: tipoCobro || 'por_dia',
            activo: true
        });
        
        alert('Servicio agregado');
        document.getElementById('servicioForm')?.reset();
        await cargarCatalogoServicios();
        await cargarServiciosDropdown();
        
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Editar servicio existente
async function editarServicio(servicioId) {
    try {
        const servicio = await apiRequest(`/catalogo-servicio/${servicioId}`);
        
        const nuevoNombre = prompt('Nombre del servicio:', servicio.nombre);
        if (!nuevoNombre) return;
        
        const nuevoPrecio = prompt('Precio:', servicio.precio);
        if (!nuevoPrecio) return;
        
        const nuevoTipo = prompt('Tipo de cobro (unico/por_dia):', servicio.tipo_cobro || 'por_dia');
        
        await apiRequest(`/catalogo-servicio/${servicioId}`, 'PUT', {
            nombre: nuevoNombre,
            precio: parseFloat(nuevoPrecio),
            tipo_cobro: nuevoTipo || 'por_dia',
            activo: servicio.activo
        });
        
        alert('Servicio actualizado');
        await cargarCatalogoServicios();
        await cargarServiciosDropdown();
        
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Eliminar servicio
async function eliminarServicio(servicioId) {
    if (!confirm('¿Eliminar este servicio?')) return;
    
    try {
        await apiRequest(`/catalogo-servicio/${servicioId}`, 'DELETE');
        alert('Servicio eliminado');
        await cargarCatalogoServicios();
        await cargarServiciosDropdown();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// ==================== UTILIDADES ====================

// Formatear fecha
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Formatear fecha y hora
function formatDateTime(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Cerrar modales al hacer clic fuera
window.onclick = function(event) {
    const modales = ['expedienteModal', 'ticketModal', 'imagenModal'];
    modales.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
};

// Cerrar modales con tecla Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modales = document.querySelectorAll('.modal');
        modales.forEach(modal => {
            modal.style.display = 'none';
        });
    }
});

// ==================== EVENT LISTENERS ADICIONALES ====================

// Event listeners para formularios y acciones
document.addEventListener('DOMContentLoaded', function() {
    // Check-in: agregar servicio desde dropdown
    const servicioDropdown = document.getElementById('servicioDropdown');
    if (servicioDropdown) {
        servicioDropdown.addEventListener('change', agregarServicioCheckIn);
    }
    
    // Check-in: calcular total cuando cambian las fechas
    const fechaEntrada = document.getElementById('checkInFechaEntrada');
    const fechaSalida = document.getElementById('checkInFechaSalida');
    if (fechaEntrada) {
        fechaEntrada.addEventListener('change', calcularTotalCheckIn);
    }
    if (fechaSalida) {
        fechaSalida.addEventListener('change', calcularTotalCheckIn);
    }
    
    // Formulario de check-in
    const checkInForm = document.getElementById('checkInForm');
    if (checkInForm) {
        checkInForm.addEventListener('submit', handleCheckIn);
    }
    
    // Formulario de paseo
    const paseoForm = document.getElementById('paseoForm');
    if (paseoForm) {
        paseoForm.addEventListener('submit', handlePaseo);
    }
    
    // Formulario de nuevo servicio
    const servicioForm = document.getElementById('servicioForm');
    if (servicioForm) {
        servicioForm.addEventListener('submit', handleNuevoServicio);
    }
    
    // Búsqueda de expedientes
    const busquedaExpediente = document.getElementById('busquedaExpediente');
    if (busquedaExpediente) {
        busquedaExpediente.addEventListener('input', filtrarExpedientes);
    }
    
    // Botón de filtrar caja
    const btnFiltrarCaja = document.getElementById('btnFiltrarCaja');
    if (btnFiltrarCaja) {
        btnFiltrarCaja.addEventListener('click', filtrarCaja);
    }
    
    // Botón de descargar ticket
    const btnDescargarTicket = document.getElementById('btnDescargarTicket');
    if (btnDescargarTicket) {
        btnDescargarTicket.addEventListener('click', descargarTicket);
    }
    
    // Botones de cerrar modales
    const btnCerrarExpediente = document.getElementById('btnCerrarExpediente');
    if (btnCerrarExpediente) {
        btnCerrarExpediente.addEventListener('click', cerrarExpedienteModal);
    }
    
    const btnCerrarTicket = document.getElementById('btnCerrarTicket');
    if (btnCerrarTicket) {
        btnCerrarTicket.addEventListener('click', cerrarTicketModal);
    }
    
    const btnCerrarImagen = document.getElementById('btnCerrarImagen');
    if (btnCerrarImagen) {
        btnCerrarImagen.addEventListener('click', cerrarImagenModal);
    }
});

// ==================== INICIALIZACIÓN DE SECCIONES ====================

// Función para cargar datos según la sección activa
async function cargarDatosSeccion(seccion) {
    switch(seccion) {
        case 'propietarios':
            await cargarPropietarios();
            break;
        case 'perros':
            await Promise.all([cargarPerros(), cargarPropietariosSelect()]);
            break;
        case 'checkin':
            await Promise.all([cargarPerrosCheckIn(), cargarServiciosDropdown(), cargarCheckIns()]);
            serviciosSeleccionados = [];
            renderServiciosSeleccionados();
            break;
        case 'paseos':
            await Promise.all([cargarPerrosPaseos(), cargarPaseos()]);
            break;
        case 'caja':
            await cargarMovimientosCaja();
            break;
        case 'expedientes':
            await cargarExpedientes();
            break;
        case 'configuracion':
            await cargarCatalogoServicios();
            break;
    }
}

// Navegación mejorada con carga de datos
function showSection(sectionId) {
    // Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    
    // Mostrar la sección seleccionada
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
        section.style.display = 'block';
    }
    
    // Actualizar navegación activa
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const navItem = document.querySelector(`[data-section="${sectionId}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
    
    // Cargar datos de la sección
    cargarDatosSeccion(sectionId);
}

// ==================== VERIFICACIÓN FINAL ====================

console.log('✅ ComfortCan México - App.js cargado completamente');
console.log('📋 Módulos disponibles: Auth, Propietarios, Perros, Check-in, Paseos, Caja, Expedientes, Configuración');
