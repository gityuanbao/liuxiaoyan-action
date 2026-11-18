import type { AvatarId } from './character-data'
export function SkillCardArt({ avatar }: { avatar: AvatarId }) {
  return <img className="skill-illustration" src={`/art/monster-cards-v1/card-${avatar}.webp`} alt=""/>
}
