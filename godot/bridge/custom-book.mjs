export const CUSTOM_BOOK_ID = 'custom';
export const CUSTOM_BOOK_NAME = '自定义词书';
export const MAX_BOOK_WORDS = 12000;
const localBooks = new WeakMap();

export function attachCustomBook(profile, book) {
  if (book) localBooks.set(profile, book);
  return profile;
}

export function getCustomBook(profile) {
  const local = profile && localBooks.get(profile);
  if (local) return local;
  const notebook = profile?.notebook;
  if (notebook?.customBookLocal || !notebook?.custom?.length) return null;
  const ids = notebook.customBook && new Set(notebook.customBook.ids);
  return {
    name: notebook.customBook?.name ?? CUSTOM_BOOK_NAME,
    words: ids ? notebook.custom.filter(word => ids.has(word.id)) : notebook.custom,
  };
}

export function hasCustomBook(profile) {
  return Boolean(getCustomBook(profile));
}

export function activeCustomWords(profile) {
  return getCustomBook(profile)?.words ?? [];
}

// The input permits letters, hyphens, apostrophes and spaces. Digits encode
// apostrophes and spaces unambiguously, even after a replacement import.
const wordId = word => 'custom:term-' + word.replaceAll("'", '0').replaceAll(' ', '1');
const validTerm=/^[a-z]+(?:[-' ][a-z]+)*$/i;

export function editCustomBook(previous, {name, text}) {
  if (typeof name !== 'string') throw Error('请填写词书名称。');
  name = name.trim();
  if (!name || name.length > 16 || /[\r\n]/.test(name)) throw Error('词书名称需要 1 至 16 个字符。');
  if (text===null && previous) return {...previous,name};
  if (typeof text !== 'string') throw Error('请填写单词或导入词书文件。');
  if (text.length > 1500000) throw Error('文件太大，请缩短释义后重新导入。');
  const existingWords = new Map((previous?.words ?? []).map(word => [word.word.toLowerCase(), word]));
  const active = new Map();
  let firstRow = true;
  for (const [index, line] of text.replace(/^\uFEFF/, '').split(/\r\n?|\n/).entries()) {
    if (!line.trim()) continue;
    if (firstRow && /^\s*"?(?:单词|英文)"?[,，\t ]+"?(?:释义|中文释义|中文)"?\s*$/.test(line)) {
      firstRow = false;
      continue;
    }
    const delimited=/^(?:"([^"]+)"|([^,，\t|]+))\s*[,，\t|]\s*(.+)$/.exec(line.trim());
    const field=(delimited?.[1]??delimited?.[2])?.trim().replace(/\s+/g,' ');
    const flat=/^([a-z]+(?:[-'][a-z]+)*)\s+(.+)$/i.exec(line.trim());
    const structured=field&&validTerm.test(field);
    const word=(structured?field:flat?.[1])?.toLowerCase();
    const meaning=(structured?delimited[3]:flat?.[2])?.trim().replace(/^"(.*)"$/, (_, quoted) => quoted.replaceAll('""', '"'));
    if (firstRow && word === 'word' && ['meaning', 'translation', '释义', '中文释义'].includes(meaning?.toLowerCase())) {
      firstRow = false;
      continue;
    }
    firstRow = false;
    if (!word || word.length > 40 || !meaning || meaning.length > 200) {
      throw Error(`第 ${index + 1} 行请填写英文单词和释义，用空格、逗号或 Tab 分隔。释义最多 200 字。`);
    }
    if (active.has(word)) {
      const row=active.get(word);
      const meanings=row.meaning.split('；');
      if (!meanings.includes(meaning)&&row.meaning.length+1+meaning.length<=200) row.meaning+='；'+meaning;
      continue;
    }
    const existing = existingWords.get(word);
    active.set(word, {...existing, id: existing?.id ?? wordId(word),
      word, meaning, pack: CUSTOM_BOOK_ID, example: existing?.example ?? '', translation: existing?.translation ?? ''});
    if (active.size > MAX_BOOK_WORDS) throw Error(`每本词书最多导入 ${MAX_BOOK_WORDS} 词。`);
  }
  if (!active.size) throw Error('请至少添加一个单词。');
  return {name,words:[...active.values()]};
}

export function customBookEditor(profile) {
  const book = getCustomBook(profile);
  return book && {name:book.name, count:book.words.length, text:book.words.length > 200 ? null :
    book.words.map(word => word.word + '\t' + word.meaning).join('\n')};
}
