# Análisis de Presentaciones con IA

## Nuevas Funcionalidades

### 1. Cronómetro Integrado ⏱️
Durante la grabación de tu presentación, se muestra un cronómetro en tiempo real que te permite:
- Controlar el tiempo de tu presentación
- Ver cuánto tiempo llevas hablando
- Recibir feedback sobre si la duración es apropiada (corta, óptima, o extensa)

### 2. Análisis de Video con Cámara 📹

#### Activación de la Cámara
Antes de comenzar a grabar, puedes activar la cámara para recibir análisis completo de tu lenguaje corporal y expresión durante la presentación.

#### Características del Análisis
El sistema analiza automáticamente:

1. **Nivel de Confianza** (1-10)
   - Evalúa qué tan seguro te ves durante la presentación
   - Proporciona una descripción de tu confianza

2. **Nivel de Nerviosismo** (1-10)
   - Detecta signos de nerviosismo
   - Identifica áreas donde puedes mejorar

3. **Postura Corporal**
   - Analiza si tu postura es adecuada
   - Sugiere mejoras en la posición del cuerpo

4. **Contacto Visual**
   - Evalúa si miras a la cámara apropiadamente
   - Sugiere cómo mejorar la conexión con la audiencia

5. **Expresiones Faciales**
   - Analiza si tus expresiones son apropiadas
   - Detecta si sonríes, frunces el ceño, etc.

6. **Sugerencias Personalizadas**
   - Recibe 3-5 consejos específicos para mejorar tu presentación
   - Basados en el análisis completo de tu desempeño

### Cómo Usar

1. **Preparación**
   - Ve a la sección de Estudio
   - Carga tu material de estudio

2. **Configuración**
   - Selecciona el idioma de reconocimiento (Español, Inglés o Mixto)
   - (Opcional) Activa la cámara para análisis de video

3. **Grabación**
   - Haz clic en "Empezar a hablar"
   - El cronómetro comenzará automáticamente
   - Si la cámara está activa, verás el indicador "REC"
   - Presenta tu temario con naturalidad

4. **Finalización**
   - Haz clic en "Detener y evaluar"
   - El sistema transcribirá tu audio
   - Analizará el contenido vs el material de estudio
   - Si hay video, analizará tu lenguaje corporal

5. **Resultados**
   - Verás un panel completo con:
     - Precisión del contenido (%)
     - Duración total de la presentación
     - Conceptos que faltaron
     - Conceptos incorrectos
     - Análisis de lenguaje corporal (si hay video)
     - Sugerencias personalizadas

## Requisitos Técnicos

### Backend
- **Ollama** con modelo de texto (ej: llama3.1)
- **Ollama** con modelo de visión (ej: llava) para análisis de video
- Multer para manejo de archivos
- Directorio `temp/` para almacenamiento temporal de videos

### Frontend
- Acceso a micrófono (Web Speech API)
- Acceso a cámara (opcional, MediaStream API)
- Navegadores compatibles: Chrome, Edge

## Variables de Entorno

```env
OLLAMA_MODEL=llama3.1        # Modelo para análisis de texto
VISION_MODEL=llava           # Modelo para análisis de video
```

## Notas Importantes

- El análisis de video es **opcional** - puedes hacer presentaciones sin cámara
- Los videos se procesan y eliminan inmediatamente después del análisis
- No se almacenan videos permanentemente
- El análisis es completamente privado y local (si usas Ollama local)
- La precisión del análisis de video depende de la calidad del modelo de visión

## Beneficios

✅ **Feedback integral**: Contenido + Presentación  
✅ **Mejora continua**: Identifica áreas específicas de mejora  
✅ **Práctica realista**: Simula presentaciones reales  
✅ **Control de tiempo**: Aprende a gestionar tu tiempo  
✅ **Confianza**: Practica hasta sentirte seguro  

## Próximas Mejoras

- [ ] Análisis de tono de voz
- [ ] Detección de muletillas
- [ ] Análisis de velocidad del habla
- [ ] Comparación histórica de presentaciones
- [ ] Gráficos de progreso en el tiempo
