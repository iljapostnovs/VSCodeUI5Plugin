import { AbstractUIClass, UIField, UIMethod } from "./AbstractUIClass";
import { CustomUIClass } from "./CustomUIClass";
import { StandardUIClass } from "./StandardUIClass";
import { EndlessLoopLocker } from "../../../Util/EndlessLoopLocker";

export interface FieldsAndMethods {
	fields: UIField[];
	methods: UIMethod[];
}

interface UIClassMap {
	[key: string]: AbstractUIClass;
}

export class UIClassFactory {
	private static readonly UIClasses: UIClassMap = {};

	private static getInstance(className: string, documentText?: string) {
		let returnClass: AbstractUIClass;
		if (className.startsWith("sap.")) {
			returnClass = new StandardUIClass(className);
		} else {
			console.time(`Class parsing for ${className} took:`);
			returnClass = new CustomUIClass(className, documentText);
			console.timeEnd(`Class parsing for ${className} took:`);
		}

		return returnClass;
	}

	public static setNewCodeForClass(classNameDotNotation: string, classFileText: string) {
		this.UIClasses[classNameDotNotation] = UIClassFactory.getInstance(classNameDotNotation, classFileText);
	}

	public static getFieldsAndMethodsForVariable(variable: string, className: string, position: number) {
		const fieldsAndMethods: FieldsAndMethods = {
			fields: [],
			methods: []
		};
		const currentClass = this.getUIClass(className);
		let currentVariableClassName: string | undefined;

		if (variable === "this") {
			currentVariableClassName = className;
		} else {
			currentVariableClassName = (<CustomUIClass>currentClass).getClassOfTheVariable(variable, position);
		}

		if (currentVariableClassName) {
			fieldsAndMethods.fields = this.getClassFields(currentVariableClassName);
			fieldsAndMethods.methods = this.getClassMethods(currentVariableClassName);
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
			EndlessLoopLocker.beginProcess();
			this.UIClasses[className] = UIClassFactory.getInstance(className);
		}

		return this.UIClasses[className];
	}

	public static getClassOfTheVariableHierarchically(variable: string, UIClass: AbstractUIClass, position: number = 0) : string | undefined {
		let className: string | undefined;
		className = UIClass.getClassOfTheVariable(variable, position);

		if (!className && UIClass.parentClassNameDotNotation) {
			UIClass = this.getUIClass(UIClass.parentClassNameDotNotation);
			className = this.getClassOfTheVariableHierarchically(variable, UIClass);
		}
		return className;
	}
}