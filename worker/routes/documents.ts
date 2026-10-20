import type { Router } from "../router.ts";
import { sqlTimestamp } from "../lib/clock.ts";
import { randomHex } from "../lib/crypto.ts";
import { error, json } from "../lib/http.ts";
import { decryptBytes, encryptBytes } from "../lib/vault.ts";
import { requireAuth } from "../middleware.ts";

export const DOC_TYPES = [
  "Curriculum Vitae",
  "Academic Transcript",
  "Degree Certificate",
  "Statement of Purpose",
  "Language Score Report",
  "Recommendation Letter",
];
export const MAX_DOC_BYTES = 10 * 1024 * 1024;
export const MAX_DOCS = 15;
const TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

function cleanName(name: string): string {
  const base = name.split(/[\\/]/).pop() || "document";
  return base.replace(/[\u0000-\u001f"<>|:*?]/g, "").trim().slice(0, 120) || "document";
}

export function registerDocumentRoutes(router: Router): void {
  router.get("/api/documents", requireAuth, async (c) => {
    const { results } = await c.env.adminpath_prod_d1
      .prepare("SELECT id, doc_type, filename, file_size, mime_type, uploaded_at FROM documents WHERE user_id = ? ORDER BY uploaded_at DESC")
      .bind(c.user!.id)
      .all();
    return json(results);
  });

  router.post("/api/documents/upload", requireAuth, async (c) => {
    let form: FormData;
    try {
      form = await c.req.formData();
    } catch {
      return error(400, "Choose a file to upload.");
    }
    const file = form.get("file");
    const docType = String(form.get("doc_type") || "");
    if (!(file instanceof File) || file.size === 0) return error(400, "Choose a file to upload.");
    if (!DOC_TYPES.includes(docType)) return error(400, "Choose a document category.");
    if (file.size > MAX_DOC_BYTES) return error(413, "The file is larger than 10 MB.");
    const filename = cleanName(file.name);
    const ext = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "";
    if (!TYPES[ext]) return error(400, "Upload a PDF, Word document, JPG or PNG file.");

    const db = c.env.adminpath_prod_d1;
    const count = await db.prepare("SELECT COUNT(*) AS n FROM documents WHERE user_id = ?").bind(c.user!.id).first<{ n: number }>();
    if (Number(count?.n ?? 0) >= MAX_DOCS) return error(400, `You can store up to ${MAX_DOCS} documents. Delete one first.`);

    const id = `doc_${randomHex(8)}`;
    const key = `vault/${c.user!.id}/${id}`;
    let sealed: Uint8Array;
    try {
      sealed = await encryptBytes(c.env.GMAIL_TOKEN_KEY, await file.arrayBuffer());
    } catch (err) {
      console.error("Document encryption failed", err instanceof Error ? err.message : err);
      return error(500, "The document vault is not set up yet.");
    }
    await c.env.adminpath_student_documents.put(key, sealed, { httpMetadata: { contentType: "application/octet-stream" } });
    await db
      .prepare("INSERT INTO documents (id, user_id, doc_type, filename, file_size, mime_type, r2_key, storage_provider, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'r2', ?)")
      .bind(id, c.user!.id, docType, filename, file.size, TYPES[ext], key, sqlTimestamp())
      .run();
    return json({ success: true, id });
  });

  router.get("/api/documents/:id/download", requireAuth, async (c) => {
    const doc = await c.env.adminpath_prod_d1
      .prepare("SELECT filename, mime_type, r2_key FROM documents WHERE id = ? AND user_id = ?")
      .bind(c.params.id, c.user!.id)
      .first<{ filename: string; mime_type: string; r2_key: string }>();
    if (!doc) return error(404, "Document not found.");
    const object = await c.env.adminpath_student_documents.get(doc.r2_key);
    if (!object) return error(404, "The stored file is missing. Please upload it again.");
    try {
      const plain = await decryptBytes(c.env.GMAIL_TOKEN_KEY, await object.arrayBuffer());
      return new Response(plain, {
        headers: {
          "Content-Type": doc.mime_type,
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, no-store",
        },
      });
    } catch {
      return error(500, "This file could not be opened.");
    }
  });

  router.delete("/api/documents/:id", requireAuth, async (c) => {
    const db = c.env.adminpath_prod_d1;
    const doc = await db.prepare("SELECT r2_key FROM documents WHERE id = ? AND user_id = ?").bind(c.params.id, c.user!.id).first<{ r2_key: string }>();
    if (!doc) return error(404, "Document not found.");
    await c.env.adminpath_student_documents.delete(doc.r2_key);
    await db.prepare("DELETE FROM documents WHERE id = ?").bind(c.params.id).run();
    return json({ success: true });
  });
}
