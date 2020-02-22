import { SAPNode } from "../../StandardLibMetadata/SAPNode";
import * as vscode from "vscode";
import { UI5Metadata } from "../../StandardLibMetadata/UI5Metadata";

export class DefineGenerator {

	public async generateDefineString(node: SAPNode) {
		let defineString: string = "";

		if (node.node.visibility === "public" && (node.getKind() === "class" || node.getKind() === "enum")) {
			const metadata: UI5Metadata = node.getMetadata();
			defineString = "\"" + metadata.rawMetadata.module + "\"";
		}

		return defineString;
	}

	public static getIfCurrentPositionIsInDefine(position: vscode.Position) {
		const editor = vscode.window.activeTextEditor;
		let isCurrentPositionInUIDefine = false;

		if (editor) {
			const document = editor.document;
			const documentText: string = document.getText();
			const regexResult = /sap\.ui\.define\(\[(.|\n|\r)*\],.?function.?\(/.exec(documentText);
			if (regexResult) {
				const indexDefineEnd = regexResult[0].length;
				const positionDefineEnd = document.positionAt(indexDefineEnd);
				if (positionDefineEnd.isAfter(position)) {
					isCurrentPositionInUIDefine = true;
				}
			}
		}

		return isCurrentPositionInUIDefine;
	}
}