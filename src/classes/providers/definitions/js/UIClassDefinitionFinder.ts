import * as vscode from "vscode";
import { UIClassFactory } from "../../../UI5Classes/UIClassFactory";
import { CustomUIClass } from "../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { FileReader } from "../../../utils/FileReader";
import { StandardUIClass } from "../../../UI5Classes/UI5Parser/UIClass/StandardUIClass";
import { URLBuilder } from "../../../utils/URLBuilder";
import LineColumn = require("line-column");
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../../../UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
export class UIClassDefinitionFinder {
	public static getPositionAndUriOfCurrentVariableDefinition(classNameDotNotation?: string, methodName?: string, openInBrowserIfStandardMethod?: boolean) : vscode.Location | undefined {
		let location: vscode.Location | undefined;

		if (!classNameDotNotation) {
			const positionBeforeCurrentStrategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
			classNameDotNotation = positionBeforeCurrentStrategy.getClassNameOfTheVariableAtCurrentDocumentPosition();
		}

		const textEditor = vscode.window.activeTextEditor;
		if (textEditor && !methodName) {

			const document = textEditor.document;
			const position = textEditor.selection.start;
			methodName = document.getText(document.getWordRangeAtPosition(position));
		}

		if (classNameDotNotation && methodName) {
			const isThisClassFromAProject = !!FileReader.getManifestForClass(classNameDotNotation);
			if (!isThisClassFromAProject && openInBrowserIfStandardMethod) {
				this._openClassMethodInTheBrowser(classNameDotNotation, methodName);
			} else {
				location = this._getVSCodeMethodLocation(classNameDotNotation, methodName);
				if (!location) {
					const UIClass = UIClassFactory.getUIClass(classNameDotNotation);
					if (UIClass.parentClassNameDotNotation) {
						location = this.getPositionAndUriOfCurrentVariableDefinition(UIClass.parentClassNameDotNotation, methodName, openInBrowserIfStandardMethod);
					}
				}
			}
		}

		return location;
	}

	private static _getVSCodeMethodLocation(classNameDotNotation: string, methodName: string) {
		let location: vscode.Location | undefined;
		const UIClass = UIClassFactory.getUIClass(classNameDotNotation);

		if (UIClass instanceof CustomUIClass) {
			const currentMethod = UIClass.methods.find(method => method.name === methodName);
			if (currentMethod) {
				const classPath = FileReader.getClassPathFromClassName(UIClass.className);
				if (classPath) {
					const classUri = vscode.Uri.file(classPath);
					if (currentMethod.position) {
						const position = LineColumn(UIClass.classText).fromIndex(currentMethod.position);
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