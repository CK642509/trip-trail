import { z } from 'zod'

/** 交通方式。線型樣式由程式決定，資料只寫代號。 */
export const TRAVEL_MODES = [
  'rail',
  'subway',
  'bus',
  'boat',
  'walk',
  'taxi',
  'flight',
  'open',
] as const

/** Markdown 文字。長內容可以寫成字串陣列（每個元素一行），讀進來時會用換行接起來。 */
const markdown = z
  .union([z.string().min(1), z.array(z.string()).min(1)])
  .transform((v) => (Array.isArray(v) ? v.join('\n') : v))
  .describe('Markdown；可寫成字串陣列，每個元素一行')

/** [緯度, 經度]（WGS84）。注意 GeoJSON 的順序相反。 */
export const LatLngSchema = z
  .tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)])
  .describe('[緯度, 經度]')

export const PhotoSchema = z.strictObject({
  src: z.url().describe('原圖網址'),
  thumb: z.url().optional().describe('縮圖網址；未填時用 src'),
  caption: z.string().min(1).optional(),
})

export const StopSchema = z.strictObject({
  id: z
    .string()
    .regex(/^[a-z0-9][a-z0-9_-]*$/, 'id 只能用小寫英數字、_ 和 -')
    .describe('同一天內唯一'),
  name: z.string().min(1),
  ll: LatLngSchema,
  placeId: z.string().min(1).optional().describe('Google Place ID'),
  time: z.string().min(1).optional().describe('自由文字，例如「13:20–14:40」或「上午」'),
  note: markdown.optional(),
  photos: z.array(PhotoSchema).optional(),
  optional: z.boolean().optional().describe('可選行程'),
})

export const LegSchema = z.strictObject({
  from: z.string().min(1).describe('起點 stop id'),
  to: z.string().min(1).describe('終點 stop id，可以等於 from'),
  mode: z.enum(TRAVEL_MODES),
  label: z.string().min(1).optional(),
  time: z.string().min(1).optional(),
  note: markdown.optional(),
  path: z.array(LatLngSchema).min(2).optional().describe('未填時兩點直線'),
  optional: z.boolean().optional(),
})

export const GroupSchema = z.strictObject({
  name: z.string().min(1),
  stops: z.array(z.string().min(1)).min(1),
})

export const DaySchema = z.strictObject({
  id: z.number().int().positive().describe('用於 #day-N'),
  date: z.iso.date(),
  title: z.string().min(1),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, '顏色要寫成 #rrggbb')
    .optional(),
  note: markdown.optional(),
  stops: z.array(StopSchema).min(1),
  legs: z.array(LegSchema).default([]),
  groups: z.array(GroupSchema).default([]),
})

export const TripSchema = z.strictObject({
  $schema: z.string().optional(),
  schemaVersion: z.literal(2),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'slug 只能用小寫英數字和 -')
    .refine((s) => s !== 'index', 'slug 不能是 index（保留給旅程索引）'),
  title: z.string().min(1),
  start: z.iso.date(),
  end: z.iso.date(),
  timezone: z.string().min(1).describe('IANA 時區，例如 Asia/Tokyo'),
  info: markdown.optional().describe('旅程總覽：航班、住宿、票券等'),
  days: z.array(DaySchema).min(1),
})

export type LatLng = z.infer<typeof LatLngSchema>
export type Photo = z.infer<typeof PhotoSchema>
export type Stop = z.infer<typeof StopSchema>
export type Leg = z.infer<typeof LegSchema>
export type Group = z.infer<typeof GroupSchema>
export type Day = z.infer<typeof DaySchema>
export type Trip = z.infer<typeof TripSchema>
export type TravelMode = (typeof TRAVEL_MODES)[number]
