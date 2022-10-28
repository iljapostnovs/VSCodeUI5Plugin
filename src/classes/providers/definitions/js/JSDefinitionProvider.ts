import { UI5Parser, XMLParser } from "ui5plugin-parser";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "ui5plugin-parser/dist/classes/UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import {
	AbstractCustomClass,
	ICustomClassField,
	ICustomClassMethod
} from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractCustomClass";
import { CustomTSClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomTSClass";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { StandardUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/StandardUIClass";
import { TextDocumentTransformer } from "ui5plugin-parser/dist/classes/utils/TextDocumentTransformer";
import { URLBuilder } from "ui5plugin-parser/dist/classes/utils/URLBuilder";
import { AbstractUI5Parser } from "ui5plugin-parser/dist/IUI5Parser";
import * as vscode from "vscode";
import { UI5Plugin } from "../../../../UI5Plugin";
import { PositionAdapter } from "../../../adapters/vscode/PositionAdapter";
import { TextDocumentAdapter } from "../../../adapters/vscode/TextDocumentAdapter";
import * as ts from "typescript";
import { Node, StringLiteral } from "ts-morph";
import { RangeAdapter } from "../../../adapters/vscode/RangeAdapter";
import { IXMLFile } from "ui5plugin-parser/dist/classes/utils/FileReader";

interface CurrentStringData {
	value: string;
	start: number;
	end: number;
}

export class JSDefinitionProvider {
	public static getPositionAndUriOfCurrentVariableDefinition(
		document: vscode.TextDocument,
		position: vscode.Position,
		openInBrowserIfStandardMethod = false
	) {
		let location: vscode.Location | vscode.LocationLink[] | undefined;
		const methodName = document.getText(document.getWordRangeAtPosition(position));
		const className = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(document.fileName);

		if (!className) {
			return location;
		}

		const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(className);

		if (UIClass instanceof CustomUIClass) {
			const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(
				AbstractUI5Parser.getInstance(UI5Parser).syntaxAnalyser
			);
			const classNameAtCurrentPosition =
				className && strategy.getClassNameOfTheVariableAtPosition(className, document.offsetAt(position));
			if (classNameAtCurrentPosition) {
				location = this._getMemberLocation(
					classNameAtCurrentPosition,
					methodName,
					openInBrowserIfStandardMethod
				);
			}

			if (!location) {
				location = this._getClassLocation(document, position);
			}
		}

		if (UIClass instanceof AbstractCustomClass) {
			if (!location) {
				location = this._getXMLFileLocationOrXMLControlIdLocation(document, position);
			}

			if (!location) {
				location = this._getParentMethodLocation(document, position);
			}
		}

		return location;
	}

	private static _getParentMethodLocation(document: vscode.TextDocument, position: vscode.Position) {
		let location: vscode.Location | undefined;
		const UIClass = TextDocumentTransformer.toCustomUIClass(new TextDocumentAdapter(document));
		const parentUIClass = UIClass && UI5Plugin.getInstance().parser.classFactory.getParent(UIClass);
		if (UIClass && parentUIClass && parentUIClass instanceof AbstractCustomClass) {
			const offset = document.offsetAt(position);
			let member: ICustomClassMethod<any> | ICustomClassField<any> | undefined;
			if (UIClass instanceof CustomUIClass) {
				const members = [...UIClass.methods, ...UIClass.fields];
				member = members.find(member => {
					if (member.loc) {
						const memberLocation = RangeAdapter.acornLocationToVSCodeRange(member.loc);
						return memberLocation.contains(position);
					} else {
						return false;
					}
				});
			} else if (UIClass instanceof CustomTSClass) {
				const members = [...UIClass.methods, ...UIClass.fields];
				member = members.find(
					member => member.node && member.node.getStart() <= offset && member.node.getEnd() >= offset
				);
			}
			const parentMember = member && this._getParentMember(parentUIClass.className, member.name);
			if (parentMember) {
				const parentMemberClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(parentMember.owner);
				const classUri =
					parentMemberClass &&
					parentMemberClass instanceof AbstractCustomClass &&
					parentMemberClass.fsPath &&
					vscode.Uri.file(parentMemberClass.fsPath);
				if (classUri && parentMemberClass instanceof AbstractCustomClass && parentMember.loc) {
					const vscodePosition = RangeAdapter.acornLocationToVSCodeRange(parentMember.loc);
					location = new vscode.Location(classUri, vscodePosition);
				}
			}
		}
		return location;
	}

	private static _getParentMember(
		className: string,
		memberName: string
	): ICustomClassMethod | ICustomClassField | undefined {
		let parentMember: ICustomClassMethod | ICustomClassField | undefined;
		const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(className);
		if (UIClass instanceof AbstractCustomClass) {
			const members = [...UIClass.methods, ...UIClass.fields];
			parentMember = members.find(parentMember => parentMember.name === memberName);

			if (!parentMember && UIClass.parentClassNameDotNotation) {
				parentMember = this._getParentMember(UIClass.parentClassNameDotNotation, memberName);
			}
		}

		return parentMember;
	}

	private static _getClassLocation(
		document: vscode.TextDocument,
		position: vscode.Position
	): vscode.Location | undefined {
		let location: vscode.Location | undefined;
		const UIClass = TextDocumentTransformer.toCustomUIClass(new TextDocumentAdapter(document));
		const offset = document.offsetAt(position);
		if (UIClass) {
			const method = UIClass.methods.find(method => method.node?.start <= offset && method.node.end >= offset);
			if (method && method.node) {
				const allContent = AbstractUI5Parser.getInstance(UI5Parser).syntaxAnalyser.expandAllContent(
					method.node
				);
				const contentInPosition = allContent.filter(
					(content: any) => content.start <= offset && content.end >= offset
				);
				const identifier = contentInPosition.find((content: any) => content.type === "Identifier");
				if (identifier?.name) {
					const importedClass = UIClass.UIDefine.find(UIDefine => UIDefine.className === identifier.name);
					if (importedClass) {
						const importedUIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(
							importedClass.classNameDotNotation
						);
						if (importedUIClass instanceof CustomUIClass && importedUIClass.fsPath) {
							const classUri = vscode.Uri.file(importedUIClass.fsPath);
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
				const isThisClassFromAProject =
					!!UI5Plugin.getInstance().parser.fileReader.getManifestForClass(className);
				if (!isThisClassFromAProject && openInBrowserIfStandardMethod) {
					this._openClassMethodInTheBrowser(className, memberName);
				} else {
					location = this._getVSCodeMemberLocation(className, memberName);
				}
			} else {
				if (UIClass.parentClassNameDotNotation) {
					location = this._getMemberLocation(
						UIClass.parentClassNameDotNotation,
						memberName,
						openInBrowserIfStandardMethod
					);
				}
			}
		}

		return location;
	}

	private static _getXMLFileLocationOrXMLControlIdLocation(document: vscode.TextDocument, position: vscode.Position) {
		let location: vscode.LocationLink[] | undefined;

		const UIClass = TextDocumentTransformer.toCustomUIClass(new TextDocumentAdapter(document));
		if (UIClass) {
			const currentStringData = this._getCurrentStringData(UIClass, document, position);
			if (!currentStringData) {
				return;
			}
			const XMLFile = UI5Plugin.getInstance().parser.fileReader.getXMLFile(currentStringData.value);
			if (XMLFile) {
				location = this._getLocationOfXMLFile(XMLFile, document, currentStringData);
			} else {
				location = this._getLocationOfXMLTag(UIClass, currentStringData, document);
			}
		}

		return location;
	}

	private static _getLocationOfXMLTag(
		UIClass: AbstractCustomClass,
		currentStringData: CurrentStringData,
		document: vscode.TextDocument
	) {
		let location: vscode.LocationLink[] | undefined;
		const viewsAndFragments =
			UI5Plugin.getInstance().parser.classFactory.getViewsAndFragmentsOfControlHierarchically(UIClass);
		const XMLDocuments = [...viewsAndFragments.fragments, ...viewsAndFragments.views];
		XMLDocuments.find(XMLDocument => {
			const tags = XMLParser.getAllTags(XMLDocument);
			const idTag = tags.find(tag => {
				const attributes = XMLParser.getAttributesOfTheTag(tag);
				return !!attributes?.find(attribute => {
					const { attributeName, attributeValue } = XMLParser.getAttributeNameAndValue(attribute);

					return currentStringData && attributeName === "id" && attributeValue === currentStringData.value;
				});
			});

			if (idTag) {
				const classUri = vscode.Uri.file(XMLDocument.fsPath);
				const positionBegin = PositionAdapter.offsetToPosition(XMLDocument.content, idTag.positionBegin);
				const positionEnd = PositionAdapter.offsetToPosition(XMLDocument.content, idTag.positionEnd);
				if (positionBegin && positionEnd && currentStringData) {
					const originSelectionPositionBegin = document.positionAt(currentStringData.start);
					const originSelectionPositionEnd = document.positionAt(currentStringData.end);
					location = [
						{
							targetRange: new vscode.Range(positionBegin, positionEnd),
							targetUri: classUri,
							originSelectionRange: new vscode.Range(
								originSelectionPositionBegin,
								originSelectionPositionEnd
							)
						}
					];
				}
			}

			return !!idTag;
		});
		return location;
	}

	private static _getLocationOfXMLFile(
		XMLFile: IXMLFile,
		document: vscode.TextDocument,
		currentStringData: CurrentStringData
	) {
		const classUri = vscode.Uri.file(XMLFile.fsPath);
		const vscodePosition = new vscode.Position(0, 0);
		const originSelectionPositionBegin = document.positionAt(currentStringData.start);
		const originSelectionPositionEnd = document.positionAt(currentStringData.end);
		const location: vscode.LocationLink[] = [
			{
				targetRange: new vscode.Range(vscodePosition, vscodePosition),
				targetUri: classUri,
				originSelectionRange: new vscode.Range(originSelectionPositionBegin, originSelectionPositionEnd)
			}
		];
		return location;
	}

	private static _getCurrentStringData(
		UIClass: AbstractCustomClass,
		document: vscode.TextDocument,
		position: vscode.Position
	) {
		let currentStringData: CurrentStringData | undefined;
		if (UIClass instanceof CustomUIClass) {
			const offset = document.offsetAt(position);
			const method = UIClass.methods.find(method => method.node?.start <= offset && method.node?.end >= offset);
			if (method?.node) {
				const allContent = AbstractUI5Parser.getInstance(UI5Parser).syntaxAnalyser.expandAllContent(
					method.node
				);
				const contentInPosition = allContent.filter(
					(content: any) => content.start <= offset && content.end >= offset
				);
				const literal = contentInPosition.find((content: any) => content.type === "Literal");
				if (literal) {
					currentStringData = {
						value: literal.value,
						start: literal.start + 1,
						end: literal.end - 1
					};
				}
			}
		} else if (UIClass instanceof CustomTSClass) {
			const offset = document.offsetAt(position);
			const method = UIClass.methods.find(
				method => method.node && method.node.getStart() <= offset && method.node.getEnd() >= offset
			);
			if (method?.node) {
				const literal = this._getStringLiteralAtPosRecursive(method.node, offset);

				if (literal) {
					currentStringData = {
						value: literal.getLiteralValue(),
						start: literal.getStart(),
						end: literal.getEnd()
					};
				}
			}
		}
		return currentStringData;
	}

	private static _getStringLiteralAtPosRecursive(node: Node, offset: number): StringLiteral | undefined {
		const child = node.getChildAtPos(offset);
		if (child?.isKind(ts.SyntaxKind.StringLiteral)) {
			return child;
		} else if (child) {
			return this._getStringLiteralAtPosRecursive(child, offset);
		}
	}

	private static _getVSCodeMemberLocation(classNameDotNotation: string, memberName: string) {
		let location: vscode.Location | undefined;
		const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(classNameDotNotation);

		if (UIClass instanceof AbstractCustomClass) {
			const currentMember =
				UIClass.methods.find(method => method.name === memberName) ||
				UIClass.fields.find(field => field.name === memberName);
			if (currentMember?.loc) {
				const classPath = UI5Plugin.getInstance().parser.fileReader.getClassFSPathFromClassName(
					UIClass.className
				);
				if (classPath) {
					const classUri = vscode.Uri.file(classPath);
					if (currentMember.node.start) {
						const position = PositionAdapter.acornPositionToVSCodePosition(currentMember.loc.start);
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
