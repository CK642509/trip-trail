// 由 Zod schema 產生 schema/trip.schema.json：npm run gen-schema
import { mkdirSync, writeFileSync } from 'node:fs'
import { tripJsonSchema } from '../src/data/validate.ts'

mkdirSync('schema', { recursive: true })
writeFileSync('schema/trip.schema.json', JSON.stringify(tripJsonSchema(), null, 2) + '\n')
console.log('✓ 已更新 schema/trip.schema.json')
