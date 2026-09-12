import { beforeEach, describe, expect, it, vi } from "vitest";
import { Rest } from "../Rest.js";
import { CreateMessagePayload, PreparePayload, SplitAttachments } from "../Structures/Message.js";
import { DetectMimeType, EncodeImage, ResolveUpload, ToDataURI } from "../Utils.js";
import { StickerCache } from "../Managers/Stickers.js";
import { SoundboardSoundCache } from "../Managers/SoundboardSounds.js";
import { Client } from "../Client.js";
import { Guild } from "../Structures/Guild.js";

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

	it("sends flat form fields and a single `file` part in fields mode", async () => {
		const rest = makeRest();
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ id: "1" }), { status: 200 })
		);
		vi.stubGlobal("fetch", fetchMock);

		await rest.post(
			"/guilds/1/stickers",
			{ name: "blob", description: "a blob", tags: "smile", ignored: null },
			undefined,
			{ files: [{ name: "blob.png", data: "png bytes" }], multipart: "fields" }
		);

		const body = requestInit(fetchMock).body as FormData;
		expect(body).toBeInstanceOf(FormData);
		expect(body.get("payload_json")).toBeNull();
		expect(body.get("name")).toBe("blob");
		expect(body.get("description")).toBe("a blob");
		expect(body.get("tags")).toBe("smile");
		// null fields are dropped rather than sent as the literal text "null"
		expect(body.get("ignored")).toBeNull();
		expect(body.get("files[0]")).toBeNull();

		const file = body.get("file") as File;
		expect(file.name).toBe("blob.png");
		await expect(file.text()).resolves.toBe("png bytes");
	});

	it("rejects more than one file in fields mode, where they would share a part name", async () => {
		const rest = makeRest();
		const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		vi.stubGlobal("fetch", fetchMock);

		await expect(rest.post("/guilds/1/stickers", {}, undefined, {
			files: [{ name: "a.png", data: "1" }, { name: "b.png", data: "2" }],
			multipart: "fields"
		})).rejects.toThrow("This endpoint accepts a single file, received 2");

		expect(fetchMock).not.toHaveBeenCalled();
	});
});

describe("DetectMimeType", () => {
	const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

	it("identifies formats by their magic bytes", () => {
		expect(DetectMimeType(PNG)).toBe("image/png");
		expect(DetectMimeType(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39]))).toBe("image/gif");
		expect(DetectMimeType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
		expect(DetectMimeType(
			new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50])
		)).toBe("image/webp");
	});

	it("accepts a Buffer as well as a Uint8Array", () => {
		expect(DetectMimeType(Buffer.from(PNG))).toBe("image/png");
	});

	it("identifies the audio formats soundboard sounds accept", () => {
		expect(DetectMimeType(Buffer.from("OggS\0\0\0"))).toBe("audio/ogg");
		expect(DetectMimeType(Buffer.from("ID3\x04\0\0"))).toBe("audio/mpeg");
		// an MP3 with no ID3 tag, opening straight on a frame header
		expect(DetectMimeType(new Uint8Array([0xff, 0xfb, 0x90, 0x00]))).toBe("audio/mpeg");
		// the other two MPEG versions that carry Layer III audio
		expect(DetectMimeType(new Uint8Array([0xff, 0xf3, 0x90, 0x00]))).toBe("audio/mpeg");
		expect(DetectMimeType(new Uint8Array([0xff, 0xe3, 0x90, 0x00]))).toBe("audio/mpeg");
	});

	it("does not mistake a UTF-16 byte order mark for an MP3 frame header", () => {
		// `FF FE`/`FF FF` carry the 11 sync bits, so the header's other fixed fields are what
		// rule them out - both decode as Layer I rather than the Layer III `audio/mpeg` means here
		expect(() => DetectMimeType(new Uint8Array([0xff, 0xfe, 0x48, 0x00]))).toThrow(/file type/);
		expect(() => DetectMimeType(new Uint8Array([0xff, 0xff, 0x00, 0x00]))).toThrow(/file type/);
	});

	it("rejects a frame header carrying a reserved or invalid field", () => {
		expect(() => DetectMimeType(new Uint8Array([0xff, 0xfb, 0xf0, 0x00]))).toThrow(/file type/); // invalid bitrate index
		expect(() => DetectMimeType(new Uint8Array([0xff, 0xfb, 0x00, 0x00]))).toThrow(/file type/); // free bitrate
		expect(() => DetectMimeType(new Uint8Array([0xff, 0xfb, 0x9c, 0x00]))).toThrow(/file type/); // reserved sample rate
		expect(() => DetectMimeType(new Uint8Array([0xff, 0xeb, 0x90, 0x00]))).toThrow(/file type/); // reserved MPEG version
		expect(() => DetectMimeType(new Uint8Array([0xff, 0xfb]))).toThrow(/file type/); // too short to check
	});

	it("recognizes Lottie JSON by its leading brace", () => {
		expect(DetectMimeType(Buffer.from('  {"v":"5.5.7"}'))).toBe("application/json");
	});

	it("throws when the contents match no supported type", () => {
		expect(() => DetectMimeType(new Uint8Array([1, 2, 3])))
			.toThrow("Could not determine the file type from its contents");
		expect(() => DetectMimeType(new Uint8Array())).toThrow("Could not determine the file type");
	});
});

describe("ResolveUpload", () => {
	const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);

	it("names the file after the fallback and its detected type", () => {
		const lottie = Buffer.from('{"v":"5.5.7"}');
		expect(ResolveUpload(PNG, "blob")).toEqual({ name: "blob.png", data: PNG });
		expect(ResolveUpload(lottie, "wave")).toEqual({ name: "wave.json", data: lottie });
	});

	it("throws rather than naming a file it cannot identify", () => {
		expect(() => ResolveUpload(new Uint8Array([1, 2, 3]), "blob"))
			.toThrow("Could not determine the file type from its contents");
	});
});

describe("StickerCache.create", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	/** Builds a `StickerCache` against a stub guild, capturing the `rest.post` call */
	function makeCache() {
		const post = vi.fn().mockResolvedValue({ id: "1", name: "blob", tags: "smile" });
		const client = { rest: { post } } as unknown as Client;
		const guild = { id: "9" } as Guild;
		return { cache: new StickerCache(client, guild), post };
	}

	it("serializes a Lottie animation given as an object", async () => {
		const { cache, post } = makeCache();

		await cache.create({
			name: "wave",
			description: "a wave",
			tags: ["smile", "wave"],
			file: { v: "5.5.7", layers: [] }
		});

		const [path, body, headers, upload] = post.mock.calls[0]!;
		expect(path).toBe("/guilds/9/stickers");
		expect(body).toEqual({ name: "wave", description: "a wave", tags: "smile,wave" });
		expect(headers).toBeUndefined();
		expect(upload.multipart).toBe("fields");
		expect(upload.files).toEqual([
			{ name: "wave.json", data: Buffer.from('{"v":"5.5.7","layers":[]}') }
		]);
	});

	it("rejects a file that is not a supported sticker format", async () => {
		const { cache, post } = makeCache();

		await expect(cache.create({
			name: "nope",
			description: "d",
			tags: "smile",
			// a JPEG, which Discord does not accept as a sticker
			file: new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
		})).rejects.toThrow("Stickers must be a PNG, APNG, GIF, or Lottie JSON file, received image/jpeg");

		expect(post).not.toHaveBeenCalled();
	});
});

describe("ToDataURI", () => {
	it("encodes file contents as a base64 data URI", () => {
		const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);
		expect(ToDataURI(bytes))
			.toBe(`data:image/png;base64,${Buffer.from(bytes).toString("base64")}`);
	});

	it("passes an already-encoded data URI through untouched", () => {
		expect(ToDataURI("data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
	});

	it("rejects a plain string that is not a data URI", () => {
		expect(() => ToDataURI("./icon.png")).toThrow("An image string must already be a data URI");
	});
});

describe("JSON image fields", () => {
	const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);
	const PNG_URI = `data:image/png;base64,${Buffer.from(PNG).toString("base64")}`;

	it("encodes the images of a guild edit, passing `null` through to clear them", async () => {
		const patch = vi.fn().mockResolvedValue(undefined);
		const client = { rest: { patch } } as unknown as Client;
		const guild = new Guild(client, { id: "9" } as never);

		await guild.modify({ name: "guild", icon: PNG, banner: PNG_URI, splash: null });

		const body = patch.mock.calls[0]![1];
		expect(body.icon).toBe(PNG_URI);
		expect(body.banner).toBe(PNG_URI);
		expect(body.splash).toBeNull();
		expect(body.discovery_splash).toBeUndefined();
	});

	it("encodes a soundboard sound from its bytes", async () => {
		const post = vi.fn().mockResolvedValue({ sound_id: "1", name: "boom" });
		const client = { rest: { post } } as unknown as Client;
		const guild = { id: "9" } as Guild;
		const mp3 = new Uint8Array([0xff, 0xfb, 0x90, 0x00]);

		await new SoundboardSoundCache(client, guild).create({ name: "boom", sound: mp3 });

		expect(post.mock.calls[0]![1].sound)
			.toBe(`data:audio/mpeg;base64,${Buffer.from(mp3).toString("base64")}`);
	});
});

describe("EncodeImage", () => {
	it("encodes file contents, leaving the absent and cleared cases alone", () => {
		const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);
		expect(EncodeImage(bytes)).toBe(`data:image/png;base64,${Buffer.from(bytes).toString("base64")}`);
		expect(EncodeImage(null)).toBeNull();
		expect(EncodeImage(undefined)).toBeUndefined();
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

	it("accepts an empty attachment list, which is an instruction to clear rather than nothing to say", () => {
		expect(() => CreateMessagePayload({ attachments: [] })).not.toThrow();
	});

	it("still rejects a fully empty message", () => {
		expect(() => CreateMessagePayload({})).toThrow("Cannot send an empty message");
		expect(() => CreateMessagePayload({ content: "" })).toThrow("Cannot send an empty message");
	});

	// -----------------------------------------------------------------------
	// Clearing every attachment (an explicit empty list)
	// -----------------------------------------------------------------------

	it("emits an explicit empty attachments array so an edit can clear every file", () => {
		const { body, files } = SplitAttachments({ content: "hi", attachments: [] });

		// contrast with "leaves payloads without attachments untouched" above: an absent list drops
		// the key entirely, an empty one has to reach the wire for Discord to act on it
		expect(body).toHaveProperty("attachments");
		expect(body.attachments).toEqual([]);
		expect(files).toEqual([]);
	});

	// -----------------------------------------------------------------------
	// Cross-list validation (retained entries counted alongside uploads)
	// -----------------------------------------------------------------------

	function upload(name: string) {
		return { name, data: "x" };
	}

	function retained(id: string, filename?: string) {
		return filename === undefined ? { id } : { id, filename };
	}

	it("rejects more uploads than Discord accepts", () => {
		const attachments = Array.from({ length: 11 }, (_, i) => upload(`file-${i}.txt`));

		expect(() => SplitAttachments({ attachments })).toThrow(/more than 10 attachments/);
	});

	it("counts retained attachments toward the limit, not just uploads", () => {
		const attachments = [
			...Array.from({ length: 8 }, (_, i) => retained(`${i}`, `kept-${i}.txt`)),
			...Array.from({ length: 3 }, (_, i) => upload(`new-${i}.txt`))
		];

		// only 3 files are uploaded, so the transport-level check in Rest would wave this through
		expect(() => SplitAttachments({ attachments })).toThrow(/received 11/);
	});

	it("accepts exactly the limit across both kinds", () => {
		const attachments = [
			...Array.from({ length: 5 }, (_, i) => retained(`${i}`, `kept-${i}.txt`)),
			...Array.from({ length: 5 }, (_, i) => upload(`new-${i}.txt`))
		];

		expect(() => SplitAttachments({ attachments })).not.toThrow();
	});

	it("rejects an upload sharing a name with a retained attachment", () => {
		const attachments = [ retained("111111111111111111", "a.png"), upload("a.png") ];

		// `attachment://a.png` would be ambiguous between the two
		expect(() => SplitAttachments({ attachments })).toThrow('Duplicate attachment name "a.png"');
	});

	it("rejects two retained attachments renamed to the same filename", () => {
		const attachments = [ retained("111111111111111111", "a.png"), retained("222222222222222222", "a.png") ];

		expect(() => SplitAttachments({ attachments })).toThrow('Duplicate attachment name "a.png"');
	});

	it("accepts an upload beside a retained attachment whose name is unknown", () => {
		const attachments = [ retained("111111111111111111"), upload("a.png") ];

		// a retained entry with no `filename` keeps whatever it is currently called, which is not
		// knowable here - so it is skipped rather than guessed at. Deliberate: reporting a collision
		// that cannot be proven would break working code, while missing one only costs a round trip
		expect(() => SplitAttachments({ attachments })).not.toThrow();
	});

	it("rejects an upload with an empty name", () => {
		expect(() => SplitAttachments({ attachments: [ upload("") ] })).toThrow("Every attachment must have a name");
	});

	it("rejects a retained attachment with no id", () => {
		expect(() => SplitAttachments({ attachments: [ { id: "" } ] })).toThrow("Every retained attachment must have an id");
	});

	it("enforces the attachment rules on the send path, not only on a direct call", () => {
		const attachments = Array.from({ length: 11 }, (_, i) => upload(`file-${i}.txt`));

		expect(() => PreparePayload({ attachments })).toThrow(/more than 10 attachments/);
	});
});