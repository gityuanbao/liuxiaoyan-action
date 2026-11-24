const WORD_FIELDS = ['word','term','english','headword','单词','英文','英语','词汇','词条'];
const MEANING_FIELDS = ['meaning','translation','definition','definitioncn','chinese','trans','中文','中文释义','中文翻译','释义','翻译','词义','解释'];
const INDEX_FIELDS = ['index','number','no','序号','编号'];
const TERM = /^[a-z]+(?:[-' ][a-z]+)*$/i;
const textEncoder = new TextEncoder();

export const MAX_BOOK_WORDS = 12000;

function normalizeTerm(text) {
  return text.normalize('NFKC').trim().replace(/[‘’]/g,"'").replace(/[‐‑–]/g,'-').replace(/\s+/g,' ').toLowerCase();
}

function normalizeField(text) {
  return normalizeTerm(text).replace(/[\s_.-]/g,'');
}

function plainMeaning(value) {
  return typeof value === 'string' ? value.replace(/[\s\u0000-\u001f\u007f]+/g,' ').trim() : '';
}

function normalizeMeaning(value) {
  return Array.isArray(value) ?
    value.map(item => plainMeaning(item?.tranCn ?? item?.meaning ?? item?.translation ?? item?.cn ?? item))
      .filter(Boolean).join('；') : plainMeaning(value);
}

function findField(row, fields) {
  return row.findIndex(value => fields.includes(normalizeField(value)));
}

// Quoted CSV cells can contain delimiters, escaped quotes, or line breaks.
function* delimitedRows(text, delimiter) {
  let row = [], cell = '', quoted = false, line = 1, firstLine = 1;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
      } else {
        if (char === '\n') line++;
        cell += char;
      }
    } else if (char === '"' && !cell.trim()) {
      cell = '';
      quoted = true;
    } else if (char === delimiter || char === '\n') {
      row.push(cell.trim());
      cell = '';
      if (char === '\n') {
        yield {cells:row,line:firstLine};
        row = [];
        firstLine = ++line;
      }
    } else {
      cell += char;
    }
  }
  if (quoted) throw Error(`第 ${firstLine} 行的引号未闭合，请检查词表。`);
  if (row.length || cell) yield {cells:[...row,cell.trim()],line:firstLine};
}

function isAuxiliaryLine(line) {
  return !line || /^(?:#|\/\/)/.test(line) ||
    /^(?:(?:unit|list|lesson|chapter|day)\s*\d+|第\s*[\d一二三四五六七八九十]+\s*(?:单元|课|章|节|天))(?:\s|[:：]|$)/i.test(line);
}

function splitTextLine(line) {
  line = line.replace(/^\d+(?:\s*[.、)）]\s*|\s+)/, '');
  if (TERM.test(normalizeTerm(line))) return [line, ''];
  const explicit = /^(.*?)\s*(?:\t|[,，|:：]|\s+[-—–=]+\s+)\s*(.*)$/.exec(line);
  if (explicit && TERM.test(normalizeTerm(explicit[1]))) return explicit.slice(1);
  const chinese = /^(.*?)\s+([\u2e80-\u9fff].*)$/u.exec(line);
  if (chinese) {
    const [word,pos] = chinese[1].split(/\s+((?:n|v|vt|vi|adj|adv|prep|conj|pron|aux|det|num|int)\.)$/i);
    if (TERM.test(normalizeTerm(word))) return [word,pos ? pos+' '+chinese[2] : chinese[2]];
  }
  const legacy=/^([a-z]+(?:[-'][a-z]+)*)\s+(.+)$/i.exec(line);
  return legacy ? legacy.slice(1) : [line, ''];
}

function* textEntries(text) {
  const lines = text.split('\n');
  const firstIndex = lines.findIndex(line=>!isAuxiliaryLine(line.trim()));
  if (firstIndex < 0) return;
  const first = lines[firstIndex];
  const delimiter = ['\t',',',';','，','|'].find(candidate => first.includes(candidate));
  if (!delimiter) {
    for (const [index, raw] of lines.entries()) {
      const line = raw.trim();
      const header = line.split(/\s+/);
      if (index===firstIndex && WORD_FIELDS.includes(normalizeField(header[0])) &&
          MEANING_FIELDS.includes(normalizeField(header.slice(1).join(' ')))) continue;
      if (!isAuxiliaryLine(line)) yield {entry:splitTextLine(line),at:`第 ${index+1} 行`};
    }
    return;
  }
  let wordColumn = null, meaningColumn = -1;
  for (const {cells,line} of delimitedRows(text,delimiter)) {
    if (isAuxiliaryLine(cells[0]) && (cells[0] || cells.every(cell => !cell))) continue;
    let entry;
    if (wordColumn === null) {
      const headerWord = findField(cells,WORD_FIELDS);
      const headerMeaning = findField(cells,MEANING_FIELDS);
      if (headerWord >= 0 && (headerMeaning >= 0 || cells.length === 1 ||
          INDEX_FIELDS.includes(normalizeField(cells[0])))) {
        wordColumn = headerWord;
        meaningColumn = headerMeaning;
        continue;
      }
      wordColumn = -1;
    }
    if (wordColumn >= 0) {
      if (cells.every(cell => !cell)) continue;
      entry = [cells[wordColumn],cells[meaningColumn]];
    } else if (cells.length === 1) {
      entry = splitTextLine(cells[0]);
    } else {
      const termIndex = /^\d+$/.test(cells[0]) && cells.length > 1 ? 1 : 0;
      entry = TERM.test(normalizeTerm(cells[termIndex])) ?
        [cells[termIndex],cells.slice(termIndex+1).join(delimiter === '\t' ? ' ' : delimiter)] :
        splitTextLine(cells.join(delimiter));
    }
    yield {entry,at:`第 ${line} 行`};
  }
}

function wordProperties(item) {
  if (typeof item === 'string') return splitTextLine(item);
  if (Array.isArray(item)) return item[0]?.startsWith?.('custom:') ? item.slice(1,3) : item.slice(0,2);
  if (!item || typeof item !== 'object') return [];
  const properties = Object.entries(item);
  const fields = properties.map(([key]) => key);
  const word = properties[findField(fields,WORD_FIELDS)]?.[1];
  const meaning = properties[findField(fields,MEANING_FIELDS)]?.[1] ?? item.content?.word?.content?.trans;
  return [word,meaning];
}

function* jsonEntries(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw Error('JSON 格式有误，请检查引号、逗号或括号。');
  }
  if (!data || typeof data !== 'object') throw Error('JSON 词表应包含词条列表或单词与释义。');
  const rows = Array.isArray(data) ? data : [data.words,data.entries,data.vocabulary,data.rows,data.data].find(Array.isArray);
  if (rows) {
    for (const [index,item] of rows.entries()) yield {entry:wordProperties(item),at:`第 ${index+1} 条`};
  } else {
    const single = wordProperties(data);
    if (typeof single[0] === 'string' && single[1] !== undefined) {
      yield {entry:single,at:'第 1 条'};
    } else {
      for (const [index,entry] of Object.entries(data).entries()) yield {entry,at:`第 ${index+1} 条`};
    }
  }
}

export function parseWordbook(text, previousWords, lookup) {
  if (typeof text !== 'string') throw Error('请填写单词或导入词书文件。');
  if (text.length > 2000000 || textEncoder.encode(text).length > 2000000) {
    throw Error('词书文件超过 2 MB，请缩短释义后重试。');
  }
  text = text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  const rows = /^[\s]*[\[{]/.test(text) ? jsonEntries(text) : textEntries(text);
  const oldByWord = new Map(previousWords.map(entry=>[normalizeTerm(entry.word),entry]));
  const active = new Map(), missing = new Map();
  let merged = 0, supplemented = 0;
  for (const {entry,at} of rows) {
    const word = typeof entry[0] === 'string' ? normalizeTerm(entry[0]) : '';
    if (word.length > 40 || !TERM.test(word)) {
      throw Error(`${at}的英文词条无法识别。请填写英文单词或短语，最多 40 个字符。`);
    }
    const old = oldByWord.get(word);
    const supplied = normalizeMeaning(entry[1]);
    if (supplied.length > 200) throw Error(`${at}「${word}」的释义超过 200 字。`);
    const row = active.get(word);
    if (row) {
      merged++;
      if (!supplied) continue;
      if (!row.supplied) {
        row.meaning = supplied;
        row.supplied = true;
        supplemented--;
      } else {
        const distinct = [...new Set([...row.meaning.split('；'),...supplied.split('；')])].join('；');
        if (distinct.length <= 200) row.meaning = distinct;
      }
      continue;
    }
    const meaning = supplied || normalizeMeaning(old?.meaning) || normalizeMeaning(lookup(word));
    if (!meaning) {
      missing.set(word,at);
      continue;
    }
    if (!supplied) supplemented++;
    if (missing.delete(word)) merged++;
    active.set(word,{word,meaning:meaning.slice(0,200),old,supplied:!!supplied});
    if (active.size > MAX_BOOK_WORDS) throw Error(`每本词书最多导入 ${MAX_BOOK_WORDS} 词。`);
  }
  if (missing.size) {
    const examples = [...missing.entries()].slice(0,3).map(([word,at])=>`${at} ${word}`).join('、');
    throw Error(`有 ${missing.size} 词缺少释义（${examples}），请补充后重新导入。`);
  }
  if (!active.size) throw Error('词表为空，请至少添加一个单词。');
  return {rows:[...active.values()],merged,supplemented};
}

export function editorLine({word,meaning}) {
  const cell = /["\t]/.test(meaning) ? '"' + meaning.replaceAll('"','""') + '"' : meaning;
  return word + '\t' + cell;
}
