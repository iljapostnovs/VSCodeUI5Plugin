import { SourceFile } from "ts-morph";
import ts = require("typescript");
import { UI5Parser } from "ui5plugin-parser";
import { ICacheable } from "ui5plugin-parser/dist/classes/UI5Classes/abstraction/ICacheable";
import {
	AbstractUIClass,
	IUIAggregation,
	IUIAssociation,
	IUIEvent,
	IUIField,
	IUIMethod,
	IUIProperty
} from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { IViewsAndFragmentsCache } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import Hjson = require("hjson");
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
		const className = UI5Parser.getInstance().fileReader.getClassNameFromPath(sourceFile.compilerNode.fileName);
		super(className ?? "");

		this.typeChecker = typeChecker;

		const heritageClause = classDeclaration.heritageClauses?.find(heritage => {
			return heritage.token == ts.SyntaxKind.ExtendsKeyword;
		});
		if (heritageClause) {
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
		}

		this.classText = sourceFile.getFullText();

		this._sourceFile = sourceFile;
		this.fsPath = sourceFile.compilerNode.fileName;
		this.tsNode = classDeclaration;

		this._fillMethods(classDeclaration, typeChecker);
		this._fillFields(classDeclaration, typeChecker);
		this._fillUIDefine();
		this._fillUI5Metadata();
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
			const positionStart = this._sourceFile.compilerNode.getLineAndCharacterOfPosition(method.getStart());
			const positionEnd = this._sourceFile.compilerNode.getLineAndCharacterOfPosition(method.getEnd());
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
				memberPropertyNode: positionStart && {
					loc: {
						start: {
							line: positionStart.line + 1,
							column: positionStart.character
						},
						end: {
							line: positionEnd.line + 1,
							column: positionEnd.character
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

	private _fillUI5Metadata() {
		const fields: ts.PropertyDeclaration[] = this.tsNode.members
			.filter(member => ts.isPropertyDeclaration(member) && ts.isIdentifier(member.name))
			.map(declaration => declaration as ts.PropertyDeclaration);

		const metadata = fields.find(field => field.name.getText() === "metadata");
		const metadataText = metadata?.initializer?.getText(this._sourceFile.compilerNode);
		if (metadataText) {
			let metadataObject: ClassInfo;
			try {
				metadataObject = Hjson.parse(metadataText) as ClassInfo;
				this._fillProperties(metadataObject);
				this._fillAggregations(metadataObject);
				this._fillEvents(metadataObject);
				this._fillAssociations(metadataObject);
				this._fillInterfaces(metadataObject);
			} catch (error: any) {
				console.error(`Couldn't parse metadata: ${error.message}`);
				return;
			}
		}
	}

	private _fillInterfaces(metadata: ClassInfo) {
		const metadataInterfaces = metadata.interfaces;
		if (!metadataInterfaces) {
			return;
		}

		this.interfaces = metadataInterfaces;
	}

	private _fillAggregations(metadata: ClassInfo) {
		const metadataAggregations = metadata.aggregations;
		if (!metadataAggregations) {
			return;
		}
		const aggregations: IUIAggregation[] = Object.keys(metadataAggregations).map(sKey => {
			const aggregation = metadataAggregations[sKey];

			return {
				name: aggregation.name ?? sKey ?? "",
				type: aggregation.type ?? "any",
				multiple: aggregation.cardinality === "0..n",
				singularName: aggregation.singularName ?? aggregation.name ?? sKey ?? "",
				description: aggregation.deprecation ?? "",
				visibility: aggregation.visibility ?? "public",
				default: false
			};
		});

		this.aggregations = aggregations;
	}

	private _fillEvents(metadata: ClassInfo) {
		const metadataEvents = metadata.events;
		if (!metadataEvents) {
			return;
		}
		const events: IUIEvent[] = Object.keys(metadataEvents).map(sKey => {
			const event = metadataEvents[sKey];

			return {
				name: event.name ?? sKey ?? "",
				description: "",
				visibility: event.visibility ?? "public",
				params: Object.keys(event.parameters ?? {}).map(sKey => {
					return {
						name: event.parameters[sKey].name ?? sKey,
						type: event.parameters[sKey].type
					};
				})
			};
		});
		this.events = events;
	}

	private _fillProperties(metadata: ClassInfo) {
		const metadataProperties = metadata.properties;
		if (!metadataProperties) {
			return;
		}
		const properties: IUIProperty[] = Object.keys(metadataProperties).map(sKey => {
			const property = metadataProperties[sKey];

			return {
				name: property.name ?? sKey ?? "",
				type: property.type ?? "any",
				visibility: property.visibility ?? "public",
				description: "",
				typeValues: this.generateTypeValues(property.type ?? "")
			};
		});

		this.properties = properties;
	}

	private _fillAssociations(metadata: ClassInfo) {
		const metadataAssociations = metadata.associations;
		if (!metadataAssociations) {
			return;
		}
		const associations: IUIAssociation[] = Object.keys(metadataAssociations).map(sKey => {
			const association = metadataAssociations[sKey];

			return {
				name: association.name ?? sKey ?? "",
				type: association.type ?? "any",
				multiple: association.cardinality === "0..n",
				singularName: association.singularName ?? association.name ?? sKey ?? "",
				description: association.deprecation ?? "",
				visibility: association.visibility ?? "public"
			};
		});

		this.associations = associations;
	}
}

interface APIMember {
	name: string;
	doc?: string;
	since?: string;
	deprecation?: string;
	experimental?: string;
	visibility?: string;
}

interface APIMemberWithMethods extends APIMember {
	methods: { [key: string]: string };
}

interface APIMemberWithType extends APIMember {
	type: string;
}

interface Property extends APIMemberWithMethods, APIMemberWithType {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	defaultValue?: any;
	bindable?: boolean;
}

interface Aggregation extends APIMemberWithMethods, APIMemberWithType {
	cardinality: "0..1" | "0..n";
	altTypes: [string];
	//dnd: any,
	singularName: string;
	bindable: boolean;
}
interface Association extends APIMemberWithMethods, APIMemberWithType {
	cardinality: "0..1" | "0..n";
	singularName: string;
}

interface UI5Event extends APIMemberWithMethods {
	allowPreventDefault: boolean;
	enableEventBubbling: boolean;
	parameters: { [key: string]: EventParameter };
}

interface EventParameter {
	name: string;
	doc: string;
	deprecation: string;
	since: string;
	experimental: string;
	type: string;
}

type SpecialSetting = APIMemberWithType;

interface ClassInfo {
	name?: string;
	interfaces?: string[];
	doc?: string;
	deprecation?: string;
	since?: string;
	experimental?: string;
	specialSettings?: { [key: string]: SpecialSetting };
	properties?: { [key: string]: Property };
	defaultProperty?: string;
	aggregations?: { [key: string]: Aggregation };
	defaultAggregation?: string;
	associations?: { [key: string]: Association };
	events?: { [key: string]: UI5Event };
	methods?: Record<string, unknown>; // TODO
	annotations?: Record<string, unknown>; // TODO
	designtime?: boolean | string;
	designTime?: boolean | string;
	stereotype?: null;
	metadataClass?: undefined;
	library?: string;
	//dnd: any,

	abstract?: boolean;
	final?: boolean;
}
