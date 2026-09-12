import { Container, ContainerChild, ComponentTypes } from "../Types/Components.js";
import { ResolveColor } from "../Utils.js";
import { ActionRowBuilder } from "./ActionRowBuilder.js";
import { ComponentBuilder, validateComponentId } from "./ComponentBuilder.js";
import { FileBuilder } from "./FileBuilder.js";
import { MediaGalleryBuilder } from "./MediaGalleryBuilder.js";
import { SectionBuilder } from "./SectionBuilder.js";
import { SeparatorBuilder } from "./SeparatorBuilder.js";
import { TextDisplayBuilder } from "./TextDisplayBuilder.js";

/** The component types a container accepts as children, used to reject the rest at runtime */
const childTypes: readonly number[] = [
	ComponentTypes.ACTION_ROW,
	ComponentTypes.TEXT_DISPLAY,
	ComponentTypes.SECTION,
	ComponentTypes.MEDIA_GALLERY,
	ComponentTypes.FILE,
	ComponentTypes.SEPARATOR
];

/** Builds the appropriate builder for a raw {@link Container} child, based on its type */
function buildContainerChild(component: ContainerChild): ContainerChild {
	switch (component.type) {
		case ComponentTypes.ACTION_ROW: return ActionRowBuilder.from(component);
		case ComponentTypes.TEXT_DISPLAY: return TextDisplayBuilder.from(component);
		case ComponentTypes.SECTION: return SectionBuilder.from(component);
		case ComponentTypes.MEDIA_GALLERY: return MediaGalleryBuilder.from(component);
		case ComponentTypes.FILE: return FileBuilder.from(component);
		case ComponentTypes.SEPARATOR: return SeparatorBuilder.from(component);
	}
}

/**
 * Rejects a child a container cannot hold, by type alone.
 *
 * Kept separate from {@link validateContainerChild} so the setters can catch the structural mistake
 * immediately without demanding a child be *finished* - a half-built section can still be added and
 * filled in afterwards, as with every other collection builder.
 */
function assertContainerChildType(component: ContainerChild): void {
	// widened because `ContainerChild` already excludes the types this rejects, so the compiler
	// considers them unreachable - untyped JavaScript callers can still get here with one
	const type = (component as { type?: number } | undefined)?.type;

	if (type !== undefined && childTypes.includes(type)) return;

	if (type === ComponentTypes.CONTAINER) throw new Error("Container cannot contain another container");

	throw new Error(`Container cannot contain component type ${type}`);
}

/** Validates a raw {@link Container} child using the appropriate builder's static `validate` */
function validateContainerChild(component: ContainerChild): void {
	assertContainerChildType(component);

	switch (component.type) {
		case ComponentTypes.ACTION_ROW: return ActionRowBuilder.validate(component);
		case ComponentTypes.TEXT_DISPLAY: return TextDisplayBuilder.validate(component);
		case ComponentTypes.SECTION: return SectionBuilder.validate(component);
		case ComponentTypes.MEDIA_GALLERY: return MediaGalleryBuilder.validate(component);
		case ComponentTypes.FILE: return FileBuilder.validate(component);
		case ComponentTypes.SEPARATOR: return SeparatorBuilder.validate(component);
	}
}

/** Runtime checks shared by `ContainerBuilder#validate` and the static `ContainerBuilder.validate` */
function validateContainerShape(container: { components?: ContainerChild[] | undefined; id?: number | undefined }): void {
	const components = container.components ?? [];

	if (components.length === 0) throw new Error("Container must have at least 1 component");

	for (const component of components) validateContainerChild(component);

	validateComponentId(container);
}

/**
 * Fluent builder for a Components V2 container - visually groups its children inside a rounded
 * rectangle with an optional accent color, much like an embed. The builder *is* a {@link Container}
 * payload, and so is every component builder it holds, so builders and plain objects can be mixed
 * freely - and `components` is a plain array you can read, `push` to, or splice like any other.
 *
 * A container is the only nesting component, and it cannot nest another container:
 *
 * ```ts
 * new ContainerBuilder()
 *     .setAccentColor("#ff7900")
 *     .addComponents(
 *         new TextDisplayBuilder().setContent("**Heads up**"),
 *         new SeparatorBuilder().setDivider()
 *     );
 * ```
 */
export class ContainerBuilder extends ComponentBuilder<typeof ComponentTypes.CONTAINER> implements Container {
	/**
	 * Creates a builder from an existing container payload, inferring the right builder for each child
	 */
	static from(value: Container): ContainerBuilder {
		const container = new ContainerBuilder();

		container.setComponents(value.components.map(component => buildContainerChild(component)));
		if (value.accent_color !== undefined) container.setAccentColor(value.accent_color);
		if (value.spoiler !== undefined) container.setSpoiler(value.spoiler);
		if (value.id !== undefined) container.setId(value.id);

		return container;
	}

	/**
	 * Validates a container payload against Discord's constraints
	 */
	static validate(container: Container): void {
		validateContainerShape(container);
	}

	readonly type = ComponentTypes.CONTAINER;
	/** The container's children - anything but another container */
	components: ContainerChild[] = [];
	/** Accent color shown down the container's edge, or `null` to clear it */
	accent_color?: number | null;
	/** Whether the container is blurred until clicked, defaults to false */
	spoiler?: boolean;

	/**
	 * Appends components to the container
	 */
	addComponents(...components: ContainerChild[]): this {
		for (const component of components) assertContainerChildType(component);
		this.components.push(...components);
		return this;
	}

	/**
	 * Replaces the container's components
	 */
	setComponents(components: ContainerChild[]): this {
		for (const component of components) assertContainerChildType(component);
		this.components = components;
		return this;
	}

	/**
	 * Sets the accent color from a number or `#RRGGBB` string, or `null` to clear it
	 */
	setAccentColor(value: number | string | null): this {
		this.accent_color = value === null ? null : ResolveColor(value);
		return this;
	}

	/**
	 * Sets whether the container is blurred until clicked
	 */
	setSpoiler(spoiler = true): this {
		this.spoiler = spoiler;
		return this;
	}

	/**
	 * Validates this builder's current state against Discord's constraints
	 */
	validate(): void {
		validateContainerShape(this);
	}
}
