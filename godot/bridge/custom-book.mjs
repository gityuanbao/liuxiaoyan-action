import {editorLine,parseWordbook} from './wordbook-import.mjs';

export {MAX_BOOK_WORDS} from './wordbook-import.mjs';
export const CUSTOM_BOOK_ID = 'custom';
export const CUSTOM_BOOK_NAME = '自定义词书';
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

export function editCustomBook(previous, {name, text}, lookup = () => null) {
  if (typeof name !== 'string') throw Error('请填写词书名称。');
  name = name.trim();
  if (!name || name.length > 16 || /[\r\n]/.test(name)) throw Error('词书名称需要 1 至 16 个字符。');
  if (text===null && previous) return {...previous,name};
  const {rows} = parseWordbook(text,previous?.words ?? [],lookup);
  const words = rows.map(({word,meaning,old})=>({...old,id:old?.id ?? wordId(word),
    word,meaning,pack:CUSTOM_BOOK_ID,example:old?.example ?? '',translation:old?.translation ?? ''}));
  return {name,words};
}

export function previewCustomBook(previous, text, lookup = () => null) {
  const {rows,merged,supplemented} = parseWordbook(text,previous?.words ?? [],lookup);
  return {count:rows.length,merged,supplemented,previewOnly:rows.length>200,
    text:rows.slice(0,rows.length>200 ? 13 : rows.length).map(editorLine).join('\n')};
}

export function customBookEditor(profile) {
  const book = getCustomBook(profile);
  return book && {name:book.name, count:book.words.length, text:book.words.length > 200 ? null :
    book.words.map(editorLine).join('\n')};
}
