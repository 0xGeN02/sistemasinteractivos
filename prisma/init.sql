-- CreateTable chat_sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT NOT NULL PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'study',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable chat_materials
CREATE TABLE IF NOT EXISTS chat_materials (
  id TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chat_materials_sessionId_fkey FOREIGN KEY ("sessionId") REFERENCES chat_sessions (id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS chat_materials_sessionId_idx ON chat_materials ("sessionId");
