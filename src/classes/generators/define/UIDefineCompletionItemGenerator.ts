import { SAPNode } from "../../SAPNode";
import * as vscode from "vscode";
import { UI5Metadata } from "../../UI5Metadata";

export class DefineGenerator {

	public async generateDefineString(node: SAPNode) {
		let defineString: string = "";

		if (node.getKind() === "class" || node.getKind() === "enum") {
			let metadata: UI5Metadata = await node.getMetadata();
			defineString = "\"" + metadata.rawMetadata.module + "\"";
		}

		return defineString;
	}

	public static getIfCurrentPositionIsInDefine(position: vscode.Position) {
		let editor = vscode.window.activeTextEditor;
		let isCurrentPositionInUIDefine = false;

		if (editor) {
			let document = editor.document;
			let documentText: string = document.getText();
			let regexResult = /sap\.ui\.define\(\[(.|\n|\r)*\],.?function.?\(/.exec(documentText);
			if (regexResult) {
				let indexDefineEnd = regexResult[0].length;
				let positionDefineEnd = document.positionAt(indexDefineEnd);
				if (positionDefineEnd.isAfter(position)) {
					isCurrentPositionInUIDefine = true;
				}
			}
		}

		return isCurrentPositionInUIDefine;
	}
}