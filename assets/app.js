/**
 * ComfortCan México - Aplicación Frontend
 * Sistema ERP para gestión de paseos caninos
 */

// ============================================
// CONFIGURACIÓN
// ============================================

const API_URL = 'https://comfortcan-api.onrender.com'; // Cambiar a URL de Render en producción

// ============================================
// ESTADO GLOBAL
// ============================================

const State = {
    token: localStorage.getItem('comfortcan_token'),
    user: JSON.parse(localStorage.getItem('comfortcan_user') || 'null'),
    propietarios: [],
    perros: [],
    catalogoPaseos: [],
    paseos: [],
    cargos: [],
    reservas: [],
    selectedPaseos: new Set(),
    currentSection: 'dashboard'
};

// ============================================
// UTILIDADES
// ============================================

const Utils = {
    // Formatear moneda
    formatMoney(amount) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount);
    },

    // Formatear fecha
    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    },

    // Formatear fecha y hora
    formatDateTime(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Mostrar loading
    showLoading() {
        document.getElementById('loading-overlay').classList.remove('hidden');
    },

    // Ocultar loading
    hideLoading() {
        document.getElementById('loading-overlay').classList.add('hidden');
    },

    // Mostrar toast
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = message;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Obtener fecha actual en formato YYYY-MM-DD
    getTodayDate() {
        return new Date().toISOString().split('T')[0];
    }
};

// ============================================
// API CLIENT
// ============================================

const API = {
    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (State.token) {
            headers['Authorization'] = `Bearer ${State.token}`;
        }

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers
            });

            if (response.status === 401) {
                Auth.logout();
                throw new Error('Sesión expirada');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Error en la solicitud');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Métodos convenientes
    get(endpoint) {
        return this.request(endpoint);
    },

    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },

    delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }
};

// ============================================
// AUTENTICACIÓN
// ============================================

const Auth = {
    async login(email, password) {
        Utils.showLoading();
        try {
            const data = await API.post('/login', { email, password });
            
            State.token = data.access_token;
            State.user = { id: data.user_id, email: data.email };
            
            localStorage.setItem('comfortcan_token', data.access_token);
            localStorage.setItem('comfortcan_user', JSON.stringify(State.user));
            
            App.showApp();
            Utils.showToast('Bienvenido a ComfortCan');
        } catch (error) {
            document.getElementById('login-error').textContent = error.message;
            document.getElementById('login-error').classList.remove('hidden');
        } finally {
            Utils.hideLoading();
        }
    },

    logout() {
        State.token = null;
        State.user = null;
        localStorage.removeItem('comfortcan_token');
        localStorage.removeItem('comfortcan_user');
        
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-screen').classList.add('hidden');
        document.getElementById('login-form').reset();
    },

    isAuthenticated() {
        return !!State.token;
    }
};

// ============================================
// APLICACIÓN PRINCIPAL
// ============================================

const App = {
    // Inicializar app
    async init() {
        // Event listeners
        this.setupEventListeners();
        
        // Verificar autenticación
        if (Auth.isAuthenticated()) {
            this.showApp();
        } else {
            document.getElementById('login-screen').classList.remove('hidden');
        }
    },

    // Configurar event listeners
    setupEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            Auth.login(email, password);
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            Auth.logout();
        });

        // Sidebar toggle (mobile)
        document.getElementById('sidebar-toggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });

        // Navegación sidebar
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                this.navigateTo(section);
                
                // Cerrar sidebar en móvil
                if (window.innerWidth < 1024) {
                    document.getElementById('sidebar').classList.remove('open');
                }
            });
        });

        // Búsquedas
        document.getElementById('search-propietarios').addEventListener('input', (e) => {
            this.filterPropietarios(e.target.value);
        });

        document.getElementById('search-perros').addEventListener('input', (e) => {
            this.filterPerros(e.target.value);
        });
    },

    // Mostrar aplicación
    async showApp() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        
        // Cargar datos iniciales
        await this.loadInitialData();
        this.navigateTo('dashboard');
    },

    // Cargar datos iniciales
    async loadInitialData() {
        Utils.showLoading();
        try {
            // Cargar en paralelo
            const [propietarios, perros, catalogo] = await Promise.all([
                API.get('/propietarios?activo=true'),
                API.get('/perros?activo=true'),
                API.get('/catalogo-paseos')
            ]);

            State.propietarios = propietarios;
            State.perros = perros;
            State.catalogoPaseos = catalogo;

            // Poblar selects
            this.populatePropietarioSelects();
            this.populatePerroSelects();
            this.populateCatalogoSelects();
        } catch (error) {
            Utils.showToast('Error cargando datos: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    // Navegar a sección
    navigateTo(section) {
        State.currentSection = section;
        
        // Actualizar navegación activa
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === section);
        });
        
        // Mostrar sección
        document.querySelectorAll('.section').forEach(sec => {
            sec.classList.add('hidden');
        });
        document.getElementById(`section-${section}`).classList.remove('hidden');
        
        // Cargar datos de la sección
        switch (section) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'propietarios':
                this.loadPropietarios();
                break;
            case 'perros':
                this.loadPerros();
                break;
            case 'paseos':
                this.loadPaseos();
                break;
            case 'caja':
                this.loadCaja();
                break;
            case 'reservas':
                this.loadReservas();
                break;
        }
    },

    // ============================================
    // DASHBOARD
    // ============================================

    async loadDashboard() {
        try {
            const resumen = await API.get('/reportes/resumen');
            
            document.getElementById('stat-propietarios').textContent = resumen.total_propietarios;
            document.getElementById('stat-perros').textContent = resumen.total_perros;
            document.getElementById('stat-paseos-mes').textContent = resumen.paseos_mes;
            document.getElementById('stat-ingresos').textContent = Utils.formatMoney(resumen.ingresos_mes);
            document.getElementById('badge-pendientes').textContent = resumen.paseos_pendientes;
            document.getElementById('stat-monto-pendiente').textContent = Utils.formatMoney(resumen.monto_pendiente);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    },

    // ============================================
    // PROPIETARIOS
    // ============================================

    async loadPropietarios() {
        try {
            State.propietarios = await API.get('/propietarios?activo=true');
            this.renderPropietarios(State.propietarios);
        } catch (error) {
            Utils.showToast('Error cargando propietarios', 'error');
        }
    },

    renderPropietarios(propietarios) {
        const tbody = document.getElementById('tabla-propietarios');
        
        if (propietarios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay propietarios registrados</td></tr>';
            return;
        }

        tbody.innerHTML = propietarios.map(p => {
            const perrosCount = State.perros.filter(pe => pe.propietario_id === p.id).length;
            return `
                <tr>
                    <td><strong>${p.nombre} ${p.apellido}</strong></td>
                    <td>${p.telefono || '-'}</td>
                    <td>${p.email || '-'}</td>
                    <td><span class="badge badge-info">${perrosCount}</span></td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-secondary btn-icon" onclick="App.editPropietario('${p.id}')" title="Editar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button class="btn btn-sm btn-danger btn-icon" onclick="App.deletePropietario('${p.id}')" title="Eliminar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    filterPropietarios(query) {
        const filtered = State.propietarios.filter(p => {
            const searchStr = `${p.nombre} ${p.apellido} ${p.telefono || ''}`.toLowerCase();
            return searchStr.includes(query.toLowerCase());
        });
        this.renderPropietarios(filtered);
    },

    async savePropietario(event) {
        event.preventDefault();
        Utils.showLoading();

        const id = document.getElementById('propietario-id').value;
        const data = {
            nombre: document.getElementById('propietario-nombre').value,
            apellido: document.getElementById('propietario-apellido').value,
            telefono: document.getElementById('propietario-telefono').value || null,
            email: document.getElementById('propietario-email').value || null,
            direccion: document.getElementById('propietario-direccion').value || null,
            notas: document.getElementById('propietario-notas').value || null
        };

        try {
            if (id) {
                await API.put(`/propietarios/${id}`, data);
                Utils.showToast('Propietario actualizado');
            } else {
                await API.post('/propietarios', data);
                Utils.showToast('Propietario creado');
            }
            
            this.closeModal('propietario');
            await this.loadInitialData();
            this.loadPropietarios();
        } catch (error) {
            Utils.showToast('Error: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    editPropietario(id) {
        const p = State.propietarios.find(x => x.id === id);
        if (!p) return;

        document.getElementById('modal-propietario-title').textContent = 'Editar Propietario';
        document.getElementById('propietario-id').value = p.id;
        document.getElementById('propietario-nombre').value = p.nombre;
        document.getElementById('propietario-apellido').value = p.apellido;
        document.getElementById('propietario-telefono').value = p.telefono || '';
        document.getElementById('propietario-email').value = p.email || '';
        document.getElementById('propietario-direccion').value = p.direccion || '';
        document.getElementById('propietario-notas').value = p.notas || '';

        this.openModal('propietario');
    },

    deletePropietario(id) {
        this.showConfirm(
            'Eliminar Propietario',
            '¿Está seguro de eliminar este propietario? También se eliminarán sus perros asociados.',
            async () => {
                try {
                    await API.delete(`/propietarios/${id}`);
                    Utils.showToast('Propietario eliminado');
                    await this.loadInitialData();
                    this.loadPropietarios();
                } catch (error) {
                    Utils.showToast('Error: ' + error.message, 'error');
                }
            }
        );
    },

    // ============================================
    // PERROS
    // ============================================

    async loadPerros() {
        try {
            State.perros = await API.get('/perros?activo=true');
            this.renderPerros(State.perros);
            this.populateFilterPropietarios();
        } catch (error) {
            Utils.showToast('Error cargando perros', 'error');
        }
    },

    renderPerros(perros) {
        const container = document.getElementById('grid-perros');
        
        if (perros.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No hay perros registrados</p></div>';
            return;
        }

        container.innerHTML = perros.map(p => {
            const propietario = p.propietarios || {};
            return `
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">${p.nombre}</h3>
                        <span class="badge badge-info">${p.raza || 'Sin raza'}</span>
                    </div>
                    <div class="card-body">
                        <p><strong>Dueño:</strong> ${propietario.nombre || ''} ${propietario.apellido || ''}</p>
                        <p><strong>Teléfono:</strong> ${propietario.telefono || '-'}</p>
                        <p><strong>Sexo:</strong> ${p.sexo || '-'} | <strong>Peso:</strong> ${p.peso_kg ? p.peso_kg + ' kg' : '-'}</p>
                        ${p.esterilizado ? '<span class="badge badge-success">Esterilizado</span>' : ''}
                    </div>
                    <div class="btn-group mt-md">
                        <button class="btn btn-sm btn-secondary" onclick="App.editPerro('${p.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Editar
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="App.deletePerro('${p.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            Eliminar
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    filterPerros(query) {
        const propietarioFilter = document.getElementById('filter-propietario-perros').value;
        let filtered = State.perros;
        
        if (query) {
            filtered = filtered.filter(p => p.nombre.toLowerCase().includes(query.toLowerCase()));
        }
        
        if (propietarioFilter) {
            filtered = filtered.filter(p => p.propietario_id === propietarioFilter);
        }
        
        this.renderPerros(filtered);
    },

    populateFilterPropietarios() {
        const select = document.getElementById('filter-propietario-perros');
        select.innerHTML = '<option value="">Todos los propietarios</option>' +
            State.propietarios.map(p => 
                `<option value="${p.id}">${p.nombre} ${p.apellido}</option>`
            ).join('');
        
        select.onchange = () => this.filterPerros(document.getElementById('search-perros').value);
    },

    async savePerro(event) {
        event.preventDefault();
        Utils.showLoading();

        const id = document.getElementById('perro-id').value;
        const data = {
            propietario_id: document.getElementById('perro-propietario').value,
            nombre: document.getElementById('perro-nombre').value,
            raza: document.getElementById('perro-raza').value || null,
            fecha_nacimiento: document.getElementById('perro-nacimiento').value || null,
            peso_kg: document.getElementById('perro-peso').value ? parseFloat(document.getElementById('perro-peso').value) : null,
            sexo: document.getElementById('perro-sexo').value || null,
            color: document.getElementById('perro-color').value || null,
            esterilizado: document.getElementById('perro-esterilizado').checked,
            alergias: document.getElementById('perro-alergias').value || null,
            veterinario_contacto: document.getElementById('perro-veterinario').value || null,
            notas: document.getElementById('perro-notas').value || null
        };

        try {
            if (id) {
                await API.put(`/perros/${id}`, data);
                Utils.showToast('Perro actualizado');
            } else {
                await API.post('/perros', data);
                Utils.showToast('Perro registrado');
            }
            
            this.closeModal('perro');
            await this.loadInitialData();
            this.loadPerros();
        } catch (error) {
            Utils.showToast('Error: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    editPerro(id) {
        const p = State.perros.find(x => x.id === id);
        if (!p) return;

        document.getElementById('modal-perro-title').textContent = 'Editar Perro';
        document.getElementById('perro-id').value = p.id;
        document.getElementById('perro-propietario').value = p.propietario_id;
        document.getElementById('perro-nombre').value = p.nombre;
        document.getElementById('perro-raza').value = p.raza || '';
        document.getElementById('perro-nacimiento').value = p.fecha_nacimiento || '';
        document.getElementById('perro-peso').value = p.peso_kg || '';
        document.getElementById('perro-sexo').value = p.sexo || '';
        document.getElementById('perro-color').value = p.color || '';
        document.getElementById('perro-esterilizado').checked = p.esterilizado;
        document.getElementById('perro-alergias').value = p.alergias || '';
        document.getElementById('perro-veterinario').value = p.veterinario_contacto || '';
        document.getElementById('perro-notas').value = p.notas || '';

        this.openModal('perro');
    },

    deletePerro(id) {
        this.showConfirm(
            'Eliminar Perro',
            '¿Está seguro de eliminar este perro?',
            async () => {
                try {
                    await API.delete(`/perros/${id}`);
                    Utils.showToast('Perro eliminado');
                    await this.loadInitialData();
                    this.loadPerros();
                } catch (error) {
                    Utils.showToast('Error: ' + error.message, 'error');
                }
            }
        );
    },

    // ============================================
    // PASEOS
    // ============================================

    async loadPaseos() {
        try {
            const fechaInicio = document.getElementById('filter-fecha-inicio').value;
            const fechaFin = document.getElementById('filter-fecha-fin').value;
            const pagado = document.getElementById('filter-pagado').value;

            let url = '/paseos?';
            if (fechaInicio) url += `fecha_inicio=${fechaInicio}&`;
            if (fechaFin) url += `fecha_fin=${fechaFin}&`;
            if (pagado !== '') url += `pagado=${pagado}&`;

            State.paseos = await API.get(url);
            this.renderPaseos(State.paseos);
        } catch (error) {
            Utils.showToast('Error cargando paseos', 'error');
        }
    },

    renderPaseos(paseos) {
        const tbody = document.getElementById('tabla-paseos');
        
        if (paseos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay paseos registrados</td></tr>';
            return;
        }

        tbody.innerHTML = paseos.map(p => {
            const perro = p.perros || {};
            const propietario = perro.propietarios || {};
            const tipo = p.catalogo_paseos || {};
            
            return `
                <tr>
                    <td>${Utils.formatDate(p.fecha)}</td>
                    <td><strong>${perro.nombre || '-'}</strong></td>
                    <td>${propietario.nombre || ''} ${propietario.apellido || ''}</td>
                    <td>${tipo.nombre || '-'}</td>
                    <td>${Utils.formatMoney(p.precio_cobrado)}</td>
                    <td>
                        ${p.pagado 
                            ? '<span class="badge badge-success">Pagado</span>' 
                            : '<span class="badge badge-warning">Pendiente</span>'}
                    </td>
                    <td>
                        <button class="btn btn-sm btn-danger btn-icon" onclick="App.deletePaseo('${p.id}')" title="Eliminar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    async savePaseo(event) {
        event.preventDefault();
        Utils.showLoading();

        const data = {
            perro_id: document.getElementById('paseo-perro').value,
            catalogo_paseo_id: document.getElementById('paseo-tipo').value,
            fecha: document.getElementById('paseo-fecha').value,
            precio_cobrado: parseFloat(document.getElementById('paseo-precio').value),
            hora_inicio: document.getElementById('paseo-hora-inicio').value || null,
            hora_fin: document.getElementById('paseo-hora-fin').value || null,
            notas: document.getElementById('paseo-notas').value || null
        };

        try {
            await API.post('/paseos', data);
            Utils.showToast('Paseo registrado');
            this.closeModal('paseo');
            this.loadPaseos();
        } catch (error) {
            Utils.showToast('Error: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    deletePaseo(id) {
        this.showConfirm(
            'Eliminar Paseo',
            '¿Está seguro de eliminar este paseo?',
            async () => {
                try {
                    await API.delete(`/paseos/${id}`);
                    Utils.showToast('Paseo eliminado');
                    this.loadPaseos();
                } catch (error) {
                    Utils.showToast('Error: ' + error.message, 'error');
                }
            }
        );
    },

    updatePrecioPaseo() {
        const tipoId = document.getElementById('paseo-tipo').value;
        const tipo = State.catalogoPaseos.find(c => c.id === tipoId);
        if (tipo) {
            document.getElementById('paseo-precio').value = tipo.precio;
        }
    },

    // ============================================
    // CAJA (COBROS)
    // ============================================

    async loadCaja() {
        this.populateCajaPropietarios();
        await this.loadCargos();
        document.getElementById('ticket-container').style.display = 'none';
    },

    populateCajaPropietarios() {
        const select = document.getElementById('caja-propietario');
        select.innerHTML = '<option value="">-- Seleccione --</option>' +
            State.propietarios.map(p => 
                `<option value="${p.id}">${p.nombre} ${p.apellido}</option>`
            ).join('');
    },

    async loadPaseosPendientes() {
        const propietarioId = document.getElementById('caja-propietario').value;
        const container = document.getElementById('caja-paseos-container');
        const lista = document.getElementById('caja-paseos-lista');
        
        if (!propietarioId) {
            container.classList.add('hidden');
            return;
        }

        try {
            const paseos = await API.get(`/paseos/pendientes/${propietarioId}`);
            
            if (paseos.length === 0) {
                lista.innerHTML = '<p class="text-muted text-center" style="padding: 1rem;">No hay paseos pendientes</p>';
                container.classList.remove('hidden');
                State.selectedPaseos.clear();
                this.updateCajaTotal();
                return;
            }

            lista.innerHTML = paseos.map(p => {
                const perro = p.perros || {};
                const tipo = p.catalogo_paseos || {};
                return `
                    <label class="selection-item" data-id="${p.id}" data-precio="${p.precio_cobrado}">
                        <input type="checkbox" onchange="App.togglePaseoSelection('${p.id}', ${p.precio_cobrado})">
                        <div class="selection-info">
                            <div class="selection-title">${perro.nombre} - ${tipo.nombre}</div>
                            <div class="selection-subtitle">${Utils.formatDate(p.fecha)}</div>
                        </div>
                        <div class="selection-amount">${Utils.formatMoney(p.precio_cobrado)}</div>
                    </label>
                `;
            }).join('');

            container.classList.remove('hidden');
            State.selectedPaseos.clear();
            this.updateCajaTotal();
        } catch (error) {
            Utils.showToast('Error cargando paseos pendientes', 'error');
        }
    },

    togglePaseoSelection(id, precio) {
        if (State.selectedPaseos.has(id)) {
            State.selectedPaseos.delete(id);
        } else {
            State.selectedPaseos.set(id, precio);
        }
        this.updateCajaTotal();
    },

    updateCajaTotal() {
        let total = 0;
        State.selectedPaseos.forEach(precio => {
            total += precio;
        });
        document.getElementById('caja-total').textContent = Utils.formatMoney(total);
        document.getElementById('btn-cobrar').disabled = State.selectedPaseos.size === 0;
    },

    async procesarCobro() {
        if (State.selectedPaseos.size === 0) {
            Utils.showToast('Seleccione al menos un paseo', 'error');
            return;
        }

        Utils.showLoading();

        const data = {
            paseos_ids: Array.from(State.selectedPaseos.keys()),
            propietario_id: document.getElementById('caja-propietario').value,
            metodo_pago: document.getElementById('caja-metodo').value
        };

        try {
            const result = await API.post('/caja/cobrar', data);
            Utils.showToast('Cobro procesado exitosamente');
            
            this.generarTicket(result);
            await this.loadPaseosPendientes();
            await this.loadCargos();
        } catch (error) {
            Utils.showToast('Error procesando cobro: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    generarTicket(result) {
        const container = document.getElementById('ticket-container');
        const content = document.getElementById('ticket-content');
        const propietario = result.propietario;
        const cargo = result.cargo;
        const paseos = result.paseos_cobrados;

        const ahora = new Date();
        const fechaStr = ahora.toLocaleDateString('es-MX');
        const horaStr = ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

        content.innerHTML = `
            <div class="ticket">
                <div class="ticket-header">
                    <img src="assets/logo.png" alt="ComfortCan" class="ticket-logo">
                    <div class="ticket-title">COMFORTCAN MÉXICO</div>
                    <div class="ticket-subtitle">Train & Care</div>
                </div>
                
                <div class="ticket-body">
                    <div class="ticket-row">
                        <span>Fecha:</span>
                        <span>${fechaStr}</span>
                    </div>
                    <div class="ticket-row">
                        <span>Hora:</span>
                        <span>${horaStr}</span>
                    </div>
                    <div class="ticket-row">
                        <span>Cliente:</span>
                        <span>${propietario.nombre} ${propietario.apellido}</span>
                    </div>
                    
                    <div class="ticket-divider"></div>
                    
                    <div style="margin-bottom: 8px;"><strong>SERVICIOS:</strong></div>
                    ${paseos.map(p => `
                        <div class="ticket-row">
                            <span>${Utils.formatDate(p.fecha)}</span>
                            <span>${Utils.formatMoney(p.precio_cobrado)}</span>
                        </div>
                    `).join('')}
                    
                    <div class="ticket-divider"></div>
                    
                    <div class="ticket-row ticket-total">
                        <span>TOTAL:</span>
                        <span>${Utils.formatMoney(result.monto_total)}</span>
                    </div>
                    <div class="ticket-row">
                        <span>Método:</span>
                        <span>${cargo.metodo_pago}</span>
                    </div>
                </div>
                
                <div class="ticket-footer">
                    <p>¡Gracias por su preferencia!</p>
                    <p>ComfortCan México</p>
                </div>
            </div>
        `;

        container.style.display = 'block';
    },

    async loadCargos() {
        try {
            State.cargos = await API.get('/cargos');
            this.renderCargos(State.cargos);
        } catch (error) {
            console.error('Error loading cargos:', error);
        }
    },

    renderCargos(cargos) {
        const tbody = document.getElementById('tabla-cargos');
        
        if (cargos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay cobros registrados</td></tr>';
            return;
        }

        tbody.innerHTML = cargos.map(c => {
            const propietario = c.propietarios || {};
            return `
                <tr>
                    <td>${Utils.formatDateTime(c.created_at)}</td>
                    <td>${propietario.nombre || ''} ${propietario.apellido || ''}</td>
                    <td><strong>${Utils.formatMoney(c.monto_total)}</strong></td>
                    <td>${c.metodo_pago}</td>
                    <td><span class="badge badge-info">${c.paseos_ids.length}</span></td>
                    <td>
                        <button class="btn btn-sm btn-danger btn-icon" onclick="App.deleteCargo('${c.id}')" title="Anular">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    deleteCargo(id) {
        this.showConfirm(
            'Anular Cobro',
            '¿Está seguro de anular este cobro? Los paseos volverán a estado pendiente.',
            async () => {
                try {
                    await API.delete(`/cargos/${id}`);
                    Utils.showToast('Cobro anulado');
                    await this.loadCaja();
                } catch (error) {
                    Utils.showToast('Error: ' + error.message, 'error');
                }
            }
        );
    },

    // ============================================
    // RESERVAS
    // ============================================

    async loadReservas() {
        try {
            const fecha = document.getElementById('filter-fecha-reserva').value;
            const estado = document.getElementById('filter-estado-reserva').value;

            let url = '/reservas?';
            if (fecha) url += `fecha=${fecha}&`;
            if (estado) url += `estado=${estado}&`;

            State.reservas = await API.get(url);
            this.renderReservas(State.reservas);
        } catch (error) {
            Utils.showToast('Error cargando reservas', 'error');
        }
    },

    renderReservas(reservas) {
        const tbody = document.getElementById('tabla-reservas');
        
        if (reservas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay reservas</td></tr>';
            return;
        }

        tbody.innerHTML = reservas.map(r => {
            const perro = r.perros || {};
            const propietario = perro.propietarios || {};
            const servicio = r.catalogo_paseos || {};
            
            const estadoBadge = {
                'Pendiente': 'badge-warning',
                'Confirmada': 'badge-info',
                'Completada': 'badge-success',
                'Cancelada': 'badge-danger'
            };
            
            return `
                <tr>
                    <td>${Utils.formatDate(r.fecha_reserva)}</td>
                    <td>${r.hora_inicio || '-'}</td>
                    <td><strong>${perro.nombre || '-'}</strong></td>
                    <td>${propietario.nombre || ''} ${propietario.apellido || ''}</td>
                    <td>${servicio.nombre || '-'}</td>
                    <td><span class="badge ${estadoBadge[r.estado] || 'badge-info'}">${r.estado}</span></td>
                    <td>
                        <div class="btn-group">
                            <select class="form-select" style="width: auto; padding: 4px 8px; font-size: 12px;" onchange="App.updateEstadoReserva('${r.id}', this.value)">
                                <option value="Pendiente" ${r.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                                <option value="Confirmada" ${r.estado === 'Confirmada' ? 'selected' : ''}>Confirmada</option>
                                <option value="Completada" ${r.estado === 'Completada' ? 'selected' : ''}>Completada</option>
                                <option value="Cancelada" ${r.estado === 'Cancelada' ? 'selected' : ''}>Cancelada</option>
                            </select>
                            <button class="btn btn-sm btn-danger btn-icon" onclick="App.deleteReserva('${r.id}')" title="Eliminar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    async saveReserva(event) {
        event.preventDefault();
        Utils.showLoading();

        const data = {
            perro_id: document.getElementById('reserva-perro').value,
            catalogo_paseo_id: document.getElementById('reserva-servicio').value,
            fecha_reserva: document.getElementById('reserva-fecha').value,
            hora_inicio: document.getElementById('reserva-hora').value || null,
            notas: document.getElementById('reserva-notas').value || null
        };

        try {
            await API.post('/reservas', data);
            Utils.showToast('Reserva creada');
            this.closeModal('reserva');
            this.loadReservas();
        } catch (error) {
            Utils.showToast('Error: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    },

    async updateEstadoReserva(id, estado) {
        try {
            await API.put(`/reservas/${id}/estado?estado=${estado}`);
            Utils.showToast('Estado actualizado');
        } catch (error) {
            Utils.showToast('Error: ' + error.message, 'error');
            this.loadReservas();
        }
    },

    deleteReserva(id) {
        this.showConfirm(
            'Eliminar Reserva',
            '¿Está seguro de eliminar esta reserva?',
            async () => {
                try {
                    await API.delete(`/reservas/${id}`);
                    Utils.showToast('Reserva eliminada');
                    this.loadReservas();
                } catch (error) {
                    Utils.showToast('Error: ' + error.message, 'error');
                }
            }
        );
    },

    // ============================================
    // MODALES Y UTILIDADES
    // ============================================

    openModal(name) {
        // Limpiar formulario si es nuevo
        const form = document.getElementById(`form-${name}`);
        if (form && !document.getElementById(`${name}-id`)?.value) {
            form.reset();
            const titleEl = document.getElementById(`modal-${name}-title`);
            if (titleEl) {
                titleEl.textContent = `Nuevo ${name.charAt(0).toUpperCase() + name.slice(1)}`;
            }
        }

        // Establecer fecha actual para paseos/reservas
        if (name === 'paseo') {
            document.getElementById('paseo-fecha').value = Utils.getTodayDate();
        }
        if (name === 'reserva') {
            document.getElementById('reserva-fecha').value = Utils.getTodayDate();
        }

        document.getElementById(`modal-${name}`).classList.add('active');
    },

    closeModal(name) {
        document.getElementById(`modal-${name}`).classList.remove('active');
        
        // Limpiar ID oculto
        const idField = document.getElementById(`${name}-id`);
        if (idField) idField.value = '';
    },

    showConfirm(title, message, onConfirm) {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        
        const btn = document.getElementById('confirm-btn');
        btn.onclick = async () => {
            this.closeModal('confirm');
            await onConfirm();
        };
        
        this.openModal('confirm');
    },

    // Poblar selects con datos
    populatePropietarioSelects() {
        const selects = [
            document.getElementById('perro-propietario'),
            document.getElementById('caja-propietario')
        ];

        const options = '<option value="">-- Seleccione --</option>' +
            State.propietarios.map(p => 
                `<option value="${p.id}">${p.nombre} ${p.apellido}</option>`
            ).join('');

        selects.forEach(select => {
            if (select) select.innerHTML = options;
        });
    },

    populatePerroSelects() {
        const selects = [
            document.getElementById('paseo-perro'),
            document.getElementById('reserva-perro')
        ];

        const options = '<option value="">-- Seleccione --</option>' +
            State.perros.map(p => {
                const prop = State.propietarios.find(pr => pr.id === p.propietario_id);
                const propName = prop ? ` (${prop.nombre})` : '';
                return `<option value="${p.id}">${p.nombre}${propName}</option>`;
            }).join('');

        selects.forEach(select => {
            if (select) select.innerHTML = options;
        });
    },

    populateCatalogoSelects() {
        const selects = [
            document.getElementById('paseo-tipo'),
            document.getElementById('reserva-servicio')
        ];

        const options = '<option value="">-- Seleccione --</option>' +
            State.catalogoPaseos.map(c => 
                `<option value="${c.id}">${c.nombre} - ${Utils.formatMoney(c.precio)}</option>`
            ).join('');

        selects.forEach(select => {
            if (select) select.innerHTML = options;
        });
    }
};

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => App.init());
