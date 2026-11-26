import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { FACHWISSEN_SECTIONS, MIN_FAQ_PAIRS, type Lang } from "./docs-lib.ts";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const pair = z.strictObject({ frage: z.string().trim().min(1), antwort: z.string().trim().min(1) });
const feed = z.strictObject({
  stand: z.iso.date().nullable(),
  kategorien: z.array(z.strictObject({ hilfe: slug, cli: slug.optional(), fragen: z.array(pair) })),
});
type Pair = z.infer<typeof pair>;

const internalPatterns: [string, RegExp][] = [
  ["Quellspur", /<!--|quelle_|docs\/tech\/|code:/i],
  ["Dienstname", /\b[a-z]+(?:-[a-z]+)*-service\b/i],
  ["Route", /\/(?:api|v\d+|roadmap|devops)\/|\/[^\s]*\{[^}\n]+\}/i],
  ["Dateipfad", /\b(?:app|src|docs|scripts|Frontend|Backend)\/[\w./-]+|\.(?:py|tsx?|jsx|mjs|yaml|json)\b/i],
  ["Tabelle, Modell, Feld", /`+[^`\n]*\b[a-z]\w*_[a-z]\w*[^`\n]*`+/],
  ["Kennung", /\b(?:[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}|D-[A-Z]+-\d+|hs\d+|TC-\d+|AK-)/i],
  ["Fehlercode", /\b[A-Z]{2,}_[A-Z_]+/],
  ["interner Begriff", /\b(?:Tech Doc|Teilsystem|Mechanik|Ableitung)/i],
];

// These commands are public entry points documented in the CLI help.
const allowedCommands = new Set(["comvenio help", "comvenio login", "comvenio action list"]);

function checkPair(item: Pair, category: string) {
  const fail = (reason: string): never => {
    throw new Error(category + " – " + item.frage + " – " + reason);
  };
  if (/[*\r\n]/.test(item.frage) || /^\*\*[^*\n]+\*\*\s*$/m.test(item.antwort)) fail("Frageformat");
  const unsupported = () => fail("fremdes Element");
  for (const value of [item.frage, item.antwort]) {
    for (const [name, pattern] of internalPatterns) if (pattern.test(value)) fail(name);
    Bun.markdown.render(value, {
      heading: unsupported, hr: unsupported, code: unsupported, html: unsupported,
      blockquote: unsupported, table: unsupported, image: unsupported, strikethrough: unsupported,
      listItem: (value, meta) => meta.checked === undefined ? value : unsupported(),
      codespan: value => allowedCommands.has(value) ? value : unsupported(),
      link: (label, { href }) => {
        const url = URL.parse(href);
        if (!url || url.protocol !== "https:" || url.username || url.password || url.port ||
            !/(^|\.)(comvenio\.app|comvenio\.de)$/.test(url.hostname)) unsupported();
        return label;
      },
    }, { autolinks: true });
  }
}

function replaceSection(source: string, lang: Lang, items: Pair[], label: string) {
  const title = FACHWISSEN_SECTIONS[lang][1];
  const header = new RegExp("^## " + title + "[ \\t]*\\r?$", "gm");
  const matches = [...source.matchAll(header)];
  if (matches.length !== 1) throw new Error(label + " – Abschnitt „" + title + "“ fehlt oder ist mehrdeutig");
  if (items.length < MIN_FAQ_PAIRS) return source;

  const start = matches[0]!.index! + matches[0]![0].trimEnd().length;
  const next = source.slice(start).search(/^## /m);
  const end = next < 0 ? source.length : start + next;
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const lines = items.map(({ frage, antwort }) => "**" + frage + "**\n" + antwort.replace(/\r\n/g, "\n"));
  if (lang === "en") lines.unshift("*The answers are available in German only.*");
  const body = ("\n\n" + lines.join("\n\n") + (end === source.length ? "\n" : "\n\n")).replace(/\n/g, newline);
  return source.slice(0, start) + body + source.slice(end);
}

export async function importFaq(raw: string, docs: string) {
  const data = feed.parse(JSON.parse(raw));
  const articles = new Map<string, { categories: string[]; pairs: Pair[] }>();
  for (const category of data.kategorien) {
    for (const item of category.fragen) checkPair(item, category.hilfe);
    if (!category.cli) continue;
    const group = articles.get(category.cli) ?? { categories: [], pairs: [] };
    group.categories.push(category.hilfe);
    group.pairs.push(...category.fragen);
    articles.set(category.cli, group);
  }
  if (internalPatterns[0]![1].test(JSON.stringify(data))) throw new Error("Quellspur im FAQ-Export");
  const changes = [];
  for (const [id, { categories, pairs }] of articles) {
    const label = categories.join(", ") + " → " + id;
    for (const lang of ["de", "en"] as const) {
      const path = join(docs, lang === "de" ? "" : "en", id + ".md");
      const source = await readFile(path, "utf8").catch(() => { throw new Error(label + " – Artikel fehlt (" + lang + ")"); });
      const result = replaceSection(source, lang, pairs, label);
      if (result !== source) changes.push({ path, result });
    }
    if (pairs.length < MIN_FAQ_PAIRS) console.warn(label + " – nur " + pairs.length + " Fragen, Handfassung bleibt");
  }
  // Validate every section in both languages before touching any article.
  for (const change of changes) await writeFile(change.path, change.result);
}

if (import.meta.main) {
  try {
    const { values } = parseArgs({ options: { docs: { type: "string", default: "docs" } } });
    let raw: string;
    if (process.env.COMVENIO_FAQ_FILE) raw = await readFile(process.env.COMVENIO_FAQ_FILE, "utf8");
    else {
      const response = await fetch(process.env.COMVENIO_FAQ_URL || "https://www.comvenio.app/hilfe/faq.json");
      if (!response.ok) throw new Error("FAQ-Export nicht erreichbar (HTTP " + response.status + ")");
      raw = await response.text();
    }
    await importFaq(raw, values.docs!);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
