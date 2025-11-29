.PHONY: help docker-up docker-down docker-logs db-init db-reset db-shell install dev dev-full clean

help:
	@echo "StudyAI - Available Commands"
	@echo ""
	@echo "🐳 Docker Commands:"
	@echo "  make docker-up       - Start PostgreSQL with Docker Compose"
	@echo "  make docker-down     - Stop PostgreSQL"
	@echo "  make docker-logs     - View PostgreSQL logs"
	@echo ""
	@echo "📦 Database Commands:"
	@echo "  make db-init         - Initialize database schema"
	@echo "  make db-reset        - Drop and recreate database"
	@echo "  make db-shell        - Open PostgreSQL shell"
	@echo ""
	@echo "🚀 Development Commands:"
	@echo "  make install         - Install npm dependencies"
	@echo "  make dev             - Start frontend dev server (port 5173)"
	@echo "  make server          - Start backend server (port 3001)"
	@echo "  make dev-full        - Start both frontend + backend"
	@echo "  make clean           - Remove node_modules and build artifacts"
	@echo ""

# Docker
docker-up:
	docker-compose up -d
	@echo "✅ PostgreSQL running on localhost:5432"

docker-down:
	docker-compose down
	@echo "✅ PostgreSQL stopped"

docker-logs:
	docker-compose logs -f postgres

docker-reset:
	docker-compose down -v
	docker-compose up -d
	@echo "✅ Database reset and running"

# Database
db-init:
	psql -U postgres -d studyai -f prisma/init.sql
	@echo "✅ Database schema initialized"

db-reset: docker-reset db-init

db-shell:
	psql -U postgres -d studyai

# Node
install:
	npm install
	@echo "✅ Dependencies installed"

dev:
	npm run dev

server:
	npm run server

dev-full:
	npm run dev:full

clean:
	rm -rf node_modules
	rm -rf dist
	rm -f package-lock.json
	@echo "✅ Cleaned up"

# Quick start
start: docker-up install dev-full
	@echo "✅ Application started!"

.DEFAULT_GOAL := help
