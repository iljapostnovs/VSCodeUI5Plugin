import { IUIClassFactory, TextDocument, UI5Parser } from "ui5plugin-parser";
import {
	IUIClassMap,
	IFieldsAndMethods,
	IViewsAndFragments
} from "ui5plugin-parser/dist/classes/UI5Classes/interfaces/IUIClassFactory";
import {
	IUIField,
	AbstractUIClass,
	IUIMethod,
	IUIEvent,
	IUIAggregation,
	IUIAssociation,
	IUIProperty
} from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { StandardUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/StandardUIClass";
import { IFragment, IView } from "ui5plugin-parser/dist/classes/utils/FileReader";
import { CustomTSClass } from "./classes/CustomTSClass";
import ts = require("typescript");
import { UI5Plugin } from "../../UI5Plugin";
import { ClassDeclaration, Node, Project, SourceFile } from "ts-morph";
import { UI5TSParser } from "./UI5TSParser";

export class TSClassFactory implements IUIClassFactory {
	private readonly _UIClasses: IUIClassMap = {};

	private _getInstance(
		className: string,
		classDeclaration?: ClassDeclaration,
		sourceFile?: SourceFile,
		typeChecker?: ts.TypeChecker
	) {
		let returnClass: AbstractUIClass | undefined;
		const isThisClassFromAProject = !!UI5Parser.getInstance().fileReader.getManifestForClass(className);
		if (!isThisClassFromAProject) {
			returnClass = new StandardUIClass(className);
		} else if (classDeclaration && sourceFile && typeChecker) {
			returnClass = new CustomTSClass(classDeclaration, sourceFile, typeChecker);
		}

		return returnClass;
	}

	public isClassAChildOfClassB(classA: string, classB: string): boolean {
		let isExtendedBy = false;
		const UIClass = this.getUIClass(classA);

		if (classA === classB || UIClass.interfaces.includes(classB)) {
			isExtendedBy = true;
		} else if (UIClass.parentClassNameDotNotation) {
			isExtendedBy = this.isClassAChildOfClassB(UIClass.parentClassNameDotNotation, classB);
		}

		return isExtendedBy;
	}

	public setNewContentForClassUsingDocument(document: TextDocument, force = false) {
		const documentText = document.getText();
		const currentClassName = UI5Parser.getInstance().fileReader.getClassNameFromPath(document.fileName);

		if (currentClassName && documentText) {
			this.setNewCodeForClass(currentClassName, documentText, force);
		}
	}

	public setNewCodeForClass(
		classNameDotNotation: string,
		classFileText: string,
		force = false,
		sourceFile?: SourceFile,
		project?: Project,
		enrichWithXMLReferences = true
	) {
		const classDoesNotExist = !this._UIClasses[classNameDotNotation];
		if (
			force ||
			classDoesNotExist ||
			(<CustomTSClass>this._UIClasses[classNameDotNotation]).classText.length !== classFileText.length ||
			(<CustomTSClass>this._UIClasses[classNameDotNotation]).classText !== classFileText
		) {
			// console.time(`Class parsing for ${classNameDotNotation} took`);
			if (!sourceFile && !project) {
				const fileName = UI5TSParser.getInstance().fileReader.getClassFSPathFromClassName(classNameDotNotation);
				project = fileName ? UI5TSParser.getInstance().getProject(fileName) : undefined;
				sourceFile = fileName ? project?.getSourceFile(fileName) : undefined;
			}

			if (project && sourceFile) {
				if (sourceFile.getFullText().length !== classFileText.length) {
					const textChange: ts.TextChange = {
						newText: classFileText,
						span: { start: 0, length: sourceFile.getFullText().length }
					};
					const newSourceFile = sourceFile.applyTextChanges([textChange]);
					sourceFile = newSourceFile;
				}
				const typeChecker = project.getProgram().getTypeChecker();
				const symbol = sourceFile && typeChecker.getSymbolAtLocation(sourceFile);
				if (symbol && classNameDotNotation) {
					const exports = typeChecker.getExportsOfModule(symbol);
					const theExport = exports.find(
						theExport =>
							theExport.getName() === "default" &&
							theExport.getDeclarations()?.find(declaration => Node.isClassDeclaration(declaration))
					);
					const classDeclaration = theExport
						?.getDeclarations()
						?.find(declaration => Node.isClassDeclaration(declaration));

					if (classDeclaration && Node.isClassDeclaration(classDeclaration)) {
						const theClass = this._getInstance(
							classNameDotNotation,
							classDeclaration,
							sourceFile,
							typeChecker.compilerObject
						);
						if (theClass) {
							this._UIClasses[classNameDotNotation] = theClass;
						}
					}
				}
			}

			const UIClass = this._UIClasses[classNameDotNotation];
			if (UIClass instanceof CustomTSClass && enrichWithXMLReferences) {
				this.enrichTypesInCustomClass(UIClass);
			}
			// console.timeEnd(`Class parsing for ${classNameDotNotation} took`);
		}
	}

	/*@ts-expect-error: oh well */
	public enrichTypesInCustomClass(UIClass: CustomTSClass) {
		//do nothing
		this._checkIfMembersAreUsedInXMLDocuments(UIClass);
	}

	private _checkIfMembersAreUsedInXMLDocuments(CurrentUIClass: CustomTSClass) {
		const viewsAndFragments = this.getViewsAndFragmentsOfControlHierarchically(
			CurrentUIClass,
			[],
			true,
			true,
			true
		);
		const XMLDocuments = [...viewsAndFragments.views, ...viewsAndFragments.fragments];
		XMLDocuments.forEach(XMLDocument => {
			CurrentUIClass.methods.forEach(method => {
				if (!method.mentionedInTheXMLDocument) {
					const regex = new RegExp(`(\\.|"|')${method.name}(\\.|"|'|\\()`);
					method.mentionedInTheXMLDocument = regex.test(XMLDocument.content);
				}
			});
			CurrentUIClass.fields.forEach(field => {
				if (!field.mentionedInTheXMLDocument) {
					const regex = new RegExp(`(\\.|"|')${field.name}("|'|\\.)`);
					if (XMLDocument) {
						const isFieldMentionedInTheView = regex.test(XMLDocument.content);
						if (isFieldMentionedInTheView) {
							field.mentionedInTheXMLDocument = true;
						}
					}
				}
			});
		});
	}

	public getFieldsAndMethodsForClass(className: string, returnDuplicates = true) {
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

	public getClassFields(className: string, returnDuplicates = true) {
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

	public getClassMethods(className: string, returnDuplicates = true, methods: IUIMethod[] = []) {
		const UIClass = this.getUIClass(className);
		methods.push(...UIClass.methods);
		if (UIClass.parentClassNameDotNotation) {
			this.getClassMethods(UIClass.parentClassNameDotNotation, true, methods);
		}

		//remove duplicates
		if (!returnDuplicates) {
			methods = methods.reduce((accumulator: IUIMethod[], method: IUIMethod) => {
				const methodInAccumulator = accumulator.find(
					accumulatorMethod => accumulatorMethod.name === method.name
				);
				if (!methodInAccumulator) {
					accumulator.push(method);
				}
				return accumulator;
			}, []);
		}

		return methods;
	}

	public getClassEvents(className: string, returnDuplicates = true) {
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

	public getClassAggregations(className: string, returnDuplicates = true) {
		const UIClass = this.getUIClass(className);
		let aggregations: IUIAggregation[] = UIClass.aggregations;
		if (UIClass.parentClassNameDotNotation) {
			aggregations = aggregations.concat(this.getClassAggregations(UIClass.parentClassNameDotNotation));
		}

		if (!returnDuplicates) {
			//remove duplicates
			aggregations = aggregations.reduce((accumulator: IUIAggregation[], aggregation: IUIAggregation) => {
				const aggregationInAccumulator = accumulator.find(
					accumulatorAggregation => accumulatorAggregation.name === aggregation.name
				);
				if (!aggregationInAccumulator) {
					accumulator.push(aggregation);
				}
				return accumulator;
			}, []);
		}
		return aggregations;
	}

	public getClassAssociations(className: string, returnDuplicates = true) {
		const UIClass = this.getUIClass(className);
		let associations: IUIAssociation[] = UIClass.associations;
		if (UIClass.parentClassNameDotNotation) {
			associations = associations.concat(this.getClassAssociations(UIClass.parentClassNameDotNotation));
		}

		if (!returnDuplicates) {
			//remove duplicates
			associations = associations.reduce((accumulator: IUIAssociation[], association: IUIAssociation) => {
				const associationInAccumulator = accumulator.find(
					accumulatorAssociation => accumulatorAssociation.name === association.name
				);
				if (!associationInAccumulator) {
					accumulator.push(association);
				}
				return accumulator;
			}, []);
		}
		return associations;
	}

	public getClassProperties(className: string, returnDuplicates = true) {
		const UIClass = this.getUIClass(className);
		let properties: IUIProperty[] = UIClass.properties;
		if (UIClass.parentClassNameDotNotation) {
			properties = properties.concat(this.getClassProperties(UIClass.parentClassNameDotNotation));
		}

		if (!returnDuplicates) {
			//remove duplicates
			properties = properties.reduce((accumulator: IUIProperty[], property: IUIProperty) => {
				const propertyInAccumulator = accumulator.find(
					accumulatorProperty => accumulatorProperty.name === property.name
				);
				if (!propertyInAccumulator) {
					accumulator.push(property);
				}
				return accumulator;
			}, []);
		}
		return properties;
	}

	public getUIClass(className: string) {
		if (!this._UIClasses[className]) {
			const theClass = this._getInstance(className);
			if (theClass) {
				this._UIClasses[className] = theClass;
			}
			const UIClass = this._UIClasses[className];
			if (UIClass instanceof CustomTSClass) {
				this._checkIfMembersAreUsedInXMLDocuments(UIClass);
			}
		}

		return this._UIClasses[className];
	}

	/*@ts-expect-error: oh well :)*/
	getViewsAndFragmentsOfControlHierarchically(
		CurrentUIClass: CustomTSClass,
		checkedClasses: string[] = [],
		removeDuplicates = true,
		includeChildren = false,
		includeMentioned = false,
		includeParents = true
	): IViewsAndFragments {
		if (checkedClasses.includes(CurrentUIClass.className)) {
			return { fragments: [], views: [] };
		}

		if (CurrentUIClass.relatedViewsAndFragments) {
			const cache = CurrentUIClass.relatedViewsAndFragments.find(viewAndFragment => {
				const flags = viewAndFragment.flags;
				return (
					flags.removeDuplicates === removeDuplicates &&
					flags.includeChildren === includeChildren &&
					flags.includeMentioned === includeMentioned &&
					flags.includeParents === includeParents
				);
			});

			if (cache) {
				return cache;
			}
		}

		checkedClasses.push(CurrentUIClass.className);
		const viewsAndFragments: IViewsAndFragments = this.getViewsAndFragmentsRelatedTo(CurrentUIClass);

		const relatedClasses: CustomTSClass[] = [];
		if (includeParents) {
			const parentUIClasses = this.getAllCustomTSClasses().filter(
				UIClass =>
					this.isClassAChildOfClassB(CurrentUIClass.className, UIClass.className) &&
					CurrentUIClass !== UIClass
			);
			relatedClasses.push(...parentUIClasses);
		}
		if (includeChildren) {
			relatedClasses.push(...this._getAllChildrenOfClass(CurrentUIClass));
		}
		if (includeMentioned) {
			const importingClasses = this._getAllClassesWhereClassIsImported(CurrentUIClass.className);
			importingClasses.forEach(importinClass => {
				relatedClasses.push(importinClass);
				relatedClasses.push(...this._getAllChildrenOfClass(importinClass));
			});
		}
		const relatedViewsAndFragments = relatedClasses.reduce(
			(accumulator: IViewsAndFragments, relatedUIClass: CustomTSClass) => {
				const relatedFragmentsAndViews = this.getViewsAndFragmentsOfControlHierarchically(
					relatedUIClass,
					checkedClasses,
					false,
					false,
					includeMentioned,
					false
				);
				accumulator.fragments = accumulator.fragments.concat(relatedFragmentsAndViews.fragments);
				accumulator.views = accumulator.views.concat(relatedFragmentsAndViews.views);
				return accumulator;
			},
			{
				views: [],
				fragments: []
			}
		);
		viewsAndFragments.fragments = viewsAndFragments.fragments.concat(relatedViewsAndFragments.fragments);
		viewsAndFragments.views = viewsAndFragments.views.concat(relatedViewsAndFragments.views);
		viewsAndFragments.views.forEach(view => {
			viewsAndFragments.fragments.push(
				...this._getFragmentFromViewManifestExtensions(CurrentUIClass.className, view)
			);
		});

		if (removeDuplicates) {
			this._removeDuplicatesForViewsAndFragments(viewsAndFragments);
		}

		if (!CurrentUIClass.relatedViewsAndFragments) {
			CurrentUIClass.relatedViewsAndFragments = [];
		}

		CurrentUIClass.relatedViewsAndFragments.push({
			...viewsAndFragments,
			flags: {
				removeDuplicates,
				includeChildren,
				includeMentioned,
				includeParents
			}
		});

		return viewsAndFragments;
	}

	private _removeDuplicatesForViewsAndFragments(viewsAndFragments: IViewsAndFragments) {
		viewsAndFragments.views.forEach(view => {
			viewsAndFragments.fragments.push(...UI5Parser.getInstance().fileReader.getFragmentsInXMLFile(view));
		});

		viewsAndFragments.fragments.forEach(fragment => {
			viewsAndFragments.fragments.push(...UI5Parser.getInstance().fileReader.getFragmentsInXMLFile(fragment));
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

	getViewsAndFragmentsRelatedTo(CurrentUIClass: CustomTSClass) {
		const viewsAndFragments: IViewsAndFragments = {
			views: [],
			fragments: []
		};

		viewsAndFragments.fragments = UI5Parser.getInstance().fileReader.getFragmentsMentionedInClass(
			CurrentUIClass.className
		);
		const views = [];
		const view = UI5Parser.getInstance().fileReader.getViewForController(CurrentUIClass.className);
		if (view) {
			views.push(view);
			viewsAndFragments.fragments.push(...view.fragments);
		}
		viewsAndFragments.views = views;

		const fragments = UI5Parser.getInstance().fileReader.getAllFragments();
		const allViews = UI5Parser.getInstance().fileReader.getAllViews();

		//check for mentioning
		fragments.forEach(fragment => {
			if (fragment.content.includes(`${CurrentUIClass.className}.`)) {
				viewsAndFragments.fragments.push(fragment);
			}
		});
		allViews.forEach(view => {
			if (view.content.includes(`${CurrentUIClass.className}.`)) {
				viewsAndFragments.views.push(view);
			}
		});

		return viewsAndFragments;
	}

	private _getAllClassesWhereClassIsImported(className: string) {
		return this.getAllCustomTSClasses().filter(UIClass => {
			return (
				UIClass.parentClassNameDotNotation !== className &&
				!!UIClass.UIDefine.find(UIDefine => {
					return UIDefine.classNameDotNotation === className;
				})
			);
		});
	}

	private _getAllChildrenOfClass(UIClass: CustomTSClass, bFirstLevelinheritance = false) {
		if (bFirstLevelinheritance) {
			return this.getAllCustomTSClasses().filter(CurrentUIClass => {
				return CurrentUIClass.parentClassNameDotNotation === UIClass.className;
			});
		} else {
			return this.getAllCustomTSClasses().filter(CurrentUIClass => {
				return (
					this.isClassAChildOfClassB(CurrentUIClass.className, UIClass.className) &&
					UIClass.className !== CurrentUIClass.className
				);
			});
		}
	}

	public getAllCustomTSClasses(): CustomTSClass[] {
		const allUIClasses = this.getAllExistentUIClasses();

		return Object.keys(allUIClasses)
			.filter(UIClassName => {
				return allUIClasses[UIClassName] instanceof CustomTSClass;
			})
			.map(UIClassName => allUIClasses[UIClassName] as CustomTSClass);
	}

	private _getFragmentFromViewManifestExtensions(className: string, view: IView) {
		const fragments: IFragment[] = [];
		const viewName = UI5Parser.getInstance().fileReader.getClassNameFromPath(view.fsPath);
		if (viewName) {
			const extensions = UI5Parser.getInstance().fileReader.getManifestExtensionsForClass(className);
			const viewExtension =
				extensions && extensions["sap.ui.viewExtensions"] && extensions["sap.ui.viewExtensions"][viewName];
			if (viewExtension) {
				Object.keys(viewExtension).forEach(key => {
					const extension = viewExtension[key];
					if (extension.type === "XML" && extension.className === "sap.ui.core.Fragment") {
						const fragmentName = extension.fragmentName;
						const fragment = UI5Parser.getInstance().fileReader.getFragment(fragmentName);
						if (fragment) {
							const fragmentsInFragment: IFragment[] =
								UI5Parser.getInstance().fileReader.getFragmentsInXMLFile(fragment);
							fragments.push(fragment, ...fragmentsInFragment);
						}
					}
				});
			}
		}

		return fragments;
	}

	public getAllExistentUIClasses() {
		return this._UIClasses;
	}

	public isMethodOverriden(className: string, methodName: string) {
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

			if (!isMethodOverriden && UIClass.interfaces.length > 0) {
				isMethodOverriden = !!UIClass.interfaces.find(theInterface => {
					const fieldsAndMethods = this.getFieldsAndMethodsForClass(theInterface);
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

					return sameMethod || sameField;
				});
			}
		}

		return isMethodOverriden;
	}

	public removeClass(className: string) {
		delete this._UIClasses[className];
	}

	public getParent(UIClass: AbstractUIClass) {
		if (UIClass.parentClassNameDotNotation) {
			return this.getUIClass(UIClass.parentClassNameDotNotation);
		}
	}

	public setNewNameForClass(oldPath: string, newPath: string) {
		const oldName = UI5Parser.getInstance().fileReader.getClassNameFromPath(oldPath);
		const newName = UI5Parser.getInstance().fileReader.getClassNameFromPath(newPath);
		if (oldName && newName) {
			const oldClass = this._UIClasses[oldName];
			if (!oldClass) {
				return;
			}
			this._UIClasses[newName] = oldClass;
			oldClass.className = newName;

			if (oldClass instanceof CustomTSClass) {
				const newClassFSPath = UI5Parser.getInstance().fileReader.convertClassNameToFSPath(
					newName,
					oldClass.fsPath?.endsWith(".controller.js") || oldClass.fsPath?.endsWith(".controller.ts")
				);
				if (newClassFSPath) {
					oldClass.fsPath = newClassFSPath;
				}
			}

			this.getAllCustomTSClasses().forEach(UIClass => {
				if (UIClass.parentClassNameDotNotation === oldName) {
					UIClass.parentClassNameDotNotation = newName;
				}
			});
		}
	}

	/*@ts-expect-error: oh well */
	public getAllCustomUIClasses(): CustomTSClass[] {
		const allUIClasses = this.getAllExistentUIClasses();

		return Object.keys(allUIClasses)
			.filter(UIClassName => {
				return allUIClasses[UIClassName] instanceof CustomTSClass;
			})
			.map(UIClassName => allUIClasses[UIClassName] as CustomTSClass);
	}

	public getDefaultModelForClass(className: string): string | undefined {
		let defaultModel;
		const UIClass = this.getUIClass(className);
		if (UIClass instanceof CustomTSClass) {
			const defaultModelOfClass = this._getClassNameOfTheModelFromManifest(UIClass);
			if (defaultModelOfClass) {
				const modelUIClass = this.getUIClass(defaultModelOfClass);
				if (modelUIClass instanceof CustomTSClass) {
					defaultModel = defaultModelOfClass;
				}
			} else if (UIClass.parentClassNameDotNotation) {
				defaultModel = this.getDefaultModelForClass(UIClass.parentClassNameDotNotation);
			}
		}

		return defaultModel;
	}

	private _getClassNameOfTheModelFromManifest(UIClass: CustomTSClass) {
		let defaultModelName: string | undefined;

		const fnForEachChild = (node: ts.Node) => {
			let necessaryNode: ts.CallExpression | undefined;
			ts.forEachChild(node, child => {
				if (necessaryNode) {
					return;
				}
				if (
					ts.isCallExpression(child) &&
					ts.isPropertyAccessExpression(child.expression) &&
					child.expression.name.escapedText === "setModel"
				) {
					necessaryNode = child;
				} else {
					necessaryNode = fnForEachChild(child);
				}
			});

			return necessaryNode;
		};
		UIClass.methods.find(method => {
			const child = fnForEachChild(method.tsNode.compilerNode);
			const args = child?.arguments;
			const firstArg = args?.[0];
			if (firstArg && ts.isCallExpression(firstArg) && ts.isStringLiteral(firstArg.arguments[0])) {
				// const modelName = firstArg.arguments[0].text;
				const modelType = UIClass.typeChecker.getTypeAtLocation(firstArg);
				const modelSymbol = modelType.getSymbol();
				const declaration = modelSymbol?.declarations?.[0];
				const sourceFile = declaration?.getSourceFile();
				const parentFileName = sourceFile?.fileName;

				if (parentFileName) {
					defaultModelName = UI5Plugin.getInstance().parser.fileReader.getClassNameFromPath(parentFileName);
				}
			}
		});

		return defaultModelName;
	}
}
