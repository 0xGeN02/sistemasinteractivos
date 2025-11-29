# Setup Instructions for Study App with PostgreSQL

## Prerequisites

1. **PostgreSQL**: Must be installed and running on your system
   - Linux: `sudo apt-get install postgresql postgresql-contrib`
   - macOS: `brew install postgresql`
   - Windows: Download from https://www.postgresql.org/download/windows/

2. **Node.js**: Must have Node.js installed (v18 or later recommended)

3. **Ollama**: Must be running locally for LLM features
   - Download from: https://ollama.ai
   - Start with: `ollama serve`
   - Pull model: `ollama pull llama2`

## Setup Steps

### 1. Start PostgreSQL Service
```bash
# Linux
sudo service postgresql start

# macOS
brew services start postgresql

# Windows
# Usually starts automatically with the installer
```

### 2. Create Database
```bash
# Connect to PostgreSQL as default user
sudo -u postgres psql

# In the psql shell, run:
CREATE DATABASE studyai;
\q
```

### 3. Initialize Database Schema
```bash
# From the project directory
psql -U postgres -d studyai -f prisma/init.sql
```

You can verify the tables were created:
```bash
psql -U postgres -d studyai -c "\dt"
```

Should output:
```
            List of relations
 Schema |       Name       | Type  | Owner
--------+------------------+-------+-------
 public | chat_materials   | table | postgres
 public | chat_sessions    | table | postgres
```

### 4. Update Environment Variables
Edit `.env` file with your PostgreSQL credentials:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/studyai"
VITE_API_URL="http://localhost:3001"
```

Replace `password` with your PostgreSQL password (or leave empty if no password set).

### 5. Install Dependencies
```bash
npm install
```

### 6. Start Development Environment
```bash
# Start both frontend and backend together
npm run dev:full

# Or individually:
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
npm run server
```

### 7. Verify Setup
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/health (should return `{"status":"OK"}`)
- Database: Connected and initialized with tables

## Database Schema

### chat_sessions
- `id` (TEXT PRIMARY KEY): Unique session identifier
- `title` (TEXT): Chat title/name
- `createdAt` (TIMESTAMP): Creation timestamp
- `updatedAt` (TIMESTAMP): Last update timestamp

### chat_materials
- `id` (TEXT PRIMARY KEY): Unique material identifier
- `sessionId` (TEXT FK): Foreign key to chat_sessions
- `name` (TEXT): Material name
- `type` (TEXT): Material type ("pdf" or "text")
- `filePath` (TEXT): Path to stored file
- `content` (TEXT): Material content (first 5000 chars)
- `createdAt` (TIMESTAMP): Creation timestamp
- `updatedAt` (TIMESTAMP): Last update timestamp

## API Endpoints

### Chats
- `GET /api/chats` - Get all chats with materials
- `POST /api/chats` - Create new chat
- `GET /api/chats/:id` - Get single chat with materials
- `PUT /api/chats/:id` - Update chat title
- `DELETE /api/chats/:id` - Delete chat (cascade deletes materials)

### Materials
- `POST /api/chats/:id/materials` - Add material to chat
- `GET /api/materials/:id/content` - Get full material content
- `DELETE /api/materials/:id` - Delete material

## Troubleshooting

### Error: "could not translate host name "localhost" to address"
- Make sure PostgreSQL service is running
- Check connection string in `.env`

### Error: "database does not exist"
- Run: `psql -U postgres -d studyai -f prisma/init.sql`

### Error: "permission denied for schema public"
- Run: `psql -U postgres -d studyai -c "GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;"`

### Error: "Ollama connection refused"
- Make sure Ollama is running: `ollama serve`
- Default URL is http://localhost:11434

## File Storage

Material files are stored in: `data/materials/`
- PDF/text files are saved with timestamp prefix
- Files are deleted when materials are removed from database

## Development Tips

- Material content is stored in database (first 5000 chars) and also as files
- File storage ensures materials persist even if database connection fails temporarily
- Chat timestamps update automatically when materials are added/modified
- Cascade delete ensures no orphaned materials when chats are deleted
