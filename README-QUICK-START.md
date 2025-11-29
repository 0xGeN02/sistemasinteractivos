# 🚀 Quick Start - StudyAI

## Option 1: Docker (RECOMENDADO - Más fácil) ✅

### Prerequisitos
- Docker Desktop instalado: https://www.docker.com/products/docker-desktop

### Pasos
```bash
# 1. Inicia PostgreSQL en Docker (primera vez toma ~30 segundos)
docker-compose up -d

# 2. Verifica que está corriendo
docker-compose ps
# Deberías ver: postgres running en puerto 5432

# 3. Instala dependencias Node
npm install

# 4. Inicia la aplicación (frontend + backend)
npm run dev:full

# ✅ Listo! Abre http://localhost:5173
```

### Comandos útiles Docker
```bash
# Ver logs de PostgreSQL
docker-compose logs postgres

# Acceder a la base de datos
docker-compose exec postgres psql -U postgres -d studyai

# Detener PostgreSQL
docker-compose down

# Detener y eliminar datos (PELIGROSO)
docker-compose down -v
```

---

## Option 2: PostgreSQL Local (Si prefieres instalarlo directamente)

### Prerequisites (Arch Linux)
```bash
# Instalar PostgreSQL
sudo pacman -S postgresql

# Inicializar el cluster de datos
sudo -u postgres initdb -D /var/lib/postgres/data

# Iniciar el servicio
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Inicia automático en boot
```

### Pasos
```bash
# 1. Conectar como usuario postgres y crear base de datos
sudo -u postgres psql

# En la terminal psql, ejecuta:
CREATE DATABASE studyai;
\q

# 2. Ejecutar el schema SQL
psql -U postgres -d studyai -f prisma/init.sql

# 3. Verifica que las tablas se crearon
psql -U postgres -d studyai -c "\dt"
# Deberías ver: chat_materials y chat_sessions

# 4. Instala dependencias Node
npm install

# 5. Inicia la aplicación
npm run dev:full
```

### Comandos útiles PostgreSQL Local
```bash
# Conectar a la base de datos
psql -U postgres -d studyai

# Ver todas las bases de datos
psql -U postgres -l

# Ver tablas en StudyAI
psql -U postgres -d studyai -c "\dt"

# Eliminar base de datos (PELIGROSO)
sudo -u postgres dropdb studyai
```

---

## ¿Cuál elegir?

| | Docker | Local |
|---|--------|-------|
| **Setup** | 1 minuto | 5 minutos |
| **Limpieza** | `docker-compose down` | Manual cleanup |
| **Persistencia** | Volúmenes automáticos | Archivos del sistema |
| **Portabilidad** | Funciona en cualquier máquina | Depende del SO |
| **Para desarrollo** | ✅ RECOMENDADO | Funciona bien |

---

## Troubleshooting

### Error: "could not translate host name "localhost""
**Solución**: PostgreSQL no está corriendo
- Docker: `docker-compose up -d`
- Local: `sudo systemctl start postgresql`

### Error: "database does not exist"
**Solución**: La base de datos no se creó
- Docker: `docker-compose down -v && docker-compose up -d` (recrear)
- Local: `psql -U postgres -d studyai -f prisma/init.sql`

### Error: "permission denied"
**Solución**: Problemas de permisos de usuario
- Local: Asegúrate de ejecutar como sudo cuando sea necesario

### Error: "port 5432 already in use"
**Solución**: Otro proceso está usando el puerto
```bash
# Matar el proceso en puerto 5432
lsof -i :5432 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

---

## Próximos Pasos

1. ✅ PostgreSQL corriendo
2. ✅ Base de datos inicializada
3. Instala dependencias: `npm install`
4. Inicia con: `npm run dev:full`
5. Abre http://localhost:5173
6. Asegúrate que Ollama está corriendo (para IA features)

---

## Verificar Setup Completo

```bash
# 1. PostgreSQL corriendo?
docker-compose ps  # o: sudo systemctl status postgresql

# 2. Tablas creadas?
psql -U postgres -d studyai -c "\dt"

# 3. Backend inicia sin errores?
npm run server

# 4. Frontend inicia?
npm run dev

# 5. Backend responde?
curl http://localhost:3001/health
# Deberías ver: {"status":"OK"}
```

---

**¡Listo!** Tu aplicación está lista para usar 🎉
