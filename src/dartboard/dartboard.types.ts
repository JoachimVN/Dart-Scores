export type Ring =
  | 'bullseye'
  | 'outerBull'
  | 'double'
  | 'treble'
  | 'innerSingle'
  | 'outerSingle'
  | 'miss'

export interface HitResult {
  /** 1-20, or null for bullseye/outerBull/miss which have no segment */
  segment: number | null
  ring: Ring
}

/** A fully resolved board click: segment/ring plus the score it's worth. */
export interface BoardThrow {
  segment: number | null
  ring: Ring
  value: number
  label: string
}
