"""
ComfortCan México - API Backend v2
Sistema ERP completo para hotel canino
"""

from fastapi import FastAPI, HTTPException, Header, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import os
from dotenv import load_dotenv
import httpx
import base64

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

app = FastAPI(
    title="ComfortCan México API",
    description="Sistema ERP para hotel canino",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    async with httpx.AsyncClient() as client:
        response = await client.request(
            method=method,
            url=url,
            headers=get_headers(token),
            json=data if data else None,
            timeout=30.0
        )
        if response.status_code >= 400:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        try:
            return response.json() if response.text else None
        except:
            return None

async def verify_token(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token requerido")
    return authorization.replace("Bearer ", "")

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

class ServicioCreate(BaseModel):
    nombre: str
    precio: float
    tipo_cobro: Optional[str] = "por_dia"  # "por_dia" o "unico"

class TipoPaseoCreate(BaseModel):
    nombre: str
    duracion_minutos: Optional[int] = None
    precio: float

# ============================================
# ENDPOINTS: AUTH
# ============================================

@app.get("/")
async def root():
    return {"message": "ComfortCan México API v2", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/login")
async def login(request: LoginRequest):
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
            json={"email": request.email, "password": request.password}
        )
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Credenciales inválidas")
        data = response.json()
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
# ENDPOINTS: ESTANCIAS (CHECK-IN)
# ============================================

@app.get("/estancias")
async def listar_estancias(estado: Optional[str] = None, authorization: str = Header(None)):
    token = await verify_token(authorization)
    endpoint = "estancias?select=*,perros(id,nombre,propietarios(nombre,telefono))&order=fecha_entrada.desc"
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

    # Leer archivo
    contents = await file.read()

    # Nombre único - usar extensión del archivo original
    extension = file.filename.split('.')[-1].lower() if '.' in file.filename else 'jpg'
    filename = f"perros/{perro_id}_{int(datetime.now().timestamp())}.{extension}"

    # Subir a Supabase Storage
    storage_url = f"{SUPABASE_URL}/storage/v1/object/fotos/{filename}"

    async with httpx.AsyncClient() as client:
        # Primero intentar subir (upsert)
        response = await client.post(
            storage_url,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": file.content_type or "image/jpeg",
                "x-upsert": "true"  # Sobrescribir si existe
            },
            content=contents,
            timeout=30.0
        )

        if response.status_code >= 400:
            error_detail = response.text
            print(f"Error subiendo foto: {response.status_code} - {error_detail}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Error subiendo foto: {error_detail}. Verifica que el bucket 'fotos' exista y tenga políticas correctas."
            )

    # URL publica
    foto_url = f"{SUPABASE_URL}/storage/v1/object/public/fotos/{filename}"

    # Actualizar perro con la URL directamente usando service key
    print(f"Actualizando perro {perro_id} con foto_url: {foto_url}")

    # Usar supabase_request que ya funciona correctamente
    print(f"Usando supabase_request para actualizar perro...")
    try:
        result = await supabase_request(
            "PATCH",
            f"perros?id=eq.{perro_id}",
            {"foto_perro_url": foto_url},
            token=SUPABASE_KEY
        )
        print(f"Update result: {result}")
    except Exception as e:
        print(f"Error en update: {e}")

    print(f"Foto de perro subida: {foto_url}")
    return {"url": foto_url, "message": "Foto subida correctamente"}

@app.post("/upload/foto-cartilla/{perro_id}")
async def upload_foto_cartilla(perro_id: str, file: UploadFile = File(...), authorization: str = Header(None)):
    token = await verify_token(authorization)

    contents = await file.read()

    extension = file.filename.split('.')[-1].lower() if '.' in file.filename else 'jpg'
    filename = f"cartillas/{perro_id}_{int(datetime.now().timestamp())}.{extension}"

    storage_url = f"{SUPABASE_URL}/storage/v1/object/fotos/{filename}"

    async with httpx.AsyncClient() as client:
        response = await client.post(
            storage_url,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": file.content_type or "image/jpeg",
                "x-upsert": "true"
            },
            content=contents,
            timeout=30.0
        )

        if response.status_code >= 400:
            error_detail = response.text
            print(f"Error subiendo cartilla: {response.status_code} - {error_detail}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Error subiendo cartilla: {error_detail}. Verifica que el bucket 'fotos' exista y tenga políticas correctas."
            )

    foto_url = f"{SUPABASE_URL}/storage/v1/object/public/fotos/{filename}"
    await supabase_request("PATCH", f"perros?id=eq.{perro_id}", {"foto_cartilla_url": foto_url}, token=SUPABASE_KEY)

    print(f"Cartilla subida: {foto_url}")
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
        async with httpx.AsyncClient() as client:
            response = await client.get(
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
    
    propietarios = await supabase_request("GET", "propietarios?activo=eq.true&select=id", token=token)
    perros = await supabase_request("GET", "perros?activo=eq.true&select=id", token=token)
    estancias_activas = await supabase_request("GET", "estancias?estado=eq.Activa&select=id", token=token)
    cargos_pendientes = await supabase_request("GET", "cargos?pagado=eq.false&select=monto", token=token)
    
    primer_dia = datetime.now().replace(day=1).strftime("%Y-%m-%d")
    tickets_mes = await supabase_request("GET", f"tickets?fecha=gte.{primer_dia}&select=total", token=token)
    
    return {
        "total_propietarios": len(propietarios) if propietarios else 0,
        "total_perros": len(perros) if perros else 0,
        "estancias_activas": len(estancias_activas) if estancias_activas else 0,
        "cargos_pendientes": len(cargos_pendientes) if cargos_pendientes else 0,
        "monto_pendiente": sum(float(c["monto"]) for c in cargos_pendientes) if cargos_pendientes else 0,
        "ingresos_mes": sum(float(t["total"]) for t in tickets_mes) if tickets_mes else 0
    }
