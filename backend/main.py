"""
ComfortCan México - API Backend
FastAPI + Supabase
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, time
from decimal import Decimal
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Cargar variables de entorno
load_dotenv()

# Configuración Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

# Cliente Supabase (service role para operaciones del servidor)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Inicializar FastAPI
app = FastAPI(
    title="ComfortCan México API",
    description="Sistema ERP para gestión de paseos caninos",
    version="1.0.0"
)

# CORS - Permitir todas las origenes para desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# MODELOS PYDANTIC
# ============================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    user_id: str
    email: str

class PropietarioCreate(BaseModel):
    nombre: str
    apellido: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    notas: Optional[str] = None

class PropietarioUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    notas: Optional[str] = None
    activo: Optional[bool] = None

class PerroCreate(BaseModel):
    propietario_id: str
    nombre: str
    raza: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    peso_kg: Optional[float] = None
    sexo: Optional[str] = None
    color: Optional[str] = None
    esterilizado: Optional[bool] = False
    vacunas: Optional[list] = []
    condiciones_medicas: Optional[list] = []
    alergias: Optional[str] = None
    veterinario_contacto: Optional[str] = None
    notas: Optional[str] = None

class PerroUpdate(BaseModel):
    nombre: Optional[str] = None
    raza: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    peso_kg: Optional[float] = None
    sexo: Optional[str] = None
    color: Optional[str] = None
    esterilizado: Optional[bool] = None
    vacunas: Optional[list] = None
    condiciones_medicas: Optional[list] = None
    alergias: Optional[str] = None
    veterinario_contacto: Optional[str] = None
    notas: Optional[str] = None
    activo: Optional[bool] = None

class PaseoCreate(BaseModel):
    perro_id: str
    catalogo_paseo_id: str
    fecha: date
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    precio_cobrado: float
    notas: Optional[str] = None

class PaseoUpdate(BaseModel):
    fecha: Optional[date] = None
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    precio_cobrado: Optional[float] = None
    pagado: Optional[bool] = None
    notas: Optional[str] = None

class CobrarRequest(BaseModel):
    paseos_ids: List[str]
    propietario_id: str
    metodo_pago: str = "Efectivo"
    notas: Optional[str] = None

class ReservaCreate(BaseModel):
    perro_id: str
    catalogo_paseo_id: str
    fecha_reserva: date
    hora_inicio: Optional[str] = None
    notas: Optional[str] = None

class CatalogoCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    duracion_minutos: int
    precio: float

# ============================================
# HELPERS
# ============================================

async def verificar_token(authorization: str = Header(None)):
    """Verificar token JWT de Supabase"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Token no proporcionado")
    
    try:
        token = authorization.replace("Bearer ", "")
        # Crear cliente con el token del usuario
        user_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        user = user_client.auth.get_user(token)
        if not user:
            raise HTTPException(status_code=401, detail="Token inválido")
        return user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Error de autenticación: {str(e)}")

# ============================================
# ENDPOINTS: AUTENTICACIÓN
# ============================================

@app.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Iniciar sesión con email y contraseña"""
    try:
        response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        
        return LoginResponse(
            access_token=response.session.access_token,
            user_id=response.user.id,
            email=response.user.email
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Credenciales inválidas: {str(e)}")

@app.post("/logout")
async def logout(user = Depends(verificar_token)):
    """Cerrar sesión"""
    try:
        supabase.auth.sign_out()
        return {"message": "Sesión cerrada exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# ENDPOINTS: PROPIETARIOS
# ============================================

@app.get("/propietarios")
async def listar_propietarios(
    activo: Optional[bool] = None,
    user = Depends(verificar_token)
):
    """Listar todos los propietarios"""
    try:
        query = supabase.table("propietarios").select("*").order("nombre")
        if activo is not None:
            query = query.eq("activo", activo)
        response = query.execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/propietarios/{id}")
async def obtener_propietario(id: str, user = Depends(verificar_token)):
    """Obtener un propietario por ID"""
    try:
        response = supabase.table("propietarios").select("*").eq("id", id).single().execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=404, detail="Propietario no encontrado")

@app.post("/propietarios")
async def crear_propietario(propietario: PropietarioCreate, user = Depends(verificar_token)):
    """Crear nuevo propietario"""
    try:
        data = propietario.model_dump()
        data["user_id"] = user.user.id
        response = supabase.table("propietarios").insert(data).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/propietarios/{id}")
async def actualizar_propietario(
    id: str, 
    propietario: PropietarioUpdate,
    user = Depends(verificar_token)
):
    """Actualizar propietario"""
    try:
        data = {k: v for k, v in propietario.model_dump().items() if v is not None}
        response = supabase.table("propietarios").update(data).eq("id", id).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/propietarios/{id}")
async def eliminar_propietario(id: str, user = Depends(verificar_token)):
    """Eliminar propietario (soft delete)"""
    try:
        response = supabase.table("propietarios").update({"activo": False}).eq("id", id).execute()
        return {"message": "Propietario desactivado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# ENDPOINTS: PERROS
# ============================================

@app.get("/perros")
async def listar_perros(
    propietario_id: Optional[str] = None,
    activo: Optional[bool] = None,
    user = Depends(verificar_token)
):
    """Listar perros con filtros opcionales"""
    try:
        query = supabase.table("perros").select(
            "*, propietarios(nombre, apellido, telefono)"
        ).order("nombre")
        
        if propietario_id:
            query = query.eq("propietario_id", propietario_id)
        if activo is not None:
            query = query.eq("activo", activo)
            
        response = query.execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/perros/{id}")
async def obtener_perro(id: str, user = Depends(verificar_token)):
    """Obtener perro por ID"""
    try:
        response = supabase.table("perros").select(
            "*, propietarios(nombre, apellido, telefono, email)"
        ).eq("id", id).single().execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=404, detail="Perro no encontrado")

@app.post("/perros")
async def crear_perro(perro: PerroCreate, user = Depends(verificar_token)):
    """Crear nuevo perro"""
    try:
        data = perro.model_dump()
        if data.get("fecha_nacimiento"):
            data["fecha_nacimiento"] = str(data["fecha_nacimiento"])
        response = supabase.table("perros").insert(data).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/perros/{id}")
async def actualizar_perro(id: str, perro: PerroUpdate, user = Depends(verificar_token)):
    """Actualizar perro"""
    try:
        data = {k: v for k, v in perro.model_dump().items() if v is not None}
        if data.get("fecha_nacimiento"):
            data["fecha_nacimiento"] = str(data["fecha_nacimiento"])
        response = supabase.table("perros").update(data).eq("id", id).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/perros/{id}")
async def eliminar_perro(id: str, user = Depends(verificar_token)):
    """Eliminar perro (soft delete)"""
    try:
        response = supabase.table("perros").update({"activo": False}).eq("id", id).execute()
        return {"message": "Perro desactivado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# ENDPOINTS: CATÁLOGO DE PASEOS
# ============================================

@app.get("/catalogo-paseos")
async def listar_catalogo(activo: Optional[bool] = True, user = Depends(verificar_token)):
    """Listar tipos de paseo"""
    try:
        query = supabase.table("catalogo_paseos").select("*").order("precio")
        if activo is not None:
            query = query.eq("activo", activo)
        response = query.execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/catalogo-paseos")
async def crear_tipo_paseo(catalogo: CatalogoCreate, user = Depends(verificar_token)):
    """Crear tipo de paseo"""
    try:
        response = supabase.table("catalogo_paseos").insert(catalogo.model_dump()).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/catalogo-paseos/{id}")
async def actualizar_tipo_paseo(id: str, catalogo: CatalogoCreate, user = Depends(verificar_token)):
    """Actualizar tipo de paseo"""
    try:
        response = supabase.table("catalogo_paseos").update(catalogo.model_dump()).eq("id", id).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# ENDPOINTS: PASEOS
# ============================================

@app.get("/paseos")
async def listar_paseos(
    perro_id: Optional[str] = None,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    pagado: Optional[bool] = None,
    user = Depends(verificar_token)
):
    """Listar paseos con filtros"""
    try:
        query = supabase.table("paseos").select(
            "*, perros(nombre, propietario_id, propietarios(nombre, apellido, telefono)), catalogo_paseos(nombre, duracion_minutos)"
        ).order("fecha", desc=True)
        
        if perro_id:
            query = query.eq("perro_id", perro_id)
        if fecha_inicio:
            query = query.gte("fecha", str(fecha_inicio))
        if fecha_fin:
            query = query.lte("fecha", str(fecha_fin))
        if pagado is not None:
            query = query.eq("pagado", pagado)
            
        response = query.execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/paseos/pendientes/{propietario_id}")
async def listar_paseos_pendientes(propietario_id: str, user = Depends(verificar_token)):
    """Listar paseos no pagados de un propietario"""
    try:
        # Primero obtener los perros del propietario
        perros = supabase.table("perros").select("id").eq("propietario_id", propietario_id).execute()
        perro_ids = [p["id"] for p in perros.data]
        
        if not perro_ids:
            return []
        
        # Luego obtener paseos pendientes
        response = supabase.table("paseos").select(
            "*, perros(nombre), catalogo_paseos(nombre)"
        ).in_("perro_id", perro_ids).eq("pagado", False).order("fecha").execute()
        
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/paseos")
async def crear_paseo(paseo: PaseoCreate, user = Depends(verificar_token)):
    """Registrar nuevo paseo"""
    try:
        data = paseo.model_dump()
        data["fecha"] = str(data["fecha"])
        response = supabase.table("paseos").insert(data).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/paseos/{id}")
async def actualizar_paseo(id: str, paseo: PaseoUpdate, user = Depends(verificar_token)):
    """Actualizar paseo"""
    try:
        data = {k: v for k, v in paseo.model_dump().items() if v is not None}
        if data.get("fecha"):
            data["fecha"] = str(data["fecha"])
        response = supabase.table("paseos").update(data).eq("id", id).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/paseos/{id}")
async def eliminar_paseo(id: str, user = Depends(verificar_token)):
    """Eliminar paseo"""
    try:
        response = supabase.table("paseos").delete().eq("id", id).execute()
        return {"message": "Paseo eliminado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# ENDPOINTS: CAJA (COBROS)
# ============================================

@app.post("/caja/cobrar")
async def cobrar_paseos(request: CobrarRequest, user = Depends(verificar_token)):
    """
    Cobrar múltiples paseos en una transacción.
    1. Actualiza paseos a pagado=True
    2. Crea registro en cargos
    """
    try:
        # Obtener paseos para calcular total
        paseos = supabase.table("paseos").select("*").in_("id", request.paseos_ids).execute()
        
        if not paseos.data:
            raise HTTPException(status_code=404, detail="No se encontraron paseos")
        
        # Calcular monto total
        monto_total = sum(float(p["precio_cobrado"]) for p in paseos.data)
        
        # Actualizar paseos a pagado
        for paseo_id in request.paseos_ids:
            supabase.table("paseos").update({"pagado": True}).eq("id", paseo_id).execute()
        
        # Crear registro de cargo
        cargo_data = {
            "propietario_id": request.propietario_id,
            "monto_total": monto_total,
            "metodo_pago": request.metodo_pago,
            "paseos_ids": request.paseos_ids,
            "notas": request.notas
        }
        
        cargo = supabase.table("cargos").insert(cargo_data).execute()
        
        # Obtener datos completos para el ticket
        propietario = supabase.table("propietarios").select("*").eq("id", request.propietario_id).single().execute()
        
        return {
            "cargo": cargo.data[0],
            "paseos_cobrados": paseos.data,
            "propietario": propietario.data,
            "monto_total": monto_total
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cargos")
async def listar_cargos(
    propietario_id: Optional[str] = None,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    user = Depends(verificar_token)
):
    """Listar cargos/cobros"""
    try:
        query = supabase.table("cargos").select(
            "*, propietarios(nombre, apellido)"
        ).order("created_at", desc=True)
        
        if propietario_id:
            query = query.eq("propietario_id", propietario_id)
        if fecha_inicio:
            query = query.gte("created_at", str(fecha_inicio))
        if fecha_fin:
            query = query.lte("created_at", str(fecha_fin) + "T23:59:59")
            
        response = query.execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/cargos/{id}")
async def eliminar_cargo(id: str, user = Depends(verificar_token)):
    """
    Eliminar cargo (para corregir errores).
    También revierte los paseos a no pagados.
    """
    try:
        # Obtener el cargo para saber qué paseos revertir
        cargo = supabase.table("cargos").select("*").eq("id", id).single().execute()
        
        if not cargo.data:
            raise HTTPException(status_code=404, detail="Cargo no encontrado")
        
        # Revertir paseos a no pagados
        for paseo_id in cargo.data["paseos_ids"]:
            supabase.table("paseos").update({"pagado": False}).eq("id", paseo_id).execute()
        
        # Eliminar el cargo
        supabase.table("cargos").delete().eq("id", id).execute()
        
        return {"message": "Cargo eliminado y paseos revertidos a pendientes"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# ENDPOINTS: RESERVAS
# ============================================

@app.get("/reservas")
async def listar_reservas(
    fecha: Optional[date] = None,
    estado: Optional[str] = None,
    user = Depends(verificar_token)
):
    """Listar reservas"""
    try:
        query = supabase.table("reservas").select(
            "*, perros(nombre, propietarios(nombre, apellido, telefono)), catalogo_paseos(nombre, precio)"
        ).order("fecha_reserva")
        
        if fecha:
            query = query.eq("fecha_reserva", str(fecha))
        if estado:
            query = query.eq("estado", estado)
            
        response = query.execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/reservas")
async def crear_reserva(reserva: ReservaCreate, user = Depends(verificar_token)):
    """Crear reserva"""
    try:
        data = reserva.model_dump()
        data["fecha_reserva"] = str(data["fecha_reserva"])
        response = supabase.table("reservas").insert(data).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/reservas/{id}/estado")
async def actualizar_estado_reserva(
    id: str, 
    estado: str,
    user = Depends(verificar_token)
):
    """Actualizar estado de reserva"""
    try:
        response = supabase.table("reservas").update({"estado": estado}).eq("id", id).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/reservas/{id}")
async def eliminar_reserva(id: str, user = Depends(verificar_token)):
    """Eliminar reserva"""
    try:
        response = supabase.table("reservas").delete().eq("id", id).execute()
        return {"message": "Reserva eliminada"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# ENDPOINTS: REPORTES/ESTADÍSTICAS
# ============================================

@app.get("/reportes/resumen")
async def obtener_resumen(user = Depends(verificar_token)):
    """Resumen general del negocio"""
    try:
        # Total propietarios activos
        propietarios = supabase.table("propietarios").select("id", count="exact").eq("activo", True).execute()
        
        # Total perros activos
        perros = supabase.table("perros").select("id", count="exact").eq("activo", True).execute()
        
        # Paseos del mes actual
        from datetime import datetime
        hoy = datetime.now()
        primer_dia = hoy.replace(day=1).strftime("%Y-%m-%d")
        
        paseos_mes = supabase.table("paseos").select("precio_cobrado").gte("fecha", primer_dia).execute()
        ingresos_mes = sum(float(p["precio_cobrado"]) for p in paseos_mes.data)
        
        # Paseos pendientes de cobro
        pendientes = supabase.table("paseos").select("precio_cobrado").eq("pagado", False).execute()
        total_pendiente = sum(float(p["precio_cobrado"]) for p in pendientes.data)
        
        return {
            "total_propietarios": propietarios.count,
            "total_perros": perros.count,
            "paseos_mes": len(paseos_mes.data),
            "ingresos_mes": ingresos_mes,
            "paseos_pendientes": len(pendientes.data),
            "monto_pendiente": total_pendiente
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# HEALTH CHECK
# ============================================

@app.get("/health")
async def health_check():
    """Verificar que la API está funcionando"""
    return {"status": "healthy", "service": "ComfortCan México API"}

@app.get("/")
async def root():
    """Endpoint raíz"""
    return {
        "message": "ComfortCan México API",
        "version": "1.0.0",
        "docs": "/docs"
    }
