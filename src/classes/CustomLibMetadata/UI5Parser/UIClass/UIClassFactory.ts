import { AbstractUIClass, UIField, UIMethod } from "./AbstractUIClass";
import { CustomUIClass } from "./CustomUIClass";
import * as vscode from "vscode";
import { StandardUIClass } from "./StandardUIClass";
import { SyntaxAnalyzer } from "../../SyntaxAnalyzer";

var workspace = vscode.workspace;

export interface FieldsAndMethods {
	fields: UIField[],
	methods: UIMethod[]
}
export class UIClassFactory {
	private static UIClasses: UIClassMap = {}

	private static getInstance(className: string, documentText?: string) {
		let returnClass: AbstractUIClass;
		if (className.startsWith("sap.")) {
			returnClass = new StandardUIClass(className);
		} else {
			console.time(`Class parsing for ${className} took: `);
			returnClass = new CustomUIClass(className, documentText);
			console.timeEnd(`Class parsing for ${className} took: `);
		}

		return returnClass;
	}

	static synchroniseCacheOnDocumentSave() {
		//TODO: Add file watcher here
		workspace.onDidSaveTextDocument((document) => {
			if (document.fileName.endsWith(".js")) {
				const currentClassNameDotNotation = SyntaxAnalyzer.getCurrentClass(document.getText());
				if (currentClassNameDotNotation) {
					this.setNewCodeForClass(currentClassNameDotNotation, document.getText());
				}
			}
		});
	}

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