import { ComponentTypes, Section, SectionAccessory, TextDisplay } from "../Types/Components.js";
import { ComponentBuilder, validateComponentId } from "./ComponentBuilder.js";
import { ResolveButton, ValidateButton } from "./ResolveButton.js";
import { TextDisplayBuilder } from "./TextDisplayBuilder.js";
import { ThumbnailBuilder } from "./ThumbnailBuilder.js";

const MIN_COMPONENTS = 1;
const MAX_COMPONENTS = 3;

/** Builds the appropriate builder for a raw {@link Section}'s `accessory`, based on its type */
function buildSectionAccessory(accessory: SectionAccessory): SectionAccessory {
	if (accessory.type === ComponentTypes.THUMBNAIL) return ThumbnailBuilder.from(accessory);
	return ResolveButton(accessory);
}

/**
 * Rejects an accessory a section cannot hold, by type alone.
 *
 * Kept separate from {@link validateSectionAccessory} so `setAccessory` can catch the structural
 * mistake immediately without demanding the accessory be *finished* - a half-built thumbnail can
 * still be attached and filled in afterwards.
 */
function assertSectionAccessoryType(accessory: SectionAccessory): void {
	if (accessory?.type === ComponentTypes.THUMBNAIL || accessory?.type === ComponentTypes.BUTTON) return;

	throw new Error(`Section accessory must be a button or thumbnail - Received component type ${(accessory as { type: number })?.type}`);
}

/**
 * Rejects a component a section cannot hold, by type alone.
 *
 * Kept separate from {@link validateSectionShape} so the component setters can catch the structural
 * mistake immediately without demanding the text display be *finished* - an empty text display can
 * still be added and filled in afterwards, as with every other collection builder.
 */
function assertSectionComponentType(component: TextDisplay): void {
	// widened because `TextDisplay` already excludes the types this rejects, so the compiler
	// considers them unreachable - untyped JavaScript callers can still get here with one
	const type = (component as { type?: number } | undefined)?.type;

	if (type === ComponentTypes.TEXT_DISPLAY) return;

	throw new Error(`Section components must all be text displays - Received component type ${type}`);
}

/** Validates a raw {@link Section}'s `accessory` using the appropriate builder's static `validate` */
function validateSectionAccessory(accessory: SectionAccessory): void {
	assertSectionAccessoryType(accessory);

	switch (accessory.type) {
		case ComponentTypes.THUMBNAIL: return ThumbnailBuilder.validate(accessory);
		case ComponentTypes.BUTTON: return ValidateButton(accessory);
	}
}

/** Runtime checks shared by `SectionBuilder#validate` and the static `SectionBuilder.validate` */
function validateSectionShape(section: { components?: TextDisplay[] | undefined; accessory?: SectionAccessory | undefined; id?: number | undefined }): void {
	const components = section.components ?? [];

	if (components.length < MIN_COMPONENTS || components.length > MAX_COMPONENTS) {
		throw new Error(`Section must have between ${MIN_COMPONENTS} and ${MAX_COMPONENTS} text displays - Received ${components.length}`);
	}

	for (const component of components) {
		assertSectionComponentType(component);
		TextDisplayBuilder.validate(component);
	}

	if (!section.accessory) throw new Error("Section must have an accessory");
	validateSectionAccessory(section.accessory);

	validateComponentId(section);
}

/**
 * Fluent builder for a Components V2 section - 1-3 text displays shown alongside a single
 * accessory, either a button or a thumbnail. The builder *is* a {@link Section} payload, and so is
 * every component builder it holds, so builders and plain objects can be mixed freely - and
 * `components` is a plain array you can read, `push` to, or splice like any other:
 *
 * ```ts
 * new SectionBuilder()
 *     .addComponents(new TextDisplayBuilder().setContent("**Patch notes**"))
 *     .setAccessory(new ThumbnailBuilder().setMedia("https://example.com/icon.png"));
 * ```
 *
 * A {@link ThumbnailBuilder} is only valid here, so this is where a thumbnail used anywhere else
 * gets caught - `setAccessory` accepts nothing but a button or a thumbnail.
 */
export class SectionBuilder extends ComponentBuilder<typeof ComponentTypes.SECTION> implements Section {
	/**
	 * Creates a builder from an existing section payload, inferring the right builder for each child
	 */
	static from(value: Section): SectionBuilder {
		const section = new SectionBuilder();

		section.setComponents(value.components.map(component => TextDisplayBuilder.from(component)));
		section.setAccessory(buildSectionAccessory(value.accessory));
		if (value.id !== undefined) section.setId(value.id);

		return section;
	}

	/**
	 * Validates a section payload against Discord's constraints
	 */
	static validate(section: Section): void {
		validateSectionShape(section);
	}

	readonly type = ComponentTypes.SECTION;
	/** 1-3 text displays making up the section's content */
	components: TextDisplay[] = [];
	/** The button or thumbnail shown alongside the content - only populated once set, see {@link SectionBuilder#validate} */
	accessory!: SectionAccessory;

	/**
	 * Appends text displays to the section
	 */
	addComponents(...components: TextDisplay[]): this {
		for (const component of components) assertSectionComponentType(component);
		this.components.push(...components);
		return this;
	}

	/**
	 * Replaces the section's text displays
	 */
	setComponents(components: TextDisplay[]): this {
		for (const component of components) assertSectionComponentType(component);
		this.components = components;
		return this;
	}

	/**
	 * Sets the accessory shown alongside the section's content
	 */
	setAccessory(accessory: SectionAccessory): this {
		assertSectionAccessoryType(accessory);
		this.accessory = accessory;
		return this;
	}

	/**
	 * Validates this builder's current state against Discord's constraints
	 */
	validate(): void {
		validateSectionShape(this);
	}
}
