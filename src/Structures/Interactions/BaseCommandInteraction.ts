import { BaseInteraction } from "./BaseInteraction.js";
import { Repliable } from "../../Mixins/Interactions/Repliable.js";
import { ModalShowable } from "../../Mixins/Interactions/ModalShowable.js";
import { ApplicationCommandInteraction } from "../../Types/Interactions.js";
import { ApplicationCommandType } from "../../Types/ApplicationCommand.js";

/**
 * Shared base for every `APPLICATION_COMMAND` interaction kind (chat input, user context menu,
 * message context menu). Not instantiated directly - use `SlashCommandInteraction`,
 * `UserContextMenuInteraction`, or `MessageContextMenuInteraction`, chosen by
 * `CreateInteraction` based on the command's `ApplicationCommandType`.
 */
export class BaseCommandInteraction extends ModalShowable(Repliable(BaseInteraction)) {
	// `declare`d (rather than plain class fields) because `patch()` runs as part of the `super()`
	// chain from `BaseInteraction`'s constructor, further up than this class's own field
	// initializers - a real field declaration here would run its (implicit `undefined`)
	// initializer *after* `patch()` already set the value, wiping it out.
	/** Id of the invoked command */
	declare commandId: string
	/** Name of the invoked command */
	declare commandName: string
	/** Type of the invoked command */
	declare commandType: ApplicationCommandType
	/** Id of the guild the command is registered to, when registered as a guild command */
	declare commandGuildId?: string

	// `patch()` runs as part of the `super()` chain from `BaseInteraction`'s constructor, before
	// this class's own private-field brand is installed on `this` - a private `#patchCommandData`
	// helper called from here would throw ("Receiver must be an instance of class
	// BaseCommandInteraction"), so this stays inlined instead.
	patch(data: ApplicationCommandInteraction): void {
		super.patch(data);

		this.commandId = data.data.id;
		this.commandName = data.data.name;
		this.commandType = data.data.type;
		if (data.data.guild_id !== undefined) this.commandGuildId = data.data.guild_id;
	}
}
