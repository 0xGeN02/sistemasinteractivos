#!/bin/bash

# Script para verificar y configurar Ollama

echo "🔍 Verificando instalación de Ollama..."
echo ""

# Verificar si Ollama está instalado
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama no está instalado"
    echo ""
    echo "Para instalar Ollama:"
    echo "  Linux: curl -fsSL https://ollama.com/install.sh | sh"
    echo "  Mac: brew install ollama"
    echo "  O visita: https://ollama.com/download"
    exit 1
fi

echo "✅ Ollama está instalado"
echo ""

# Verificar si Ollama está corriendo
if ! curl -s http://localhost:11434/api/version > /dev/null 2>&1; then
    echo "⚠️  Ollama no está corriendo"
    echo ""
    echo "Para iniciar Ollama:"
    echo "  ollama serve"
    echo ""
    echo "Iniciando Ollama..."
    ollama serve &
    sleep 3
fi

echo "✅ Ollama está corriendo"
echo ""

# Listar modelos instalados
echo "📦 Modelos instalados:"
ollama list
echo ""

# Verificar modelo configurado en .env
if [ -f .env ]; then
    MODEL=$(grep OLLAMA_MODEL .env | cut -d'=' -f2 | tr -d '"' | tr -d ' ')
    if [ -n "$MODEL" ]; then
        echo "🎯 Modelo configurado en .env: $MODEL"
        
        # Verificar si el modelo está instalado
        if ollama list | grep -q "^$MODEL"; then
            echo "✅ El modelo $MODEL está instalado"
        else
            echo "⚠️  El modelo $MODEL NO está instalado"
            echo ""
            echo "¿Quieres instalarlo ahora? (s/n)"
            read -r response
            if [[ "$response" == "s" ]] || [[ "$response" == "S" ]]; then
                echo "Instalando $MODEL..."
                ollama pull "$MODEL"
            fi
        fi
    else
        echo "⚠️  OLLAMA_MODEL no configurado en .env"
        echo "Por defecto se usará: llama3.1"
    fi
else
    echo "⚠️  Archivo .env no encontrado"
fi

echo ""
echo "🎯 Modelos recomendados:"
echo ""
echo "  Para mejor calidad:"
echo "    ollama pull llama3.1        (~4.7GB, excelente)"
echo "    ollama pull qwen2.5:7b      (~4.4GB, muy bueno con JSON)"
echo ""
echo "  Para equipos con pocos recursos:"
echo "    ollama pull llama3.2:3b     (~2GB, rápido)"
echo "    ollama pull phi3:mini       (~2.3GB, muy rápido)"
echo ""
echo "✅ Configuración completa"
echo ""
echo "Para cambiar el modelo, edita el archivo .env:"
echo "  OLLAMA_MODEL=\"nombre-del-modelo\""
