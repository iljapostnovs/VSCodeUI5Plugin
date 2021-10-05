import { Severity } from "ui5plugin-linter";
import { DiagnosticSeverity } from "vscode";

export class VSCodeSeverityAdapter {
	static toVSCodeSeverity(severity: Severity): DiagnosticSeverity {
		let vscodeSeverity: DiagnosticSeverity;

		switch (severity) {
			case Severity.Error:
				vscodeSeverity = DiagnosticSeverity.Error;
				break;
			case Severity.Hint:
				vscodeSeverity = DiagnosticSeverity.Hint;
				break;
			case Severity.Information:
				vscodeSeverity = DiagnosticSeverity.Information;
				break;
			case Severity.Warning:
				vscodeSeverity = DiagnosticSeverity.Warning;
				break;

			default:
				vscodeSeverity = DiagnosticSeverity.Error;
				break;
		}

		return vscodeSeverity;
	}
}