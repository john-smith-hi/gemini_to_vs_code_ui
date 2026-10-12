(function (root) {
  const CS = root.CursorSkin || (root.CursorSkin = {});

  const KEYWORDS = {
    javascript: words(
      "const let var function return if else for while class new this import export from async await try catch throw of in typeof break continue switch case default true false null undefined"
    ),
    typescript: words(
      "const let var function return if else for while class new this import export from async await try catch throw of in typeof break continue switch case default true false null undefined type interface extends implements public private protected readonly"
    ),
    php: words(
      "function return if else elseif endif foreach for while class public private protected echo new use namespace array true false null as switch case break try catch isset empty include require"
    ),
    python: words(
      "def return if elif else for while class import from as try except finally with yield lambda True False None in not and or pass break continue"
    ),
    bash: words("if then else fi for in do done echo exit function while case esac local"),
    yaml: words("true false null yes no"),
    ruby: words("def end if elsif else class module do begin rescue require"),
    css: words("important"),
    json: words(""),
    plaintext: words(""),
    markdown: words(""),
  };

  const LABELS = {
    php: "PHP",
    javascript: "JavaScript",
    typescript: "TypeScript",
    css: "CSS",
    html: "HTML",
    xml: "XML",
    python: "Python",
    json: "JSON",
    markdown: "Markdown",
    bash: "Shell",
    yaml: "YAML",
    ruby: "Ruby",
    plaintext: "Plain Text",
  };

  function words(list) {
    return new Set(list.split(/\s+/).filter(Boolean));
  }

  function push(out, type, text) {
    if (!text) return;
    const last = out[out.length - 1];
    if (last && last.type === type) last.text += text;
    else out.push({ type: type, text: text });
  }

  function normalizeLang(raw) {
    const token = String(raw || "")
      .trim()
      .toLowerCase()
      .split(/\s+/)[0]
      .replace(/[^a-z0-9#+.-]/g, "");
    const alias = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      sh: "bash",
      shell: "bash",
      zsh: "bash",
      htm: "html",
      md: "markdown",
      yml: "yaml",
      rb: "ruby",
      txt: "plaintext",
      text: "plaintext",
      smarty: "html",
      tpl: "html",
      xml: "xml",
      svg: "xml",
    };
    return alias[token] || token || "plaintext";
  }

  function languageLabel(lang) {
    return LABELS[normalizeLang(lang)] || "Plain Text";
  }

  function commentStyle(lang) {
    const normalized = normalizeLang(lang);
    if (normalized === "html" || normalized === "xml") return { line: ["<!-- ", " -->"] };
    if (normalized === "css") return { line: ["/* ", " */"] };
    if (normalized === "python" || normalized === "bash" || normalized === "yaml" || normalized === "ruby") {
      return { line: ["# ", ""] };
    }
    return { line: ["// ", ""] };
  }

  function commentWrap(text, lang) {
    const cleaned = String(text || "").replace(/\r/g, "").trim();
    if (!cleaned) return "";
    const style = commentStyle(lang);
    return cleaned
      .split("\n")
      .map((line) => style.line[0] + line + style.line[1])
      .join("\n");
  }

  function tokenize(text, lang) {
    const normalized = normalizeLang(lang);
    const source = String(text || "");
    if (normalized === "html" || normalized === "xml" || normalized === "php") {
      return tokenizeMarkup(source, normalized);
    }
    if (normalized === "markdown") return tokenizeMarkdown(source);
    return tokenizeCode(source, normalized);
  }

  function tokenizeMarkup(text, lang) {
    const out = [];
    let i = 0;
    while (i < text.length) {
      if (text.startsWith("<!--", i)) {
        const end = text.indexOf("-->", i + 4);
        const j = end === -1 ? text.length : end + 3;
        push(out, "comment", text.slice(i, j));
        i = j;
        continue;
      }
      if (lang === "php" && (text.startsWith("<?php", i) || text.startsWith("<?=", i))) {
        const openLen = text.startsWith("<?=", i) ? 3 : 5;
        const close = text.indexOf("?>", i + openLen);
        const innerEnd = close === -1 ? text.length : close;
        push(out, "keyword", text.slice(i, i + openLen));
        tokenizeCode(text.slice(i + openLen, innerEnd), "php").forEach((tok) => push(out, tok.type, tok.text));
        if (close !== -1) push(out, "keyword", "?>");
        i = close === -1 ? text.length : close + 2;
        continue;
      }
      if (text[i] === "<") {
        const end = text.indexOf(">", i + 1);
        const j = end === -1 ? text.length : end + 1;
        colorTag(out, text.slice(i, j));
        i = j;
        continue;
      }
      let j = i + 1;
      while (j < text.length && text[j] !== "<") j += 1;
      const proseLang = lang === "php" ? "php" : "plaintext";
      tokenizeCode(text.slice(i, j), proseLang).forEach((tok) => push(out, tok.type, tok.text));
      i = j;
    }
    return out;
  }

  function colorTag(out, raw) {
    const re = /<\/?|\/?>|[A-Za-z_:][\w:.-]*|=|"[^"]*"|'[^']*'|[^"'=\s<>/]+|\s+/g;
    let expectName = false;
    let match;
    while ((match = re.exec(raw))) {
      const part = match[0];
      if (part.startsWith("<") || part === ">" || part === "/>") {
        push(out, "punctuation", part);
        expectName = part.startsWith("<");
      } else if (/^\s+$/.test(part)) {
        push(out, "text", part);
      } else if (part[0] === '"' || part[0] === "'") {
        push(out, "string", part);
      } else if (part === "=") {
        push(out, "punctuation", part);
      } else if (expectName) {
        push(out, "keyword", part);
        expectName = false;
      } else {
        push(out, "attr", part);
      }
    }
  }

  function tokenizeCode(text, lang) {
    const keywords = KEYWORDS[lang] || KEYWORDS.javascript;
    const hashComment = lang === "python" || lang === "bash" || lang === "php" || lang === "yaml" || lang === "ruby";
    const allowSlashComment = lang !== "json";
    const out = [];
    let i = 0;
    while (i < text.length) {
      const ch = text[i];
      const next = text[i + 1];
      if (allowSlashComment && ch === "/" && next === "/") {
        let j = i + 2;
        while (j < text.length && text[j] !== "\n") j += 1;
        push(out, "comment", text.slice(i, j));
        i = j;
        continue;
      }
      if (allowSlashComment && ch === "/" && next === "*") {
        const end = text.indexOf("*/", i + 2);
        const j = end === -1 ? text.length : end + 2;
        push(out, "comment", text.slice(i, j));
        i = j;
        continue;
      }
      if (hashComment && ch === "#") {
        let j = i + 1;
        while (j < text.length && text[j] !== "\n") j += 1;
        push(out, "comment", text.slice(i, j));
        i = j;
        continue;
      }
      if ((ch === '"' || ch === "'" || (ch === "`" && (lang === "javascript" || lang === "typescript"))) && !isTriple(text, i)) {
        const quote = ch;
        let j = i + 1;
        while (j < text.length && text[j] !== quote) {
          if (text[j] === "\\") j += 2;
          else if (text[j] === "\n" && quote !== "`") break;
          else j += 1;
        }
        if (j < text.length && text[j] === quote) j += 1;
        push(out, "string", text.slice(i, j));
        i = j;
        continue;
      }
      if (isTriple(text, i)) {
        const quote = text.slice(i, i + 3);
        const end = text.indexOf(quote, i + 3);
        const j = end === -1 ? text.length : end + 3;
        push(out, "string", text.slice(i, j));
        i = j;
        continue;
      }
      if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
        let j = i + 1;
        while (j < text.length && (text[j] === " " || text[j] === "\t" || text[j] === "\n" || text[j] === "\r")) j += 1;
        push(out, "text", text.slice(i, j));
        i = j;
        continue;
      }
      if (/[0-9]/.test(ch) && (i === 0 || !/[A-Za-z_$]/.test(text[i - 1]))) {
        let j = i + 1;
        while (j < text.length && /[0-9._xXa-fA-F]/.test(text[j])) j += 1;
        push(out, "number", text.slice(i, j));
        i = j;
        continue;
      }
      if (/[A-Za-z_$]/.test(ch)) {
        let j = i + 1;
        while (j < text.length && /[A-Za-z0-9_$]/.test(text[j])) j += 1;
        const word = text.slice(i, j);
        push(out, keywords.has(word) ? "keyword" : "text", word);
        i = j;
        continue;
      }
      push(out, "punctuation", ch);
      i += 1;
    }
    return out;
  }

  function isTriple(text, index) {
    const slice = text.slice(index, index + 3);
    return slice === '"""' || slice === "'''";
  }

  function tokenizeMarkdown(text) {
    const out = [];
    const lines = String(text || "").split("\n");
    lines.forEach((line, index) => {
      if (index) push(out, "text", "\n");
      if (/^#{1,6}\s/.test(line) || /^>\s?/.test(line)) push(out, "keyword", line);
      else if (/^```/.test(line)) push(out, "comment", line);
      else push(out, "text", line);
    });
    return out;
  }

  function highlightLines(text, lang) {
    const lines = [];
    let current = [];
    tokenize(text, lang).forEach((tok) => {
      const parts = tok.text.split("\n");
      parts.forEach((part, index) => {
        if (index > 0) {
          lines.push(current);
          current = [];
        }
        if (part) current.push({ type: tok.type, text: part });
      });
    });
    lines.push(current);
    if (!lines.length) lines.push([]);
    return lines;
  }

  CS.highlight = {
    tokenize: tokenize,
    highlightLines: highlightLines,
    normalizeLang: normalizeLang,
    languageLabel: languageLabel,
    commentWrap: commentWrap,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = CS;
})(typeof globalThis !== "undefined" ? globalThis : this);
