import { PageEmblem } from '../academy/Icon'
export function Matchmaking() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center network-waiting"><PageEmblem name="compass"/>
        <h2 className="text-2xl font-bold text-accent mb-4">正在寻找对手</h2>
        <div className="flex justify-center gap-1 mb-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block w-2 h-2 bg-accent rounded-full animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
        <p className="text-text/40 text-sm">等待另一位冒险者加入…</p>
      </div>
    </div>
  )
}
