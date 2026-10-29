"use client";

import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Safe, zero-dependency Markdown renderer that correctly parses:
 * - Code blocks (```lang ... ```)
 * - Headings (#, ##, ###)
 * - Blockquotes (> quote)
 * - Bullet lists (- item, * item)
 * - Numbered lists (1. item)
 * - Inline formatting (**bold**, *italic*, `code`, [link](url))
 */
export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className={`space-y-3 text-slate-800 leading-relaxed font-sans ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "h1":
            return (
              <h1 key={idx} className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight pt-2 pb-1 border-b border-slate-200">
                {renderInline(block.content)}
              </h1>
            );
          case "h2":
            return (
              <h2 key={idx} className="text-base sm:text-lg font-bold text-slate-900 tracking-tight pt-2 pb-0.5">
                {renderInline(block.content)}
              </h2>
            );
          case "h3":
            return (
              <h3 key={idx} className="text-sm sm:text-base font-bold text-slate-900 pt-1">
                {renderInline(block.content)}
              </h3>
            );
          case "codeblock":
            return (
              <div key={idx} className="my-2 rounded-xl bg-slate-900 text-slate-100 overflow-hidden text-xs font-mono shadow-xs border border-slate-800">
                {block.lang && (
                  <div className="px-3.5 py-1.5 bg-slate-800/80 text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-700/60">
                    {block.lang}
                  </div>
                )}
                <pre className="p-3.5 overflow-x-auto leading-relaxed">
                  <code>{block.content}</code>
                </pre>
              </div>
            );
          case "ul":
            return (
              <ul key={idx} className="space-y-1.5 pl-5 list-disc text-xs sm:text-sm text-slate-700">
                {block.items.map((item, i) => (
                  <li key={i} className="pl-1">
                    {renderInline(item)}
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={idx} className="space-y-1.5 pl-5 list-decimal text-xs sm:text-sm text-slate-700">
                {block.items.map((item, i) => (
                  <li key={i} className="pl-1">
                    {renderInline(item)}
                  </li>
                ))}
              </ol>
            );
          case "blockquote":
            return (
              <blockquote key={idx} className="pl-3.5 border-l-3 border-blue-500 bg-blue-50/40 p-2.5 rounded-r-xl text-xs sm:text-sm text-slate-700 italic">
                {renderInline(block.content)}
              </blockquote>
            );
          case "paragraph":
          default:
            return (
              <p key={idx} className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {renderInline(block.content)}
              </p>
            );
        }
      })}
    </div>
  );
}

type Block =
  | { type: "h1" | "h2" | "h3" | "blockquote" | "paragraph"; content: string }
  | { type: "codeblock"; lang?: string; content: string }
  | { type: "ul" | "ol"; items: string[] };

function parseMarkdownBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: "codeblock",
        lang: lang || undefined,
        content: codeLines.join("\n"),
      });
      i++;
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", content: line.slice(4).trim() });
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", content: line.slice(3).trim() });
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ type: "h1", content: line.slice(2).trim() });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      blocks.push({ type: "blockquote", content: line.slice(2).trim() });
      i++;
      continue;
    }

    // Unordered list
    if (line.match(/^[\*\-•]\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[\*\-•]\s+/)) {
        items.push(lines[i].replace(/^[\*\-•]\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\.\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        items.push(lines[i].replace(/^\d+\.\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Regular paragraph (group non-empty lines until block break)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("> ") &&
      !lines[i].match(/^[\*\-•]\s+/) &&
      !lines[i].match(/^\d+\.\s+/)
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", content: paraLines.join(" ") });
  }

  return blocks;
}

/**
 * Render inline markdown elements:
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Code: `code`
 * - Links: [label](url)
 */
function renderInline(text: string): React.ReactNode {
  // Regex to split on bold, inline code, links, and italic
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\)|\*.*?\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${match.index}_${token.slice(0, 5)}`;

    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={key} className="font-bold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={key}
          className="px-1.5 py-0.5 rounded-md text-[11px] font-mono font-medium text-blue-700 bg-blue-50 border border-blue-200/70"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[") && token.includes("](") && token.endsWith(")")) {
      const labelMatch = token.match(/\[(.*?)\]\((.*?)\)/);
      if (labelMatch) {
        const [, label, url] = labelMatch;
        parts.push(
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2 transition"
          >
            {label}
          </a>
        );
      } else {
        parts.push(token);
      }
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={key} className="italic text-slate-800">
          {token.slice(1, -1)}
        </em>
      );
    } else {
      parts.push(token);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

