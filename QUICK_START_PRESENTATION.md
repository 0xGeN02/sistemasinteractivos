# Guía Rápida: Análisis de Presentaciones con IA

## ⚡ Instalación Rápida

### 1. Instalar Ollama
```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Mac
brew install ollama

# Windows: https://ollama.com/download
```

### 2. Instalar Modelos de IA

```bash
# Modelo para análisis de texto (requerido)
ollama pull llama3.1

# Modelo para análisis de video (opcional, pero recomendado)
ollama pull llava
```

### 3. Iniciar Ollama

```bash
ollama serve
```

### 4. Configurar Proyecto

```bash
# Copiar configuración de ejemplo
cp .env.example .env

# Instalar dependencias
npm install

# Iniciar base de datos
docker-compose up -d

# Aplicar migraciones
docker-compose exec -T postgres psql -U postgres -d studyai < prisma/init.sql
docker-compose exec -T postgres psql -U postgres -d studyai < prisma/add_type_column.sql
```

### 5. Verificar Configuración

```bash
# Verificar Ollama y modelos
bash scripts/check-ollama.sh

# Verificar sistema completo de presentaciones
bash scripts/check-presentation-setup.sh
```

### 6. Iniciar Aplicación

```bash
npm run dev:full
```

## 🎯 Usar Análisis de Presentaciones

### Paso 1: Preparar Material
1. Ve a la sección **Estudio**
2. Crea un nuevo chat
3. Carga tu material de estudio (texto o PDF)

### Paso 2: Configurar Grabación
1. Selecciona el idioma (Español, Inglés o Mixto)
2. **(Opcional)** Activa la cámara para análisis de video
   - Si la cámara está activa, verás una vista previa
   - El sistema analizará tu lenguaje corporal

### Paso 3: Grabar Presentación
1. Haz clic en **"Empezar a hablar"**
2. El cronómetro iniciará automáticamente
3. Presenta tu temario con naturalidad
4. Si la cámara está activa, verás el indicador "REC"

### Paso 4: Recibir Feedback
1. Haz clic en **"Detener y evaluar"**
2. Espera mientras el sistema:
   - Transcribe tu audio
   - Analiza el contenido
   - Analiza el video (si está disponible)
3. Revisa tu feedback detallado:
   - **Precisión del contenido** (0-100%)
   - **Duración** de la presentación
   - **Conceptos faltantes** o incorrectos
   - **Análisis de video** (si hay cámara):
     - Nivel de confianza (1-10)
     - Nivel de nerviosismo (1-10)
     - Análisis de postura
     - Contacto visual
     - Expresiones faciales
     - Sugerencias personalizadas

## 💡 Consejos

### Para Mejor Reconocimiento de Voz
- Habla claro y a ritmo moderado
- Reduce el ruido de fondo
- Usa auriculares con micrófono si es posible
- En "modo mixto" puedes mezclar español e inglés

### Para Mejor Análisis de Video
- Asegúrate de tener buena iluminación
- Posiciona la cámara a la altura de los ojos
- Mantén tu rostro visible en el encuadre
- Evita movimientos bruscos

### Para Mejorar tu Presentación
- Practica varias veces y observa el progreso
- Presta atención al cronómetro para controlar el tiempo
- Lee las sugerencias del análisis de video
- Trabaja en los conceptos que te faltan

## 🔧 Solución de Problemas

### "No se pudo acceder a la cámara"
- Verifica los permisos del navegador
- Asegúrate de que ninguna otra app esté usando la cámara
- Usa Chrome o Edge para mejor compatibilidad

### "Tu navegador no soporta reconocimiento de voz"
- Usa Chrome o Edge (no funciona en Firefox)
- Verifica que estés usando HTTPS o localhost

### "Error al analizar con Ollama"
- Verifica que Ollama esté corriendo: `ollama list`
- Comprueba que los modelos estén instalados
- Revisa los logs del servidor backend

### Análisis de video muy lento
- El modelo llava puede ser pesado
- Considera usar un modelo más ligero
- El análisis es opcional, puedes desactivar la cámara

## 📊 Modelos Recomendados

### Para Análisis de Texto
| Modelo | RAM | Velocidad | Calidad |
|--------|-----|-----------|---------|
| llama3.1 | 8GB | Media | ⭐⭐⭐⭐⭐ |
| mistral | 8GB | Rápida | ⭐⭐⭐⭐ |
| phi3 | 4GB | Muy rápida | ⭐⭐⭐ |

### Para Análisis de Video
| Modelo | RAM | Velocidad | Calidad |
|--------|-----|-----------|---------|
| llava | 8GB | Lenta | ⭐⭐⭐⭐⭐ |
| bakllava | 8GB | Media | ⭐⭐⭐⭐ |

## 📚 Más Información

- [README.md](./README.md) - Documentación completa
- [PRESENTATION_ANALYSIS.md](./PRESENTATION_ANALYSIS.md) - Detalles del análisis
- [OLLAMA_SETUP.md](./OLLAMA_SETUP.md) - Configuración avanzada de Ollama

## 🎓 Ejemplos de Uso

### Práctica de Presentaciones
- Prepara una presentación de 5 minutos
- Grábate con la cámara activa
- Analiza tu confianza y nerviosismo
- Practica hasta mejorar tu score

### Estudio de Exámenes
- Carga el temario del examen
- Explícalo en voz alta sin cámara
- Verifica qué conceptos te faltan
- Repite hasta alcanzar 80%+ de precisión

### Mejora de Oratoria
- Activa solo la cámara
- Enfócate en el análisis de video
- Trabaja en postura y contacto visual
- Practica hasta sentirte cómodo

---

**¿Problemas?** Consulta la documentación completa o ejecuta los scripts de verificación.
