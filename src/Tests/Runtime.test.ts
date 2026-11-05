import { describe, expect, it } from "vitest";

/**
 * Guards against a CI job silently testing on the wrong runtime.
 *
 * `bun run test` executes vitest's `#!/usr/bin/env node` binary on the runner's Node, so the Bun job
 * once ran the whole suite on Node without anyone noticing. Each workflow sets `EXPECTED_RUNTIME`,
 * and this fails when the runtime actually executing the suite is a different one. Locally the
 * variable is unset and the check is skipped.
 */
const expected = process.env.EXPECTED_RUNTIME;

function DetectRuntime(): string {
	const runtime = globalThis as { Bun?: unknown; Deno?: unknown };
	if (runtime.Bun !== undefined) return "bun";
	if (runtime.Deno !== undefined) return "deno";
	return "node";
}

describe("runtime", () => {
	it.skipIf(expected === undefined)(`runs on ${expected ?? "the expected runtime"}`, () => {
		expect(DetectRuntime()).toBe(expected);
	});
});
