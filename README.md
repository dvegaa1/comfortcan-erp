# ComfortCan ERP - Hotel Canino

Sistema ERP completo para la gestion de un hotel canino. Maneja reservas, expedientes medicos, paseos, facturacion y calendario de ocupacion en tiempo real.

## Tech Stack

| Capa | Tecnologia |
|------|-----------|
| Frontend | Vanilla JavaScript (ES6+), HTML5, CSS3 |
| Backend | Python FastAPI 0.115.0 |
| Base de Datos | Supabase (PostgreSQL) |
| Autenticacion | Supabase Auth (JWT) |
| Almacenamiento | Supabase Storage (fotos) |
| Deploy Frontend | Vercel |
| Deploy Backend | Render |

## Estructura del Proyecto

```
comfortcan-app/
├── frontend/
│   ├── index.html          # SPA shell (889 lineas)
│   ├── app.js              # Logica principal (~3200 lineas)
│   ├── styles.css          # Dark theme (~1950 lineas)
│   └── assets/
│       └── logo.png
├── backend/
│   ├── main.py             # Todos los endpoints FastAPI
│   ├── requirements.txt    # Dependencias Python
│   └── .env                # Variables de entorno (no versionado)
├── vercel.json             # Config de deploy frontend
└── README.md
```

## Modulos

### 1. Recepcion y Check-In
- Registro de propietarios (clientes)
- Registro de perros con datos de salud
- Check-in: seleccion de habitacion, fechas, servicios, color de etiqueta
- Calculo automatico de total por dias y servicios

### 2. Paseos y Agenda
- Registro de paseos con hora de salida/regreso
- Catalogo de tipos de paseo con duracion y precio
- Filtros por perro, rango de fechas, estado de pago
- Envio masivo de paseos a caja

### 3. Caja y Ticket
- Vista de cargos pendientes por perro
- Agregar cargos manuales
- Generacion de tickets/facturas
- Registro de metodo de pago
- Impresion y descarga de tickets

### 4. Expedientes
- Perfil completo del perro (raza, peso, alergias, medicamentos)
- Historial de vacunas (Rabia, Sextuple, Bordetella, Giardia, extra)
- Registro de desparasitaciones (interna/externa)
- Subida de fotos (foto del perro y cartilla de vacunacion)

### 5. Editar Datos
- Edicion de perfiles de perros y propietarios
- Eliminacion permanente con cascada de datos relacionados

### 6. Calendario de Ocupacion
- Vista Gantt de 60 dias con barras de color por estancia
- Navegacion por mes con botones y swipe
- Clip-path diagonal donde hay overlap de estancias
- Modal inline para crear reservas sin salir del calendario
- Boton flotante "+ Nueva Reserva" siempre visible
- Leyenda de colores por estado de pago

### 7. Servicios y Precios
- Catalogo de servicios (precio unico o por dia)
- Catalogo de tipos de paseo
- Catalogo de habitaciones (nombre, capacidad)
- Catalogo de colores para etiquetas de estado

## Base de Datos

### Tablas principales

| Tabla | Descripcion |
|-------|------------|
| `propietarios` | Clientes/duenos de perros |
| `perros` | Huespedes con datos de salud y vacunas |
| `estancias` | Reservas/check-ins con fechas y habitacion |
| `paseos` | Registro de paseos con tipo y precio |
| `cargos` | Lineas de cargo (servicios, estancias, paseos) |
| `tickets` | Facturas generadas a partir de cargos |
| `catalogo_servicios` | Servicios disponibles con precio |
| `catalogo_paseos` | Tipos de paseo con duracion y precio |
| `catalogo_habitaciones` | Habitaciones del hotel |
| `catalogo_colores` | Colores para estados de estancias |

## API Endpoints

**Base URL**: `https://comfortcan-api.onrender.com`

Todos los endpoints requieren header `Authorization: Bearer {token}` (excepto login).

| Metodo | Endpoint | Descripcion |
|--------|----------|------------|
| POST | `/login` | Autenticacion (email/password) |
| GET/POST | `/propietarios` | Listar/crear propietarios |
| PUT/DELETE | `/propietarios/{id}` | Editar/desactivar propietario |
| DELETE | `/propietarios/{id}/permanente` | Eliminar con cascada |
| GET/POST | `/perros` | Listar/crear perros |
| PUT/DELETE | `/perros/{id}` | Editar/desactivar perro |
| DELETE | `/perros/{id}/permanente` | Eliminar con cascada |
| GET/POST | `/estancias` | Listar/crear estancias |
| PUT | `/estancias/{id}` | Editar estancia |
| PUT | `/estancias/{id}/completar` | Marcar como completada |
| PATCH | `/estancias/{id}/color` | Cambiar color de etiqueta |
| GET/POST | `/paseos` | Listar/crear paseos |
| PUT | `/paseos/{id}/pagar` | Marcar paseo como pagado |
| POST | `/paseos/enviar-caja` | Enviar paseos a cargos |
| GET/POST | `/cargos` | Listar/crear cargos |
| GET | `/cargos/pendientes/{perro_id}` | Cargos no pagados |
| GET/POST | `/tickets` | Listar/crear tickets |
| POST | `/upload/foto-perro/{perro_id}` | Subir foto de perro |
| POST | `/upload/foto-cartilla/{perro_id}` | Subir cartilla de vacunacion |
| GET | `/catalogo-servicios` | Catalogo de servicios |
| GET | `/catalogo-paseos` | Catalogo de paseos |
| GET | `/catalogo-habitaciones` | Catalogo de habitaciones |
| GET | `/catalogo-colores` | Catalogo de colores |
| GET | `/reportes/resumen` | Resumen dashboard |

## Variables de Entorno

### Backend (`backend/.env`)
```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-service-role-key
SUPABASE_ANON_KEY=tu-anon-key
```

### Frontend
```javascript
// Hardcoded en app.js linea 1
const API_URL = 'https://comfortcan-api.onrender.com';
```

## Instalacion Local

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Configurar variables
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
# Sin dependencias npm — abrir directamente
open frontend/index.html
# O servir con cualquier servidor estatico
npx serve frontend
```

## Deploy

### Frontend (Vercel)
El archivo `vercel.json` configura el deploy estatico desde `frontend/`.

### Backend (Render)
Configurar como Web Service con:
- **Build command**: `pip install -r requirements.txt`
- **Start command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Supabase
Requiere:
- Base de datos PostgreSQL con las tablas listadas
- Auth habilitado con provider email/password
- Storage bucket `fotos` con politica publica de lectura
- RLS (Row Level Security) configurado en tablas

## Notas Tecnicas

- **Sin build process**: Frontend es vanilla JS puro, sin bundler
- **Sin ORM**: Backend hace requests HTTP directos a Supabase REST API
- **Soft deletes**: Campo `activo` en lugar de borrado fisico (excepto endpoints `/permanente`)
- **CORS**: Backend permite todos los origenes (`allow_origins=["*"]`)
- **Responsive**: Sidebar colapsable en mobile, calendario con touch/swipe
- **Tema oscuro**: CSS custom properties con `--color-primary: #45BF4D`
