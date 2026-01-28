// ============================================
// COMFORTCAN MÉXICO - APP.JS v2
// ============================================

const API_URL = 'https://comfortcan-api.onrender.com'; // Tu URL de Render

// Estado global
let authToken = localStorage.getItem('authToken');
let propietarios = [];
let perros = [];
let catalogoServicios = [];
let catalogoPaseos = [];
let cargosActuales = [];

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
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
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
    document.getElementById('btn-guardar-servicio')?.addEventListener('click', handleNuevoServicio);
    document.getElementById('btn-guardar-tipo-paseo')?.addEventListener('click', handleNuevoTipoPaseo);
    document.getElementById('btn-enviar-caja')?.addEventListener('click', enviarPaseosCaja);
    
    // Selects dinámicos
    document.getElementById('caja-perro')?.addEventListener('change', cargarCargosPerro);
    document.getElementById('expediente-perro')?.addEventListener('change', cargarExpediente);
    document.getElementById('paseo-tipo')?.addEventListener('change', mostrarPrecioPaseo);
    document.getElementById('checkin-entrada')?.addEventListener('change', calcularTotalCheckIn);
    document.getElementById('checkin-salida')?.addEventListener('change', calcularTotalCheckIn);
    
    // Gestión radio buttons
    document.querySelectorAll('input[name="gestion-tipo"]').forEach(radio => {
        radio.addEventListener('change', toggleGestionTipo);
    });
    document.getElementById('gestion-perro-select')?.addEventListener('change', cargarFormularioPerro);
    document.getElementById('gestion-cliente-select')?.addEventListener('change', cargarFormularioCliente);
    
    // File uploads
    document.getElementById('foto-perro-input')?.addEventListener('change', (e) => previewImage(e, 'foto-perro-preview'));
    document.getElementById('foto-cartilla-input')?.addEventListener('change', (e) => previewImage(e, 'foto-cartilla-preview'));
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
            apiGet('/propietarios/'),
            apiGet('/perros/'),
            apiGet('/catalogo-servicios/'),
            apiGet('/catalogo-paseos/')
        ]);
        
        propietarios = props || [];
        perros = dogs || [];
        catalogoServicios = servicios || [];
        catalogoPaseos = paseos || [];
        
        // Llenar todos los selects
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
    // Servicios en check-in
    const container = document.getElementById('servicios-checkin-list');
    if (container) {
        container.innerHTML = '';
        catalogoServicios.forEach(s => {
            container.innerHTML += `
                <label class="form-checkbox">
                    <input type="checkbox" name="servicio-checkin" value="${s.id}" data-precio="${s.precio}">
                    ${s.nombre} ($${s.precio})
                </label>`;
        });
        
        // Agregar listeners para calcular total
        container.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', calcularTotalCheckIn);
        });
    }
    
    // Tabla de servicios en configuración
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
    
    // Tabla en configuración
    renderTablaPaseos();
}

// ============================================
// NAVEGACIÓN
// ============================================
function navigateToSection(sectionId) {
    // Actualizar nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionId);
    });
    
    // Mostrar sección
    document.querySelectorAll('.section').forEach(section => {
        section.classList.toggle('active', section.id === `section-${sectionId}`);
    });
    
    // Cerrar sidebar en móvil
    document.getElementById('sidebar').classList.remove('open');
    
    // Cargar datos específicos
    if (sectionId === 'paseos') cargarPaseos();
    if (sectionId === 'configuracion') {
        renderTablaServicios();
        renderTablaPaseos();
    }
}

function switchTab(clickedTab, tabId) {
    const container = clickedTab.closest('.section');
    
    // Actualizar tabs
    container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    clickedTab.classList.add('active');
    
    // Mostrar contenido
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
        const nuevo = await apiPost('/propietarios/', data);
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
    
    // Subir foto si existe
    let fotoUrl = null;
    const fotoInput = document.getElementById('foto-perro-input');
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
        } catch (err) {
            console.error('Error subiendo foto:', err);
        }
    }
    
    const generoEl = document.querySelector('input[name="perro-genero"]:checked');
    
    const data = {
        propietario_id: propietarioId,
        nombre: document.getElementById('perro-nombre').value,
        raza: document.getElementById('perro-raza').value || null,
        edad_texto: document.getElementById('perro-edad').value || null,
        sexo: generoEl?.value || null,
        peso: parseFloat(document.getElementById('perro-peso').value) || null,
        fecha_pesaje: document.getElementById('perro-fecha-pesaje').value || null,
        medicamentos: document.getElementById('perro-medicamentos').value || null,
        esterilizado: document.getElementById('perro-esterilizado').checked,
        alergias: document.getElementById('perro-alergias').value || null,
        veterinario: document.getElementById('perro-veterinario').value || null,
        desparasitacion_tipo: document.getElementById('perro-desparasitacion-tipo').value || null,
        desparasitacion_fecha: document.getElementById('perro-desparasitacion-fecha').value || null,
        vacuna_rabia_estado: document.getElementById('vacuna-rabia-estado').value,
        vacuna_rabia_vence: document.getElementById('vacuna-rabia-vence').value || null,
        vacuna_sextuple_estado: document.getElementById('vacuna-sextuple-estado').value,
        vacuna_sextuple_vence: document.getElementById('vacuna-sextuple-vence').value || null,
        vacuna_bordetella_estado: document.getElementById('vacuna-bordetella-estado').value,
        vacuna_bordetella_vence: document.getElementById('vacuna-bordetella-vence').value || null,
        vacuna_giardia_estado: document.getElementById('vacuna-giardia-estado').value,
        vacuna_giardia_vence: document.getElementById('vacuna-giardia-vence').value || null,
        vacuna_extra_nombre: document.getElementById('vacuna-extra-nombre').value || null,
        vacuna_extra_estado: document.getElementById('vacuna-extra-estado').value || null,
        vacuna_extra_vence: document.getElementById('vacuna-extra-vence').value || null,
        foto_url: fotoUrl
    };
    
    try {
        showLoading();
        const nuevo = await apiPost('/perros/', data);
        perros.push(nuevo);
        llenarSelectPerros();
        e.target.reset();
        document.getElementById('foto-perro-preview').classList.add('hidden');
        document.getElementById('foto-cartilla-preview').classList.add('hidden');
        hideLoading();
        showToast('Perro registrado exitosamente', 'success');
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

// ============================================
// RECEPCIÓN - CHECK-IN
// ============================================
function calcularTotalCheckIn() {
    const entrada = document.getElementById('checkin-entrada').value;
    const salida = document.getElementById('checkin-salida').value;
    
    let total = 0;
    let dias = 1;
    
    if (entrada && salida) {
        const fechaEntrada = new Date(entrada);
        const fechaSalida = new Date(salida);
        dias = Math.max(1, Math.ceil((fechaSalida - fechaEntrada) / (1000 * 60 * 60 * 24)));
    }
    
    // Sumar servicios seleccionados
    document.querySelectorAll('input[name="servicio-checkin"]:checked').forEach(input => {
        const precio = parseFloat(input.dataset.precio) || 0;
        total += precio * dias;
    });
    
    document.getElementById('checkin-total').textContent = `$${total.toFixed(2)}`;
}

async function handleCheckIn() {
    const perroId = document.getElementById('checkin-perro').value;
    if (!perroId) {
        showToast('Selecciona un perro', 'error');
        return;
    }
    
    const entrada = document.getElementById('checkin-entrada').value;
    const salida = document.getElementById('checkin-salida').value;
    const habitacion = document.getElementById('checkin-habitacion').value;
    
    if (!entrada || !salida) {
        showToast('Selecciona fechas de entrada y salida', 'error');
        return;
    }
    
    const serviciosSeleccionados = [];
    document.querySelectorAll('input[name="servicio-checkin"]:checked').forEach(input => {
        serviciosSeleccionados.push(input.value);
    });
    
    const data = {
        perro_id: perroId,
        fecha_entrada: entrada,
        fecha_salida: salida,
        habitacion: habitacion,
        servicios_ids: serviciosSeleccionados,
        color_etiqueta: document.getElementById('checkin-color').value
    };
    
    try {
        showLoading();
        await apiPost('/estancias/', data);
        hideLoading();
        showToast('Estancia registrada exitosamente', 'success');
        
        // Reset
        document.getElementById('checkin-perro').value = '';
        document.getElementById('checkin-total').textContent = '$0.00';
        document.querySelectorAll('input[name="servicio-checkin"]').forEach(i => i.checked = false);
        
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

// ============================================
// PASEOS
// ============================================
function mostrarPrecioPaseo() {
    const select = document.getElementById('paseo-tipo');
    const precio = select.selectedOptions[0]?.dataset.precio || 0;
    document.getElementById('paseo-precio-info').textContent = `Precio del paseo: $${precio}`;
}

async function handleNuevoPaseo(e) {
    e.preventDefault();
    
    const perroId = document.getElementById('paseo-perro').value;
    const tipoPaseoId = document.getElementById('paseo-tipo').value;
    
    if (!perroId || !tipoPaseoId) {
        showToast('Selecciona perro y tipo de paseo', 'error');
        return;
    }
    
    const tipoPaseo = catalogoPaseos.find(p => p.id === tipoPaseoId);
    
    const data = {
        perro_id: perroId,
        tipo_paseo_id: tipoPaseoId,
        fecha: document.getElementById('paseo-fecha').value || new Date().toISOString().split('T')[0],
        hora_salida: document.getElementById('paseo-salida').value || null,
        hora_regreso: document.getElementById('paseo-regreso').value || null,
        precio: tipoPaseo?.precio || 0,
        pagado: false
    };
    
    try {
        showLoading();
        await apiPost('/paseos/', data);
        hideLoading();
        showToast('Paseo registrado', 'success');
        e.target.reset();
        document.getElementById('paseo-precio-info').textContent = 'Precio del paseo: $0.00';
        cargarPaseos();
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

async function cargarPaseos() {
    try {
        const paseos = await apiGet('/paseos/');
        renderTablaPaseosHistorial(paseos);
    } catch (error) {
        console.error('Error cargando paseos:', error);
    }
}

function renderTablaPaseosHistorial(paseos) {
    const tbody = document.getElementById('tabla-paseos');
    if (!tbody) return;
    
    if (!paseos || paseos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Sin paseos registrados</td></tr>';
        document.getElementById('paseos-pendiente-total').textContent = '$0.00';
        return;
    }
    
    let pendienteTotal = 0;
    let html = '';
    
    paseos.forEach(p => {
        const perro = perros.find(dog => dog.id === p.perro_id);
        const tipo = catalogoPaseos.find(t => t.id === p.tipo_paseo_id);
        
        if (!p.pagado) pendienteTotal += p.precio || 0;
        
        html += `
        <tr>
            <td>${formatDate(p.fecha)}</td>
            <td>${perro?.nombre || 'Desconocido'}</td>
            <td>${tipo?.nombre || 'N/A'}</td>
            <td>$${(p.precio || 0).toFixed(2)}</td>
            <td>
                ${p.pagado 
                    ? '<span class="badge badge-success">Pagado</span>' 
                    : `<span class="badge badge-warning">Pendiente</span>
                       <button class="btn btn-sm btn-success ml-1" onclick="marcarPaseoPagado('${p.id}')">✓</button>`
                }
            </td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
    document.getElementById('paseos-pendiente-total').textContent = `$${pendienteTotal.toFixed(2)}`;
}

async function marcarPaseoPagado(id) {
    try {
        await apiPut(`/paseos/${id}`, { pagado: true });
        showToast('Paseo marcado como pagado', 'success');
        cargarPaseos();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function enviarPaseosCaja() {
    showToast('Paseos pendientes enviados a caja', 'info');
    navigateToSection('caja');
}

// ============================================
// CAJA Y TICKET
// ============================================
async function cargarCargosPerro() {
    const perroId = document.getElementById('caja-perro').value;
    const tbody = document.getElementById('tabla-cargos');
    
    if (!perroId) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Selecciona un cliente</td></tr>';
        document.getElementById('caja-total').textContent = '$0.00';
        cargosActuales = [];
        return;
    }
    
    try {
        showLoading();
        const cargos = await apiGet(`/cargos/?perro_id=${perroId}&pagado=false`);
        cargosActuales = cargos || [];
        renderTablaCargos();
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

function renderTablaCargos() {
    const tbody = document.getElementById('tabla-cargos');
    
    if (!cargosActuales || cargosActuales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Sin cargos pendientes</td></tr>';
        document.getElementById('caja-total').textContent = '$0.00';
        return;
    }
    
    let total = 0;
    let html = '';
    
    cargosActuales.forEach((c, index) => {
        const perro = perros.find(p => p.id === c.perro_id);
        total += c.monto || 0;
        
        html += `
        <tr id="cargo-row-${index}">
            <td>${formatDate(c.fecha || c.created_at)}</td>
            <td>${perro?.nombre || 'N/A'}</td>
            <td>${c.concepto}</td>
            <td>$${(c.monto || 0).toFixed(2)}</td>
            <td>
                <input type="checkbox" class="cargo-borrar" data-index="${index}" data-id="${c.id}">
            </td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
    document.getElementById('caja-total').textContent = `$${total.toFixed(2)}`;
    
    // Listeners para borrar
    document.querySelectorAll('.cargo-borrar').forEach(checkbox => {
        checkbox.addEventListener('change', async (e) => {
            if (e.target.checked) {
                if (confirm('¿Eliminar este cargo?')) {
                    try {
                        await apiDelete(`/cargos/${e.target.dataset.id}`);
                        cargosActuales.splice(e.target.dataset.index, 1);
                        renderTablaCargos();
                        showToast('Cargo eliminado', 'success');
                    } catch (error) {
                        showToast(error.message, 'error');
                        e.target.checked = false;
                    }
                } else {
                    e.target.checked = false;
                }
            }
        });
    });
}

async function handleAgregarCargo() {
    const perroId = document.getElementById('caja-perro').value;
    if (!perroId) {
        showToast('Selecciona un perro primero', 'error');
        return;
    }
    
    const concepto = document.getElementById('cargo-concepto').value;
    const monto = parseFloat(document.getElementById('cargo-monto').value);
    
    if (!concepto || !monto) {
        showToast('Ingresa concepto y monto', 'error');
        return;
    }
    
    const data = {
        perro_id: perroId,
        fecha: document.getElementById('cargo-fecha').value || new Date().toISOString().split('T')[0],
        concepto: concepto,
        monto: monto,
        pagado: false
    };
    
    try {
        showLoading();
        const nuevo = await apiPost('/cargos/', data);
        cargosActuales.push(nuevo);
        renderTablaCargos();
        
        // Limpiar campos
        document.getElementById('cargo-concepto').value = '';
        document.getElementById('cargo-monto').value = '';
        
        hideLoading();
        showToast('Cargo agregado', 'success');
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

function generarTicket() {
    if (cargosActuales.length === 0) {
        showToast('No hay cargos para generar ticket', 'error');
        return;
    }
    
    const perroId = document.getElementById('caja-perro').value;
    const perro = perros.find(p => p.id === perroId);
    const propietario = propietarios.find(p => p.id === perro?.propietario_id);
    
    const fecha = new Date().toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const folio = 'TK-' + Date.now().toString().slice(-8);
    
    let itemsHtml = '';
    let total = 0;
    
    cargosActuales.forEach(c => {
        total += c.monto;
        itemsHtml += `
        <tr>
            <td style="text-align:left; padding: 4px 0;">${c.concepto}</td>
            <td style="text-align:right; padding: 4px 0;">$${c.monto.toFixed(2)}</td>
        </tr>`;
    });
    
    const ticketHtml = `
    <div class="ticket" id="ticket-para-imprimir" style="background: white; color: black; padding: 20px; font-family: 'Courier New', monospace; max-width: 300px; margin: 0 auto;">
        <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
            <img src="assets/logo.png" alt="ComfortCan" style="width: 80px; margin-bottom: 5px;">
            <h2 style="margin: 5px 0; font-size: 16px;">ComfortCan México</h2>
            <p style="margin: 2px 0; font-size: 11px;">Hotel & Guardería Canina</p>
            <p style="margin: 2px 0; font-size: 10px;">${fecha}</p>
            <p style="margin: 2px 0; font-size: 10px;">Folio: ${folio}</p>
        </div>
        
        <div style="border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; font-size: 12px;">
            <p style="margin: 2px 0;"><strong>Cliente:</strong> ${propietario?.nombre || 'N/A'}</p>
            <p style="margin: 2px 0;"><strong>Mascota:</strong> ${perro?.nombre || 'N/A'}</p>
        </div>
        
        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>
        
        <div style="border-top: 2px dashed #000; margin-top: 10px; padding-top: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
                <span>TOTAL:</span>
                <span>$${total.toFixed(2)}</span>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 15px; font-size: 11px; border-top: 1px dashed #000; padding-top: 10px;">
            <p style="margin: 2px 0;">¡Gracias por su preferencia!</p>
            <p style="margin: 2px 0;">🐕 ComfortCan México 🐕</p>
        </div>
    </div>`;
    
    document.getElementById('ticket-content').innerHTML = ticketHtml;
    document.getElementById('ticket-container').style.display = 'block';
}

function imprimirTicket() {
    const contenido = document.getElementById('ticket-para-imprimir').outerHTML;
    const ventana = window.open('', '_blank', 'width=350,height=600');
    
    ventana.document.write(`
    <html>
    <head><title>Ticket ComfortCan</title></head>
    <body style="margin:0; padding:10px;">
        ${contenido}
        <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>`);
    ventana.document.close();
}

async function confirmarPago() {
    if (!confirm('¿Confirmar que se recibió el pago?')) return;
    
    try {
        showLoading();
        
        // Marcar todos los cargos como pagados
        for (const cargo of cargosActuales) {
            await apiPut(`/cargos/${cargo.id}`, { pagado: true });
        }
        
        hideLoading();
        showToast('¡Pago confirmado exitosamente!', 'success');
        
        // Limpiar
        cargosActuales = [];
        document.getElementById('caja-perro').value = '';
        document.getElementById('tabla-cargos').innerHTML = '<tr><td colspan="5" class="text-center text-muted">Selecciona un cliente</td></tr>';
        document.getElementById('caja-total').textContent = '$0.00';
        document.getElementById('ticket-container').style.display = 'none';
        
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

// ============================================
// EXPEDIENTES
// ============================================
async function cargarExpediente() {
    const perroId = document.getElementById('expediente-perro').value;
    const contenedor = document.getElementById('expediente-contenido');
    
    if (!perroId) {
        contenedor.classList.add('hidden');
        return;
    }
    
    const perro = perros.find(p => p.id === perroId);
    const propietario = propietarios.find(p => p.id === perro?.propietario_id);
    
    if (!perro) return;
    
    // Cargar historial
    let estancias = [], paseos = [], tickets = [];
    try {
        [estancias, paseos, tickets] = await Promise.all([
            apiGet(`/estancias/?perro_id=${perroId}`).catch(() => []),
            apiGet(`/paseos/?perro_id=${perroId}`).catch(() => []),
            apiGet(`/tickets/?perro_id=${perroId}`).catch(() => [])
        ]);
    } catch (e) {}
    
    contenedor.innerHTML = `
    <div class="card mt-2">
        <div class="flex gap-3" style="flex-wrap: wrap;">
            <div style="flex: 0 0 150px;">
                ${perro.foto_url 
                    ? `<img src="${perro.foto_url}" alt="${perro.nombre}" style="width:150px; height:150px; object-fit:cover; border-radius:12px;">` 
                    : `<div style="width:150px; height:150px; background:var(--color-bg-input); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:60px;">🐕</div>`
                }
            </div>
            <div style="flex:1; min-width:200px;">
                <h2 style="margin:0 0 10px 0;">${perro.nombre}</h2>
                <p><strong>Raza:</strong> ${perro.raza || 'No especificada'}</p>
                <p><strong>Edad:</strong> ${perro.edad_texto || 'No especificada'}</p>
                <p><strong>Peso:</strong> ${perro.peso ? perro.peso + ' kg' : 'No especificado'}</p>
                <p><strong>Sexo:</strong> ${perro.sexo || 'No especificado'}</p>
                <p><strong>Esterilizado:</strong> ${perro.esterilizado ? 'Sí' : 'No'}</p>
            </div>
        </div>
    </div>
    
    <div class="card mt-2">
        <h3>👤 Propietario</h3>
        <p><strong>Nombre:</strong> ${propietario?.nombre || 'N/A'}</p>
        <p><strong>Teléfono:</strong> ${propietario?.telefono || 'N/A'}</p>
        <p><strong>Email:</strong> ${propietario?.email || 'N/A'}</p>
        <p><strong>Dirección:</strong> ${propietario?.direccion || 'N/A'}</p>
    </div>
    
    <div class="card mt-2">
        <h3>💉 Vacunas</h3>
        <div class="vacunas-grid">
            <div class="vacuna-card ${perro.vacuna_rabia_estado === 'Vigente' ? 'vigente' : perro.vacuna_rabia_estado === 'Vencida' ? 'vencida' : ''}">
                <div class="vacuna-title">Rabia</div>
                <div class="vacuna-status">${perro.vacuna_rabia_estado || 'Pendiente'}</div>
                ${perro.vacuna_rabia_vence ? `<div class="vacuna-fecha">Vence: ${formatDate(perro.vacuna_rabia_vence)}</div>` : ''}
            </div>
            <div class="vacuna-card ${perro.vacuna_sextuple_estado === 'Vigente' ? 'vigente' : perro.vacuna_sextuple_estado === 'Vencida' ? 'vencida' : ''}">
                <div class="vacuna-title">Séxtuple</div>
                <div class="vacuna-status">${perro.vacuna_sextuple_estado || 'Pendiente'}</div>
                ${perro.vacuna_sextuple_vence ? `<div class="vacuna-fecha">Vence: ${formatDate(perro.vacuna_sextuple_vence)}</div>` : ''}
            </div>
            <div class="vacuna-card ${perro.vacuna_bordetella_estado === 'Vigente' ? 'vigente' : perro.vacuna_bordetella_estado === 'Vencida' ? 'vencida' : ''}">
                <div class="vacuna-title">Bordetella</div>
                <div class="vacuna-status">${perro.vacuna_bordetella_estado || 'Pendiente'}</div>
                ${perro.vacuna_bordetella_vence ? `<div class="vacuna-fecha">Vence: ${formatDate(perro.vacuna_bordetella_vence)}</div>` : ''}
            </div>
            <div class="vacuna-card ${perro.vacuna_giardia_estado === 'Vigente' ? 'vigente' : perro.vacuna_giardia_estado === 'Vencida' ? 'vencida' : ''}">
                <div class="vacuna-title">Giardia</div>
                <div class="vacuna-status">${perro.vacuna_giardia_estado || 'Pendiente'}</div>
                ${perro.vacuna_giardia_vence ? `<div class="vacuna-fecha">Vence: ${formatDate(perro.vacuna_giardia_vence)}</div>` : ''}
            </div>
        </div>
    </div>
    
    <div class="card mt-2">
        <h3>🏥 Información Médica</h3>
        <p><strong>Medicamentos:</strong> ${perro.medicamentos || 'Ninguno'}</p>
        <p><strong>Alergias/Condiciones:</strong> ${perro.alergias || 'Ninguna'}</p>
        <p><strong>Veterinario:</strong> ${perro.veterinario || 'No especificado'}</p>
        <p><strong>Desparasitación:</strong> ${perro.desparasitacion_tipo || 'N/A'} ${perro.desparasitacion_fecha ? '- ' + formatDate(perro.desparasitacion_fecha) : ''}</p>
    </div>
    
    <div class="card mt-2">
        <h3>🏨 Historial de Estancias (${estancias.length})</h3>
        ${estancias.length > 0 ? `
        <div class="table-container">
            <table class="table">
                <thead><tr><th>Entrada</th><th>Salida</th><th>Habitación</th></tr></thead>
                <tbody>
                    ${estancias.slice(0,10).map(e => `
                        <tr>
                            <td>${formatDate(e.fecha_entrada)}</td>
                            <td>${formatDate(e.fecha_salida)}</td>
                            <td>${e.habitacion || 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>` : '<p class="text-muted">Sin estancias registradas</p>'}
    </div>
    
    <div class="card mt-2">
        <h3>🦮 Historial de Paseos (${paseos.length})</h3>
        ${paseos.length > 0 ? `
        <div class="table-container">
            <table class="table">
                <thead><tr><th>Fecha</th><th>Tipo</th><th>Precio</th><th>Estado</th></tr></thead>
                <tbody>
                    ${paseos.slice(0,10).map(p => {
                        const tipo = catalogoPaseos.find(t => t.id === p.tipo_paseo_id);
                        return `
                        <tr>
                            <td>${formatDate(p.fecha)}</td>
                            <td>${tipo?.nombre || 'N/A'}</td>
                            <td>$${(p.precio||0).toFixed(2)}</td>
                            <td>${p.pagado ? '<span class="badge badge-success">Pagado</span>' : '<span class="badge badge-warning">Pendiente</span>'}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>` : '<p class="text-muted">Sin paseos registrados</p>'}
    </div>`;
    
    contenedor.classList.remove('hidden');
}

// ============================================
// GESTIÓN DE DATOS
// ============================================
function toggleGestionTipo() {
    const tipo = document.querySelector('input[name="gestion-tipo"]:checked').value;
    document.getElementById('gestion-perros').classList.toggle('hidden', tipo !== 'perros');
    document.getElementById('gestion-clientes').classList.toggle('hidden', tipo !== 'clientes');
}

function cargarFormularioPerro() {
    const perroId = document.getElementById('gestion-perro-select').value;
    const container = document.getElementById('gestion-perro-form');
    
    if (!perroId) {
        container.classList.add('hidden');
        return;
    }
    
    const perro = perros.find(p => p.id === perroId);
    if (!perro) return;
    
    container.innerHTML = `
    <div class="card mt-2" style="background: var(--color-bg-input);">
        <div class="form-group">
            <label class="form-label">Nombre</label>
            <input type="text" id="edit-perro-nombre" class="form-input" value="${perro.nombre || ''}">
        </div>
        <div class="form-group">
            <label class="form-label">Raza</label>
            <input type="text" id="edit-perro-raza" class="form-input" value="${perro.raza || ''}">
        </div>
        <div class="form-group">
            <label class="form-label">Peso (kg)</label>
            <input type="number" step="0.1" id="edit-perro-peso" class="form-input" value="${perro.peso || ''}">
        </div>
        <div class="btn-group mt-2">
            <button type="button" class="btn btn-primary" onclick="guardarEdicionPerro('${perroId}')">Guardar Cambios</button>
            <button type="button" class="btn btn-danger" onclick="eliminarPerro('${perroId}')">Eliminar Perro</button>
        </div>
    </div>`;
    
    container.classList.remove('hidden');
}

async function guardarEdicionPerro(id) {
    const data = {
        nombre: document.getElementById('edit-perro-nombre').value,
        raza: document.getElementById('edit-perro-raza').value,
        peso: parseFloat(document.getElementById('edit-perro-peso').value) || null
    };
    
    try {
        showLoading();
        await apiPut(`/perros/${id}`, data);
        const index = perros.findIndex(p => p.id === id);
        if (index > -1) perros[index] = { ...perros[index], ...data };
        llenarSelectPerros();
        hideLoading();
        showToast('Perro actualizado', 'success');
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

async function eliminarPerro(id) {
    if (!confirm('¿Seguro que deseas eliminar este perro? Esta acción no se puede deshacer.')) return;
    
    try {
        showLoading();
        await apiDelete(`/perros/${id}`);
        perros = perros.filter(p => p.id !== id);
        llenarSelectPerros();
        document.getElementById('gestion-perro-select').value = '';
        document.getElementById('gestion-perro-form').classList.add('hidden');
        hideLoading();
        showToast('Perro eliminado', 'success');
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

function cargarFormularioCliente() {
    const clienteId = document.getElementById('gestion-cliente-select').value;
    const container = document.getElementById('gestion-cliente-form');
    
    if (!clienteId) {
        container.classList.add('hidden');
        return;
    }
    
    const cliente = propietarios.find(p => p.id === clienteId);
    if (!cliente) return;
    
    container.innerHTML = `
    <div class="card mt-2" style="background: var(--color-bg-input);">
        <div class="form-group">
            <label class="form-label">Nombre</label>
            <input type="text" id="edit-cliente-nombre" class="form-input" value="${cliente.nombre || ''}">
        </div>
        <div class="form-group">
            <label class="form-label">Teléfono</label>
            <input type="tel" id="edit-cliente-telefono" class="form-input" value="${cliente.telefono || ''}">
        </div>
        <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" id="edit-cliente-email" class="form-input" value="${cliente.email || ''}">
        </div>
        <div class="btn-group mt-2">
            <button type="button" class="btn btn-primary" onclick="guardarEdicionCliente('${clienteId}')">Guardar Cambios</button>
            <button type="button" class="btn btn-danger" onclick="eliminarCliente('${clienteId}')">Eliminar Cliente</button>
        </div>
    </div>`;
    
    container.classList.remove('hidden');
}

async function guardarEdicionCliente(id) {
    const data = {
        nombre: document.getElementById('edit-cliente-nombre').value,
        telefono: document.getElementById('edit-cliente-telefono').value,
        email: document.getElementById('edit-cliente-email').value
    };
    
    try {
        showLoading();
        await apiPut(`/propietarios/${id}`, data);
        const index = propietarios.findIndex(p => p.id === id);
        if (index > -1) propietarios[index] = { ...propietarios[index], ...data };
        llenarSelectPropietarios();
        hideLoading();
        showToast('Cliente actualizado', 'success');
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

async function eliminarCliente(id) {
    if (!confirm('¿Seguro? Se eliminarán también todos los perros de este cliente.')) return;
    
    try {
        showLoading();
        await apiDelete(`/propietarios/${id}`);
        propietarios = propietarios.filter(p => p.id !== id);
        perros = perros.filter(p => p.propietario_id !== id);
        llenarSelectPropietarios();
        llenarSelectPerros();
        document.getElementById('gestion-cliente-select').value = '';
        document.getElementById('gestion-cliente-form').classList.add('hidden');
        hideLoading();
        showToast('Cliente eliminado', 'success');
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

// ============================================
// CONFIGURACIÓN
// ============================================
function renderTablaServicios() {
    const tbody = document.getElementById('tabla-servicios');
    if (!tbody) return;
    
    if (catalogoServicios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Sin servicios</td></tr>';
        return;
    }
    
    tbody.innerHTML = catalogoServicios.map(s => `
        <tr>
            <td>${s.nombre}</td>
            <td>$${(s.precio||0).toFixed(2)}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="eliminarServicio('${s.id}')">🗑</button>
            </td>
        </tr>
    `).join('');
}

function renderTablaPaseos() {
    const tbody = document.getElementById('tabla-tipos-paseo');
    if (!tbody) return;
    
    if (catalogoPaseos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Sin tipos de paseo</td></tr>';
        return;
    }
    
    tbody.innerHTML = catalogoPaseos.map(p => `
        <tr>
            <td>${p.nombre}</td>
            <td>$${(p.precio||0).toFixed(2)}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="eliminarTipoPaseo('${p.id}')">🗑</button>
            </td>
        </tr>
    `).join('');
}

async function handleNuevoServicio() {
    const nombre = document.getElementById('nuevo-servicio-nombre').value;
    const precio = parseFloat(document.getElementById('nuevo-servicio-precio').value);
    
    if (!nombre || !precio) {
        showToast('Ingresa nombre y precio', 'error');
        return;
    }
    
    try {
        showLoading();
        const nuevo = await apiPost('/catalogo-servicios/', { nombre, precio, activo: true });
        catalogoServicios.push(nuevo);
        renderTablaServicios();
        llenarSelectServicios();
        document.getElementById('nuevo-servicio-nombre').value = '';
        document.getElementById('nuevo-servicio-precio').value = '';
        hideLoading();
        showToast('Servicio agregado', 'success');
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

async function eliminarServicio(id) {
    if (!confirm('¿Eliminar este servicio?')) return;
    
    try {
        await apiDelete(`/catalogo-servicios/${id}`);
        catalogoServicios = catalogoServicios.filter(s => s.id !== id);
        renderTablaServicios();
        llenarSelectServicios();
        showToast('Servicio eliminado', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleNuevoTipoPaseo() {
    const nombre = document.getElementById('nuevo-paseo-nombre').value;
    const duracion = parseInt(document.getElementById('nuevo-paseo-duracion').value) || null;
    const precio = parseFloat(document.getElementById('nuevo-paseo-precio').value);
    
    if (!nombre || !precio) {
        showToast('Ingresa nombre y precio', 'error');
        return;
    }
    
    try {
        showLoading();
        const nuevo = await apiPost('/catalogo-paseos/', { nombre, duracion_minutos: duracion, precio, activo: true });
        catalogoPaseos.push(nuevo);
        renderTablaPaseos();
        llenarSelectPaseos();
        document.getElementById('nuevo-paseo-nombre').value = '';
        document.getElementById('nuevo-paseo-duracion').value = '';
        document.getElementById('nuevo-paseo-precio').value = '';
        hideLoading();
        showToast('Tipo de paseo agregado', 'success');
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

async function eliminarTipoPaseo(id) {
    if (!confirm('¿Eliminar este tipo de paseo?')) return;
    
    try {
        await apiDelete(`/catalogo-paseos/${id}`);
        catalogoPaseos = catalogoPaseos.filter(p => p.id !== id);
        renderTablaPaseos();
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
    return new Date(dateString).toLocaleDateString('es-MX', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

function showLoading() {
    document.getElementById('loading')?.classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading')?.classList.add('hidden');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
