import { SAPNodeDAO } from "../../../librarydata/SAPNodeDAO";
import { CustomUIClass } from "../../UI5Parser/UIClass/CustomUIClass";
import { FieldsAndMethods, UIClassFactory } from "../../UIClassFactory";
import { AcornSyntaxAnalyzer } from "../AcornSyntaxAnalyzer";
import { FieldPropertyMethodGetterStrategy } from "./abstraction/FieldPropertyMethodGetterStrategy";
import * as vscode from "vscode";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "./FieldsAndMethodForPositionBeforeCurrentStrategy";

export class InnerPropertiesStrategy extends FieldPropertyMethodGetterStrategy {
	getFieldsAndMethods() {
		let fieldsAndMethods: FieldsAndMethods | undefined;

		fieldsAndMethods = this.acornGetPropertiesForParamsInCurrentPosition();

		return fieldsAndMethods;
	}

	private acornGetPropertiesForParamsInCurrentPosition() {
		let fieldsAndMethods: FieldsAndMethods | undefined;
		const currentClassName = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument();

		const activeTextEditor = vscode.window.activeTextEditor;
		if (currentClassName && activeTextEditor) {
			const position = activeTextEditor.document.offsetAt(activeTextEditor.selection.start);

			const stack = this.getStackOfNodesForInnerParamsForPosition(currentClassName, position);
			if (stack.length === 1 && stack[0].type === "NewExpression") {

				fieldsAndMethods = this.getFieldsAndMethodsForNewExpression(stack[0]);
			} else if (stack.length === 1 && stack[0].type === "CallExpression") {
				fieldsAndMethods = this.getFieldsAndMethodsForCallExpression(stack[0]);
			}
		}

		return fieldsAndMethods;
	}

	private getFieldsAndMethodsForNewExpression(newExpression: any) {
		let fieldsAndMethods: FieldsAndMethods | undefined;
		const currentClassName = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument();
		const position = vscode.window.activeTextEditor?.document.offsetAt(vscode.window.activeTextEditor.selection.start);
		if (position && currentClassName) {
			const argument = AcornSyntaxAnalyzer.findAcornNode(newExpression.arguments, position);
			const indexOfArgument = newExpression.arguments.indexOf(argument);
			if (argument && argument.type === "ObjectExpression") {

				const positionBeforeCurrentStrategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
				const stack = positionBeforeCurrentStrategy.getStackOfNodesForPosition(currentClassName, newExpression.end + 1);
				const classNameOfCurrentNewExpression = AcornSyntaxAnalyzer.findClassNameForStack(stack, currentClassName);
				if (classNameOfCurrentNewExpression) {
					const node = new SAPNodeDAO().findNode(classNameOfCurrentNewExpression);
					const constructorParameters = node?.getMetadata()?.getRawMetadata()?.constructor?.parameters;
					if (constructorParameters) {
						const settings = constructorParameters.find((parameter: any) => parameter.name === "mSettings");
						if (settings) {
							const indexOfSettings = constructorParameters.indexOf(settings);
							if (indexOfSettings === indexOfArgument) {
								fieldsAndMethods = this.generatePropertyFieldsFor(classNameOfCurrentNewExpression);
							}
						}
					}
				}
			}
		}

		return fieldsAndMethods;
	}

	private getFieldsAndMethodsForCallExpression(objectExpression: any) {
		let fieldsAndMethods: FieldsAndMethods | undefined;
		const currentClassName = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument();
		const position = vscode.window.activeTextEditor?.document.offsetAt(vscode.window.activeTextEditor.selection.start);

		if (currentClassName && position) {
			const argument = AcornSyntaxAnalyzer.findAcornNode(objectExpression.arguments, position);
			const indexOfArgument = objectExpression.arguments.indexOf(argument);
			if (argument?.type === "ObjectExpression") {
				const positionBeforeCurrentStrategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
				const stack = positionBeforeCurrentStrategy.getStackOfNodesForPosition(currentClassName, objectExpression.callee.end);
				const classNameOfCurrentObjectExpression = AcornSyntaxAnalyzer.findClassNameForStack(stack, currentClassName);
				if (classNameOfCurrentObjectExpression) {
					const methodName = objectExpression.callee?.property?.name;
					if (methodName) {
						const UIClass = <CustomUIClass>UIClassFactory.getUIClass(classNameOfCurrentObjectExpression);
						const UIMethod = UIClass.methods.find(method => method.name === methodName);
						if (UIMethod?.acornParams) {
							const acornParam = UIMethod.acornParams[indexOfArgument];
							const fields = this.generateFieldsFromArgument(argument);
							const objectForCompletionItems = this.getObjectFromObject(acornParam.customData, fields);
							if (acornParam && typeof objectForCompletionItems === "object") {
								fieldsAndMethods = {
									className: acornParam.jsType,
									methods: [],
									fields: Object.keys(objectForCompletionItems).map(key => {
										return {
											description: key,
											name: key,
											type: typeof objectForCompletionItems[key] === "string" ? objectForCompletionItems[key] : typeof objectForCompletionItems[key],
											visibility: "public"
										};
									})
								};
							}
						}
					}
				}
			} else if (argument?.type === "Literal" && indexOfArgument === 0) {
				const positionBeforeCurrentStrategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
				const className = positionBeforeCurrentStrategy.acornGetClassName(currentClassName, objectExpression.callee.end);
				if (className === "sap.ui.base.Event" && objectExpression.callee?.property?.name === "getParameter") {
					const eventHandlerData = AcornSyntaxAnalyzer.getEventHandlerData(objectExpression, currentClassName);
					if (eventHandlerData) {
						const parameters = AcornSyntaxAnalyzer.getParametersOfTheEvent(eventHandlerData.eventName, eventHandlerData.className);
						if (parameters) {
							fieldsAndMethods = {
								className: className,
								methods: [],
								fields: parameters.map(parameter => {
									return {
										name: parameter.name,
										description: `${eventHandlerData.eventName} - ${parameter.name}: ${parameter.type}`,
										type: parameter.type,
										visibility: "public"
									};
								})
							};
						}
					}
				}
			}
		}

		return fieldsAndMethods;
	}

	private generateFieldsFromArgument(argument: any) {
		let fields: string[] = [];

		const position = vscode.window.activeTextEditor?.document.offsetAt(vscode.window.activeTextEditor.selection.start);
		if (position && argument.type === "ObjectExpression" && argument.properties) {
			const property = AcornSyntaxAnalyzer.findAcornNode(argument.properties, position);
			if (property) {
				fields.push(property.key.name);

				if (property && property.value?.type === "ObjectExpression") {
					fields = fields.concat(this.generateFieldsFromArgument(property.value));
				}
			}
		}

		return fields;
	}

	private getObjectFromObject(object: any, fields: string[]): any {
		let objectToReturn;

		const field = fields.shift();
		if (field) {
			objectToReturn = object[field];

			objectToReturn = this.getObjectFromObject(objectToReturn, fields);
		} else {
			objectToReturn = object;
		}

		return objectToReturn;
	}

	private generatePropertyFieldsFor(className: string, fieldsAndMethods: FieldsAndMethods = {
		className: className,
		fields: [],
		methods: []
	}) {

		const UIClass = UIClassFactory.getUIClass(className);
		fieldsAndMethods.fields = fieldsAndMethods.fields.concat(UIClass.properties.map(property => ({
			name: property.name,
			type: property.type,
			description: property.description,
			visibility: property.visibility
		})));

		if (UIClass.parentClassNameDotNotation) {
			this.generatePropertyFieldsFor(UIClass.parentClassNameDotNotation, fieldsAndMethods);
		}

		return fieldsAndMethods;
	}

	private getStackOfNodesForInnerParamsForPosition(className: string, position: number, checkForLastPosition: boolean = false) {
		const stack: any[] = [];
		const UIClass = UIClassFactory.getUIClass(className);

		if (UIClass instanceof CustomUIClass) {
			const methodNode = UIClass.acornMethodsAndFields.find((node: any) => {
				return node.start < position && node.end >= position;
			})?.value;

			if (methodNode) {
				const methodBody = methodNode.body?.body;
				const nodeWithCurrentPosition = methodBody && AcornSyntaxAnalyzer.findAcornNode(methodBody, position);

				if (nodeWithCurrentPosition) {
					this.generateStackOfNodesForInnerPosition(nodeWithCurrentPosition, position, stack, checkForLastPosition);
				}
			}
		}

		return stack;
	}

	private generateStackOfNodesForInnerPosition(node: any, position: number, stack: any[], checkForLastPosition: boolean = false) {
		const nodeTypesToUnshift = ["CallExpression", "MemberExpression", "ThisExpression", "NewExpression", "Identifier"];
		const positionIsCorrect = node.start < position && node.end > position;
		if (node && positionIsCorrect && nodeTypesToUnshift.indexOf(node.type) > -1 && node.property?.name !== "✖" && node.property?.name !== "prototype") {
			stack.unshift(node);
		}

		const innerNode: any = AcornSyntaxAnalyzer.findInnerNode(node, position);

		if (innerNode) {
			this.generateStackOfNodesForInnerPosition(innerNode, position, stack, checkForLastPosition);
		}
	}
}