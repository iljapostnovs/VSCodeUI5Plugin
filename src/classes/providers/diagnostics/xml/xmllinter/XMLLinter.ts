import { Linter } from "./parts/abstraction/Linter";
import { TagAttributeLinter } from "./parts/TagAttributeLinter";
import { UnusedNamespaceLinter } from "./parts/UnusedNamespaceLinter";
import { Error } from "./parts/abstraction/Linter";
import * as vscode from "vscode";

export class XMLLinter {
	static getLintingErrors(document: vscode.TextDocument): Error[] {
		const linters: Linter[] = [
			new TagAttributeLinter(),
			new UnusedNamespaceLinter()
		];

		let errors: Error[] = [];
		linters.forEach(linter => {
			errors = errors.concat(linter.getErrors(document));
		});

		return errors;
	}
}