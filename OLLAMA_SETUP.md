# Configuración de Ollama para StudyAI

Este proyecto usa **Ollama** localmente para todas las funciones de IA, sin necesidad de OpenAI.

## 📋 Modelos Recomendados

### Para Evaluación de Recitaciones (usado actualmente)

El proyecto está configurado para usar `llama3.1` por defecto. Aquí las opciones:

#### 🥇 Recomendado: **llama3.1:8b** o **llama3.2:3b**
```bash
# Instalar llama3.1 (modelo de 8B parámetros - ~4.7GB)
ollama pull llama3.1

# O llama3.2 (más ligero, 3B parámetros - ~2GB)
ollama pull llama3.2:3b
```

**Ventajas:**
- Excelente comprensión de texto en español
- Bueno siguiendo instrucciones de formato JSON
- Balance perfecto entre calidad y velocidad

#### 🥈 Alternativa: **qwen2.5:7b**
```bash
ollama pull qwen2.5:7b
```

**Ventajas:**
- Muy bueno con instrucciones estructuradas
- Excelente en generar JSON
- Rápido

#### 🥉 Opción Ligera: **phi3:mini**
```bash
ollama pull phi3:mini
```

**Ventajas:**
- Muy rápido (~2GB)
- Bueno para feedback básico
- Ideal para equipos con pocos recursos

## 🚀 Comandos Útiles

### Ver modelos instalados
```bash
ollama list
```

### Instalar un modelo
```bash
ollama pull <nombre-del-modelo>
```

### Probar un modelo
```bash
ollama run llama3.1
```

### Eliminar un modelo que no uses
```bash
ollama rm <nombre-del-modelo>
```

## ⚙️ Cambiar el Modelo en el Proyecto

Edita el archivo `reciteRoutes.ts` y cambia la línea:

```typescript
const response = await ollama.chat({
  model: "llama3.1",  // <-- Cambia aquí el nombre del modelo
  messages: [{ role: "user", content: prompt }],
});
```

Puedes usar cualquier modelo que tengas instalado:
- `llama3.1`
- `llama3.2:3b`
- `qwen2.5:7b`
- `phi3:mini`
- etc.

## 🔧 Variables de Entorno

En tu archivo `.env`, puedes configurar:

```env
# NO necesitas estas si usas solo Ollama:
# OPENAI_API_KEY=sk-...
# LOCAL_WHISPER_URL=http://...

# Ollama se conecta automáticamente a localhost:11434
```

## 📊 Comparación de Modelos

| Modelo | Tamaño | RAM Recomendada | Velocidad | Calidad |
|--------|--------|-----------------|-----------|---------|
| llama3.1 | ~4.7GB | 8GB+ | Media | Excelente |
| llama3.2:3b | ~2GB | 4GB+ | Rápida | Muy Buena |
| qwen2.5:7b | ~4.4GB | 8GB+ | Media | Excelente |
| phi3:mini | ~2.3GB | 4GB+ | Muy Rápida | Buena |

## 🎯 Recomendación Final

**Para mejor experiencia:**
```bash
ollama pull llama3.1
```

**Si tienes PC con pocos recursos:**
```bash
ollama pull llama3.2:3b
```

## 🐛 Solución de Problemas

### Ollama no responde
```bash
# Verificar que Ollama está corriendo
ollama serve

# O en segundo plano (Linux/Mac)
ollama serve &
```

### El modelo no genera JSON válido
- Prueba con `qwen2.5:7b` que es mejor siguiendo formatos estructurados
- O mejora el prompt en `reciteRoutes.ts`

### Respuestas muy lentas
- Usa un modelo más pequeño como `llama3.2:3b` o `phi3:mini`
- Verifica que no estés usando CPU en lugar de GPU

## 🎙️ Transcripción de Audio

El proyecto usa **Web Speech API** integrada en el navegador:

- ✅ **Gratis** - Sin costo
- ✅ **Sin configuración** - Ya incluida en Chrome/Edge
- ✅ **Tiempo real** - Transcripción mientras hablas
- ✅ **Español** - Configurado para español (es-ES)

**Navegadores compatibles:**
- ✅ Chrome
- ✅ Edge
- ✅ Safari (con webkit)
- ⚠️ Firefox (soporte limitado)

No necesitas instalar nada adicional.

## ✅ Estado Actual del Proyecto

- ✅ Ollama configurado para evaluación de recitaciones
- ✅ Modelo por defecto: `llama3.1`
- ✅ Transcripción con Web Speech API (integrada en navegador)
- ✅ Todo funciona localmente sin APIs externas
- ✅ Cero configuración adicional necesaria

## 🔄 Próximos Pasos Recomendados

1. **Instalar modelo recomendado:**

   ```bash
   ollama pull llama3.1
   ```

2. **Verificar que Ollama está corriendo:**

   ```bash
   ollama list
   ```

3. **Probar el sistema:**
   - Crear un chat de estudio
   - Agregar material
   - Click en "Empezar a hablar"
   - Explicar el material en voz alta
   - Ver el feedback de Ollama en tiempo real

4. **¡Listo!** No necesitas configurar nada más
