-- Migración: Agregar columna type a chat_sessions
-- Esta columna indica si el chat es de tipo "study" o "practice"

ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'study';

-- Actualizar chats existentes al tipo por defecto si es necesario
UPDATE chat_sessions SET type = 'study' WHERE type IS NULL OR type = '';
