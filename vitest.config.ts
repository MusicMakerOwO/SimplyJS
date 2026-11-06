// vitest.config.ts
import { createRequire } from 'node:module'
import { defineConfig } from 'vitest/config'

const require = createRequire(import.meta.url)

export default defineConfig({
	resolve: {
		alias: {
			ws: require.resolve('ws')
		}
	},
	test: {
		include: ['./src/Tests/**/*.ts'],
		fileParallelism: true
	}
})
