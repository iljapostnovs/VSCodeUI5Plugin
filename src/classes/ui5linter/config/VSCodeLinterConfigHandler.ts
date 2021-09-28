import { ILinterConfigHandler, Severity } from "ui5plugin-linter";
import { JSLinterException } from "ui5plugin-linter/dist/classes/js/parts/config/ILinterConfigHandler";
import { JSLinters, XMLLinters, PropertiesLinters } from "ui5plugin-linter/dist/classes/Linter";
import { TextDocument } from "ui5plugin-parser";

export class VSCodeLinterConfigHandler implements ILinterConfigHandler {
	getJSLinterExceptions(): JSLinterException[] {
		throw new Error("Method not implemented.");
	}
	getSeverity(linter: JSLinters | XMLLinters | PropertiesLinters): Severity {
		return Severity.Error;
	}
	checkIfMemberIsException(className: string, memberName: string): boolean {
		return false;
	}
	getLinterUsage(linter: JSLinters | XMLLinters | PropertiesLinters): boolean {
		return true;
	}
	getIfLintingShouldBeSkipped(document: TextDocument): boolean {
		return false;
	}

}