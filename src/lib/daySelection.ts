/** 目前顯示哪幾天；null 表示全部。 */
export type DaySelection = number[] | null

/** 去掉不存在的天數、排序；選到全部或什麼都沒選時回傳 null（全部）。 */
export function normalizeSelection(sel: DaySelection, allIds: number[]): DaySelection {
  if (sel === null) return null
  const ids = [...new Set(sel)].filter((id) => allIds.includes(id)).sort((a, b) => a - b)
  return ids.length === 0 || ids.length === allIds.length ? null : ids
}

/**
 * 點某一天的按鈕。
 * - 單選：只看這一天。
 * - 複選：從「全部」開始點，先變成只有這一天；之後點一下加入、再點一下移除（至少留一天）。
 */
export function tapDay(
  sel: DaySelection,
  id: number,
  multi: boolean,
  allIds: number[],
): DaySelection {
  if (!multi || sel === null) return normalizeSelection([id], allIds)
  if (sel.includes(id)) return sel.length === 1 ? sel : sel.filter((x) => x !== id)
  return normalizeSelection([...sel, id], allIds)
}

/** 關掉複選時，只留第一天。 */
export function toSingle(sel: DaySelection): DaySelection {
  return sel && sel.length > 1 ? [sel[0]] : sel
}
