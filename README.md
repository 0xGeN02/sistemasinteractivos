# StudyAI - Aplicación de Estudio con IA Local

Aplicación web para estudiar con asistencia de IA completamente local usando **Ollama**.

## 🚀 Inicio Rápido

### 1. Instalar Ollama

```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Mac
brew install ollama

# Windows: Descargar desde https://ollama.com/download
```

### 2. Instalar un modelo de IA

```bash
# Recomendado (mejor calidad)
ollama pull llama3.1

# O si tienes pocos recursos
ollama pull llama3.2:3b
```

### 3. Iniciar Ollama

```bash
ollama serve
```

### 4. Configurar el proyecto

```bash
# Instalar dependencias
npm install

# Iniciar base de datos
docker-compose up -d

# Aplicar migraciones
docker-compose exec -T postgres psql -U postgres -d studyai < prisma/init.sql
docker-compose exec -T postgres psql -U postgres -d studyai < prisma/add_type_column.sql
```

### 5. Verificar configuración de Ollama

```bash
# Script automático de verificación
bash scripts/check-ollama.sh

# O manual
ollama list  # Ver modelos instalados
```

### 6. Ejecutar la aplicación

```bash
npm run dev:full
```

La aplicación estará disponible en:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## ⚙️ Configuración

Edita el archivo `.env` para cambiar el modelo de IA:

```env
# Modelo de Ollama (recomendado: llama3.1, llama3.2:3b, qwen2.5:7b)
OLLAMA_MODEL="llama3.1"
```

## 📚 Modelos Recomendados

| Modelo | Tamaño | RAM | Velocidad | Uso |
|--------|--------|-----|-----------|-----|
| **llama3.1** | ~4.7GB | 8GB+ | Media | ⭐ Mejor calidad |
| **llama3.2:3b** | ~2GB | 4GB+ | Rápida | ⚡ Equipos limitados |
| **qwen2.5:7b** | ~4.4GB | 8GB+ | Media | 📊 Excelente con JSON |
| **phi3:mini** | ~2.3GB | 4GB+ | Muy rápida | 🏃 Muy ligero |

Ver más detalles en [OLLAMA_SETUP.md](./OLLAMA_SETUP.md)

## 🎯 Características

- ✅ **100% Local** - Sin APIs externas, todo en tu máquina
- 🎙️ **Grabación de audio** - Explica el temario con tu voz
- 🤖 **Evaluación con IA** - Ollama analiza tu explicación
- 📊 **Feedback detallado** - Precisión, conceptos faltantes y errores
- 💾 **Base de datos** - Historial de chats y materiales persistentes
- 📄 **Soporte PDF** - Carga y estudia desde PDFs

## 🛠️ Tecnologías

- **Frontend:** React + TypeScript + Vite + TailwindCSS
- **Backend:** Express + TypeScript + PostgreSQL
- **IA:** Ollama (LLama3.1/3.2)
- **Base de datos:** PostgreSQL (Docker)

## 📖 Cómo Usar

1. **Crear un chat** de estudio o práctica
2. **Agregar material** (texto o PDF)
3. **Grabar tu explicación** del temario
4. **Recibir feedback** instantáneo de la IA

## 🔧 Scripts Útiles

```bash
# Desarrollo completo (frontend + backend + hot reload)
npm run dev:full

# Solo frontend
npm run dev

# Solo backend
npm run server

# Verificar Ollama
bash scripts/check-ollama.sh

# Base de datos
docker-compose up -d       # Iniciar
docker-compose down        # Detener
docker-compose logs -f     # Ver logs
```

## 📝 Solución de Problemas

Ver [OLLAMA_SETUP.md](./OLLAMA_SETUP.md) para:
- Problemas con Ollama
- Cambiar modelo de IA
- Configuración de Whisper local
- Optimización de rendimiento

## 🔐 Privacidad

Todo funciona localmente:
- ✅ Sin enviar datos a servicios externos
- ✅ Sin necesidad de API keys
- ✅ Tus datos nunca salen de tu máquina
  