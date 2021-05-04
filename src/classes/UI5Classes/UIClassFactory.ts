import { AbstractUIClass, UIAggregation, UIAssociation, UIEvent, UIField, UIMethod, UIProperty } from "./UI5Parser/UIClass/AbstractUIClass";
import { CustomUIClass } from "./UI5Parser/UIClass/CustomUIClass";
import { StandardUIClass } from "./UI5Parser/UIClass/StandardUIClass";
import { JSClass } from "./UI5Parser/UIClass/JSClass";
import { AcornSyntaxAnalyzer } from "./JSParser/AcornSyntaxAnalyzer";
import * as vscode from "vscode";
import { FileReader, Fragment, View } from "../utils/FileReader";
import LineColumn = require("line-column");

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

	public static setNewContentForClassUsingDocument(document: vscode.TextDocument) {
		const documentText = document.getText();
		const currentClassName = FileReader.getClassNameFromPath(document.fileName);

		if (currentClassName && documentText) {
			this.setNewCodeForClass(currentClassName, documentText);
		}
	}

	public static setNewCodeForClass(classNameDotNotation: string, classFileText: string) {
		if (!this._UIClasses[classNameDotNotation] || (<CustomUIClass>this._UIClasses[classNameDotNotation]).classText.length !== classFileText.length) {
			// console.time(`Class parsing for ${classNameDotNotation} took`);
			this._UIClasses[classNameDotNotation] = UIClassFactory._getInstance(classNameDotNotation, classFileText);

			const UIClass = this._UIClasses[classNameDotNotation];
			if (UIClass instanceof CustomUIClass) {
				// console.time(`Enriching ${classNameDotNotation} took`);
				this.enrichTypesInCustomClass(UIClass);
				// console.timeEnd(`Enriching ${classNameDotNotation} took`);
			}
			// console.timeEnd(`Class parsing for ${classNameDotNotation} took`);
		}
	}

	public static enrichTypesInCustomClass(UIClass: CustomUIClass) {
		this._enrichVariablesWithJSDocTypes(UIClass);
		this._enrichMethodParamsWithEventType(UIClass);
		this._checkIfFieldIsUsedInXMLDocuments(UIClass);
		UIClass.methods.forEach(method => {
			AcornSyntaxAnalyzer.findMethodReturnType(method, UIClass.className, false, true);
		});
		UIClass.fields.forEach(field => {
			AcornSyntaxAnalyzer.findFieldType(field, UIClass.className, false, true);
		});
	}

	private static _checkIfFieldIsUsedInXMLDocuments(CurrentUIClass: CustomUIClass) {
		const viewsAndFragments = this._getViewsAndFragmentsOfControlHierarchically(CurrentUIClass);
		viewsAndFragments.views.forEach(viewOfTheControl => {
			CurrentUIClass.fields.forEach(field => {
				if (!field.mentionedInTheXMLDocument) {
					const regex = new RegExp(`(\\.|"|')${field.name}"`);
					if (viewOfTheControl) {
						const isFieldMentionedInTheView = regex.test(viewOfTheControl.content);
						if (isFieldMentionedInTheView) {
							field.mentionedInTheXMLDocument = true;
						} else {
							viewOfTheControl.fragments.find(fragment => {
								const isFieldMentionedInTheFragment = regex.test(fragment.content);
								if (isFieldMentionedInTheFragment) {
									field.mentionedInTheXMLDocument = true;
								}

								return isFieldMentionedInTheFragment;
							});
						}
					}

					if (!field.mentionedInTheXMLDocument) {
						const regex = new RegExp(`(\\.|"|')${field.name}`);
						const isFieldMentionedInTheView = regex.test(viewOfTheControl.content);
						if (isFieldMentionedInTheView) {
							field.mentionedInTheXMLDocument = true;

						} else {
							viewOfTheControl.fragments.find(fragment => {
								const isMethodMentionedInTheFragment = regex.test(fragment.content);
								if (isMethodMentionedInTheFragment) {
									field.mentionedInTheXMLDocument = true;
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
					const regex = new RegExp(`(\\.|"|')${method.name}"`);
					const isMethodMentionedInTheFragment = regex.test(fragment.content);
					if (isMethodMentionedInTheFragment) {
						method.isEventHandler = true;
						method.mentionedInTheXMLDocument = true;
						if (method?.acornNode?.params && method?.acornNode?.params[0]) {
							method.acornNode.params[0].jsType = "sap.ui.base.Event";
						}
					}
				}
				if (!method.isEventHandler) {
					const regex = new RegExp(`(\\.|"|')${method.name}'`);
					const isMethodMentionedInTheFragment = regex.test(fragment.content);
					if (isMethodMentionedInTheFragment) {
						method.mentionedInTheXMLDocument = true;
					}
				}
			});
		});
	}

	private static _enrichVariablesWithJSDocTypes(UIClass: CustomUIClass) {
		const classLineColumn = LineColumn(UIClass.classText);
		UIClass.comments.forEach(comment => {
			const typeDoc = comment.jsdoc?.tags?.find((tag: any) => {
				return tag.tag === "type";
			});
			if (typeDoc) {
				const commentLineColumnEnd = classLineColumn.fromIndex(comment.end);
				const commentLineColumnStart = classLineColumn.fromIndex(comment.start);
				if (commentLineColumnStart && commentLineColumnEnd) {
					const lineDifference = commentLineColumnEnd.line - commentLineColumnStart.line;
					commentLineColumnStart.line += lineDifference + 1;
					const indexOfBottomLine = classLineColumn.toIndex(commentLineColumnStart);
					const variableDeclaration = this._getAcornVariableDeclarationAtIndex(UIClass, indexOfBottomLine);
					if (variableDeclaration?.declarations && variableDeclaration.declarations[0]) {
						variableDeclaration.declarations[0]._acornSyntaxAnalyserType = typeDoc.type;
					}
				}
			}
		});
	}

	private static _getAcornVariableDeclarationAtIndex(UIClass: CustomUIClass, index: number) {
		let variableDeclaration: any | undefined;
		const method = UIClass.methods.find(method => {
			return method.acornNode?.start <= index && method.acornNode?.end >= index;
		});

		if (method && method.acornNode) {
			variableDeclaration = AcornSyntaxAnalyzer.expandAllContent(method.acornNode).find((node: any) => {
				return node.start === index && node.type === "VariableDeclaration";
			});
		}

		return variableDeclaration;
	}

	public static getFieldsAndMethodsForClass(className: string, returnDuplicates = true) {
		const fieldsAndMethods: FieldsAndMethods = {
			className: className,
			fields: [],
			methods: []
		};

		if (className) {
			fieldsAndMethods.fields = this.getClassFields(className, returnDuplicates);
			fieldsAndMethods.methods = this.getClassMethods(className, returnDuplicates);
		}

		return fieldsAndMethods;
	}

	public static getClassFields(className: string, returnDuplicates = true) {
		let fields: UIField[] = [];
		const UIClass = this.getUIClass(className);
		fields = UIClass.fields;
		if (UIClass.parentClassNameDotNotation) {
			fields = fields.concat(this.getClassFields(UIClass.parentClassNameDotNotation));
		}

		if (!returnDuplicates) {
			//remove duplicates
			fields = fields.reduce((accumulator: UIField[], field: UIField) => {
				const fieldInAccumulator = accumulator.find(accumulatorField => accumulatorField.name === field.name);
				if (!fieldInAccumulator) {
					accumulator.push(field);
				}
				return accumulator;
			}, []);
		}

		return fields;
	}

	public static getClassMethods(className: string, returnDuplicates = true) {
		const UIClass = this.getUIClass(className);
		let methods: UIMethod[] = UIClass.methods;
		if (UIClass.parentClassNameDotNotation) {
			const parentMethods = this.getClassMethods(UIClass.parentClassNameDotNotation);
			parentMethods.forEach(parentMethod => {
				if (parentMethod.returnType === UIClass.parentClassNameDotNotation) {
					parentMethod.returnType = className;
				}
			});
			methods = methods.concat(parentMethods);
		}

		//remove duplicates
		if (!returnDuplicates) {
			methods = methods.reduce((accumulator: UIMethod[], method: UIMethod) => {
				const methodInAccumulator = accumulator.find(accumulatorMethod => accumulatorMethod.name === method.name);
				if (!methodInAccumulator) {
					accumulator.push(method);
				}
				return accumulator;
			}, []);
		}

		return methods;
	}

	public static getClassEvents(className: string, returnDuplicates = true) {
		const UIClass = this.getUIClass(className);
		let events: UIEvent[] = UIClass.events;
		if (UIClass.parentClassNameDotNotation) {
			events = events.concat(this.getClassEvents(UIClass.parentClassNameDotNotation));
		}

		if (!returnDuplicates) {
			//remove duplicates
			events = events.reduce((accumulator: UIEvent[], event: UIEvent) => {
				const eventInAccumulator = accumulator.find(accumulatorEvent => accumulatorEvent.name === event.name);
				if (!eventInAccumulator) {
					accumulator.push(event);
				}
				return accumulator;
			}, []);
		}

		return events;
	}

	public static getClassAggregations(className: string, returnDuplicates = true) {
		const UIClass = this.getUIClass(className);
		let aggregations: UIAggregation[] = UIClass.aggregations;
		if (UIClass.parentClassNameDotNotation) {
			aggregations = aggregations.concat(this.getClassAggregations(UIClass.parentClassNameDotNotation));
		}

		if (!returnDuplicates) {
			//remove duplicates
			aggregations = aggregations.reduce((accumulator: UIAggregation[], aggregation: UIAggregation) => {
				const aggregationInAccumulator = accumulator.find(accumulatorAggregation => accumulatorAggregation.name === aggregation.name);
				if (!aggregationInAccumulator) {
					accumulator.push(aggregation);
				}
				return accumulator;
			}, []);
		}
		return aggregations;
	}

	public static getClassAssociations(className: string, returnDuplicates = true) {
		const UIClass = this.getUIClass(className);
		let associations: UIAssociation[] = UIClass.associations;
		if (UIClass.parentClassNameDotNotation) {
			associations = associations.concat(this.getClassAssociations(UIClass.parentClassNameDotNotation));
		}

		if (!returnDuplicates) {
			//remove duplicates
			associations = associations.reduce((accumulator: UIAssociation[], association: UIAssociation) => {
				const associationInAccumulator = accumulator.find(accumulatorAssociation => accumulatorAssociation.name === association.name);
				if (!associationInAccumulator) {
					accumulator.push(association);
				}
				return accumulator;
			}, []);
		}
		return associations;
	}

	public static getClassProperties(className: string, returnDuplicates = true) {
		const UIClass = this.getUIClass(className);
		let properties: UIProperty[] = UIClass.properties;
		if (UIClass.parentClassNameDotNotation) {
			properties = properties.concat(this.getClassProperties(UIClass.parentClassNameDotNotation));
		}

		if (!returnDuplicates) {
			//remove duplicates
			properties = properties.reduce((accumulator: UIProperty[], property: UIProperty) => {
				const propertyInAccumulator = accumulator.find(accumulatorProperty => accumulatorProperty.name === property.name);
				if (!propertyInAccumulator) {
					accumulator.push(property);
				}
				return accumulator;
			}, []);
		}
		return properties;
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
		// console.time(`Enriching types ${CurrentUIClass.className}`);
		this._enrichMethodParamsWithEventTypeFromViewAndFragments(CurrentUIClass);
		this._enrichMethodParamsWithEventTypeFromAttachEvents(CurrentUIClass);
		// console.timeEnd(`Enriching types ${CurrentUIClass.className}`);
	}

	private static _enrichMethodParamsWithEventTypeFromViewAndFragments(CurrentUIClass: CustomUIClass) {
		const viewsAndFragments = this._getViewsAndFragmentsOfControlHierarchically(CurrentUIClass);
		viewsAndFragments.views.forEach(viewOfTheControl => {
			CurrentUIClass.methods.forEach(method => {
				if (!method.isEventHandler && !method.mentionedInTheXMLDocument) {
					const regex = new RegExp(`(\\.|"|')${method.name}"`);
					if (viewOfTheControl) {
						const isMethodMentionedInTheView = regex.test(viewOfTheControl.content);
						if (isMethodMentionedInTheView) {
							method.mentionedInTheXMLDocument = true;
							method.isEventHandler = true;
							if (method?.acornNode?.params && method?.acornNode?.params[0]) {
								method.acornNode.params[0].jsType = "sap.ui.base.Event";
							}
						} else {
							viewOfTheControl.fragments.find(fragment => {
								const isMethodMentionedInTheFragment = regex.test(fragment.content);
								if (isMethodMentionedInTheFragment) {
									method.isEventHandler = true;
									method.mentionedInTheXMLDocument = true;
									if (method?.acornNode?.params && method?.acornNode?.params[0]) {
										method.acornNode.params[0].jsType = "sap.ui.base.Event";
									}
								}

								return isMethodMentionedInTheFragment;
							});
						}
					}

					if (!method.isEventHandler && !method.mentionedInTheXMLDocument) {
						const regex = new RegExp(`(\\.|"|')${method.name}`);
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
					const regex = new RegExp(`(\\.|"|')${method.name}"`);
					const isMethodMentionedInTheFragment = regex.test(fragment.content);
					if (isMethodMentionedInTheFragment) {
						method.isEventHandler = true;
						method.mentionedInTheXMLDocument = true;
						if (method?.acornNode?.params && method?.acornNode?.params[0]) {
							method.acornNode.params[0].jsType = "sap.ui.base.Event";
						}
					}
				}
				if (!method.isEventHandler) {
					const regex = new RegExp(`(\\.|"|')${method.name}'`);
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

	public static isMethodOverriden(className: string, methodName: string) {
		let isMethodOverriden = false;
		let sameField = false;
		const UIClass = this.getUIClass(className);
		if (UIClass.parentClassNameDotNotation) {
			const fieldsAndMethods = this.getFieldsAndMethodsForClass(UIClass.parentClassNameDotNotation);
			const allMethods = fieldsAndMethods.methods;
			const allFields = fieldsAndMethods.fields;
			const sameMethod = !!allMethods.find(methodFromParent => {
				return methodFromParent.name === methodName;
			});

			if (!sameMethod) {
				sameField = !!allFields.find(fieldFromParent => {
					return fieldFromParent.name === methodName;
				});
			}

			isMethodOverriden = sameMethod || sameField;
		}

		return isMethodOverriden;
	}

	public static removeClass(className: string) {
		delete this._UIClasses[className];
	}
}