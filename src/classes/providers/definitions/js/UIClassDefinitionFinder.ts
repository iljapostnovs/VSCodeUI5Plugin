import * as vscode from "vscode";
import { UIClassFactory } from "../../../UI5Classes/UIClassFactory";
import { CustomUIClass } from "../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { FileReader } from "../../../utils/FileReader";
import { StandardUIClass } from "../../../UI5Classes/UI5Parser/UIClass/StandardUIClass";
import { URLBuilder } from "../../../utils/URLBuilder";
import LineColumn = require("line-column");
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../../../UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { TextDocumentTransformer } from "../../../utils/TextDocumentTransformer";
import { AcornSyntaxAnalyzer } from "../../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
export class UIClassDefinitionFinder {
	public static getPositionAndUriOfCurrentVariableDefinition(document: vscode.TextDocument, position: vscode.Position, openInBrowserIfStandardMethod = false) {
		let location: vscode.Location | vscode.LocationLink[] | undefined;
		const methodName = document.getText(document.getWordRangeAtPosition(position));
		const className = FileReader.getClassNameFromPath(document.fileName);
		const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
		const classNameAtCurrentPosition = className && strategy.getClassNameOfTheVariableAtPosition(className, document.offsetAt(position));
		if (classNameAtCurrentPosition) {
			location = this._getMemberLocation(classNameAtCurrentPosition, methodName, openInBrowserIfStandardMethod);
		}

		if (!location) {
			location = this._getXMLFileLocation(document, position);
		}

		return location;
	}

	private static _getMemberLocation(className: string, memberName: string, openInBrowserIfStandardMethod: boolean) {
		let location: vscode.Location | undefined;
		if (className) {
			const UIClass = UIClassFactory.getUIClass(className);
			const methodOrField =
				UIClass.methods.find(method => method.name === memberName) ||
				UIClass.fields.find(field => field.name === memberName);
			if (methodOrField) {
				const isThisClassFromAProject = !!FileReader.getManifestForClass(className);
				if (!isThisClassFromAProject && openInBrowserIfStandardMethod) {
					this._openClassMethodInTheBrowser(className, memberName);
				} else {
					location = this._getVSCodeMemberLocation(className, memberName);
				}
			} else {
				if (UIClass.parentClassNameDotNotation) {
					location = this._getMemberLocation(UIClass.parentClassNameDotNotation, memberName, openInBrowserIfStandardMethod);
				}
			}
		}

		return location;
	}
	static _getXMLFileLocation(document: vscode.TextDocument, position: vscode.Position) {
		let location: vscode.LocationLink[] | undefined;

		const UIClass = TextDocumentTransformer.toCustomUIClass(document);
		if (UIClass) {
			const offset = document.offsetAt(position);
			const method = UIClass.methods.find(method => method.acornNode?.start <= offset && method.acornNode.end >= offset);
			if (method && method.acornNode) {
				const allContent = AcornSyntaxAnalyzer.expandAllContent(method.acornNode);
				const contentInPosition = allContent.filter((content: any) => content.start <= offset && content.end >= offset);
				const literal = contentInPosition.find((content: any) => content.type === "Literal");
				if (literal?.value) {
					const XMLFile = FileReader.getXMLFile(literal.value);
					if (XMLFile) {
						const classUri = vscode.Uri.file(XMLFile.fsPath);
						const vscodePosition = new vscode.Position(0, 0);
						const originSelectionPositionBegin = document.positionAt(literal.start);
						const originSelectionPositionEnd = document.positionAt(literal.end);
						location = [{
							targetRange: new vscode.Range(vscodePosition, vscodePosition),
							targetUri: classUri,
							originSelectionRange: new vscode.Range(originSelectionPositionBegin, originSelectionPositionEnd)
						}];
					}
				}

			}
		}

		return location;
	}

	private static _getVSCodeMemberLocation(classNameDotNotation: string, memberName: string) {
		let location: vscode.Location | undefined;
		const UIClass = UIClassFactory.getUIClass(classNameDotNotation);

		if (UIClass instanceof CustomUIClass) {
			const currentMember = UIClass.methods.find(method => method.name === memberName) || UIClass.fields.find(field => field.name === memberName);
			if (currentMember?.memberPropertyNode) {
				const classPath = FileReader.getClassPathFromClassName(UIClass.className);
				if (classPath) {
					const classUri = vscode.Uri.file(classPath);
					if (currentMember.memberPropertyNode.start) {
						const position = LineColumn(UIClass.classText).fromIndex(currentMember.memberPropertyNode.start);
						if (position) {
							const methodPosition = new vscode.Position(position.line - 1, position.col - 1);
							location = new vscode.Location(classUri, methodPosition);
						}
					}
				}
			}
		}

		return location;
	}

	private static _openClassMethodInTheBrowser(classNameDotNotation: string, methodName: string) {
		const UIClass = UIClassFactory.getUIClass(classNameDotNotation);
		if (UIClass instanceof StandardUIClass) {
			const methodFromClass = UIClass.methods.find(method => method.name === methodName);
			if (methodFromClass) {
				if (methodFromClass.isFromParent) {
					this._openClassMethodInTheBrowser(UIClass.parentClassNameDotNotation, methodName);
				} else {
					const UIClass = UIClassFactory.getUIClass(classNameDotNotation);
					const linkToDocumentation = URLBuilder.getInstance().getUrlForMethodApi(UIClass, methodName);
					vscode.env.openExternal(vscode.Uri.parse(linkToDocumentation));
				}
			} else if (UIClass.parentClassNameDotNotation) {
				this._openClassMethodInTheBrowser(UIClass.parentClassNameDotNotation, methodName);
			}
		}
	}
}