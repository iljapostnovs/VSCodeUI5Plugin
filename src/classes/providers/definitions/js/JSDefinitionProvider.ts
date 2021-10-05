import { XMLParser } from "ui5plugin-parser";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "ui5plugin-parser/dist/classes/UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { CustomUIClass, ICustomClassUIMethod, ICustomClassUIField } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { StandardUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/StandardUIClass";
import { TextDocumentTransformer } from "ui5plugin-parser/dist/classes/utils/TextDocumentTransformer";
import { URLBuilder } from "ui5plugin-parser/dist/classes/utils/URLBuilder";
import * as vscode from "vscode";
import { UI5Plugin } from "../../../../UI5Plugin";
import { PositionAdapter } from "../../../adapters/vscode/PositionAdapter";
import { TextDocumentAdapter } from "../../../adapters/vscode/TextDocumentAdapter";
export class JSDefinitionProvider {
	public static getPositionAndUriOfCurrentVariableDefinition(document: vscode.TextDocument, position: vscode.Position, openInBrowserIfStandardMethod = false) {
		let location: vscode.Location | vscode.LocationLink[] | undefined;
		const methodName = document.getText(document.getWordRangeAtPosition(position));
		const className = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(document.fileName);
		const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(UI5Plugin.getInstance().parser.syntaxAnalyser);
		const classNameAtCurrentPosition = className && strategy.getClassNameOfTheVariableAtPosition(className, document.offsetAt(position));
		if (classNameAtCurrentPosition) {
			location = this._getMemberLocation(classNameAtCurrentPosition, methodName, openInBrowserIfStandardMethod);
		}

		if (!location) {
			location = this._getClassLocation(document, position);
		}

		if (!location) {
			location = this._getXMLFileLocation(document, position);
		}

		if (!location) {
			location = this._getParentMethodLocation(document, position);
		}

		return location;
	}

	private static _getParentMethodLocation(document: vscode.TextDocument, position: vscode.Position) {
		let location: vscode.Location | undefined;
		const UIClass = TextDocumentTransformer.toCustomUIClass(new TextDocumentAdapter(document));
		const parentUIClass = UIClass && UI5Plugin.getInstance().parser.classFactory.getParent(UIClass);
		if (UIClass && parentUIClass && parentUIClass instanceof CustomUIClass) {
			const offset = document.offsetAt(position);
			const members = [...UIClass.methods, ...UIClass.fields];
			const member = members.find(member => member.memberPropertyNode?.start <= offset && member.memberPropertyNode?.end >= offset);
			const parentMember = member && this._getParentMember(parentUIClass.className, member.name);
			if (parentMember) {
				const parentMemberClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(parentMember.owner);
				const classUri = parentMemberClass && parentMemberClass instanceof CustomUIClass && parentMemberClass.classFSPath && vscode.Uri.file(parentMemberClass.classFSPath);
				if (classUri && parentMemberClass instanceof CustomUIClass) {
					const vscodePosition = PositionAdapter.acornPositionToVSCodePosition(parentMember.memberPropertyNode.loc.start);
					location = new vscode.Location(classUri, vscodePosition);
				}
			}
		}
		return location;
	}

	private static _getParentMember(className: string, memberName: string): ICustomClassUIMethod | ICustomClassUIField | undefined {
		let parentMember: ICustomClassUIMethod | ICustomClassUIField | undefined;
		const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(className);
		if (UIClass instanceof CustomUIClass) {
			const members = [...UIClass.methods, ...UIClass.fields];
			parentMember = members.find(parentMember => parentMember.name === memberName);

			if (!parentMember && UIClass.parentClassNameDotNotation) {
				parentMember = this._getParentMember(UIClass.parentClassNameDotNotation, memberName);
			}
		}

		return parentMember;
	}

	private static _getClassLocation(document: vscode.TextDocument, position: vscode.Position): vscode.Location | undefined {
		let location: vscode.Location | undefined;
		const UIClass = TextDocumentTransformer.toCustomUIClass(new TextDocumentAdapter(document));
		const offset = document.offsetAt(position);
		if (UIClass) {
			const method = UIClass.methods.find(method => method.acornNode?.start <= offset && method.acornNode.end >= offset);
			if (method && method.acornNode) {
				const allContent = UI5Plugin.getInstance().parser.syntaxAnalyser.expandAllContent(method.acornNode);
				const contentInPosition = allContent.filter((content: any) => content.start <= offset && content.end >= offset);
				const identifier = contentInPosition.find((content: any) => content.type === "Identifier");
				if (identifier?.name) {
					const importedClass = UIClass.UIDefine.find(UIDefine => UIDefine.className === identifier.name);
					if (importedClass) {
						const importedUIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(importedClass.classNameDotNotation);
						if (importedUIClass instanceof CustomUIClass && importedUIClass.classFSPath) {
							const classUri = vscode.Uri.file(importedUIClass.classFSPath);
							const vscodePosition = new vscode.Position(0, 0);
							location = new vscode.Location(classUri, vscodePosition);
						}
					}
				}
			}
		}

		return location;
	}

	private static _getMemberLocation(className: string, memberName: string, openInBrowserIfStandardMethod: boolean) {
		let location: vscode.Location | undefined;
		if (className) {
			const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(className);
			const methodOrField =
				UIClass.methods.find(method => method.name === memberName) ||
				UIClass.fields.find(field => field.name === memberName);
			if (methodOrField) {
				const isThisClassFromAProject = !!UI5Plugin.getInstance().parser.fileReader.getManifestForClass(className);
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

	private static _getXMLFileLocation(document: vscode.TextDocument, position: vscode.Position) {
		let location: vscode.LocationLink[] | undefined;

		const UIClass = TextDocumentTransformer.toCustomUIClass(new TextDocumentAdapter(document));
		if (UIClass) {
			const offset = document.offsetAt(position);
			const method = UIClass.methods.find(method => method.acornNode?.start <= offset && method.acornNode.end >= offset);
			if (method && method.acornNode) {
				const allContent = UI5Plugin.getInstance().parser.syntaxAnalyser.expandAllContent(method.acornNode);
				const contentInPosition = allContent.filter((content: any) => content.start <= offset && content.end >= offset);
				const literal = contentInPosition.find((content: any) => content.type === "Literal");
				if (literal?.value) {
					const XMLFile = UI5Plugin.getInstance().parser.fileReader.getXMLFile(literal.value);
					if (XMLFile) {
						const classUri = vscode.Uri.file(XMLFile.fsPath);
						const vscodePosition = new vscode.Position(0, 0);
						const originSelectionPositionBegin = document.positionAt(literal.start + 1);
						const originSelectionPositionEnd = document.positionAt(literal.end - 1);
						location = [{
							targetRange: new vscode.Range(vscodePosition, vscodePosition),
							targetUri: classUri,
							originSelectionRange: new vscode.Range(originSelectionPositionBegin, originSelectionPositionEnd)
						}];
					} else {
						const viewsAndFragments = UI5Plugin.getInstance().parser.classFactory.getViewsAndFragmentsOfControlHierarchically(UIClass);
						const XMLDocuments = [...viewsAndFragments.fragments, ...viewsAndFragments.views];
						XMLDocuments.find(XMLDocument => {
							const tags = XMLParser.getAllTags(XMLDocument);
							const tag = tags.find(tag => {
								const attributes = XMLParser.getAttributesOfTheTag(tag);
								return !!attributes?.find(attribute => {
									const { attributeName, attributeValue } = XMLParser.getAttributeNameAndValue(attribute);

									return attributeName === "id" && attributeValue === literal.value;
								})
							});

							if (tag) {
								const classUri = vscode.Uri.file(XMLDocument.fsPath);
								const position = PositionAdapter.offsetToPosition(XMLDocument.content, tag.positionBegin);
								if (position) {
									const originSelectionPositionBegin = document.positionAt(literal.start + 1);
									const originSelectionPositionEnd = document.positionAt(literal.end - 1);
									location = [{
										targetRange: new vscode.Range(position, position),
										targetUri: classUri,
										originSelectionRange: new vscode.Range(originSelectionPositionBegin, originSelectionPositionEnd)
									}];
								}
							}

							return !!tag;
						});
					}
				}

			}
		}

		return location;
	}

	private static _getVSCodeMemberLocation(classNameDotNotation: string, memberName: string) {
		let location: vscode.Location | undefined;
		const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(classNameDotNotation);

		if (UIClass instanceof CustomUIClass) {
			const currentMember = UIClass.methods.find(method => method.name === memberName) || UIClass.fields.find(field => field.name === memberName);
			if (currentMember?.memberPropertyNode) {
				const classPath = UI5Plugin.getInstance().parser.fileReader.getClassFSPathFromClassName(UIClass.className);
				if (classPath) {
					const classUri = vscode.Uri.file(classPath);
					if (currentMember.memberPropertyNode.start) {
						const position = PositionAdapter.acornPositionToVSCodePosition(currentMember.memberPropertyNode.loc.start);
						location = new vscode.Location(classUri, position);

					}
				}
			}

			return location;
		}
	}

	private static _openClassMethodInTheBrowser(classNameDotNotation: string, methodName: string) {
		const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(classNameDotNotation);
		if (UIClass instanceof StandardUIClass) {
			const methodFromClass = UIClass.methods.find(method => method.name === methodName);
			if (methodFromClass) {
				if (methodFromClass.isFromParent) {
					this._openClassMethodInTheBrowser(UIClass.parentClassNameDotNotation, methodName);
				} else {
					const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(classNameDotNotation);
					const linkToDocumentation = URLBuilder.getInstance().getUrlForMethodApi(UIClass, methodName);
					vscode.env.openExternal(vscode.Uri.parse(linkToDocumentation));
				}
			} else if (UIClass.parentClassNameDotNotation) {
				this._openClassMethodInTheBrowser(UIClass.parentClassNameDotNotation, methodName);
			}
		}
	}
}