import { Linter } from "./parts/abstraction/Linter";
import { Error } from "./parts/abstraction/Linter";
import { WrongFieldMethodLinter } from "./parts/WrongFieldMethodLinter";
import * as vscode from "vscode";
import { WrongClassNameLinter } from "./parts/WrongClassNameLinter";
import { WrongImportLinter } from "./parts/WrongImportLinter";
import { WrongParametersLinter } from "./parts/WrongParametersLinter";
import { UnusedMemberLinter } from "./parts/UnusedMemberLinter";
import { WrongFilePathLinter } from "./parts/WrongFilePathLinter";
import { PublicMemberLinter } from "./parts/PublicMemberLinter";
import { WrongOverrideLinter } from "./parts/WrongOverrideLinter";

export class JSLinter {
	static timePerchar = 0;
	static getLintingErrors(document: vscode.TextDocument): Error[] {
		const linters: Linter[] = [
			new WrongFieldMethodLinter(),
			new WrongClassNameLinter(),
			new WrongImportLinter(),
			new WrongParametersLinter(),
			new UnusedMemberLinter(),
			new WrongFilePathLinter(),
			new PublicMemberLinter(),
			new WrongOverrideLinter()
		];

		let errors: Error[] = [];
		try {
			linters.forEach(linter => {
				errors = errors.concat(linter.getErrors(document));
			});
		} catch (error) {
			console.error(error);
		}

		// copy(JSON.stringify(errors.map(error => ({text: error.message}))))
		return errors;
	}
}