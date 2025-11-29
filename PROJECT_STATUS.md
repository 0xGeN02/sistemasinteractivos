# StudyAI - Project Architecture & Status

## Overview

StudyAI es una aplicación web de estudio inteligente con:
- **Frontend**: React + Vite + TypeScript + Radix UI
- **Backend**: Express + TypeScript
- **Database**: PostgreSQL con cliente directo `pg` (sin ORM)
- **LLM**: Ollama local (modelo: llama2)

## Current Architecture

### Frontend Structure

#### App.tsx (Root Component)
- Gestiona 2 pestañas principales: **Estudio** y **Práctica**
- Estado: `currentMaterial` (contenido combinado), `materialAdded` (bandera)
- La pestaña "Práctica" se habilita solo después de agregar material

#### Components

**1. StudyMaterial.tsx**
- 3 secciones funcionales:
  1. **PDF Upload**: Drag & drop area para subir múltiples PDFs
  2. **Text Context**: Textarea para notas/definiciones adicionales
  3. **Combined Materials**: Vista previa de todos los materiales con botón "Comenzar a Estudiar"
- State management:
  - `uploadedPdfs`: Array de PDFs con contenido
  - `textMaterial`: Contenido de notas
  - `combinedMaterialContent`: String combinado de todo
- Funciones clave:
  - `handleDrop()`: Procesa PDFs arrastrados
  - `combinedMaterialContent`: Getter que combina todos los materiales
- **Status**: ✅ Completamente implementado

**2. ReciteStudy.tsx**
- Estudiante recita material memorizado
- Evaluación en tiempo real con Ollama
- State:
  - `recitation`: Textarea input del estudiante
  - `evaluation`: Objeto con score, feedback, strengths[], improvements[]
- Llamada a API: POST `http://localhost:11434/api/generate` con modelo "llama2"
- Respuesta esperada: JSON con `{score: 0-100, feedback: string, strengths: [], improvements: []}`
- **Status**: ✅ Completamente implementado

**3. PracticeTesting.tsx**
- Generador dinámico de preguntas desde Ollama
- Flujo: Pregunta → Respuesta → Evaluación → Siguiente
- State:
  - `questions`: Array de 5 preguntas
  - `testResults`: Tracking de respuestas correctas/incorrectas
  - `currentQuestionIndex`: Índice actual
- **Status**: ✅ Completamente implementado

**4. ChatHistory.tsx**
- UI component para historial de chats
- Features: 
  - Lista todos los chats
  - Expandible para ver materiales
  - Botón para crear nuevo chat
  - Botón delete con confirmación
- **Status**: ✅ Creado pero NO integrado en App.tsx

#### Hooks

**useChatHistory.ts**
- React hook para gestionar estado de chat history
- Métodos: fetchChats, createChat, getChat, updateChat, deleteChat, addMaterial, getMaterialContent, deleteMaterial
- Base URL: Desde `VITE_API_URL` en .env
- **Status**: ✅ Completamente implementado, esperando backend

### Backend Structure

#### server.ts
- Express server en puerto 3001 (configurable con PORT env)
- **Middleware**: CORS, JSON parser (50mb limit)
- **Database**: Pool de conexión PostgreSQL
- **File Storage**: `data/materials/` directorio local

**Endpoints Implementados** (8 total):

```
// CHATS (4 endpoints)
GET  /api/chats                 - Obtener todos con materiales anidados
POST /api/chats                 - Crear nuevo chat
GET  /api/chats/:id            - Obtener un chat con materiales
PUT  /api/chats/:id            - Actualizar título del chat
DELETE /api/chats/:id          - Eliminar chat (cascade delete de materiales)

// MATERIALS (3 endpoints)
POST /api/chats/:id/materials  - Agregar material a un chat
GET  /api/materials/:id/content - Obtener contenido completo de material
DELETE /api/materials/:id      - Eliminar material y archivo

// HEALTH
GET /health                    - Health check
```

**Query Pattern**:
```typescript
// Todos los chats con materiales anidados en JSON
SELECT cs.*, 
  json_agg(json_build_object(...)) FILTER (WHERE cm.id IS NOT NULL) as materials
FROM chat_sessions cs
LEFT JOIN chat_materials cm ON cs.id = cm."sessionId"
GROUP BY cs.id
```

#### prisma/init.sql
- Esquema SQL para crear tablas:
  - `chat_sessions`: Sesiones de estudio con timestamps
  - `chat_materials`: Materiales asociados a sesiones
- **Status**: ✅ Listo para ejecutar, requiere `psql -f`

#### .env
- `DATABASE_URL`: Conexión PostgreSQL (requiere credentials reales)
- `VITE_API_URL`: URL del backend para frontend
- **Status**: ✅ Estructura correcta, necesita valores reales

### Database Schema

```sql
-- chat_sessions
id (PK TEXT)
title (TEXT)
createdAt (TIMESTAMP)
updatedAt (TIMESTAMP)

-- chat_materials (FK cascade delete)
id (PK TEXT)
sessionId (FK to chat_sessions)
name (TEXT)
type (TEXT) -- "pdf" | "text"
filePath (TEXT)
content (TEXT) -- first 5000 chars
createdAt (TIMESTAMP)
updatedAt (TIMESTAMP)
```

## Workflow Actual (Sin Persistencia)

```
1. Usuario abre app (App.tsx)
   ↓
2. Ve pestaña "Estudio" con StudyMaterial.tsx
   ↓
3. Sube PDFs (StudyMaterial: drag & drop)
   ↓
4. Agrega notas de texto (StudyMaterial: textarea)
   ↓
5. Clickea "Comenzar a Estudiar"
   → combinedMaterialContent se crea
   → material pasa a ReciteStudy y PracticeTesting
   ↓
6. En pestaña "Práctica", usuario puede:
   - Recitar: Submit → Ollama evalúa → Score + feedback
   - Practicar: Ollama genera 5 preguntas → Usuario responde → Feedback inmediato
   ↓
7. Cierra browser → TODO SE PIERDE (sin base de datos aún)
```

## Workflow Deseado (Con Persistencia)

```
1. Usuario abre app
   ↓
2. ChatHistory muestra sesiones previas (desde DB)
   ↓
3. Opción A: Crear nuevo chat → nuevo ID
   Opción B: Seleccionar chat anterior → carga materiales
   ↓
4. Agrega/modifica materiales
   ↓
5. Clickea "Comenzar a Estudiar"
   → POST /api/chats/:id/materials para cada material
   → Archivos guardados en data/materials/
   → Contenido guardado en chat_materials
   ↓
6. En ReciteStudy/PracticeTesting:
   → Material está guardado en DB
   → Puede cerrar/reabrir sin perder progreso
   ↓
7. ChatHistory muestra historial completo
```

## Implementation Status

### ✅ Completed
- [x] React frontend con 2 tabs (Estudio, Práctica)
- [x] StudyMaterial con PDF drag-drop + text input
- [x] ReciteStudy component con Ollama integration
- [x] PracticeTesting component con LLM questions
- [x] useChatHistory hook (estructura completa)
- [x] ChatHistory component UI
- [x] Express backend con PostgreSQL client
- [x] 8 API endpoints con SQL queries
- [x] Esquema de base de datos (init.sql)
- [x] Package.json dependencies limpias
- [x] TypeScript tipos correctos

### 🔄 In Progress / Pending
- [ ] PostgreSQL database creada e inicializada
  - **Blocker**: No hay PostgreSQL instalado en el sistema
  - **Solución**: `sudo apt-get install postgresql` + `createdb studyai`
  
- [ ] Integrar ChatHistory en App.tsx
  - **Requiere**: Réplica del layout con sidebar o modal
  - **Lógica**: onSelectChat → loadMaterials → updateStudyMaterial
  
- [ ] Conectar StudyMaterial hook a useChatHistory
  - **Requiere**: Cuando clickea "Comenzar a Estudiar"
  - **Acción**: POST /api/chats + POST /api/chats/:id/materials
  
- [ ] Crear chat ID en App.tsx
  - **Requiere**: State para currentChatId
  - **Flujo**: Crear chat vacío → Guardar materiales a ese chat

- [ ] Testing E2E
  - [ ] Crear chat
  - [ ] Subir 3 PDFs + texto
  - [ ] Comenzar estudio
  - [ ] Recitar y practicar
  - [ ] Cerrar y reabrir chat anterior
  - [ ] Verificar materiales persisten

## Development Environment Setup

### Prerequisites
```bash
# 1. PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# 2. Node.js (v18+)
node --version

# 3. Ollama running
ollama serve &
ollama pull llama2
```

### Quick Start
```bash
# 1. Initialize database
sudo -u postgres psql
> CREATE DATABASE studyai;
> \q

# 2. Load schema
psql -U postgres -d studyai -f prisma/init.sql

# 3. Update .env with real credentials
# DATABASE_URL="postgresql://postgres:password@localhost:5432/studyai"

# 4. Install & run
npm install
npm run dev:full  # Frontend + Backend
```

## Próximos Pasos Recomendados

### Fase 1: Database & Backend Validation (30 min)
1. Instalar PostgreSQL
2. Crear base de datos `studyai`
3. Ejecutar `init.sql`
4. Verificar tablas: `psql -d studyai -c "\dt"`
5. Iniciar servidor: `npm run server`
6. Probar endpoints:
   ```bash
   curl http://localhost:3001/health
   curl -X POST http://localhost:3001/api/chats \
     -H "Content-Type: application/json" \
     -d '{"title":"Test Chat"}'
   ```

### Fase 2: Frontend Integration (45 min)
1. Integrar ChatHistory en App.tsx (sidebar o modal)
2. Conectar useChatHistory hook a StudyMaterial
3. Modificar StudyMaterial para:
   - Crear chat al iniciar sesión
   - POST materiales cuando clickea "Comenzar a Estudiar"
   - Cargar materiales de chat existente

### Fase 3: End-to-End Testing (30 min)
1. Crear nuevo chat desde UI
2. Subir 3+ PDFs
3. Agregar notas de texto
4. Recitar y practicar (Ollama)
5. Recargar página → Verificar que materiales persisten
6. Abrir chat anterior → Debe cargar materiales

### Fase 4: Polish & Deployment (Future)
- [ ] Error handling mejorado
- [ ] Loading states en UI
- [ ] Confirmaciones de borrado
- [ ] Search en historial
- [ ] Export de transcripts
- [ ] Dark mode refinement

## Key File Locations

```
/home/xgen0/Downloads/Study App Web Design/
├── server.ts                     # Backend Express (✅ READY)
├── .env                          # Environment config (⚠️ NEEDS CREDENTIALS)
├── package.json                  # Dependencies (✅ CLEAN)
├── prisma/
│   └── init.sql                  # DB schema (✅ READY)
├── src/
│   ├── App.tsx                   # Root component (🔄 NEEDS CHATHISTORY)
│   ├── components/
│   │   ├── StudyMaterial.tsx     # ✅ READY
│   │   ├── ReciteStudy.tsx       # ✅ READY
│   │   ├── PracticeTesting.tsx   # ✅ READY
│   │   └── ChatHistory.tsx       # ✅ READY (NOT INTEGRATED)
│   └── hooks/
│       └── useChatHistory.ts     # ✅ READY (NEEDS BACKEND)
└── SETUP_POSTGRES.md             # Setup guide (✅ CREATED)
```

## Technology Stack Summary

| Layer | Technology | Version | Status |
|-------|-----------|---------|--------|
| Frontend Build | Vite | 6.3.5 | ✅ |
| Frontend Runtime | React | 18.3.1 | ✅ |
| Frontend Lang | TypeScript | 5.9.3 | ✅ |
| UI Components | Radix UI | ^1.x | ✅ |
| Backend Framework | Express | 5.1.0 | ✅ |
| Backend DB Client | pg | 8.16.3 | ✅ |
| Database | PostgreSQL | 12+ | ⏳ INSTALL |
| LLM | Ollama | local | ✅ (if running) |
| Icons | lucide-react | 0.487.0 | ✅ |
| Dev Tools | tsx, concurrently | latest | ✅ |

---

**Last Updated**: After converting Prisma to direct PostgreSQL
**Status**: Ready for database setup and backend testing
