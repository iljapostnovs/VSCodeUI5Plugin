import * as vscode from "vscode";
import { ReusableMethods } from "../../reuse/ReusableMethods";
import { CodeGeneratorFactory } from "../../../templateinserters/codegenerationstrategies/CodeGeneratorFactory";
import { PositionAdapter } from "../../../adapters/vscode/PositionAdapter";
import { UI5Plugin } from "../../../../UI5Plugin";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { AbstractCustomClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractCustomClass";
import { CustomTSClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomTSClass";

export enum InsertType {
	Method = "Method",
	Field = "Field"
}
export class MethodInserter {
	static createInsertMethodCodeAction(
		className: string,
		memberName: string,
		params: string,
		body: string,
		type: InsertType,
		eventName = "Event",
		eventModule = "sap/ui/base/Event",
		eventType = eventName,
		tabsToAdd = "\t\t"
	) {
		let insertMethodCodeAction: vscode.CodeAction | undefined;
		let insertImport: string | undefined;
		let insertImportOffset: number | undefined;
		const classPath = UI5Plugin.getInstance().parser.fileReader.getClassFSPathFromClassName(className);
		if (!classPath) {
			return;
		}

		const classUri = vscode.Uri.file(classPath);
		const UIClass = <AbstractCustomClass>UI5Plugin.getInstance().parser.classFactory.getUIClass(className);
		let insertContent = "";
		if (type === InsertType.Method) {
			if (UIClass instanceof CustomUIClass) {
				insertContent = CodeGeneratorFactory.createStrategy().generateFunction(
					memberName,
					params,
					body,
					tabsToAdd
				);
			} else if (UIClass instanceof CustomTSClass) {
				//event handler insertion only
				insertContent = CodeGeneratorFactory.createTSStrategy().generateFunction(
					memberName,
					`${params}: ${eventType}`,
					body,
					"\t"
				);

				const importDeclarations = UIClass.node.getSourceFile().getImportDeclarations();
				const baseEventImportDeclaration = importDeclarations.find(
					importDeclaration => importDeclaration.getModuleSpecifier().getLiteralText() === eventModule
				);
				if (!baseEventImportDeclaration) {
					// eslint-disable-next-line @typescript-eslint/quotes
					insertImport = `\nimport ${eventName} from "${eventModule}";`;
					insertImportOffset = importDeclarations[importDeclarations.length - 1].getEnd() ?? 0;
				}
			}
		} else {
			insertContent = `${memberName}: ${this._getInsertContentFromIdentifierName(memberName)}`;
		}

		const { offset, insertText } = this._getInsertTextAndOffset(insertContent, className);
		const position = PositionAdapter.offsetToPosition(UIClass.classText, offset);

		if (position) {
			insertMethodCodeAction = new vscode.CodeAction(
				`Create "${memberName}" in "${className}" class`,
				vscode.CodeActionKind.QuickFix
			);
			insertMethodCodeAction.isPreferred = true;
			insertMethodCodeAction.edit = new vscode.WorkspaceEdit();
			insertMethodCodeAction.edit.insert(classUri, position, insertText);
			if (insertImport && insertImportOffset !== undefined) {
				const position = PositionAdapter.offsetToPosition(UIClass.classText, insertImportOffset);
				if (position) {
					insertMethodCodeAction.edit.insert(classUri, position, insertImport);
				}
			}
			insertMethodCodeAction.command = {
				command: "vscode.open",
				title: "Open file",
				arguments: [
					classUri,
					{
						selection: new vscode.Range(position.line + 3, 3, position.line + 3, 3)
					}
				]
			};
		}

		return insertMethodCodeAction;
	}

	private static _getInsertContentFromIdentifierName(name: string) {
		let content = "";

		const type = CustomUIClass.getTypeFromHungarianNotation(name)?.toLowerCase();
		switch (type) {
			case "object":
				content = "{}";
				break;
			case "array":
				content = "[]";
				break;
			case "int":
				content = "0";
				break;
			case "float":
				content = "0";
				break;
			case "number":
				content = "0";
				break;
			case "map":
				content = "{}";
				break;
			case "string":
				// eslint-disable-next-line @typescript-eslint/quotes
				content = '""';
				break;
			case "boolean":
				content = "true";
				break;
			case "any":
				content = "null";
				break;
			default:
				content = "null";
		}

		return content;
	}

	private static _getInsertTextAndOffset(insertContent: string, className: string) {
		const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(className);
		let offset = 0;
		const classIsCurrentlyOpened = this._checkIfClassIsCurrentlyOpened(className);

		let insertText = insertContent;
		if (UIClass instanceof CustomUIClass) {
			insertText = `\n\t\t${insertText}`;
			const thereAreNoMethods = UIClass.acornClassBody.properties.length === 0;
			if (classIsCurrentlyOpened && vscode.window.activeTextEditor) {
				const currentSelection = vscode.window.activeTextEditor.selection.start;
				const currentPosition = vscode.window.activeTextEditor.document.offsetAt(currentSelection);
				if (currentPosition) {
					const currentMethod = UIClass.methods.find(
						method => method.node?.start < currentPosition && method.node?.end > currentPosition
					);
					if (currentMethod) {
						offset = currentMethod.node.end;
						const currentMethodIsLastMethod = ReusableMethods.getIfMethodIsLastOne(UIClass, currentMethod);

						if (!thereAreNoMethods) {
							insertText = `\n${insertText}`;
						}

						if (!currentMethodIsLastMethod) {
							insertText += ",";
							offset++;
						} else {
							insertText = `,${insertText}`;
						}
					}
				}
			} else {
				const lastMethod = UIClass.acornClassBody.properties[UIClass.acornClassBody.properties.length - 1];
				if (lastMethod || thereAreNoMethods) {
					offset = lastMethod?.end || UIClass.acornClassBody.start + 1;
				}

				if (!thereAreNoMethods) {
					insertText = `,\n${insertText}`;
				}
			}
		} else if (UIClass instanceof CustomTSClass) {
			insertText = `\n\t${insertText}`;
			const members = UIClass.node.getMembers();
			const lastMember = members[members.length - 1];
			if (lastMember) {
				offset = lastMember.getEnd() ?? 0;
			} else {
				insertText = `${insertText}\n`;
				offset = UIClass.node.getEnd() - 1;
			}
		}

		return { insertText, offset };
	}

	private static _checkIfClassIsCurrentlyOpened(className: string) {
		let classIsCurrentlyOpened = false;

		const currentDocument = vscode.window.activeTextEditor?.document;
		if (currentDocument && (currentDocument.fileName.endsWith(".js") || currentDocument.fileName.endsWith(".ts"))) {
			const currentClassName = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(
				currentDocument.fileName
			);
			if (currentClassName) {
				classIsCurrentlyOpened = className === currentClassName;
			}
		}

		return classIsCurrentlyOpened;
	}
}
