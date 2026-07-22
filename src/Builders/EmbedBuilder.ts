import {
	Embed,
	EmbedAuthor,
	EmbedField,
	EmbedFooter,
	EmbedImage,
	EmbedProvider,
	EmbedTypes,
	EmbedVideo
} from "../Types/MessageComponents.js";
import { ObjectValues } from "../Types/HelperTypes.js";

function AssertMaxLength(fieldName: string, value: string, maxLength: number): void {
	if (value.length > maxLength) throw new Error(`${fieldName} must be ${maxLength} characters or fewer - Received ${value.length} characters`);
}

function AssertFieldLimits(fields: EmbedField[]): void {
	for (const field of fields) {
		AssertMaxLength("Field name", field.name, 256);
		AssertMaxLength("Field value", field.value, 1024);
	}
}

export class EmbedBuilder {
	/**
	 * Creates a builder from an existing embed payload
	 */
	static from(value: Embed): EmbedBuilder {
		const embed = new EmbedBuilder();

		if (value.title) embed.setTitle(value.title);
		if (value.description) embed.setDescription(value.description);
		if (value.url) embed.setUrl(value.url);
		if (value.timestamp) embed.setTimestamp(new Date(value.timestamp));
		if (value.color) embed.setColor(value.color);
		if (value.footer) embed.setFooter(value.footer);
		if (value.image) embed.setImage(value.image);
		if (value.thumbnail) embed.setThumbnail(value.thumbnail);
		if (value.video) embed.setVideo(value.video);
		if (value.provider) embed.setProvider(value.provider);
		if (value.author) embed.setAuthor(value.author);
		if (value.fields) embed.setFields(value.fields);

		return embed;
	}

	/**
	 * Validates embed content limits against Discord constraints
	 */
	static validate(embed: Embed): void {
		const hasContent: boolean =
			(embed.title      ?.length || 0) > 0 ||
			(embed.description?.length || 0) > 0 ||
			(embed.fields     ?.length || 0) > 0 ||
			(embed.footer?.text.length || 0) > 0 ||
			(embed.author?.name.length || 0) > 0;

		if (!hasContent) throw new Error("Embed cannot be empty");

		const characterCount =
			(embed.title?.length || 0) +
			(embed.description?.length || 0) +
			(embed.fields?.reduce((acc, field) => acc + (field.name.length + field.value.length), 0) || 0) +
			(embed.footer?.text.length || 0) +
			(embed.author?.name.length || 0);

		if (characterCount > 6000) {
			throw new Error(`Embed content exceeds the maximum allowed character count of 6000. Current count: ${characterCount}`);
		}
	}

	/** The embed type, defaults to rich */
	type: ObjectValues<typeof EmbedTypes>;
	/** Main embed title */
	title?: string;
	/** Main embed description */
	description?: string;
	/** URL attached to the embed title */
	url?: string;
	/** ISO timestamp string */
	timestamp?: string;
	/** Decimal color value, use hex for convenience: 0xff7900 */
	color?: number;
	/** Footer block */
	footer?: EmbedFooter;
	/** Main image block */
	image?: EmbedImage;
	/** Thumbnail image block */
	thumbnail?: EmbedImage;
	/** Video block, usually set by Discord */
	video?: EmbedVideo;
	/** Provider block, usually set by Discord */
	provider?: EmbedProvider;
	/** Author block */
	author?: EmbedAuthor;
	/** Field list */
	fields?: EmbedField[];

	constructor() {
		this.type = EmbedTypes.RICH;
	}

	/**
	 * Sets the embed title
	 */
	setTitle(value: string): this {
		AssertMaxLength("Title", value, 256);
		this.title = value;
		return this;
	}

	/**
	 * Sets the embed description
	 */
	setDescription(value: string): this {
		if (value.length === 0 || value.length > 4096) {
			throw new Error(`Description must be between 1 and 4,096 characters long - Recieved ${value.length} characters`);
		}
		this.description = value;
		return this;
	}

	/**
	 * Sets the embed URL
	 */
	setUrl(value: string): this {
		this.url = value;
		return this;
	}

	/**
	 * Sets the embed timestamp from a Date
	 */
	setTimestamp(value: Date): this {
		this.timestamp = value.toISOString();
		return this;
	}

	/**
	 * Sets the embed footer
	 */
	setFooter(value: EmbedFooter): this {
		AssertMaxLength("Footer text", value.text, 2048);
		this.footer = value;
		return this;
	}

	/**
	 * Sets the embed image
	 */
	setImage(value: EmbedImage): this {
		this.image = value;
		return this;
	}

	/**
	 * Sets the embed thumbnail
	 */
	setThumbnail(value: EmbedImage): this {
		this.thumbnail = value;
		return this;
	}

	/**
	 * Sets the embed video metadata
	 */
	setVideo(value: EmbedVideo): this {
		this.video = value;
		return this;
	}

	/**
	 * Sets the embed provider metadata
	 */
	setProvider(value: EmbedProvider): this {
		this.provider = value;
		return this;
	}

	/**
	 * Sets the embed author
	 */
	setAuthor(value: EmbedAuthor): this {
		AssertMaxLength("Author name", value.name, 256);
		this.author = value;
		return this;
	}

	/**
	 * Sets the embed color from a number or `#RRGGBB` string
	 */
	setColor(value: number | string): this {
		if (typeof value === "number") {
			this.color = value;
		} else if (typeof value === "string") {
			// hex color code
			const hexRegex = /^#[0-9a-fA-F]{6}$/;
			if (!hexRegex.test(value)) throw new Error("Must be a hex color code (#123456)");

			this.color = parseInt(value.slice(1), 16);
		} else {
			throw new Error('Supported color formats are hex numbers (0x123456) and hex codes ("#123456")');
		}
		return this;
	}

	/**
	 * Appends fields to the existing field list
	 */
	addFields(fields: EmbedField[]): this {
		this.fields ??= [];
		if (this.fields.length + fields.length > 25) {
			throw new Error("Embeds cannot have more than 25 fields");
		}
		AssertFieldLimits(fields);
		this.fields.push(...fields);
		return this;
	}

	/**
	 * Replaces the embed field list
	 */
	setFields(fields: EmbedField[]): this {
		if (fields.length > 25) {
			throw new Error("Embeds cannot have more than 25 fields");
		}
		AssertFieldLimits(fields);
		this.fields = fields;
		return this;
	}
}