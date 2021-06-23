import * as vscode from "vscode";
import { IError, Linter } from "./parts/abstraction/Linter";
import { UnusedTranslationsLinter } from "./parts/UnusedTranslationsLinter";

export class PropertiesLinter {
	static async getLintingErrors(document: vscode.TextDocument) {
		const linters: Linter[] = [
			new UnusedTranslationsLinter()
		];

		let errors: IError[] = [];
		try {
			for (const linter of linters) {
				errors = errors.concat(await linter.getErrors(document));
			}
		} catch (error) {
			console.error(error);
		}

		// copy(JSON.stringify(errors.map(error => ({text: error.message}))))
		return errors;
	}
}