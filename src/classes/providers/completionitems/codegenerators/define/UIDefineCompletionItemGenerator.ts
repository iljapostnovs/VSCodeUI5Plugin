import { SAPNode } from "ui5plugin-parser/dist/classes/librarydata/SAPNode";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { TextDocumentTransformer } from "ui5plugin-parser/dist/classes/utils/TextDocumentTransformer";
import * as vscode from "vscode";
import { UI5Plugin } from "../../../../../UI5Plugin";
import { TextDocumentAdapter } from "../../../../adapters/vscode/TextDocumentAdapter";

export class UIDefineCompletionItemGenerator {

	public generateDefineString(node: SAPNode) {
		let defineString = "";

		if (node.node.visibility === "public" && (node.getKind() === "class" || node.getKind() === "enum" || node.getKind() === "namespace")) {
			defineString = `"${node.getName().replace(/\./g, "/")}"`;
		}

		return defineString;
	}

	public static getIfCurrentPositionIsInDefine(document: vscode.TextDocument, position: vscode.Position, tryToSetNewContentIfPositionIsNearUIDefine = true): boolean {
		let isCurrentPositionInUIDefine = false;
		const currentPositionOffset = document.offsetAt(position);
		const UIClass = TextDocumentTransformer.toCustomUIClass(new TextDocumentAdapter(document));
		if (UIClass instanceof CustomUIClass && currentPositionOffset) {
			const args = UIClass.fileContent?.body[0]?.expression?.arguments;
			if (args && args.length === 2) {
				const UIDefinePaths: any = args[0];

				isCurrentPositionInUIDefine = currentPositionOffset > UIDefinePaths.start && currentPositionOffset <= UIDefinePaths.end;

				if (tryToSetNewContentIfPositionIsNearUIDefine && !isCurrentPositionInUIDefine) {
					const isCurrentPositionNearEndOfTheUIDefine = currentPositionOffset > UIDefinePaths.start && Math.abs(currentPositionOffset - UIDefinePaths.end) < 10;
					if (isCurrentPositionNearEndOfTheUIDefine) {
						UI5Plugin.getInstance().parser.classFactory.setNewCodeForClass(UIClass.className, document.getText());
						isCurrentPositionInUIDefine = this.getIfCurrentPositionIsInDefine(document, position, false);
					}
				}
			}
		}

		return isCurrentPositionInUIDefine;
	}
}