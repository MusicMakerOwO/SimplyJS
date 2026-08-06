import { describe, expect, expectTypeOf, it } from "vitest";
import { ActionRowBuilder } from "../Builders/ActionRowBuilder.js";
import { ButtonBuilder } from "../Builders/ButtonBuilder.js";
import { ChannelSelectBuilder } from "../Builders/ChannelSelectBuilder.js";
import { LabelBuilder } from "../Builders/LabelBuilder.js";
import { LinkButtonBuilder } from "../Builders/LinkButtonBuilder.js";
import { MentionableSelectBuilder } from "../Builders/MentionableSelectBuilder.js";
import { ModalBuilder } from "../Builders/ModalBuilder.js";
import { ResolveButton, ValidateButton } from "../Builders/ResolveButton.js";
import { RoleSelectBuilder } from "../Builders/RoleSelectBuilder.js";
import { SKUButtonBuilder } from "../Builders/SKUButtonBuilder.js";
import { StringSelectBuilder } from "../Builders/StringSelectBuilder.js";
import { TextInputBuilder } from "../Builders/TextInputBuilder.js";
import { UserSelectBuilder } from "../Builders/UserSelectBuilder.js";
import {
	ActionRow,
	Button,
	ButtonStyles,
	ChannelSelect,
	ComponentTypes,
	InteractiveButton,
	Label,
	LinkButton,
	MentionableSelect,
	PremiumButton,
	RoleSelect,
	StringSelect,
	TextInput,
	TextInputStyles,
	UserSelect
} from "../Types/Components.js";
import { DiscordChannelTypes } from "../Types/DiscordAPITypes.js";
import { InteractionCallbackModal } from "../Types/Interactions.js";

// NOTE: this file is intended to grow into the home for all message/modal component
// builder tests (buttons, select menus, modals, etc.), each as its own top-level describe.

describe("ButtonBuilder", () => {
	it("defaults type to BUTTON and style to PRIMARY", () => {
		const builder = new ButtonBuilder();

		expect(builder.type).toBe(ComponentTypes.BUTTON);
		expect(builder.style).toBe(ButtonStyles.PRIMARY);
	});

	it("takes its style from the constructor", () => {
		expect(new ButtonBuilder(ButtonStyles.DANGER).style).toBe(ButtonStyles.DANGER);
	});

	it("hydrates a builder from payload using static from", () => {
		const payload = { type: ComponentTypes.BUTTON, style: ButtonStyles.DANGER, label: "Delete", custom_id: "delete" } as const;

		const builder = ButtonBuilder.from(payload);

		expect(builder.style).toBe(ButtonStyles.DANGER);
		expect(builder.label).toBe("Delete");
		expect(builder.custom_id).toBe("delete");
	});

	it("carries emoji and disabled through static from", () => {
		const payload = {
			type: ComponentTypes.BUTTON,
			style: ButtonStyles.SECONDARY,
			label: "Reply",
			custom_id: "reply",
			emoji: { name: "\u{1F44D}" },
			disabled: true
		} as const;

		const builder = ButtonBuilder.from(payload);

		expect(builder.emoji).toEqual({ name: "\u{1F44D}" });
		expect(builder.disabled).toBe(true);
	});

	it("sets label within the allowed length", () => {
		const builder = new ButtonBuilder().setLabel("a".repeat(80));

		expect(builder.label).toBe("a".repeat(80));
	});

	it("throws when label is empty or exceeds 80 characters", () => {
		expect(() => new ButtonBuilder().setLabel("")).toThrow(/Button label must be between 1 and 80 characters long/);
		expect(() => new ButtonBuilder().setLabel("a".repeat(81))).toThrow(/Button label must be between 1 and 80 characters long/);
	});

	it("sets custom_id within the allowed length", () => {
		const builder = new ButtonBuilder().setCustomID("a".repeat(100));

		expect(builder.custom_id).toBe("a".repeat(100));
	});

	it("throws when custom_id is empty or exceeds 100 characters", () => {
		expect(() => new ButtonBuilder().setCustomID("")).toThrow(/Button custom_id must be between 1 and 100 characters long/);
		expect(() => new ButtonBuilder().setCustomID("a".repeat(101))).toThrow(/Button custom_id must be between 1 and 100 characters long/);
	});

	it("rejects the link and premium styles at the type level", () => {
		// @ts-expect-error link buttons have their own builder
		expect(new ButtonBuilder(ButtonStyles.LINK).style).toBe(ButtonStyles.LINK);
		// @ts-expect-error premium buttons have their own builder
		expect(() => new ButtonBuilder().setStyle(ButtonStyles.PREMIUM)).not.toThrow();
	});

	it("sets emoji, disabled, and style via their setters", () => {
		const builder = new ButtonBuilder().setEmoji({ name: "\u{1F525}" }).setDisabled().setStyle(ButtonStyles.SUCCESS);

		expect(builder.emoji).toEqual({ name: "\u{1F525}" });
		expect(builder.disabled).toBe(true);
		expect(builder.style).toBe(ButtonStyles.SUCCESS);
	});

	it("defaults setDisabled to true when called without an argument", () => {
		const builder = new ButtonBuilder().setDisabled();

		expect(builder.disabled).toBe(true);
	});

	it("allows chaining setDisabled(false) to re-enable a button", () => {
		const builder = new ButtonBuilder().setDisabled().setDisabled(false);

		expect(builder.disabled).toBe(false);
	});

	describe("validate", () => {
		it("passes for a fully-populated button", () => {
			const builder = new ButtonBuilder().setStyle(ButtonStyles.PRIMARY).setLabel("Click me").setCustomID("click");

			expect(() => builder.validate()).not.toThrow();
		});

		it("throws when label is missing", () => {
			const builder = new ButtonBuilder().setCustomID("click");

			expect(() => builder.validate()).toThrow(/Button must have a label/);
		});

		it("throws when custom_id is missing", () => {
			const builder = new ButtonBuilder().setLabel("Click me");

			expect(() => builder.validate()).toThrow(/Non-link buttons must have a custom_id/);
		});

		it("throws when a url is set", () => {
			const builder = new ButtonBuilder().setLabel("Click me").setCustomID("click");
			// only reachable from a hand-written payload - the builder has no setURL
			Object.assign(builder, { url: "https://example.com" });

			expect(() => builder.validate()).toThrow(/Non-link buttons cannot have a url/);
		});

		it("is assignable to the payload type it mirrors", () => {
			const button: InteractiveButton = new ButtonBuilder(ButtonStyles.DANGER).setLabel("Delete").setCustomID("delete");

			expectTypeOf(button).toExtend<Button>();
			// a builder stands in for a payload, and a payload can be read back into a builder
			expect(() => ButtonBuilder.validate(button)).not.toThrow();
			expect(ButtonBuilder.from(button).custom_id).toBe("delete");
		});

		it("static validate matches instance validate behavior", () => {
			const payload = { type: ComponentTypes.BUTTON, style: ButtonStyles.PRIMARY, label: "Click me", custom_id: "click" } as const;

			expect(() => ButtonBuilder.validate(payload)).not.toThrow();
		});
	});
});

describe("LinkButtonBuilder", () => {
	it("defaults type to BUTTON and fixes style to LINK", () => {
		const builder = new LinkButtonBuilder();

		expect(builder.type).toBe(ComponentTypes.BUTTON);
		expect(builder.style).toBe(ButtonStyles.LINK);
	});

	it("hydrates a builder from payload using static from", () => {
		const payload = { type: ComponentTypes.BUTTON, style: ButtonStyles.LINK, label: "Docs", url: "https://example.com" } as const;

		const builder = LinkButtonBuilder.from(payload);

		expect(builder.label).toBe("Docs");
		expect(builder.url).toBe("https://example.com");
	});

	it("sets url within the allowed length", () => {
		const url = `https://example.com/${"a".repeat(490)}`;
		const builder = new LinkButtonBuilder().setURL(url);

		expect(builder.url).toBe(url);
	});

	it("throws when url is empty or exceeds 512 characters", () => {
		expect(() => new LinkButtonBuilder().setURL("")).toThrow(/Button url must be between 1 and 512 characters long/);
		expect(() => new LinkButtonBuilder().setURL(`https://example.com/${"a".repeat(600)}`)).toThrow(
			/Button url must be between 1 and 512 characters long/
		);
	});

	it("throws when label is empty or exceeds 80 characters", () => {
		expect(() => new LinkButtonBuilder().setLabel("")).toThrow(/Button label must be between 1 and 80 characters long/);
		expect(() => new LinkButtonBuilder().setLabel("a".repeat(81))).toThrow(/Button label must be between 1 and 80 characters long/);
	});

	it("sets emoji and disabled via their setters", () => {
		const builder = new LinkButtonBuilder().setEmoji({ name: "\u{1F525}" }).setDisabled();

		expect(builder.emoji).toEqual({ name: "\u{1F525}" });
		expect(builder.disabled).toBe(true);
	});

	describe("validate", () => {
		it("passes for a fully-populated link button", () => {
			const builder = new LinkButtonBuilder().setLabel("Docs").setURL("https://example.com");

			expect(() => builder.validate()).not.toThrow();
		});

		it("throws when label is missing", () => {
			const builder = new LinkButtonBuilder().setURL("https://example.com");

			expect(() => builder.validate()).toThrow(/Button must have a label/);
		});

		it("throws when url is missing", () => {
			const builder = new LinkButtonBuilder().setLabel("Docs");

			expect(() => builder.validate()).toThrow(/Link buttons must have a url/);
		});

		it("throws when a custom_id is set", () => {
			const builder = new LinkButtonBuilder().setLabel("Docs").setURL("https://example.com");
			// only reachable from a hand-written payload - the builder has no setCustomID
			Object.assign(builder, { custom_id: "click" });

			expect(() => builder.validate()).toThrow(/Link buttons cannot have a custom_id/);
		});

		it("is assignable to the payload type it mirrors", () => {
			const button: LinkButton = new LinkButtonBuilder().setLabel("Docs").setURL("https://example.com");

			expectTypeOf(button).toExtend<Button>();
			expect(() => LinkButtonBuilder.validate(button)).not.toThrow();
			expect(LinkButtonBuilder.from(button).url).toBe("https://example.com");
		});

		it("static validate matches instance validate behavior", () => {
			const payload = { type: ComponentTypes.BUTTON, style: ButtonStyles.LINK, label: "Docs", url: "https://example.com" } as const;

			expect(() => LinkButtonBuilder.validate(payload)).not.toThrow();
		});
	});
});

describe("ResolveButton", () => {
	it("builds the matching builder for each style family", () => {
		expect(ResolveButton({ type: ComponentTypes.BUTTON, style: ButtonStyles.DANGER, label: "Delete", custom_id: "delete" })).toBeInstanceOf(
			ButtonBuilder
		);
		expect(ResolveButton({ type: ComponentTypes.BUTTON, style: ButtonStyles.LINK, label: "Docs", url: "https://example.com" })).toBeInstanceOf(
			LinkButtonBuilder
		);
		expect(ResolveButton({ type: ComponentTypes.BUTTON, style: ButtonStyles.PREMIUM, sku_id: "1234567890" })).toBeInstanceOf(SKUButtonBuilder);
	});

	it("validates any button style, builder or payload alike", () => {
		expect(() => ValidateButton(new ButtonBuilder().setLabel("Click me").setCustomID("click"))).not.toThrow();
		expect(() => ValidateButton(new LinkButtonBuilder().setLabel("Docs").setURL("https://example.com"))).not.toThrow();
		expect(() => ValidateButton({ type: ComponentTypes.BUTTON, style: ButtonStyles.PREMIUM, sku_id: "1234567890" })).not.toThrow();

		expect(() => ValidateButton({ type: ComponentTypes.BUTTON, style: ButtonStyles.LINK, label: "Docs", url: "" })).toThrow(
			/Link buttons must have a url/
		);
	});
});

describe("SKUButtonBuilder", () => {
	it("defaults type to BUTTON and style to PREMIUM", () => {
		const builder = new SKUButtonBuilder();

		expect(builder.type).toBe(ComponentTypes.BUTTON);
		expect(builder.style).toBe(ButtonStyles.PREMIUM);
	});

	it("hydrates a builder from payload using static from", () => {
		const payload = { type: ComponentTypes.BUTTON, style: ButtonStyles.PREMIUM, sku_id: "1234567890" } as const;

		const builder = SKUButtonBuilder.from(payload);

		expect(builder.sku_id).toBe("1234567890");
		expect(builder.disabled).toBeUndefined();
	});

	it("carries disabled through static from", () => {
		const payload = { type: ComponentTypes.BUTTON, style: ButtonStyles.PREMIUM, sku_id: "1234567890", disabled: true } as const;

		const builder = SKUButtonBuilder.from(payload);

		expect(builder.disabled).toBe(true);
	});

	it("sets sku_id via setSkuId", () => {
		const builder = new SKUButtonBuilder().setSkuID("1234567890");

		expect(builder.sku_id).toBe("1234567890");
	});

	it("throws when sku_id is empty", () => {
		expect(() => new SKUButtonBuilder().setSkuID("")).toThrow(/SKU button's sku_id cannot be empty/);
	});

	it("defaults setDisabled to true when called without an argument", () => {
		const builder = new SKUButtonBuilder().setDisabled();

		expect(builder.disabled).toBe(true);
	});

	it("allows chaining setDisabled(false) to re-enable a button", () => {
		const builder = new SKUButtonBuilder().setDisabled().setDisabled(false);

		expect(builder.disabled).toBe(false);
	});

	describe("validate", () => {
		it("passes for a fully-populated SKU button", () => {
			const builder = new SKUButtonBuilder().setSkuID("1234567890");

			expect(() => builder.validate()).not.toThrow();
		});

		it("throws when sku_id is missing", () => {
			const builder = new SKUButtonBuilder();

			expect(() => builder.validate()).toThrow(/SKU button must have a sku_id/);
		});

		it("is assignable to the payload type it mirrors", () => {
			const button: PremiumButton = new SKUButtonBuilder().setSkuID("1234567890");

			expectTypeOf(button).toExtend<Button>();
			expect(() => SKUButtonBuilder.validate(button)).not.toThrow();
			expect(SKUButtonBuilder.from(button).sku_id).toBe("1234567890");
		});

		it("static validate matches instance validate behavior", () => {
			const payload = { type: ComponentTypes.BUTTON, style: ButtonStyles.PREMIUM, sku_id: "1234567890" } as const;

			expect(() => SKUButtonBuilder.validate(payload)).not.toThrow();
		});
	});
});

describe("StringSelectBuilder", () => {
	it("defaults type to STRING_SELECT", () => {
		const builder = new StringSelectBuilder();

		expect(builder.type).toBe(ComponentTypes.STRING_SELECT);
	});

	it("hydrates a builder from payload using static from", () => {
		const payload: StringSelect = {
			type: ComponentTypes.STRING_SELECT,
			custom_id: "pick",
			placeholder: "Pick one",
			min_values: 1,
			max_values: 3,
			required: true,
			disabled: false,
			options: [{ label: "One", value: "one" }, { label: "Two", value: "two" }]
		};

		const builder = StringSelectBuilder.from(payload);

		expect(builder.custom_id).toBe("pick");
		expect(builder.placeholder).toBe("Pick one");
		expect(builder.min_values).toBe(1);
		expect(builder.max_values).toBe(3);
		expect(builder.required).toBe(true);
		expect(builder.disabled).toBe(false);
		expect(builder.options).toEqual([{ label: "One", value: "one" }, { label: "Two", value: "two" }]);
	});

	it("throws from static from when provided invalid values", () => {
		const payload: StringSelect = { type: ComponentTypes.STRING_SELECT, custom_id: "a".repeat(101), options: [{ label: "One", value: "one" }] };

		expect(() => StringSelectBuilder.from(payload)).toThrow(/String select custom_id must be between 1 and 100 characters long/);
	});

	it("sets custom_id within the allowed length", () => {
		const builder = new StringSelectBuilder().setCustomID("a".repeat(100));

		expect(builder.custom_id).toBe("a".repeat(100));
	});

	it("throws when custom_id is empty or exceeds 100 characters", () => {
		expect(() => new StringSelectBuilder().setCustomID("")).toThrow(/String select custom_id must be between 1 and 100 characters long/);
		expect(() => new StringSelectBuilder().setCustomID("a".repeat(101))).toThrow(
			/String select custom_id must be between 1 and 100 characters long/
		);
	});

	it("sets placeholder within the allowed length", () => {
		const builder = new StringSelectBuilder().setPlaceholder("a".repeat(150));

		expect(builder.placeholder).toBe("a".repeat(150));
	});

	it("throws when placeholder exceeds 150 characters", () => {
		expect(() => new StringSelectBuilder().setPlaceholder("a".repeat(151))).toThrow(
			/String select placeholder must be 150 characters or fewer/
		);
	});

	it("sets min_values and max_values within their allowed ranges", () => {
		const builder = new StringSelectBuilder().setMinValues(0).setMaxValues(25);

		expect(builder.min_values).toBe(0);
		expect(builder.max_values).toBe(25);
	});

	it("throws when min_values is out of range", () => {
		expect(() => new StringSelectBuilder().setMinValues(-1)).toThrow(/String select min_values must be between 0 and 25/);
		expect(() => new StringSelectBuilder().setMinValues(26)).toThrow(/String select min_values must be between 0 and 25/);
	});

	it("throws when max_values is out of range", () => {
		expect(() => new StringSelectBuilder().setMaxValues(0)).toThrow(/String select max_values must be between 1 and 25/);
		expect(() => new StringSelectBuilder().setMaxValues(26)).toThrow(/String select max_values must be between 1 and 25/);
	});

	it("sets required and disabled via their setters", () => {
		const builder = new StringSelectBuilder().setRequired().setDisabled();

		expect(builder.required).toBe(true);
		expect(builder.disabled).toBe(true);
	});

	it("defaults setRequired and setDisabled to true when called without an argument", () => {
		const builder = new StringSelectBuilder().setRequired().setDisabled();

		expect(builder.required).toBe(true);
		expect(builder.disabled).toBe(true);
	});

	it("allows chaining setRequired(false) and setDisabled(false)", () => {
		const builder = new StringSelectBuilder().setRequired().setDisabled().setRequired(false).setDisabled(false);

		expect(builder.required).toBe(false);
		expect(builder.disabled).toBe(false);
	});

	it("replaces the option list via setOptions", () => {
		const options = [{ label: "One", value: "one" }, { label: "Two", value: "two" }];
		const builder = new StringSelectBuilder().setOptions(options);

		expect(builder.options).toEqual(options);
	});

	it("throws when setOptions receives more than 25 options", () => {
		const options = Array.from({ length: 26 }, (_, index) => ({ label: `Option ${index}`, value: `${index}` }));

		expect(() => new StringSelectBuilder().setOptions(options)).toThrow(/String select cannot have more than 25 options/);
	});

	it("appends options up to the maximum of 25 via addOptions", () => {
		const options = Array.from({ length: 25 }, (_, index) => ({ label: `Option ${index}`, value: `${index}` }));
		const builder = new StringSelectBuilder().addOptions(options);

		expect(builder.options).toHaveLength(25);
	});

	it("throws when addOptions exceeds 25 total options", () => {
		const baseOptions = Array.from({ length: 24 }, (_, index) => ({ label: `Option ${index}`, value: `${index}` }));
		const builder = new StringSelectBuilder().addOptions(baseOptions);

		expect(() => builder.addOptions([{ label: "25", value: "25" }, { label: "26", value: "26" }])).toThrow(
			/String select cannot have more than 25 options/
		);
	});

	it("appends a single option via addOption", () => {
		const builder = new StringSelectBuilder().addOption("One", "one", { description: "The first option", default: true });

		expect(builder.options).toEqual([{ label: "One", value: "one", description: "The first option", default: true }]);
	});

	it("accumulates multiple addOption calls", () => {
		const builder = new StringSelectBuilder().addOption("One", "one").addOption("Two", "two");

		expect(builder.options).toEqual([{ label: "One", value: "one" }, { label: "Two", value: "two" }]);
	});

	describe("validate", () => {
		it("passes for a fully-populated string select", () => {
			const builder = new StringSelectBuilder().setCustomID("pick").addOption("One", "one");

			expect(() => builder.validate()).not.toThrow();
		});

		it("throws when custom_id is missing", () => {
			const builder = new StringSelectBuilder().addOption("One", "one");

			expect(() => builder.validate()).toThrow(/String select must have a custom_id/);
		});

		it("throws when there are no options", () => {
			const builder = new StringSelectBuilder().setCustomID("pick");

			expect(() => builder.validate()).toThrow(/String select must have at least 1 option/);
		});

		it("throws when an option is missing a label", () => {
			const builder = new StringSelectBuilder().setCustomID("pick").addOption("", "one");

			expect(() => builder.validate()).toThrow(/String select option must have a label/);
		});

		it("throws when an option is missing a value", () => {
			const builder = new StringSelectBuilder().setCustomID("pick").addOption("One", "");

			expect(() => builder.validate()).toThrow(/String select option must have a value/);
		});

		it("throws when an option label exceeds 100 characters", () => {
			const builder = new StringSelectBuilder().setCustomID("pick").addOption("a".repeat(101), "one");

			expect(() => builder.validate()).toThrow(/String select option label must be 100 characters or fewer/);
		});

		it("throws when an option value exceeds 100 characters", () => {
			const builder = new StringSelectBuilder().setCustomID("pick").addOption("One", "a".repeat(101));

			expect(() => builder.validate()).toThrow(/String select option value must be 100 characters or fewer/);
		});

		it("throws when an option description exceeds 100 characters", () => {
			const builder = new StringSelectBuilder().setCustomID("pick").addOption("One", "one", { description: "a".repeat(101) });

			expect(() => builder.validate()).toThrow(/String select option description must be 100 characters or fewer/);
		});

		it("throws when min_values exceeds max_values", () => {
			const builder = new StringSelectBuilder().setCustomID("pick").addOption("One", "one").setMinValues(5).setMaxValues(2);

			expect(() => builder.validate()).toThrow(/String select min_values cannot exceed max_values/);
		});

		it("static validate matches instance validate behavior", () => {
			const payload: StringSelect = {
				type: ComponentTypes.STRING_SELECT,
				custom_id: "pick",
				options: [{ label: "One", value: "one" }]
			};

			expect(() => StringSelectBuilder.validate(payload)).not.toThrow();
		});
	});
});

describe("UserSelectBuilder", () => {
	it("defaults type to USER_SELECT", () => {
		const builder = new UserSelectBuilder();

		expect(builder.type).toBe(ComponentTypes.USER_SELECT);
	});

	it("hydrates a builder from payload using static from", () => {
		const payload: UserSelect = {
			type: ComponentTypes.USER_SELECT,
			custom_id: "pick",
			placeholder: "Pick a user",
			min_values: 1,
			max_values: 3,
			required: true,
			disabled: false,
			default_values: [{ id: "1", type: "user" }]
		};

		const builder = UserSelectBuilder.from(payload);

		expect(builder.custom_id).toBe("pick");
		expect(builder.placeholder).toBe("Pick a user");
		expect(builder.min_values).toBe(1);
		expect(builder.max_values).toBe(3);
		expect(builder.required).toBe(true);
		expect(builder.disabled).toBe(false);
		expect(builder.default_values).toEqual([{ id: "1", type: "user" }]);
	});

	it("throws from static from when provided invalid values", () => {
		const payload: UserSelect = { type: ComponentTypes.USER_SELECT, custom_id: "a".repeat(101) };

		expect(() => UserSelectBuilder.from(payload)).toThrow(/User select custom_id must be between 1 and 100 characters long/);
	});

	it("sets custom_id within the allowed length", () => {
		const builder = new UserSelectBuilder().setCustomID("a".repeat(100));

		expect(builder.custom_id).toBe("a".repeat(100));
	});

	it("throws when custom_id is empty or exceeds 100 characters", () => {
		expect(() => new UserSelectBuilder().setCustomID("")).toThrow(/User select custom_id must be between 1 and 100 characters long/);
		expect(() => new UserSelectBuilder().setCustomID("a".repeat(101))).toThrow(
			/User select custom_id must be between 1 and 100 characters long/
		);
	});

	it("sets placeholder within the allowed length", () => {
		const builder = new UserSelectBuilder().setPlaceholder("a".repeat(150));

		expect(builder.placeholder).toBe("a".repeat(150));
	});

	it("throws when placeholder exceeds 150 characters", () => {
		expect(() => new UserSelectBuilder().setPlaceholder("a".repeat(151))).toThrow(/User select placeholder must be 150 characters or fewer/);
	});

	it("sets min_values and max_values within their allowed ranges", () => {
		const builder = new UserSelectBuilder().setMinValues(0).setMaxValues(25);

		expect(builder.min_values).toBe(0);
		expect(builder.max_values).toBe(25);
	});

	it("throws when min_values or max_values are out of range", () => {
		expect(() => new UserSelectBuilder().setMinValues(-1)).toThrow(/User select min_values must be between 0 and 25/);
		expect(() => new UserSelectBuilder().setMaxValues(0)).toThrow(/User select max_values must be between 1 and 25/);
	});

	it("defaults setRequired and setDisabled to true when called without an argument", () => {
		const builder = new UserSelectBuilder().setRequired().setDisabled();

		expect(builder.required).toBe(true);
		expect(builder.disabled).toBe(true);
	});

	it("replaces default_values via setDefaultValues", () => {
		const values = [{ id: "1", type: "user" as const }];
		const builder = new UserSelectBuilder().setDefaultValues(values);

		expect(builder.default_values).toEqual(values);
	});

	it("appends default_values via addDefaultValues", () => {
		const builder = new UserSelectBuilder()
			.addDefaultValues({ id: "1", type: "user" })
			.addDefaultValues({ id: "2", type: "user" });

		expect(builder.default_values).toEqual([{ id: "1", type: "user" }, { id: "2", type: "user" }]);
	});

	it("appends default users by id via addDefaultUsers", () => {
		const builder = new UserSelectBuilder().addDefaultUsers("1", "2");

		expect(builder.default_values).toEqual([{ id: "1", type: "user" }, { id: "2", type: "user" }]);
	});

	describe("validate", () => {
		it("passes for a fully-populated user select", () => {
			const builder = new UserSelectBuilder().setCustomID("pick");

			expect(() => builder.validate()).not.toThrow();
		});

		it("throws when custom_id is missing", () => {
			const builder = new UserSelectBuilder();

			expect(() => builder.validate()).toThrow(/User select must have a custom_id/);
		});

		it("throws when default_values has more entries than max_values", () => {
			const builder = new UserSelectBuilder().setCustomID("pick").setMaxValues(1).addDefaultUsers("1", "2");

			expect(() => builder.validate()).toThrow(/User select cannot have more default_values than max_values/);
		});

		it("throws when min_values exceeds max_values", () => {
			const builder = new UserSelectBuilder().setCustomID("pick").setMinValues(5).setMaxValues(2);

			expect(() => builder.validate()).toThrow(/User select min_values cannot exceed max_values/);
		});

		it("static validate matches instance validate behavior", () => {
			const payload: UserSelect = { type: ComponentTypes.USER_SELECT, custom_id: "pick" };

			expect(() => UserSelectBuilder.validate(payload)).not.toThrow();
		});
	});
});

describe("RoleSelectBuilder", () => {
	it("defaults type to ROLE_SELECT", () => {
		const builder = new RoleSelectBuilder();

		expect(builder.type).toBe(ComponentTypes.ROLE_SELECT);
	});

	it("hydrates a builder from payload using static from", () => {
		const payload: RoleSelect = {
			type: ComponentTypes.ROLE_SELECT,
			custom_id: "pick",
			default_values: [{ id: "1", type: "role" }]
		};

		const builder = RoleSelectBuilder.from(payload);

		expect(builder.custom_id).toBe("pick");
		expect(builder.default_values).toEqual([{ id: "1", type: "role" }]);
	});

	it("throws from static from when provided invalid values", () => {
		const payload: RoleSelect = { type: ComponentTypes.ROLE_SELECT, custom_id: "a".repeat(101) };

		expect(() => RoleSelectBuilder.from(payload)).toThrow(/Role select custom_id must be between 1 and 100 characters long/);
	});

	it("throws when custom_id is empty or exceeds 100 characters", () => {
		expect(() => new RoleSelectBuilder().setCustomID("")).toThrow(/Role select custom_id must be between 1 and 100 characters long/);
		expect(() => new RoleSelectBuilder().setCustomID("a".repeat(101))).toThrow(
			/Role select custom_id must be between 1 and 100 characters long/
		);
	});

	it("throws when placeholder exceeds 150 characters", () => {
		expect(() => new RoleSelectBuilder().setPlaceholder("a".repeat(151))).toThrow(/Role select placeholder must be 150 characters or fewer/);
	});

	it("appends default roles by id via addDefaultRoles", () => {
		const builder = new RoleSelectBuilder().addDefaultRoles("1", "2");

		expect(builder.default_values).toEqual([{ id: "1", type: "role" }, { id: "2", type: "role" }]);
	});

	describe("validate", () => {
		it("passes for a fully-populated role select", () => {
			const builder = new RoleSelectBuilder().setCustomID("pick");

			expect(() => builder.validate()).not.toThrow();
		});

		it("throws when custom_id is missing", () => {
			const builder = new RoleSelectBuilder();

			expect(() => builder.validate()).toThrow(/Role select must have a custom_id/);
		});

		it("static validate matches instance validate behavior", () => {
			const payload: RoleSelect = { type: ComponentTypes.ROLE_SELECT, custom_id: "pick" };

			expect(() => RoleSelectBuilder.validate(payload)).not.toThrow();
		});
	});
});

describe("MentionableSelectBuilder", () => {
	it("defaults type to MENTIONABLE_SELECT", () => {
		const builder = new MentionableSelectBuilder();

		expect(builder.type).toBe(ComponentTypes.MENTIONABLE_SELECT);
	});

	it("hydrates a builder from payload using static from", () => {
		const payload: MentionableSelect = {
			type: ComponentTypes.MENTIONABLE_SELECT,
			custom_id: "pick",
			default_values: [{ id: "1", type: "user" }, { id: "2", type: "role" }]
		};

		const builder = MentionableSelectBuilder.from(payload);

		expect(builder.custom_id).toBe("pick");
		expect(builder.default_values).toEqual([{ id: "1", type: "user" }, { id: "2", type: "role" }]);
	});

	it("throws from static from when provided invalid values", () => {
		const payload: MentionableSelect = { type: ComponentTypes.MENTIONABLE_SELECT, custom_id: "a".repeat(101) };

		expect(() => MentionableSelectBuilder.from(payload)).toThrow(/Mentionable select custom_id must be between 1 and 100 characters long/);
	});

	it("throws when custom_id is empty or exceeds 100 characters", () => {
		expect(() => new MentionableSelectBuilder().setCustomID("")).toThrow(
			/Mentionable select custom_id must be between 1 and 100 characters long/
		);
	});

	it("appends default users and roles via their respective setters", () => {
		const builder = new MentionableSelectBuilder().addDefaultUsers("1").addDefaultRoles("2");

		expect(builder.default_values).toEqual([{ id: "1", type: "user" }, { id: "2", type: "role" }]);
	});

	describe("validate", () => {
		it("passes for a fully-populated mentionable select", () => {
			const builder = new MentionableSelectBuilder().setCustomID("pick");

			expect(() => builder.validate()).not.toThrow();
		});

		it("throws when custom_id is missing", () => {
			const builder = new MentionableSelectBuilder();

			expect(() => builder.validate()).toThrow(/Mentionable select must have a custom_id/);
		});

		it("static validate matches instance validate behavior", () => {
			const payload: MentionableSelect = { type: ComponentTypes.MENTIONABLE_SELECT, custom_id: "pick" };

			expect(() => MentionableSelectBuilder.validate(payload)).not.toThrow();
		});
	});
});

describe("ChannelSelectBuilder", () => {
	it("defaults type to CHANNEL_SELECT", () => {
		const builder = new ChannelSelectBuilder();

		expect(builder.type).toBe(ComponentTypes.CHANNEL_SELECT);
	});

	it("hydrates a builder from payload using static from", () => {
		const payload: ChannelSelect = {
			type: ComponentTypes.CHANNEL_SELECT,
			custom_id: "pick",
			channel_types: [DiscordChannelTypes.GUILD_TEXT, DiscordChannelTypes.GUILD_VOICE],
			default_values: [{ id: "1", type: "channel" }]
		};

		const builder = ChannelSelectBuilder.from(payload);

		expect(builder.custom_id).toBe("pick");
		expect(builder.channel_types).toEqual([DiscordChannelTypes.GUILD_TEXT, DiscordChannelTypes.GUILD_VOICE]);
		expect(builder.default_values).toEqual([{ id: "1", type: "channel" }]);
	});

	it("throws from static from when provided invalid values", () => {
		const payload: ChannelSelect = { type: ComponentTypes.CHANNEL_SELECT, custom_id: "a".repeat(101) };

		expect(() => ChannelSelectBuilder.from(payload)).toThrow(/Channel select custom_id must be between 1 and 100 characters long/);
	});

	it("throws when custom_id is empty or exceeds 100 characters", () => {
		expect(() => new ChannelSelectBuilder().setCustomID("")).toThrow(/Channel select custom_id must be between 1 and 100 characters long/);
	});

	it("sets channel_types via setChannelTypes", () => {
		const builder = new ChannelSelectBuilder().setChannelTypes(DiscordChannelTypes.GUILD_TEXT);

		expect(builder.channel_types).toEqual([DiscordChannelTypes.GUILD_TEXT]);
	});

	it("appends default channels by id via addDefaultChannels", () => {
		const builder = new ChannelSelectBuilder().addDefaultChannels("1", "2");

		expect(builder.default_values).toEqual([{ id: "1", type: "channel" }, { id: "2", type: "channel" }]);
	});

	describe("validate", () => {
		it("passes for a fully-populated channel select", () => {
			const builder = new ChannelSelectBuilder().setCustomID("pick").setChannelTypes(DiscordChannelTypes.GUILD_TEXT);

			expect(() => builder.validate()).not.toThrow();
		});

		it("throws when custom_id is missing", () => {
			const builder = new ChannelSelectBuilder();

			expect(() => builder.validate()).toThrow(/Channel select must have a custom_id/);
		});

		it("throws when default_values has more entries than max_values", () => {
			const builder = new ChannelSelectBuilder().setCustomID("pick").setMaxValues(1).addDefaultChannels("1", "2");

			expect(() => builder.validate()).toThrow(/Channel select cannot have more default_values than max_values/);
		});

		it("static validate matches instance validate behavior", () => {
			const payload: ChannelSelect = { type: ComponentTypes.CHANNEL_SELECT, custom_id: "pick" };

			expect(() => ChannelSelectBuilder.validate(payload)).not.toThrow();
		});
	});
});

function makeButton(customId = "click"): ButtonBuilder {
	return new ButtonBuilder().setLabel("Click me").setCustomID(customId);
}

function makeSelect(customId = "pick"): StringSelectBuilder {
	return new StringSelectBuilder().setCustomID(customId).addOption("One", "one");
}

describe("ActionRowBuilder", () => {
	it("defaults type to ACTION_ROW and components to an empty array", () => {
		const builder = new ActionRowBuilder();

		expect(builder.type).toBe(ComponentTypes.ACTION_ROW);
		expect(builder.components).toEqual([]);
	});

	it("hydrates a builder from a component list using static from", () => {
		const button = makeButton();
		const builder = ActionRowBuilder.from([button]);

		expect(builder.components).toEqual([button]);
	});

	it("appends components via addComponents", () => {
		const first = makeButton("first");
		const second = makeButton("second");
		const builder = new ActionRowBuilder<ButtonBuilder>().addComponents(first).addComponents(second);

		expect(builder.components).toEqual([first, second]);
	});

	it("replaces the component list via setComponents", () => {
		const button = makeButton();
		const builder = new ActionRowBuilder<ButtonBuilder>().addComponents(makeButton("stale")).setComponents([button]);

		expect(builder.components).toEqual([button]);
	});

	describe("validate", () => {
		it("passes for a row of up to 5 buttons", () => {
			const buttons = Array.from({ length: 5 }, (_, index) => makeButton(`button-${index}`));
			const builder = new ActionRowBuilder<ButtonBuilder>().setComponents(buttons);

			expect(() => builder.validate()).not.toThrow();
		});

		it("passes for a row with a single select menu", () => {
			const builder = new ActionRowBuilder<StringSelectBuilder>().addComponents(makeSelect());

			expect(() => builder.validate()).not.toThrow();
		});

		it("throws when the row has no components", () => {
			const builder = new ActionRowBuilder();

			expect(() => builder.validate()).toThrow(/Action row must have at least 1 component/);
		});

		it("throws when the row has more than 5 buttons", () => {
			const buttons = Array.from({ length: 6 }, (_, index) => makeButton(`button-${index}`));
			const builder = new ActionRowBuilder<ButtonBuilder>().setComponents(buttons);

			expect(() => builder.validate()).toThrow(/Action row cannot have more than 5 buttons/);
		});

		it("throws when the row has more than 1 select menu", () => {
			const builder = new ActionRowBuilder().setComponents([makeSelect("first"), makeSelect("second")]);

			expect(() => builder.validate()).toThrow(/Action row can only contain 1 select menu/);
		});

		it("throws when the row mixes a select menu with buttons", () => {
			const builder = new ActionRowBuilder().setComponents([makeButton(), makeSelect()]);

			expect(() => builder.validate()).toThrow(/Action row cannot mix a select menu with buttons/);
		});

		it("cascades validation into each child component", () => {
			const invalidButton = new ButtonBuilder().setCustomID("click");
			const builder = new ActionRowBuilder<ButtonBuilder>().addComponents(invalidButton);

			expect(() => builder.validate()).toThrow(/Button must have a label/);
		});

		it("cascades validation into raw component payloads too", () => {
			const invalidButton: InteractiveButton = { type: ComponentTypes.BUTTON, style: ButtonStyles.PRIMARY, label: "", custom_id: "click" };
			const builder = new ActionRowBuilder().addComponents(invalidButton);

			expect(() => builder.validate()).toThrow(/Button must have a label/);
		});

		it("accepts builders and raw payloads in the same row", () => {
			const builder = new ActionRowBuilder().addComponents(makeButton("from-builder"), {
				type: ComponentTypes.BUTTON,
				style: ButtonStyles.LINK,
				label: "Docs",
				url: "https://example.com"
			});

			expect(() => builder.validate()).not.toThrow();
			expect(builder.components).toHaveLength(2);
		});

		it("is assignable to the ActionRow payload type", () => {
			const row: ActionRow = new ActionRowBuilder().addComponents(makeButton());

			expectTypeOf(row).toExtend<ActionRow>();
			expect(row.type).toBe(ComponentTypes.ACTION_ROW);
		});

		it("static validate accepts a bare component list or a whole row", () => {
			expect(() => ActionRowBuilder.validate([makeButton()])).not.toThrow();
			expect(() => ActionRowBuilder.validate([])).toThrow(/Action row must have at least 1 component/);
			expect(() => ActionRowBuilder.validate({ type: ComponentTypes.ACTION_ROW, components: [makeButton()] })).not.toThrow();
		});
	});
});

describe("TextInputBuilder", () => {
	it("defaults type to TEXT_INPUT", () => {
		const builder = new TextInputBuilder();

		expect(builder.type).toBe(ComponentTypes.TEXT_INPUT);
	});

	it("hydrates a builder from payload using static from", () => {
		const payload: TextInput = {
			type: ComponentTypes.TEXT_INPUT,
			custom_id: "feedback",
			style: TextInputStyles.PARAGRAPH,
			min_length: 1,
			max_length: 100,
			required: true,
			value: "hello",
			placeholder: "Type here"
		};

		const builder = TextInputBuilder.from(payload);

		expect(builder.custom_id).toBe("feedback");
		expect(builder.style).toBe(TextInputStyles.PARAGRAPH);
		expect(builder.min_length).toBe(1);
		expect(builder.max_length).toBe(100);
		expect(builder.required).toBe(true);
		expect(builder.value).toBe("hello");
		expect(builder.placeholder).toBe("Type here");
	});

	it("throws from static from when provided invalid values", () => {
		const payload: TextInput = { type: ComponentTypes.TEXT_INPUT, custom_id: "a".repeat(101), style: TextInputStyles.SHORT };

		expect(() => TextInputBuilder.from(payload)).toThrow(/Text input custom_id must be between 1 and 100 characters long/);
	});

	it("sets custom_id within the allowed length", () => {
		const builder = new TextInputBuilder().setCustomID("a".repeat(100));

		expect(builder.custom_id).toBe("a".repeat(100));
	});

	it("throws when custom_id is empty or exceeds 100 characters", () => {
		expect(() => new TextInputBuilder().setCustomID("")).toThrow(/Text input custom_id must be between 1 and 100 characters long/);
		expect(() => new TextInputBuilder().setCustomID("a".repeat(101))).toThrow(
			/Text input custom_id must be between 1 and 100 characters long/
		);
	});

	it("sets style via setStyle", () => {
		const builder = new TextInputBuilder().setStyle(TextInputStyles.SHORT);

		expect(builder.style).toBe(TextInputStyles.SHORT);
	});

	it("sets min_length and max_length within their allowed ranges", () => {
		const builder = new TextInputBuilder().setMinLength(0).setMaxLength(4000);

		expect(builder.min_length).toBe(0);
		expect(builder.max_length).toBe(4000);
	});

	it("throws when min_length or max_length are out of range", () => {
		expect(() => new TextInputBuilder().setMinLength(-1)).toThrow(/Text input min_length must be between 0 and 4000/);
		expect(() => new TextInputBuilder().setMinLength(4001)).toThrow(/Text input min_length must be between 0 and 4000/);
		expect(() => new TextInputBuilder().setMaxLength(0)).toThrow(/Text input max_length must be between 1 and 4000/);
		expect(() => new TextInputBuilder().setMaxLength(4001)).toThrow(/Text input max_length must be between 1 and 4000/);
	});

	it("defaults setRequired to true when called without an argument", () => {
		const builder = new TextInputBuilder().setRequired();

		expect(builder.required).toBe(true);
	});

	it("sets value within the allowed length", () => {
		const builder = new TextInputBuilder().setValue("a".repeat(4000));

		expect(builder.value).toBe("a".repeat(4000));
	});

	it("throws when value exceeds 4000 characters", () => {
		expect(() => new TextInputBuilder().setValue("a".repeat(4001))).toThrow(/Text input value must be 4000 characters or fewer/);
	});

	it("sets placeholder within the allowed length", () => {
		const builder = new TextInputBuilder().setPlaceholder("a".repeat(100));

		expect(builder.placeholder).toBe("a".repeat(100));
	});

	it("throws when placeholder exceeds 100 characters", () => {
		expect(() => new TextInputBuilder().setPlaceholder("a".repeat(101))).toThrow(
			/Text input placeholder must be 100 characters or fewer/
		);
	});

	describe("validate", () => {
		it("passes for a fully-populated text input", () => {
			const builder = new TextInputBuilder().setCustomID("feedback").setStyle(TextInputStyles.SHORT);

			expect(() => builder.validate()).not.toThrow();
		});

		it("throws when custom_id is missing", () => {
			const builder = new TextInputBuilder().setStyle(TextInputStyles.SHORT);

			expect(() => builder.validate()).toThrow(/Text input must have a custom_id/);
		});

		it("throws when style is missing", () => {
			const builder = new TextInputBuilder().setCustomID("feedback");

			expect(() => builder.validate()).toThrow(/Text input must have a style/);
		});

		it("throws when min_length exceeds max_length", () => {
			const builder = new TextInputBuilder().setCustomID("feedback").setStyle(TextInputStyles.SHORT).setMinLength(10).setMaxLength(5);

			expect(() => builder.validate()).toThrow(/Text input min_length cannot exceed max_length/);
		});

		it("static validate matches instance validate behavior", () => {
			const payload: TextInput = { type: ComponentTypes.TEXT_INPUT, custom_id: "feedback", style: TextInputStyles.SHORT };

			expect(() => TextInputBuilder.validate(payload)).not.toThrow();
		});
	});
});

function makeTextInput(customId = "feedback"): TextInputBuilder {
	return new TextInputBuilder().setCustomID(customId).setStyle(TextInputStyles.SHORT);
}

describe("LabelBuilder", () => {
	it("defaults type to LABEL", () => {
		const builder = new LabelBuilder();

		expect(builder.type).toBe(ComponentTypes.LABEL);
	});

	it("hydrates a builder from a raw payload, inferring the text input builder", () => {
		const payload: Label = {
			type: ComponentTypes.LABEL,
			label: "Feedback",
			description: "Tell us what you think",
			component: { type: ComponentTypes.TEXT_INPUT, custom_id: "feedback", style: TextInputStyles.PARAGRAPH }
		};

		const builder = LabelBuilder.from(payload);

		expect(builder.label).toBe("Feedback");
		expect(builder.description).toBe("Tell us what you think");
		expect(builder.component).toBeInstanceOf(TextInputBuilder);
		expect((builder.component as TextInputBuilder).custom_id).toBe("feedback");
	});

	it("hydrates a builder from a raw payload, inferring a select builder", () => {
		const payload: Label = {
			type: ComponentTypes.LABEL,
			label: "Pick one",
			component: { type: ComponentTypes.STRING_SELECT, custom_id: "pick", options: [{ label: "One", value: "one" }] }
		};

		const builder = LabelBuilder.from(payload);

		expect(builder.component).toBeInstanceOf(StringSelectBuilder);
	});

	it("sets label within the allowed length", () => {
		const builder = new LabelBuilder().setLabel("a".repeat(45));

		expect(builder.label).toBe("a".repeat(45));
	});

	it("throws when label is empty or exceeds 45 characters", () => {
		expect(() => new LabelBuilder().setLabel("")).toThrow(/Label text must be between 1 and 45 characters long/);
		expect(() => new LabelBuilder().setLabel("a".repeat(46))).toThrow(/Label text must be between 1 and 45 characters long/);
	});

	it("sets description within the allowed length", () => {
		const builder = new LabelBuilder().setDescription("a".repeat(100));

		expect(builder.description).toBe("a".repeat(100));
	});

	it("throws when description exceeds 100 characters", () => {
		expect(() => new LabelBuilder().setDescription("a".repeat(101))).toThrow(/Label description must be 100 characters or fewer/);
	});

	it("sets the wrapped component via setComponent", () => {
		const textInput = makeTextInput();
		const builder = new LabelBuilder().setComponent(textInput);

		expect(builder.component).toBe(textInput);
	});

	describe("validate", () => {
		it("passes for a fully-populated label", () => {
			const builder = new LabelBuilder().setLabel("Feedback").setComponent(makeTextInput());

			expect(() => builder.validate()).not.toThrow();
		});

		it("throws when label is missing", () => {
			const builder = new LabelBuilder().setComponent(makeTextInput());

			expect(() => builder.validate()).toThrow(/Label must have a label/);
		});

		it("throws when component is missing", () => {
			const builder = new LabelBuilder().setLabel("Feedback");

			expect(() => builder.validate()).toThrow(/Label must have a component/);
		});

		it("cascades validation into the wrapped component", () => {
			const builder = new LabelBuilder().setLabel("Feedback").setComponent(new TextInputBuilder().setCustomID("feedback"));

			expect(() => builder.validate()).toThrow(/Text input must have a style/);
		});

		it("static validate matches instance validate behavior", () => {
			const payload: Label = {
				type: ComponentTypes.LABEL,
				label: "Feedback",
				component: { type: ComponentTypes.TEXT_INPUT, custom_id: "feedback", style: TextInputStyles.SHORT }
			};

			expect(() => LabelBuilder.validate(payload)).not.toThrow();
		});
	});
});

describe("ModalBuilder", () => {
	it("defaults components to an empty array", () => {
		const builder = new ModalBuilder();

		expect(builder.components).toEqual([]);
	});

	it("hydrates a builder from payload using static from", () => {
		const payload: InteractionCallbackModal = {
			custom_id: "feedback-modal",
			title: "Feedback",
			components: [
				{
					type: ComponentTypes.LABEL,
					label: "Feedback",
					component: { type: ComponentTypes.TEXT_INPUT, custom_id: "feedback", style: TextInputStyles.PARAGRAPH }
				}
			]
		};

		const builder = ModalBuilder.from(payload);

		expect(builder.custom_id).toBe("feedback-modal");
		expect(builder.title).toBe("Feedback");
		expect(builder.components).toHaveLength(1);
		expect(builder.components[0]).toBeInstanceOf(LabelBuilder);
	});

	it("throws from static from when a top-level component is an action row", () => {
		const payload: InteractionCallbackModal = {
			custom_id: "feedback-modal",
			title: "Feedback",
			components: [{ type: ComponentTypes.ACTION_ROW, components: [] }]
		};

		expect(() => ModalBuilder.from(payload)).toThrow(/ModalBuilder only supports Label-wrapped fields, not action rows/);
	});

	it("sets custom_id within the allowed length", () => {
		const builder = new ModalBuilder().setCustomId("a".repeat(100));

		expect(builder.custom_id).toBe("a".repeat(100));
	});

	it("throws when custom_id is empty or exceeds 100 characters", () => {
		expect(() => new ModalBuilder().setCustomId("")).toThrow(/Modal custom_id must be between 1 and 100 characters long/);
		expect(() => new ModalBuilder().setCustomId("a".repeat(101))).toThrow(/Modal custom_id must be between 1 and 100 characters long/);
	});

	it("sets title within the allowed length", () => {
		const builder = new ModalBuilder().setTitle("a".repeat(45));

		expect(builder.title).toBe("a".repeat(45));
	});

	it("throws when title is empty or exceeds 45 characters", () => {
		expect(() => new ModalBuilder().setTitle("")).toThrow(/Modal title must be between 1 and 45 characters long/);
		expect(() => new ModalBuilder().setTitle("a".repeat(46))).toThrow(/Modal title must be between 1 and 45 characters long/);
	});

	it("appends a field via addField, wrapping it in a LabelBuilder automatically", () => {
		const textInput = makeTextInput();
		const builder = new ModalBuilder().addField("Feedback", textInput, { description: "Tell us what you think" });

		expect(builder.components).toHaveLength(1);
		expect(builder.components[0]).toBeInstanceOf(LabelBuilder);
		expect(builder.components[0].label).toBe("Feedback");
		expect(builder.components[0].description).toBe("Tell us what you think");
		expect(builder.components[0].component).toBe(textInput);
	});

	it("replaces the component list via setComponents", () => {
		const label = new LabelBuilder().setLabel("Feedback").setComponent(makeTextInput());
		const builder = new ModalBuilder().addField("Stale", makeTextInput("stale")).setComponents([label]);

		expect(builder.components).toEqual([label]);
	});

	describe("validate", () => {
		it("passes for a fully-populated modal", () => {
			const builder = new ModalBuilder().setCustomId("feedback-modal").setTitle("Feedback").addField("Feedback", makeTextInput());

			expect(() => builder.validate()).not.toThrow();
		});

		it("throws when custom_id is missing", () => {
			const builder = new ModalBuilder().setTitle("Feedback").addField("Feedback", makeTextInput());

			expect(() => builder.validate()).toThrow(/Modal must have a custom_id/);
		});

		it("throws when title is missing", () => {
			const builder = new ModalBuilder().setCustomId("feedback-modal").addField("Feedback", makeTextInput());

			expect(() => builder.validate()).toThrow(/Modal must have a title/);
		});

		it("throws when there are no components", () => {
			const builder = new ModalBuilder().setCustomId("feedback-modal").setTitle("Feedback");

			expect(() => builder.validate()).toThrow(/Modal must have at least 1 component/);
		});

		it("throws when there are more than 5 components", () => {
			const builder = new ModalBuilder().setCustomId("feedback-modal").setTitle("Feedback");
			for (let index = 0; index < 6; index++) builder.addField(`Field ${index}`, makeTextInput(`field-${index}`));

			expect(() => builder.validate()).toThrow(/Modal cannot have more than 5 components/);
		});

		it("cascades validation into each field", () => {
			const builder = new ModalBuilder()
				.setCustomId("feedback-modal")
				.setTitle("Feedback")
				.addField("Feedback", new TextInputBuilder().setCustomID("feedback"));

			expect(() => builder.validate()).toThrow(/Text input must have a style/);
		});

		it("static validate matches instance validate behavior", () => {
			const payload: InteractionCallbackModal = {
				custom_id: "feedback-modal",
				title: "Feedback",
				components: [
					{
						type: ComponentTypes.LABEL,
						label: "Feedback",
						component: { type: ComponentTypes.TEXT_INPUT, custom_id: "feedback", style: TextInputStyles.SHORT }
					}
				]
			};

			expect(() => ModalBuilder.validate(payload)).not.toThrow();
		});

		it("static validate throws when a top-level component is an action row", () => {
			const payload: InteractionCallbackModal = {
				custom_id: "feedback-modal",
				title: "Feedback",
				components: [{ type: ComponentTypes.ACTION_ROW, components: [] }]
			};

			expect(() => ModalBuilder.validate(payload)).toThrow(/ModalBuilder only supports Label-wrapped fields, not action rows/);
		});
	});
});