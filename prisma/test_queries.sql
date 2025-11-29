-- SQL Testing Script for StudyAI
-- This script contains useful queries for testing and debugging

-- View all chats with material count
SELECT 
  cs.id,
  cs.title,
  COUNT(cm.id) as material_count,
  cs."createdAt",
  cs."updatedAt"
FROM chat_sessions cs
LEFT JOIN chat_materials cm ON cs.id = cm."sessionId"
GROUP BY cs.id, cs.title, cs."createdAt", cs."updatedAt"
ORDER BY cs."updatedAt" DESC;

-- View all materials for a specific chat (replace 'chat-id' with actual ID)
SELECT 
  cm.id,
  cm.name,
  cm.type,
  cm."filePath",
  LENGTH(cm.content) as content_length,
  cm."createdAt"
FROM chat_materials cm
WHERE cm."sessionId" = 'chat-id'
ORDER BY cm."createdAt" DESC;

-- View chat with full material details in JSON format
SELECT cs.*, 
  json_agg(json_build_object(
    'id', cm.id,
    'name', cm.name,
    'type', cm.type,
    'filePath', cm."filePath",
    'content', cm.content,
    'createdAt', cm."createdAt"
  )) FILTER (WHERE cm.id IS NOT NULL) as materials
FROM chat_sessions cs
LEFT JOIN chat_materials cm ON cs.id = cm."sessionId"
WHERE cs.id = 'chat-id'
GROUP BY cs.id;

-- Count total materials
SELECT COUNT(*) as total_materials FROM chat_materials;

-- Find orphaned materials (shouldn't exist with CASCADE DELETE)
SELECT cm.* FROM chat_materials cm
WHERE cm."sessionId" NOT IN (SELECT id FROM chat_sessions);

-- Delete all test data (WARNING: DESTRUCTIVE)
-- DELETE FROM chat_sessions;
-- DELETE FROM chat_materials;

-- Check disk usage of stored files
-- SELECT SUM(LENGTH(content)) as total_bytes FROM chat_materials;

-- List all files in materials directory (Linux)
-- SELECT DISTINCT "filePath" FROM chat_materials ORDER BY "filePath";
