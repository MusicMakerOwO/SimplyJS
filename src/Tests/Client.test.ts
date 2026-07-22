import { beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "../Client.js";
import { GatewayIntents } from "../Types/DiscordGateway.js";
import { GatewayOpCodes } from "../Types/DiscordGateway.js";
import { ActivityType, Status } from "../Types/DiscordAPITypes.js";
import { Guild } from "../Structures/Guild.js";

describe("Client methods", () => {
    let client: Client;

    beforeEach(() => {
        client = new Client({ token: "test-token", intents: GatewayIntents.Guilds });
        vi.restoreAllMocks();
    });

    it("destroy() clears guilds and calls socket.destroy()", async () => {
        // populate guilds map
        client.guilds.set("g1", {} as unknown as Guild);
        client.guilds.set("g2", {} as unknown as Guild);

        const spy = vi.spyOn(client.socket, "destroy").mockImplementation(() => {});

        await client.destroy();

        expect(spy).toHaveBeenCalledOnce();
        expect(client.guilds.size).toBe(0);
    });

    it("setStatus() updates status and sends a presence payload with no activities when activity is null", () => {
        const sendSpy = vi.spyOn(client.socket, "send").mockImplementation(() => {});

        client.setStatus(Status.IDLE);

        expect(client.status).toBe(Status.IDLE);
        expect(sendSpy).toHaveBeenCalledOnce();

        const [payload] = sendSpy.mock.calls[0]! as [Record<string, unknown>];
        expect(payload.op).toBe(GatewayOpCodes.PresenceUpdate);
        expect((payload.d as Record<string, unknown>).status).toBe(Status.IDLE);
        expect(Array.isArray((payload.d as Record<string, unknown>).activities)).toBe(true);
        expect(((payload.d as Record<string, unknown>).activities as unknown[]).length).toBe(0);
    });

    it("setStatusMessage() creates a non-CUSTOM activity and sends it in presence payload", () => {
        const sendSpy = vi.spyOn(client.socket, "send").mockImplementation(() => {});

        client.setStatusMessage(ActivityType.PLAYING, "Cool Game");

        expect(client.activity).toBeDefined();
        expect(client.activity!.type).toBe(ActivityType.PLAYING);
        expect(client.activity!.name).toBe("Cool Game");
        // non-CUSTOM should set state to zero-width space
        expect(client.activity!.state).toBe('\u200b');

        expect(sendSpy).toHaveBeenCalled();
        const [payload] = sendSpy.mock.calls[0]! as [Record<string, unknown>];
        expect(payload.op).toBe(GatewayOpCodes.PresenceUpdate);
        expect(Array.isArray((payload.d as Record<string, unknown>).activities)).toBe(true);
        expect(((payload.d as Record<string, unknown>).activities as unknown[])[0]).toEqual(client.activity);
    });

    it("setStatusMessage() creates a CUSTOM activity with provided state", () => {
        const sendSpy = vi.spyOn(client.socket, "send").mockImplementation(() => {});

        client.setStatusMessage(ActivityType.CUSTOM, "custom-state");

        expect(client.activity).toBeDefined();
        expect(client.activity!.type).toBe(ActivityType.CUSTOM);
        expect(client.activity!.state).toBe("custom-state");
        // CUSTOM sets a literal name in implementation
        expect(typeof client.activity!.name).toBe("string");

        expect(sendSpy).toHaveBeenCalled();
        const [payload] = sendSpy.mock.calls[0]! as [Record<string, unknown>];
        expect(payload.op).toBe(GatewayOpCodes.PresenceUpdate);
        expect(((payload.d as Record<string, unknown>).activities as unknown[])[0]).toEqual(client.activity);
    });
});