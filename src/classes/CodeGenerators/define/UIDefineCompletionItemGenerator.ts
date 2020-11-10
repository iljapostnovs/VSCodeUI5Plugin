import { SAPNode } from "../../StandardLibMetadata/SAPNode";
import * as vscode from "vscode";
import { SyntaxAnalyzer } from "../../CustomLibMetadata/SyntaxAnalyzer";
import { UIClassFactory } from "../../CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";
import { CustomUIClass } from "../../CustomLibMetadata/UI5Parser/UIClass/CustomUIClass";

export class DefineGenerator {

	public generateDefineString(node: SAPNode) {
		let defineString: string = "";

		if (node.node.visibility === "public" && (node.getKind() === "class" || node.getKind() === "enum" || node.getKind() === "namespace")) {
			defineString = `"${node.getName().replace(/\./g, "/")}"`;
		}

		return defineString;
	}

	public static getIfCurrentPositionIsInDefine() {
		let isCurrentPositionInUIDefine = false;
		const textEditor = vscode.window.activeTextEditor;
		const document = textEditor?.document;
		if (textEditor) {
			const currentPositionOffset = document?.offsetAt(textEditor.selection.start);
			const currentClass = SyntaxAnalyzer.getClassNameOfTheCurrentDocument();
			const UIClass = currentClass && UIClassFactory.getUIClass(currentClass);

			if (UIClass instanceof CustomUIClass&& currentPositionOffset) {
				const args = UIClass.fileContent?.body[0]?.expression?.arguments;
				if (args && args.length === 2) {
					const UIDefinePaths: any = args[0];

					isCurrentPositionInUIDefine = currentPositionOffset > UIDefinePaths.start && currentPositionOffset <= UIDefinePaths.end;
				}
			}
		}

		return isCurrentPositionInUIDefine;
	}
}