import { SAPNode } from "ui5plugin-parser/dist/classes/librarydata/SAPNode";
import { CustomJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import * as vscode from "vscode";
import { TextDocumentAdapter } from "../../../../adapters/vscode/TextDocumentAdapter";
import ParserBearer from "../../../../ui5parser/ParserBearer";

export class UIDefineCompletionItemGenerator extends ParserBearer {
	public generateDefineString(node: SAPNode) {
		let defineString = "";

		if (
			node.node.visibility === "public" &&
			(node.getKind() === "class" || node.getKind() === "enum" || node.getKind() === "namespace")
		) {
			defineString = `"${node.getName().replace(/\./g, "/")}"`;
		}

		return defineString;
	}

	public getIfCurrentPositionIsInDefine(
		document: vscode.TextDocument,
		position: vscode.Position,
		tryToSetNewContentIfPositionIsNearUIDefine = true
	): boolean {
		let isCurrentPositionInUIDefine = false;
		const currentPositionOffset = document.offsetAt(position);
		const UIClass = this._parser.textDocumentTransformer.toCustomUIClass(new TextDocumentAdapter(document));
		if (UIClass instanceof CustomJSClass && currentPositionOffset) {
			const args = UIClass.fileContent?.body[0]?.expression?.arguments;
			if (args && args.length === 2) {
				const UIDefinePaths: any = args[0];

				isCurrentPositionInUIDefine =
					currentPositionOffset > UIDefinePaths.start && currentPositionOffset <= UIDefinePaths.end;

				if (tryToSetNewContentIfPositionIsNearUIDefine && !isCurrentPositionInUIDefine) {
					const isCurrentPositionNearEndOfTheUIDefine =
						currentPositionOffset > UIDefinePaths.start &&
						Math.abs(currentPositionOffset - UIDefinePaths.end) < 10;
					if (isCurrentPositionNearEndOfTheUIDefine) {
						this._parser.classFactory.setNewCodeForClass(UIClass.className, document.getText());
						isCurrentPositionInUIDefine = this.getIfCurrentPositionIsInDefine(document, position, false);
					}
				}
			}
		}

		return isCurrentPositionInUIDefine;
	}
}
