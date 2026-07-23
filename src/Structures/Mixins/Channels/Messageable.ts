import { BaseChannel } from "../../BaseChannel.js";
import { CreateMessagePayload, Message } from "../../Message.js";
import { MessagePayload } from "../../../Types/Internal.js";
import { DiscordMessage } from "../../../Types/MessageComponents.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = new (...args: any[]) => T;

type MessageableClass<T> = {
	send(content: string | MessagePayload): Promise<Message>;
} & T;

export function Messageable<TBase extends Constructor<BaseChannel>>(
	Base: TBase,
): Constructor<MessageableClass<InstanceType<TBase>>> {
	return class extends Base {
		async send(content: string | MessagePayload): Promise<Message> {
			const payload = CreateMessagePayload(content);
			const response = await this.client.rest.post<DiscordMessage>(`/channels/${this.id}/messages`, payload);
			return new Message(this.client, response);
		}
	} as unknown as Constructor<MessageableClass<InstanceType<TBase>>>;
}