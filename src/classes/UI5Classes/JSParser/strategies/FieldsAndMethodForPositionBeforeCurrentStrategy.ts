import { CustomClassUIField, CustomUIClass } from "../../UI5Parser/UIClass/CustomUIClass";
import { FieldsAndMethods, UIClassFactory } from "../../UIClassFactory";
import { FieldPropertyMethodGetterStrategy as FieldMethodGetterStrategy } from "./abstraction/FieldPropertyMethodGetterStrategy";
import * as vscode from "vscode";
import { UIField } from "../../UI5Parser/UIClass/AbstractUIClass";
import { AcornSyntaxAnalyzer } from "../AcornSyntaxAnalyzer";

export class FieldsAndMethodForPositionBeforeCurrentStrategy extends FieldMethodGetterStrategy {
	getFieldsAndMethods() {
		let fieldsAndMethods: FieldsAndMethods | undefined;
		const UIClassName = this.getClassNameOfTheVariableAtCurrentDocumentPosition();
		if (UIClassName) {
			fieldsAndMethods = this.destructueFieldsAndMethodsAccordingToMapParams(UIClassName);
			if (fieldsAndMethods) {
				this.filterFieldsAndMethodsAccordingToAccessLevelModifiers(fieldsAndMethods, UIClassName);
			}
		}

		return fieldsAndMethods;
	}

	private destructueFieldsAndMethodsAccordingToMapParams(className: string) {
		let fieldsAndMethods: FieldsAndMethods | undefined;
		const classNamePartsFromFieldMap = className.split("__map__");
		const classNamePartsFromMapParam = className.split("__mapparam__");

		if (classNamePartsFromFieldMap.length > 1) {
			const className = classNamePartsFromFieldMap.shift();
			if (className) {
				const mapFields = classNamePartsFromFieldMap;
				const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
				const currentFieldName = mapFields.shift();
				const field = UIClass.fields.find(field => field.name === currentFieldName);
				if (field) {
					fieldsAndMethods = this.getFieldsAndMethodsForMap(field, mapFields);
					fieldsAndMethods.className = className;
				}
			}
		} if (classNamePartsFromMapParam.length > 1) {
			const className = classNamePartsFromMapParam.shift();
			if (className) {
				const mapFields = classNamePartsFromMapParam;
				const paramStructure = JSON.parse(mapFields[0]);
				const fieldString = mapFields[1] || "";
				const fields = fieldString.split(".");
				const correspondingObject = this.getCorrespondingObject(paramStructure, fields);
				fieldsAndMethods = {
					className: "map",
					fields: Object.keys(correspondingObject).map(key => {
						return {
							description: key,
							name: key,
							visibility: "public",
							type: typeof paramStructure[key] === "string" ? paramStructure[key] : typeof paramStructure[key]
						};
					}),
					methods: []
				};
				fieldsAndMethods.className = className;
			}
		} else {
			if (className.endsWith("[]")) {
				className = "array";
			}
			fieldsAndMethods = UIClassFactory.getFieldsAndMethodsForClass(className);
		}

		return fieldsAndMethods;
	}

	private getCorrespondingObject(paramStructure: any, fields: string[]): any {
		let returnObject;
		const field = fields.shift();
		if (field) {
			returnObject = this.getCorrespondingObject(paramStructure[field], fields);
		} else {
			returnObject = paramStructure;
		}

		return returnObject;
	}
	private filterFieldsAndMethodsAccordingToAccessLevelModifiers(fieldsAndMethods: FieldsAndMethods, className: string) {
		const ignoreAccessLevelModifiers = vscode.workspace.getConfiguration("ui5.plugin").get("ignoreAccessLevelModifiers");
		if (!ignoreAccessLevelModifiers) {
			const classNameOfTheCurrentDocument = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument();
			if (classNameOfTheCurrentDocument !== className) {
				if (fieldsAndMethods?.fields) {
					fieldsAndMethods.fields = fieldsAndMethods.fields.filter(field => field.visibility === "public");
				}
				if (fieldsAndMethods?.methods) {
					fieldsAndMethods.methods = fieldsAndMethods.methods.filter(method => method.visibility === "public");
				}
			}
		}
	}

	private getFieldsAndMethodsForMap(field: CustomClassUIField, mapFields: string[]) {
		const fieldsAndMethods: FieldsAndMethods = {
			className: "",
			fields: this.getUIFieldsForMap(field.customData, mapFields),
			methods: []
		};

		return fieldsAndMethods;
	}

	private getUIFieldsForMap(customData: any, mapFields: string[], fields: UIField[] = []) {
		const fieldName = mapFields.shift();
		if (fieldName) {
			customData = customData[fieldName];
		}

		if (mapFields.length === 0) {
			const newFields: UIField[] = Object.keys(customData).map(key => {
				return {
					name: key,
					description: "",
					type: undefined,
					visibility: "public"
				};
			});
			newFields.forEach(newField => {
				fields.push(newField);
			});
		} else {
			this.getUIFieldsForMap(customData, mapFields, fields);
		}

		return fields;
	}

	public getClassNameOfTheVariableAtCurrentDocumentPosition() {
		let UIClassName;
		AcornSyntaxAnalyzer.declarationStack = [];
		const currentClassName = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument();

		const activeTextEditor = vscode.window.activeTextEditor;
		if (currentClassName && activeTextEditor) {
			const position = activeTextEditor.document.offsetAt(activeTextEditor.selection.start);

			UIClassName = this.acornGetClassName(currentClassName, position);
		}

		return UIClassName;
	}

	public acornGetClassName(className: string, position: number) {
		let classNameOfTheCurrentVariable;
		const stack = this.getStackOfNodesForPosition(className, position);
		if (stack.length > 0) {
			classNameOfTheCurrentVariable = AcornSyntaxAnalyzer.findClassNameForStack(stack, className);
		}

		return classNameOfTheCurrentVariable;
	}

	public getStackOfNodesForPosition(className: string, position: number, checkForLastPosition: boolean = false) {
		const stack: any[] = [];
		const UIClass = UIClassFactory.getUIClass(className);

		if (UIClass instanceof CustomUIClass) {
			const methodNode = UIClass.acornMethodsAndFields.find((node: any) => {
				return node.start < position && node.end >= position;
			})?.value;

			if (methodNode) {
				const methodBody = methodNode.body?.body;
				const nodeWithCurrentPosition = methodBody && AcornSyntaxAnalyzer.findAcornNode(methodBody, position - 1);

				if (nodeWithCurrentPosition) {
					this.generateStackOfNodes(nodeWithCurrentPosition, position, stack, checkForLastPosition);
				}
			}
		}

		return stack;
	}

	private generateStackOfNodes(node: any, position: number, stack: any[], checkForLastPosition: boolean = false) {
		const nodeTypesToUnshift = ["CallExpression", "MemberExpression", "VariableDeclaration", "ThisExpression", "NewExpression", "Identifier"];
		const positionIsCorrect = node.end < position || (checkForLastPosition && node.end === position);
		if (node && positionIsCorrect && nodeTypesToUnshift.indexOf(node.type) > -1 && node.property?.name !== "✖" && node.property?.name !== "prototype") {
			stack.unshift(node);
		}

		const innerNode: any = AcornSyntaxAnalyzer.findInnerNode(node, position);

		if (innerNode) {
			this.generateStackOfNodes(innerNode, position, stack, checkForLastPosition);
		}
	}

}