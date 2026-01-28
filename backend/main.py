"""
ComfortCan México - API Backend
FastAPI + Supabase (via REST API)
"""

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os
from dotenv import load_dotenv
import httpx

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

app = FastAPI(
    title="ComfortCan México API",
    description="Sistema ERP para gestión de paseos caninos",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        return response.json() if response.text else None

class LoginRequest(BaseModel):
    email: str
    password: str

class PropietarioCreate(BaseModel):
    nombre: str
    apellido: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    notas: Optional[str] = None

class PerroCreate(BaseModel):
    propietario_id: str
    nombre: str
    raza: Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    peso_kg: Optional[float] = None
    sexo: Optional[str] = None
    color: Optional[str] = None
    esterilizado: Optional[bool] = False
    alergias: Optional[str] = None
    notas: Optional[str] = None

class PaseoCreate(BaseModel):
    perro_id: str
    catalogo_paseo_id: str
    fecha: str
    precio_cobrado: float
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    notas: Optional[str] = None

class CobrarRequest(BaseModel):
    paseos_ids: List[str]
    propietario_id: str
    metodo_pago: str = "Efectivo"
    notas: Optional[str] = None

class ReservaCreate(BaseModel):
    perro_id: str
    catalogo_paseo_id: str
    fecha_reserva: str
    hora_inicio: Optional[str] = None
    notas: Optional[str] = None

async def verify_token(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token requerido")
    return authorization.replace("Bearer ", "")

@app.get("/")
async def root():
    return {"message": "ComfortCan México API", "status": "running"}

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
    result = await supabase_request("POST", "propietarios", data.model_dump(), token=token)
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

@app.get("/perros")
async def listar_perros(propietario_id: Optional[str] = None, activo: Optional[bool] = True, authorization: str = Header(None)):
    token = await verify_token(authorization)
    endpoint = "perros?select=*,propietarios(nombre,apellido,telefono)&order=nombre"
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
    result = await supabase_request("POST", "perros", data.model_dump(), token=token)
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

@app.get("/catalogo-paseos")
async def listar_catalogo(authorization: str = Header(None)):
    token = await verify_token(authorization)
    return await supabase_request("GET", "catalogo_paseos?select=*&activo=eq.true&order=precio", token=token)

@app.get("/paseos")
async def listar_paseos(pagado: Optional[bool] = None, authorization: str = Header(None)):
    token = await verify_token(authorization)
    endpoint = "paseos?select=*,perros(nombre,propietario_id,propietarios(nombre,apellido,telefono)),catalogo_paseos(nombre,duracion_minutos)&order=fecha.desc"
    if pagado is not None:
        endpoint += f"&pagado=eq.{str(pagado).lower()}"
    return await supabase_request("GET", endpoint, token=token)

@app.get("/paseos/pendientes/{propietario_id}")
async def paseos_pendientes(propietario_id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    perros = await supabase_request("GET", f"perros?propietario_id=eq.{propietario_id}&select=id", token=token)
    if not perros:
        return []
    ids = ",".join([f'"{p["id"]}"' for p in perros])
    endpoint = f"paseos?perro_id=in.({ids})&pagado=eq.false&select=*,perros(nombre),catalogo_paseos(nombre)&order=fecha"
    return await supabase_request("GET", endpoint, token=token)

@app.post("/paseos")
async def crear_paseo(data: PaseoCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("POST", "paseos", data.model_dump(), token=token)
    return result[0] if result else None

@app.delete("/paseos/{id}")
async def eliminar_paseo(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    await supabase_request("DELETE", f"paseos?id=eq.{id}", token=token)
    return {"message": "Paseo eliminado"}

@app.post("/caja/cobrar")
async def cobrar(data: CobrarRequest, authorization: str = Header(None)):
    token = await verify_token(authorization)
    ids = ",".join([f'"{id}"' for id in data.paseos_ids])
    paseos = await supabase_request("GET", f"paseos?id=in.({ids})&select=*", token=token)
    if not paseos:
        raise HTTPException(status_code=404, detail="No se encontraron paseos")
    monto_total = sum(float(p["precio_cobrado"]) for p in paseos)
    for paseo_id in data.paseos_ids:
        await supabase_request("PATCH", f"paseos?id=eq.{paseo_id}", {"pagado": True}, token=token)
    cargo_data = {
        "propietario_id": data.propietario_id,
        "monto_total": monto_total,
        "metodo_pago": data.metodo_pago,
        "paseos_ids": data.paseos_ids,
        "notas": data.notas
    }
    cargo = await supabase_request("POST", "cargos", cargo_data, token=token)
    propietario = await supabase_request("GET", f"propietarios?id=eq.{data.propietario_id}", token=token)
    return {
        "cargo": cargo[0] if cargo else None,
        "paseos_cobrados": paseos,
        "propietario": propietario[0] if propietario else None,
        "monto_total": monto_total
    }

@app.get("/cargos")
async def listar_cargos(authorization: str = Header(None)):
    token = await verify_token(authorization)
    return await supabase_request("GET", "cargos?select=*,propietarios(nombre,apellido)&order=created_at.desc", token=token)

@app.delete("/cargos/{id}")
async def eliminar_cargo(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    cargo = await supabase_request("GET", f"cargos?id=eq.{id}", token=token)
    if cargo:
        for paseo_id in cargo[0]["paseos_ids"]:
            await supabase_request("PATCH", f"paseos?id=eq.{paseo_id}", {"pagado": False}, token=token)
    await supabase_request("DELETE", f"cargos?id=eq.{id}", token=token)
    return {"message": "Cargo eliminado"}

@app.get("/reservas")
async def listar_reservas(authorization: str = Header(None)):
    token = await verify_token(authorization)
    return await supabase_request("GET", "reservas?select=*,perros(nombre,propietarios(nombre,apellido,telefono)),catalogo_paseos(nombre,precio)&order=fecha_reserva", token=token)

@app.post("/reservas")
async def crear_reserva(data: ReservaCreate, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("POST", "reservas", data.model_dump(), token=token)
    return result[0] if result else None

@app.put("/reservas/{id}/estado")
async def actualizar_estado_reserva(id: str, estado: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    result = await supabase_request("PATCH", f"reservas?id=eq.{id}", {"estado": estado}, token=token)
    return result[0] if result else None

@app.delete("/reservas/{id}")
async def eliminar_reserva(id: str, authorization: str = Header(None)):
    token = await verify_token(authorization)
    await supabase_request("DELETE", f"reservas?id=eq.{id}", token=token)
    return {"message": "Reserva eliminada"}

@app.get("/reportes/resumen")
async def resumen(authorization: str = Header(None)):
    token = await verify_token(authorization)
    propietarios = await supabase_request("GET", "propietarios?activo=eq.true&select=id", token=token)
    perros = await supabase_request("GET", "perros?activo=eq.true&select=id", token=token)
    paseos_pendientes = await supabase_request("GET", "paseos?pagado=eq.false&select=precio_cobrado", token=token)
    primer_dia = datetime.now().replace(day=1).strftime("%Y-%m-%d")
    paseos_mes = await supabase_request("GET", f"paseos?fecha=gte.{primer_dia}&select=precio_cobrado", token=token)
    return {
        "total_propietarios": len(propietarios) if propietarios else 0,
        "total_perros": len(perros) if perros else 0,
        "paseos_mes": len(paseos_mes) if paseos_mes else 0,
        "ingresos_mes": sum(float(p["precio_cobrado"]) for p in paseos_mes) if paseos_mes else 0,
        "paseos_pendientes": len(paseos_pendientes) if paseos_pendientes else 0,
        "monto_pendiente": sum(float(p["precio_cobrado"]) for p in paseos_pendientes) if paseos_pendientes else 0
    }
