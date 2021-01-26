/* eslint-disable @typescript-eslint/no-var-requires */
import { FileReader } from "../../../utils/FileReader";
import { AcornSyntaxAnalyzer } from "../../JSParser/AcornSyntaxAnalyzer";
import * as path from "path";
import { AbstractUIClass, UIField, UIAggregation, UIEvent, UIMethod, UIProperty, UIAssociation, UIEventParam, UIMethodParam } from "./AbstractUIClass";
import * as commentParser from "comment-parser";
const acornLoose = require("acorn-loose");

interface UIDefine {
	path: string;
	className: string;
	classNameDotNotation: string;
	start: number;
	end: number;
	acornNode: any;
}
interface LooseObject {
	[key: string]: any;
}

interface Comment {
	text: string;
	start: number;
	end: number;
	jsdoc: any;
}
export interface CustomClassUIMethod extends UIMethod {
	position?: number;
	acornParams?: any;
	acornNode?: any;
	isEventHandler: boolean;
	mentionedInTheXMLDocument?: boolean;
}
export interface CustomClassUIField extends UIField {
	customData?: LooseObject;
}
export class CustomUIClass extends AbstractUIClass {
	public methods: CustomClassUIMethod[] = [];
	public fields: CustomClassUIField[] = [];
	public classText = "";
	public UIDefine: UIDefine[] = [];
	public comments: Comment[] = [];
	public acornClassBody: any;
	public acornMethodsAndFields: any[] = [];
	public fileContent: any;
	private _parentVariableName: any;
	public acornReturnedClassExtendBody: any | undefined;
	public classBodyAcornVariableName: string | undefined;
	public classFSPath: string | undefined;

	constructor(className: string, documentText?: string) {
		super(className);

		this.classFSPath = FileReader.getClassPathFromClassName(this.className);
		this._readFileContainingThisClassCode(documentText); //todo: rename. not always reading anyore.
		this.UIDefine = this._getUIDefine();
		this.acornClassBody = this._getThisClassBodyAcorn();
		this._fillParentClassNameDotNotation();
		this._fillUI5Metadata();
		this._fillMethodsAndFields();
		this._enrichMethodInfoWithJSDocs();
	}

	private _enrichMethodInfoWithJSDocs() {
		if (this.acornClassBody) {
			//instance methods
			let methods = this.acornClassBody.properties?.filter((node: any) =>
				node.value.type === "FunctionExpression" ||
				node.value.type === "ArrowFunctionExpression"
			) || [];

			const fields = this.acornClassBody.properties?.filter((node: any) =>
				node.value.type !== "FunctionExpression" &&
				node.value.type !== "ArrowFunctionExpression"
			) || [];

			//static methods
			//TODO: Move this
			const UIDefineBody = this.fileContent?.body[0]?.expression?.arguments[1]?.body?.body;
			if (UIDefineBody && this.classBodyAcornVariableName) {
				const thisClassVariableAssignments: any[] = UIDefineBody.filter((node: any) => {
					return node.type === "ExpressionStatement" &&
						(
							node.expression?.left?.object?.name === this.classBodyAcornVariableName ||
							node.expression?.left?.object?.object?.name === this.classBodyAcornVariableName
						);
				});

				const staticMethods = thisClassVariableAssignments
					.filter(node => {
						const assignmentBody = node.expression.right;
						return assignmentBody.type === "ArrowFunctionExpression" || assignmentBody.type === "FunctionExpression";
					})
					.map(node => ({
						key: {
							name: node.expression.left.property.name,
							start: node.expression.left.property.start,
							end: node.expression.left.property.end,
							type: 'Identifier'
						},
						value: node.expression.right,
						start: node.expression.left.object.start,
						end: node.expression.right.end,
						type: "Property"
					}));
				methods = methods.concat(staticMethods);
			}

			this.acornMethodsAndFields = this.acornMethodsAndFields.concat(methods);

			methods?.forEach((method: any) => {
				const methodName = method.key.name;
				const params = method.value.params;
				const comment = this.comments.find(comment => {
					const positionDifference = method.start - comment.end;
					return positionDifference < 15 && positionDifference > 0;
				});
				if (comment) {
					const paramTags = comment.jsdoc?.tags?.filter((tag: any) => tag.tag === "param");
					const returnTag = comment.jsdoc?.tags?.find((tag: any) => tag.tag === "return" || tag.tag === "returns");
					const asyncTag = comment.jsdoc?.tags?.find((tag: any) => tag.tag === "async");
					const isPrivate = !!comment.jsdoc?.tags?.find((tag: any) => tag.tag === "private");
					const isPublic = !!comment.jsdoc?.tags?.find((tag: any) => tag.tag === "public");
					const isProtected = !!comment.jsdoc?.tags?.find((tag: any) => tag.tag === "protected");
					// const fieldType = !!comment.jsdoc?.tags?.find((tag: any) => tag.tag === "type");

					const UIMethod = this.methods.find(method => method.name === methodName);
					if (paramTags && UIMethod) {
						paramTags.forEach((tag: any) => {
							this._fillParamJSTypesFromTag(tag, params, UIMethod);
						});
					}

					if (UIMethod) {
						if (isPrivate || isPublic || isProtected) {
							UIMethod.visibility = isPrivate ? "private" : isProtected ? "protected" : isPublic ? "public" : UIMethod.visibility;
						}
						if (asyncTag) {
							UIMethod.returnType = "Promise";
						} else if (returnTag) {
							UIMethod.returnType = returnTag.type;
						}
						if (comment.jsdoc) {
							UIMethod.description = comment.jsdoc.description;
						}

						if (paramTags) {
							UIMethod.params.forEach((param, i) => {
								const jsDocParam = paramTags[i];
								if (jsDocParam) {
									param.isOptional = jsDocParam.optional;
								}
							});
						}
					}
				}
			});

			fields.forEach((field: any) => {
				const fieldName = field.key.name;
				const comment = this.comments.find(comment => {
					const positionDifference = field.start - comment.end;
					return positionDifference < 15 && positionDifference > 0;
				});
				if (comment) {
					const isPrivate = !!comment.jsdoc?.tags?.find((tag: any) => tag.tag === "private");
					const isPublic = !!comment.jsdoc?.tags?.find((tag: any) => tag.tag === "public");
					const isProtected = !!comment.jsdoc?.tags?.find((tag: any) => tag.tag === "protected");
					const fieldType = comment.jsdoc?.tags?.find((tag: any) => tag.tag === "type");
					const UIField = this.fields.find(field => field.name === fieldName);
					if (UIField) {
						if (isPrivate || isPublic || isProtected) {
							UIField.visibility = isPrivate ? "private" : isProtected ? "protected" : isPublic ? "public" : UIField.visibility;
						}

						if (comment.jsdoc) {
							UIField.description = comment.jsdoc.description;
						}

						if (fieldType) {
							UIField.type = fieldType.type;
						}
					}
				}
			});
		}
	}

	private _fillParamJSTypesFromTag(tag: any, params: any[], method: CustomClassUIMethod) {
		const tagNameParts = tag.name.split(".");
		if (tagNameParts.length > 1) {
			const paramName = tagNameParts.shift();
			const param = params.find((param: any) => param.name === paramName);
			if (param) {
				if (!param.customData) {
					param.customData = {};
				}
				this._fillFieldsRecursively(param.customData, tagNameParts, tag);
			}

		} else {
			const param = params.find((param: any) => param.name === tag.name);
			if (param) {
				param.jsType = tag.type;
				const UIParam = method.params.find(param => param.name === tag.name);
				if (UIParam && param.jsType) {
					UIParam.type = param.jsType;
				}
			}

		}
	}

	private _fillFieldsRecursively(object: any, keys: string[], tag: any) {
		const key = keys.shift();
		if (key) {
			object[key] = typeof object[key] !== "object" ? {} : object[key];

			if (keys.length > 0) {
				this._fillFieldsRecursively(object[key], keys, tag);
			} else {
				object[key] = tag.type;
			}
		}
	}

	private _readFileContainingThisClassCode(documentText?: string) {
		if (!documentText) {
			documentText = FileReader.getDocumentTextFromCustomClassName(this.className);
		}
		this.classText = documentText || "";
		if (documentText) {
			try {
				this.fileContent = acornLoose.parse(documentText, {
					ecmaVersion: 11,
					onComment: (isBlock: boolean, text: string, start: number, end: number) => {
						if (isBlock && text.startsWith("*")) {
							this.comments.push({
								text: text,
								start: start,
								end: end,
								jsdoc: commentParser.parse(`/*${text}*/`)[0]
							});
						}

					}
				});
			} catch (error) {
				console.error(error);
				this.fileContent = null;
			}
		} else {
			this.classExists = false;
		}
	}

	private _getUIDefine() {
		let UIDefine: UIDefine[] = [];

		if (this.fileContent) {
			const args = this.fileContent?.body[0]?.expression?.arguments;
			if (args && args.length === 2) {
				const UIDefinePaths: string[] = args[0].elements?.map((part: any) => part.value) || [];
				const UIDefineClassNames: string[] = args[1].params?.map((part: any) => part.name) || [];
				UIDefine = UIDefinePaths
					.filter(path => !!path)
					.map((classPath, index): UIDefine => {
						return {
							path: classPath,
							className: UIDefineClassNames[index],
							classNameDotNotation: this._generateClassNameDotNotationFor(classPath),
							start: args[0].elements[index].start,
							end: args[0].elements[index].end,
							acornNode: args[0].elements[index]
						};
					});
			}
		}

		return UIDefine;
	}

	private _generateClassNameDotNotationFor(classPath: string) {
		let className = classPath.replace(/\//g, ".");

		if (classPath.startsWith(".")) {
			const manifest = FileReader.getManifestForClass(this.className);

			if (manifest && this.classFSPath) {
				const normalizedManifestPath = path.normalize(manifest.fsPath);
				const importClassPath = path.resolve(path.dirname(this.classFSPath), classPath);
				const relativeToManifest = path.relative(normalizedManifestPath, importClassPath);
				const pathRelativeToManifestDotNotation = relativeToManifest.split(path.sep).join(".");
				className = `${manifest.componentName}.${pathRelativeToManifestDotNotation}`;
			}
		}

		return className;
	}

	private _getThisClassBodyAcorn() {
		const body = this.fileContent;
		let classBody: any;

		const returnKeyword = this._getReturnKeywordFromBody();
		if (returnKeyword && body) {
			classBody = this._getClassBodyFromPartAcorn(returnKeyword.argument, body.body[0].expression.arguments[1].body);
		}

		return classBody;
	}

	private _getReturnKeywordFromBody() {
		let returnKeyword;
		const UIDefineBody = this.getUIDefineAcornBody();

		if (UIDefineBody) {
			returnKeyword = UIDefineBody.find((body: any) => body.type === "ReturnStatement");
		}

		return returnKeyword;
	}

	private _getClassBodyFromPartAcorn(part: any, partParent: any): any {
		let classBody: any;

		if (part.type === "CallExpression") {
			classBody = this._getClassBodyFromClassExtendAcorn(part);
			this.acornReturnedClassExtendBody = part;

			if (classBody) {
				this._parentVariableName = part.callee.object.name;
			}
		} else if (part.type === "ObjectExpression") {
			classBody = part;
		} else if (part.type === "Identifier") {
			const variable = partParent.body
				.filter((body: any) => body.type === "VariableDeclaration")
				.find((variable: any) =>
					variable.declarations.find((declaration: any) => declaration.id.name === part.name)
				);

			if (variable) {
				const neededDeclaration = variable.declarations.find((declaration: any) => declaration.id.name === part.name);
				classBody = this._getClassBodyFromPartAcorn(neededDeclaration.init, partParent);
				this.acornReturnedClassExtendBody = neededDeclaration.init;
				this.classBodyAcornVariableName = part.name;
			}
		}

		return classBody;
	}

	private _getClassBodyFromClassExtendAcorn(part: any) {
		let classBody: any;

		if (this._isThisPartAClassBodyAcorn(part)) {
			classBody = part.arguments[1];
		}

		return classBody;
	}

	private _isThisPartAClassBodyAcorn(part: any) {
		const propertyName = part?.callee?.property?.name;

		return propertyName === "extend" || propertyName === "declareStaticClass";
	}

	public isAssignmentStatementForThisVariable(node: any) {
		return node.type === "AssignmentExpression" &&
			node.operator === "=" &&
			node.left?.type === "MemberExpression" &&
			node.left?.property?.name &&
			node.left?.object?.type === "ThisExpression";
	}
	private _fillMethodsAndFields() {
		if (this.acornClassBody?.properties) {
			this.acornClassBody.properties?.forEach((property: any) => {
				if (property.value.type === "FunctionExpression" || property.value.type === "ArrowFunctionExpression") {
					const assignmentExpressions = AcornSyntaxAnalyzer.expandAllContent(property.value.body).filter((node: any) => node.type === "AssignmentExpression");
					assignmentExpressions?.forEach((node: any) => {
						if (this.isAssignmentStatementForThisVariable(node)) {
							this.fields.push({
								name: node.left.property.name,
								type: node.left.property.name.jsType,
								description: node.left.property.name.jsType || "",
								visibility: node.left.property.name.startsWith("_") ? "private" : "public"
							});
						}
					});
				}
			});

			this.acornClassBody.properties.forEach((property: any) => {
				if (property.value.type === "FunctionExpression" || property.value.type === "ArrowFunctionExpression") {
					const method: CustomClassUIMethod = {
						name: property.key.name,
						params: this._generateParamTextForMethod(property.value.params),
						returnType: property.returnType || property.value.async ? "Promise" : "void",
						position: property.start,
						description: "",
						visibility: property.key.name.startsWith("_") ? "private" : "public",
						acornParams: property.value.params,
						acornNode: property.value,
						isEventHandler: false
					};
					this.methods.push(method);
				} else if (property.value.type === "Identifier" || property.value.type === "Literal") {
					this.fields.push({
						name: property.key.name,
						type: property.jsType,
						description: property.jsType || "",
						visibility: property.key.name.startsWith("_") ? "private" : "public"
					});
					this.acornMethodsAndFields.push(property);
				} else if (property.value.type === "ObjectExpression") {
					this.fields.push({
						name: property.key.name,
						type: "__map__",
						description: "map",
						customData: this._generateCustomDataForObject(property.value),
						visibility: property.key.name.startsWith("_") ? "private" : "public"
					});
					this.acornMethodsAndFields.push(property);
				} else if (property.value.type === "MemberExpression") {
					this.fields.push({
						name: property.key.name,
						type: undefined,
						description: "",
						visibility: property.key.name.startsWith("_") ? "private" : "public"
					});
					this.acornMethodsAndFields.push(property);
				} else if (property.value.type === "ArrayExpression") {
					this.fields.push({
						name: property.key.name,
						type: "array",
						description: "",
						visibility: property.key.name.startsWith("_") ? "private" : "public"
					});
					this.acornMethodsAndFields.push(property);
				}
			});

			this._fillStaticMethodsAndFields();

			//remove duplicates
			this.fields = this.fields.reduce((accumulator: UIField[], field: UIField) => {
				const existingField = accumulator.find(accumulatedField => accumulatedField.name === field.name);
				if (existingField && field.type && !existingField.type) {
					accumulator[accumulator.indexOf(existingField)] = field;
				} else if (!existingField) {
					accumulator.push(field);
				}
				return accumulator;
			}, []);

			this.fields.push({
				name: "prototype",
				description: "Prototype of the class",
				type: this.className,
				visibility: "public"
			});
		}

		this._fillMethodsFromMetadata();

		const constructorMethod = this.methods.find(method => method.name === "constructor");
		if (constructorMethod) {
			constructorMethod.returnType = this.className;
		}
	}

	private _generateParamTextForMethod(acornParams: any[]) {
		const params: UIMethodParam[] = acornParams.map((param: any) => {
			let name = "";
			if (param.type === "Identifier") {
				name = param.name || "Unknown";
			} else if (param.type === "AssignmentPattern") {
				name = param.left?.name || "Unknown";
			} else {
				name = "Unknown";
			}

			return {
				name: name,
				description: "",
				type: param.jsType || "any",
				isOptional: false
			};
		});

		return params;
	}

	private _generateCustomDataForObject(node: any, looseObject: LooseObject = {}) {
		node.properties?.forEach((property: any) => {
			looseObject[property.key.name] = {};
			if (property.value.type === "ObjectExpression") {
				this._generateCustomDataForObject(property.value, looseObject[property.key.name]);
			}
		});

		return looseObject;
	}

	public getUIDefineAcornBody() {
		let UIDefineBody;
		const body = this.fileContent;

		const UIDefineBodyExists =
			this.fileContent?.body &&
			this.fileContent?.body[0]?.expression?.arguments &&
			body?.body[0]?.expression?.arguments[1]?.body?.body;

		if (UIDefineBodyExists) {
			UIDefineBody = this.fileContent?.body[0]?.expression?.arguments[1]?.body?.body;
		}

		return UIDefineBody;
	}

	private _fillStaticMethodsAndFields() {
		const UIDefineBody = this.getUIDefineAcornBody();

		if (UIDefineBody && this.classBodyAcornVariableName) {
			const thisClassVariableAssignments: any[] = UIDefineBody.filter((node: any) => {
				return node.type === "ExpressionStatement" &&
					(
						node.expression?.left?.object?.name === this.classBodyAcornVariableName ||
						node.expression?.left?.object?.object?.name === this.classBodyAcornVariableName
					);
			});

			thisClassVariableAssignments?.forEach(node => {
				const assignmentBody = node.expression.right;
				const isMethod = assignmentBody.type === "ArrowFunctionExpression" || assignmentBody.type === "FunctionExpression";
				const isField = !isMethod;

				const name = node.expression.left.property.name;
				if (isMethod) {
					const method: CustomClassUIMethod = {
						name: name,
						params: assignmentBody.params.map((param: any) => ({
							name: param.name,
							description: `${param.name} parameter`,
							type: param.jsType || ""
						})),
						returnType: assignmentBody.returnType || assignmentBody.async ? "Promise" : "void",
						position: assignmentBody.start,
						description: "",
						visibility: name?.startsWith("_") ? "private" : "public",
						acornParams: assignmentBody.params,
						acornNode: assignmentBody,
						isEventHandler: false
					};
					this.methods.push(method);
				} else if (isField) {
					this.fields.push({
						name: name,
						visibility: name?.startsWith("_") ? "private" : "public",
						type: typeof assignmentBody.value,
						description: assignmentBody.jsType || ""
					});
				}
			});
		}
	}

	public static generateDescriptionForMethod(method: UIMethod) {
		return `(${method.params.map(param => param.name).join(", ")}) : ${(method.returnType ? method.returnType : "void")}`;
	}

	public fillTypesFromHungarionNotation() {
		this.fields.forEach(field => {
			if (!field.type) {
				field.type = CustomUIClass.getTypeFromHungarianNotation(field.name);
			}
		});
	}

	public static getTypeFromHungarianNotation(variable: string): string | undefined {
		let type;

		if (variable.length >= 2) {
			const map: LooseObject = {
				$: "Element",
				o: "object",
				a: "array",
				i: "int",
				f: "float",
				m: "map",
				s: "string",
				b: "boolean",
				p: "Promise",
				d: "Date",
				r: "RegExp",
				v: "any",
				fn: "function"
			};

			variable = variable.replace("_", "").replace("this.", "");
			const firstChar = variable[0];
			const secondChar = variable[1];
			if (map[firstChar] && secondChar === secondChar.toUpperCase()) {
				type = map[firstChar];
			}
		}

		return type;
	}

	private _fillMethodsFromMetadata() {
		const additionalMethods: CustomClassUIMethod[] = [];

		this._fillPropertyMethods(additionalMethods);
		this._fillAggregationMethods(additionalMethods);
		this._fillEventMethods(additionalMethods);
		this._fillAssociationMethods(additionalMethods);

		this.methods = this.methods.concat(additionalMethods);
	}

	private _fillPropertyMethods(aMethods: CustomClassUIMethod[]) {
		this.properties?.forEach(property => {
			const propertyWithFirstBigLetter = `${property.name[0].toUpperCase()}${property.name.substring(1, property.name.length)}`;
			const getterName = `get${propertyWithFirstBigLetter}`;
			const setterName = `set${propertyWithFirstBigLetter}`;

			aMethods.push({
				name: getterName,
				description: `Getter for property ${property.name}`,
				params: [],
				returnType: property.type || "void",
				visibility: property.visibility,
				isEventHandler: false
			});

			aMethods.push({
				name: setterName,
				description: `Setter for property ${property.name}`,
				params: [{
					name: `v${propertyWithFirstBigLetter}`,
					type: "any",
					description: "Property for setting its value",
					isOptional: false
				}],
				returnType: this.className,
				visibility: property.visibility,
				isEventHandler: false
			});
		});
	}

	private _fillAggregationMethods(additionalMethods: CustomClassUIMethod[]) {
		interface method {
			name: string;
			params: UIMethodParam[];
			returnType: string;
		}
		this.aggregations?.forEach(aggregation => {
			const aggregationWithFirstBigLetter = `${aggregation.singularName[0].toUpperCase()}${aggregation.singularName.substring(1, aggregation.singularName.length)}`;

			let aMethods: method[] = [];
			if (aggregation.multiple) {
				aMethods = [
					{
						name: `get${aggregationWithFirstBigLetter}s`,
						returnType: `${aggregation.type}[]`,
						params: []
					},
					{
						name: `add${aggregationWithFirstBigLetter}`,
						returnType: this.className,
						params: [{
							name: `v${aggregationWithFirstBigLetter}`,
							type: aggregation.type,
							description: aggregation.type,
							isOptional: false
						}]
					},
					{
						name: `insert${aggregationWithFirstBigLetter}`,
						returnType: this.className,
						params: [{
							name: `v${aggregationWithFirstBigLetter}`,
							type: aggregation.type,
							description: aggregation.type,
							isOptional: false
						}, {
							name: `v${aggregationWithFirstBigLetter}`,
							type: "number",
							description: "index the item should be inserted at",
							isOptional: false
						}]
					},
					{
						name: `indexOf${aggregationWithFirstBigLetter}`,
						returnType: `int`,
						params: [{
							name: `v${aggregationWithFirstBigLetter}`,
							type: aggregation.type,
							description: aggregation.type,
							isOptional: false
						}]
					},
					{
						name: `remove${aggregationWithFirstBigLetter}`,
						returnType: `${aggregation.type}`,
						params: [{
							name: `v${aggregationWithFirstBigLetter}`,
							type: aggregation.type,
							description: aggregation.type,
							isOptional: false
						}]
					},
					{
						name: `removeAll${aggregationWithFirstBigLetter}s`,
						returnType: `${aggregation.type}[]`,
						params: []
					},
					{
						name:
							`destroy${aggregationWithFirstBigLetter}s`,
						returnType: this.className,
						params: []
					},
					{
						name: `bind${aggregationWithFirstBigLetter}s`,
						returnType: this.className,
						params: [{
							name: `oBindingInfo`,
							type: "object",
							description: "The binding information",
							isOptional: false
						}]
					},
					{
						name: `unbind${aggregationWithFirstBigLetter}s`,
						returnType: this.className,
						params: []
					}
				];
			} else {
				aMethods = [
					{
						name: `get${aggregationWithFirstBigLetter}`,
						returnType: `${aggregation.type}`,
						params: []
					},
					{
						name: `set${aggregationWithFirstBigLetter}`,
						returnType: this.className,
						params: [{
							name: `v${aggregationWithFirstBigLetter}`,
							type: aggregation.type,
							description: aggregation.type,
							isOptional: false
						}]
					},
					{
						name: `bind${aggregationWithFirstBigLetter}`,
						returnType: this.className,
						params: [{
							name: `oBindingInfo`,
							type: "object",
							description: "The binding information",
							isOptional: false
						}]
					},
					{
						name: `unbind${aggregationWithFirstBigLetter}`,
						returnType: this.className,
						params: []
					}
				];
			}

			aMethods.forEach(method => {
				additionalMethods.push({
					name: method.name,
					description: `Generic method from ${aggregation.name} aggregation`,
					params: method.params,
					returnType: method.returnType,
					visibility: aggregation.visibility,
					isEventHandler: false
				});
			});

		});
	}

	private _fillEventMethods(aMethods: CustomClassUIMethod[]) {
		this.events?.forEach(event => {
			const eventWithFirstBigLetter = `${event.name[0].toUpperCase()}${event.name.substring(1, event.name.length)}`;
			const aEventMethods = [
				{
					name: `fire${eventWithFirstBigLetter}`,
					params: [{
						name: "mEventParams",
						type: "map",
						isOptional: true,
						description: "Event params"
					}]
				}, {
					name: `attach${eventWithFirstBigLetter}`,
					params: [{
						name: "fnHandler",
						type: "function",
						isOptional: false,
						description: "Event Handler"
					}, {
						name: "oContext",
						type: "object",
						isOptional: true,
						description: "context of the event handler"
					}]
				}, {
					name: `detach${eventWithFirstBigLetter}`,
					params: [{
						name: "fnHandler",
						type: "function",
						isOptional: false,
						description: "Event Handler"
					}, {
						name: "oContext",
						type: "object",
						isOptional: true,
						description: "context of the event handler"
					}]
				}
			];

			aEventMethods?.forEach(eventMethod => {
				aMethods.push({
					name: eventMethod.name,
					description: `Generic method for event ${event.name}`,
					params: eventMethod.params,
					returnType: this.className,
					visibility: event.visibility,
					isEventHandler: false
				});
			});
		});
	}

	private _fillAssociationMethods(additionalMethods: CustomClassUIMethod[]) {
		this.associations?.forEach(association => {
			const associationWithFirstBigLetter = `${association.singularName[0].toUpperCase()}${association.singularName.substring(1, association.singularName.length)}`;

			let aMethods = [];
			if (association.multiple) {
				aMethods = [
					{
						name: `get${associationWithFirstBigLetter}`,
						params: []
					},
					{
						name: `add${associationWithFirstBigLetter}`,
						params: [{
							name: `v${associationWithFirstBigLetter}`,
							type: association.type || "any",
							isOptional: false,
							description: `Add ${associationWithFirstBigLetter}`
						}]
					},
					{
						name: `remove${associationWithFirstBigLetter}`,
						params: [{
							name: `v${associationWithFirstBigLetter}`,
							type: association.type || "any",
							isOptional: false,
							description: `Remove ${associationWithFirstBigLetter}`
						}]
					},
					{
						name: `removeAll${associationWithFirstBigLetter}s`,
						params: []
					}
				];
			} else {
				aMethods = [
					{
						name: `get${associationWithFirstBigLetter}`,
						params: []
					},
					{
						name: `set${associationWithFirstBigLetter}`,
						params: [{
							name: `v${associationWithFirstBigLetter}`,
							type: association.type || "any",
							isOptional: false,
							description: `Set ${associationWithFirstBigLetter}`
						}]
					}
				];
			}

			aMethods?.forEach(method => {
				additionalMethods.push({
					name: method.name,
					description: `Generic method from ${association.name} association`,
					params: method.params,
					returnType: association.type || this.className,
					visibility: association.visibility,
					isEventHandler: false
				});
			});

		});
	}

	private _fillParentClassNameDotNotation() {
		if (this._parentVariableName) {
			const parentClassUIDefine = this.UIDefine.find(UIDefine => UIDefine.className === this._parentVariableName);
			if (parentClassUIDefine) {
				this.parentClassNameDotNotation = parentClassUIDefine.classNameDotNotation;
			}
		}
	}

	private _fillUI5Metadata() {
		if (this.acornClassBody?.properties) {
			const metadataExists = !!this.acornClassBody.properties?.find((property: any) => property.key.name === "metadata");
			const customMetadataExists = !!this.acornClassBody.properties?.find((property: any) => property.key.name === "customMetadata");

			if (metadataExists) {
				const metadataObject = this.acornClassBody.properties?.find((property: any) => property.key.name === "metadata");

				this._fillAggregations(metadataObject);
				this._fillEvents(metadataObject);
				this._fillProperties(metadataObject);
				this._fillByAssociations(metadataObject);
				this._fillInterfaces(metadataObject);
			}

			if (customMetadataExists) {
				const customMetadataObject = this.acornClassBody.properties?.find((property: any) => property.key.name === "customMetadata");

				this._fillByAssociations(customMetadataObject);
				this._fillCustomInterfaces(customMetadataObject);
			}
		}
	}

	private _fillInterfaces(metadata: any) {
		const interfaces = metadata.value?.properties?.find((metadataNode: any) => metadataNode.key.name === "interfaces");
		if (interfaces) {
			const interfaceNamesDotNotation = interfaces.value?.elements?.map((element: any) => element.value) || [];
			this.interfaces.push(...interfaceNamesDotNotation);
		}
	}

	private _fillCustomInterfaces(customMetadata: any) {
		const interfaces = customMetadata.value?.properties?.find((metadataNode: any) => metadataNode.key.name === "interfaces");
		if (interfaces) {
			const interfaceNames: string[] = interfaces.value?.elements?.map((element: any) => element.name) || [];
			const interfaceNamesDotNotation =
				interfaceNames
					.filter((interfaceName) => {
						return !!this.UIDefine.find(UIDefine => UIDefine.className === interfaceName);

					})
					.map((interfaceName) => {
						return this.UIDefine.find(UIDefine => UIDefine.className === interfaceName)?.classNameDotNotation || "";

					});
			this.interfaces.push(...interfaceNamesDotNotation);
		}
	}

	private _fillAggregations(metadata: any) {
		const aggregations = metadata.value?.properties?.find((metadataNode: any) => metadataNode.key.name === "aggregations");

		if (aggregations) {
			this.aggregations = aggregations.value?.properties?.map((aggregationNode: any) => {
				const aggregationName = aggregationNode.key.name;
				const aggregationProps = aggregationNode.value.properties;

				let aggregationType: undefined | string = undefined;
				const aggregationTypeProp = aggregationProps?.find((aggregationProperty: any) => aggregationProperty.key.name === "type");
				if (aggregationTypeProp) {
					aggregationType = aggregationTypeProp.value.value;
				}

				let multiple = true;
				const multipleProp = aggregationProps?.find((aggregationProperty: any) => aggregationProperty.key.name === "multiple");
				if (multipleProp) {
					multiple = multipleProp.value.value;
				}

				let singularName = "";
				const singularNameProp = aggregationProps?.find((aggregationProperty: any) => aggregationProperty.key.name === "singularName");
				if (singularNameProp) {
					singularName = singularNameProp.value.value;
				}
				if (!singularName) {
					singularName = aggregationName;
				}

				let visibility = "public";
				const visibilityProp = aggregationProps?.find((associationProperty: any) => associationProperty.key.name === "visibility");
				if (visibilityProp) {
					visibility = visibilityProp.value.value;
				}

				const UIAggregations: UIAggregation = {
					name: aggregationName,
					type: aggregationType || "any",
					multiple: multiple,
					singularName: singularName,
					description: "",
					visibility: visibility,
					default: false
				};
				return UIAggregations;
			});
		}
	}

	private _fillEvents(metadata: any) {
		const eventMetadataNode = metadata.value?.properties?.find((metadataNode: any) => metadataNode.key.name === "events");

		if (eventMetadataNode) {

			const events = eventMetadataNode.value?.properties;
			this.events = events?.map((eventNode: any) => {
				let visibility = "public";
				const visibilityProp = eventNode.value?.properties?.find((node: any) => node.key.name === "visibility");
				if (visibilityProp) {
					visibility = visibilityProp.value.value;
				}

				let eventParams: UIEventParam[] = [];
				const params = eventNode.value?.properties?.find((node: any) => node.key.name === "parameters");
				if (params) {
					eventParams = params.value?.properties?.map((param: any) => {
						const type = param.value?.properties?.find((param: any) => param.key.name === "type")?.value?.value || "";
						const eventParam: UIEventParam = {
							name: param.key.name,
							type: type
						};
						return eventParam;
					}) || [];
				}
				const UIEvent: UIEvent = {
					name: eventNode.key.name,
					description: "",
					visibility: visibility,
					params: eventParams

				};
				return UIEvent;
			}) || [];
		}
	}

	private _fillProperties(metadata: any) {
		const propertiesMetadataNode = metadata.value?.properties?.find((metadataNode: any) => metadataNode.key.name === "properties");

		if (propertiesMetadataNode) {
			const properties = propertiesMetadataNode.value.properties;
			this.properties = properties.map((propertyNode: any) => {

				const propertyName = propertyNode.key.name;
				const propertyProps = propertyNode.value.properties;

				let propertyType: undefined | string = undefined;
				const propertyTypeProp = propertyProps?.find((property: any) => property.key.name === "type");
				if (propertyTypeProp) {
					propertyType = propertyTypeProp.value.value;
				}

				let visibility = "public";
				const visibilityProp = propertyProps?.find((associationProperty: any) => associationProperty.key.name === "visibility");
				if (visibilityProp) {
					visibility = visibilityProp.value.value;
				}

				const UIProperties: UIProperty = {
					name: propertyName,
					type: propertyType,
					visibility: visibility,
					description: "",
					typeValues: this.generateTypeValues(propertyType || "")
				};

				return UIProperties;
			});
		}
	}

	private _fillByAssociations(metadata: any) {
		const associationMetadataNode = metadata.value?.properties?.find((metadataNode: any) => metadataNode.key.name === "associations");

		if (associationMetadataNode) {
			const associations = associationMetadataNode.value.properties;
			this.associations = this.associations.concat(associations.map((associationNode: any) => {

				const associationName = associationNode.key.name;
				const associationProps = associationNode.value.properties;

				let associationType: undefined | string = undefined;
				const associationTypeProp = associationProps?.find((associationProperty: any) => associationProperty.key.name === "type");
				if (associationTypeProp) {
					associationType = associationTypeProp.value.value;
				}

				let multiple = true;
				const multipleProp = associationProps?.find((associationProperty: any) => associationProperty.key.name === "multiple");
				if (multipleProp) {
					multiple = multipleProp.value.value;
				}

				let singularName = "";
				const singularNameProp = associationProps?.find((associationProperty: any) => associationProperty.key.name === "singularName");
				if (singularNameProp) {
					singularName = singularNameProp.value.value;
				}
				if (!singularName) {
					singularName = associationName;
				}

				let visibility = "public";
				const visibilityProp = associationProps?.find((associationProperty: any) => associationProperty.key.name === "visibility");
				if (visibilityProp) {
					visibility = visibilityProp.value.value;
				}

				const UIAssociations: UIAssociation = {
					name: associationName,
					type: associationType,
					multiple: multiple,
					singularName: singularName,
					description: "",
					visibility: visibility
				};
				return UIAssociations;
			}));
		}
	}
}
