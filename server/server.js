import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import pg from "pg";
import path from "node:path";

dotenv.config();

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set. PostgreSQL API will fail until .env is configured.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
});

app.use(cors());
app.use(express.json({ limit: "12mb" }));

// Render runs the API and the Vite build as one Web Service.
const distPath = path.resolve(process.cwd(), "dist");
app.use(express.static(distPath));

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inspections (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      building TEXT NOT NULL,
      floor TEXT NOT NULL,
      room_number TEXT NOT NULL,
      category TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      defect_notes TEXT NOT NULL,
      photo_uri TEXT,
      status TEXT NOT NULL DEFAULT 'SYNCED'
    );
  `);
}

function toClientRecord(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    building: row.building,
    floor: row.floor,
    roomNumber: row.room_number,
    category: row.category,
    rating: row.rating,
    defectNotes: row.defect_notes,
    photoUri: row.photo_uri,
    status: row.status
  };
}

function normalizeRecord(body) {
  const now = new Date().toISOString();

  return {
    id: String(body.id),
    createdAt: body.createdAt || now,
    updatedAt: now,
    building: String(body.building || "").trim(),
    floor: String(body.floor || "").trim(),
    roomNumber: String(body.roomNumber || "").trim(),
    category: String(body.category || "").trim(),
    rating: Number(body.rating),
    defectNotes: String(body.defectNotes || "").trim(),
    photoUri: body.photoUri || null,
    status: "SYNCED"
  };
}

function validateRecord(record) {
  const errors = [];

  if (!record.id) errors.push("id is required");
  if (!record.building) errors.push("building is required");
  if (!record.floor) errors.push("floor is required");
  if (!record.roomNumber) errors.push("roomNumber is required");
  if (!record.category) errors.push("category is required");
  if (!Number.isInteger(record.rating) || record.rating < 1 || record.rating > 5) {
    errors.push("rating must be an integer from 1 to 5");
  }
  if (!record.defectNotes) errors.push("defectNotes is required");

  return errors;
}

app.get("/api/health", async (_request, response) => {
  try {
    await pool.query("SELECT 1");
    response.json({ ok: true, database: "connected" });
  } catch (error) {
    response.status(503).json({ ok: false, database: "unavailable", error: error.message });
  }
});

app.get("/api/inspections", async (_request, response) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM inspections
      ORDER BY updated_at DESC
      LIMIT 500;
    `);

    response.json(result.rows.map(toClientRecord));
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.post("/api/inspections", async (request, response) => {
  const record = normalizeRecord(request.body);
  const errors = validateRecord(record);

  if (errors.length) {
    response.status(400).json({ errors });
    return;
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO inspections (
          id, created_at, updated_at, building, floor, room_number,
          category, rating, defect_notes, photo_uri, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          updated_at = EXCLUDED.updated_at,
          building = EXCLUDED.building,
          floor = EXCLUDED.floor,
          room_number = EXCLUDED.room_number,
          category = EXCLUDED.category,
          rating = EXCLUDED.rating,
          defect_notes = EXCLUDED.defect_notes,
          photo_uri = EXCLUDED.photo_uri,
          status = EXCLUDED.status
        RETURNING *;
      `,
      [
        record.id,
        record.createdAt,
        record.updatedAt,
        record.building,
        record.floor,
        record.roomNumber,
        record.category,
        record.rating,
        record.defectNotes,
        record.photoUri,
        record.status
      ]
    );

    response.status(201).json(toClientRecord(result.rows[0]));
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// Let the PWA handle client-side routes when a page is opened directly.
app.use((request, response, next) => {
  if (request.method !== "GET" || request.path.startsWith("/api")) {
    next();
    return;
  }

  response.sendFile(path.join(distPath, "index.html"));
});

initDatabase()
  .then(() => {
    app.listen(port, "0.0.0.0", () => {
      console.log(`VKU inspection app listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize PostgreSQL database:", error.message);
    process.exit(1);
  });
