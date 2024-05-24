import { TextDocument } from "vscode";

export default class EventBus {
	private static readonly _subscriptions: Record<string, ((document: TextDocument) => void)[]> = {
		CodeUpdated: []
	};
	static subscribeCodeUpdated(handler: (document: TextDocument) => void) {
		this._subscriptions.CodeUpdated.push(handler);
	}

	static fireCodeUpdated(document: TextDocument) {
		this._subscriptions.CodeUpdated.forEach(handler => handler(document));
	}
}
