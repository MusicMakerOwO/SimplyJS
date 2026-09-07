import { beforeEach, describe, expect, it, vi } from "vitest";
import { Rest } from "../Rest.js";
import { CreateMessagePayload, SplitAttachments } from "../Structures/Message.js";

/** Builds a `Rest` with a token already set, matching the setup used across `Rest.test.ts` */
function makeRest(): Rest {
	const rest = new Rest();
	rest.setToken("token");
	return rest;
}

/** Grabs the `RequestInit` handed to the Nth `fetch` call */
function requestInit(fetchMock: ReturnType<typeof vi.fn>, index = 0): RequestInit {
	return fetchMock.mock.calls[index]![1] as RequestInit;
}

describe("Rest multipart uploads", () => {
	beforeEach(() => {
		vi.restoreAllMocks();

		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("sends a multipart body with payload_json and one part per file", async () => {
		const rest = makeRest();
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ id: "1" }), { status: 200 })
		);
		vi.stubGlobal("fetch", fetchMock);

		await rest.post("/channels/1/messages", { content: "hi" }, undefined, [
			{ name: "log.txt", data: "hello world" },
			{ name: "data.bin", data: new Uint8Array([1, 2, 3]) }
		]);

		const body = requestInit(fetchMock).body as FormData;
		expect(body).toBeInstanceOf(FormData);
		expect(JSON.parse(body.get("payload_json") as string)).toEqual({ content: "hi" });

		const first = body.get("files[0]") as File;
		expect(first.name).toBe("log.txt");
		await expect(first.text()).resolves.toBe("hello world");

		const second = body.get("files[1]") as File;
		expect(second.name).toBe("data.bin");
		await expect(second.arrayBuffer().then(b => [...new Uint8Array(b)])).resolves.toEqual([1, 2, 3]);
	});

	it("omits Content-Type on multipart requests so fetch can set the boundary", async () => {
		const rest = makeRest();
		const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		vi.stubGlobal("fetch", fetchMock);

		await rest.post("/channels/1/messages", { content: "hi" }, undefined, [
			{ name: "log.txt", data: "hello" }
		]);

		const headers = requestInit(fetchMock).headers as Record<string, string>;
		expect(headers).not.toHaveProperty("Content-Type");
		expect(headers).toHaveProperty("Authorization", "Bot token");
	});

	it("sends a JSON body when no files are provided", async () => {
		const rest = makeRest();
		const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		vi.stubGlobal("fetch", fetchMock);

		await rest.post("/channels/1/messages", { content: "hi" });

		const init = requestInit(fetchMock);
		expect(init.body).toBe(JSON.stringify({ content: "hi" }));
		expect(init.headers).toHaveProperty("Content-Type", "application/json");
	});

	it("sends a JSON body when an empty file list is provided", async () => {
		const rest = makeRest();
		const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		vi.stubGlobal("fetch", fetchMock);

		await rest.post("/channels/1/messages", { content: "hi" }, undefined, []);

		const init = requestInit(fetchMock);
		expect(init.body).toBe(JSON.stringify({ content: "hi" }));
		expect(init.headers).toHaveProperty("Content-Type", "application/json");
	});

	it("rebuilds the multipart body when retrying a rate limited request", async () => {
		const rest = makeRest();
		let calls = 0;
		const fetchMock = vi.fn(async () => {
			calls += 1;
			if (calls === 1) {
				return new Response(JSON.stringify({ retry_after: 0 }), { status: 429 });
			}
			return new Response(JSON.stringify({ id: "1" }), { status: 200 });
		});
		vi.stubGlobal("fetch", fetchMock);

		await rest.post("/channels/1/messages", { content: "hi" }, undefined, [
			{ name: "log.txt", data: "hello" }
		]);

		expect(fetchMock).toHaveBeenCalledTimes(2);

		// the retry must carry its own unconsumed body, not the one already handed to the first fetch
		const retryBody = requestInit(fetchMock, 1).body as FormData;
		const firstBody = requestInit(fetchMock, 0).body as FormData;
		expect(retryBody).toBeInstanceOf(FormData);
		expect(retryBody).not.toBe(firstBody);
		await expect((retryBody.get("files[0]") as File).text()).resolves.toBe("hello");
	});

	it("rejects invalid file lists before sending", async () => {
		const rest = makeRest();
		const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		vi.stubGlobal("fetch", fetchMock);

		await expect(rest.post("/channels/1/messages", {}, undefined, [
			{ name: "a.txt", data: "1" },
			{ name: "a.txt", data: "2" }
		])).rejects.toThrow('Duplicate attachment name "a.txt"');

		await expect(rest.post("/channels/1/messages", {}, undefined, [
			{ name: "", data: "1" }
		])).rejects.toThrow("Every attachment must have a name");

		const tooMany = Array.from({ length: 11 }, (_, i) => ({ name: `f${i}.txt`, data: "x" }));
		await expect(rest.post("/channels/1/messages", {}, undefined, tooMany))
			.rejects.toThrow("Cannot upload more than 10 files at once, received 11");

		expect(fetchMock).not.toHaveBeenCalled();
	});
});

describe("SplitAttachments", () => {
	it("pairs each file with an indexed wire descriptor", () => {
		const { body, files } = SplitAttachments({
			content: "hi",
			attachments: [
				{ name: "one.txt", data: "1", description: "the first" },
				{ name: "two.txt", data: "2" }
			]
		});

		expect(body).toEqual({
			content: "hi",
			attachments: [
				{ id: "0", filename: "one.txt", description: "the first" },
				{ id: "1", filename: "two.txt" }
			]
		});
		expect(files).toHaveLength(2);
		expect(files[0]!.data).toBe("1");
	});

	it("numbers uploads by their files[] index, not their position among attachments", () => {
		const { body, files } = SplitAttachments({
			content: "hi",
			attachments: [
				{ id: "111111111111111111" },
				{ name: "one.txt", data: "1" },
				{ id: "222222222222222222", filename: "renamed.png" },
				{ name: "two.txt", data: "2" }
			]
		});

		expect(body.attachments).toEqual([
			{ id: "111111111111111111" },
			{ id: "0", filename: "one.txt" },
			{ id: "222222222222222222", filename: "renamed.png" },
			{ id: "1", filename: "two.txt" }
		]);
		expect(files).toEqual([
			{ name: "one.txt", data: "1" },
			{ name: "two.txt", data: "2" }
		]);
	});

	it("passes a retain-only attachment list through without uploading anything", () => {
		const { body, files } = SplitAttachments({
			content: "hi",
			attachments: [{ id: "111111111111111111" }]
		});

		expect(body.attachments).toEqual([{ id: "111111111111111111" }]);
		expect(files).toEqual([]);
	});

	it("leaves payloads without attachments untouched", () => {
		const { body, files } = SplitAttachments({ content: "hi" });

		expect(body).toEqual({ content: "hi" });
		expect(body).not.toHaveProperty("attachments");
		expect(files).toEqual([]);
	});

	it("does not mutate the caller's payload", () => {
		const payload = { content: "hi", attachments: [{ name: "one.txt", data: "1" }] };
		const { body } = SplitAttachments(payload);
		body.content = "changed";

		expect(payload.content).toBe("hi");
		expect(payload.attachments[0]!.name).toBe("one.txt");
	});

	it("accepts an attachment-only message", () => {
		const payload = CreateMessagePayload({ attachments: [{ name: "one.txt", data: "1" }] });
		expect(SplitAttachments(payload).files).toHaveLength(1);
	});

	it("still rejects a fully empty message", () => {
		expect(() => CreateMessagePayload({ attachments: [] })).toThrow("Cannot send an empty message");
	});
});
