// Parses the block-style YAML subset used by skill agents/openai.yaml files:
// nested mappings, sequences (including sequences of mappings), and plain,
// single-quoted, or double-quoted scalars. Anything outside that subset
// (flow collections, anchors, tags, block scalars, tabs) throws rather than
// being guessed at, so a dependency file is either parsed exactly or rejected.

export class YamlError extends Error {}

function stripComment(text) {
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === "#" && (i === 0 || /\s/.test(text[i - 1]))) return text.slice(0, i);
  }
  return text;
}

function tokenize(source) {
  const lines = [];
  source
    .replace(/\r\n/g, "\n")
    .split("\n")
    .forEach((raw, index) => {
      if (/^\s*\t/.test(raw)) throw new YamlError(`line ${index + 1}: tabs are not allowed`);
      const content = stripComment(raw).trimEnd();
      if (content.trim() === "" || content.trim() === "---") return;
      const indent = content.length - content.trimStart().length;
      lines.push({ indent, text: content.trimStart(), line: index + 1 });
    });
  return lines;
}

function parseScalar(text, line) {
  if (text.startsWith('"')) {
    if (!text.endsWith('"') || text.length < 2) {
      throw new YamlError(`line ${line}: unterminated string`);
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new YamlError(`line ${line}: invalid double-quoted string`);
    }
  }
  if (text.startsWith("'")) {
    if (!text.endsWith("'") || text.length < 2) {
      throw new YamlError(`line ${line}: unterminated string`);
    }
    return text.slice(1, -1).replaceAll("''", "'");
  }
  if (/^[[{&*!|>%@`]/.test(text)) {
    throw new YamlError(`line ${line}: unsupported YAML syntax "${text}"`);
  }
  return text;
}

function splitKey(text, line) {
  const match = /^([A-Za-z0-9_.-]+|"[^"]*"|'[^']*'):(?:\s+(.*))?$/.exec(text);
  if (!match) throw new YamlError(`line ${line}: expected "key: value", found "${text}"`);
  const key = parseScalar(match[1], line);
  return { key, rest: match[2] ?? "" };
}

function parseNode(lines, pos, indent) {
  const first = lines[pos.i];
  if (first.text === "-" || first.text.startsWith("- ")) return parseSequence(lines, pos, indent);
  return parseMapping(lines, pos, indent);
}

function parseChild(lines, pos, parentIndent, line) {
  const next = lines[pos.i];
  if (!next) throw new YamlError(`line ${line}: missing value`);
  const isSeq = next.text === "-" || next.text.startsWith("- ");
  if (next.indent > parentIndent || (isSeq && next.indent === parentIndent)) {
    return parseNode(lines, pos, next.indent);
  }
  throw new YamlError(`line ${line}: missing value`);
}

function parseMapping(lines, pos, indent) {
  const out = {};
  while (pos.i < lines.length) {
    const cur = lines[pos.i];
    if (cur.indent < indent) break;
    if (cur.indent > indent) throw new YamlError(`line ${cur.line}: unexpected indentation`);
    if (cur.text === "-" || cur.text.startsWith("- ")) break;
    const { key, rest } = splitKey(cur.text, cur.line);
    if (Object.hasOwn(out, key)) throw new YamlError(`line ${cur.line}: duplicate key "${key}"`);
    pos.i++;
    out[key] = rest === "" ? parseChild(lines, pos, indent, cur.line) : parseScalar(rest, cur.line);
  }
  return out;
}

function parseSequence(lines, pos, indent) {
  const out = [];
  while (pos.i < lines.length) {
    const cur = lines[pos.i];
    if (cur.indent < indent) break;
    if (cur.indent > indent) throw new YamlError(`line ${cur.line}: unexpected indentation`);
    if (!(cur.text === "-" || cur.text.startsWith("- "))) break;
    const itemText = cur.text === "-" ? "" : cur.text.slice(2).trimStart();
    if (itemText === "") {
      pos.i++;
      out.push(parseChild(lines, pos, indent, cur.line));
    } else if (/^([A-Za-z0-9_.-]+|"[^"]*"|'[^']*'):(\s|$)/.test(itemText)) {
      const itemIndent = cur.indent + (cur.text.length - itemText.length);
      lines[pos.i] = { indent: itemIndent, text: itemText, line: cur.line };
      out.push(parseMapping(lines, pos, itemIndent));
    } else {
      pos.i++;
      out.push(parseScalar(itemText, cur.line));
    }
  }
  return out;
}

export function parseYaml(source) {
  const lines = tokenize(source);
  if (lines.length === 0) return null;
  const pos = { i: 0 };
  const result = parseNode(lines, pos, lines[0].indent);
  if (pos.i < lines.length) {
    throw new YamlError(`line ${lines[pos.i].line}: unexpected content`);
  }
  return result;
}
