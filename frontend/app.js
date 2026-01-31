// ============================================
// COMFORTCAN MÉXICO - APP.JS v3 CORREGIDO
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

// ============================================
// LOADING Y TOAST
// ============================================
function showLoading() {
    const loader = document.getElementById('loading');
    if (loader) loader.style.display = 'flex';
}

function hideLoading() {
    const loader = document.getElementById('loading');
    if (loader) loader.style.display = 'none';
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) {
        alert(message);
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ============================================
// EVENT LISTENERS
// ============================================
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

function toggleGestionTipo() {
    const tipo = document.querySelector('input[name="gestion-tipo"]:checked')?.value;
    document.getElementById('gestion-perros')?.classList.toggle('hidden', tipo !== 'perros');
    document.getElementById('gestion-clientes')?.classList.toggle('hidden', tipo !== 'clientes');
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
                const dueno = p.propietarios || propietarios.find(prop => prop.id === p.propietario_id);
                const duenoNombre = dueno?.nombre || 'Sin dueño';
                select.innerHTML += `<option value="${p.id}">${p.nombre} (${duenoNombre})</option>`;
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
            select.innerHTML += `<option value="${p.id}" data-precio="${p.precio}" data-nombre="${p.nombre}">${p.nombre} - $${p.precio}</option>`;
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
        vacuna_extra_vence: document.getElementById('vacuna-extra-vence')?.value || null
    };

    try {
        const nuevo = await apiPost('/perros', data);

        // Subir fotos si existen
        const fotoPerroInput = document.getElementById('foto-perro-input');
        const fotoCartillaInput = document.getElementById('foto-cartilla-input');

        if (fotoPerroInput?.files[0]) {
            await subirFoto(nuevo.id, fotoPerroInput.files[0], 'foto-perro');
        }
        if (fotoCartillaInput?.files[0]) {
            await subirFoto(nuevo.id, fotoCartillaInput.files[0], 'foto-cartilla');
        }

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

async function subirFoto(perroId, file, tipo) {
    const formData = new FormData();
    formData.append('file', file);

    const endpoint = tipo === 'foto-perro' ? 'foto-perro' : 'foto-cartilla';

    try {
        await fetch(`${API_URL}/upload/${endpoint}/${perroId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });
    } catch (err) {
        console.error('Error subiendo foto:', err);
    }
}

// ============================================
// CHECK-IN / ESTANCIAS
// ============================================
function agregarServicioCheckIn() {
    const select = document.getElementById('checkin-servicio');
    if (!select || !select.value) {
        showToast('Selecciona un servicio', 'error');
        return;
    }

    const option = select.options[select.selectedIndex];
    const servicioId = select.value;

    // Verificar si ya está agregado
    if (serviciosSeleccionados.find(s => s.id === servicioId)) {
        showToast('Este servicio ya está agregado', 'error');
        select.value = '';
        return;
    }

    serviciosSeleccionados.push({
        id: servicioId,
        nombre: option.dataset.nombre,
        precio: parseFloat(option.dataset.precio),
        tipo_cobro: option.dataset.tipo || 'por_dia'
    });

    select.value = '';
    renderServiciosSeleccionados();
    calcularTotalCheckIn();
}

function quitarServicio(servicioId) {
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
        <span class="servicio-tag">
            ${s.nombre} - $${s.precio} (${s.tipo_cobro === 'unico' ? 'único' : 'por día'})
            <button type="button" onclick="quitarServicio('${s.id}')" class="btn-quitar">&times;</button>
        </span>
    `).join('');
}

function calcularTotalCheckIn() {
    const fechaEntrada = document.getElementById('checkin-entrada')?.value;
    const fechaSalida = document.getElementById('checkin-salida')?.value;
    const diasSpan = document.getElementById('checkin-dias');
    const totalSpan = document.getElementById('checkin-total');

    if (!fechaEntrada || !fechaSalida) {
        if (diasSpan) diasSpan.textContent = '0 día(s)';
        if (totalSpan) totalSpan.textContent = '$0.00';
        return;
    }

    const entrada = new Date(fechaEntrada);
    const salida = new Date(fechaSalida);
    const dias = Math.max(1, Math.ceil((salida - entrada) / (1000 * 60 * 60 * 24)));

    let total = 0;
    serviciosSeleccionados.forEach(s => {
        if (s.tipo_cobro === 'unico') {
            total += s.precio;
        } else {
            total += s.precio * dias;
        }
    });

    if (diasSpan) diasSpan.textContent = `${dias} día(s)`;
    if (totalSpan) totalSpan.textContent = `$${total.toFixed(2)}`;
}

async function handleCheckIn() {
    const perroId = document.getElementById('checkin-perro')?.value;
    const fechaEntrada = document.getElementById('checkin-entrada')?.value;
    const fechaSalida = document.getElementById('checkin-salida')?.value;
    const habitacion = document.getElementById('checkin-habitacion')?.value;
    const color = document.getElementById('checkin-color')?.value || '#45BF4D';

    if (!perroId || !fechaEntrada || !fechaSalida) {
        showToast('Completa todos los campos requeridos', 'error');
        return;
    }

    if (serviciosSeleccionados.length === 0) {
        showToast('Agrega al menos un servicio', 'error');
        return;
    }

    // Calcular total
    const entrada = new Date(fechaEntrada);
    const salida = new Date(fechaSalida);
    const dias = Math.max(1, Math.ceil((salida - entrada) / (1000 * 60 * 60 * 24)));

    let total = 0;
    serviciosSeleccionados.forEach(s => {
        if (s.tipo_cobro === 'unico') {
            total += s.precio;
        } else {
            total += s.precio * dias;
        }
    });

    const data = {
        perro_id: perroId,
        habitacion: habitacion,
        fecha_entrada: fechaEntrada,
        fecha_salida: fechaSalida,
        servicios_ids: serviciosSeleccionados.map(s => s.id),
        servicios_nombres: serviciosSeleccionados.map(s => s.nombre),
        total_estimado: total,
        color_etiqueta: color
    };

    try {
        showLoading();
        const estancia = await apiPost('/estancias', data);

        // Crear cargos por cada servicio
        for (const s of serviciosSeleccionados) {
            const monto = s.tipo_cobro === 'unico' ? s.precio : s.precio * dias;
            await apiPost('/cargos', {
                perro_id: perroId,
                fecha_cargo: fechaEntrada,
                fecha_servicio: fechaEntrada,
                concepto: `${s.nombre} (${s.tipo_cobro === 'unico' ? 'único' : dias + ' días'})`,
                monto: monto
            });
        }

        // Limpiar formulario
        document.getElementById('checkin-perro').value = '';
        document.getElementById('checkin-entrada').value = '';
        document.getElementById('checkin-salida').value = '';
        serviciosSeleccionados = [];
        renderServiciosSeleccionados();
        calcularTotalCheckIn();

        hideLoading();
        showToast('Estancia registrada exitosamente', 'success');
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
    const infoEl = document.getElementById('paseo-precio-info');

    if (!select || !infoEl) return;

    const option = select.options[select.selectedIndex];
    const precio = option?.dataset?.precio || '0';
    infoEl.textContent = `Precio del paseo: $${parseFloat(precio).toFixed(2)}`;
}

async function handleNuevoPaseo(e) {
    e.preventDefault();

    const perroId = document.getElementById('paseo-perro')?.value;
    const fecha = document.getElementById('paseo-fecha')?.value;
    const tipoSelect = document.getElementById('paseo-tipo');
    const horaSalida = document.getElementById('paseo-salida')?.value;
    const horaRegreso = document.getElementById('paseo-regreso')?.value;

    if (!perroId || !fecha || !tipoSelect?.value) {
        showToast('Completa los campos requeridos', 'error');
        return;
    }

    const option = tipoSelect.options[tipoSelect.selectedIndex];
    const precio = parseFloat(option.dataset.precio) || 0;
    const tipoPaseo = option.dataset.nombre || option.textContent;

    try {
        showLoading();
        await apiPost('/paseos', {
            perro_id: perroId,
            catalogo_paseo_id: tipoSelect.value,
            fecha: fecha,
            tipo_paseo: tipoPaseo,
            hora_salida: horaSalida || null,
            hora_regreso: horaRegreso || null,
            precio: precio
        });

        e.target.reset();
        document.getElementById('paseo-precio-info').textContent = 'Precio del paseo: $0.00';
        await cargarPaseos();
        hideLoading();
        showToast('Paseo registrado', 'success');
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

async function cargarPaseos() {
    try {
        const paseos = await apiGet('/paseos');
        const tbody = document.getElementById('tabla-paseos');
        if (!tbody) return;

        if (!paseos || paseos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Sin paseos</td></tr>';
            return;
        }

        let totalPendiente = 0;

        tbody.innerHTML = paseos.map(p => {
            const perroNombre = p.perros?.nombre || 'N/A';
            if (!p.pagado) totalPendiente += p.precio || 0;
            return `
                <tr>
                    <td>${formatDate(p.fecha)}</td>
                    <td>${perroNombre}</td>
                    <td>${p.tipo_paseo || 'N/A'}</td>
                    <td>$${(p.precio || 0).toFixed(2)}</td>
                    <td>
                        <span class="badge ${p.pagado ? 'badge-success' : 'badge-warning'}">
                            ${p.pagado ? 'Pagado' : 'Pendiente'}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

        const totalEl = document.getElementById('paseos-pendiente-total');
        if (totalEl) totalEl.textContent = `$${totalPendiente.toFixed(2)}`;

    } catch (error) {
        console.error('Error cargando paseos:', error);
    }
}

function filtrarPaseos() {
    // TODO: Implementar filtro de paseos
    cargarPaseos();
}

// ============================================
// CAJA Y TICKETS
// ============================================
async function cargarCargosPerro() {
    const perroId = document.getElementById('caja-perro')?.value;
    const tbody = document.getElementById('tabla-cargos');
    const totalEl = document.getElementById('caja-total');

    if (!perroId) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Selecciona un cliente</td></tr>';
        if (totalEl) totalEl.textContent = '$0.00';
        cargosActuales = [];
        return;
    }

    try {
        showLoading();
        const cargos = await apiGet(`/cargos/pendientes/${perroId}`);
        cargosActuales = cargos || [];
        hideLoading();

        if (cargosActuales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Sin cargos pendientes</td></tr>';
            if (totalEl) totalEl.textContent = '$0.00';
            return;
        }

        let total = 0;
        const perro = perros.find(p => p.id === perroId);

        tbody.innerHTML = cargosActuales.map(c => {
            total += c.monto || 0;
            return `
                <tr>
                    <td>${formatDate(c.fecha_servicio || c.fecha_cargo)}</td>
                    <td>${perro?.nombre || 'N/A'}</td>
                    <td>${c.concepto}</td>
                    <td>$${(c.monto || 0).toFixed(2)}</td>
                    <td><button onclick="eliminarCargo('${c.id}')" class="btn btn-danger btn-sm">🗑️</button></td>
                </tr>
            `;
        }).join('');

        if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

    } catch (error) {
        hideLoading();
        showToast('Error cargando cargos', 'error');
    }
}

async function handleAgregarCargo() {
    const perroId = document.getElementById('caja-perro')?.value;
    const fecha = document.getElementById('cargo-fecha')?.value;
    const concepto = document.getElementById('cargo-concepto')?.value;
    const monto = document.getElementById('cargo-monto')?.value;

    if (!perroId) {
        showToast('Selecciona un perro primero', 'error');
        return;
    }

    if (!concepto || !monto) {
        showToast('Completa concepto y monto', 'error');
        return;
    }

    try {
        showLoading();
        await apiPost('/cargos', {
            perro_id: perroId,
            fecha_cargo: fecha || new Date().toISOString().split('T')[0],
            fecha_servicio: fecha || new Date().toISOString().split('T')[0],
            concepto: concepto,
            monto: parseFloat(monto)
        });

        document.getElementById('cargo-concepto').value = '';
        document.getElementById('cargo-monto').value = '';

        await cargarCargosPerro();
        hideLoading();
        showToast('Cargo agregado', 'success');
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

async function eliminarCargo(cargoId) {
    if (!confirm('¿Eliminar este cargo?')) return;

    try {
        await apiDelete(`/cargos/${cargoId}`);
        await cargarCargosPerro();
        showToast('Cargo eliminado', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function generarTicket() {
    if (cargosActuales.length === 0) {
        showToast('No hay cargos para generar ticket', 'error');
        return;
    }

    const perroId = document.getElementById('caja-perro')?.value;
    const perro = perros.find(p => p.id === perroId);
    const propietario = perro?.propietarios || propietarios.find(p => p.id === perro?.propietario_id);

    let subtotal = cargosActuales.reduce((sum, c) => sum + (c.monto || 0), 0);

    const ticketHTML = `
        <div class="ticket" id="ticket-para-descargar">
            <div class="ticket-header text-center">
                <h2>ComfortCan México</h2>
                <p>Train & Care</p>
                <hr>
            </div>
            <div class="ticket-info">
                <p><strong>Fecha:</strong> ${formatDate(new Date())}</p>
                <p><strong>Cliente:</strong> ${propietario?.nombre || 'N/A'}</p>
                <p><strong>Mascota:</strong> ${perro?.nombre || 'N/A'}</p>
            </div>
            <hr>
            <table class="ticket-items" style="width: 100%;">
                <thead>
                    <tr>
                        <th>Concepto</th>
                        <th>Fecha</th>
                        <th style="text-align: right;">Monto</th>
                    </tr>
                </thead>
                <tbody>
                    ${cargosActuales.map(c => `
                        <tr>
                            <td>${c.concepto}</td>
                            <td>${formatDate(c.fecha_servicio || c.fecha_cargo)}</td>
                            <td style="text-align: right;">$${(c.monto || 0).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <hr>
            <div class="ticket-total">
                <p><strong>TOTAL: $${subtotal.toFixed(2)}</strong></p>
            </div>
            <div class="ticket-footer text-center mt-2">
                <p>¡Gracias por su preferencia!</p>
            </div>
        </div>
    `;

    document.getElementById('ticket-content').innerHTML = ticketHTML;
    document.getElementById('ticket-container').style.display = 'block';
}

async function confirmarPago() {
    const perroId = document.getElementById('caja-perro')?.value;
    const perro = perros.find(p => p.id === perroId);
    const propietario = perro?.propietarios || propietarios.find(p => p.id === perro?.propietario_id);

    let total = cargosActuales.reduce((sum, c) => sum + (c.monto || 0), 0);

    try {
        showLoading();
        await apiPost('/tickets', {
            perro_id: perroId,
            propietario_id: propietario?.id || perro?.propietario_id,
            cargos_ids: cargosActuales.map(c => c.id),
            subtotal: total,
            total: total,
            metodo_pago: 'Efectivo'
        });

        document.getElementById('ticket-container').style.display = 'none';
        document.getElementById('caja-perro').value = '';
        cargosActuales = [];
        document.getElementById('tabla-cargos').innerHTML = '<tr><td colspan="5" class="text-center text-muted">Selecciona un cliente</td></tr>';
        document.getElementById('caja-total').textContent = '$0.00';

        hideLoading();
        showToast('Pago confirmado exitosamente', 'success');
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

function imprimirTicket() {
    window.print();
}

function descargarTicket() {
    const ticket = document.getElementById('ticket-para-descargar');
    if (!ticket) return;

    if (typeof html2canvas !== 'undefined') {
        html2canvas(ticket).then(canvas => {
            const link = document.createElement('a');
            link.download = `ticket_${Date.now()}.png`;
            link.href = canvas.toDataURL();
            link.click();
        });
    } else {
        window.print();
    }
}

// ============================================
// EXPEDIENTES
// ============================================
function renderListaExpedientes() {
    const container = document.getElementById('lista-expedientes');
    if (!container) return;

    if (perros.length === 0) {
        container.innerHTML = '<p class="text-muted">No hay expedientes registrados</p>';
        return;
    }

    container.innerHTML = `
        <div class="expedientes-grid">
            ${perros.map(p => {
                const propietario = p.propietarios || propietarios.find(prop => prop.id === p.propietario_id);
                return `
                    <div class="expediente-card" onclick="cargarExpedienteDirecto('${p.id}')">
                        <div class="expediente-foto">
                            ${p.foto_perro_url ? `<img src="${p.foto_perro_url}" alt="${p.nombre}">` : `<div class="sin-foto">${p.nombre.charAt(0)}</div>`}
                        </div>
                        <div class="expediente-info">
                            <h4>${p.nombre}</h4>
                            <p>${p.raza || 'Sin raza'}</p>
                            <p class="propietario">${propietario?.nombre || 'Sin dueño'}</p>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function filtrarExpedientes() {
    const busqueda = document.getElementById('filtro-expediente')?.value.toLowerCase() || '';
    const cards = document.querySelectorAll('.expediente-card');

    cards.forEach(card => {
        const texto = card.textContent.toLowerCase();
        card.style.display = texto.includes(busqueda) ? 'flex' : 'none';
    });
}

async function cargarExpediente() {
    const perroId = document.getElementById('expediente-perro')?.value;
    if (perroId) {
        await cargarExpedienteDirecto(perroId);
    }
}

async function cargarExpedienteDirecto(perroId) {
    try {
        showLoading();
        const perro = await apiGet(`/perros/${perroId}`);
        const propietario = perro.propietarios || propietarios.find(p => p.id === perro.propietario_id);

        // Cargar historial de tickets
        let tickets = [];
        try {
            tickets = await apiGet(`/tickets?perro_id=${perroId}`);
        } catch (e) {
            console.log('Sin historial de tickets');
        }

        const contenido = document.getElementById('expediente-contenido');
        contenido.innerHTML = `
            <div class="card mt-2">
                <div class="expediente-header flex gap-3">
                    <div class="expediente-fotos">
                        <div class="foto-principal">
                            ${perro.foto_perro_url ? `<img src="${perro.foto_perro_url}" alt="${perro.nombre}" style="max-width: 200px; border-radius: 8px;">` : `<div class="sin-foto-grande">${perro.nombre.charAt(0)}</div>`}
                        </div>
                        ${perro.foto_cartilla_url ? `
                            <div class="foto-cartilla mt-2">
                                <p class="text-muted">Cartilla de Vacunación:</p>
                                <img src="${perro.foto_cartilla_url}" alt="Cartilla" style="max-width: 200px; border-radius: 8px; cursor: pointer;" onclick="window.open('${perro.foto_cartilla_url}', '_blank')">
                            </div>
                        ` : ''}
                    </div>
                    <div class="expediente-datos" style="flex: 1;">
                        <h2>${perro.nombre}</h2>
                        <p><strong>Raza:</strong> ${perro.raza || 'N/A'}</p>
                        <p><strong>Edad:</strong> ${perro.edad || 'N/A'}</p>
                        <p><strong>Género:</strong> ${perro.genero || 'N/A'}</p>
                        <p><strong>Peso:</strong> ${perro.peso_kg ? perro.peso_kg + ' kg' : 'N/A'}</p>
                        <p><strong>Esterilizado:</strong> ${perro.esterilizado ? 'Sí' : 'No'}</p>
                        <hr>
                        <h4>Propietario</h4>
                        <p><strong>Nombre:</strong> ${propietario?.nombre || 'N/A'}</p>
                        <p><strong>Teléfono:</strong> ${propietario?.telefono || 'N/A'}</p>
                        <p><strong>Dirección:</strong> ${propietario?.direccion || 'N/A'}</p>
                    </div>
                </div>

                <hr class="mt-3">
                <h3>Información Médica</h3>
                <div class="form-row">
                    <div class="form-group">
                        <p><strong>Alergias:</strong> ${perro.alergias || 'Ninguna'}</p>
                        <p><strong>Medicamentos:</strong> ${perro.medicamentos || 'Ninguno'}</p>
                        <p><strong>Veterinario:</strong> ${perro.veterinario || 'N/A'}</p>
                    </div>
                </div>

                <h4 class="mt-2">Vacunas</h4>
                <div class="vacunas-grid">
                    <div class="vacuna-card">
                        <span class="vacuna-title">Rabia</span>
                        <span class="badge ${perro.vacuna_rabia_estado === 'Vigente' ? 'badge-success' : 'badge-warning'}">${perro.vacuna_rabia_estado || 'Pendiente'}</span>
                        <small>${perro.vacuna_rabia_vence ? 'Vence: ' + formatDate(perro.vacuna_rabia_vence) : ''}</small>
                    </div>
                    <div class="vacuna-card">
                        <span class="vacuna-title">Séxtuple</span>
                        <span class="badge ${perro.vacuna_sextuple_estado === 'Vigente' ? 'badge-success' : 'badge-warning'}">${perro.vacuna_sextuple_estado || 'Pendiente'}</span>
                        <small>${perro.vacuna_sextuple_vence ? 'Vence: ' + formatDate(perro.vacuna_sextuple_vence) : ''}</small>
                    </div>
                    <div class="vacuna-card">
                        <span class="vacuna-title">Bordetella</span>
                        <span class="badge ${perro.vacuna_bordetella_estado === 'Vigente' ? 'badge-success' : 'badge-warning'}">${perro.vacuna_bordetella_estado || 'Pendiente'}</span>
                        <small>${perro.vacuna_bordetella_vence ? 'Vence: ' + formatDate(perro.vacuna_bordetella_vence) : ''}</small>
                    </div>
                    <div class="vacuna-card">
                        <span class="vacuna-title">Giardia</span>
                        <span class="badge ${perro.vacuna_giardia_estado === 'Vigente' ? 'badge-success' : 'badge-warning'}">${perro.vacuna_giardia_estado || 'Pendiente'}</span>
                        <small>${perro.vacuna_giardia_vence ? 'Vence: ' + formatDate(perro.vacuna_giardia_vence) : ''}</small>
                    </div>
                </div>

                <h4 class="mt-3">Desparasitación</h4>
                <p><strong>Tipo:</strong> ${perro.desparasitacion_tipo || 'N/A'}</p>
                ${perro.desparasitacion_producto_int ? `<p><strong>Interna:</strong> ${perro.desparasitacion_producto_int} (${formatDate(perro.desparasitacion_fecha_int)})</p>` : ''}
                ${perro.desparasitacion_producto_ext ? `<p><strong>Externa:</strong> ${perro.desparasitacion_producto_ext} (${formatDate(perro.desparasitacion_fecha_ext)})</p>` : ''}

                <hr class="mt-3">
                <h3>Historial de Tickets</h3>
                ${tickets && tickets.length > 0 ? `
                    <div class="tickets-grid">
                        ${tickets.map(t => `
                            <div class="ticket-mini">
                                <div class="ticket-mini-header">
                                    <span>🧾</span>
                                    <span>${formatDate(t.fecha)}</span>
                                </div>
                                <div class="ticket-mini-body">
                                    <p class="monto">$${(t.total || 0).toFixed(2)}</p>
                                    <small>${t.metodo_pago || 'Efectivo'}</small>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p class="text-muted">Sin historial de tickets</p>'}

                <button onclick="editarExpedienteCompleto('${perroId}')" class="btn btn-secondary mt-3">✏️ Editar Expediente</button>
            </div>
        `;

        contenido.classList.remove('hidden');
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('Error cargando expediente', 'error');
    }
}

async function editarExpedienteCompleto(perroId) {
    // Navegar a gestión y cargar el perro
    navigateToSection('gestion');
    document.getElementById('gestion-perro-select').value = perroId;

    try {
        showLoading();
        const perro = await apiGet(`/perros/${perroId}`);

        const formContainer = document.getElementById('gestion-perros');
        formContainer.innerHTML = `
            <h3>Editando: ${perro.nombre}</h3>
            <form id="form-editar-perro">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Nombre</label>
                        <input type="text" id="edit-nombre" class="form-input" value="${perro.nombre || ''}" required>
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
                <div class="form-group">
                    <label class="form-label">Alergias</label>
                    <input type="text" id="edit-alergias" class="form-input" value="${perro.alergias || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Medicamentos</label>
                    <input type="text" id="edit-medicamentos" class="form-input" value="${perro.medicamentos || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Veterinario</label>
                    <input type="text" id="edit-veterinario" class="form-input" value="${perro.veterinario || ''}">
                </div>

                <h4 class="mt-2">Vacunas</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Rabia</label>
                        <select id="edit-rabia-estado" class="form-select">
                            <option value="Pendiente" ${perro.vacuna_rabia_estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="Vigente" ${perro.vacuna_rabia_estado === 'Vigente' ? 'selected' : ''}>Vigente</option>
                            <option value="Vencida" ${perro.vacuna_rabia_estado === 'Vencida' ? 'selected' : ''}>Vencida</option>
                        </select>
                        <input type="date" id="edit-rabia-vence" class="form-input mt-1" value="${perro.vacuna_rabia_vence || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Séxtuple</label>
                        <select id="edit-sextuple-estado" class="form-select">
                            <option value="Pendiente" ${perro.vacuna_sextuple_estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="Vigente" ${perro.vacuna_sextuple_estado === 'Vigente' ? 'selected' : ''}>Vigente</option>
                            <option value="Vencida" ${perro.vacuna_sextuple_estado === 'Vencida' ? 'selected' : ''}>Vencida</option>
                        </select>
                        <input type="date" id="edit-sextuple-vence" class="form-input mt-1" value="${perro.vacuna_sextuple_vence || ''}">
                    </div>
                </div>

                <button type="submit" class="btn btn-primary mt-2">Guardar Cambios</button>
                <button type="button" onclick="cancelarEdicion()" class="btn btn-secondary mt-2">Cancelar</button>
            </form>
        `;

        document.getElementById('form-editar-perro').addEventListener('submit', (e) => guardarEdicionPerro(e, perroId));
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('Error cargando datos', 'error');
    }
}

async function guardarEdicionPerro(e, perroId) {
    e.preventDefault();

    const data = {
        nombre: document.getElementById('edit-nombre').value,
        raza: document.getElementById('edit-raza').value || null,
        edad: document.getElementById('edit-edad').value || null,
        peso_kg: parseFloat(document.getElementById('edit-peso').value) || null,
        alergias: document.getElementById('edit-alergias').value || null,
        medicamentos: document.getElementById('edit-medicamentos').value || null,
        veterinario: document.getElementById('edit-veterinario').value || null,
        vacuna_rabia_estado: document.getElementById('edit-rabia-estado').value,
        vacuna_rabia_vence: document.getElementById('edit-rabia-vence').value || null,
        vacuna_sextuple_estado: document.getElementById('edit-sextuple-estado').value,
        vacuna_sextuple_vence: document.getElementById('edit-sextuple-vence').value || null
    };

    try {
        showLoading();
        await apiPut(`/perros/${perroId}`, data);

        // Actualizar lista local
        const index = perros.findIndex(p => p.id === perroId);
        if (index >= 0) {
            perros[index] = { ...perros[index], ...data };
        }

        cancelarEdicion();
        hideLoading();
        showToast('Expediente actualizado', 'success');
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

function cancelarEdicion() {
    const formContainer = document.getElementById('gestion-perros');
    formContainer.innerHTML = `
        <div class="form-group">
            <label class="form-label">Seleccionar Perro:</label>
            <select id="gestion-perro-select" class="form-select">
                <option value="">-- Seleccionar --</option>
            </select>
        </div>
        <p class="text-muted">Al seleccionar un perro se abrirá el formulario de edición completo.</p>
    `;
    llenarSelectPerros();
    document.getElementById('gestion-perro-select')?.addEventListener('change', () => {
        const id = document.getElementById('gestion-perro-select').value;
        if (id) editarExpedienteCompleto(id);
    });
}

function cargarFormularioCliente() {
    const clienteId = document.getElementById('gestion-cliente-select')?.value;
    if (!clienteId) return;

    const cliente = propietarios.find(p => p.id === clienteId);
    if (!cliente) return;

    const formContainer = document.getElementById('gestion-cliente-form');
    formContainer.innerHTML = `
        <form id="form-editar-cliente" class="mt-2">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Nombre</label>
                    <input type="text" id="edit-cliente-nombre" class="form-input" value="${cliente.nombre || ''}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Teléfono</label>
                    <input type="tel" id="edit-cliente-telefono" class="form-input" value="${cliente.telefono || ''}">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Dirección</label>
                <input type="text" id="edit-cliente-direccion" class="form-input" value="${cliente.direccion || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" id="edit-cliente-email" class="form-input" value="${cliente.email || ''}">
            </div>
            <button type="submit" class="btn btn-primary">Guardar</button>
        </form>
    `;
    formContainer.classList.remove('hidden');

    document.getElementById('form-editar-cliente').addEventListener('submit', (e) => guardarEdicionCliente(e, clienteId));
}

async function guardarEdicionCliente(e, clienteId) {
    e.preventDefault();

    const data = {
        nombre: document.getElementById('edit-cliente-nombre').value,
        telefono: document.getElementById('edit-cliente-telefono').value || null,
        direccion: document.getElementById('edit-cliente-direccion').value || null,
        email: document.getElementById('edit-cliente-email').value || null
    };

    try {
        showLoading();
        await apiPut(`/propietarios/${clienteId}`, data);

        const index = propietarios.findIndex(p => p.id === clienteId);
        if (index >= 0) {
            propietarios[index] = { ...propietarios[index], ...data };
        }

        llenarSelectPropietarios();
        hideLoading();
        showToast('Cliente actualizado', 'success');
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
            <td>$${(s.precio || 0).toFixed(2)}</td>
            <td>${s.tipo_cobro === 'unico' ? 'Único' : 'Por día'}</td>
            <td><button onclick="eliminarServicioCatalogo('${s.id}')" class="btn btn-danger btn-sm">🗑️</button></td>
        </tr>
    `).join('');
}

async function handleNuevoServicio() {
    const nombre = document.getElementById('nuevo-servicio-nombre')?.value;
    const precio = document.getElementById('nuevo-servicio-precio')?.value;
    const tipo = document.getElementById('nuevo-servicio-tipo')?.value;

    if (!nombre || !precio) {
        showToast('Completa nombre y precio', 'error');
        return;
    }

    try {
        showLoading();
        const nuevo = await apiPost('/catalogo-servicios', {
            nombre: nombre,
            precio: parseFloat(precio),
            tipo_cobro: tipo || 'por_dia'
        });

        catalogoServicios.push(nuevo);
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

async function eliminarServicioCatalogo(servicioId) {
    if (!confirm('¿Eliminar este servicio?')) return;

    try {
        await apiDelete(`/catalogo-servicios/${servicioId}`);
        catalogoServicios = catalogoServicios.filter(s => s.id !== servicioId);
        llenarSelectServicios();
        showToast('Servicio eliminado', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
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
            <td>$${(p.precio || 0).toFixed(2)}</td>
            <td><button onclick="eliminarTipoPaseo('${p.id}')" class="btn btn-danger btn-sm">🗑️</button></td>
        </tr>
    `).join('');
}

async function handleNuevoTipoPaseo() {
    const nombre = document.getElementById('nuevo-paseo-nombre')?.value;
    const duracion = document.getElementById('nuevo-paseo-duracion')?.value;
    const precio = document.getElementById('nuevo-paseo-precio')?.value;

    if (!nombre || !precio) {
        showToast('Completa nombre y precio', 'error');
        return;
    }

    try {
        showLoading();
        const nuevo = await apiPost('/catalogo-paseos', {
            nombre: nombre,
            duracion_minutos: parseInt(duracion) || null,
            precio: parseFloat(precio)
        });

        catalogoPaseos.push(nuevo);
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

async function eliminarTipoPaseo(paseoId) {
    if (!confirm('¿Eliminar este tipo de paseo?')) return;

    try {
        await apiDelete(`/catalogo-paseos/${paseoId}`);
        catalogoPaseos = catalogoPaseos.filter(p => p.id !== paseoId);
        llenarSelectPaseos();
        showToast('Tipo de paseo eliminado', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================
// UTILIDADES
// ============================================
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// ============================================
// VERIFICACIÓN FINAL
// ============================================
console.log('✅ ComfortCan México - App.js v3 CORREGIDO cargado');
console.log('📋 Módulos: Auth, Propietarios, Perros, Check-in, Paseos, Caja, Expedientes, Configuración');
