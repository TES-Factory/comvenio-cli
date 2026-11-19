/**
 * Walking the published output schemas of the domain tools (fullDomainOperationContracts).
 * Shared by the run report boundary test (BUG 7b331d46) and the open output ratchet (BUG da6abb50),
 * so both see the same open nodes and the same paths.
 */

export type JsonSchemaNode = {
  properties?: Record<string, JsonSchemaNode>;
  items?: JsonSchemaNode;
  anyOf?: JsonSchemaNode[];
  oneOf?: JsonSchemaNode[];
  allOf?: JsonSchemaNode[];
  additionalProperties?: JsonSchemaNode | boolean;
  [keyword: string]: unknown;
};

/** A contract row as far as the walk needs it. */
export type ContractRow = { action_id: string; operation: string; output_schema: unknown };

export function walk(
  node: JsonSchemaNode | undefined,
  path: string,
  visit: (node: JsonSchemaNode, path: string, key: string | null) => void,
  key: string | null = null,
): void {
  if (!node || typeof node !== "object") return;
  visit(node, path, key);
  for (const [name, child] of Object.entries(node.properties ?? {})) walk(child, path ? `${path}.${name}` : `$.${name}`, visit, name);
  if (node.items) walk(node.items, `${path === "$" || path === "" ? "" : path}[]`, visit, null);
  for (const branch of [...(node.anyOf ?? []), ...(node.oneOf ?? []), ...(node.allOf ?? [])]) walk(branch, path, visit, key);
}

/** "$.a.b" → ".a.b" for nested paths, "$.a" stays for a top-level field. */
export function display(path: string): string {
  if (path === "" || path === "$") return "$";
  const nested = path.startsWith("$.") && path.slice(2).includes(".") ? path.slice(1) : path;
  return nested.replace(/^\$\.(\w+)\[\]/u, ".$1[]");
}

/** An open node (z.json, z.unknown, a bare object): the answer shows whatever the service sends. */
export function isOpen(node: JsonSchemaNode): boolean {
  if (node.properties || node.items || node.anyOf || node.oneOf || node.allOf || node.enum || node.const !== undefined) return false;
  const type = node.type;
  return type === undefined || type === "object";
}

/** A string without format, pattern, enum or const: free text. */
export function isText(node: JsonSchemaNode): boolean {
  const types = Array.isArray(node.type) ? node.type : [node.type];
  return types.includes("string") && node.format === undefined && node.enum === undefined && node.const === undefined
    && node.pattern === undefined;
}

/** Nodes per action id that `select` picks; `filter` gets "<action_id> <operation>" of each contract row. */
export function collect(
  rows: readonly ContractRow[],
  select: (node: JsonSchemaNode, key: string | null) => boolean,
  filter: (name: string) => boolean = () => true,
): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!filter(`${row.action_id} ${row.operation}`)) continue;
    const found = result.get(row.action_id) ?? new Set<string>();
    walk(row.output_schema as JsonSchemaNode, "", (node, path, key) => {
      if (select(node, key)) found.add(display(path));
    });
    if (found.size > 0) result.set(row.action_id, found);
  }
  return result;
}
