import { Node, StringLiteral } from "ts-morph";
import * as ts from "typescript";
import { ParserPool, UI5JSParser } from "ui5plugin-parser";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "ui5plugin-parser/dist/classes/parsing/jsparser/typesearch/FieldsAndMethodForPositionBeforeCurrentStrategy";
import {
	AbstractCustomClass,
	ICustomClassField,
	ICustomClassMethod
} from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractCustomClass";
import { CustomJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import { StandardUIClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/StandardUIClass";
import { CustomTSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/ts/CustomTSClass";
import { IXMLFile } from "ui5plugin-parser/dist/classes/parsing/util/filereader/IFileReader";
import * as vscode from "vscode";
import { PositionAdapter } from "../../../adapters/vscode/PositionAdapter";
import { RangeAdapter } from "../../../adapters/vscode/RangeAdapter";
import { TextDocumentAdapter } from "../../../adapters/vscode/TextDocumentAdapter";
import ParserBearer from "../../../ui5parser/ParserBearer";

interface CurrentStringData {
	value: string;
	start: number;
	end: number;
}

export class JSDefinitionProvider extends ParserBearer<UI5JSParser> {
	public getPositionAndUriOfCurrentVariableDefinition(
		document: vscode.TextDocument,
		position: vscode.Position,
		openInBrowserIfStandardMethod = false
	) {
		let location: vscode.Location | vscode.LocationLink[] | undefined;
		const methodName = document.getText(document.getWordRangeAtPosition(position));
		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);

		if (!className) {
			return location;
		}

		const UIClass = this._parser.classFactory.getUIClass(className);

		if (UIClass instanceof CustomJSClass) {
			const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(
				this._parser.syntaxAnalyser,
				this._parser
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

	private _getParentMethodLocation(document: vscode.TextDocument, position: vscode.Position) {
		let location: vscode.Location | undefined;
		const UIClass = this._parser.textDocumentTransformer.toCustomUIClass(new TextDocumentAdapter(document));
		const parentUIClass = UIClass && this._parser.classFactory.getParent(UIClass);
		if (UIClass && parentUIClass && parentUIClass instanceof AbstractCustomClass) {
			const offset = document.offsetAt(position);
			let member: ICustomClassMethod<any> | ICustomClassField<any> | undefined;
			if (UIClass instanceof CustomJSClass) {
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
				const parentMemberClass = this._parser.classFactory.getUIClass(parentMember.owner);
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

	private _getParentMember(
		className: string,
		memberName: string
	): ICustomClassMethod | ICustomClassField | undefined {
		let parentMember: ICustomClassMethod | ICustomClassField | undefined;
		const UIClass = this._parser.classFactory.getUIClass(className);
		if (UIClass instanceof AbstractCustomClass) {
			const members = [...UIClass.methods, ...UIClass.fields];
			parentMember = members.find(parentMember => parentMember.name === memberName);

			if (!parentMember && UIClass.parentClassNameDotNotation) {
				parentMember = this._getParentMember(UIClass.parentClassNameDotNotation, memberName);
			}
		}

		return parentMember;
	}

	private _getClassLocation(document: vscode.TextDocument, position: vscode.Position): vscode.Location | undefined {
		let location: vscode.Location | undefined;
		const UIClass = this._parser.textDocumentTransformer.toCustomUIClass(new TextDocumentAdapter(document));
		const offset = document.offsetAt(position);
		if (UIClass) {
			const method = UIClass.methods.find(method => method.node?.start <= offset && method.node.end >= offset);
			if (method && method.node) {
				const allContent = this._parser.syntaxAnalyser.expandAllContent(method.node);
				const contentInPosition = allContent.filter(
					(content: any) => content.start <= offset && content.end >= offset
				);
				const identifier = contentInPosition.find((content: any) => content.type === "Identifier");
				if (identifier?.name) {
					const importedClass = UIClass.UIDefine.find(UIDefine => UIDefine.className === identifier.name);
					if (importedClass) {
						const importedUIClass = this._parser.classFactory.getUIClass(
							importedClass.classNameDotNotation
						);
						if (importedUIClass instanceof CustomJSClass && importedUIClass.fsPath) {
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

	private _getMemberLocation(className: string, memberName: string, openInBrowserIfStandardMethod: boolean) {
		let location: vscode.Location | undefined;
		if (className) {
			const UIClass = this._parser.classFactory.getUIClass(className);
			const methodOrField =
				UIClass.methods.find(method => method.name === memberName) ||
				UIClass.fields.find(field => field.name === memberName);
			if (methodOrField) {
				const isThisClassFromAProject = !!ParserPool.getManifestForClass(className);
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

	private _getXMLFileLocationOrXMLControlIdLocation(document: vscode.TextDocument, position: vscode.Position) {
		let location: vscode.LocationLink[] | undefined;

		const UIClass = this._parser.textDocumentTransformer.toCustomUIClass(new TextDocumentAdapter(document));
		if (UIClass && UIClass instanceof CustomJSClass) {
			const currentStringData = this._getCurrentStringData(UIClass, document, position);
			if (!currentStringData) {
				return;
			}
			const XMLFile = this._parser.fileReader.getXMLFile(currentStringData.value);
			if (XMLFile) {
				location = this._getLocationOfXMLFile(XMLFile, document, currentStringData);
			} else {
				location = this._getLocationOfXMLTag(UIClass, currentStringData, document);
			}
		}

		return location;
	}

	private _getLocationOfXMLTag(
		UIClass: CustomJSClass,
		currentStringData: CurrentStringData,
		document: vscode.TextDocument
	) {
		let location: vscode.LocationLink[] | undefined;
		const viewsAndFragments = this._parser.classFactory.getViewsAndFragmentsOfControlHierarchically(UIClass);
		const XMLDocuments = [...viewsAndFragments.fragments, ...viewsAndFragments.views];
		XMLDocuments.find(XMLDocument => {
			const tags = this._parser.xmlParser.getAllTags(XMLDocument);
			const idTag = tags.find(tag => {
				const attributes = this._parser.xmlParser.getAttributesOfTheTag(tag);
				return !!attributes?.find(attribute => {
					const { attributeName, attributeValue } =
						this._parser.xmlParser.getAttributeNameAndValue(attribute);

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

	private _getLocationOfXMLFile(
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

	private _getCurrentStringData(
		UIClass: AbstractCustomClass,
		document: vscode.TextDocument,
		position: vscode.Position
	) {
		let currentStringData: CurrentStringData | undefined;
		if (UIClass instanceof CustomJSClass) {
			const offset = document.offsetAt(position);
			const method = UIClass.methods.find(method => method.node?.start <= offset && method.node?.end >= offset);
			if (method?.node) {
				const allContent = this._parser.syntaxAnalyser.expandAllContent(method.node);
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

	private _getStringLiteralAtPosRecursive(node: Node, offset: number): StringLiteral | undefined {
		const child = node.getChildAtPos(offset);
		if (child?.isKind(ts.SyntaxKind.StringLiteral)) {
			return child;
		} else if (child) {
			return this._getStringLiteralAtPosRecursive(child, offset);
		}
	}

	private _getVSCodeMemberLocation(classNameDotNotation: string, memberName: string) {
		let location: vscode.Location | undefined;
		const UIClass = this._parser.classFactory.getUIClass(classNameDotNotation);

		if (UIClass instanceof AbstractCustomClass) {
			const currentMember =
				UIClass.methods.find(method => method.name === memberName) ||
				UIClass.fields.find(field => field.name === memberName);
			if (currentMember?.loc) {
				const classPath = this._parser.fileReader.getClassFSPathFromClassName(UIClass.className);
				if (classPath) {
					const classUri = vscode.Uri.file(classPath);
					if (currentMember.loc?.start) {
						const position = PositionAdapter.acornPositionToVSCodePosition(currentMember.loc.start);
						location = new vscode.Location(classUri, position);
					}
				}
			}

			return location;
		}
	}

	private _openClassMethodInTheBrowser(classNameDotNotation: string, methodName: string) {
		const UIClass = this._parser.classFactory.getUIClass(classNameDotNotation);
		if (UIClass instanceof StandardUIClass) {
			const methodFromClass = UIClass.methods.find(method => method.name === methodName);
			if (methodFromClass) {
				if (methodFromClass.isFromParent) {
					this._openClassMethodInTheBrowser(UIClass.parentClassNameDotNotation, methodName);
				} else {
					const UIClass = this._parser.classFactory.getUIClass(classNameDotNotation);
					const linkToDocumentation = this._parser.urlBuilder.getUrlForMethodApi(UIClass, methodName);
					vscode.env.openExternal(vscode.Uri.parse(linkToDocumentation));
				}
			} else if (UIClass.parentClassNameDotNotation) {
				this._openClassMethodInTheBrowser(UIClass.parentClassNameDotNotation, methodName);
			}
		}
	}
}
