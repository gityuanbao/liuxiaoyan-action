import type { ReactNode } from 'react'

// A shared metal / enamel vocabulary, drawn on one 40-unit game grid.
const motifs: Record<string, { body: string; detail: string; crystal?: string }> = {
  expedition: { body:'M13 15 20 8l7 7v16H13V15ZM10 33h20v3H10Z', detail:'M10 15h20M16 28l4-10 4 10h-8M20 3v5m0-5 9 3-9 3M16 31v2m8-2v2', crystal:'m20 18 2 5-2 3-2-3 2-5Z' },
  camp: { body:'M20 4c-2 8-9 10-9 18a9 9 0 0 0 18 0c0-6-5-10-6-13 0 5-2 6-3 8-2-4 1-8 0-13ZM8 32l23 5 1-3-22-5-2 3Z', detail:'M11 37l20-7M15 27c-3-5 2-8 4-12 0 5 5 6 5 10 0 5-7 7-9 2Z', crystal:'m20 20 3 6-3 4-3-4 3-6Z' },
  notebook: { body:'M7 6h24v29H7a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3ZM31 9h4v26h-4V9Z', detail:'M9 6v29M4 29h27M14 13h11m-11 4h7M27 6v14l-4-3-4 3V6', crystal:'m20 22 4 4-4 4-4-4 4-4Z' },
  world: { body:'M20 4a15 15 0 1 0 0 30 15 15 0 0 0 0-30Zm0 4a11 11 0 1 1 0 22 11 11 0 0 1 0-22ZM15 35h10v3H15Z', detail:'M4 20h32M20 4v30M9 9l22 22M31 9 9 31M12 20c0-12 16-12 16 0s-16 12-16 0Z', crystal:'m20 13 5 7-5 7-5-7 5-7Z' },
  exam: { body:'M20 3 34 9v13c0 8-14 15-14 15S6 30 6 22V9L20 3ZM20 7l-10 5v10c0 5 10 11 10 11s10-6 10-11V12L20 7Z', detail:'M20 9v22M10 20h20m-17-9 14 18m0-18L13 29', crystal:'m20 10 3 4-3 4-3-4 3-4Zm0 12 3 4-3 4-3-4 3-4Zm-10-2 4-3 4 3-4 3-4-3Zm12 0 4-3 4 3-4 3-4-3Z' },
  keyboard: { body:'M4 11h32v21H4V11Zm4-4h24v4H8V7Z', detail:'M8 16h4v4H8v-4Zm10 0h4v4h-4v-4Zm10 0h4v4h-4v-4ZM8 25h4m5 0h14M12 35h16', crystal:'m20 1 2 3-2 3-2-3 2-3Z' },
  lobby: { body:'M6 33V18a14 14 0 0 1 28 0v15h-5V18a9 9 0 0 0-18 0v15H6ZM3 34h34v3H3Z', detail:'M9 13h3m16 0h3M17 6v4m6-4v4M14 31v-4a4 4 0 0 1 8 0v4M27 31v-4a4 4 0 0 0-4-4', crystal:'M21 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm7 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z' },
  moonbridge: { body:'M7 30c1-13 25-13 26 0v5h-6v-5c0-7-14-7-14 0v5H7v-5ZM28 4a8 8 0 1 1-11 11c7 1 12-4 11-11Z', detail:'M4 30h32M9 26v-5m6 2v-5m10 5v-5m6 8v-5M18 35h4' },
  forest: { body:'m13 5-9 16h5L5 29h16l-4-8h5L13 5Zm14 5-6 12h4l-3 8h13l-4-8h3l-7-12Z', detail:'M13 16v20m14-15v15M8 36h24', crystal:'m13 13 2 4-2 3-2-3 2-4Z' },
  harbor: { body:'M5 26h30l-6 9H11l-6-9ZM19 5 7 22h12V5Zm4 3v14h11L23 8Z', detail:'M20 4v22M5 37c3-3 6 3 9 0s6 3 9 0 6 3 9 0', crystal:'m27 2 2 3-2 3-2-3 2-3Z' },
  tower: { body:'M11 14h18v22H11V14ZM7 14 20 3l13 11H7ZM7 36h26v2H7Z', detail:'M15 17v15m10-15v15M17 36V24h6v12M20 3v5', crystal:'m20 15 3 4-3 4-3-4 3-4Z' },
  letter: { body:'M4 10h32v24H4V10Z', detail:'m4 10 16 13 16-13M4 34l10-12m22 12L26 22M10 6h20', crystal:'m20 20 5 4-2 6h-6l-2-6 5-4Z' },
  hero: { body:'M13 6h14v11c0 6-14 6-14 0V6ZM7 36V28l9-6 4 5 4-5 9 6v8H7Z', detail:'M13 12h14M9 31h7m8 0h7M20 27v9', crystal:'m20 3 3 3-3 3-3-3 3-3Z' },
  spirit: { body:'M6 10c-2 8 1 13 5 16-2 9 8 13 13 6 9 5 14-2 10-8 4-5 3-10-1-15l-5 9c-4-3-8-3-12-1L6 10Z', detail:'M13 23h2m10 0h2m-11 5 4 2 4-2M9 6l1-3m23 2 2-2', crystal:'m20 9 3 5-3 4-3-4 3-5Z' },
  dawn: { body:'m20 2 5 13-5 17-5-17 5-13ZM10 30h20v4H10Z', detail:'M20 8v23M20 34v4M7 20H2m36 0h-5M9 9 5 5m26 4 4-4M9 28l-4 4m26-4 4 4', crystal:'m20 10 2 5-2 7-2-7 2-5Z' },
  ward: { body:'M20 4 33 9v12c0 7-13 15-13 15S7 28 7 21V9l13-5Z', detail:'m12 15 8-5 8 5v9l-8 7-8-7v-9Zm8-5v21M12 20h16', crystal:'m20 14 4 6-4 6-4-6 4-6Z' },
  insight: { body:'M3 20c8-14 26-14 34 0C29 34 11 34 3 20Z', detail:'M12 20a8 8 0 1 0 16 0 8 8 0 0 0-16 0ZM20 3v4m0 26v4M6 8l3 3m22 18 3 3M34 8l-3 3M9 29l-3 3', crystal:'m20 13 4 7-4 7-4-7 4-7Z' },
  coins: { body:'M7 16h20v18H7V16Zm6-9h20v18H13V7Z', detail:'M13 11c0 4 20 4 20 0m-20 6c0 4 20 4 20 0M7 21c0 4 20 4 20 0m-20 7c0 4 20 4 20 0', crystal:'m23 10 3 3-3 3-3-3 3-3Z' },
  listening: { body:'M7 17a13 13 0 0 1 26 0v11h-6V16H13v12H7V17Z', detail:'M13 13c3-7 11-7 14 0M13 27l5 4h8M3 19v6m34-6v6', crystal:'M26 30h7v5h-7v-5Z' },
  reading: { body:'M20 10C14 5 7 6 3 8v25c6-3 11-2 17 2 6-4 11-5 17-2V8c-4-2-11-3-17 2Z', detail:'M20 10v25M7 14l8 1m-8 5 8 1m10-6 8-1m-8 7 8-1M7 26h8m10 0h8', crystal:'m20 2 2 3-2 3-2-3 2-3Z' },
  writing: { body:'M7 12h20v24H7V12Zm10 13L29 5h6l-3 9-13 15-5 2 3-6Z', detail:'m29 5 3 9M19 25l13-11M11 20h5m-5 5h3m-3 7h11', crystal:'m34 2 2 2-2 2-2-2 2-2Z' },
  speaking: { body:'M20 4a7 7 0 0 1 7 7v10a7 7 0 0 1-14 0V11a7 7 0 0 1 7-7ZM14 35h12v3H14Z', detail:'M9 19v3a11 11 0 0 0 22 0v-3M20 33v2m-7-21h14M3 13v8m34-8v8', crystal:'m20 6 3 5-3 5-3-5 3-5Z' },
  star: { body:'m20 3 5 11 12 2-9 9 2 12-10-6-10 6 2-12-9-9 12-2 5-11Z', detail:'m20 9 3 8 9 1-7 6 1 8-6-4-6 4 1-8-7-6 9-1 3-8Z', crystal:'m20 14 4 7-4 6-4-6 4-7Z' },
  lock: { body:'M8 18h24v18H8V18ZM12 18V11a8 8 0 1 1 16 0v7h-5v-7a3 3 0 0 0-6 0v7h-5Z', detail:'M20 26v5M12 32h3m10 0h3', crystal:'M23 25a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z' },
  trophy: { body:'M12 5h16v13a8 8 0 0 1-16 0V5Zm3 29h10v4H15Z', detail:'M12 9H5v6a7 7 0 0 0 7 7m16-13h7v6a7 7 0 0 1-7 7M20 26v8', crystal:'m20 9 3 5-3 5-3-5 3-5Z' },
  search: { body:'M18 4a13 13 0 1 0 0 26 13 13 0 0 0 0-26Zm0 5a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm9 17 11 8-4 4-8-11 1-1Z', detail:'M13 13c2-3 5-3 8-2', crystal:'m18 14 3 4-3 4-3-4 3-4Z' },
  add: { body:'m20 3 16 8v18l-16 8-16-8V11l16-8Z', detail:'M20 10v20M10 20h20', crystal:'m20 15 5 5-5 5-5-5 5-5Z' },
  check: { body:'m20 3 16 8v18l-16 8-16-8V11l16-8Z', detail:'m11 20 6 6 13-14', crystal:'m12 19 4 3-2 4-4-3 2-4Z' },
}
const aliases: Record<string,string> = { 'practice-setup':'keyboard', book:'reading', people:'lobby', shield:'ward', leaf:'forest', sound:'listening', rune:'insight', note:'writing', saved:'star', review:'insight', all:'reading', party:'hero', runes:'insight', letters:'letter', route:'expedition', gates:'exam', journal:'letter', records:'letter', goals:'compass', bond:'hero' }
const utilities: Record<string,string> = {
  home:'M3 10 12 3l9 7M5 9v11h14V9M9 20v-7h6v7',
  sword:'m5 3 14 14m0-14L5 17m-2 0 4 4m10 0 4-4M3 3l2 6 4-4-6-2m18 0-6 2 4 4 2-6',
  chart:'M4 20V4m0 16h17M8 16v-5m5 5V7m5 9V3',
  spark:'m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z',
  compass:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM16 8l-3 5-5 3 3-5 5-3Z',
  settings:'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  arrow:'M4 12h16m-6-6 6 6-6 6', back:'M20 12H4m6-6-6 6 6 6',
  download:'M5 3h14v18H5V3Zm7 4v9m-4-4 4 4 4-4M8 19h8',
  clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2',
  moon:'M20 14A8 8 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z',
  shuffle:'M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 3-2 4-4m4-4c1-2 2-4 4-4h3m-4-4 4 4-4 4',
  ghost:'M5 21V10a7 7 0 0 1 14 0v11l-4-3-3 3-3-3-4 3Zm4-11h.01M15 10h.01m-5 4h4',
  snow:'M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4m10 14-1-4 4-1M4 14l4 1-1 4m10-14-1 4 4 1',
  play:'m7 3 14 9-14 9V3Z', pause:'M6 3h4v18H6V3Zm8 0h4v18h-4V3Z',
  eye:'M2 12c5-9 15-9 20 0-5 9-15 9-20 0Zm7 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z',
  copy:'M8 8h13v13H8V8ZM3 16V3h13',
}
export function Icon({ name, size = 22, className = '' }: { name: string; size?: number; className?: string }) {
  const resolved = aliases[name] ?? name, art = motifs[resolved]
  let content: ReactNode
  if (art) content = <g strokeLinecap="round" strokeLinejoin="round"><path d={art.body} fill="#08172c" stroke="none" transform="translate(0 1.5)" opacity=".7"/><path d={art.body} fill="var(--icon-enamel,#233e5c)" stroke="var(--icon-metal,#b28d52)" strokeWidth="1.6"/><path d={art.detail} fill="none" stroke="currentColor" strokeWidth="1.6"/>{art.crystal && <path d={art.crystal} fill="var(--icon-crystal,#9fd7dc)" stroke="#ead19b" strokeWidth="1"/>}</g>
  else content = <g transform="translate(4 4) scale(1.3333)" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={utilities[resolved] ?? utilities.spark}/></g>
  return <svg className={`game-icon ${className}`} data-game-icon={resolved} width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true" focusable="false">{content}</svg>
}
export function PageEmblem({ name }: { name:string }) { return <span className="page-emblem" aria-hidden="true"><Icon name={name} size={48}/></span> }
