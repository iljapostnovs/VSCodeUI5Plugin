import { AbstractUIClass, IUIAggregation, IUIAssociation, IUIEvent, IUIField, IUIMethod, IUIProperty } from "./UI5Parser/UIClass/AbstractUIClass";
import { CustomUIClass } from "./UI5Parser/UIClass/CustomUIClass";
import { StandardUIClass } from "./UI5Parser/UIClass/StandardUIClass";
import { JSClass } from "./UI5Parser/UIClass/JSClass";
import { AcornSyntaxAnalyzer } from "./JSParser/AcornSyntaxAnalyzer";
import * as vscode from "vscode";
import { FileReader, IFragment, IView } from "../utils/FileReader";
import LineColumn = require("line-column");

export interface IFieldsAndMethods {
	className: string;
	fields: IUIField[];
	methods: IUIMethod[];
}

interface IViewsAndFragments {
	views: IView[];
	fragments: IFragment[];
}

interface IUIClassMap {
	[key: string]: AbstractUIClass;
}
export class UIClassFactory {
	private static readonly _UIClasses: IUIClassMap = {
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

	public static setNewCodeForClass(classNameDotNotation: string, classFileText: string, force = false) {
		const classDoesntExist = !this._UIClasses[classNameDotNotation];
		if (
			force ||
			classDoesntExist ||
			(<CustomUIClass>this._UIClasses[classNameDotNotation]).classText.length !== classFileText.length ||
			(<CustomUIClass>this._UIClasses[classNameDotNotation]).classText !== classFileText
		) {
			// console.time(`Class parsing for ${classNameDotNotation} took`);
			const oldClass = this._UIClasses[classNameDotNotation];
			if (oldClass && oldClass instanceof CustomUIClass && oldClass.acornClassBody) {
				this._clearAcornNodes(oldClass);
			}
			this._UIClasses[classNameDotNotation] = UIClassFactory._getInstance(classNameDotNotation, classFileText);

			const UIClass = this._UIClasses[classNameDotNotation];
			if (UIClass instanceof CustomUIClass) {
				this.enrichTypesInCustomClass(UIClass);
			}
			// console.timeEnd(`Class parsing for ${classNameDotNotation} took`);

		}
	}
	private static _clearAcornNodes(oldClass: CustomUIClass) {
		const allContent = AcornSyntaxAnalyzer.expandAllContent(oldClass.acornClassBody);
		allContent.forEach((content: any) => {

			delete content.expandedContent;
		});
	}

	public static enrichTypesInCustomClass(UIClass: CustomUIClass) {
		// console.time(`Enriching ${UIClass.className} took`);
		this._enrichVariablesWithJSDocTypes(UIClass);
		this._enrichMethodParamsWithEventType(UIClass);
		this._checkIfFieldIsUsedInXMLDocuments(UIClass);
		UIClass.methods.forEach(method => {
			AcornSyntaxAnalyzer.findMethodReturnType(method, UIClass.className, false, true);
		});
		UIClass.fields.forEach(field => {
			AcornSyntaxAnalyzer.findFieldType(field, UIClass.className, false, true);
		});
		// console.timeEnd(`Enriching ${UIClass.className} took`);
	}

	//TODO: Refactor this mess
	private static _checkIfFieldIsUsedInXMLDocuments(CurrentUIClass: CustomUIClass) {
		const viewsAndFragments = this.getViewsAndFragmentsOfControlHierarchically(CurrentUIClass);
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
			CurrentUIClass.fields.forEach(field => {
				if (!field.mentionedInTheXMLDocument) {
					const regex = new RegExp(`\\.${field.name}\\.`);
					field.mentionedInTheXMLDocument = regex.test(fragment.content);
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
		const fieldsAndMethods: IFieldsAndMethods = {
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
		let fields: IUIField[] = [];
		const UIClass = this.getUIClass(className);
		fields = UIClass.fields;
		if (UIClass.parentClassNameDotNotation) {
			fields = fields.concat(this.getClassFields(UIClass.parentClassNameDotNotation));
		}

		if (!returnDuplicates) {
			//remove duplicates
			fields = fields.reduce((accumulator: IUIField[], field: IUIField) => {
				const fieldInAccumulator = accumulator.find(accumulatorField => accumulatorField.name === field.name);
				if (!fieldInAccumulator) {
					accumulator.push(field);
				}
				return accumulator;
			}, []);
		}

		return fields;
	}

	public static getClassMethods(className: string, returnDuplicates = true, methods: IUIMethod[] = []) {
		const UIClass = this.getUIClass(className);
		methods.push(...UIClass.methods);
		if (UIClass.parentClassNameDotNotation) {
			this.getClassMethods(UIClass.parentClassNameDotNotation, true, methods);
			// methods.forEach(parentMethod => {
			// 	if (parentMethod.returnType === UIClass.parentClassNameDotNotation) {
			// 		parentMethod.returnType = className;
			// 	}
			// });
		}

		//remove duplicates
		if (!returnDuplicates) {
			methods = methods.reduce((accumulator: IUIMethod[], method: IUIMethod) => {
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
		let events: IUIEvent[] = UIClass.events;
		if (UIClass.parentClassNameDotNotation) {
			events = events.concat(this.getClassEvents(UIClass.parentClassNameDotNotation));
		}

		if (!returnDuplicates) {
			//remove duplicates
			events = events.reduce((accumulator: IUIEvent[], event: IUIEvent) => {
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
		let aggregations: IUIAggregation[] = UIClass.aggregations;
		if (UIClass.parentClassNameDotNotation) {
			aggregations = aggregations.concat(this.getClassAggregations(UIClass.parentClassNameDotNotation));
		}

		if (!returnDuplicates) {
			//remove duplicates
			aggregations = aggregations.reduce((accumulator: IUIAggregation[], aggregation: IUIAggregation) => {
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
		let associations: IUIAssociation[] = UIClass.associations;
		if (UIClass.parentClassNameDotNotation) {
			associations = associations.concat(this.getClassAssociations(UIClass.parentClassNameDotNotation));
		}

		if (!returnDuplicates) {
			//remove duplicates
			associations = associations.reduce((accumulator: IUIAssociation[], association: IUIAssociation) => {
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
		let properties: IUIProperty[] = UIClass.properties;
		if (UIClass.parentClassNameDotNotation) {
			properties = properties.concat(this.getClassProperties(UIClass.parentClassNameDotNotation));
		}

		if (!returnDuplicates) {
			//remove duplicates
			properties = properties.reduce((accumulator: IUIProperty[], property: IUIProperty) => {
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
		const viewsAndFragments = this.getViewsAndFragmentsOfControlHierarchically(CurrentUIClass);
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

	static getViewsAndFragmentsOfControlHierarchically(CurrentUIClass: CustomUIClass, checkedClasses: string[] = [], removeDuplicates = true, isRootClass = true): IViewsAndFragments {
		if (checkedClasses.includes(CurrentUIClass.className)) {
			return { fragments: [], views: [] };
		}

		checkedClasses.push(CurrentUIClass.className);
		const viewsAndFragments: IViewsAndFragments = this._getViewsAndFragmentsRelatedTo(CurrentUIClass);

		const parentUIClasses = this._getAllCustomUIClasses().filter(UIClass => this.isClassAChildOfClassB(CurrentUIClass.className, UIClass.className) && CurrentUIClass !== UIClass);
		const whereMentioned = this._getAllClassesWhereClassIsImported(CurrentUIClass.className);
		const relatedClasses = [...parentUIClasses, ...whereMentioned];
		if (isRootClass) {
			relatedClasses.push(...this._getAllChildrenOfClass(CurrentUIClass));
		}
		const relatedViewsAndFragments = relatedClasses.reduce((accumulator: IViewsAndFragments, relatedUIClass: CustomUIClass) => {
			const relatedFragmentsAndViews = this.getViewsAndFragmentsOfControlHierarchically(relatedUIClass, checkedClasses, false, false);
			accumulator.fragments = accumulator.fragments.concat(relatedFragmentsAndViews.fragments);
			accumulator.views = accumulator.views.concat(relatedFragmentsAndViews.views);
			return accumulator;
		}, {
			views: [],
			fragments: []
		});
		viewsAndFragments.fragments = viewsAndFragments.fragments.concat(relatedViewsAndFragments.fragments);
		viewsAndFragments.views = viewsAndFragments.views.concat(relatedViewsAndFragments.views);
		viewsAndFragments.views.forEach(view => {
			viewsAndFragments.fragments.push(...this._getFragmentFromViewManifestExtensions(CurrentUIClass.className, view));
		});

		if (removeDuplicates) {
			viewsAndFragments.views.forEach(view => {
				viewsAndFragments.fragments.push(...FileReader.getFragmentsInXMLFile(view));
			});
			viewsAndFragments.fragments.forEach(fragment => {
				viewsAndFragments.fragments.push(...FileReader.getFragmentsInXMLFile(fragment));
			});
			viewsAndFragments.fragments = viewsAndFragments.fragments.reduce((accumulator: IFragment[], fragment) => {
				if (!accumulator.find(accumulatorFragment => accumulatorFragment.fsPath === fragment.fsPath)) {
					accumulator.push(fragment);
				}
				return accumulator;
			}, []);
			viewsAndFragments.views = viewsAndFragments.views.reduce((accumulator: IView[], view) => {
				if (!accumulator.find(accumulatorFragment => accumulatorFragment.fsPath === view.fsPath)) {
					accumulator.push(view);
				}
				return accumulator;
			}, []);
		}

		return viewsAndFragments;
	}

	private static _getViewsAndFragmentsRelatedTo(CurrentUIClass: CustomUIClass) {
		const viewsAndFragments: IViewsAndFragments = {
			views: [],
			fragments: []
		};

		viewsAndFragments.fragments = FileReader.getFragmentsMentionedInClass(CurrentUIClass.className);
		const views = [];
		const view = FileReader.getViewForController(CurrentUIClass.className);
		if (view) {
			views.push(view);
			viewsAndFragments.fragments.push(...view.fragments);
		}
		viewsAndFragments.views = views;

		return viewsAndFragments;
	}

	private static _getAllClassesWhereClassIsImported(className: string) {
		return this._getAllCustomUIClasses().filter(UIClass => {
			return UIClass.parentClassNameDotNotation !== className && !!UIClass.UIDefine.find(UIDefine => {
				return UIDefine.classNameDotNotation === className;
			});
		});
	}

	private static _getAllChildrenOfClass(UIClass: CustomUIClass, bFirstLevelinheritance = false) {
		return bFirstLevelinheritance ? this._getAllCustomUIClasses().filter(CurrentUIClass => {
			return CurrentUIClass.parentClassNameDotNotation === UIClass.className;
		}) : this._getAllCustomUIClasses().filter(CurrentUIClass => {
			return this.isClassAChildOfClassB(CurrentUIClass.className, UIClass.className) && UIClass.className !== CurrentUIClass.className;
		});
	}

	private static _getAllCustomUIClasses(): CustomUIClass[] {
		const allUIClasses = this.getAllExistentUIClasses();

		return Object.keys(allUIClasses).filter(UIClassName => {
			return allUIClasses[UIClassName] instanceof CustomUIClass;
		}).map(UIClassName => allUIClasses[UIClassName] as CustomUIClass);
	}

	private static _getFragmentFromViewManifestExtensions(className: string, view: IView) {
		const fragments: IFragment[] = [];
		const viewName = FileReader.getClassNameFromPath(view.fsPath);
		if (viewName) {
			const extensions = FileReader.getManifestExtensionsForClass(className);
			const viewExtension = extensions && extensions["sap.ui.viewExtensions"] && extensions["sap.ui.viewExtensions"][viewName];
			if (viewExtension) {
				Object.keys(viewExtension).forEach(key => {
					const extension = viewExtension[key];
					if (extension.type === "XML" && extension.className === "sap.ui.core.Fragment") {
						const fragmentName = extension.fragmentName;
						const fragment = FileReader.getFragment(fragmentName);
						if (fragment) {
							const fragmentsInFragment: IFragment[] = FileReader.getFragmentsInXMLFile(fragment);
							fragments.push(fragment, ...fragmentsInFragment);
						}
					}
				});
			}
		}

		return fragments;
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

	public static setNewNameForClass(oldPath: string, newPath: string) {
		const oldName = FileReader.getClassNameFromPath(oldPath);
		const newName = FileReader.getClassNameFromPath(newPath);
		if (oldName && newName) {
			const oldClass = this._UIClasses[oldName];
			this._UIClasses[newName] = oldClass;
			oldClass.className = newName;

			if (oldClass instanceof CustomUIClass) {
				const newClassFSPath = FileReader.convertClassNameToFSPath(newName, oldClass.classFSPath?.endsWith(".controller.js"));
				if (newClassFSPath) {
					oldClass.classFSPath = newClassFSPath;
				}
			}

			this._getAllCustomUIClasses().forEach(UIClass => {
				if (UIClass.parentClassNameDotNotation === oldName) {
					UIClass.parentClassNameDotNotation = newName;
				}
			});
			this.removeClass(oldName);

			const UIClass = this._UIClasses[newName];
			if (UIClass instanceof CustomUIClass && UIClass.classFSPath?.endsWith(".controller.js")) {
				const view = FileReader.getViewForController(oldName);
				if (view) {
					FileReader.removeView(view.name);
				}
			}
		}
	}
}