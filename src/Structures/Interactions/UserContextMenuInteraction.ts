import { BaseCommandInteraction } from "./BaseCommandInteraction.js";
import { User } from "../User.js";
import { ApplicationCommandInteraction } from "../../Types/Interactions.js";

/** A user context menu command, invoked by right-clicking/long-pressing a user. */
export class UserContextMenuInteraction extends BaseCommandInteraction {
	// `declare`d - see the comment on `BaseCommandInteraction`'s fields for why.
	/** Id of the targeted user */
	declare targetId: string
	/** The targeted user */
	declare targetUser: User

	patch(data: ApplicationCommandInteraction): void {
		super.patch(data);

		if (data.data.target_id !== undefined) this.targetId = data.data.target_id;

		const resolvedUser = this.targetId !== undefined
			? data.data.resolved?.users?.[this.targetId]
			: undefined;
		if (resolvedUser !== undefined) this.targetUser = this.client.users.upsert(resolvedUser);
	}
}