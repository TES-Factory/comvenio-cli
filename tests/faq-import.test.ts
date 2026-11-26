import { expect, test } from "bun:test";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { importFaq } from "../scripts/faq-import.ts";
import invalid from "./fixtures/faq-import/ungueltig.json";

const fixtures = join(import.meta.dir, "fixtures", "faq-import");
const questions = ["Wie trete ich bei?", "Wo ist die Liste?", "Wer kann helfen?"];
function payload(answers: string[], cli = "faq-probe") {
  return { hilfe: "verein", cli, fragen: answers.map((antwort, i) => ({ frage: questions[i]!, antwort })) };
}
function source(...kategorien: ReturnType<typeof payload>[]) {
  return JSON.stringify({ stand: "2026-11-25", kategorien });
}
async function withDocs(run: (docs: string) => Promise<void>) {
  const docs = await mkdtemp(join(tmpdir(), "faq-import-"));
  try {
    await cp(join(fixtures, "docs"), docs, { recursive: true });
    await run(docs);
  } finally {
    await rm(docs, { recursive: true, force: true });
  }
}

test("updates only the FAQ in both languages, once", () => withDocs(async docs => {
  const raw = source(payload(["Über das Formular.", "Im Verein.", "Der Vorstand."]));
  await importFaq(raw, docs);
  for (const path of ["faq-probe.md", "en/faq-probe.md"]) {
    const original = await readFile(join(fixtures, "docs", path), "utf8");
    const result = await readFile(join(docs, path), "utf8");
    const expected = (path.startsWith("en/") ? "*The answers are available in German only.*\n\n" : "")
      + "**Wie trete ich bei?**\nÜber das Formular.\n\n**Wo ist die Liste?**\nIm Verein.\n\n**Wer kann helfen?**\nDer Vorstand.";
    expect(result).toBe(original.replace("Handfassung", expected.replace(/\n/g, original.includes("\r\n") ? "\r\n" : "\n")));
    await importFaq(raw, docs);
    expect(await readFile(join(docs, path), "utf8")).toBe(result);
  }
}));

test("empty feed and too few pairs preserve the existing FAQ", () => withDocs(async docs => {
  await importFaq(source(), docs);
  await importFaq(source(payload(["Nur eine Antwort."])), docs);
  expect(await readFile(join(docs, "faq-probe.md"))).toEqual(await readFile(join(fixtures, "docs/faq-probe.md")));
}));

test.each(Object.entries(invalid))("rejects %s even in an unmapped category", async (name, example) => {
  const category = { ...payload([example]), cli: undefined };
  const raw = JSON.stringify({ stand: null, kategorien: [category] });
  await expect(importFaq(raw, fixtures)).rejects.toThrow("verein – Wie trete ich bei? – " + name);
});

test("validates all destinations before writing", () => withDocs(async docs => {
  const before = await readFile(join(docs, "faq-probe.md"));
  const ok = payload(["Eins", "Zwei", "Drei"]);
  await expect(importFaq(source(ok, payload(["Nein"], "fehlt")), docs)).rejects.toThrow("verein → fehlt");
  expect(await readFile(join(docs, "faq-probe.md"))).toEqual(before);
}));
