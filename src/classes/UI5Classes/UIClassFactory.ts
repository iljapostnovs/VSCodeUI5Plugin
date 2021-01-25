import { AbstractUIClass, UIEvent, UIField, UIMethod } from "./UI5Parser/UIClass/AbstractUIClass";
import { CustomUIClass } from "./UI5Parser/UIClass/CustomUIClass";
import { StandardUIClass } from "./UI5Parser/UIClass/StandardUIClass";
import { JSClass } from "./UI5Parser/UIClass/JSClass";
import { AcornSyntaxAnalyzer } from "./JSParser/AcornSyntaxAnalyzer";
import * as vscode from "vscode";
import { FileReader, Fragment, View } from "../utils/FileReader";

export interface FieldsAndMethods {
	className: string;
	fields: UIField[];
	methods: UIMethod[];
}

interface ViewsAndFragments {
	views: View[];
	fragments: Fragment[];
}

interface UIClassMap {
	[key: string]: AbstractUIClass;
}

export class UIClassFactory {
	private static readonly _UIClasses: UIClassMap = {
		Promise: new JSClass("Promise"),
		array: new JSClass("array"),
		string: new JSClass("string"),
		Array: new JSClass("Array"),
		String: new JSClass("String")
	};

	private static _getInstance(className: string, documentText?: string) {
		let returnClass: AbstractUIClass;
		const isThisClassFromAProject = !!FileReader.getManifestForClass(className);
		if (!isThisClassFromAProject) {
			returnClass = new StandardUIClass(className);
		} else {
			returnClass = new CustomUIClass(className, documentText);
		}

		return returnClass;
	}

	public static isClassAChildOfClassB(classA: string, classB: string): boolean {
		let isExtendedBy = false;
		const UIClass = this.getUIClass(classA);

		if (classA === classB || UIClass.interfaces.includes(classB)) {
			isExtendedBy = true;
		} else if (UIClass.parentClassNameDotNotation) {
			isExtendedBy = this.isClassAChildOfClassB(UIClass.parentClassNameDotNotation, classB);
		}

		return isExtendedBy;
	}

	public static setNewContentForCurrentUIClass(document: vscode.TextDocument) {
		const documentText = document.getText();
		const currentClassName = FileReader.getClassNameFromPath(document.getText());

		if (currentClassName && documentText) {
			this.setNewCodeForClass(currentClassName, documentText);
		}
	}

	public static setNewCodeForClass(classNameDotNotation: string, classFileText: string) {
		// console.time(`Class parsing for ${classNameDotNotation} took`);
		this._UIClasses[classNameDotNotation] = UIClassFactory._getInstance(classNameDotNotation, classFileText);

		const UIClass = this._UIClasses[classNameDotNotation];
		if (UIClass instanceof CustomUIClass) {
			this.enrichTypesInCustomClass(UIClass);
		}
		// console.timeEnd(`Class parsing for ${classNameDotNotation} took`);
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
		console.time(`Enriching types ${CurrentUIClass.className}`);
		this._enrichMethodParamsWithEventTypeFromViewAndFragments(CurrentUIClass);
		this._enrichMethodParamsWithEventTypeFromAttachEvents(CurrentUIClass);
		console.timeEnd(`Enriching types ${CurrentUIClass.className}`);
	}

	private static _enrichMethodParamsWithEventTypeFromViewAndFragments(CurrentUIClass: CustomUIClass) {
		const viewsAndFragments = this._getViewsAndFragmentsOfControlHierarchically(CurrentUIClass);
		viewsAndFragments.views.forEach(viewOfTheControl => {
			CurrentUIClass.methods.forEach(method => {
				if (!method.isEventHandler && !method.mentionedInTheXMLDocument) {
					const regex = new RegExp(`"\\.?${method.name}"`);
					if (viewOfTheControl) {
						const isMethodMentionedInTheView = regex.test(viewOfTheControl.content);
						if (isMethodMentionedInTheView) {
							method.isEventHandler = true;
							if (method?.acornNode?.params && method?.acornNode?.params[0]) {
								method.acornNode.params[0].jsType = "sap.ui.base.Event";
							}
						} else {
							viewOfTheControl.fragments.find(fragment => {
								const isMethodMentionedInTheFragment = regex.test(fragment.content);
								if (isMethodMentionedInTheFragment) {
									method.isEventHandler = true;
									if (method?.acornNode?.params && method?.acornNode?.params[0]) {
										method.acornNode.params[0].jsType = "sap.ui.base.Event";
									}
								}

								return isMethodMentionedInTheFragment;
							});
						}
					}

					if (!method.isEventHandler && !method.mentionedInTheXMLDocument) {
						const regex = new RegExp(`\\.?${method.name}("|')`);
						const isMethodMentionedInTheView = regex.test(viewOfTheControl.content);
						if (isMethodMentionedInTheView) {
							method.mentionedInTheXMLDocument = true;

						} else {
							viewOfTheControl.fragments.find(fragment => {
								const isMethodMentionedInTheFragment = regex.test(fragment.content);
								if (isMethodMentionedInTheFragment) {
									method.mentionedInTheXMLDocument = true;
								}

								return isMethodMentionedInTheFragment;
							});
						}
					}
				}
			});
		});

		viewsAndFragments.fragments.forEach(fragment => {
			CurrentUIClass.methods.forEach(method => {
				if (!method.isEventHandler) {
					const regex = new RegExp(`".?${method.name}"`);
					const isMethodMentionedInTheFragment = regex.test(fragment.content);
					if (isMethodMentionedInTheFragment) {
						method.isEventHandler = true;
						if (method?.acornNode?.params && method?.acornNode?.params[0]) {
							method.acornNode.params[0].jsType = "sap.ui.base.Event";
						}
					}
				}
				if (!method.isEventHandler) {
					const regex = new RegExp(`\\.?${method.name}'`);
					const isMethodMentionedInTheFragment = regex.test(fragment.content);
					if (isMethodMentionedInTheFragment) {
						method.mentionedInTheXMLDocument = true;
					}
				}
			});
		});
	}

	private static _getViewsAndFragmentsOfControlHierarchically(CurrentUIClass: CustomUIClass) {
		const isController = FileReader.getClassPathFromClassName(CurrentUIClass.className)?.endsWith(".controller.js") || false;
		const viewsAndFragments: ViewsAndFragments = {
			views: [],
			fragments: []
		};
		if (isController) {
			const allUIClasses = Object.keys(this.getAllExistentUIClasses()).map(key => this.getAllExistentUIClasses()[key]);
			const customUIClasses = allUIClasses.filter(UIClass => UIClass instanceof CustomUIClass) as CustomUIClass[];
			const childrenUIClasses = customUIClasses.filter(UIClass => this.isClassAChildOfClassB(UIClass.className, CurrentUIClass.className));
			childrenUIClasses.forEach(childUIClass => {
				const view = FileReader.getViewForController(childUIClass.className);
				if (view) {
					viewsAndFragments.views.push(view);
				}
				viewsAndFragments.fragments.push(...FileReader.getFragmentsForClass(CurrentUIClass.className));
			});
		} else {
			const fragments = FileReader.getAllFragments();
			viewsAndFragments.fragments = fragments;
			const views = FileReader.getAllViews();
			viewsAndFragments.views = views;
		}


		return viewsAndFragments;
	}

	private static _enrichMethodParamsWithEventTypeFromAttachEvents(UIClass: CustomUIClass) {
		UIClass.methods.forEach(method => {
			const eventData = AcornSyntaxAnalyzer.getEventHandlerDataFromJSClass(UIClass.className, method.name);
			if (eventData) {
				method.isEventHandler = true;
				if (method?.acornNode?.params && method?.acornNode?.params[0]) {
					method.acornNode.params[0].jsType = "sap.ui.base.Event";
				}
			}
		});
	}

	public static getAllExistentUIClasses() {
		return this._UIClasses;
	}

	public static getDefaultModelForClass(className: string): string | undefined {
		let defaultModel;
		const UIClass = this.getUIClass(className);
		if (UIClass instanceof CustomUIClass) {
			const defaultModelOfClass = AcornSyntaxAnalyzer.getClassNameOfTheModelFromManifest("", className, true);
			if (defaultModelOfClass) {
				const modelUIClass = this.getUIClass(defaultModelOfClass);
				if (modelUIClass instanceof CustomUIClass) {
					defaultModel = defaultModelOfClass;
				}
			} else if (UIClass.parentClassNameDotNotation) {
				defaultModel = this.getDefaultModelForClass(UIClass.parentClassNameDotNotation);
			}
		}

		return defaultModel;
	}
}