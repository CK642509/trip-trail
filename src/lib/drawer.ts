export type Snap = 'peek' | 'half' | 'full'

export const PEEK = 74

/** 抽屜在各段的高度（px）；stageH 是地圖區的高度。 */
export function snapHeight(snap: Snap, stageH: number): number {
  if (snap === 'peek') return Math.min(PEEK, stageH)
  if (snap === 'half') return Math.max(PEEK, Math.round(stageH * 0.48))
  return stageH
}
