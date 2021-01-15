import { AbstractUIClass, UIEvent, UIField, UIMethod } from "./UI5Parser/UIClass/AbstractUIClass";
import { CustomUIClass } from "./UI5Parser/UIClass/CustomUIClass";
import { StandardUIClass } from "./UI5Parser/UIClass/StandardUIClass";
import { JSClass } from "./UI5Parser/UIClass/JSClass";
import { AcornSyntaxAnalyzer } from "./JSParser/AcornSyntaxAnalyzer";
import * as vscode from "vscode";
import { FileReader } from "../utils/FileReader";
import { XMLParser } from "../utils/XMLParser";

export interface FieldsAndMethods {
	className: string;
	fields: UIField[];
	methods: UIMethod[];
}

interface UIClassMap {
	[key: string]: AbstractUIClass;
}

export class UIClassFactory {
	private static readonly _UIClasses: UIClassMap = {
		Promise: new JSClass("Promise"),
		array: new JSClass("array"),
		string: new JSClass("string")
	};

	private static _getInstance(className: string, documentText?: string) {
		let returnClass: AbstractUIClass;
		const isThisClassFromAProject = !!FileReader.getManifestForClass(className);
		if (!isThisClassFromAProject) {
			returnClass = new StandardUIClass(className);
		} else {
			// console.time(`Class parsing for ${className} took`);
			returnClass = new CustomUIClass(className, documentText);
			// console.timeEnd(`Class parsing for ${className} took`);
		}

		return returnClass;
	}

	public static isClassAExtendedByClassB(classA: string, classB: string): boolean {
		let isExtendedBy = false;
		const UIClass = this.getUIClass(classA);

		if (classA === classB) {
			isExtendedBy = true;
		} else if (UIClass.parentClassNameDotNotation) {
			isExtendedBy = this.isClassAExtendedByClassB(UIClass.parentClassNameDotNotation, classB);
		}

		return isExtendedBy;
	}

	public static setNewContentForCurrentUIClass() {
		const documentText = vscode.window.activeTextEditor?.document.getText();
		const currentClassName = AcornSyntaxAnalyzer.getClassNameOfTheCurrentDocument();

		if (currentClassName && documentText) {
			this.setNewCodeForClass(currentClassName, documentText);
		}
	}

	public static setNewCodeForClass(classNameDotNotation: string, classFileText: string) {
		this._UIClasses[classNameDotNotation] = UIClassFactory._getInstance(classNameDotNotation, classFileText);

		const UIClass = this._UIClasses[classNameDotNotation];
		if (UIClass instanceof CustomUIClass) {
			this.enrichTypesInCustomClass(UIClass);
		}
	}

	public static enrichTypesInCustomClass(UIClass: CustomUIClass) {
		this._enrichMethodParamsWithEventType(UIClass);
		UIClass.methods.forEach(method => {
			AcornSyntaxAnalyzer.findMethodReturnType(method, UIClass.className, false, true);
		});
		UIClass.fields.forEach(field => {
			AcornSyntaxAnalyzer.findFieldType(field, UIClass.className, false, true);
		});
	}

	public static getFieldsAndMethodsForClass(className: string) {
		const fieldsAndMethods: FieldsAndMethods = {
			className: className,
			fields: [],
			methods: []
		};

		if (className) {
			fieldsAndMethods.fields = this._getClassFields(className);
			fieldsAndMethods.methods = this._getClassMethods(className);
		}

		return fieldsAndMethods;
	}

	private static _getClassFields(className: string) {
		let fields: UIField[] = [];
		const UIClass = this.getUIClass(className);
		fields = UIClass.fields;
		if (UIClass.parentClassNameDotNotation) {
			fields = fields.concat(this._getClassFields(UIClass.parentClassNameDotNotation));
		}

		//remove duplicates
		fields = fields.reduce((accumulator: UIField[], field: UIField) => {
			const fieldInAccumulator = accumulator.find(accumulatorField => accumulatorField.name === field.name);
			if (!fieldInAccumulator) {
				accumulator.push(field);
			}
			return accumulator;
		}, []);
		return fields;
	}

	private static _getClassMethods(className: string) {
		let methods: UIMethod[] = [];
		const UIClass = this.getUIClass(className);
		methods = UIClass.methods;
		if (UIClass.parentClassNameDotNotation) {
			methods = methods.concat(this._getClassMethods(UIClass.parentClassNameDotNotation));
		}

		//remove duplicates
		methods = methods.reduce((accumulator: UIMethod[], method: UIMethod) => {
			const methodInAccumulator = accumulator.find(accumulatorMethod => accumulatorMethod.name === method.name);
			if (!methodInAccumulator) {
				accumulator.push(method);
			}
			return accumulator;
		}, []);
		return methods;
	}

	public static getClassEvents(className: string) {
		const UIClass = this.getUIClass(className);
		let events: UIEvent[] = UIClass.events;
		if (UIClass.parentClassNameDotNotation) {
			events = events.concat(this.getClassEvents(UIClass.parentClassNameDotNotation));
		}

		//remove duplicates
		events = events.reduce((accumulator: UIEvent[], event: UIEvent) => {
			const eventInAccumulator = accumulator.find(accumulatorEvent => accumulatorEvent.name === event.name);
			if (!eventInAccumulator) {
				accumulator.push(event);
			}
			return accumulator;
		}, []);
		return events;
	}

	public static getUIClass(className: string) {
		if (!this._UIClasses[className]) {
			this._UIClasses[className] = UIClassFactory._getInstance(className);
			const UIClass = this._UIClasses[className];
			if (UIClass instanceof CustomUIClass) {
				this.enrichTypesInCustomClass(UIClass);
			}
		}

		return this._UIClasses[className];
	}

	private static _enrichMethodParamsWithEventType(CurrentUIClass: CustomUIClass) {
		const viewOfTheController = FileReader.getViewText(CurrentUIClass.className);
		if (viewOfTheController) {
			CurrentUIClass.methods.forEach(method => {
				const regex = new RegExp(`"\.?${method.name}"`);
				const isMethodMentionedInTheView = regex.test(viewOfTheController);
				if (isMethodMentionedInTheView) {
					if (method?.acornNode?.params && method?.acornNode?.params[0]) {
						method.acornNode.params[0].jsType = "sap.ui.base.Event";
					}
				}
			});
		}
	}
}