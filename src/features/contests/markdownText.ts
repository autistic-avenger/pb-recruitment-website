import { unified } from 'unified';
import remarkParse from 'remark-parse';

const MARKDOWN_PREFIX = /^:::markdown(?:\r?\n|$)/;

export const getQuestionTextBody = (text: string) => text.replace(MARKDOWN_PREFIX, '');

interface PositionedNode {
  type: string;
  url?: string;
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
  children?: PositionedNode[];
}

interface SourceRange {
  start: number;
  end: number;
}

interface SourceEdit extends SourceRange {
  replacement: string;
}

const markdownParser = unified().use(remarkParse);

const getLinkDestinationRange = (source: string, absoluteStart: number): SourceRange | null => {
  const labelEnd = source.indexOf('](');
  if (labelEnd < 0) return null;

  let cursor = labelEnd + 2;
  while (/\s/.test(source[cursor] ?? '')) cursor++;
  const angleWrapped = source[cursor] === '<';
  if (angleWrapped) cursor++;
  const start = cursor;

  while (cursor < source.length) {
    if (source[cursor] === '\\') {
      cursor += 2;
      continue;
    }
    if (angleWrapped && source[cursor] === '>') break;
    if (!angleWrapped && source[cursor] === '(') {
      cursor++;
      let depth = 1;
      while (cursor < source.length && depth > 0) {
        if (source[cursor] === '\\') {
          cursor += 2;
        } else if (source[cursor] === '(') {
          depth++;
          cursor++;
        } else if (source[cursor] === ')') {
          depth--;
          if (depth > 0) cursor++;
        } else {
          cursor++;
        }
      }
      break;
    }
    if (!angleWrapped && (source[cursor] === ')' || /\s/.test(source[cursor]))) break;
    cursor++;
  }

  return { start: absoluteStart + start, end: absoluteStart + cursor };
};

const getProtectedRanges = (markdown: string): SourceRange[] => {
  const ranges: SourceRange[] = [];
  const visit = (node: PositionedNode) => {
    const start = node.position?.start?.offset;
    const end = node.position?.end?.offset;

    if (node.type === 'code' || node.type === 'inlineCode' || node.type === 'image' || node.type === 'imageReference' || node.type === 'definition' || node.type === 'html') {
      if (start !== undefined && end !== undefined) ranges.push({ start, end });
      return;
    }

    if (node.type === 'link') {
      const source = start !== undefined && end !== undefined ? markdown.slice(start, end) : '';
      if (start !== undefined && end !== undefined) {
        if (source.startsWith('<')) {
          ranges.push({ start, end });
          return;
        }
        const destination = getLinkDestinationRange(source, start);
        if (destination) ranges.push(destination);
      }
      if (!source.startsWith('[')) {
        if (start !== undefined && end !== undefined) ranges.push({ start, end });
        return;
      }
    }
    node.children?.forEach(visit);
  };

  visit(markdownParser.parse(markdown) as unknown as PositionedNode);
  for (const match of markdown.matchAll(/\bhttps?:\/\/[^\s<>()]+/gi)) {
    const start = match.index ?? 0;
    ranges.push({ start, end: start + match[0].length });
  }
  return ranges.sort((left, right) => left.start - right.start);
};

const getUnprotectedRanges = (length: number, protectedRanges: SourceRange[]): SourceRange[] => {
  const merged: SourceRange[] = [];
  for (const range of protectedRanges) {
    const start = Math.max(0, range.start);
    const end = Math.min(length, range.end);
    const previous = merged[merged.length - 1];
    if (previous && start <= previous.end) {
      previous.end = Math.max(previous.end, end);
    } else if (start < end) {
      merged.push({ start, end });
    }
  }

  const visible: SourceRange[] = [];
  let cursor = 0;
  for (const range of merged) {
    if (cursor < range.start) visible.push({ start: cursor, end: range.start });
    cursor = Math.max(cursor, range.end);
  }
  if (cursor < length) visible.push({ start: cursor, end: length });
  return visible;
};

const getContainerPrefixes = (source: string, offset: number) => {
  const lineStart = source.lastIndexOf('\n', offset - 1) + 1;
  const linePrefix = source.slice(lineStart, offset);
  const containerPrefix = linePrefix.match(/^(?: {0,3}> ?)*(?: {0,3}(?:[-+*]|\d+[.)]) +)?/)?.[0] ?? '';
  const continuationPrefix = containerPrefix.replace(/([-+*]|\d+[.)]) +$/, (marker) => ' '.repeat(marker.length));
  return { lineStart, containerPrefix, continuationPrefix };
};

const isEscaped = (source: string, offset: number) => offset > 0 && source[offset - 1] === '\\';

const convertVisibleMath = (markdown: string) => {
  const edits: SourceEdit[] = [];
  let converted = false;
  const delimiters = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
  const unprotectedRanges = getUnprotectedRanges(markdown.length, getProtectedRanges(markdown));

  for (const range of unprotectedRanges) {
    const sourceText = markdown.slice(range.start, range.end);
    delimiters.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = delimiters.exec(sourceText)) !== null) {
      const absoluteStart = range.start + match.index;
      const absoluteEnd = absoluteStart + match[0].length;
      const open = match[0].startsWith('\\[') ? '[' : '(';
      const closeStart = absoluteStart + match[0].lastIndexOf(open === '[' ? '\\]' : '\\)');
      if (isEscaped(markdown, absoluteStart) || isEscaped(markdown, closeStart)) continue;

      if (open === '(') {
        edits.push({
          start: absoluteStart,
          end: absoluteEnd,
          replacement: `$${match[2]}$`,
        });
      } else {
        const { lineStart, containerPrefix, continuationPrefix } = getContainerPrefixes(markdown, absoluteStart);
        const content = (match[1] ?? '').split(/\r?\n/).map((line) => (
          continuationPrefix && line.startsWith(continuationPrefix)
            ? line.slice(continuationPrefix.length)
            : line
        )).join('\n').replace(/^\n|\n$/g, '');
        const hasContainerPrefix = containerPrefix.length > 0;
        const hasPreviousProse = markdown.slice(lineStart + containerPrefix.length, absoluteStart).trim().length > 0;
        const hasFollowingProse = markdown.slice(absoluteEnd).split(/\r?\n/, 1)[0].trim().length > 0;
        const continuation = continuationPrefix;
        const displayBlock = `$$\n${continuation}${content.split('\n').join(`\n${continuation}`)}\n${continuation}$$`;
        edits.push({
          start: hasContainerPrefix && !hasPreviousProse ? lineStart : absoluteStart,
          end: absoluteEnd,
          replacement: hasContainerPrefix
            ? hasPreviousProse
              ? `\n${continuation}${displayBlock}${hasFollowingProse ? `\n${continuation}` : '\n'}`
              : `${containerPrefix}${displayBlock}${hasFollowingProse ? `\n${continuation}` : '\n'}`
            : `\n$$\n${content}\n$$\n`,
        });
      }
      converted = true;
    }
  }

  edits.sort((left, right) => right.start - left.start);
  let output = markdown;
  for (const edit of edits) {
    output = `${output.slice(0, edit.start)}${edit.replacement}${output.slice(edit.end)}`;
  }
  return { text: output, converted };
};

export const prepareQuestionMarkdown = (text: string) => {
  const content = getQuestionTextBody(text);
  const result = convertVisibleMath(content);
  return {
    text: result.text,
    // Paired TeX is an explicit Markdown signal for legacy fields without the marker.
    shouldRender: MARKDOWN_PREFIX.test(text) || result.converted,
  };
};
