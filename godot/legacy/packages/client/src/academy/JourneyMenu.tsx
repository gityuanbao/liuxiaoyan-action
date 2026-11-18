import { useGameStore } from '../store'
import { earnedSeals } from './trial-core'
import { useLearning } from './learning-store'
import { Icon } from './Icon'
const entries = [
  ['expedition', '星灯远征', '十二道航标'], ['camp', '旅人营火', '契约与培养'],
  ['notebook', '词之书', '收藏与回忆'], ['world', '世界档案', '群岛的故事'],
  ['exam', '四域印记', '听读写说'], ['practice-setup', '打字试炼', '磨炼输入'], ['lobby', '联机', '与旅人相遇'],
] as const
export function MenuCrest({ kind }: { kind:string }) { return <Icon name={kind} size={40}/> }
export function JourneyMenu() {
  const setScreen = useGameStore(s => s.setScreen), profile = useLearning()
  return <nav className="world-quick-links journey-menu" aria-label="旅途菜单">{entries.map(([screen,label,detail]) => <button key={screen} className={`journey-menu-item menu-${screen}`} onClick={() => setScreen(screen)}><span className="menu-crest"><MenuCrest kind={screen}/></span><span className="menu-caption"><b>{label}</b><small>{screen === 'exam' ? `${earnedSeals(profile.trials).size} / 4 枚已修复` : detail}</small></span></button>)}</nav>
}
export function PageTabs<T extends string>({ value,onChange,items,label }: { value:T; onChange:(value:T)=>void; items:readonly (readonly [T,string])[]; label:string }) {
  return <div className="folio-tabs" role="group" aria-label={label}>{items.map(([id,text]) => <button key={id} aria-pressed={value === id} className={value === id ? 'selected' : ''} onClick={() => onChange(id)}><Icon name={id} size={21}/>{text}</button>)}</div>
}
