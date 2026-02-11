// ============================================
// COMFORTCAN MÉXICO - APP.JS v5 - FOTOS FIX
// ============================================

const API_URL = 'https://comfortcan-api.onrender.com';

// Debug: Función para verificar estado del storage
window.verificarStorage = async function() {
    console.log(' Verificando estado del storage...');
    try {
        const response = await fetch(`${API_URL}/storage/check`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        console.log(' Estado del storage:', data);
        return data;
    } catch (err) {
        console.error(' Error verificando storage:', err);
    }
};

// Debug: Función para probar subida directa a Supabase
window.testUploadDirecto = async function() {
    console.log(' Para probar, necesitas verificar las políticas en Supabase:');
    console.log('1. Ve a Supabase Dashboard > Storage > fotos');
    console.log('2. Ve a Policies');
    console.log('3. Verifica que existan estas políticas:');
    console.log('   - SELECT (public) - Para leer fotos públicamente');
    console.log('   - INSERT (authenticated) - Para subir fotos');
    console.log('   - DELETE (authenticated) - Para eliminar fotos');
};

// Estado global
let authToken = localStorage.getItem('authToken');
let propietarios = [];
let perros = [];
let catalogoServicios = [];
let catalogoPaseos = [];
let catalogoHabitaciones = [];
let catalogoColores = [];
let estancias = [];
let cargosActuales = [];
let serviciosSeleccionados = [];
let calendarioSemanaInicio = null;
let calendarioTouchStartX = 0;

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

    // Navegacion
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            navigateToSection(section);
            // Cerrar sidebar en mobile
            document.getElementById('sidebar').classList.remove('open');
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
    document.getElementById('btn-guardar-habitacion')?.addEventListener('click', handleNuevaHabitacion);
    document.getElementById('btn-guardar-color')?.addEventListener('click', handleNuevoColor);
    document.getElementById('btn-agregar-servicio')?.addEventListener('click', agregarServicioCheckIn);
    document.getElementById('btn-semana-anterior')?.addEventListener('click', () => cambiarSemanaCalendario(-1));
    document.getElementById('btn-semana-siguiente')?.addEventListener('click', () => cambiarSemanaCalendario(1));

    // Botón "Hoy" en calendario
    document.getElementById('btn-calendario-hoy')?.addEventListener('click', () => {
        scrollCalendarioAHoy();
    });

    // Selects dinámicos
    document.getElementById('caja-perro')?.addEventListener('change', cargarCargosPerro);
    document.getElementById('expediente-perro')?.addEventListener('change', cargarExpediente);
    document.getElementById('paseo-tipo')?.addEventListener('change', mostrarPrecioPaseo);
    document.getElementById('checkin-entrada')?.addEventListener('change', calcularTotalCheckIn);
    document.getElementById('checkin-salida')?.addEventListener('change', calcularTotalCheckIn);

    // Filtros
    document.getElementById('filtro-expediente')?.addEventListener('input', filtrarExpedientes);
    document.getElementById('filtro-paseo-perro')?.addEventListener('change', filtrarPaseos);
    document.getElementById('filtro-paseo-estado')?.addEventListener('change', filtrarPaseos);
    document.getElementById('filtro-paseo-desde')?.addEventListener('change', filtrarPaseos);
    document.getElementById('filtro-paseo-hasta')?.addEventListener('change', filtrarPaseos);

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

async function apiPatch(endpoint, data) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PATCH',
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

        const [props, dogs, servicios, paseos, habitaciones, colores, estanciasData] = await Promise.all([
            apiGet('/propietarios'),
            apiGet('/perros'),
            apiGet('/catalogo-servicios'),
            apiGet('/catalogo-paseos'),
            apiGet('/catalogo-habitaciones'),
            apiGet('/catalogo-colores').catch(() => []),
            apiGet('/estancias')
        ]);

        propietarios = props || [];
        perros = dogs || [];
        catalogoServicios = servicios || [];
        catalogoPaseos = paseos || [];
        catalogoHabitaciones = habitaciones || [];
        catalogoColores = colores || [];
        estancias = estanciasData || [];

        llenarSelectPropietarios();
        llenarSelectPerros();
        llenarSelectServicios();
        llenarSelectPaseos();
        llenarSelectHabitaciones();
        renderTablaHabitaciones();
        renderTablaColores();
        renderColoresCheckIn();

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
            // Solo Guardería, Hospedaje y Escuela son por día
            const nombreLower = s.nombre.toLowerCase();
            const esPorDia = nombreLower.includes('guardería') || nombreLower.includes('guarderia') ||
                            nombreLower.includes('hospedaje') || nombreLower.includes('escuela') ||
                            nombreLower.includes('daycare');
            const tipoCobro = esPorDia ? 'por_dia' : 'unico';
            const tipoTexto = esPorDia ? 'por día' : 'único';
            select.innerHTML += `<option value="${s.id}" data-precio="${s.precio}" data-tipo="${tipoCobro}" data-nombre="${s.nombre}">${s.nombre} - $${s.precio} (${tipoTexto})</option>`;
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
    if (sectionId === 'calendario') {
        renderCalendarioOcupacion();
        setTimeout(() => scrollCalendarioAHoy(true), 100);
    }
    if (sectionId === 'configuracion') {
        renderTablaServicios();
        renderTablaPaseos();
        renderTablaHabitaciones();
        renderTablaColores();
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

        let fotosSubidas = false;
        if (fotoPerroInput?.files[0]) {
            const url = await subirFoto(nuevo.id, fotoPerroInput.files[0], 'foto-perro');
            if (url) {
                nuevo.foto_perro_url = url;
                fotosSubidas = true;
            }
        }
        if (fotoCartillaInput?.files[0]) {
            const url = await subirFoto(nuevo.id, fotoCartillaInput.files[0], 'foto-cartilla');
            if (url) {
                nuevo.foto_cartilla_url = url;
                fotosSubidas = true;
            }
        }

        // Recargar perros para tener las URLs actualizadas
        if (fotosSubidas) {
            const perrosActualizados = await apiGet('/perros');
            perros = perrosActualizados || [];
        } else {
            perros.push(nuevo);
        }

        llenarSelectPerros();
        e.target.reset();
        document.getElementById('foto-perro-preview')?.classList.add('hidden');
        document.getElementById('foto-cartilla-preview')?.classList.add('hidden');
        document.getElementById('desparasitacion-interna')?.classList.add('hidden');
        document.getElementById('desparasitacion-externa')?.classList.add('hidden');
        hideLoading();
        showToast('Perro registrado exitosamente' + (fotosSubidas ? ' con fotos' : ''), 'success');
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

async function subirFoto(perroId, file, tipo) {
    const formData = new FormData();
    formData.append('file', file);

    const endpoint = tipo === 'foto-perro' ? 'foto-perro' : 'foto-cartilla';

    console.log(` Subiendo ${tipo} para perro ${perroId}...`);
    console.log(`   Archivo: ${file.name} (${file.size} bytes, ${file.type})`);

    try {
        const response = await fetch(`${API_URL}/upload/${endpoint}/${perroId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });

        console.log(`   Respuesta: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            let errorDetail = 'Error desconocido';
            try {
                const errorData = await response.json();
                errorDetail = errorData.detail || JSON.stringify(errorData);
                console.error(' Error del servidor:', errorData);
            } catch (e) {
                const errorText = await response.text();
                errorDetail = errorText || `HTTP ${response.status}`;
                console.error(' Error (texto):', errorText);
            }

            // Detectar errores comunes de Supabase Storage
            if (errorDetail.includes('policy') || errorDetail.includes('Policies') || response.status === 400) {
                showToast(`Error: Falta política INSERT en Storage. Ve a Supabase > Storage > fotos > Policies y agrega una política INSERT.`, 'error');
                console.error(' SOLUCIÓN: Agregar política INSERT en Supabase Storage');
                console.error('   1. Ve a Supabase Dashboard > Storage > fotos');
                console.error('   2. Click en "Policies"');
                console.error('   3. Agregar política INSERT para "authenticated" o "public"');
            } else {
                showToast(`Error subiendo ${tipo}: ${errorDetail}`, 'error');
            }
            return null;
        }

        const data = await response.json();
        console.log(` Foto subida exitosamente: ${data.url}`);
        return data.url;
    } catch (err) {
        console.error(' Error de conexión:', err);
        showToast(`Error de conexión al subir ${tipo}`, 'error');
        return null;
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

    container.innerHTML = serviciosSeleccionados.map(s => {
        const tipoTexto = s.tipo_cobro === 'unico' ? 'único' : 'por día';
        return `
            <span class="servicio-tag">
                ${s.nombre} - $${s.precio} (${tipoTexto})
                <button type="button" onclick="quitarServicio('${s.id}')" class="btn-quitar">&times;</button>
            </span>
        `;
    }).join('');
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

    const entrada = parseDateLocal(fechaEntrada);
    const salida = parseDateLocal(fechaSalida);
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
    const entrada = parseDateLocal(fechaEntrada);
    const salida = parseDateLocal(fechaSalida);
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

        // Agregar la nueva estancia a la lista local
        estancias.push(estancia);

        // Actualizar el calendario si está visible
        renderCalendarioOcupacion();

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
        renderTablaPaseosHistorial(paseos);
    } catch (error) {
        console.error('Error cargando paseos:', error);
    }
}

function renderTablaPaseosHistorial(paseos) {
    const tbody = document.getElementById('tabla-paseos');
    if (!tbody) return;

    if (!paseos || paseos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Sin paseos</td></tr>';
        document.getElementById('paseos-pendiente-total').textContent = '$0.00';
        document.getElementById('paseos-pagado-total').textContent = '$0.00';
        return;
    }

    let totalPendiente = 0;
    let totalPagado = 0;

    tbody.innerHTML = paseos.map(p => {
        const perroNombre = p.perros?.nombre || 'N/A';
        if (p.pagado) {
            totalPagado += p.precio || 0;
        } else {
            totalPendiente += p.precio || 0;
        }
        return `
            <tr class="${p.pagado ? 'paseo-pagado' : 'paseo-pendiente'}">
                <td>${formatDate(p.fecha)}</td>
                <td>${perroNombre}</td>
                <td>${p.tipo_paseo || 'N/A'}</td>
                <td>$${(p.precio || 0).toFixed(2)}</td>
                <td>
                    <span class="badge ${p.pagado ? 'badge-success' : 'badge-warning'}">
                        ${p.pagado ? 'Pagado' : 'Pendiente'}
                    </span>
                </td>
                <td>
                    ${!p.pagado ? `
                        <div class="btn-group">
                            <button onclick="enviarPaseoACaja('${p.id}', '${p.perro_id}', '${p.fecha}', '${p.tipo_paseo}', ${p.precio})" class="btn btn-info btn-sm" title="Enviar a Caja para cobrar en ticket">
                                Caja
                            </button>
                            <button onclick="marcarPaseoPagado('${p.id}')" class="btn btn-success btn-sm" title="Marcar como pagado directamente (sin ticket)">
                                Pagado
                            </button>
                        </div>
                    ` : '<span class="text-muted">Ya pagado</span>'}
                </td>
            </tr>
        `;
    }).join('');

    document.getElementById('paseos-pendiente-total').textContent = `$${totalPendiente.toFixed(2)}`;
    document.getElementById('paseos-pagado-total').textContent = `$${totalPagado.toFixed(2)}`;
}

// Marcar paseo como pagado directamente
async function marcarPaseoPagado(paseoId) {
    if (!confirm('¿Marcar este paseo como pagado?')) return;

    try {
        showLoading();
        await apiPut(`/paseos/${paseoId}/pagar`, {});
        await cargarPaseos();
        hideLoading();
        showToast('Paseo marcado como pagado', 'success');
    } catch (error) {
        hideLoading();
        showToast('Error: ' + error.message, 'error');
    }
}

// Enviar paseo a caja (crear cargo)
async function enviarPaseoACaja(paseoId, perroId, fecha, tipoPaseo, precio) {
    try {
        showLoading();

        // Crear cargo en caja
        await apiPost('/cargos', {
            perro_id: perroId,
            fecha_cargo: new Date().toISOString().split('T')[0],
            fecha_servicio: fecha,
            concepto: `Paseo: ${tipoPaseo}`,
            monto: precio
        });

        // Marcar paseo como pagado (ya que se envió a caja)
        await apiPut(`/paseos/${paseoId}/pagar`, {});

        await cargarPaseos();
        hideLoading();
        showToast('Paseo enviado a caja correctamente', 'success');
    } catch (error) {
        hideLoading();
        showToast('Error: ' + error.message, 'error');
    }
}

async function filtrarPaseos() {
    const perroId = document.getElementById('filtro-paseo-perro')?.value;
    const estado = document.getElementById('filtro-paseo-estado')?.value;
    const desde = document.getElementById('filtro-paseo-desde')?.value;
    const hasta = document.getElementById('filtro-paseo-hasta')?.value;

    try {
        let endpoint = '/paseos?';
        const params = [];

        if (perroId) params.push(`perro_id=${perroId}`);
        if (desde) params.push(`fecha_inicio=${desde}`);
        if (hasta) params.push(`fecha_fin=${hasta}`);

        // Filtro de estado (pagado/pendiente)
        if (estado === 'pagado') params.push(`pagado=true`);
        if (estado === 'pendiente') params.push(`pagado=false`);

        endpoint += params.join('&');

        const paseos = await apiGet(endpoint);

        if (!paseos || paseos.length === 0) {
            const tbody = document.getElementById('tabla-paseos');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Sin paseos con esos filtros</td></tr>';
            }
            document.getElementById('paseos-pendiente-total').textContent = '$0.00';
            document.getElementById('paseos-pagado-total').textContent = '$0.00';
            return;
        }

        renderTablaPaseosHistorial(paseos);

    } catch (error) {
        console.error('Error filtrando paseos:', error);
    }
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
                    <td><button onclick="eliminarCargo('${c.id}')" class="btn btn-danger btn-sm">X</button></td>
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
            <div class="ticket-header">
                <img src="assets/logo.png" alt="ComfortCan" class="ticket-logo">
                <div class="ticket-title">ComfortCan México</div>
                <div class="ticket-subtitle">Train & Care</div>
            </div>
            <div class="ticket-body">
                <div class="ticket-row">
                    <span>Fecha:</span>
                    <span>${formatDate(new Date())}</span>
                </div>
                <div class="ticket-row">
                    <span>Cliente:</span>
                    <span>${propietario?.nombre || 'N/A'}</span>
                </div>
                <div class="ticket-row">
                    <span>Mascota:</span>
                    <span>${perro?.nombre || 'N/A'}</span>
                </div>
                <div class="ticket-divider"></div>
                ${cargosActuales.map(c => `
                    <div class="ticket-row">
                        <span>${c.concepto}<br><small style="color:#666">${formatDate(c.fecha_servicio || c.fecha_cargo)}</small></span>
                        <span>$${(c.monto || 0).toFixed(2)}</span>
                    </div>
                `).join('')}
                <div class="ticket-divider"></div>
                <div class="ticket-row ticket-total">
                    <span>TOTAL:</span>
                    <span>$${subtotal.toFixed(2)}</span>
                </div>
            </div>
            <div class="ticket-footer">
                ¡Gracias por confiar en nosotros!<br>
                Tel: (555) 123-4567
            </div>
        </div>
    `;

    document.getElementById('ticket-content').innerHTML = ticketHTML;
    document.getElementById('ticket-container').style.display = 'block';
}

function cerrarTicket() {
    document.getElementById('ticket-container').style.display = 'none';
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

// Ver detalle de ticket desde historial
async function verDetalleTicket(ticketId) {
    try {
        showLoading();
        const ticket = await apiGet(`/tickets/${ticketId}`);
        hideLoading();

        if (!ticket) {
            showToast('Ticket no encontrado', 'error');
            return;
        }

        const perro = ticket.perros || {};
        const propietario = ticket.propietarios || {};

        // Obtener los cargos asociados a este ticket
        let cargosTicket = [];
        try {
            const todosCargos = await apiGet(`/cargos?perro_id=${ticket.perro_id}`);
            cargosTicket = todosCargos.filter(c => c.ticket_id === ticketId);
        } catch (e) {
            console.log('No se pudieron cargar los cargos del ticket');
        }

        const modalHTML = `
            <div class="modal-overlay active" id="modal-ticket-detalle">
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title">Detalle del Ticket</h3>
                        <button class="modal-close" onclick="cerrarModalTicketDetalle()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="ticket" id="ticket-detalle-para-descargar">
                            <div class="ticket-header">
                                <img src="assets/logo.png" alt="ComfortCan" class="ticket-logo">
                                <div class="ticket-title">ComfortCan Mexico</div>
                                <div class="ticket-subtitle">Train & Care</div>
                            </div>
                            <div class="ticket-body">
                                <div class="ticket-row">
                                    <span>Fecha:</span>
                                    <span>${formatDate(ticket.fecha)}</span>
                                </div>
                                <div class="ticket-row">
                                    <span>Cliente:</span>
                                    <span>${propietario.nombre || 'N/A'}</span>
                                </div>
                                <div class="ticket-row">
                                    <span>Mascota:</span>
                                    <span>${perro.nombre || 'N/A'}</span>
                                </div>
                                <div class="ticket-divider"></div>
                                ${cargosTicket.length > 0 ? cargosTicket.map(c => `
                                    <div class="ticket-row">
                                        <span>${c.concepto}<br><small style="color:#666">${formatDate(c.fecha_servicio || c.fecha_cargo)}</small></span>
                                        <span>$${(c.monto || 0).toFixed(2)}</span>
                                    </div>
                                `).join('') : `
                                    <div class="ticket-row">
                                        <span>Servicios</span>
                                        <span>$${(ticket.subtotal || 0).toFixed(2)}</span>
                                    </div>
                                `}
                                <div class="ticket-divider"></div>
                                <div class="ticket-row ticket-total">
                                    <span>TOTAL:</span>
                                    <span>$${(ticket.total || 0).toFixed(2)}</span>
                                </div>
                                <div class="ticket-row">
                                    <span>Metodo de pago:</span>
                                    <span>${ticket.metodo_pago || 'Efectivo'}</span>
                                </div>
                            </div>
                            <div class="ticket-footer">
                                Gracias por confiar en nosotros!<br>
                                Tel: (555) 123-4567
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button onclick="cerrarModalTicketDetalle()" class="btn btn-secondary">Cerrar</button>
                        <button onclick="imprimirTicketDetalle()" class="btn btn-primary">Imprimir</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    } catch (error) {
        hideLoading();
        showToast('Error cargando ticket', 'error');
    }
}

function cerrarModalTicketDetalle() {
    const modal = document.getElementById('modal-ticket-detalle');
    if (modal) modal.remove();
}

function imprimirTicketDetalle() {
    const ticketContent = document.getElementById('ticket-detalle-para-descargar');
    if (!ticketContent) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Ticket ComfortCan</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .ticket { max-width: 300px; margin: 0 auto; }
                .ticket-header { text-align: center; margin-bottom: 15px; }
                .ticket-logo { max-width: 80px; }
                .ticket-title { font-size: 18px; font-weight: bold; }
                .ticket-subtitle { font-size: 12px; color: #666; }
                .ticket-body { border-top: 1px dashed #ccc; border-bottom: 1px dashed #ccc; padding: 10px 0; }
                .ticket-row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 14px; }
                .ticket-row small { font-size: 11px; }
                .ticket-divider { border-top: 1px dashed #ccc; margin: 10px 0; }
                .ticket-total { font-weight: bold; font-size: 16px; }
                .ticket-footer { text-align: center; margin-top: 15px; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            ${ticketContent.innerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
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
                // Debug: mostrar si tiene foto
                console.log(`Perro ${p.nombre} - foto_perro_url:`, p.foto_perro_url);
                return `
                    <div class="expediente-card" onclick="cargarExpedienteDirecto('${p.id}')">
                        <div class="expediente-foto">
                            ${p.foto_perro_url ?
                                `<img src="${p.foto_perro_url}" alt="${p.nombre}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                 <div class="sin-foto" style="display:none;">${p.nombre.charAt(0)}</div>` :
                                `<div class="sin-foto">${p.nombre.charAt(0)}</div>`
                            }
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

        // Debug: mostrar URLs de fotos
        console.log(' Debug fotos de', perro.nombre);
        console.log('  foto_perro_url:', perro.foto_perro_url || 'NO TIENE');
        console.log('  foto_cartilla_url:', perro.foto_cartilla_url || 'NO TIENE');

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
                <!-- SECCIÓN DE FOTOS -->
                <div class="fotos-expediente mb-3">
                    <div class="flex gap-3" style="flex-wrap: wrap;">
                        <div class="foto-box">
                            <p class="text-muted mb-1"><strong>Foto del Perro</strong></p>
                            ${perro.foto_perro_url ?
                                `<img src="${perro.foto_perro_url}" alt="${perro.nombre}" class="foto-expediente-img" onclick="window.open('${perro.foto_perro_url}', '_blank')">` :
                                `<div class="sin-foto-grande">${perro.nombre.charAt(0).toUpperCase()}</div>`
                            }
                        </div>
                        <div class="foto-box">
                            <p class="text-muted mb-1"><strong>Cartilla de Vacunacion</strong></p>
                            ${perro.foto_cartilla_url ?
                                `<img src="${perro.foto_cartilla_url}" alt="Cartilla" class="foto-expediente-img" onclick="window.open('${perro.foto_cartilla_url}', '_blank')">` :
                                `<div class="sin-foto-grande" style="font-size: 1rem;">Sin cartilla</div>`
                            }
                        </div>
                    </div>
                </div>

                <hr>

                <!-- DATOS DEL PERRO -->
                <div class="datos-expediente">
                    <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">${perro.nombre}</h2>
                    <div class="form-row">
                        <div>
                            <p><strong>Raza:</strong> ${perro.raza || 'N/A'}</p>
                            <p><strong>Edad:</strong> ${perro.edad || 'N/A'}</p>
                            <p><strong>Género:</strong> ${perro.genero || 'N/A'}</p>
                            <p><strong>Peso:</strong> ${perro.peso_kg ? perro.peso_kg + ' kg' : 'N/A'}</p>
                            <p><strong>Esterilizado:</strong> ${perro.esterilizado ? 'Sí' : 'No'}</p>
                        </div>
                        <div>
                            <h4>Propietario</h4>
                            <p><strong>Nombre:</strong> ${propietario?.nombre || 'N/A'}</p>
                            <p><strong>Teléfono:</strong> ${propietario?.telefono || 'N/A'}</p>
                            <p><strong>Email:</strong> ${propietario?.email || 'N/A'}</p>
                            <p><strong>Dirección:</strong> ${propietario?.direccion || 'N/A'}</p>
                        </div>
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
                            <div class="ticket-mini" onclick="verDetalleTicket('${t.id}')" style="cursor:pointer;">
                                <div class="ticket-mini-header">
                                    <span>Ticket</span>
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

                <div class="flex gap-2 mt-3">
                    <button onclick="editarExpedienteCompleto('${perroId}')" class="btn btn-secondary">Editar Expediente</button>
                    <button onclick="subirFotosExpediente('${perroId}')" class="btn btn-primary">Subir Fotos</button>
                </div>
            </div>
        `;

        contenido.classList.remove('hidden');
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('Error cargando expediente', 'error');
    }
}

// Función para subir fotos desde el expediente
function subirFotosExpediente(perroId) {
    const perro = perros.find(p => p.id === perroId);

    // Crear modal para subir fotos
    const modalHTML = `
        <div class="modal-overlay active" id="modal-fotos">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Subir Fotos - ${perro?.nombre || 'Perro'}</h3>
                    <button class="modal-close" onclick="cerrarModalFotos()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Foto del Perro</label>
                        <input type="file" id="upload-foto-perro" accept="image/*" class="form-input">
                        <small class="text-muted">JPG, PNG - Máximo 5MB</small>
                    </div>
                    <div class="form-group mt-2">
                        <label class="form-label">Cartilla de Vacunación</label>
                        <input type="file" id="upload-foto-cartilla" accept="image/*" class="form-input">
                        <small class="text-muted">JPG, PNG - Máximo 5MB</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="cerrarModalFotos()" class="btn btn-secondary">Cancelar</button>
                    <button onclick="ejecutarSubidaFotos('${perroId}')" class="btn btn-primary">Subir Fotos</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function cerrarModalFotos() {
    const modal = document.getElementById('modal-fotos');
    if (modal) modal.remove();
}

async function ejecutarSubidaFotos(perroId) {
    const fotoPerroInput = document.getElementById('upload-foto-perro');
    const fotoCartillaInput = document.getElementById('upload-foto-cartilla');

    if (!fotoPerroInput?.files[0] && !fotoCartillaInput?.files[0]) {
        showToast('Selecciona al menos una foto', 'error');
        return;
    }

    showLoading();
    let subidas = 0;
    let errores = [];

    try {
        if (fotoPerroInput?.files[0]) {
            console.log('Intentando subir foto del perro...');
            const url = await subirFoto(perroId, fotoPerroInput.files[0], 'foto-perro');
            if (url) {
                console.log('Foto de perro subida:', url);
                subidas++;
            } else {
                errores.push('foto del perro');
            }
        }

        if (fotoCartillaInput?.files[0]) {
            console.log('Intentando subir cartilla...');
            const url = await subirFoto(perroId, fotoCartillaInput.files[0], 'foto-cartilla');
            if (url) {
                console.log('Foto de cartilla subida:', url);
                subidas++;
            } else {
                errores.push('cartilla');
            }
        }

        // Recargar perros para actualizar URLs
        const perrosActualizados = await apiGet('/perros');
        perros = perrosActualizados || [];

        cerrarModalFotos();
        hideLoading();

        if (subidas > 0) {
            showToast(`${subidas} foto(s) subida(s) correctamente`, 'success');
            // Recargar expediente
            await cargarExpedienteDirecto(perroId);
        } else if (errores.length > 0) {
            showToast(`Error subiendo: ${errores.join(', ')}. Revisa la consola (F12) para mas detalles.`, 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Error en ejecutarSubidaFotos:', error);
        showToast('Error: ' + error.message, 'error');
    }
}

async function editarExpedienteCompleto(perroId) {
    // Navegar a gestion y cargar el perro
    navigateToSection('gestion');
    const selectPerro = document.getElementById('gestion-perro-select');
    if (selectPerro) {
        selectPerro.value = perroId;
    }

    try {
        showLoading();
        const perro = await apiGet(`/perros/${perroId}`);
        const propietario = perro.propietarios || propietarios.find(p => p.id === perro.propietario_id);

        const formContainer = document.getElementById('gestion-perros');
        formContainer.innerHTML = `
            <div class="card">
                <h3> Editando: ${perro.nombre}</h3>

                <!-- FOTOS -->
                <div class="form-row mt-3">
                    <div class="form-group">
                        <label class="form-label">Foto del Perro</label>
                        <div class="foto-edit-container">
                            ${perro.foto_perro_url ? `<img src="${perro.foto_perro_url}" alt="${perro.nombre}" class="foto-preview-edit">` : '<div class="sin-foto-edit">Sin foto</div>'}
                            <input type="file" id="edit-foto-perro" accept="image/*" class="form-input mt-1">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Cartilla de Vacunación</label>
                        <div class="foto-edit-container">
                            ${perro.foto_cartilla_url ? `<img src="${perro.foto_cartilla_url}" alt="Cartilla" class="foto-preview-edit">` : '<div class="sin-foto-edit">Sin cartilla</div>'}
                            <input type="file" id="edit-foto-cartilla" accept="image/*" class="form-input mt-1">
                        </div>
                    </div>
                </div>

                <form id="form-editar-perro">
                    <h4 class="mt-3">Datos Básicos</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Nombre *</label>
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
                            <select id="edit-edad" class="form-select">
                                <option value="">Seleccionar</option>
                                <option value="Cachorro (< 1 año)" ${perro.edad === 'Cachorro (< 1 año)' ? 'selected' : ''}>Cachorro (< 1 año)</option>
                                ${[...Array(15).keys()].map(i => `<option value="${i+1} año${i > 0 ? 's' : ''}" ${perro.edad === `${i+1} año${i > 0 ? 's' : ''}` ? 'selected' : ''}>${i+1} año${i > 0 ? 's' : ''}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Género</label>
                            <select id="edit-genero" class="form-select">
                                <option value="">Seleccionar</option>
                                <option value="Macho" ${perro.genero === 'Macho' ? 'selected' : ''}>Macho</option>
                                <option value="Hembra" ${perro.genero === 'Hembra' ? 'selected' : ''}>Hembra</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Peso (kg)</label>
                            <input type="number" step="0.1" id="edit-peso" class="form-input" value="${perro.peso_kg || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Fecha Pesaje</label>
                            <input type="date" id="edit-fecha-pesaje" class="form-input" value="${perro.fecha_pesaje || ''}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-checkbox">
                            <input type="checkbox" id="edit-esterilizado" ${perro.esterilizado ? 'checked' : ''}>
                            Esterilizado
                        </label>
                    </div>

                    <h4 class="mt-3">Información Médica</h4>
                    <div class="form-group">
                        <label class="form-label">Medicamentos Actuales</label>
                        <input type="text" id="edit-medicamentos" class="form-input" value="${perro.medicamentos || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Alergias / Condiciones</label>
                        <input type="text" id="edit-alergias" class="form-input" value="${perro.alergias || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Veterinario / Clínica</label>
                        <input type="text" id="edit-veterinario" class="form-input" value="${perro.veterinario || ''}">
                    </div>

                    <h4 class="mt-3">Desparasitación</h4>
                    <div class="form-group">
                        <label class="form-label">Tipo</label>
                        <select id="edit-despara-tipo" class="form-select">
                            <option value="">Ninguna</option>
                            <option value="Interna" ${perro.desparasitacion_tipo === 'Interna' ? 'selected' : ''}>Interna</option>
                            <option value="Externa" ${perro.desparasitacion_tipo === 'Externa' ? 'selected' : ''}>Externa</option>
                            <option value="Dual" ${perro.desparasitacion_tipo === 'Dual' ? 'selected' : ''}>Dual (Interna + Externa)</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Producto Interna</label>
                            <input type="text" id="edit-despara-producto-int" class="form-input" value="${perro.desparasitacion_producto_int || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Fecha Interna</label>
                            <input type="date" id="edit-despara-fecha-int" class="form-input" value="${perro.desparasitacion_fecha_int || ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Producto Externa</label>
                            <input type="text" id="edit-despara-producto-ext" class="form-input" value="${perro.desparasitacion_producto_ext || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Fecha Externa</label>
                            <input type="date" id="edit-despara-fecha-ext" class="form-input" value="${perro.desparasitacion_fecha_ext || ''}">
                        </div>
                    </div>

                    <h4 class="mt-3">Vacunas</h4>
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
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Vacuna Extra - Nombre</label>
                            <input type="text" id="edit-extra-nombre" class="form-input" value="${perro.vacuna_extra_nombre || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Vacuna Extra - Estado</label>
                            <select id="edit-extra-estado" class="form-select">
                                <option value="">--</option>
                                <option value="Vigente" ${perro.vacuna_extra_estado === 'Vigente' ? 'selected' : ''}>Vigente</option>
                                <option value="Vencida" ${perro.vacuna_extra_estado === 'Vencida' ? 'selected' : ''}>Vencida</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Vacuna Extra - Vence</label>
                            <input type="date" id="edit-extra-vence" class="form-input" value="${perro.vacuna_extra_vence || ''}">
                        </div>
                    </div>

                    <div class="flex gap-2 mt-3">
                        <button type="submit" class="btn btn-primary btn-lg">Guardar Todos los Cambios</button>
                        <button type="button" onclick="cancelarEdicion()" class="btn btn-secondary">Cancelar</button>
                        <button type="button" onclick="eliminarPerroPermanente('${perroId}')" class="btn btn-danger">Eliminar Perro</button>
                    </div>
                </form>
            </div>
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
    showLoading();

    // Subir fotos si se seleccionaron nuevas
    const fotoPerroInput = document.getElementById('edit-foto-perro');
    const fotoCartillaInput = document.getElementById('edit-foto-cartilla');

    if (fotoPerroInput?.files[0]) {
        await subirFoto(perroId, fotoPerroInput.files[0], 'foto-perro');
    }
    if (fotoCartillaInput?.files[0]) {
        await subirFoto(perroId, fotoCartillaInput.files[0], 'foto-cartilla');
    }

    // Obtener el perro actual para tener el propietario_id
    const perroActual = perros.find(p => p.id === perroId);

    const data = {
        propietario_id: perroActual?.propietario_id,
        nombre: document.getElementById('edit-nombre').value,
        raza: document.getElementById('edit-raza').value || null,
        edad: document.getElementById('edit-edad').value || null,
        genero: document.getElementById('edit-genero').value || null,
        peso_kg: parseFloat(document.getElementById('edit-peso').value) || null,
        fecha_pesaje: document.getElementById('edit-fecha-pesaje').value || null,
        esterilizado: document.getElementById('edit-esterilizado').checked,
        medicamentos: document.getElementById('edit-medicamentos').value || null,
        alergias: document.getElementById('edit-alergias').value || null,
        veterinario: document.getElementById('edit-veterinario').value || null,
        desparasitacion_tipo: document.getElementById('edit-despara-tipo').value || null,
        desparasitacion_producto_int: document.getElementById('edit-despara-producto-int').value || null,
        desparasitacion_fecha_int: document.getElementById('edit-despara-fecha-int').value || null,
        desparasitacion_producto_ext: document.getElementById('edit-despara-producto-ext').value || null,
        desparasitacion_fecha_ext: document.getElementById('edit-despara-fecha-ext').value || null,
        vacuna_rabia_estado: document.getElementById('edit-rabia-estado').value,
        vacuna_rabia_vence: document.getElementById('edit-rabia-vence').value || null,
        vacuna_sextuple_estado: document.getElementById('edit-sextuple-estado').value,
        vacuna_sextuple_vence: document.getElementById('edit-sextuple-vence').value || null,
        vacuna_bordetella_estado: document.getElementById('edit-bordetella-estado').value,
        vacuna_bordetella_vence: document.getElementById('edit-bordetella-vence').value || null,
        vacuna_giardia_estado: document.getElementById('edit-giardia-estado').value,
        vacuna_giardia_vence: document.getElementById('edit-giardia-vence').value || null,
        vacuna_extra_nombre: document.getElementById('edit-extra-nombre').value || null,
        vacuna_extra_estado: document.getElementById('edit-extra-estado').value || null,
        vacuna_extra_vence: document.getElementById('edit-extra-vence').value || null
    };

    try {
        await apiPut(`/perros/${perroId}`, data);

        // Recargar lista de perros
        const perrosActualizados = await apiGet('/perros');
        perros = perrosActualizados || [];
        llenarSelectPerros();

        cancelarEdicion();
        hideLoading();
        showToast('Expediente actualizado correctamente', 'success');
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
            <div class="flex gap-2 mt-2">
                <button type="submit" class="btn btn-primary">Guardar</button>
                <button type="button" onclick="eliminarClientePermanente('${clienteId}')" class="btn btn-danger">Eliminar Cliente</button>
            </div>
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

async function eliminarPerroPermanente(perroId) {
    const perro = perros.find(p => p.id === perroId);
    const nombre = perro?.nombre || 'este perro';
    if (!confirm(`¿Eliminar PERMANENTEMENTE a "${nombre}"? Se borrarán todas sus estancias, cargos y paseos. Esta acción NO se puede deshacer.`)) return;
    if (!confirm(`¿Estás SEGURO? Esto eliminará a "${nombre}" y TODOS sus datos para siempre.`)) return;

    try {
        showLoading();
        await apiDelete(`/perros/${perroId}/permanente`);
        perros = perros.filter(p => p.id !== perroId);
        estancias = estancias.filter(e => e.perro_id !== perroId);
        llenarSelectPerros();
        cancelarEdicion();
        renderCalendarioOcupacion();
        hideLoading();
        showToast(`"${nombre}" eliminado permanentemente`, 'success');
    } catch (error) {
        hideLoading();
        showToast('Error al eliminar: ' + error.message, 'error');
    }
}

async function eliminarClientePermanente(clienteId) {
    const cliente = propietarios.find(p => p.id === clienteId);
    const nombre = cliente?.nombre || 'este cliente';
    if (!confirm(`¿Eliminar PERMANENTEMENTE a "${nombre}" y TODOS sus perros? Se borrarán todas las estancias, cargos y paseos. Esta acción NO se puede deshacer.`)) return;
    if (!confirm(`¿Estás SEGURO? Esto eliminará a "${nombre}", todos sus perros y TODOS sus datos para siempre.`)) return;

    try {
        showLoading();
        // Obtener perros del cliente para limpiar datos locales
        const perrosCliente = perros.filter(p => p.propietario_id === clienteId);
        await apiDelete(`/propietarios/${clienteId}/permanente`);
        propietarios = propietarios.filter(p => p.id !== clienteId);
        perrosCliente.forEach(pc => {
            perros = perros.filter(p => p.id !== pc.id);
            estancias = estancias.filter(e => e.perro_id !== pc.id);
        });
        llenarSelectPropietarios();
        llenarSelectPerros();
        document.getElementById('gestion-cliente-form').innerHTML = '';
        document.getElementById('gestion-cliente-form').classList.add('hidden');
        document.getElementById('gestion-cliente-select').value = '';
        renderCalendarioOcupacion();
        hideLoading();
        showToast(`"${nombre}" y sus perros eliminados permanentemente`, 'success');
    } catch (error) {
        hideLoading();
        showToast('Error al eliminar: ' + error.message, 'error');
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

    tbody.innerHTML = catalogoServicios.map(s => {
        const tipoCobro = s.tipo_cobro || 'unico';
        const tipoTexto = tipoCobro === 'por_dia' ? 'Por día' : 'Único';
        return `
            <tr>
                <td>${s.nombre}</td>
                <td>$${(s.precio || 0).toFixed(2)}</td>
                <td>${tipoTexto}</td>
                <td>
                    <button onclick="editarServicioCatalogo('${s.id}')" class="btn btn-sm" style="background: var(--color-primary); color: #fff; margin-right: 4px;">✎</button>
                    <button onclick="eliminarServicioCatalogo('${s.id}')" class="btn btn-danger btn-sm">X</button>
                </td>
            </tr>
        `;
    }).join('');
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

function editarServicioCatalogo(servicioId) {
    const s = catalogoServicios.find(x => x.id === servicioId);
    if (!s) return;
    const tbody = document.getElementById('tabla-servicios');
    const row = tbody.querySelector(`button[onclick*="${servicioId}"]`).closest('tr');
    const tipoCobro = s.tipo_cobro || 'unico';
    row.innerHTML = `
        <td><input type="text" class="form-input" id="edit-serv-nombre-${servicioId}" value="${s.nombre}" style="min-width:100px"></td>
        <td><input type="number" step="0.01" class="form-input" id="edit-serv-precio-${servicioId}" value="${s.precio || 0}" style="width:80px"></td>
        <td><select class="form-select" id="edit-serv-tipo-${servicioId}">
            <option value="unico" ${tipoCobro === 'unico' ? 'selected' : ''}>Único</option>
            <option value="por_dia" ${tipoCobro === 'por_dia' ? 'selected' : ''}>Por día</option>
        </select></td>
        <td>
            <button onclick="guardarEdicionServicio('${servicioId}')" class="btn btn-sm" style="background: var(--color-success); color: #fff; margin-right: 4px;">✓</button>
            <button onclick="renderTablaServicios()" class="btn btn-sm" style="background: var(--color-border); color: #fff;">✕</button>
        </td>
    `;
}

async function guardarEdicionServicio(servicioId) {
    const nombre = document.getElementById(`edit-serv-nombre-${servicioId}`)?.value;
    const precio = document.getElementById(`edit-serv-precio-${servicioId}`)?.value;
    const tipo = document.getElementById(`edit-serv-tipo-${servicioId}`)?.value;
    if (!nombre || !precio) { showToast('Completa nombre y precio', 'error'); return; }
    try {
        showLoading();
        const actualizado = await apiPut(`/catalogo-servicios/${servicioId}`, {
            nombre, precio: parseFloat(precio), tipo_cobro: tipo || 'unico'
        });
        const idx = catalogoServicios.findIndex(s => s.id === servicioId);
        if (idx !== -1) catalogoServicios[idx] = { ...catalogoServicios[idx], ...actualizado };
        llenarSelectServicios();
        renderTablaServicios();
        hideLoading();
        showToast('Servicio actualizado', 'success');
    } catch (error) {
        hideLoading();
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
            <td>
                <button onclick="editarTipoPaseo('${p.id}')" class="btn btn-sm" style="background: var(--color-primary); color: #fff; margin-right: 4px;">✎</button>
                <button onclick="eliminarTipoPaseo('${p.id}')" class="btn btn-danger btn-sm">X</button>
            </td>
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

function editarTipoPaseo(paseoId) {
    const p = catalogoPaseos.find(x => x.id === paseoId);
    if (!p) return;
    const tbody = document.getElementById('tabla-tipos-paseo');
    const row = tbody.querySelector(`button[onclick*="${paseoId}"]`).closest('tr');
    row.innerHTML = `
        <td><input type="text" class="form-input" id="edit-paseo-nombre-${paseoId}" value="${p.nombre}" style="min-width:100px"></td>
        <td><input type="number" step="0.01" class="form-input" id="edit-paseo-precio-${paseoId}" value="${p.precio || 0}" style="width:80px"></td>
        <td>
            <button onclick="guardarEdicionPaseo('${paseoId}')" class="btn btn-sm" style="background: var(--color-success); color: #fff; margin-right: 4px;">✓</button>
            <button onclick="renderTablaPaseos()" class="btn btn-sm" style="background: var(--color-border); color: #fff;">✕</button>
        </td>
    `;
}

async function guardarEdicionPaseo(paseoId) {
    const nombre = document.getElementById(`edit-paseo-nombre-${paseoId}`)?.value;
    const precio = document.getElementById(`edit-paseo-precio-${paseoId}`)?.value;
    if (!nombre || !precio) { showToast('Completa nombre y precio', 'error'); return; }
    try {
        showLoading();
        const p = catalogoPaseos.find(x => x.id === paseoId);
        const actualizado = await apiPut(`/catalogo-paseos/${paseoId}`, {
            nombre, duracion_minutos: p?.duracion_minutos || null, precio: parseFloat(precio)
        });
        const idx = catalogoPaseos.findIndex(x => x.id === paseoId);
        if (idx !== -1) catalogoPaseos[idx] = { ...catalogoPaseos[idx], ...actualizado };
        llenarSelectPaseos();
        renderTablaPaseos();
        hideLoading();
        showToast('Tipo de paseo actualizado', 'success');
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

// ============================================
// HABITACIONES
// ============================================
function llenarSelectHabitaciones() {
    const select = document.getElementById('checkin-habitacion');
    if (select) {
        select.innerHTML = '<option value="">-- Seleccionar habitacion --</option>';
        catalogoHabitaciones.forEach(h => {
            select.innerHTML += `<option value="${h.nombre}">${h.nombre} (Cap: ${h.capacidad || 1})</option>`;
        });
    }
}

function renderTablaHabitaciones() {
    const tbody = document.getElementById('tabla-habitaciones');
    if (!tbody) return;

    if (catalogoHabitaciones.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Sin habitaciones</td></tr>';
        return;
    }

    tbody.innerHTML = catalogoHabitaciones.map(h => `
        <tr>
            <td>${h.nombre}</td>
            <td>${h.capacidad || 1}</td>
            <td>${h.descripcion || '-'}</td>
            <td>
                <button onclick="editarHabitacion('${h.id}')" class="btn btn-sm" style="background: var(--color-primary); color: #fff; margin-right: 4px;">✎</button>
                <button onclick="eliminarHabitacion('${h.id}')" class="btn btn-danger btn-sm">X</button>
            </td>
        </tr>
    `).join('');
}

async function handleNuevaHabitacion() {
    const nombre = document.getElementById('nueva-habitacion-nombre')?.value;
    const capacidad = document.getElementById('nueva-habitacion-capacidad')?.value;
    const descripcion = document.getElementById('nueva-habitacion-descripcion')?.value;

    if (!nombre) {
        showToast('El nombre es requerido', 'error');
        return;
    }

    try {
        showLoading();
        const nueva = await apiPost('/catalogo-habitaciones', {
            nombre: nombre,
            capacidad: parseInt(capacidad) || 1,
            descripcion: descripcion || null
        });

        catalogoHabitaciones.push(nueva);
        llenarSelectHabitaciones();
        renderTablaHabitaciones();

        document.getElementById('nueva-habitacion-nombre').value = '';
        document.getElementById('nueva-habitacion-capacidad').value = '1';
        document.getElementById('nueva-habitacion-descripcion').value = '';

        hideLoading();
        showToast('Habitacion agregada', 'success');
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

async function eliminarHabitacion(habitacionId) {
    if (!confirm('¿Eliminar esta habitacion?')) return;

    try {
        await apiDelete(`/catalogo-habitaciones/${habitacionId}`);
        catalogoHabitaciones = catalogoHabitaciones.filter(h => h.id !== habitacionId);
        llenarSelectHabitaciones();
        renderTablaHabitaciones();
        showToast('Habitacion eliminada', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function editarHabitacion(habitacionId) {
    const h = catalogoHabitaciones.find(x => x.id === habitacionId);
    if (!h) return;
    const tbody = document.getElementById('tabla-habitaciones');
    const row = tbody.querySelector(`button[onclick*="${habitacionId}"]`).closest('tr');
    row.innerHTML = `
        <td><input type="text" class="form-input" id="edit-hab-nombre-${habitacionId}" value="${h.nombre}" style="min-width:100px"></td>
        <td><input type="number" class="form-input" id="edit-hab-capacidad-${habitacionId}" value="${h.capacidad || 1}" min="1" style="width:60px"></td>
        <td><input type="text" class="form-input" id="edit-hab-descripcion-${habitacionId}" value="${h.descripcion || ''}" style="min-width:100px"></td>
        <td>
            <button onclick="guardarEdicionHabitacion('${habitacionId}')" class="btn btn-sm" style="background: var(--color-success); color: #fff; margin-right: 4px;">✓</button>
            <button onclick="renderTablaHabitaciones()" class="btn btn-sm" style="background: var(--color-border); color: #fff;">✕</button>
        </td>
    `;
}

async function guardarEdicionHabitacion(habitacionId) {
    const nombre = document.getElementById(`edit-hab-nombre-${habitacionId}`)?.value;
    const capacidad = document.getElementById(`edit-hab-capacidad-${habitacionId}`)?.value;
    const descripcion = document.getElementById(`edit-hab-descripcion-${habitacionId}`)?.value;
    if (!nombre) { showToast('El nombre es requerido', 'error'); return; }
    try {
        showLoading();
        const actualizado = await apiPut(`/catalogo-habitaciones/${habitacionId}`, {
            nombre, capacidad: parseInt(capacidad) || 1, descripcion: descripcion || null
        });
        const idx = catalogoHabitaciones.findIndex(x => x.id === habitacionId);
        if (idx !== -1) catalogoHabitaciones[idx] = { ...catalogoHabitaciones[idx], ...actualizado };
        llenarSelectHabitaciones();
        renderTablaHabitaciones();
        hideLoading();
        showToast('Habitacion actualizada', 'success');
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

// ============================================
// COLORES DE ETIQUETA
// ============================================
function renderTablaColores() {
    const tbody = document.getElementById('tabla-colores');
    if (!tbody) return;

    if (!catalogoColores || catalogoColores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Sin colores configurados</td></tr>';
        return;
    }

    tbody.innerHTML = catalogoColores.map(c => `
        <tr>
            <td><span class="color-muestra" style="background-color: ${c.color}; display: inline-block; width: 30px; height: 30px; border-radius: 4px; border: 2px solid var(--color-border);"></span></td>
            <td>${c.texto}</td>
            <td>
                <button onclick="editarColor('${c.id}')" class="btn btn-sm" style="background: var(--color-primary); color: #fff; margin-right: 4px;">✎</button>
                <button onclick="eliminarColor('${c.id}')" class="btn btn-danger btn-sm">X</button>
            </td>
        </tr>
    `).join('');
}

function renderColoresCheckIn() {
    const container = document.getElementById('checkin-colores-container');
    if (!container) return;

    if (!catalogoColores || catalogoColores.length === 0) {
        container.innerHTML = '<p class="text-muted">No hay colores configurados. Ve a Servicios y Precios para agregar colores.</p>';
        return;
    }

    container.innerHTML = catalogoColores.map((c, idx) => `
        <label class="color-option ${idx === 0 ? 'selected' : ''}" data-color="${c.color}" title="${c.texto}">
            <input type="radio" name="color-etiqueta" value="${c.color}" ${idx === 0 ? 'checked' : ''} style="display: none;">
            <span class="color-circle" style="background-color: ${c.color};"></span>
        </label>
    `).join('');

    // Establecer valor inicial
    if (catalogoColores.length > 0) {
        document.getElementById('checkin-color').value = catalogoColores[0].color;
    }

    // Event listeners para selección de color
    container.querySelectorAll('.color-option').forEach(opt => {
        opt.addEventListener('click', () => {
            container.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            document.getElementById('checkin-color').value = opt.dataset.color;
        });
    });
}

function renderLeyendaColores() {
    const container = document.getElementById('calendario-leyenda');
    if (!container) return;

    let html = '';

    if (catalogoColores && catalogoColores.length > 0) {
        html = catalogoColores.map(c =>
            `<span class="leyenda-item"><span class="leyenda-color" style="background: ${c.color};"></span> ${c.texto}</span>`
        ).join('');
    }

    html += '<span class="leyenda-item"><span class="leyenda-color" style="background: #e0e0e0;"></span> Disponible</span>';

    container.innerHTML = html;
}

async function handleNuevoColor() {
    const color = document.getElementById('nuevo-color-valor')?.value;
    const texto = document.getElementById('nuevo-color-texto')?.value;

    if (!color || !texto) {
        showToast('Completa color y texto', 'error');
        return;
    }

    try {
        showLoading();
        const nuevo = await apiPost('/catalogo-colores', {
            color: color,
            texto: texto,
            orden: catalogoColores.length
        });

        catalogoColores.push(nuevo);
        renderTablaColores();
        renderColoresCheckIn();

        document.getElementById('nuevo-color-texto').value = '';

        hideLoading();
        showToast('Color agregado', 'success');
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

async function eliminarColor(colorId) {
    if (!confirm('¿Eliminar este color?')) return;

    try {
        await apiDelete(`/catalogo-colores/${colorId}`);
        catalogoColores = catalogoColores.filter(c => c.id !== colorId);
        renderTablaColores();
        renderColoresCheckIn();
        showToast('Color eliminado', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function editarColor(colorId) {
    const c = catalogoColores.find(x => x.id === colorId);
    if (!c) return;
    const tbody = document.getElementById('tabla-colores');
    const row = tbody.querySelector(`button[onclick*="${colorId}"]`).closest('tr');
    row.innerHTML = `
        <td><input type="color" class="form-input" id="edit-color-valor-${colorId}" value="${c.color}" style="width:60px; height:40px; padding:0;"></td>
        <td><input type="text" class="form-input" id="edit-color-texto-${colorId}" value="${c.texto}" style="min-width:100px"></td>
        <td>
            <button onclick="guardarEdicionColor('${colorId}')" class="btn btn-sm" style="background: var(--color-success); color: #fff; margin-right: 4px;">✓</button>
            <button onclick="renderTablaColores()" class="btn btn-sm" style="background: var(--color-border); color: #fff;">✕</button>
        </td>
    `;
}

async function guardarEdicionColor(colorId) {
    const color = document.getElementById(`edit-color-valor-${colorId}`)?.value;
    const texto = document.getElementById(`edit-color-texto-${colorId}`)?.value;
    if (!color || !texto) { showToast('Completa color y texto', 'error'); return; }
    try {
        showLoading();
        const actualizado = await apiPut(`/catalogo-colores/${colorId}`, { color, texto });
        const idx = catalogoColores.findIndex(x => x.id === colorId);
        if (idx !== -1) catalogoColores[idx] = { ...catalogoColores[idx], ...actualizado };
        renderTablaColores();
        renderColoresCheckIn();
        hideLoading();
        showToast('Color actualizado', 'success');
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

// ============================================
// CALENDARIO DE OCUPACION
// ============================================
function renderCalendarioOcupacion() {
    const container = document.getElementById('calendario-ocupacion');
    const rangoLabel = document.getElementById('calendario-rango-fechas');
    if (!container) return;

    // Renderizar leyenda con colores del catálogo
    renderLeyendaColores();

    // Inicializar inicio del calendario si no existe
    if (!calendarioSemanaInicio) {
        const hoy = new Date();
        // Empezar 7 días antes del lunes de esta semana
        const diaSemana = hoy.getDay();
        const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
        calendarioSemanaInicio = new Date(hoy);
        calendarioSemanaInicio.setDate(hoy.getDate() + diffLunes - 7);
        calendarioSemanaInicio.setHours(0, 0, 0, 0);
    }

    // Calcular 60 días continuos (aprox 2 meses)
    const TOTAL_DIAS = 60;
    const dias = [];
    for (let i = 0; i < TOTAL_DIAS; i++) {
        const fecha = new Date(calendarioSemanaInicio);
        fecha.setDate(calendarioSemanaInicio.getDate() + i);
        dias.push(fecha);
    }

    // Actualizar label de rango
    const fechaInicio = dias[0];
    const fechaFin = dias[dias.length - 1];
    if (rangoLabel) {
        rangoLabel.textContent = `${fechaInicio.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} - ${fechaFin.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }

    const hoyStr = new Date().toDateString();
    const COL_W = 65; // ancho de cada columna de día en px
    const HAB_W = 120; // ancho columna habitación
    const ROW_H = 60; // altura fija de cada fila
    const primerDia = dias[0];

    // Filtrar estancias activas
    const estanciasActivas = estancias.filter(e => e.estado !== 'Completada');

    // Ordenar habitaciones
    const habsOrdenadas = [...catalogoHabitaciones].sort((a, b) => {
        return a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' });
    });

    // Construir Gantt con divs
    let html = '<div class="gantt">';

    // Header de días
    html += `<div class="gantt-header" style="padding-left: ${HAB_W}px;">`;
    let mesAnterior = -1;
    dias.forEach((d, i) => {
        const nombreDia = d.toLocaleDateString('es-MX', { weekday: 'short' });
        const numDia = d.getDate();
        const mes = d.getMonth();
        const esHoy = d.toDateString() === hoyStr;
        const esFinde = d.getDay() === 0 || d.getDay() === 6;
        let cls = 'gantt-day-header';
        if (esHoy) cls += ' gantt-hoy';
        if (esFinde) cls += ' gantt-finde';
        if (mes !== mesAnterior && i > 0) cls += ' gantt-nuevo-mes';
        mesAnterior = mes;
        const mesLabel = numDia === 1 || i === 0 ? `<span class="gantt-mes-label">${d.toLocaleDateString('es-MX', { month: 'short' })}</span>` : '';
        html += `<div class="${cls}" style="width:${COL_W}px;" data-date="${d.toDateString()}">${mesLabel}${nombreDia}<br>${numDia}</div>`;
    });
    html += '</div>';

    if (catalogoHabitaciones.length === 0) {
        html += '<div class="text-center text-muted" style="padding: 2rem;">No hay habitaciones configuradas.</div>';
        html += '</div>';
        container.innerHTML = html;
        return;
    }

    // Filas por habitación
    habsOrdenadas.forEach(hab => {
        const estanciasHab = estanciasActivas
            .filter(e => e.habitacion === hab.nombre)
            .sort((a, b) => {
                const fA = parseDateLocal(a.fecha_entrada);
                const fB = parseDateLocal(b.fecha_entrada);
                return fA - fB;
            });

        html += `<div class="gantt-row" style="height: ${ROW_H}px;">`;
        html += `<div class="gantt-hab-label" style="width: ${HAB_W}px;">${hab.nombre}</div>`;
        html += `<div class="gantt-timeline" style="left: ${HAB_W}px; width: ${TOTAL_DIAS * COL_W}px;">`;

        // Grid de fondo (líneas de días)
        dias.forEach((d, i) => {
            const esHoy = d.toDateString() === hoyStr;
            const esFinde = d.getDay() === 0 || d.getDay() === 6;
            let cls = 'gantt-cell';
            if (esHoy) cls += ' gantt-hoy';
            if (esFinde) cls += ' gantt-finde';
            html += `<div class="${cls}" style="left:${i * COL_W}px; width:${COL_W}px; height:${ROW_H}px;"></div>`;
        });

        // Barras — ordenadas por fecha, skew crea efecto paralelogramo
        estanciasHab.forEach((estancia, idx) => {
            const entrada = parseDateLocal(estancia.fecha_entrada);
            const salida = estancia.fecha_salida ? parseDateLocal(estancia.fecha_salida) : entrada;
            const perroNombre = estancia.perros?.nombre || 'Perro';
            const perroFoto = estancia.perros?.foto_perro_url || null;
            const color = estancia.color_etiqueta || '#45BF4D';
            const textColor = esColorClaro(color) ? '#000' : '#fff';
            const colorTexto = catalogoColores.find(c => c.color === color)?.texto || '';

            // Calcular posición horizontal
            const startDay = Math.max(0, Math.round((entrada - primerDia) / 86400000));
            const endDay = Math.min(TOTAL_DIAS - 1, Math.round((salida - primerDia) / 86400000));
            if (endDay < 0 || startDay >= TOTAL_DIAS) return;

            const left = startDay * COL_W;
            const width = (endDay - startDay + 1) * COL_W;

            html += `<div class="gantt-bar" style="left:${left}px; width:${width}px; top:0; height:${ROW_H}px; background-color:${color}; color:${textColor}; z-index:${2 + idx};"
                title="${perroNombre}: ${formatDate(estancia.fecha_entrada)} - ${formatDate(estancia.fecha_salida)}${colorTexto ? ' (' + colorTexto + ')' : ''}"
                onclick="mostrarDetalleEstancia('${estancia.id}')">`;
            html += `<div class="gantt-bar-content">`;
            if (perroFoto) {
                html += `<img src="${perroFoto}" class="gantt-bar-foto" alt="${perroNombre}">`;
            } else {
                html += `<span class="gantt-bar-emoji">🐕</span>`;
            }
            html += `<span class="gantt-bar-name">${perroNombre}</span>`;
            html += `</div></div>`;
        });

        html += '</div></div>';
    });

    html += '</div>';
    container.innerHTML = html;
}

// Mostrar detalle de estancia con opción de eliminar y cambiar color
async function mostrarDetalleEstancia(estanciaId) {
    const estancia = estancias.find(e => e.id === estanciaId);
    if (!estancia) return;

    const perro = estancia.perros || {};
    const colorActual = estancia.color_etiqueta || '#45BF4D';
    const colorTexto = catalogoColores.find(c => c.color === colorActual)?.texto || '';

    // Generar opciones de colores
    let coloresHTML = '';
    catalogoColores.forEach(c => {
        const selected = c.color === colorActual ? 'selected' : '';
        coloresHTML += `
            <div class="color-option ${selected}" onclick="seleccionarColorEstancia('${c.color}', '${estanciaId}')" title="${c.texto}">
                <span class="color-circle" style="background-color: ${c.color};"></span>
            </div>
        `;
    });

    // Formatear fechas para inputs date (YYYY-MM-DD)
    const fechaEntradaVal = estancia.fecha_entrada ? estancia.fecha_entrada.split('T')[0] : '';
    const fechaSalidaVal = estancia.fecha_salida ? estancia.fecha_salida.split('T')[0] : '';

    // Generar opciones de habitaciones
    let habOptions = '<option value="">-- Sin habitación --</option>';
    catalogoHabitaciones.forEach(h => {
        const sel = h.nombre === estancia.habitacion ? 'selected' : '';
        habOptions += `<option value="${h.nombre}" ${sel}>${h.nombre}</option>`;
    });

    const modalHTML = `
        <div class="modal-overlay active" id="modal-estancia-detalle">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Detalle de Estancia</h3>
                    <button class="modal-close" onclick="cerrarModalEstancia()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="estancia-detalle-info">
                        ${perro.foto_perro_url ? `<img src="${perro.foto_perro_url}" alt="${perro.nombre}" class="estancia-detalle-foto">` : ''}
                        <h4>${perro.nombre || 'Perro'}</h4>
                    </div>
                    <div class="form-row mt-2">
                        <div class="form-group">
                            <label class="form-label">Habitación</label>
                            <select id="edit-estancia-habitacion" class="form-select">${habOptions}</select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Fecha Entrada</label>
                            <input type="date" id="edit-estancia-entrada" class="form-input" value="${fechaEntradaVal}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Fecha Salida</label>
                            <input type="date" id="edit-estancia-salida" class="form-input" value="${fechaSalidaVal}">
                        </div>
                    </div>
                    <p class="text-muted" style="font-size:0.85rem;">Total estimado: $${(estancia.total_estimado || 0).toFixed(2)}</p>
                    <div class="estancia-cambiar-color mt-2">
                        <label><strong>Estado/Color:</strong></label>
                        <div class="colores-selector modal-colores">
                            ${coloresHTML || '<p class="text-muted">No hay colores configurados</p>'}
                        </div>
                        <input type="hidden" id="estancia-color-seleccionado" value="${colorActual}">
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="cerrarModalEstancia()" class="btn btn-secondary">Cerrar</button>
                    <button onclick="guardarEdicionEstancia('${estanciaId}')" class="btn btn-primary">Guardar</button>
                    <button onclick="eliminarEstancia('${estanciaId}')" class="btn btn-danger">Eliminar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function cerrarModalEstancia() {
    const modal = document.getElementById('modal-estancia-detalle');
    if (modal) modal.remove();
}

function seleccionarColorEstancia(color, estanciaId) {
    // Actualizar visual
    document.querySelectorAll('#modal-estancia-detalle .color-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');

    // Guardar valor
    document.getElementById('estancia-color-seleccionado').value = color;
}

async function guardarEdicionEstancia(estanciaId) {
    const nuevoColor = document.getElementById('estancia-color-seleccionado').value;
    const nuevaEntrada = document.getElementById('edit-estancia-entrada').value;
    const nuevaSalida = document.getElementById('edit-estancia-salida').value;
    const nuevaHabitacion = document.getElementById('edit-estancia-habitacion').value;

    if (!nuevaEntrada || !nuevaSalida) {
        showToast('Las fechas son requeridas', 'error');
        return;
    }

    try {
        showLoading();
        const estancia = estancias.find(e => e.id === estanciaId);
        if (!estancia) return;

        // Actualizar estancia completa
        await apiPut(`/estancias/${estanciaId}`, {
            perro_id: estancia.perro_id,
            habitacion: nuevaHabitacion || estancia.habitacion,
            fecha_entrada: nuevaEntrada,
            fecha_salida: nuevaSalida,
            servicios_ids: estancia.servicios_ids || [],
            servicios_nombres: estancia.servicios_nombres || [],
            total_estimado: estancia.total_estimado || 0,
            color_etiqueta: nuevoColor
        });

        // Actualizar lista local
        estancia.fecha_entrada = nuevaEntrada;
        estancia.fecha_salida = nuevaSalida;
        estancia.habitacion = nuevaHabitacion || estancia.habitacion;
        estancia.color_etiqueta = nuevoColor;

        cerrarModalEstancia();
        renderCalendarioOcupacion();
        hideLoading();
        showToast('Estancia actualizada', 'success');
    } catch (error) {
        hideLoading();
        showToast('Error al actualizar: ' + error.message, 'error');
    }
}

async function eliminarEstancia(estanciaId) {
    if (!confirm('¿Estás seguro de eliminar esta estancia? Esta acción no se puede deshacer.')) return;

    try {
        showLoading();
        await apiDelete(`/estancias/${estanciaId}`);

        // Actualizar lista local
        estancias = estancias.filter(e => e.id !== estanciaId);

        cerrarModalEstancia();
        renderCalendarioOcupacion();
        hideLoading();
        showToast('Estancia eliminada', 'success');
    } catch (error) {
        hideLoading();
        showToast('Error al eliminar: ' + error.message, 'error');
    }
}

function cambiarSemanaCalendario(direccion) {
    if (!calendarioSemanaInicio) {
        calendarioSemanaInicio = new Date();
    }
    calendarioSemanaInicio.setDate(calendarioSemanaInicio.getDate() + (direccion * 30));
    renderCalendarioOcupacion();
    // Después de renderizar, scroll al inicio
    const cont = document.querySelector('.calendario-ocupacion-container');
    if (cont) cont.scrollLeft = 0;
}

function scrollCalendarioAHoy(soloScroll = false) {
    if (!soloScroll) {
        calendarioSemanaInicio = null;
        renderCalendarioOcupacion();
    }
    setTimeout(() => {
        const cont = document.querySelector('.calendario-ocupacion-container');
        const hoyEl = cont?.querySelector('.gantt-hoy');
        if (cont && hoyEl) {
            const offset = hoyEl.offsetLeft - 140;
            cont.scrollLeft = Math.max(0, offset);
        }
    }, 50);
}

// ============================================
// UTILIDADES
// ============================================
// Parsear fecha YYYY-MM-DD como local (no UTC) para evitar desfase de timezone
function parseDateLocal(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('T')[0].split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

function diaClases(dia, hoyStr) {
    let cls = '';
    if (dia.toDateString() === hoyStr) cls += ' calendario-hoy';
    if (dia.getDay() === 0 || dia.getDay() === 6) cls += ' calendario-finde';
    return cls;
}

function esColorClaro(hex) {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminancia > 0.6;
}

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
// DEBUG Y VERIFICACIÓN
// ============================================

// Función para verificar si una imagen es accesible
async function verificarImagen(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
}

// Debug: verificar estado de fotos de perros
async function debugFotosPerros() {
    console.log(' Debug - Verificando fotos de perros:');
    for (const p of perros) {
        if (p.foto_perro_url) {
            const accesible = await verificarImagen(p.foto_perro_url);
            console.log(`  ${p.nombre}: foto_perro_url = ${p.foto_perro_url}`);
            console.log(`    -> Accesible: ${accesible ? ' SÍ' : ' NO (verificar políticas de Supabase Storage)'}`);
        }
        if (p.foto_cartilla_url) {
            const accesible = await verificarImagen(p.foto_cartilla_url);
            console.log(`  ${p.nombre}: foto_cartilla_url = ${p.foto_cartilla_url}`);
            console.log(`    -> Accesible: ${accesible ? ' SÍ' : ' NO (verificar políticas de Supabase Storage)'}`);
        }
    }
}

// ============================================
// VERIFICACIÓN FINAL
// ============================================
console.log(' ComfortCan México - App.js v4 cargado');
console.log(' Módulos: Auth, Propietarios, Perros, Check-in, Paseos, Caja, Expedientes, Configuración');
console.log('💡 Tip: Ejecuta debugFotosPerros() en la consola para verificar acceso a las imágenes');
