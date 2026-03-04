"""
ComfortCan México - API Backend v2
Sistema ERP completo para hotel canino
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Header, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta
import asyncio
import logging
import os
from dotenv import load_dotenv
import httpx
import base64
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# ============================================
# LOGGING
# ============================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("comfortcan")

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

# Orígenes permitidos: configura ALLOWED_ORIGINS en .env como lista separada por comas
# Ejemplo: ALLOWED_ORIGINS=https://comfortcan.vercel.app,http://localhost:3000
_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()] or ["*"]

# Cliente HTTP compartido — se crea una sola vez y reutiliza el pool de conexiones TCP
http_client: httpx.AsyncClient = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    http_client = httpx.AsyncClient(timeout=30.0)
    logger.info("ComfortCan API iniciada — cliente HTTP listo")
    yield
    await http_client.aclose()
    logger.info("ComfortCan API detenida — cliente HTTP cerrado")

# Rate limiter (protege endpoints sensibles contra fuerza bruta)
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="ComfortCan México API",
    description="Sistema ERP para hotel canino",
    version="2.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Tipos de imagen permitidos para uploads
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# HELPERS
# ============================================

def get_headers(token: str = None):
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {token or SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

async def supabase_request(method: str, endpoint: str, data: dict = None, token: str = None):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    response = await http_client.request(
        method=method,
        url=url,
        headers=get_headers(token),
        json=data if data else None,
    )
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    try:
        return response.json() if response.text else None
    except Exception:
        return None

async def verify_token(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token requerido")
    token = authorization.replace("Bearer ", "").strip()
    # Validación básica de formato JWT: debe tener exactamente 3 partes (header.payload.signature)
    if not token or token.count(".") != 2:
        raise HTTPException(status_code=401, detail="Token con formato inválido")
    return token

# ============================================
# MODELOS PYDANTIC
# ============================================

class LoginRequest(BaseModel):
    email: str
    password: str

class PropietarioCreate(BaseModel):
    nombre: str
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    email: Optional[str] = None
    notas: Optional[str] = None

class PerroCreate(BaseModel):
    propietario_id: str
    nombre: str
    raza: Optional[str] = None
    edad: Optional[str] = None
    genero: Optional[str] = None
    peso_kg: Optional[float] = None
    fecha_pesaje: Optional[str] = None
    medicamentos: Optional[str] = None
    esterilizado: Optional[bool] = False
    alergias: Optional[str] = None
    veterinario: Optional[str] = None
    desparasitacion_tipo: Optional[str] = None
    desparasitacion_fecha: Optional[str] = None
    vacuna_rabia_estado: Optional[str] = "Pendiente"
    vacuna_rabia_vence: Optional[str] = None
    vacuna_sextuple_estado: Optional[str] = "Pendiente"
    vacuna_sextuple_vence: Optional[str] = None
    vacuna_bordetella_estado: Optional[str] = "Pendiente"
    vacuna_bordetella_vence: Optional[str] = None
    vacuna_giardia_estado: Optional[str] = "Pendiente"
    vacuna_giardia_vence: Optional[str] = None
    vacuna_extra_nombre: Optional[str] = None
    vacuna_extra_estado: Optional[str] = None
    vacuna_extra_vence: Optional[str] = None
    foto_perro_url: Optional[str] = None
    foto_cartilla_url: Optional[str] = None
    desparasitacion_producto_int: Optional[str] = None
    desparasitacion_fecha_int: Optional[str] = None
    desparasitacion_producto_ext: Optional[str] = None
    desparasitacion_fecha_ext: Optional[str] = None


class EstanciaCreate(BaseModel):
    perro_id: str
    habitacion: Optional[str] = None
    fecha_entrada: str
    fecha_salida: Optional[str] = None
    servicios_ids: Optional[List[str]] = []
    servicios_nombres: Optional[List[str]] = []
    total_estimado: Optional[float] = 0
    color_etiqueta: Optional[str] = "#45BF4D"
    notas: Optional[str] = None

class EstanciaColorUpdate(BaseModel):
    color_etiqueta: str

class PaseoCreate(BaseModel):
    perro_id: str
    catalogo_paseo_id: Optional[str] = None
    fecha: str
    tipo_paseo: str
    hora_salida: Optional[str] = None
    hora_regreso: Optional[str] = None
    precio: float
    notas: Optional[str] = None

class CargoCreate(BaseModel):
    perro_id: str
    fecha_cargo: Optional[str] = None
    fecha_servicio: Optional[str] = None
    concepto: str
    monto: float

class TicketCreate(BaseModel):
    perro_id: str
    propietario_id: str
    cargos_ids: List[str]
    subtotal: float
    total: float
    metodo_pago: Optional[str] = "Efectivo"
    notas: Optional[str] = None

class ServicioCreate(BaseModel):
    nombre: str
    precio: float
    tipo_cobro: Optional[str] = "por_dia"  # "por_dia" o "unico"

class TipoPaseoCreate(BaseModel):
    nombre: str
    duracion_minutos: Optional[int] = None
    precio: float

class HabitacionCreate(BaseModel):
    nombre: str
    capacidad: Optional[int] = 1
    descripcion: Optional[str] = None

class ColorEtiquetaCreate(BaseModel):
    color: str
    texto: str
    orden: Optional[int] = 0

# ============================================
# ENDPOINTS: AUTH
# ============================================

@app.get("/")
async def root():
    return {"message": "ComfortCan México API v2", "status": "running"}

@app.get("/health")
async def health():
    if http_client is None:
        return {"status": "starting", "database": "pending"}
    try:
        response = await http_client.get(
            f"{SUPABASE_URL}/rest/v1/",
            headers={"apikey": SUPABASE_ANON_KEY},
            timeout=5.0
        )
        if response.status_code < 500:
            return {"status": "healthy", "database": "connected"}
        logger.warning("Supabase respondió con status %s en health check", response.status_code)
        return {"status": "degraded", "database": "error"}
    except Exception as e:
        logger.error("Health check falló: %s", e)
        return {"status": "unhealthy", "database": "unreachable"}

@app.post("/login")
@limiter.limit("5/minute")
async def login(http_request: Request, request: LoginRequest):
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    response = await http_client.post(
        url,
        headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
        json={"email": request.email, "password": request.password}
    )
    if response.status_code != 200:
        logger.warning("Intento de login fallido para: %s", request.email)
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    data = response.json()
    logger.info("Login exitoso para: %s", request.email)
    return {
        "access_token": data["access_token"],
        "user_id": data["user"]["id"],
        "email": data["user"]["email"]
    }

# ============================================
# ENDPOINTS: PROPIETARIOS
# ============================================

@app.get("/propietarios")
async def listar_propietarios(activo: Optional[bool] = True, authorization: str = Header(None)):
    token = await verify_token(authorization)
    endpoint = "propietarios?select=*&order=nombre"
    if activo is not None:
        endpoint += f"&activo=eq.{str(activo).lower()}"
    return await supabase_request("GET", endpoint, token=token)

@app.get("/propietarios/{id}")
async def obtener_propietario(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("GET", f"propietarios?id=eq.{id}", token=token)
    if not result:
        raise HTTPException(status_code=404, detail="No encontrado")
    return result[0]

@app.post("/propietarios")
async def crear_propietario(data: PropietarioCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("POST", "propietarios", data.model_dump(exclude_none=True), token=token)
    return result[0] if result else None

@app.put("/propietarios/{id}")
async def actualizar_propietario(id: str, data: PropietarioCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("PATCH", f"propietarios?id=eq.{id}", data.model_dump(exclude_none=True), token=token)
    return result[0] if result else None

@app.delete("/propietarios/{id}")
async def eliminar_propietario(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    await supabase_request("PATCH", f"propietarios?id=eq.{id}", {"activo": False}, token=token)
    return {"message": "Propietario desactivado"}

@app.delete("/propietarios/{id}/permanente")
async def eliminar_propietario_permanente(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    # Obtener perros del propietario
    perros = await supabase_request("GET", f"perros?propietario_id=eq.{id}&select=id", token=token)
    # Eliminar datos relacionados de cada perro
    for perro in perros:
        pid = perro["id"]
        try:
            await supabase_request("DELETE", f"estancias?perro_id=eq.{pid}", token=token)
            await supabase_request("DELETE", f"cargos?perro_id=eq.{pid}", token=token)
            await supabase_request("DELETE", f"paseos?perro_id=eq.{pid}", token=token)
        except HTTPException as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error al eliminar datos del perro {pid}: {e.detail}"
            )
    # Eliminar todos los perros del propietario
    try:
        await supabase_request("DELETE", f"perros?propietario_id=eq.{id}", token=token)
        await supabase_request("DELETE", f"propietarios?id=eq.{id}", token=token)
    except HTTPException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al eliminar propietario {id}: {e.detail}"
        )
    return {"message": "Propietario y sus perros eliminados permanentemente"}

# ============================================
# ENDPOINTS: PERROS
# ============================================

@app.get("/perros")
async def listar_perros(propietario_id: Optional[str] = None, activo: Optional[bool] = True, authorization: str = Header(None)):
    token = await verify_token(authorization)
    endpoint = "perros?select=*,propietarios(id,nombre,telefono,direccion)&order=nombre"
    if activo is not None:
        endpoint += f"&activo=eq.{str(activo).lower()}"
    if propietario_id:
        endpoint += f"&propietario_id=eq.{propietario_id}"
    return await supabase_request("GET", endpoint, token=token)

@app.get("/perros/{id}")
async def obtener_perro(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("GET", f"perros?id=eq.{id}&select=*,propietarios(*)", token=token)
    if not result:
        raise HTTPException(status_code=404, detail="No encontrado")
    return result[0]

@app.post("/perros")
async def crear_perro(data: PerroCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    perro_data = data.model_dump(exclude_none=True)
    result = await supabase_request("POST", "perros", perro_data, token=token)
    return result[0] if result else None

@app.put("/perros/{id}")
async def actualizar_perro(id: str, data: PerroCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("PATCH", f"perros?id=eq.{id}", data.model_dump(exclude_none=True), token=token)
    return result[0] if result else None

@app.delete("/perros/{id}")
async def eliminar_perro(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    await supabase_request("PATCH", f"perros?id=eq.{id}", {"activo": False}, token=token)
    return {"message": "Perro desactivado"}

@app.delete("/perros/{id}/permanente")
async def eliminar_perro_permanente(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    try:
        await supabase_request("DELETE", f"estancias?perro_id=eq.{id}", token=token)
        await supabase_request("DELETE", f"cargos?perro_id=eq.{id}", token=token)
        await supabase_request("DELETE", f"paseos?perro_id=eq.{id}", token=token)
        await supabase_request("DELETE", f"perros?id=eq.{id}", token=token)
    except HTTPException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al eliminar perro {id}: {e.detail}"
        )
    return {"message": "Perro eliminado permanentemente"}

# ============================================
# ENDPOINTS: CATÁLOGO SERVICIOS
# ============================================

@app.get("/catalogo-servicios")
async def listar_servicios(authorization: str = Header(None)):
    token = await verify_token(authorization)
    return await supabase_request("GET", "catalogo_servicios?select=*&activo=eq.true&order=nombre", token=token)

@app.post("/catalogo-servicios")
async def crear_servicio(data: ServicioCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("POST", "catalogo_servicios", data.model_dump(), token=token)
    return result[0] if result else None

@app.put("/catalogo-servicios/{id}")
async def actualizar_servicio(id: str, data: ServicioCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("PATCH", f"catalogo_servicios?id=eq.{id}", data.model_dump(), token=token)
    return result[0] if result else None

@app.delete("/catalogo-servicios/{id}")
async def eliminar_servicio(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    await supabase_request("PATCH", f"catalogo_servicios?id=eq.{id}", {"activo": False}, token=token)
    return {"message": "Servicio desactivado"}

# ============================================
# ENDPOINTS: CATÁLOGO PASEOS
# ============================================

@app.get("/catalogo-paseos")
async def listar_catalogo_paseos(authorization: str = Header(None)):
    token = await verify_token(authorization)
    return await supabase_request("GET", "catalogo_paseos?select=*&activo=eq.true&order=precio", token=token)

@app.post("/catalogo-paseos")
async def crear_tipo_paseo(data: TipoPaseoCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("POST", "catalogo_paseos", data.model_dump(), token=token)
    return result[0] if result else None

@app.put("/catalogo-paseos/{id}")
async def actualizar_tipo_paseo(id: str, data: TipoPaseoCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("PATCH", f"catalogo_paseos?id=eq.{id}", data.model_dump(), token=token)
    return result[0] if result else None

@app.delete("/catalogo-paseos/{id}")
async def eliminar_tipo_paseo(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    await supabase_request("PATCH", f"catalogo_paseos?id=eq.{id}", {"activo": False}, token=token)
    return {"message": "Tipo de paseo desactivado"}

# ============================================
# ENDPOINTS: CATÁLOGO HABITACIONES
# ============================================

@app.get("/catalogo-habitaciones")
async def listar_habitaciones(authorization: str = Header(None)):
    token = await verify_token(authorization)
    return await supabase_request("GET", "catalogo_habitaciones?select=*&activo=eq.true&order=nombre", token=token)

@app.post("/catalogo-habitaciones")
async def crear_habitacion(data: HabitacionCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("POST", "catalogo_habitaciones", data.model_dump(), token=token)
    return result[0] if result else None

@app.put("/catalogo-habitaciones/{id}")
async def actualizar_habitacion(id: str, data: HabitacionCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("PATCH", f"catalogo_habitaciones?id=eq.{id}", data.model_dump(), token=token)
    return result[0] if result else None

@app.delete("/catalogo-habitaciones/{id}")
async def eliminar_habitacion(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    await supabase_request("PATCH", f"catalogo_habitaciones?id=eq.{id}", {"activo": False}, token=token)
    return {"message": "Habitacion desactivada"}

# ============================================
# ENDPOINTS: CATÁLOGO COLORES ETIQUETA
# ============================================

@app.get("/catalogo-colores")
async def listar_colores(authorization: str = Header(None)):
    token = await verify_token(authorization)
    return await supabase_request("GET", "catalogo_colores?select=*&activo=eq.true&order=orden", token=token)

@app.post("/catalogo-colores")
async def crear_color(data: ColorEtiquetaCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("POST", "catalogo_colores", data.model_dump(), token=token)
    return result[0] if result else None

@app.put("/catalogo-colores/{id}")
async def actualizar_color(id: str, data: ColorEtiquetaCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("PATCH", f"catalogo_colores?id=eq.{id}", data.model_dump(), token=token)
    return result[0] if result else None

@app.delete("/catalogo-colores/{id}")
async def eliminar_color(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    await supabase_request("PATCH", f"catalogo_colores?id=eq.{id}", {"activo": False}, token=token)
    return {"message": "Color desactivado"}

# ============================================
# ENDPOINTS: ESTANCIAS (CHECK-IN)
# ============================================

@app.get("/estancias")
async def listar_estancias(estado: Optional[str] = None, authorization: str = Header(None)):
    token = await verify_token(authorization)
    endpoint = "estancias?select=*,perros(id,nombre,foto_perro_url,propietarios(nombre,telefono))&order=fecha_entrada.desc"
    if estado:
        endpoint += f"&estado=eq.{estado}"
    return await supabase_request("GET", endpoint, token=token)

@app.get("/estancias/{id}")
async def obtener_estancia(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("GET", f"estancias?id=eq.{id}&select=*,perros(*,propietarios(*))", token=token)
    if not result:
        raise HTTPException(status_code=404, detail="No encontrado")
    return result[0]

@app.post("/estancias")
async def crear_estancia(data: EstanciaCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("POST", "estancias", data.model_dump(exclude_none=True), token=token)
    return result[0] if result else None

@app.put("/estancias/{id}")
async def actualizar_estancia(id: str, data: EstanciaCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("PATCH", f"estancias?id=eq.{id}", data.model_dump(exclude_none=True), token=token)
    return result[0] if result else None

@app.put("/estancias/{id}/completar")
async def completar_estancia(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("PATCH", f"estancias?id=eq.{id}", {"estado": "Completada"}, token=token)
    return result[0] if result else None

@app.patch("/estancias/{id}/color")
async def actualizar_color_estancia(id: str, data: EstanciaColorUpdate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("PATCH", f"estancias?id=eq.{id}", {"color_etiqueta": data.color_etiqueta}, token=token)
    return result[0] if result else None

@app.delete("/estancias/{id}")
async def eliminar_estancia(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    await supabase_request("DELETE", f"estancias?id=eq.{id}", token=token)
    return {"message": "Estancia eliminada"}

# ============================================
# ENDPOINTS: PASEOS
# ============================================

@app.get("/paseos")
async def listar_paseos(
    perro_id: Optional[str] = None,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    pagado: Optional[bool] = None,
    authorization: str = Header(None)
):
    token = await verify_token(authorization)
    endpoint = "paseos?select=*,perros(id,nombre,propietarios(nombre,telefono)),catalogo_paseos(nombre)&order=fecha.desc"
    if perro_id:
        endpoint += f"&perro_id=eq.{perro_id}"
    if fecha_inicio:
        endpoint += f"&fecha=gte.{fecha_inicio}"
    if fecha_fin:
        endpoint += f"&fecha=lte.{fecha_fin}"
    if pagado is not None:
        endpoint += f"&pagado=eq.{str(pagado).lower()}"
    return await supabase_request("GET", endpoint, token=token)

@app.get("/paseos/pendientes")
async def listar_paseos_pendientes(authorization: str = Header(None)):
    token = await verify_token(authorization)
    endpoint = "paseos?select=*,perros(id,nombre,propietarios(nombre,telefono))&pagado=eq.false&order=fecha.desc"
    return await supabase_request("GET", endpoint, token=token)

@app.post("/paseos")
async def crear_paseo(data: PaseoCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("POST", "paseos", data.model_dump(exclude_none=True), token=token)
    return result[0] if result else None

@app.put("/paseos/{id}")
async def actualizar_paseo(id: str, data: PaseoCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("PATCH", f"paseos?id=eq.{id}", data.model_dump(exclude_none=True), token=token)
    return result[0] if result else None

@app.put("/paseos/{id}/pagar")
async def marcar_paseo_pagado(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("PATCH", f"paseos?id=eq.{id}", {"pagado": True}, token=token)
    return result[0] if result else None

@app.delete("/paseos/{id}")
async def eliminar_paseo(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    await supabase_request("DELETE", f"paseos?id=eq.{id}", token=token)
    return {"message": "Paseo eliminado"}

@app.post("/paseos/enviar-caja")
async def enviar_paseos_a_caja(paseos_ids: List[str], authorization: str = Header(None)):
    token = await verify_token(authorization)
    # Obtener paseos
    ids_str = ",".join([f'"{id}"' for id in paseos_ids])
    paseos = await supabase_request("GET", f"paseos?id=in.({ids_str})&select=*,perros(id,nombre)", token=token)
    
    # Crear cargos por cada paseo
    for paseo in paseos:
        cargo = {
            "perro_id": paseo["perro_id"],
            "fecha_cargo": datetime.now().strftime("%Y-%m-%d"),
            "fecha_servicio": paseo["fecha"],
            "concepto": paseo["tipo_paseo"],
            "monto": paseo["precio"]
        }
        await supabase_request("POST", "cargos", cargo, token=token)
        # Marcar paseo como enviado a caja
        await supabase_request("PATCH", f"paseos?id=eq.{paseo['id']}", {"enviado_caja": True}, token=token)
    
    return {"message": f"{len(paseos)} paseos enviados a caja"}

# ============================================
# ENDPOINTS: CARGOS
# ============================================

@app.get("/cargos")
async def listar_cargos(perro_id: Optional[str] = None, pagado: Optional[bool] = None, authorization: str = Header(None)):
    token = await verify_token(authorization)
    endpoint = "cargos?select=*,perros(id,nombre,propietarios(id,nombre,telefono))&order=created_at.desc"
    if perro_id:
        endpoint += f"&perro_id=eq.{perro_id}"
    if pagado is not None:
        endpoint += f"&pagado=eq.{str(pagado).lower()}"
    return await supabase_request("GET", endpoint, token=token)

@app.get("/cargos/pendientes/{perro_id}")
async def listar_cargos_pendientes(perro_id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    endpoint = f"cargos?perro_id=eq.{perro_id}&pagado=eq.false&select=*&order=fecha_cargo"
    return await supabase_request("GET", endpoint, token=token)

@app.post("/cargos")
async def crear_cargo(data: CargoCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    cargo_data = data.model_dump(exclude_none=True)
    if "fecha_cargo" not in cargo_data or not cargo_data["fecha_cargo"]:
        cargo_data["fecha_cargo"] = datetime.now().strftime("%Y-%m-%d")
    result = await supabase_request("POST", "cargos", cargo_data, token=token)
    return result[0] if result else None

@app.put("/cargos/{id}")
async def actualizar_cargo(id: str, data: CargoCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("PATCH", f"cargos?id=eq.{id}", data.model_dump(exclude_none=True), token=token)
    return result[0] if result else None

@app.delete("/cargos/{id}")
async def eliminar_cargo(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    await supabase_request("DELETE", f"cargos?id=eq.{id}", token=token)
    return {"message": "Cargo eliminado"}

# ============================================
# ENDPOINTS: TICKETS
# ============================================

@app.get("/tickets")
async def listar_tickets(perro_id: Optional[str] = None, authorization: str = Header(None)):
    token = await verify_token(authorization)
    endpoint = "tickets?select=*,perros(nombre),propietarios(nombre,telefono)&order=created_at.desc"
    if perro_id:
        endpoint += f"&perro_id=eq.{perro_id}"
    return await supabase_request("GET", endpoint, token=token)

@app.get("/tickets/{id}")
async def obtener_ticket(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("GET", f"tickets?id=eq.{id}&select=*,perros(*),propietarios(*)", token=token)
    if not result:
        raise HTTPException(status_code=404, detail="No encontrado")
    return result[0]

@app.post("/tickets")
async def crear_ticket(data: TicketCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    ticket_data = data.model_dump(exclude_none=True)
    ticket_data["fecha"] = datetime.now().strftime("%Y-%m-%d")
    
    # Crear ticket
    result = await supabase_request("POST", "tickets", ticket_data, token=token)
    ticket = result[0] if result else None
    
    if ticket:
        # Marcar cargos como pagados
        for cargo_id in data.cargos_ids:
            await supabase_request("PATCH", f"cargos?id=eq.{cargo_id}", {"pagado": True, "ticket_id": ticket["id"]}, token=token)
    
    return ticket

# ============================================
# ENDPOINTS: UPLOAD FOTOS
# ============================================
# IMPORTANTE: Para que las fotos sean públicamente accesibles, debes:
# 1. Ir a Supabase Dashboard > Storage
# 2. Crear un bucket llamado "fotos" si no existe
# 3. En las políticas del bucket, agregar una política SELECT pública:
#    - Policy name: "Acceso público lectura"
#    - Allowed operation: SELECT
#    - Target roles: public
#    - Policy definition: true
# 4. También necesitas política INSERT para subir:
#    - Policy name: "Usuarios autenticados pueden subir"
#    - Allowed operation: INSERT
#    - Target roles: authenticated
#    - Policy definition: true

@app.post("/upload/foto-perro/{perro_id}")
async def upload_foto_perro(perro_id: str, file: UploadFile = File(...), authorization: str = Header(None)):
    token = await verify_token(authorization)

    # Validar tipo de archivo
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de archivo no permitido: '{file.content_type}'. Solo se aceptan imágenes JPEG, PNG y WebP."
        )

    # Leer archivo
    contents = await file.read()

    # Nombre único - usar extensión del archivo original
    extension = file.filename.split('.')[-1].lower() if '.' in file.filename else 'jpg'
    filename = f"perros/{perro_id}_{int(datetime.now().timestamp())}.{extension}"

    # Subir a Supabase Storage
    storage_url = f"{SUPABASE_URL}/storage/v1/object/fotos/{filename}"

    response = await http_client.post(
        storage_url,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": file.content_type or "image/jpeg",
            "x-upsert": "true"  # Sobrescribir si existe
        },
        content=contents,
    )

    if response.status_code >= 400:
        error_detail = response.text
        logger.error("Error subiendo foto perro %s: %s - %s", perro_id, response.status_code, error_detail)
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Error subiendo foto: {error_detail}. Verifica que el bucket 'fotos' exista y tenga políticas correctas."
        )

    foto_url = f"{SUPABASE_URL}/storage/v1/object/public/fotos/{filename}"

    try:
        await supabase_request(
            "PATCH",
            f"perros?id=eq.{perro_id}",
            {"foto_perro_url": foto_url},
            token=token
        )
        logger.info("Foto de perro subida para perro %s", perro_id)
    except Exception as e:
        logger.error("Error actualizando foto_url del perro %s: %s", perro_id, e)

    return {"url": foto_url, "message": "Foto subida correctamente"}

@app.post("/upload/foto-cartilla/{perro_id}")
async def upload_foto_cartilla(perro_id: str, file: UploadFile = File(...), authorization: str = Header(None)):
    token = await verify_token(authorization)

    # Validar tipo de archivo
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de archivo no permitido: '{file.content_type}'. Solo se aceptan imágenes JPEG, PNG y WebP."
        )

    contents = await file.read()

    extension = file.filename.split('.')[-1].lower() if '.' in file.filename else 'jpg'
    filename = f"cartillas/{perro_id}_{int(datetime.now().timestamp())}.{extension}"

    storage_url = f"{SUPABASE_URL}/storage/v1/object/fotos/{filename}"

    response = await http_client.post(
        storage_url,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": file.content_type or "image/jpeg",
            "x-upsert": "true"
        },
        content=contents,
    )

    if response.status_code >= 400:
        error_detail = response.text
        logger.error("Error subiendo cartilla perro %s: %s - %s", perro_id, response.status_code, error_detail)
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Error subiendo cartilla: {error_detail}. Verifica que el bucket 'fotos' exista y tenga políticas correctas."
        )

    foto_url = f"{SUPABASE_URL}/storage/v1/object/public/fotos/{filename}"
    await supabase_request("PATCH", f"perros?id=eq.{perro_id}", {"foto_cartilla_url": foto_url}, token=SUPABASE_KEY)

    logger.info("Cartilla subida para perro %s", perro_id)
    return {"url": foto_url, "message": "Cartilla subida correctamente"}

# ============================================
# ENDPOINTS: DIAGNÓSTICO STORAGE
# ============================================

@app.get("/storage/check")
async def check_storage(authorization: str = Header(None)):
    """Verificar estado del bucket de storage"""
    token = await verify_token(authorization)

    try:
        # Verificar si el bucket existe
        url = f"{SUPABASE_URL}/storage/v1/bucket/fotos"
        response = await http_client.get(
            url,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}"
            }
        )

        if response.status_code == 404:
            return {
                "status": "error",
                "message": "El bucket 'fotos' NO existe. Debes crearlo en Supabase Dashboard > Storage",
                "instructions": [
                    "1. Ve a Supabase Dashboard",
                    "2. Ve a Storage",
                    "3. Crea un nuevo bucket llamado 'fotos'",
                    "4. Marca la opción 'Public bucket' para que las fotos sean accesibles",
                    "5. Agrega políticas INSERT para usuarios autenticados"
                ]
            }

        bucket_info = response.json()

        return {
            "status": "ok",
            "bucket": "fotos",
            "public": bucket_info.get("public", False),
            "message": "Bucket existe" + (" y es público" if bucket_info.get("public") else " pero NO es público - las fotos no serán accesibles")
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}

# ============================================
# ENDPOINTS: REPORTES
# ============================================

@app.get("/reportes/resumen")
async def resumen(authorization: str = Header(None)):
    token = await verify_token(authorization)

    primer_dia = datetime.now().replace(day=1).strftime("%Y-%m-%d")

    # Lanzar las 5 queries en paralelo en lugar de secuencial
    propietarios, perros, estancias_activas, cargos_pendientes, tickets_mes = await asyncio.gather(
        supabase_request("GET", "propietarios?activo=eq.true&select=id", token=token),
        supabase_request("GET", "perros?activo=eq.true&select=id", token=token),
        supabase_request("GET", "estancias?estado=eq.Activa&select=id", token=token),
        supabase_request("GET", "cargos?pagado=eq.false&select=monto", token=token),
        supabase_request("GET", f"tickets?fecha=gte.{primer_dia}&select=total", token=token),
    )

    return {
        "total_propietarios": len(propietarios) if propietarios else 0,
        "total_perros": len(perros) if perros else 0,
        "estancias_activas": len(estancias_activas) if estancias_activas else 0,
        "cargos_pendientes": len(cargos_pendientes) if cargos_pendientes else 0,
        "monto_pendiente": sum(float(c["monto"]) for c in cargos_pendientes) if cargos_pendientes else 0,
        "ingresos_mes": sum(float(t["total"]) for t in tickets_mes) if tickets_mes else 0
    }

# ============================================================
# TABLAS NUEVAS EN SUPABASE — ejecutar este SQL en el editor:
# ------------------------------------------------------------
# CREATE TABLE notas_estancia (
#   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
#   estancia_id UUID REFERENCES estancias(id) ON DELETE CASCADE,
#   nota TEXT NOT NULL, autor VARCHAR(100) DEFAULT 'Sistema',
#   created_at TIMESTAMPTZ DEFAULT NOW());
#
# CREATE TABLE catalogo_grooming (
#   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
#   nombre VARCHAR(100) NOT NULL, precio_base DECIMAL(10,2) NOT NULL,
#   duracion_minutos INT DEFAULT 60, descripcion TEXT,
#   activo BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW());
#
# CREATE TABLE grooming_citas (
#   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
#   perro_id UUID REFERENCES perros(id), catalogo_grooming_id UUID,
#   fecha DATE NOT NULL, hora VARCHAR(10), tipo_grooming VARCHAR(100),
#   precio DECIMAL(10,2) NOT NULL, estado VARCHAR(50) DEFAULT 'Pendiente',
#   notas TEXT, enviado_caja BOOLEAN DEFAULT FALSE,
#   created_at TIMESTAMPTZ DEFAULT NOW());
#
# CREATE TABLE alimentacion_registro (
#   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
#   estancia_id UUID, perro_id UUID REFERENCES perros(id),
#   fecha DATE NOT NULL, hora VARCHAR(10),
#   comio BOOLEAN DEFAULT TRUE, cantidad_g DECIMAL(6,2),
#   notas TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
#
# CREATE TABLE medicamentos_log (
#   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
#   estancia_id UUID, perro_id UUID REFERENCES perros(id),
#   fecha DATE NOT NULL, hora VARCHAR(10), medicamento VARCHAR(200) NOT NULL,
#   dosis VARCHAR(100), administrado_por VARCHAR(100),
#   created_at TIMESTAMPTZ DEFAULT NOW());
#
# CREATE TABLE personal (
#   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
#   nombre VARCHAR(100) NOT NULL, cargo VARCHAR(100),
#   telefono VARCHAR(20), activo BOOLEAN DEFAULT TRUE,
#   created_at TIMESTAMPTZ DEFAULT NOW());
#
# CREATE TABLE inventario_items (
#   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
#   nombre VARCHAR(100) NOT NULL, categoria VARCHAR(50),
#   unidad VARCHAR(20) DEFAULT 'piezas',
#   stock_actual DECIMAL(10,2) DEFAULT 0, stock_minimo DECIMAL(10,2) DEFAULT 0,
#   activo BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW());
#
# CREATE TABLE inventario_movimientos (
#   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
#   item_id UUID REFERENCES inventario_items(id),
#   tipo VARCHAR(10) NOT NULL, cantidad DECIMAL(10,2) NOT NULL,
#   motivo TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
#
# ALTER TABLE cargos ADD COLUMN IF NOT EXISTS descuento DECIMAL(10,2) DEFAULT 0;
# ALTER TABLE cargos ADD COLUMN IF NOT EXISTS descuento_motivo VARCHAR(200);
# ============================================================

# ============================================
# MODELOS: NUEVOS MÓDULOS
# ============================================

class NotaEstanciaCreate(BaseModel):
    estancia_id: str
    nota: str
    autor: Optional[str] = "Sistema"

class GroomingCatalogoCreate(BaseModel):
    nombre: str
    precio_base: float
    duracion_minutos: Optional[int] = 60
    descripcion: Optional[str] = None

class GroomingCitaCreate(BaseModel):
    perro_id: str
    catalogo_grooming_id: Optional[str] = None
    fecha: str
    hora: Optional[str] = None
    tipo_grooming: str
    precio: float
    estado: Optional[str] = "Pendiente"
    notas: Optional[str] = None

class AlimentacionCreate(BaseModel):
    estancia_id: Optional[str] = None
    perro_id: str
    fecha: str
    hora: Optional[str] = None
    comio: Optional[bool] = True
    cantidad_g: Optional[float] = None
    notas: Optional[str] = None

class MedicamentoLogCreate(BaseModel):
    estancia_id: Optional[str] = None
    perro_id: str
    fecha: str
    hora: Optional[str] = None
    medicamento: str
    dosis: Optional[str] = None
    administrado_por: Optional[str] = None

class PersonalCreate(BaseModel):
    nombre: str
    cargo: Optional[str] = None
    telefono: Optional[str] = None

class InventarioItemCreate(BaseModel):
    nombre: str
    categoria: Optional[str] = None
    unidad: Optional[str] = "piezas"
    stock_actual: Optional[float] = 0
    stock_minimo: Optional[float] = 0

class InventarioMovimientoCreate(BaseModel):
    item_id: str
    tipo: str  # "entrada" o "salida"
    cantidad: float
    motivo: Optional[str] = None

# ============================================
# ENDPOINTS: DASHBOARD OPERATIVO
# ============================================

@app.get("/dashboard/resumen-dia")
async def dashboard_resumen_dia(authorization: str = Header(None)):
    token = await verify_token(authorization)
    hoy = datetime.now().strftime("%Y-%m-%d")
    fecha_alerta = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")

    estancias_activas, checkouts_hoy, paseos_hoy, cargos_pend = await asyncio.gather(
        supabase_request("GET",
            "estancias?estado=eq.Activa&select=*,perros(id,nombre,foto_perro_url,propietarios(nombre,telefono))",
            token=token),
        supabase_request("GET",
            f"estancias?estado=eq.Activa&fecha_salida=lte.{hoy}&select=*,perros(id,nombre,propietarios(nombre,telefono))",
            token=token),
        supabase_request("GET",
            f"paseos?fecha=eq.{hoy}&select=*,perros(id,nombre,propietarios(nombre,telefono))",
            token=token),
        supabase_request("GET",
            "cargos?pagado=eq.false&select=monto,perro_id,concepto,perros(nombre)",
            token=token),
    )

    # Alertas de vacunas (vencidas o vencen en 30 días)
    vacunas_alertas = await supabase_request("GET",
        f"perros?activo=eq.true&or=(vacuna_rabia_vence.lte.{fecha_alerta},vacuna_sextuple_vence.lte.{fecha_alerta},vacuna_bordetella_vence.lte.{fecha_alerta})&select=id,nombre,propietarios(nombre,telefono),vacuna_rabia_vence,vacuna_sextuple_vence,vacuna_bordetella_vence,vacuna_giardia_vence",
        token=token)

    return {
        "fecha": hoy,
        "estancias_activas": estancias_activas or [],
        "checkouts_pendientes": checkouts_hoy or [],
        "paseos_hoy": paseos_hoy or [],
        "cargos_pendientes": cargos_pend or [],
        "monto_pendiente": sum(float(c.get("monto", 0)) for c in (cargos_pend or [])),
        "vacunas_alertas": vacunas_alertas or [],
    }

# ============================================
# ENDPOINTS: REPORTES MEJORADOS
# ============================================

@app.get("/reportes/ingresos")
async def reporte_ingresos(
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    authorization: str = Header(None)
):
    token = await verify_token(authorization)
    if not fecha_inicio:
        fecha_inicio = datetime.now().replace(day=1).strftime("%Y-%m-%d")
    if not fecha_fin:
        fecha_fin = datetime.now().strftime("%Y-%m-%d")

    tickets = await supabase_request("GET",
        f"tickets?fecha=gte.{fecha_inicio}&fecha=lte.{fecha_fin}&select=*,perros(nombre),propietarios(nombre)&order=fecha.desc",
        token=token)

    tickets = tickets or []
    total = sum(float(t.get("total", 0)) for t in tickets)

    por_dia: dict = {}
    por_metodo: dict = {}
    for t in tickets:
        dia = str(t.get("fecha", ""))[:10]
        metodo = t.get("metodo_pago", "Otro")
        por_dia[dia] = round(por_dia.get(dia, 0) + float(t.get("total", 0)), 2)
        por_metodo[metodo] = round(por_metodo.get(metodo, 0) + float(t.get("total", 0)), 2)

    return {
        "fecha_inicio": fecha_inicio,
        "fecha_fin": fecha_fin,
        "total": round(total, 2),
        "num_tickets": len(tickets),
        "tickets": tickets,
        "por_dia": [{"fecha": k, "total": v} for k, v in sorted(por_dia.items())],
        "por_metodo": [{"metodo": k, "total": v} for k, v in sorted(por_metodo.items(), key=lambda x: -x[1])],
    }

@app.get("/reportes/cargos-por-concepto")
async def reporte_cargos_concepto(
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    authorization: str = Header(None)
):
    token = await verify_token(authorization)
    if not fecha_inicio:
        fecha_inicio = datetime.now().replace(day=1).strftime("%Y-%m-%d")
    if not fecha_fin:
        fecha_fin = datetime.now().strftime("%Y-%m-%d")

    cargos = await supabase_request("GET",
        f"cargos?fecha_cargo=gte.{fecha_inicio}&fecha_cargo=lte.{fecha_fin}&select=concepto,monto,pagado",
        token=token)

    por_concepto: dict = {}
    for c in (cargos or []):
        key = c.get("concepto", "Otro")
        if key not in por_concepto:
            por_concepto[key] = {"concepto": key, "total": 0, "pagado": 0, "pendiente": 0}
        monto = float(c.get("monto", 0))
        por_concepto[key]["total"] = round(por_concepto[key]["total"] + monto, 2)
        if c.get("pagado"):
            por_concepto[key]["pagado"] = round(por_concepto[key]["pagado"] + monto, 2)
        else:
            por_concepto[key]["pendiente"] = round(por_concepto[key]["pendiente"] + monto, 2)

    return {
        "fecha_inicio": fecha_inicio,
        "fecha_fin": fecha_fin,
        "por_concepto": sorted(por_concepto.values(), key=lambda x: -x["total"]),
    }

@app.get("/reportes/ocupacion")
async def reporte_ocupacion(
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    authorization: str = Header(None)
):
    token = await verify_token(authorization)
    if not fecha_inicio:
        fecha_inicio = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not fecha_fin:
        fecha_fin = datetime.now().strftime("%Y-%m-%d")

    estancias, habitaciones = await asyncio.gather(
        supabase_request("GET",
            f"estancias?fecha_entrada=lte.{fecha_fin}&fecha_salida=gte.{fecha_inicio}&select=habitacion,fecha_entrada,fecha_salida,estado",
            token=token),
        supabase_request("GET", "catalogo_habitaciones?activo=eq.true&select=nombre,capacidad", token=token),
    )

    por_habitacion: dict = {}
    for e in (estancias or []):
        hab = e.get("habitacion") or "Sin asignar"
        por_habitacion[hab] = por_habitacion.get(hab, 0) + 1

    return {
        "fecha_inicio": fecha_inicio,
        "fecha_fin": fecha_fin,
        "total_estancias": len(estancias or []),
        "habitaciones": habitaciones or [],
        "por_habitacion": [{"habitacion": k, "estancias": v}
                           for k, v in sorted(por_habitacion.items(), key=lambda x: -x[1])],
    }

@app.get("/reportes/clientes-frecuentes")
async def reporte_clientes_frecuentes(authorization: str = Header(None)):
    token = await verify_token(authorization)
    estancias = await supabase_request("GET",
        "estancias?select=perro_id,perros(id,nombre,propietarios(id,nombre,telefono))&order=created_at.desc",
        token=token)

    conteo: dict = {}
    for e in (estancias or []):
        perro = e.get("perros") or {}
        pid = perro.get("id", "")
        if not pid:
            continue
        if pid not in conteo:
            conteo[pid] = {
                "perro_id": pid,
                "nombre": perro.get("nombre", ""),
                "propietario": (perro.get("propietarios") or {}).get("nombre", ""),
                "telefono": (perro.get("propietarios") or {}).get("telefono", ""),
                "visitas": 0
            }
        conteo[pid]["visitas"] += 1

    ranking = sorted(conteo.values(), key=lambda x: -x["visitas"])
    return {"clientes": ranking[:20]}

# ============================================
# ENDPOINTS: ALERTAS DE VACUNAS
# ============================================

@app.get("/alertas/vacunas")
async def alertas_vacunas(dias: int = 30, authorization: str = Header(None)):
    token = await verify_token(authorization)
    hoy = datetime.now().strftime("%Y-%m-%d")
    limite = (datetime.now() + timedelta(days=dias)).strftime("%Y-%m-%d")

    perros = await supabase_request("GET",
        f"perros?activo=eq.true&select=id,nombre,propietarios(nombre,telefono),vacuna_rabia_vence,vacuna_sextuple_vence,vacuna_bordetella_vence,vacuna_giardia_vence",
        token=token)

    alertas = []
    for p in (perros or []):
        vacunas_problema = []
        for campo, nombre_vac in [
            ("vacuna_rabia_vence", "Rabia"),
            ("vacuna_sextuple_vence", "Séxtuple"),
            ("vacuna_bordetella_vence", "Bordetella"),
            ("vacuna_giardia_vence", "Giardia"),
        ]:
            vence = p.get(campo)
            if vence and vence <= limite:
                vacunas_problema.append({
                    "vacuna": nombre_vac,
                    "vence": vence,
                    "vencida": vence < hoy
                })
        if vacunas_problema:
            alertas.append({
                "perro_id": p["id"],
                "nombre": p["nombre"],
                "propietario": (p.get("propietarios") or {}).get("nombre", ""),
                "telefono": (p.get("propietarios") or {}).get("telefono", ""),
                "vacunas": vacunas_problema
            })

    return {"alertas": alertas, "total": len(alertas)}

# ============================================
# ENDPOINTS: HISTORIAL POR PERRO
# ============================================

@app.get("/historial/perro/{perro_id}")
async def historial_perro(perro_id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)

    perro_data, estancias_h, paseos_h, tickets_h = await asyncio.gather(
        supabase_request("GET",
            f"perros?id=eq.{perro_id}&select=*,propietarios(*)",
            token=token),
        supabase_request("GET",
            f"estancias?perro_id=eq.{perro_id}&select=*&order=fecha_entrada.desc",
            token=token),
        supabase_request("GET",
            f"paseos?perro_id=eq.{perro_id}&select=*&order=fecha.desc",
            token=token),
        supabase_request("GET",
            f"tickets?perro_id=eq.{perro_id}&select=*&order=fecha.desc",
            token=token),
    )

    if not perro_data:
        raise HTTPException(status_code=404, detail="Perro no encontrado")

    total_pagado = sum(float(t.get("total", 0)) for t in (tickets_h or []))

    return {
        "perro": perro_data[0],
        "estancias": estancias_h or [],
        "paseos": paseos_h or [],
        "tickets": tickets_h or [],
        "total_pagado": round(total_pagado, 2),
        "num_visitas": len(estancias_h or []),
    }

# ============================================
# ENDPOINTS: VALIDAR CAPACIDAD HABITACIÓN
# ============================================

@app.get("/estancias/disponibilidad")
async def verificar_disponibilidad(
    habitacion: str,
    fecha_entrada: str,
    fecha_salida: str,
    authorization: str = Header(None)
):
    token = await verify_token(authorization)

    # Buscar estancias activas que se traslapen en esa habitación
    estancias_solapadas = await supabase_request("GET",
        f"estancias?habitacion=eq.{habitacion}&estado=eq.Activa&fecha_entrada=lt.{fecha_salida}&fecha_salida=gt.{fecha_entrada}&select=id,perros(nombre)",
        token=token)

    habitacion_info = await supabase_request("GET",
        f"catalogo_habitaciones?nombre=eq.{habitacion}&select=capacidad",
        token=token)

    capacidad = 1
    if habitacion_info:
        capacidad = habitacion_info[0].get("capacidad", 1)

    ocupadas = len(estancias_solapadas or [])
    disponible = ocupadas < capacidad

    return {
        "habitacion": habitacion,
        "capacidad": capacidad,
        "ocupadas": ocupadas,
        "disponible": disponible,
        "estancias_actuales": estancias_solapadas or [],
    }

# ============================================
# ENDPOINTS: NOTAS POR ESTANCIA
# ============================================

@app.get("/notas-estancia/{estancia_id}")
async def listar_notas_estancia(estancia_id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    return await supabase_request("GET",
        f"notas_estancia?estancia_id=eq.{estancia_id}&select=*&order=created_at.desc",
        token=token) or []

@app.post("/notas-estancia")
async def crear_nota_estancia(data: NotaEstanciaCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("POST", "notas_estancia", data.model_dump(exclude_none=True), token=token)
    return result[0] if result else None

@app.delete("/notas-estancia/{nota_id}")
async def eliminar_nota_estancia(nota_id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    await supabase_request("DELETE", f"notas_estancia?id=eq.{nota_id}", token=token)
    return {"message": "Nota eliminada"}

# ============================================
# ENDPOINTS: GROOMING
# ============================================

@app.get("/grooming/catalogo")
async def listar_catalogo_grooming(authorization: str = Header(None)):
    token = await verify_token(authorization)
    return await supabase_request("GET",
        "catalogo_grooming?activo=eq.true&select=*&order=nombre",
        token=token) or []

@app.post("/grooming/catalogo")
async def crear_grooming_catalogo(data: GroomingCatalogoCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("POST", "catalogo_grooming", data.model_dump(exclude_none=True), token=token)
    return result[0] if result else None

@app.put("/grooming/catalogo/{id}")
async def actualizar_grooming_catalogo(id: str, data: GroomingCatalogoCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("PATCH", f"catalogo_grooming?id=eq.{id}", data.model_dump(exclude_none=True), token=token)
    return result[0] if result else None

@app.delete("/grooming/catalogo/{id}")
async def eliminar_grooming_catalogo(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    await supabase_request("PATCH", f"catalogo_grooming?id=eq.{id}", {"activo": False}, token=token)
    return {"message": "Servicio de grooming desactivado"}

@app.get("/grooming/citas")
async def listar_grooming_citas(
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    perro_id: Optional[str] = None,
    estado: Optional[str] = None,
    authorization: str = Header(None)
):
    token = await verify_token(authorization)
    endpoint = "grooming_citas?select=*,perros(id,nombre,propietarios(nombre,telefono))&order=fecha.desc"
    if fecha_inicio:
        endpoint += f"&fecha=gte.{fecha_inicio}"
    if fecha_fin:
        endpoint += f"&fecha=lte.{fecha_fin}"
    if perro_id:
        endpoint += f"&perro_id=eq.{perro_id}"
    if estado:
        endpoint += f"&estado=eq.{estado}"
    return await supabase_request("GET", endpoint, token=token) or []

@app.post("/grooming/citas")
async def crear_grooming_cita(data: GroomingCitaCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("POST", "grooming_citas", data.model_dump(exclude_none=True), token=token)
    return result[0] if result else None

@app.put("/grooming/citas/{id}/estado")
async def actualizar_estado_grooming(id: str, estado: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("PATCH", f"grooming_citas?id=eq.{id}", {"estado": estado}, token=token)
    return result[0] if result else None

@app.post("/grooming/citas/{id}/enviar-caja")
async def enviar_grooming_caja(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    cita = await supabase_request("GET", f"grooming_citas?id=eq.{id}&select=*", token=token)
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    c = cita[0]
    cargo = {
        "perro_id": c["perro_id"],
        "fecha_cargo": datetime.now().strftime("%Y-%m-%d"),
        "fecha_servicio": c["fecha"],
        "concepto": f"Grooming: {c['tipo_grooming']}",
        "monto": c["precio"]
    }
    await supabase_request("POST", "cargos", cargo, token=token)
    await supabase_request("PATCH", f"grooming_citas?id=eq.{id}", {"enviado_caja": True, "estado": "Completado"}, token=token)
    return {"message": "Grooming enviado a caja"}

@app.delete("/grooming/citas/{id}")
async def eliminar_grooming_cita(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    await supabase_request("DELETE", f"grooming_citas?id=eq.{id}", token=token)
    return {"message": "Cita eliminada"}

# ============================================
# ENDPOINTS: ALIMENTACIÓN
# ============================================

@app.get("/alimentacion")
async def listar_alimentacion(
    perro_id: Optional[str] = None,
    fecha: Optional[str] = None,
    estancia_id: Optional[str] = None,
    authorization: str = Header(None)
):
    token = await verify_token(authorization)
    endpoint = "alimentacion_registro?select=*,perros(id,nombre)&order=created_at.desc"
    if perro_id:
        endpoint += f"&perro_id=eq.{perro_id}"
    if fecha:
        endpoint += f"&fecha=eq.{fecha}"
    if estancia_id:
        endpoint += f"&estancia_id=eq.{estancia_id}"
    return await supabase_request("GET", endpoint, token=token) or []

@app.post("/alimentacion")
async def crear_alimentacion(data: AlimentacionCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("POST", "alimentacion_registro", data.model_dump(exclude_none=True), token=token)
    return result[0] if result else None

@app.delete("/alimentacion/{id}")
async def eliminar_alimentacion(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    await supabase_request("DELETE", f"alimentacion_registro?id=eq.{id}", token=token)
    return {"message": "Registro eliminado"}

# ============================================
# ENDPOINTS: MEDICAMENTOS LOG
# ============================================

@app.get("/medicamentos-log")
async def listar_medicamentos_log(
    perro_id: Optional[str] = None,
    fecha: Optional[str] = None,
    authorization: str = Header(None)
):
    token = await verify_token(authorization)
    endpoint = "medicamentos_log?select=*,perros(id,nombre)&order=created_at.desc"
    if perro_id:
        endpoint += f"&perro_id=eq.{perro_id}"
    if fecha:
        endpoint += f"&fecha=eq.{fecha}"
    return await supabase_request("GET", endpoint, token=token) or []

@app.post("/medicamentos-log")
async def crear_medicamento_log(data: MedicamentoLogCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("POST", "medicamentos_log", data.model_dump(exclude_none=True), token=token)
    return result[0] if result else None

@app.delete("/medicamentos-log/{id}")
async def eliminar_medicamento_log(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    await supabase_request("DELETE", f"medicamentos_log?id=eq.{id}", token=token)
    return {"message": "Registro eliminado"}

# ============================================
# ENDPOINTS: PERSONAL
# ============================================

@app.get("/personal")
async def listar_personal(authorization: str = Header(None)):
    token = await verify_token(authorization)
    return await supabase_request("GET", "personal?activo=eq.true&select=*&order=nombre", token=token) or []

@app.post("/personal")
async def crear_personal(data: PersonalCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("POST", "personal", data.model_dump(exclude_none=True), token=token)
    return result[0] if result else None

@app.put("/personal/{id}")
async def actualizar_personal(id: str, data: PersonalCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("PATCH", f"personal?id=eq.{id}", data.model_dump(exclude_none=True), token=token)
    return result[0] if result else None

@app.delete("/personal/{id}")
async def desactivar_personal(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    await supabase_request("PATCH", f"personal?id=eq.{id}", {"activo": False}, token=token)
    return {"message": "Empleado desactivado"}

# ============================================
# ENDPOINTS: INVENTARIO
# ============================================

@app.get("/inventario")
async def listar_inventario(authorization: str = Header(None)):
    token = await verify_token(authorization)
    items = await supabase_request("GET", "inventario_items?activo=eq.true&select=*&order=nombre", token=token) or []
    # Marcar ítems bajo mínimo
    for item in items:
        item["bajo_minimo"] = float(item.get("stock_actual", 0)) <= float(item.get("stock_minimo", 0))
    return items

@app.post("/inventario")
async def crear_inventario_item(data: InventarioItemCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("POST", "inventario_items", data.model_dump(exclude_none=True), token=token)
    return result[0] if result else None

@app.put("/inventario/{id}")
async def actualizar_inventario_item(id: str, data: InventarioItemCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("PATCH", f"inventario_items?id=eq.{id}", data.model_dump(exclude_none=True), token=token)
    return result[0] if result else None

@app.delete("/inventario/{id}")
async def desactivar_inventario_item(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    await supabase_request("PATCH", f"inventario_items?id=eq.{id}", {"activo": False}, token=token)
    return {"message": "Ítem desactivado"}

@app.post("/inventario/movimiento")
async def registrar_movimiento_inventario(data: InventarioMovimientoCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)

    # Registrar movimiento
    await supabase_request("POST", "inventario_movimientos", data.model_dump(exclude_none=True), token=token)

    # Actualizar stock actual
    item = await supabase_request("GET", f"inventario_items?id=eq.{data.item_id}&select=stock_actual", token=token)
    if item:
        stock = float(item[0].get("stock_actual", 0))
        if data.tipo == "entrada":
            nuevo_stock = stock + data.cantidad
        else:
            nuevo_stock = max(0, stock - data.cantidad)
        await supabase_request("PATCH", f"inventario_items?id=eq.{data.item_id}",
                               {"stock_actual": nuevo_stock}, token=token)

    return {"message": f"Movimiento de {data.tipo} registrado"}

@app.get("/inventario/{id}/movimientos")
async def listar_movimientos_item(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    return await supabase_request("GET",
        f"inventario_movimientos?item_id=eq.{id}&select=*&order=created_at.desc&limit=50",
        token=token) or []
