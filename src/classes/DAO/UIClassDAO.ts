import { AbstractUIClass, UIField, UIMethod } from "../SyntaxParsers/UI5Parser/UIClass/AbstractUIClass";
import { CustomUIClass } from "../SyntaxParsers/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../SyntaxParsers/UI5Parser/UIClass/UIClassFactory";
import * as vscode from "vscode";

var workspace = vscode.workspace;

export interface FieldsAndMethods {
	fields: UIField[],
	methods: UIMethod[]
}
export class UIClassDAO {
	static synchroniseCacheOnDocumentSave() {
		workspace.onDidSaveTextDocument((document) => {
			if (document.fileName.endsWith(".js")) {
				const rCurrentClass = /(?<=.*\..*\(\").*(?=\")/;
				const rCurrentClassResults = rCurrentClass.exec(document.getText());
				if (rCurrentClassResults) {
					let className = rCurrentClassResults[0];
					this.setNewCodeForClass(className, document.getText());
				}
			}
		});
	}
	private static UIClasses: UIClassMap = {}

	public static setNewCodeForClass(classNameDotNotation: string, classFileText: string) {
		this.UIClasses[classNameDotNotation] = UIClassFactory.getInstance(classNameDotNotation, classFileText);
	}

	public static getFieldsAndMethodsForVariable(variable: string, currentClassName: string, position: number) {
		let fieldsAndMethods: FieldsAndMethods = {
			fields: [],
			methods: []
		};
		const currentClass = this.getUIClass(currentClassName);
		let currentVariableClass: string | undefined;
		if (variable === "this") {
			currentVariableClass = currentClassName;
		} else {
			currentVariableClass = (<CustomUIClass>currentClass).getClassOfTheVariable(variable, position);
		}

		if (currentVariableClass) {
			fieldsAndMethods.fields = this.getClassFields(currentVariableClass);
			fieldsAndMethods.methods = this.getClassMethods(currentVariableClass);
		}

		return fieldsAndMethods;
	}

	private static getClassFields(className: string) {
		let fields: UIField[] = [];
		let UIClass = this.getUIClass(className);
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
		let UIClass = this.getUIClass(className);
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
		}

		return this.UIClasses[className];
	}

	public static getClassOfTheVariableHierarchically(variable: string, UIClass: AbstractUIClass) : string | undefined {
		let className: string | undefined;
		if (UIClass instanceof CustomUIClass) {
			className = UIClass.getClassOfTheVariable(variable, 0);

			if (!className && UIClass.parentClassNameDotNotation) {
				UIClass = this.getUIClass(UIClass.parentClassNameDotNotation);
				className = this.getClassOfTheVariableHierarchically(variable, UIClass);
			}
		}
		return className;
	}
}

interface UIClassMap {
	[key: string]: AbstractUIClass
}