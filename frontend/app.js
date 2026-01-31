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
    document.getElementById('btn-descargar')?.addEventListener('click', descargarTicket);
    document.getElementById('btn-guardar-servicio')?.addEventListener('click', handleNuevoServicio);
    document.getElementById('btn-guardar-tipo-paseo')?.addEventListener('click', handleNuevoTipoPaseo);
    document.getElementById('btn-enviar-caja')?.addEventListener('click', enviarPaseosCaja);
    
    // Selects dinámicos
    document.getElementById('caja-perro')?.addEventListener('change', cargarCargosPerro);
    document.getElementById('expediente-perro')?.addEventListener('change', cargarExpediente);
    document.getElementById('paseo-tipo')?.addEventListener('change', mostrarPrecioPaseo);
    document.getElementById('checkin-entrada')?.addEventListener('change', calcularTotalCheckIn);
    document.getElementById('checkin-salida')?.addEventListener('change', calcularTotalCheckIn);
    document.getElementById('checkin-servicio')?.addEventListener('change', calcularTotalCheckIn);
    
    // Desparasitación dinámica
    document.getElementById('perro-desparasitacion-tipo')?.addEventListener('change', toggleDesparasitacion);
    
    // Filtros de búsqueda
    document.getElementById('filtro-expediente')?.addEventListener('input', filtrarExpedientes);
    document.getElementById('filtro-paseo-perro')?.addEventListener('change', filtrarPaseos);
    
    // Gestión radio buttons
    document.querySelectorAll('input[name="gestion-tipo"]').forEach(radio => {
        radio.addEventListener('change', toggleGestionTipo);
    });
    document.getElementById('gestion-perro-select')?.addEventListener('change', cargarFormularioPerroCompleto);
    document.getElementById('gestion-cliente-select')?.addEventListener('change', cargarFormularioCliente);
    
    // File uploads
    document.getElementById('foto-perro-input')?.addEventListener('change', (e) => previewImage(e, 'foto-perro-preview'));
    document.getElementById('foto-cartilla-input')?.addEventListener('change', (e) => previewImage(e, 'foto-cartilla-preview'));
}

// ============================================
// DESPARASITACIÓN DINÁMICA
// ============================================
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

// SERVICIOS EN SELECT DESPLEGABLE (no checkboxes regados)
function llenarSelectServicios() {
    const select = document.getElementById('checkin-servicio');
    if (select) {
        select.innerHTML = '<option value="">-- Agregar servicio --</option>';
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
    if (sectionId === 'caja') cargarCargosPerro();
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
    
    // Subir fotos si existen
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

// ============================================
// CHECK-IN CON SERVICIOS MEJORADOS
// ============================================
let serviciosSeleccionados = [];

function agregarServicioCheckIn() {
    const select = document.getElementById('checkin-servicio');
    const option = select.selectedOptions[0];
    
    if (!option || !option.value) return;
    
    const servicio = {
        id: option.value,
        nombre: option.dataset.nombre,
        precio: parseFloat(option.dataset.precio),
        tipo: option.dataset.tipo // 'por_dia' o 'unico'
    };
    
    // Evitar duplicados
    if (serviciosSeleccionados.find(s => s.id === servicio.id)) {
        showToast('Servicio ya agregado', 'error');
        return;
    }
    
    serviciosSeleccionados.push(servicio);
    renderServiciosSeleccionados();
    calcularTotalCheckIn();
    select.value = '';
}

function quitarServicioCheckIn(servicioId) {
    serviciosSeleccionados = serviciosSeleccionados.filter(s => s.id !== servicioId);
    renderServiciosSeleccionados();
    calcularTotalCheckIn();
}

function renderServiciosSeleccionados() {
    const container = document.getElementById('servicios-seleccionados');
    if (!container) return;
    
    if (serviciosSeleccionados.length === 0) {
        container.innerHTML = '<p class="text-muted">No hay servicios seleccionados</p>';
        return;
    }
    
    container.innerHTML = serviciosSeleccionados.map(s => `
        <div class="servicio-tag">
            <span>${s.nombre} - $${s.precio} ${s.tipo === 'unico' ? '(único)' : '(por día)'}</span>
            <button type="button" class="btn-remove" onclick="quitarServicioCheckIn('${s.id}')">&times;</button>
        </div>
    `).join('');
}

function calcularTotalCheckIn() {
    const entrada = document.getElementById('checkin-entrada').value;
    const salida = document.getElementById('checkin-salida').value;
    
    let dias = 1;
    if (entrada && salida) {
        const fechaEntrada = new Date(entrada);
        const fechaSalida = new Date(salida);
        dias = Math.max(1, Math.ceil((fechaSalida - fechaEntrada) / (1000 * 60 * 60 * 24)));
    }
    
    let total = 0;
    serviciosSeleccionados.forEach(s => {
        if (s.tipo === 'unico') {
            total += s.precio; // Solo se cobra una vez
        } else {
            total += s.precio * dias; // Se cobra por día
        }
    });
    
    document.getElementById('checkin-dias')?.textContent = `${dias} día(s)`;
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
    
    if (!entrada || !salida) {
        showToast('Selecciona fechas de entrada y salida', 'error');
        return;
    }
    
    if (serviciosSeleccionados.length === 0) {
        showToast('Agrega al menos un servicio', 'error');
        return;
    }
    
    const dias = Math.max(1, Math.ceil((new Date(salida) - new Date(entrada)) / (1000 * 60 * 60 * 24)));
    
    // Calcular total
    let totalEstimado = 0;
    serviciosSeleccionados.forEach(s => {
        if (s.tipo === 'unico') {
            totalEstimado += s.precio;
        } else {
            totalEstimado += s.precio * dias;
        }
    });
    
    const data = {
        perro_id: perroId,
        fecha_entrada: entrada,
        fecha_salida: salida,
        habitacion: document.getElementById('checkin-habitacion')?.value || null,
        servicios_ids: serviciosSeleccionados.map(s => s.id),
        servicios_nombres: serviciosSeleccionados.map(s => s.nombre),
        total_estimado: totalEstimado,
        color_etiqueta: document.getElementById('checkin-color')?.value || '#45BF4D'
    };
    
    try {
        showLoading();
        const estancia = await apiPost('/estancias', data);
        
        // CREAR CARGOS AUTOMÁTICAMENTE para cada servicio
        for (const servicio of serviciosSeleccionados) {
            const monto = servicio.tipo === 'unico' ? servicio.precio : servicio.precio * dias;
            const cargoData = {
                perro_id: perroId,
                fecha_cargo: new Date().toISOString().split('T')[0],
                fecha_servicio: entrada,
                concepto: `${servicio.nombre} ${servicio.tipo === 'unico' ? '' : `(${dias} días)`}`,
                monto: monto
            };
            await apiPost('/cargos', cargoData);
        }
        
        hideLoading();
        showToast('Check-in registrado y cargos creados', 'success');
        
        // Reset
        document.getElementById('checkin-perro').value = '';
        document.getElementById('checkin-entrada').value = '';
        document.getElementById('checkin-salida').value = '';
        serviciosSeleccionados = [];
        renderServiciosSeleccionados();
        document.getElementById('checkin-total').textContent = '$0.00';
        document.getElementById('checkin-dias').textContent = '0 día(s)';
        
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
    const fecha = document.getElementById('paseo-fecha').value || new Date().toISOString().split('T')[0];
    
    const data = {
        perro_id: perroId,
        catalogo_paseo_id: tipoPaseoId,
        fecha: fecha,
        tipo_paseo: tipoPaseo?.nombre || '',
        hora_salida: document.getElementById('paseo-salida').value || null,
        hora_regreso: document.getElementById('paseo-regreso').value || null,
        precio: tipoPaseo?.precio || 0
    };
    
    try {
        showLoading();
        await apiPost('/paseos', data);
        
        // CREAR CARGO AUTOMÁTICAMENTE para el paseo
        const cargoData = {
            perro_id: perroId,
            fecha_cargo: new Date().toISOString().split('T')[0],
            fecha_servicio: fecha,
            concepto: `Paseo: ${tipoPaseo?.nombre || 'N/A'}`,
            monto: tipoPaseo?.precio || 0
        };
        await apiPost('/cargos', cargoData);
        
        hideLoading();
        showToast('Paseo registrado y cargo creado', 'success');
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
        const paseos = await apiGet('/paseos');
        renderTablaPaseosHistorial(paseos);
    } catch (error) {
        console.error('Error cargando paseos:', error);
    }
}

function filtrarPaseos() {
    const perroId = document.getElementById('filtro-paseo-perro').value;
    const desde = document.getElementById('filtro-paseo-desde')?.value;
    const hasta = document.getElementById('filtro-paseo-hasta')?.value;
    
    // Recargar con filtros
    let endpoint = '/paseos?';
    if (perroId) endpoint += `perro_id=${perroId}&`;
    if (desde) endpoint += `fecha_inicio=${desde}&`;
    if (hasta) endpoint += `fecha_fin=${hasta}&`;
    
    apiGet(endpoint).then(paseos => {
        renderTablaPaseosHistorial(paseos);
    }).catch(err => console.error(err));
}

function renderTablaPaseosHistorial(paseos) {
    const tbody = document.getElementById('tabla-paseos');
    if (!tbody) return;
    
    if (!paseos || paseos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Sin paseos registrados</td></tr>';
        document.getElementById('paseos-pendiente-total').textContent = '$0.00';
        return;
    }
    
    // Ordenar por fecha (más reciente primero)
    paseos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    let pendienteTotal = 0;
    let html = '';
    
    paseos.forEach(p => {
        const perro = perros.find(dog => dog.id === p.perro_id);
        const tipo = catalogoPaseos.find(t => t.id === p.catalogo_paseo_id);
        
        if (!p.pagado) pendienteTotal += p.precio || 0;
        
        html += `
        <tr>
            <td>${formatDate(p.fecha)}</td>
            <td>${perro?.nombre || 'Desconocido'}</td>
            <td>${tipo?.nombre || p.tipo_paseo || 'N/A'}</td>
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
        await apiPut(`/paseos/${id}/pagar`, {});
        showToast('Paseo marcado como pagado', 'success');
        cargarPaseos();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function enviarPaseosCaja() {
    showToast('Los paseos ya se agregan automáticamente a caja', 'info');
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
        const cargos = await apiGet(`/cargos?perro_id=${perroId}&pagado=false`);
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
    
    // Ordenar por fecha de servicio (más antigua primero)
    cargosActuales.sort((a, b) => new Date(a.fecha_servicio || a.fecha_cargo) - new Date(b.fecha_servicio || b.fecha_cargo));
    
    let total = 0;
    let html = '';
    
    cargosActuales.forEach((c, index) => {
        const perro = perros.find(p => p.id === c.perro_id);
        total += c.monto || 0;
        
        html += `
        <tr id="cargo-row-${index}">
            <td>${formatDate(c.fecha_servicio || c.fecha_cargo)}</td>
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
        fecha_cargo: new Date().toISOString().split('T')[0],
        fecha_servicio: document.getElementById('cargo-fecha').value || new Date().toISOString().split('T')[0],
        concepto: concepto,
        monto: monto
    };
    
    try {
        showLoading();
        const nuevo = await apiPost('/cargos', data);
        cargosActuales.push(nuevo);
        renderTablaCargos();
        
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
    
    // Ordenar cargos por fecha de servicio
    const cargosOrdenados = [...cargosActuales].sort((a, b) => 
        new Date(a.fecha_servicio || a.fecha_cargo) - new Date(b.fecha_servicio || b.fecha_cargo)
    );
    
    let itemsHtml = '';
    let total = 0;
    
    cargosOrdenados.forEach(c => {
        total += c.monto;
        itemsHtml += `
        <tr>
            <td style="text-align:left; padding: 4px 0; font-size: 10px;">${formatDate(c.fecha_servicio || c.fecha_cargo)}</td>
            <td style="text-align:left; padding: 4px 0;">${c.concepto}</td>
            <td style="text-align:right; padding: 4px 0;">$${c.monto.toFixed(2)}</td>
        </tr>`;
    });
    
    const ticketHtml = `
    <div class="ticket" id="ticket-para-imprimir">
        <div class="ticket-header">
            <img src="assets/logo.png" alt="ComfortCan" class="ticket-logo">
            <h2 style="margin: 5px 0; font-size: 16px;">ComfortCan México</h2>
            <p style="margin: 2px 0; font-size: 11px;">Hotel & Guardería Canina</p>
            <p style="margin: 2px 0; font-size: 10px;">${fecha}</p>
            <p style="margin: 2px 0; font-size: 10px;">Folio: ${folio}</p>
        </div>
        
        <div style="border-bottom: 1px dashed #000; padding: 10px 0; font-size: 12px;">
            <p style="margin: 2px 0;"><strong>Cliente:</strong> ${propietario?.nombre || 'N/A'}</p>
            <p style="margin: 2px 0;"><strong>Tel:</strong> ${propietario?.telefono || 'N/A'}</p>
            <p style="margin: 2px 0;"><strong>Mascota:</strong> ${perro?.nombre || 'N/A'}</p>
        </div>
        
        <table style="width: 100%; font-size: 11px; border-collapse: collapse; margin: 10px 0;">
            <thead>
                <tr style="border-bottom: 1px solid #000;">
                    <th style="text-align:left; padding: 4px 0;">Fecha</th>
                    <th style="text-align:left; padding: 4px 0;">Concepto</th>
                    <th style="text-align:right; padding: 4px 0;">Monto</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>
        
        <div style="border-top: 2px dashed #000; padding-top: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
                <span>TOTAL:</span>
                <span>$${total.toFixed(2)}</span>
            </div>
        </div>
        
        <div class="ticket-footer">
            <p style="margin: 2px 0;">¡Gracias por su preferencia!</p>
            <p style="margin: 2px 0;">🐕 ComfortCan México 🐕</p>
        </div>
    </div>`;
    
    document.getElementById('ticket-content').innerHTML = ticketHtml;
    document.getElementById('ticket-container').style.display = 'block';
    
    // Guardar datos del ticket para confirmar pago
    window.ticketActual = {
        folio: folio,
        perro_id: perroId,
        propietario_id: propietario?.id,
        cargos: cargosOrdenados,
        total: total
    };
}

function imprimirTicket() {
    const contenido = document.getElementById('ticket-para-imprimir');
    if (!contenido) return;
    
    const ventana = window.open('', '_blank', 'width=350,height=600');
    
    ventana.document.write(`
    <html>
    <head>
        <title>Ticket ComfortCan</title>
        <style>
            body { font-family: 'Courier New', monospace; margin: 0; padding: 10px; }
            .ticket { background: white; color: black; max-width: 300px; margin: 0 auto; }
            .ticket-header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; }
            .ticket-logo { width: 80px; }
            .ticket-footer { text-align: center; margin-top: 15px; font-size: 11px; border-top: 1px dashed #000; padding-top: 10px; }
        </style>
    </head>
    <body>
        ${contenido.outerHTML}
        <script>window.onload = function() { window.print(); }<\/script>
    </body>
    </html>`);
    ventana.document.close();
}

function descargarTicket() {
    const contenido = document.getElementById('ticket-para-imprimir');
    if (!contenido) return;
    
    // Crear canvas para convertir a imagen
    const ticketElement = contenido.cloneNode(true);
    ticketElement.style.background = 'white';
    ticketElement.style.color = 'black';
    ticketElement.style.padding = '20px';
    ticketElement.style.width = '300px';
    
    // Usar html2canvas si está disponible, sino descargar como HTML
    if (typeof html2canvas !== 'undefined') {
        html2canvas(contenido).then(canvas => {
            const link = document.createElement('a');
            link.download = `ticket-${window.ticketActual?.folio || 'comfortcan'}.png`;
            link.href = canvas.toDataURL();
            link.click();
        });
    } else {
        // Fallback: descargar como archivo HTML
        const blob = new Blob([`
            <html>
            <head>
                <style>
                    body { font-family: 'Courier New', monospace; margin: 0; padding: 10px; background: white; }
                    .ticket { max-width: 300px; margin: 0 auto; }
                    .ticket-header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; }
                    .ticket-footer { text-align: center; margin-top: 15px; font-size: 11px; border-top: 1px dashed #000; padding-top: 10px; }
                </style>
            </head>
            <body>${contenido.outerHTML}</body>
            </html>
        `], { type: 'text/html' });
        
        const link = document.createElement('a');
        link.download = `ticket-${window.ticketActual?.folio || 'comfortcan'}.html`;
        link.href = URL.createObjectURL(blob);
        link.click();
    }
}

async function confirmarPago() {
    if (!confirm('¿Confirmar que se recibió el pago?')) return;
    
    if (!window.ticketActual) {
        showToast('Genera el ticket primero', 'error');
        return;
    }
    
    try {
        showLoading();
        
        // Crear ticket en BD con detalles
        const ticketData = {
            perro_id: window.ticketActual.perro_id,
            propietario_id: window.ticketActual.propietario_id,
            cargos_ids: cargosActuales.map(c => c.id),
            subtotal: window.ticketActual.total,
            total: window.ticketActual.total,
            detalles: JSON.stringify(window.ticketActual.cargos)
        };
        
        await apiPost('/tickets', ticketData);
        
        hideLoading();
        showToast('¡Pago confirmado exitosamente!', 'success');
        
        // Limpiar
        cargosActuales = [];
        window.ticketActual = null;
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
// EXPEDIENTES CON BÚSQUEDA Y FOTOS
// ============================================
function renderListaExpedientes() {
    const container = document.getElementById('lista-expedientes');
    if (!container) return;
    
    if (perros.length === 0) {
        container.innerHTML = '<p class="text-muted">No hay perros registrados</p>';
        return;
    }
    
    let html = '<div class="expedientes-grid">';
    perros.forEach(p => {
        const dueno = propietarios.find(prop => prop.id === p.propietario_id);
        html += `
        <div class="expediente-card" onclick="cargarExpedienteDirecto('${p.id}')">
            <div class="expediente-foto">
                ${p.foto_perro_url 
                    ? `<img src="${p.foto_perro_url}" alt="${p.nombre}">` 
                    : '<span class="no-foto">🐕</span>'}
            </div>
            <div class="expediente-info">
                <h4>${p.nombre}</h4>
                <p>${p.raza || 'Sin raza'}</p>
                <p class="text-muted">${dueno?.nombre || 'Sin dueño'}</p>
            </div>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

function filtrarExpedientes() {
    const busqueda = document.getElementById('filtro-expediente').value.toLowerCase();
    const container = document.getElementById('lista-expedientes');
    
    const filtrados = perros.filter(p => {
        const dueno = propietarios.find(prop => prop.id === p.propietario_id);
        return p.nombre.toLowerCase().includes(busqueda) ||
               (p.raza && p.raza.toLowerCase().includes(busqueda)) ||
               (dueno?.nombre && dueno.nombre.toLowerCase().includes(busqueda));
    });
    
    if (filtrados.length === 0) {
        container.innerHTML = '<p class="text-muted">No se encontraron resultados</p>';
        return;
    }
    
    let html = '<div class="expedientes-grid">';
    filtrados.forEach(p => {
        const dueno = propietarios.find(prop => prop.id === p.propietario_id);
        html += `
        <div class="expediente-card" onclick="cargarExpedienteDirecto('${p.id}')">
            <div class="expediente-foto">
                ${p.foto_perro_url 
                    ? `<img src="${p.foto_perro_url}" alt="${p.nombre}">` 
                    : '<span class="no-foto">🐕</span>'}
            </div>
            <div class="expediente-info">
                <h4>${p.nombre}</h4>
                <p>${p.raza || 'Sin raza'}</p>
                <p class="text-muted">${dueno?.nombre || 'Sin dueño'}</p>
            </div>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

function cargarExpedienteDirecto(perroId) {
    document.getElementById('expediente-perro').value = perroId;
    cargarExpediente();
}

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
    
    showLoading();
    
    // Cargar historial
    let estancias = [], paseosList = [], tickets = [];
    try {
        [estancias, paseosList, tickets] = await Promise.all([
            apiGet(`/estancias?perro_id=${perroId}`).catch(() => []),
            apiGet(`/paseos?perro_id=${perroId}`).catch(() => []),
            apiGet(`/tickets?perro_id=${perroId}`).catch(() => [])
        ]);
    } catch (e) {}
    
    hideLoading();
    
    // HTML de desparasitación
    let desparasitacionHtml = '<p><strong>Desparasitación:</strong> No registrada</p>';
    if (perro.desparasitacion_tipo) {
        desparasitacionHtml = `<p><strong>Desparasitación:</strong> ${perro.desparasitacion_tipo}</p>`;
        if (perro.desparasitacion_tipo === 'Interna' || perro.desparasitacion_tipo === 'Dual') {
            desparasitacionHtml += `<p><strong>Producto Interno:</strong> ${perro.desparasitacion_producto_int || 'N/A'} - ${perro.desparasitacion_fecha_int ? formatDate(perro.desparasitacion_fecha_int) : 'Sin fecha'}</p>`;
        }
        if (perro.desparasitacion_tipo === 'Externa' || perro.desparasitacion_tipo === 'Dual') {
            desparasitacionHtml += `<p><strong>Producto Externo:</strong> ${perro.desparasitacion_producto_ext || 'N/A'} - ${perro.desparasitacion_fecha_ext ? formatDate(perro.desparasitacion_fecha_ext) : 'Sin fecha'}</p>`;
        }
    }
    
    // HTML de tickets con visual
    let ticketsHtml = '<p class="text-muted">Sin tickets registrados</p>';
    if (tickets && tickets.length > 0) {
        ticketsHtml = `
        <div class="tickets-grid">
            ${tickets.slice(0, 10).map(t => `
                <div class="ticket-mini" onclick="verTicketDetalle('${t.id}')">
                    <div class="ticket-mini-header">
                        <span class="folio">${t.folio || 'Sin folio'}</span>
                        <span class="fecha">${formatDate(t.fecha || t.created_at)}</span>
                    </div>
                    <div class="ticket-mini-total">$${(t.total || 0).toFixed(2)}</div>
                    <div class="ticket-mini-status">
                        <span class="badge badge-success">Pagado</span>
                    </div>
                </div>
            `).join('')}
        </div>`;
    }
    
    contenedor.innerHTML = `
    <div class="card mt-2">
        <div class="flex gap-3" style="flex-wrap: wrap;">
            <div style="flex: 0 0 150px;">
                ${perro.foto_perro_url 
                    ? `<img src="${perro.foto_perro_url}" alt="${perro.nombre}" style="width:150px; height:150px; object-fit:cover; border-radius:12px; cursor:pointer;" onclick="verImagenGrande('${perro.foto_perro_url}')">` 
                    : `<div style="width:150px; height:150px; background:var(--color-bg-input); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:60px;">🐕</div>`
                }
            </div>
            <div style="flex:1; min-width:200px;">
                <h2 style="margin:0 0 10px 0;">${perro.nombre}</h2>
                <p><strong>Raza:</strong> ${perro.raza || 'No especificada'}</p>
                <p><strong>Edad:</strong> ${perro.edad || 'No especificada'}</p>
                <p><strong>Peso:</strong> ${perro.peso_kg ? perro.peso_kg + ' kg' : 'No especificado'}</p>
                <p><strong>Género:</strong> ${perro.genero || 'No especificado'}</p>
                <p><strong>Esterilizado:</strong> ${perro.esterilizado ? 'Sí' : 'No'}</p>
            </div>
            ${perro.foto_cartilla_url ? `
            <div style="flex: 0 0 150px;">
                <p class="text-muted mb-1">Cartilla de Vacunación:</p>
                <img src="${perro.foto_cartilla_url}" alt="Cartilla" style="width:150px; height:150px; object-fit:cover; border-radius:12px; cursor:pointer;" onclick="verImagenGrande('${perro.foto_cartilla_url}')">
            </div>` : ''}
        </div>
        <div class="mt-2">
            <button class="btn btn-primary btn-sm" onclick="editarExpedienteCompleto('${perro.id}')">✏️ Editar Expediente</button>
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
            ${perro.vacuna_extra_nombre ? `
            <div class="vacuna-card ${perro.vacuna_extra_estado === 'Vigente' ? 'vigente' : perro.vacuna_extra_estado === 'Vencida' ? 'vencida' : ''}">
                <div class="vacuna-title">${perro.vacuna_extra_nombre}</div>
                <div class="vacuna-status">${perro.vacuna_extra_estado || 'Pendiente'}</div>
                ${perro.vacuna_extra_vence ? `<div class="vacuna-fecha">Vence: ${formatDate(perro.vacuna_extra_vence)}</div>` : ''}
            </div>` : ''}
        </div>
    </div>
    
    <div class="card mt-2">
        <h3>🏥 Información Médica</h3>
        <p><strong>Medicamentos:</strong> ${perro.medicamentos || 'Ninguno'}</p>
        <p><strong>Alergias/Condiciones:</strong> ${perro.alergias || 'Ninguna'}</p>
        <p><strong>Veterinario:</strong> ${perro.veterinario || 'No especificado'}</p>
        ${desparasitacionHtml}
    </div>
    
    <div class="card mt-2">
        <h3>🏨 Historial de Estancias (${estancias?.length || 0})</h3>
        ${estancias && estancias.length > 0 ? `
        <div class="table-container">
            <table class="table">
                <thead><tr><th>Entrada</th><th>Salida</th><th>Habitación</th><th>Total</th></tr></thead>
                <tbody>
                    ${estancias.slice(0,10).map(e => `
                        <tr>
                            <td>${formatDate(e.fecha_entrada)}</td>
                            <td>${formatDate(e.fecha_salida)}</td>
                            <td>${e.habitacion || 'N/A'}</td>
                            <td>$${(e.total_estimado || 0).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>` : '<p class="text-muted">Sin estancias registradas</p>'}
    </div>
    
    <div class="card mt-2">
        <h3>🦮 Historial de Paseos (${paseosList?.length || 0})</h3>
        ${paseosList && paseosList.length > 0 ? `
        <div class="table-container">
            <table class="table">
                <thead><tr><th>Fecha</th><th>Tipo</th><th>Precio</th><th>Estado</th></tr></thead>
                <tbody>
                    ${paseosList.slice(0,10).map(p => {
                        const tipo = catalogoPaseos.find(t => t.id === p.catalogo_paseo_id);
                        return `
                        <tr>
                            <td>${formatDate(p.fecha)}</td>
                            <td>${tipo?.nombre || p.tipo_paseo || 'N/A'}</td>
                            <td>$${(p.precio||0).toFixed(2)}</td>
                            <td>${p.pagado ? '<span class="badge badge-success">Pagado</span>' : '<span class="badge badge-warning">Pendiente</span>'}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>` : '<p class="text-muted">Sin paseos registrados</p>'}
    </div>
    
    <div class="card mt-2">
        <h3>🧾 Tickets Pagados (${tickets?.length || 0})</h3>
        ${ticketsHtml}
    </div>`;
    
    contenedor.classList.remove('hidden');
}

function verImagenGrande(url) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.onclick = () => modal.remove();
    modal.innerHTML = `
        <div class="modal" style="max-width: 90vw; max-height: 90vh; padding: 10px;" onclick="event.stopPropagation()">
            <img src="${url}" style="max-width: 100%; max-height: 80vh; object-fit: contain;">
            <button class="btn btn-secondary btn-block mt-2" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function verTicketDetalle(ticketId) {
    // Por ahora solo mostrar alerta, se puede expandir
    showToast('Ticket ID: ' + ticketId, 'info');
}

// ============================================
// EDICIÓN COMPLETA DE EXPEDIENTE
// ============================================
function editarExpedienteCompleto(perroId) {
    const perro = perros.find(p => p.id === perroId);
    if (!perro) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'modal-editar-expediente';
    
    modal.innerHTML = `
    <div class="modal modal-lg" onclick="event.stopPropagation()">
        <div class="modal-header">
            <h3 class="modal-title">Editar Expediente: ${perro.nombre}</h3>
            <button class="modal-close" onclick="cerrarModalEdicion()">&times;</button>
        </div>
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
            <form id="form-editar-expediente">
                <h4 class="mb-2">Datos Básicos</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Nombre</label>
                        <input type="text" id="edit-nombre" class="form-input" value="${perro.nombre || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Raza</label>
                        <input type="text" id="edit-raza" class="form-input" value="${perro.raza || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Edad</label>
                        <input type="text" id="edit-edad" class="form-input" value="${perro.edad || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Peso (kg)</label>
                        <input type="number" step="0.1" id="edit-peso" class="form-input" value="${perro.peso_kg || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Género</label>
                        <select id="edit-genero" class="form-select">
                            <option value="">Seleccionar</option>
                            <option value="Macho" ${perro.genero === 'Macho' ? 'selected' : ''}>Macho</option>
                            <option value="Hembra" ${perro.genero === 'Hembra' ? 'selected' : ''}>Hembra</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-checkbox">
                            <input type="checkbox" id="edit-esterilizado" ${perro.esterilizado ? 'checked' : ''}>
                            Esterilizado
                        </label>
                    </div>
                </div>
                
                <h4 class="mb-2 mt-3">Información Médica</h4>
                <div class="form-group">
                    <label class="form-label">Medicamentos</label>
                    <input type="text" id="edit-medicamentos" class="form-input" value="${perro.medicamentos || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Alergias/Condiciones</label>
                    <input type="text" id="edit-alergias" class="form-input" value="${perro.alergias || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Veterinario</label>
                    <input type="text" id="edit-veterinario" class="form-input" value="${perro.veterinario || ''}">
                </div>
                
                <h4 class="mb-2 mt-3">Vacunas</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Rabia - Estado</label>
                        <select id="edit-rabia-estado" class="form-select">
                            <option value="Pendiente" ${perro.vacuna_rabia_estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="Vigente" ${perro.vacuna_rabia_estado === 'Vigente' ? 'selected' : ''}>Vigente</option>
                            <option value="Vencida" ${perro.vacuna_rabia_estado === 'Vencida' ? 'selected' : ''}>Vencida</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Rabia - Vence</label>
                        <input type="date" id="edit-rabia-vence" class="form-input" value="${perro.vacuna_rabia_vence || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Séxtuple - Estado</label>
                        <select id="edit-sextuple-estado" class="form-select">
                            <option value="Pendiente" ${perro.vacuna_sextuple_estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="Vigente" ${perro.vacuna_sextuple_estado === 'Vigente' ? 'selected' : ''}>Vigente</option>
                            <option value="Vencida" ${perro.vacuna_sextuple_estado === 'Vencida' ? 'selected' : ''}>Vencida</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Séxtuple - Vence</label>
                        <input type="date" id="edit-sextuple-vence" class="form-input" value="${perro.vacuna_sextuple_vence || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Bordetella - Estado</label>
                        <select id="edit-bordetella-estado" class="form-select">
                            <option value="Pendiente" ${perro.vacuna_bordetella_estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="Vigente" ${perro.vacuna_bordetella_estado === 'Vigente' ? 'selected' : ''}>Vigente</option>
                            <option value="Vencida" ${perro.vacuna_bordetella_estado === 'Vencida' ? 'selected' : ''}>Vencida</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Bordetella - Vence</label>
                        <input type="date" id="edit-bordetella-vence" class="form-input" value="${perro.vacuna_bordetella_vence || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Giardia - Estado</label>
                        <select id="edit-giardia-estado" class="form-select">
                            <option value="Pendiente" ${perro.vacuna_giardia_estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="Vigente" ${perro.vacuna_giardia_estado === 'Vigente' ? 'selected' : ''}>Vigente</option>
                            <option value="Vencida" ${perro.vacuna_giardia_estado === 'Vencida' ? 'selected' : ''}>Vencida</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Giardia - Vence</label>
                        <input type="date" id="edit-giardia-vence" class="form-input" value="${perro.vacuna_giardia_vence || ''}">
                    </div>
                </div>
                
                <h4 class="mb-2 mt-3">Desparasitación</h4>
                <div class="form-group">
                    <label class="form-label">Tipo</label>
                    <select id="edit-despara-tipo" class="form-select">
                        <option value="">Ninguna</option>
                        <option value="Interna" ${perro.desparasitacion_tipo === 'Interna' ? 'selected' : ''}>Interna</option>
                        <option value="Externa" ${perro.desparasitacion_tipo === 'Externa' ? 'selected' : ''}>Externa</option>
                        <option value="Dual" ${perro.desparasitacion_tipo === 'Dual' ? 'selected' : ''}>Dual</option>
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Producto Interno</label>
                        <input type="text" id="edit-despara-prod-int" class="form-input" value="${perro.desparasitacion_producto_int || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Fecha Interno</label>
                        <input type="date" id="edit-despara-fecha-int" class="form-input" value="${perro.desparasitacion_fecha_int || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Producto Externo</label>
                        <input type="text" id="edit-despara-prod-ext" class="form-input" value="${perro.desparasitacion_producto_ext || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Fecha Externo</label>
                        <input type="date" id="edit-despara-fecha-ext" class="form-input" value="${perro.desparasitacion_fecha_ext || ''}">
                    </div>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="cerrarModalEdicion()">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="guardarExpedienteCompleto('${perroId}')">Guardar Cambios</button>
        </div>
    </div>
    `;
    
    document.body.appendChild(modal);
}

function cerrarModalEdicion() {
    document.getElementById('modal-editar-expediente')?.remove();
}

async function guardarExpedienteCompleto(perroId) {
    const data = {
        nombre: document.getElementById('edit-nombre').value,
        raza: document.getElementById('edit-raza').value || null,
        edad: document.getElementById('edit-edad').value || null,
        peso_kg: parseFloat(document.getElementById('edit-peso').value) || null,
        genero: document.getElementById('edit-genero').value || null,
        esterilizado: document.getElementById('edit-esterilizado').checked,
        medicamentos: document.getElementById('edit-medicamentos').value || null,
        alergias: document.getElementById('edit-alergias').value || null,
        veterinario: document.getElementById('edit-veterinario').value || null,
        vacuna_rabia_estado: document.getElementById('edit-rabia-estado').value,
        vacuna_rabia_vence: document.getElementById('edit-rabia-vence').value || null,
        vacuna_sextuple_estado: document.getElementById('edit-sextuple-estado').value,
        vacuna_sextuple_vence: document.getElementById('edit-sextuple-vence').value || null,
        vacuna_bordetella_estado: document.getElementById('edit-bordetella-estado').value,
        vacuna_bordetella_vence: document.getElementById('edit-bordetella-vence').value || null,
        vacuna_giardia_estado: document.getElementById('edit-giardia-estado').value,
        vacuna_giardia_vence: document.getElementById('edit-giardia-vence').value || null,
        desparasitacion_tipo: document.getElementById('edit-despara-tipo').value || null,
        desparasitacion_producto_int: document.getElementById('edit-despara-prod-int').value || null,
        desparasitacion_fecha_int: document.getElementById('edit-despara-fecha-int').value || null,
        desparasitacion_producto_ext: document.getElementById('edit-despara-prod-ext').value || null,
        desparasitacion_fecha_ext: document.getElementById('edit-despara-fecha-ext').value || null
    };
    
    try {
        showLoading();
        await apiPut(`/perros/${perroId}`, data);
        
        // Actualizar en memoria
        const index = perros.findIndex(p => p.id === perroId);
        if (index > -1) {
            perros[index] = { ...perros[index], ...data };
        }
        
        hideLoading();
        cerrarModalEdicion();
        cargarExpediente(); // Recargar vista
        showToast('Expediente actualizado correctamente', 'success');
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

// ============================================
// GESTIÓN DE DATOS
// ============================================
function toggleGestionTipo() {
    const tipo = document.querySelector('input[name="gestion-tipo"]:checked').value;
    document.getElementById('gestion-perros').classList.toggle('hidden', tipo !== 'perros');
    document.getElementById('gestion-clientes').classList.toggle('hidden', tipo !== 'clientes');
}

function cargarFormularioPerroCompleto() {
    const perroId = document.getElementById('gestion-perro-select').value;
    if (perroId) {
        editarExpedienteCompleto(perroId);
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
        <div class="form-group">
            <label class="form-label">Dirección</label>
            <input type="text" id="edit-cliente-direccion" class="form-input" value="${cliente.direccion || ''}">
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
        email: document.getElementById('edit-cliente-email').value,
        direccion: document.getElementById('edit-cliente-direccion').value
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
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Sin servicios</td></tr>';
        return;
    }
    
    tbody.innerHTML = catalogoServicios.map(s => `
        <tr>
            <td>${s.nombre}</td>
            <td>$${(s.precio||0).toFixed(2)}</td>
            <td>${s.tipo_cobro === 'unico' ? 'Único' : 'Por día'}</td>
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
    const tipoCobro = document.getElementById('nuevo-servicio-tipo')?.value || 'por_dia';
    
    if (!nombre || !precio) {
        showToast('Ingresa nombre y precio', 'error');
        return;
    }
    
    try {
        showLoading();
        const nuevo = await apiPost('/catalogo-servicios', { nombre, precio, tipo_cobro: tipoCobro });
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
        const nuevo = await apiPost('/catalogo-paseos', { nombre, duracion_minutos: duracion, precio });
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
