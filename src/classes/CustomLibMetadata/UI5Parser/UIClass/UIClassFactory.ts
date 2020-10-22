import { AbstractUIClass, UIField, UIMethod } from "./AbstractUIClass";
import { CustomUIClass } from "./CustomUIClass";
import { StandardUIClass } from "./StandardUIClass";
import { JSClass } from "./JSClass";
import { SyntaxAnalyzer } from "../../SyntaxAnalyzer";

export interface FieldsAndMethods {
	fields: UIField[];
	methods: UIMethod[];
}

interface UIClassMap {
	[key: string]: AbstractUIClass;
}

export class UIClassFactory {
	private static readonly UIClasses: UIClassMap = {
		Promise: new JSClass("Promise"),
		array: new JSClass("array"),
		string: new JSClass("string")
	};

	private static getInstance(className: string, documentText?: string) {
		let returnClass: AbstractUIClass;
		if (className.startsWith("sap.")) {
			returnClass = new StandardUIClass(className);
		} else {
			// console.time(`Class parsing for ${className} took`);
			returnClass = new CustomUIClass(className, documentText);
			// console.timeEnd(`Class parsing for ${className} took`);
		}

		return returnClass;
	}

	public static setNewCodeForClass(classNameDotNotation: string, classFileText: string) {
		this.UIClasses[classNameDotNotation] = UIClassFactory.getInstance(classNameDotNotation, classFileText);
	}

	public static getFieldsAndMethodsForClass(className: string) {
		const fieldsAndMethods: FieldsAndMethods = {
			fields: [],
			methods: []
		};

		if (className) {
			fieldsAndMethods.fields = this.getClassFields(className);
			fieldsAndMethods.methods = this.getClassMethods(className);
		}

		return fieldsAndMethods;
	}

	private static getClassFields(className: string) {
		let fields: UIField[] = [];
		const UIClass = this.getUIClass(className);
		fields = UIClass.fields;
		if (UIClass.parentClassNameDotNotation) {
			fields = fields.concat(this.getClassFields(UIClass.parentClassNameDotNotation));
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

	private static getClassMethods(className: string) {
		let methods: UIMethod[] = [];
		const UIClass = this.getUIClass(className);
		methods = UIClass.methods;
		if (UIClass.parentClassNameDotNotation) {
			methods = methods.concat(this.getClassMethods(UIClass.parentClassNameDotNotation));
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

	public static getUIClass(className: string) {
		if (!this.UIClasses[className]) {
			this.UIClasses[className] = UIClassFactory.getInstance(className);
			this.UIClasses[className].methods.forEach(method => {
				SyntaxAnalyzer.findMethodReturnType(method, className, false);
			});
		}

		return this.UIClasses[className];
	}
}