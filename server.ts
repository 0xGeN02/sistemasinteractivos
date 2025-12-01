import express, { Express, Request, Response } from "express";
import cors from "cors";
import { Pool } from "pg";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
import multer from "multer";
import reciteRoutes from "./reciteRoutes";
import quizRoutes from "./quizRoutes";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const app: Express = express();
const port = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/api/recite", reciteRoutes);
app.use("/api/quiz", quizRoutes);

// Configurar multer para upload de archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    // Permitir PDFs y documentos de texto
    const allowedMimes = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDFs, TXT, and DOCX allowed."));
    }
  },
});

// Crear carpeta de almacenamiento si no existe
const storageDir = path.join(process.cwd(), "data", "materials");
fs.mkdir(storageDir, { recursive: true }).catch(console.error);

// Función auxiliar para ejecutar queries
const query = async (text: string, params?: any[]) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
};

// ==================== RUTAS DE CHATS ====================

// Obtener todos los chats
app.get("/api/chats", async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT cs.*, 
              json_agg(json_build_object(
                'id', cm.id,
                'sessionId', cm."sessionId",
                'name', cm.name,
                'type', cm.type,
                'filePath', cm."filePath",
                'content', cm.content,
                'createdAt', cm."createdAt",
                'updatedAt', cm."updatedAt"
              )) FILTER (WHERE cm.id IS NOT NULL) as materials
       FROM chat_sessions cs
       LEFT JOIN chat_materials cm ON cs.id = cm."sessionId"
       GROUP BY cs.id
       ORDER BY cs."updatedAt" DESC`
    );

    const chats = result.rows.map((row) => ({
      ...row,
      materials: row.materials || [],
    }));

    res.json(chats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching chats" });
  }
});

// Crear un nuevo chat
app.post("/api/chats", async (req: Request, res: Response) => {
  try {
    const { title, type } = req.body;
    const id = randomUUID();
    const now = new Date();
    const chatType = type || "study";

    await query(
      `INSERT INTO chat_sessions (id, title, type, "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5)`,
      [id, title || `Chat ${now.toLocaleDateString()}`, chatType, now, now]
    );

    const chat = {
      id,
      title: title || `Chat ${now.toLocaleDateString()}`,
      type: chatType,
      createdAt: now,
      updatedAt: now,
      materials: [],
    };

    res.json(chat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating chat" });
  }
});

// Obtener un chat específico
app.get("/api/chats/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT cs.*, 
              json_agg(json_build_object(
                'id', cm.id,
                'sessionId', cm."sessionId",
                'name', cm.name,
                'type', cm.type,
                'filePath', cm."filePath",
                'content', cm.content,
                'createdAt', cm."createdAt",
                'updatedAt', cm."updatedAt"
              )) FILTER (WHERE cm.id IS NOT NULL) as materials
       FROM chat_sessions cs
       LEFT JOIN chat_materials cm ON cs.id = cm."sessionId"
       WHERE cs.id = $1
       GROUP BY cs.id`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }

    const chat = {
      ...result.rows[0],
      materials: result.rows[0].materials || [],
    };

    res.json(chat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching chat" });
  }
});

// Actualizar título del chat
app.put("/api/chats/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const now = new Date();

    await query(
      `UPDATE chat_sessions SET title = $1, "updatedAt" = $2 WHERE id = $3`,
      [title, now, id]
    );

    const result = await query(
      `SELECT cs.*, 
              json_agg(json_build_object(
                'id', cm.id,
                'sessionId', cm."sessionId",
                'name', cm.name,
                'type', cm.type,
                'filePath', cm."filePath",
                'content', cm.content,
                'createdAt', cm."createdAt",
                'updatedAt', cm."updatedAt"
              )) FILTER (WHERE cm.id IS NOT NULL) as materials
       FROM chat_sessions cs
       LEFT JOIN chat_materials cm ON cs.id = cm."sessionId"
       WHERE cs.id = $1
       GROUP BY cs.id`,
      [id]
    );

    const chat = {
      ...result.rows[0],
      materials: result.rows[0].materials || [],
    };

    res.json(chat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error updating chat" });
  }
});

// Eliminar un chat
app.delete("/api/chats/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Obtener materiales para eliminar archivos
    const result = await query(
      `SELECT id, "filePath" FROM chat_materials WHERE "sessionId" = $1`,
      [id]
    );

    // Eliminar archivos individuales del sistema de archivos
    for (const material of result.rows) {
      try {
        await fs.unlink(material.filePath);
      } catch (err) {
        console.error(`Error deleting file: ${material.filePath}`, err);
      }
    }

    // Eliminar carpeta completa del chat si existe
    const chatFolder = path.join(storageDir, id);
    try {
      await fs.rm(chatFolder, { recursive: true, force: true });
      console.log(`Deleted chat folder: ${chatFolder}`);
    } catch (err) {
      console.error(`Error deleting chat folder: ${chatFolder}`, err);
    }

    // Eliminar chat de la base de datos (los materiales se eliminarán en cascada)
    await query(`DELETE FROM chat_sessions WHERE id = $1`, [id]);

    res.json({ message: "Chat deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error deleting chat" });
  }
});

// ==================== RUTAS DE MATERIALES ====================

// Upload de archivos PDF/documentos
app.post(
  "/api/chats/:id/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      // Validar que el chat existe
      const chatResult = await query(
        `SELECT id FROM chat_sessions WHERE id = $1`,
        [id]
      );

      if (chatResult.rows.length === 0) {
        res.status(404).json({ error: "Chat not found" });
        return;
      }

      // Crear nombre de archivo único
      const materialId = randomUUID();
      const ext = path.extname(req.file.originalname);
      const filename = `${materialId}-${req.file.originalname
        .replace(/[^a-z0-9._\- ]/gi, "_")
        .toLowerCase()}`;
      const filePath = path.join(storageDir, id, filename);

      // Crear carpeta del chat si no existe
      await fs.mkdir(path.join(storageDir, id), { recursive: true });

      // Guardar archivo
      await fs.writeFile(filePath, req.file.buffer);

      // Extraer texto si es PDF
      let extractedText = `[File: ${req.file.originalname}]`;
      if (req.file.mimetype.includes("pdf")) {
        try {
          console.log("Extracting text from PDF...");
          const dataBuffer = req.file.buffer;
          // @ts-ignore - pdf-parse has weird ESM exports
          const pdf = await import("pdf-parse");
          // @ts-ignore
          const pdfData = await pdf(dataBuffer);
          extractedText =
            pdfData.text ||
            `[PDF file: ${req.file.originalname} - No text could be extracted]`;
          console.log(
            `Extracted ${pdfData.text?.length || 0} characters from PDF`
          );
        } catch (pdfError) {
          console.error("Error extracting PDF text:", pdfError);
          extractedText = `[PDF file: ${req.file.originalname} - Error extracting text]`;
        }
      }

      // Guardar en base de datos
      const now = new Date();

      await query(
        `INSERT INTO chat_materials (id, "sessionId", name, type, "filePath", content, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          materialId,
          id,
          req.file.originalname,
          req.file.mimetype.includes("pdf") ? "pdf" : "text",
          filePath,
          extractedText.substring(0, 5000), // Guardar preview (primeros 5000 caracteres)
          now,
          now,
        ]
      );

      // Actualizar fecha del chat
      await query(`UPDATE chat_sessions SET "updatedAt" = $1 WHERE id = $2`, [
        now,
        id,
      ]);

      const material = {
        id: materialId,
        sessionId: id,
        name: req.file.originalname,
        type: req.file.mimetype.includes("pdf") ? "pdf" : "text",
        filePath,
        size: req.file.size,
        createdAt: now,
        updatedAt: now,
      };

      res.json(material);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error uploading file" });
    }
  }
);

// Agregar material de texto a un chat
app.post("/api/chats/:id/materials", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, content } = req.body;

    // Validar que el chat existe
    const chatResult = await query(
      `SELECT id FROM chat_sessions WHERE id = $1`,
      [id]
    );

    if (chatResult.rows.length === 0) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }

    // Crear nombre de archivo único
    const timestamp = Date.now();
    const filename = `${timestamp}-${name
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()}`;
    const filePath = path.join(storageDir, filename);

    // Guardar archivo
    await fs.writeFile(filePath, content, "utf-8");

    // Guardar en base de datos
    const materialId = randomUUID();
    const now = new Date();

    await query(
      `INSERT INTO chat_materials (id, "sessionId", name, type, "filePath", content, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        materialId,
        id,
        name,
        type,
        filePath,
        content.substring(0, 5000),
        now,
        now,
      ]
    );

    // Actualizar fecha del chat
    await query(`UPDATE chat_sessions SET "updatedAt" = $1 WHERE id = $2`, [
      now,
      id,
    ]);

    const material = {
      id: materialId,
      sessionId: id,
      name,
      type,
      filePath,
      content: content.substring(0, 5000),
      createdAt: now,
      updatedAt: now,
    };

    res.json(material);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error adding material" });
  }
});

// Obtener contenido completo de un material
app.get("/api/materials/:id/content", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT "filePath" FROM chat_materials WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Material not found" });
      return;
    }

    const content = await fs.readFile(result.rows[0].filePath, "utf-8");
    res.json({ content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error reading material" });
  }
});

// Eliminar un material
app.delete("/api/materials/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT "filePath" FROM chat_materials WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Material not found" });
      return;
    }

    // Eliminar archivo
    try {
      await fs.unlink(result.rows[0].filePath);
    } catch (err) {
      console.error(`Error deleting file: ${result.rows[0].filePath}`, err);
    }

    // Eliminar de base de datos
    await query(`DELETE FROM chat_materials WHERE id = $1`, [id]);

    res.json({ message: "Material deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error deleting material" });
  }
});

// ==================== HEALTH CHECK ====================

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "OK" });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down gracefully...");
  await pool.end();
  process.exit(0);
});

// ==================== WEB SPEECH API ====================
// Ya no necesitamos endpoint de Whisper - usamos Web Speech API en el cliente
