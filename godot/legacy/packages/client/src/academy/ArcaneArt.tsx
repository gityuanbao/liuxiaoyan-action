
export function ArcaneSigil({ className = '' }: { className?: string }) {
  return <svg className={`arcane-sigil ${className}`} viewBox="0 0 200 200" fill="none" aria-hidden="true"><circle cx="100" cy="100" r="93"/><circle cx="100" cy="100" r="83" strokeDasharray="1 6"/><circle cx="100" cy="100" r="68"/><path d="M100 26 164 137H36ZM100 174 36 63h128Z"/><path d="m100 7 5 12-5 12-5-12Zm93 93-12 5-12-5 12-5Zm-93 93-5-12 5-12 5 12ZM7 100l12-5 12 5-12 5Z"/><circle cx="100" cy="100" r="24"/><path d="m100 76 8 16 16 8-16 8-8 16-8-16-16-8 16-8Z"/>{Array.from({length:12},(_,i)=><path key={i} d="M98 13v9m4-9v9m-7-6h10" transform={`rotate(${i*30} 100 100)`}/>)}</svg>
}
// Illustrations are UI props; original character and scene art remains unchanged.
const LANDMARK_IDS = ['forest', 'tower', 'harbor', 'academy', 'garden', 'camp', 'ruins', 'observatory', 'trials']
export function Landmark({ id }: { id: string }) {
  return <img className="landmark-art" src={`/art/ui-reference-v1/landmark-${LANDMARK_IDS.includes(id) ? id : 'trials'}.webp`} alt="" aria-hidden="true"/>
}
