import { SourceFile } from "ts-morph";
import ts = require("typescript");
import { UI5Parser } from "ui5plugin-parser";
import { ICacheable } from "ui5plugin-parser/dist/classes/UI5Classes/abstraction/ICacheable";
import {
	AbstractUIClass,
	IUIField,
	IUIMethod
} from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { IViewsAndFragmentsCache } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
interface IUIDefine {
	path: string;
	className: string;
	classNameDotNotation: string;
	start: number;
	end: number;
	acornNode: any;
}
export interface UI5Ignoreable {
	ui5ignored?: boolean;
}

export interface IXMLDocumentMentionable {
	mentionedInTheXMLDocument?: boolean;
}

export interface ITSNodeBearer<NodeType> {
	tsNode: NodeType;
	memberPropertyNode?: any;
}
export interface ICustomClassTSMethod
	extends IUIMethod,
	ITSNodeBearer<ts.MethodDeclaration>,
	IXMLDocumentMentionable,
	UI5Ignoreable {
	position?: number;
	isEventHandler: boolean;
	acornParams?: any;
}
export interface ICustomClassTSField
	extends IUIField,
	ITSNodeBearer<ts.PropertyDeclaration>,
	IXMLDocumentMentionable,
	UI5Ignoreable {
	customData?: Record<string, any>;
}

export class CustomTSClass extends AbstractUIClass implements ICacheable, ITSNodeBearer<ts.ClassDeclaration> {
	readonly methods: ICustomClassTSMethod[] = [];
	readonly fields: ICustomClassTSField[] = [];
	private readonly _cache: Record<string, any> = {};

	fsPath: string | undefined;
	readonly classText: string;
	UIDefine: IUIDefine[] = [];
	relatedViewsAndFragments?: IViewsAndFragmentsCache[];
	readonly tsNode: ts.ClassDeclaration;
	private readonly _sourceFile: SourceFile;
	readonly typeChecker: ts.TypeChecker;
	constructor(classDeclaration: ts.ClassDeclaration, sourceFile: SourceFile, typeChecker: ts.TypeChecker) {
		// const jsDocs = ts.getJSDocTags(classDeclaration);
		// const namespaceDoc = jsDocs.find(jsDoc => jsDoc.tagName.escapedText === "namespace");
		// const namespace = namespaceDoc?.comment ?? "";
		// const classNameLastPart = classDeclaration.name?.escapedText ?? "";
		const className = UI5Parser.getInstance().fileReader.getClassNameFromPath(sourceFile.compilerNode.fileName);
		super(className ?? "");

		this.typeChecker = typeChecker;

		const heritageClause = classDeclaration.heritageClauses?.find(heritage => {
			return heritage.token == ts.SyntaxKind.ExtendsKeyword;
		});
		if (heritageClause) {
			// const [parentSymbol] = parentHeritageClause.types.map(typeNode => {
			// const type = typeChecker.getTypeFromTypeNode(typeNode);
			// return typeChecker.typeToString(type);
			// return typeChecker.getSymbolAtLocation(typeNode.expression);
			// });
			// const parentName = parentSymbol && typeChecker.getFullyQualifiedName(parentSymbol);
			const parentType = typeChecker.getTypeFromTypeNode(heritageClause.types[0]);
			const parentSymbol = parentType.getSymbol();
			const parentName = parentSymbol && typeChecker.getFullyQualifiedName(parentSymbol);
			if (parentName?.startsWith("\"sap/")) {
				const [parentModuleNameQuoted] = parentName.split(".");
				const parentModuleName = parentModuleNameQuoted.substring(1, parentModuleNameQuoted.length - 1);
				this.parentClassNameDotNotation = parentModuleName.replace(/\//g, ".");
			} else {
				const declarations = parentType
					.getSymbol()
					?.declarations?.filter(declaration => ts.isClassDeclaration(declaration));
				const parentClassDeclaration = declarations?.[0];
				if (parentClassDeclaration && ts.isClassDeclaration(parentClassDeclaration)) {
					const jsDocs = ts.getJSDocTags(parentClassDeclaration);
					const namespaceDoc = jsDocs.find(jsDoc => jsDoc.tagName.escapedText === "namespace");
					const namespace = namespaceDoc?.comment ?? "";
					const classNameLastPart = parentClassDeclaration.name?.escapedText ?? "";
					this.parentClassNameDotNotation = `${namespace}.${classNameLastPart}`;
				}
			}
			// if (parentType.isClass()) {
			// 	const [baseType] = typeChecker.getBaseTypes(parentType);
			// 	if (baseType?.isClass() && baseType?.getSymbol()) {
			// 		const symbol = baseType.getSymbol();
			// 		const parentTypeName = symbol && typeChecker.getFullyQualifiedName(symbol);
			// 		if (parentTypeName?.startsWith('"sap/')) {
			// 			const [parentModuleNameQuoted] = parentTypeName.split(".");
			// 			const parentModuleName = parentModuleNameQuoted.substring(1, parentModuleNameQuoted.length - 1);
			// 			this.parentClassNameDotNotation = parentModuleName.replace(/\//g, ".");
			// 		} else {
			// 			debugger;
			// 		}
			// 		// const declarations = baseType.getSymbol().getDeclarations();
			// 		// const declaration = declarations ? declarations[0] : undefined;
			// 		// const
			// 	}
			// }
		}

		this.classText = sourceFile.getFullText();

		this._sourceFile = sourceFile;
		this.fsPath = sourceFile.compilerNode.fileName;
		this.tsNode = classDeclaration;

		this._fillMethods(classDeclaration, typeChecker);
		this._fillFields(classDeclaration, typeChecker);
		this._fillUIDefine();
	}

	_fillUIDefine() {
		const importStatements = this._sourceFile.compilerNode.statements
			.filter(statement => ts.isImportDeclaration(statement))
			.map(statement => statement as ts.ImportDeclaration);

		this.UIDefine = importStatements.map(importStatement => {
			const fullModuleName = importStatement.moduleSpecifier.getText();
			const modulePath = fullModuleName.substring(1, fullModuleName.length - 1);

			return {
				path: modulePath,
				className: modulePath.split("/").pop() ?? "",
				classNameDotNotation: modulePath.replace(/\//g, "."),
				start: importStatement.getStart(),
				end: importStatement.getEnd(),
				acornNode: importStatement
			};
		});
	}

	private _fillFields(classDeclaration: ts.ClassDeclaration, typeChecker: ts.TypeChecker) {
		const fields: ts.PropertyDeclaration[] = classDeclaration.members
			.filter(member => ts.isPropertyDeclaration(member) && ts.isIdentifier(member.name))
			.map(declaration => declaration as ts.PropertyDeclaration);

		const UIFields: ICustomClassTSField[] = fields.map(field => {
			const jsDocs = ts.getJSDocTags(field);
			const ui5IgnoreDoc = jsDocs.find(jsDoc => jsDoc.tagName.escapedText === "ui5ignore");
			return {
				ui5ignored: !!ui5IgnoreDoc,
				owner: this.className,

				static: field.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.StaticKeyword) ?? false,
				abstract: field.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.AbstractKeyword) ?? false,
				type: typeChecker.typeToString(typeChecker.getTypeAtLocation(field)) ?? "any",
				visibility:
					field.modifiers
						?.find(modifier =>
							[
								ts.SyntaxKind.ProtectedKeyword,
								ts.SyntaxKind.PrivateKeyword,
								ts.SyntaxKind.PublicKeyword
							].includes(modifier.kind)
						)
						?.getText() ?? "public",
				name: field.name.getText(),
				deprecated: jsDocs.some(jsDoc => ts.isJSDocDeprecatedTag(jsDoc)),
				description: "",
				isEventHandler: false,
				tsNode: field
			};
		});

		this.fields.push(...UIFields);
	}

	private _fillMethods(classDeclaration: ts.ClassDeclaration, typeChecker: ts.TypeChecker) {
		const methods: ts.MethodDeclaration[] = classDeclaration.members
			.filter(member => ts.isMethodDeclaration(member) && ts.isIdentifier(member.name))
			.map(declaration => declaration as ts.MethodDeclaration);

		const UIMethods: ICustomClassTSMethod[] = methods.map(method => {
			const jsDocs = ts.getJSDocTags(method);
			const ui5IgnoreDoc = jsDocs.find(jsDoc => jsDoc.tagName.escapedText === "ui5ignore");
			const position = this._sourceFile.compilerNode.getLineAndCharacterOfPosition(method.getStart());
			return {
				ui5ignored: !!ui5IgnoreDoc,
				owner: this.className,
				static: method.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.StaticKeyword) ?? false,
				abstract: method.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.AbstractKeyword) ?? false,
				returnType:
					typeChecker.typeToString(
						typeChecker.getTypeAtLocation(method).getCallSignatures()[0]?.getReturnType()
					) ?? "void",
				visibility:
					method.modifiers
						?.find(modifier =>
							[
								ts.SyntaxKind.ProtectedKeyword,
								ts.SyntaxKind.PrivateKeyword,
								ts.SyntaxKind.PublicKeyword
							].includes(modifier.kind)
						)
						?.getText() ?? "public",
				params: method.parameters.map(param => {
					return {
						name: param.name.getText(),
						type: typeChecker.typeToString(typeChecker.getTypeAtLocation(param)) ?? "any",
						description: "",
						isOptional: false
					};
				}),
				name: method.name.getText(),
				position: method.getStart(),
				deprecated: jsDocs.some(jsDoc => ts.isJSDocDeprecatedTag(jsDoc)),
				description: "",
				isEventHandler: false,
				tsNode: method,
				memberPropertyNode: position && {
					loc: {
						start: {
							line: position.line + 1,
							column: position.character
						}
					}
				}
			};
		});

		this.methods.push(...UIMethods);
	}

	setCache<Type>(cacheName: string, cacheValue: Type) {
		this._cache[cacheName] = cacheValue;
	}

	getCache<Type>(cacheName: string): Type {
		return <Type>this._cache[cacheName];
	}
}
