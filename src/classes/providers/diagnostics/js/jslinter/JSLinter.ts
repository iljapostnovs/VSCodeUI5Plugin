import { Linter } from "./parts/abstraction/Linter";
import { IError } from "./parts/abstraction/Linter";
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
	static async getLintingErrors(document: vscode.TextDocument) {
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