import { ComponentTypes, TextDisplay } from "../Types/Components.js";
import { ComponentBuilder, validateComponentId } from "./ComponentBuilder.js";

/** Runtime checks shared by `TextDisplayBuilder#validate` and the static `TextDisplayBuilder.validate` */
function validateTextDisplayShape(display: { content?: string | undefined; id?: number | undefined }): void {
	if (!display.content || display.content.length === 0) throw new Error("Text display must have content");
	validateComponentId(display);
}

/**
 * Fluent builder for a Components V2 text display - markdown text rendered similarly to message
 * content, respecting the message's `allowed_mentions`. The builder *is* a {@link TextDisplay}
 * payload, so it can be sent as-is.
 *
 * Discord caps text across a message's components at 4,000 characters in total rather than
 * per-component, so only emptiness is validated here.
 */
export class TextDisplayBuilder extends ComponentBuilder<typeof ComponentTypes.TEXT_DISPLAY> implements TextDisplay {
	/**
	 * Creates a builder from an existing text display payload
	 */
	static from(value: TextDisplay): TextDisplayBuilder {
		const display = new TextDisplayBuilder();

		display.setContent(value.content);
		if (value.id !== undefined) display.setId(value.id);

		return display;
	}

	/**
	 * Validates a text display payload against Discord's constraints
	 */
	static validate(display: TextDisplay): void {
		validateTextDisplayShape(display);
	}

	readonly type = ComponentTypes.TEXT_DISPLAY;
	/** Text to display, supports markdown, mentions, and emoji - only populated once set, see {@link TextDisplayBuilder#validate} */
	content!: string;

	/**
	 * Sets the text to display
	 */
	setContent(content: string): this {
		if (content.length === 0) throw new Error("Text display content must be at least 1 character long");
		this.content = content;
		return this;
	}

	/**
	 * Validates this builder's current state against Discord's constraints
	 */
	validate(): void {
		validateTextDisplayShape(this);
	}
}
