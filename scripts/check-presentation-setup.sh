#!/bin/bash

# Script de verificación para el sistema de análisis de presentaciones

echo "🔍 Verificando sistema de análisis de presentaciones..."
echo ""

# Verificar Node.js
echo "✓ Node.js version:"
node --version
echo ""

# Verificar dependencias npm
echo "✓ Verificando dependencias npm..."
if [ -d "node_modules" ]; then
    echo "  - node_modules existe"
    
    if [ -d "node_modules/multer" ]; then
        echo "  - multer instalado ✓"
    else
        echo "  - multer NO instalado ✗"
        echo "    Ejecuta: npm install"
    fi
    
    if [ -d "node_modules/ollama" ]; then
        echo "  - ollama instalado ✓"
    else
        echo "  - ollama NO instalado ✗"
        echo "    Ejecuta: npm install"
    fi
else
    echo "  - node_modules NO existe ✗"
    echo "    Ejecuta: npm install"
fi
echo ""

# Verificar directorio temp
echo "✓ Verificando directorios..."
if [ -d "temp" ]; then
    echo "  - temp/ existe ✓"
else
    echo "  - temp/ NO existe, creando..."
    mkdir -p temp
    echo "  - temp/ creado ✓"
fi
echo ""

# Verificar Ollama
echo "✓ Verificando Ollama..."
if command -v ollama &> /dev/null; then
    echo "  - Ollama CLI instalado ✓"
    
    # Verificar si Ollama está corriendo
    if curl -s http://localhost:11434/api/tags &> /dev/null; then
        echo "  - Ollama server corriendo ✓"
        
        # Verificar modelos
        echo ""
        echo "  Modelos disponibles:"
        curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | sed 's/^/    - /'
        
        echo ""
        echo "  💡 Modelos recomendados:"
        echo "    - Para texto: llama3.1, mistral, phi3"
        echo "    - Para video: llava, bakllava"
        echo ""
        echo "  Para instalar un modelo:"
        echo "    ollama pull llama3.1"
        echo "    ollama pull llava"
    else
        echo "  - Ollama server NO está corriendo ✗"
        echo "    Inicia Ollama con: ollama serve"
    fi
else
    echo "  - Ollama NO instalado ✗"
    echo "    Instala desde: https://ollama.ai"
fi
echo ""

# Verificar archivo .env
echo "✓ Verificando configuración..."
if [ -f ".env" ]; then
    echo "  - .env existe ✓"
    
    if grep -q "OLLAMA_MODEL" .env; then
        MODEL=$(grep "OLLAMA_MODEL" .env | cut -d'=' -f2)
        echo "  - OLLAMA_MODEL configurado: $MODEL"
    else
        echo "  - OLLAMA_MODEL no configurado (usará llama3.1 por defecto)"
    fi
    
    if grep -q "VISION_MODEL" .env; then
        VISION=$(grep "VISION_MODEL" .env | cut -d'=' -f2)
        echo "  - VISION_MODEL configurado: $VISION"
    else
        echo "  - VISION_MODEL no configurado (usará llava por defecto)"
    fi
else
    echo "  - .env NO existe"
    echo "  - Creando .env con valores por defecto..."
    echo "OLLAMA_MODEL=llama3.1" > .env
    echo "VISION_MODEL=llava" >> .env
    echo "  - .env creado ✓"
fi
echo ""

echo "=========================================="
echo "📋 Resumen"
echo "=========================================="
echo ""
echo "Para usar el análisis de presentaciones:"
echo ""
echo "1. Asegúrate de que Ollama esté corriendo:"
echo "   ollama serve"
echo ""
echo "2. Instala los modelos necesarios:"
echo "   ollama pull llama3.1  # Para análisis de texto"
echo "   ollama pull llava     # Para análisis de video"
echo ""
echo "3. Inicia el servidor:"
echo "   npm run dev:full"
echo ""
echo "4. En la aplicación:"
echo "   - Ve a la sección de Estudio"
echo "   - Carga tu material"
echo "   - (Opcional) Activa la cámara"
echo "   - Haz clic en 'Empezar a hablar'"
echo "   - Presenta tu temario"
echo "   - Haz clic en 'Detener y evaluar'"
echo ""
echo "=========================================="
