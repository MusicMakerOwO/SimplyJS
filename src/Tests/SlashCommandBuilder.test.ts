import { describe, expect, it } from "vitest";
import {
	SlashCommandBuilder,
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandGroupBuilder
} from "../Builders/SlashCommandBuilder.js";
import { ApplicationCommand, ApplicationCommandOptionTypes, InteractionContextTypes } from "../Types/ApplicationCommand.js";
import { DiscordApplicationIntegrationTypes, DiscordChannelTypes } from "../Types/DiscordAPITypes.js";

describe("SlashCommandBuilder", () => {
	describe("name/description", () => {
		it("defaults name and description", () => {
			const builder = new SlashCommandBuilder();

			expect(builder.name).toBe("command");
			expect(builder.description).toBe("No description");
		});

		it("stores a valid name and description", () => {
			const builder = new SlashCommandBuilder().setName("snapshot").setDescription("Manage server snapshots");

			expect(builder.name).toBe("snapshot");
			expect(builder.description).toBe("Manage server snapshots");
		});

		it("throws on names containing spaces or uppercase letters", () => {
			expect(() => new SlashCommandBuilder().setName("Bad Name")).toThrow(/doesn't match Discord's naming pattern/);
			expect(() => new SlashCommandBuilder().setName("BadName")).toThrow(/must be lowercase/);
		});

		it("throws on names longer than 32 characters", () => {
			expect(() => new SlashCommandBuilder().setName("a".repeat(33))).toThrow(/doesn't match Discord's naming pattern/);
		});

		it("accepts non-Latin letters as long as they're lowercase", () => {
			expect(() => new SlashCommandBuilder().setName("команда")).not.toThrow();
		});

		it("throws on an empty or overlong description", () => {
			expect(() => new SlashCommandBuilder().setDescription("")).toThrow(/description must be between 1 and 100 characters/);
			expect(() => new SlashCommandBuilder().setDescription("a".repeat(101))).toThrow(/description must be between 1 and 100 characters/);
		});

		it("stores localization dictionaries", () => {
			const builder = new SlashCommandBuilder()
				.setNameLocalizations({ "es-ES": "captura" })
				.setDescriptionLocalizations({ "es-ES": "Gestionar capturas" });

			expect(builder.name_localizations).toEqual({ "es-ES": "captura" });
			expect(builder.description_localizations).toEqual({ "es-ES": "Gestionar capturas" });
		});
	});

	describe("top-level command settings", () => {
		it("stringifies default member permissions and clears them with null", () => {
			const builder = new SlashCommandBuilder().setDefaultMemberPermissions(8n);
			expect(builder.default_member_permissions).toBe("8");

			builder.setDefaultMemberPermissions(null);
			expect(builder.default_member_permissions).toBeNull();
		});

		it("accepts number and string permission values", () => {
			expect(new SlashCommandBuilder().setDefaultMemberPermissions(16).default_member_permissions).toBe("16");
			expect(new SlashCommandBuilder().setDefaultMemberPermissions("32").default_member_permissions).toBe("32");
		});

		it("sets integration types", () => {
			const builder = new SlashCommandBuilder().setIntegrationTypes(
				DiscordApplicationIntegrationTypes.GUILD_INSTALL,
				DiscordApplicationIntegrationTypes.USER_INSTALL
			);

			expect(builder.integration_types).toEqual([
				DiscordApplicationIntegrationTypes.GUILD_INSTALL,
				DiscordApplicationIntegrationTypes.USER_INSTALL
			]);
		});

		it("sets interaction contexts", () => {
			const builder = new SlashCommandBuilder().setContexts(InteractionContextTypes.GUILD, InteractionContextTypes.BOT_DM);

			expect(builder.contexts).toEqual([InteractionContextTypes.GUILD, InteractionContextTypes.BOT_DM]);
		});

		it("defaults setNSFW to true and accepts an explicit value", () => {
			expect(new SlashCommandBuilder().setNSFW().nsfw).toBe(true);
			expect(new SlashCommandBuilder().setNSFW(false).nsfw).toBe(false);
		});
	});

	describe("addOption / addXOption helpers", () => {
		it("adds a string option via addOption", () => {
			const builder = new SlashCommandBuilder().addOption(ApplicationCommandOptionTypes.STRING, "text", "Some text");

			expect(builder.options).toEqual([{ type: ApplicationCommandOptionTypes.STRING, name: "text", description: "Some text" }]);
		});

		it("adds each option type via its sugar method with config merged in", () => {
			const builder = new SlashCommandBuilder()
				.addStringOption("a", "a desc", { required: true })
				.addAttachmentOption("i", "i desc", { required: true })
				.addIntegerOption("b", "b desc", { min_value: 1 })
				.addNumberOption("c", "c desc", { max_value: 5.5 })
				.addBooleanOption("d", "d desc")
				.addUserOption("e", "e desc")
				.addChannelOption("f", "f desc", { channel_types: [DiscordChannelTypes.GUILD_TEXT] })
				.addRoleOption("g", "g desc")
				.addMentionableOption("h", "h desc");

			expect(builder.options).toHaveLength(9);
			expect(builder.options?.[0]).toMatchObject({ type: ApplicationCommandOptionTypes.STRING, name: "a", required: true });
			expect(builder.options?.[1]).toMatchObject({ type: ApplicationCommandOptionTypes.ATTACHMENT, name: "i", required: true });
			expect(builder.options?.[2]).toMatchObject({ type: ApplicationCommandOptionTypes.INTEGER, name: "b", min_value: 1 });
			expect(builder.options?.[3]).toMatchObject({ type: ApplicationCommandOptionTypes.NUMBER, name: "c", max_value: 5.5 });
			expect(builder.options?.[4]).toMatchObject({ type: ApplicationCommandOptionTypes.BOOLEAN, name: "d" });
			expect(builder.options?.[5]).toMatchObject({ type: ApplicationCommandOptionTypes.USER, name: "e" });
			expect(builder.options?.[6]).toMatchObject({
				type: ApplicationCommandOptionTypes.CHANNEL,
				name: "f",
				channel_types: [DiscordChannelTypes.GUILD_TEXT]
			});
			expect(builder.options?.[7]).toMatchObject({ type: ApplicationCommandOptionTypes.ROLE, name: "g" });
			expect(builder.options?.[8]).toMatchObject({ type: ApplicationCommandOptionTypes.MENTIONABLE, name: "h" });
		});

		it("throws on an invalid option name or description", () => {
			expect(() => new SlashCommandBuilder().addStringOption("Bad Name", "desc")).toThrow(/doesn't match Discord's naming pattern/);
			expect(() => new SlashCommandBuilder().addStringOption("ok", "")).toThrow(/description must be between 1 and 100 characters/);
		});

		it("throws when adding more than 25 options at the same level", () => {
			const builder = new SlashCommandBuilder();
			for (let i = 0; i < 25; i++) builder.addStringOption(`opt${i}`, "desc");

			expect(() => builder.addStringOption("opt25", "desc")).toThrow(/cannot exceed 25 options/);
		});

		it("throws on duplicate option names at the same level", () => {
			const builder = new SlashCommandBuilder().addStringOption("dup", "desc");

			expect(() => builder.addIntegerOption("dup", "other desc")).toThrow(/Duplicate option name "dup"/);
		});

		it("throws when a required option is added after an optional one", () => {
			const builder = new SlashCommandBuilder().addStringOption("optional", "desc");

			expect(() => builder.addStringOption("required", "desc", { required: true })).toThrow(
				/Required option "required" must be added before any optional options/
			);
		});

		it("allows required options followed by optional ones", () => {
			expect(() =>
				new SlashCommandBuilder()
					.addStringOption("required", "desc", { required: true })
					.addStringOption("optional", "desc")
			).not.toThrow();
		});

		it("throws when mixing subcommands with regular options at the same level", () => {
			const builder = new SlashCommandBuilder().addStringOption("opt", "desc");

			expect(() => builder.addSubcommand(sub => sub.setName("sub").setDescription("desc"))).toThrow(
				/Cannot mix subcommands\/subcommand groups with regular options/
			);
		});

		describe("string option bounds", () => {
			it("accepts min_length/max_length within 0-6000 and min <= max", () => {
				expect(() => new SlashCommandBuilder().addStringOption("s", "d", { min_length: 0, max_length: 6000 })).not.toThrow();
			});

			it("throws when min_length or max_length are out of range", () => {
				expect(() => new SlashCommandBuilder().addStringOption("s", "d", { min_length: -1 })).toThrow(/min_length must be between 0 and 6000/);
				expect(() => new SlashCommandBuilder().addStringOption("s", "d", { max_length: 6001 })).toThrow(/max_length must be between 1 and 6000/);
				expect(() => new SlashCommandBuilder().addStringOption("s", "d", { max_length: 0 })).toThrow(/max_length must be between 1 and 6000/);
			});

			it("throws when min_length exceeds max_length", () => {
				expect(() => new SlashCommandBuilder().addStringOption("s", "d", { min_length: 10, max_length: 5 })).toThrow(
					/min_length cannot exceed max_length/
				);
			});

			it("throws when a string option has more than 25 choices", () => {
				const choices = Array.from({ length: 26 }, (_, i) => ({ name: `c${i}`, value: `v${i}` }));

				expect(() => new SlashCommandBuilder().addStringOption("s", "d", { choices })).toThrow(/cannot have more than 25 choices/);
			});

			it("accepts exactly 25 choices", () => {
				const choices = Array.from({ length: 25 }, (_, i) => ({ name: `c${i}`, value: `v${i}` }));

				expect(() => new SlashCommandBuilder().addStringOption("s", "d", { choices })).not.toThrow();
			});
		});

		describe("integer/number option bounds", () => {
			it("throws when min_value exceeds max_value", () => {
				expect(() => new SlashCommandBuilder().addIntegerOption("i", "d", { min_value: 10, max_value: 5 })).toThrow(
					/min_value cannot exceed max_value/
				);
				expect(() => new SlashCommandBuilder().addNumberOption("n", "d", { min_value: 1.5, max_value: 1 })).toThrow(
					/min_value cannot exceed max_value/
				);
			});

			it("throws when an integer option is given non-integer bounds", () => {
				expect(() => new SlashCommandBuilder().addIntegerOption("i", "d", { min_value: 1.5 })).toThrow(/min_value must be an integer/);
				expect(() => new SlashCommandBuilder().addIntegerOption("i", "d", { max_value: 2.5 })).toThrow(/max_value must be an integer/);
			});

			it("allows fractional bounds on a number option", () => {
				expect(() => new SlashCommandBuilder().addNumberOption("n", "d", { min_value: 1.5, max_value: 2.5 })).not.toThrow();
			});

			it("throws when an integer/number option has more than 25 choices", () => {
				const choices = Array.from({ length: 26 }, (_, i) => ({ name: `c${i}`, value: i }));

				expect(() => new SlashCommandBuilder().addIntegerOption("i", "d", { choices })).toThrow(/cannot have more than 25 choices/);
			});
		});
	});

	describe("subcommands", () => {
		it("adds a subcommand via callback", () => {
			const builder = new SlashCommandBuilder()
				.setName("snapshot")
				.setDescription("Manage server snapshots")
				.addSubcommand(sub => sub.setName("create").setDescription("Creates a snapshot"));

			expect(builder.options).toEqual([
				{ type: ApplicationCommandOptionTypes.SUB_COMMAND, name: "create", description: "Creates a snapshot" }
			]);
		});

		it("adds a subcommand via a pre-built instance", () => {
			const createSub = new SlashCommandSubcommandBuilder().setName("create").setDescription("Creates a snapshot");
			const builder = new SlashCommandBuilder().setName("snapshot").setDescription("desc").addSubcommand(createSub);

			expect(builder.options?.[0]).toBe(createSub);
		});

		it("nests options inside a subcommand", () => {
			const builder = new SlashCommandBuilder()
				.setName("snapshot")
				.setDescription("desc")
				.addSubcommand(sub => sub.setName("import").setDescription("desc").addAttachmentOption("file", "desc", { required: true }));

			const subcommand = builder.options?.[0] as { options?: unknown[] };
			expect(subcommand.options).toEqual([
				{ type: ApplicationCommandOptionTypes.ATTACHMENT, name: "file", description: "desc", required: true }
			]);
		});

		it("throws on duplicate subcommand names", () => {
			const builder = new SlashCommandBuilder().addSubcommand(sub => sub.setName("dup").setDescription("desc"));

			expect(() => builder.addSubcommand(sub => sub.setName("dup").setDescription("other"))).toThrow(/Duplicate option name "dup"/);
		});

		it("throws when adding more than 25 subcommands", () => {
			const builder = new SlashCommandBuilder();
			for (let i = 0; i < 25; i++) builder.addSubcommand(sub => sub.setName(`sub${i}`).setDescription("desc"));

			expect(() => builder.addSubcommand(sub => sub.setName("sub25").setDescription("desc"))).toThrow(/cannot exceed 25 options/);
		});
	});

	describe("subcommand groups", () => {
		it("adds a subcommand group via callback", () => {
			const builder = new SlashCommandBuilder()
				.setName("snapshot")
				.setDescription("desc")
				.addSubcommandGroup(group =>
					group
						.setName("manage")
						.setDescription("Manage snapshots")
						.addSubcommand(sub => sub.setName("delete").setDescription("Deletes a snapshot"))
				);

			expect(builder.options).toEqual([
				{
					type: ApplicationCommandOptionTypes.SUB_COMMAND_GROUP,
					name: "manage",
					description: "Manage snapshots",
					options: [{ type: ApplicationCommandOptionTypes.SUB_COMMAND, name: "delete", description: "Deletes a snapshot" }]
				}
			]);
		});

		it("adds a subcommand group via a pre-built instance", () => {
			const group = new SlashCommandSubcommandGroupBuilder()
				.setName("manage")
				.setDescription("desc")
				.addSubcommand(sub => sub.setName("delete").setDescription("desc"));

			const builder = new SlashCommandBuilder().setName("snapshot").setDescription("desc").addSubcommandGroup(group);

			expect(builder.options?.[0]).toBe(group);
		});

		it("throws when a subcommand group has duplicate subcommand names", () => {
			const group = new SlashCommandSubcommandGroupBuilder().addSubcommand(sub => sub.setName("dup").setDescription("desc"));

			expect(() => group.addSubcommand(sub => sub.setName("dup").setDescription("other"))).toThrow(/Duplicate subcommand name "dup"/);
		});

		it("throws when a subcommand group exceeds 25 subcommands", () => {
			const group = new SlashCommandSubcommandGroupBuilder();
			for (let i = 0; i < 25; i++) group.addSubcommand(sub => sub.setName(`sub${i}`).setDescription("desc"));

			expect(() => group.addSubcommand(sub => sub.setName("sub25").setDescription("desc"))).toThrow(/cannot exceed 25 subcommands/);
		});

		it("throws when mixing subcommand groups with regular options at the top level", () => {
			const builder = new SlashCommandBuilder().addSubcommandGroup(group =>
				group.setName("g").setDescription("desc").addSubcommand(sub => sub.setName("s").setDescription("desc"))
			);

			expect(() => builder.addStringOption("opt", "desc")).toThrow(/Cannot mix subcommands\/subcommand groups with regular options/);
		});
	});

	describe("static validate", () => {
		it("passes for a fully valid, deeply nested command", () => {
			const command = new SlashCommandBuilder()
				.setName("snapshot")
				.setDescription("Manage server snapshots")
				.addSubcommandGroup(group =>
					group
						.setName("manage")
						.setDescription("Manage snapshots")
						.addSubcommand(sub => sub.setName("delete").setDescription("Deletes a snapshot").addStringOption("id", "desc", { required: true }))
				);

			expect(() => SlashCommandBuilder.validate(command)).not.toThrow();
		});

		it("throws on an invalid top-level name or description", () => {
			expect(() => SlashCommandBuilder.validate({ name: "Bad Name", description: "desc" })).toThrow(
				/doesn't match Discord's naming pattern/
			);
			expect(() => SlashCommandBuilder.validate({ name: "ok", description: "" })).toThrow(
				/description must be between 1 and 100 characters/
			);
		});

		it("catches a duplicate option name nested inside a subcommand", () => {
			const command = {
				name: "bad",
				description: "desc",
				options: [
					{
						type: ApplicationCommandOptionTypes.SUB_COMMAND,
						name: "sub",
						description: "desc",
						options: [
							{ type: ApplicationCommandOptionTypes.STRING, name: "dup", description: "a" },
							{ type: ApplicationCommandOptionTypes.STRING, name: "dup", description: "b" }
						]
					}
				]
			};

			expect(() => SlashCommandBuilder.validate(command)).toThrow(/Subcommand "sub": duplicate option name "dup"/);
		});

		it("catches required-after-optional ordering nested inside a subcommand", () => {
			const command = {
				name: "bad",
				description: "desc",
				options: [
					{
						type: ApplicationCommandOptionTypes.SUB_COMMAND,
						name: "sub",
						description: "desc",
						options: [
							{ type: ApplicationCommandOptionTypes.STRING, name: "opt1", description: "a" },
							{ type: ApplicationCommandOptionTypes.STRING, name: "opt2", description: "b", required: true }
						]
					}
				]
			};

			expect(() => SlashCommandBuilder.validate(command)).toThrow(/Required option "opt2" must be added before any optional options/);
		});

		it("catches a subcommand group with no subcommands", () => {
			const command = {
				name: "bad",
				description: "desc",
				options: [{ type: ApplicationCommandOptionTypes.SUB_COMMAND_GROUP, name: "g", description: "desc", options: [] }]
			};

			expect(() => SlashCommandBuilder.validate(command)).toThrow(/must contain at least one subcommand/);
		});

		it("catches mixed structural/leaf options at a nested level", () => {
			const command = {
				name: "bad",
				description: "desc",
				options: [
					{
						type: ApplicationCommandOptionTypes.SUB_COMMAND_GROUP,
						name: "g",
						description: "desc",
						options: [
							{ type: ApplicationCommandOptionTypes.SUB_COMMAND, name: "s", description: "desc" },
							{ type: ApplicationCommandOptionTypes.STRING, name: "leaf", description: "desc" }
						]
					}
				]
			} as ApplicationCommand;

			expect(() => SlashCommandBuilder.validate(command)).toThrow(/cannot mix subcommands\/subcommand groups with regular options/);
		});

		it("catches out-of-range option bounds nested inside a subcommand", () => {
			const command = {
				name: "bad",
				description: "desc",
				options: [
					{
						type: ApplicationCommandOptionTypes.SUB_COMMAND,
						name: "sub",
						description: "desc",
						options: [{ type: ApplicationCommandOptionTypes.STRING, name: "s", description: "desc", min_length: -1 }]
					}
				]
			};

			expect(() => SlashCommandBuilder.validate(command)).toThrow(/min_length must be between 0 and 6000/);
		});

		it("catches more than 25 options at a nested level", () => {
			const options = Array.from({ length: 26 }, (_, i) => ({
				type: ApplicationCommandOptionTypes.STRING,
				name: `opt${i}`,
				description: "desc"
			}));
			const command = {
				name: "bad",
				description: "desc",
				options: [{ type: ApplicationCommandOptionTypes.SUB_COMMAND, name: "sub", description: "desc", options }]
			};

			expect(() => SlashCommandBuilder.validate(command)).toThrow(/cannot exceed 25 options/);
		});
	});
});

describe("SlashCommandSubcommandBuilder", () => {
	it("defaults name and description", () => {
		const builder = new SlashCommandSubcommandBuilder();

		expect(builder.type).toBe(ApplicationCommandOptionTypes.SUB_COMMAND);
		expect(builder.name).toBe("command");
		expect(builder.description).toBe("No description");
	});

	it("throws on an invalid name or description", () => {
		expect(() => new SlashCommandSubcommandBuilder().setName("Bad Name")).toThrow(/doesn't match Discord's naming pattern/);
		expect(() => new SlashCommandSubcommandBuilder().setDescription("")).toThrow(/description must be between 1 and 100 characters/);
	});

	it("supports the full set of leaf option helpers", () => {
		const builder = new SlashCommandSubcommandBuilder().setName("create").setDescription("desc").addBooleanOption("flag", "desc");

		expect(builder.options).toEqual([{ type: ApplicationCommandOptionTypes.BOOLEAN, name: "flag", description: "desc" }]);
	});

	it("stores localization dictionaries", () => {
		const builder = new SlashCommandSubcommandBuilder()
			.setNameLocalizations({ "es-ES": "crear" })
			.setDescriptionLocalizations({ "es-ES": "desc" });

		expect(builder.name_localizations).toEqual({ "es-ES": "crear" });
		expect(builder.description_localizations).toEqual({ "es-ES": "desc" });
	});
});

describe("SlashCommandSubcommandGroupBuilder", () => {
	it("defaults name and description", () => {
		const builder = new SlashCommandSubcommandGroupBuilder();

		expect(builder.type).toBe(ApplicationCommandOptionTypes.SUB_COMMAND_GROUP);
		expect(builder.name).toBe("group");
		expect(builder.description).toBe("No description");
	});

	it("throws on an invalid name or description", () => {
		expect(() => new SlashCommandSubcommandGroupBuilder().setName("Bad Name")).toThrow(/doesn't match Discord's naming pattern/);
		expect(() => new SlashCommandSubcommandGroupBuilder().setDescription("")).toThrow(/description must be between 1 and 100 characters/);
	});

	it("stores localization dictionaries", () => {
		const builder = new SlashCommandSubcommandGroupBuilder()
			.setNameLocalizations({ "es-ES": "gestionar" })
			.setDescriptionLocalizations({ "es-ES": "desc" });

		expect(builder.name_localizations).toEqual({ "es-ES": "gestionar" });
		expect(builder.description_localizations).toEqual({ "es-ES": "desc" });
	});
});