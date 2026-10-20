import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Client, addUser, createEnv } from "./helpers.ts";

describe("document vault", () => {
  let env: ReturnType<typeof createEnv>["env"];
  let raw: ReturnType<typeof createEnv>["raw"];
  let alice: Client;
  let bob: Client;

  beforeEach(async () => {
    ({ env, raw } = createEnv());
    addUser(raw, { id: "usr_a", email: "a@example.test", password: "AlicePass2026x" });
    addUser(raw, { id: "usr_b", email: "b@example.test", password: "BobPass2026yy" });
    alice = new Client(env);
    bob = new Client(env, "203.0.113.11");
    await alice.login("a@example.test", "AlicePass2026x");
    await bob.login("b@example.test", "BobPass2026yy");
  });

  const upload = (c: Client, name: string, content: string | Uint8Array, type = "Curriculum Vitae") => {
    const form = new FormData();
    form.set("doc_type", type);
    form.set("file", new File([content], name, { type: "application/pdf" }));
    return c.send("POST", "/api/documents/upload", form);
  };

  test("a file is stored encrypted, listed, downloaded and deleted", async () => {
    const res = await upload(alice, "My CV.pdf", "%PDF-1.4 hello vault");
    assert.equal(res.status, 200);
    const { id } = (await res.json()) as { id: string };

    const list = await alice.request("GET", "/api/documents");
    assert.equal(list.data.length, 1);
    assert.equal(list.data[0].filename, "My CV.pdf");
    assert.equal(list.data[0].doc_type, "Curriculum Vitae");
    assert.equal(list.data[0].mime_type, "application/pdf");

    const stored = await (env.adminpath_student_documents.get(`vault/usr_a/${id}`) as Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>);
    const bytes = new Uint8Array(await stored!.arrayBuffer());
    assert.ok(!Buffer.from(bytes).toString("latin1").includes("hello vault"));

    const dl = await alice.send("GET", `/api/documents/${id}/download`);
    assert.equal(dl.status, 200);
    assert.equal(await dl.text(), "%PDF-1.4 hello vault");
    assert.ok((dl.headers.get("Content-Disposition") || "").includes("attachment"));

    assert.equal((await bob.send("GET", `/api/documents/${id}/download`)).status, 404);
    assert.equal((await bob.request("DELETE", `/api/documents/${id}`)).status, 404);
    assert.equal((await alice.request("DELETE", `/api/documents/${id}`)).status, 200);
    assert.equal((await alice.request("GET", "/api/documents")).data.length, 0);
    assert.equal(await env.adminpath_student_documents.get(`vault/usr_a/${id}`), null);
  });

  test("bad uploads are refused", async () => {
    assert.equal((await upload(alice, "run.exe", "x")).status, 400);
    assert.equal((await upload(alice, "cv.pdf", "x", "Secret")).status, 400);
    assert.equal((await upload(alice, "cv.pdf", "")).status, 400);
    assert.equal((await upload(alice, "big.pdf", new Uint8Array(10 * 1024 * 1024 + 1))).status, 413);
    assert.equal((await new Client(env).send("POST", "/api/documents/upload", new FormData())).status, 401);
    assert.equal((await alice.send("POST", "/api/documents/upload", "not a form")).status, 400);
  });

  test("a student can store 15 documents at most", async () => {
    for (let i = 0; i < 15; i++) assert.equal((await upload(alice, `d${i}.pdf`, "x")).status, 200);
    assert.equal((await upload(alice, "one-more.pdf", "x")).status, 400);
    assert.equal((await upload(bob, "mine.pdf", "x")).status, 200);
  });
});
