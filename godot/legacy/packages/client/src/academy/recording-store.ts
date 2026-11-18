function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => { const request = indexedDB.open('starlanguage_voice_v1', 1); request.onupgradeneeded = () => request.result.createObjectStore('recordings'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
}
export async function saveRecording(id: string, blob: Blob): Promise<void> {
  const db = await database()
  try { await new Promise<void>((resolve, reject) => { const transaction = db.transaction('recordings', 'readwrite'); transaction.objectStore('recordings').put(blob, id); transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error) }) } finally { db.close() }
}
export async function getRecording(id: string): Promise<Blob | undefined> {
  const db = await database()
  try { return await new Promise<Blob | undefined>((resolve, reject) => { const request = db.transaction('recordings').objectStore('recordings').get(id); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) }) } finally { db.close() }
}
export function downloadRecording(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = name + (blob.type.includes('mp4') ? '.m4a' : blob.type.includes('ogg') ? '.ogg' : '.webm'); link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
