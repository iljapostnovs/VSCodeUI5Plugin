import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "ui5plugin-parser/dist/classes/UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { IAbstract, IStatic } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { IXMLFile, IFragment, IView } from "ui5plugin-parser/dist/classes/utils/FileReader";
import { WorkspaceFolder } from "vscode";
import { CustomTSClass } from "../../../../typescript/parsing/classes/CustomTSClass";
import { UI5Plugin } from "../../../../UI5Plugin";
import { DiagramGenerator } from "../abstraction/DiagramGenerator";

export class ClassDiagramGenerator extends DiagramGenerator {
	getFileExtension() {
		return ".plantuml";
	}

	async generate(wsFolder: WorkspaceFolder) {
		let diagram =
			"@startuml ClassDiagram\nskinparam linetype ortho\nset namespaceSeparator none\nskinparam dpi 300\n";

		const classNames = UI5Plugin.getInstance()
			.parser.fileReader.getAllJSClassNamesFromProject({ fsPath: wsFolder.uri.fsPath })
			.filter(className => !className.includes("-"));
		const groupedClassNames = this._groupClassNamesToPackages([...classNames]);
		Object.keys(groupedClassNames.packages).forEach(packageName => {
			const classPackage = groupedClassNames.packages[packageName];
			diagram += `namespace ${packageName} <<Rectangle>> {\n`;
			classPackage.UIClasses.forEach(UIClass => {
				diagram += this._generateClassDiagram(UIClass);
			});
			classPackage.views.forEach(view => {
				diagram += this._generateClassDiagramForXMLFile(view);
			});
			diagram += "}\n";
		});
		groupedClassNames.unpackagedClasses.forEach(className => {
			const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(className);
			if (UIClass instanceof CustomUIClass || UIClass instanceof CustomTSClass) {
				diagram += this._generateClassDiagram(UIClass);
			}
		});

		const views = UI5Plugin.getInstance()
			.parser.fileReader.getAllViews()
			.filter(XMLFile => !groupedClassNames.viewsUsed.includes(XMLFile));
		const fragments = UI5Plugin.getInstance().parser.fileReader.getAllFragments();
		const XMLFiles = [...views, ...fragments].filter((XMLFile: IXMLFile) => {
			const manifest = UI5Plugin.getInstance().parser.fileReader.getManifestForClass(XMLFile.name);
			const dependencyIsFromSameProject = manifest && manifest.fsPath.startsWith(wsFolder.uri.fsPath);
			return dependencyIsFromSameProject;
		});

		XMLFiles.forEach(XMLFile => {
			diagram += this._generateClassDiagramForXMLFile(XMLFile);
		});

		const XMLRelationships = XMLFiles.concat(groupedClassNames.viewsUsed).flatMap(XMLFile => {
			const isView = XMLFile.fsPath.endsWith(".view.xml");
			return XMLFile.fragments.map(fragment => {
				return `${XMLFile.name}${isView ? "View" : "Fragment"} ..> ${fragment.name}Fragment`;
			});
		});

		const JSClassRelationships: string[] = classNames.flatMap(className => {
			const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(className);
			if (UIClass instanceof CustomUIClass || UIClass instanceof CustomTSClass) {
				return this._generateRelationships(UIClass);
			} else {
				return [];
			}
		});

		const uniqueDependencies = [...new Set([...XMLRelationships, ...JSClassRelationships])];
		diagram += uniqueDependencies.join("\n");

		diagram += "\n@enduml";
		return diagram;
	}
	private _generateClassDiagramForXMLFile(XMLFile: IFragment) {
		const isView = XMLFile.fsPath.endsWith(".view.xml");
		return `class ${XMLFile.name}${isView ? "View" : "Fragment"} << (${isView ? "V" : "F"},${
			isView ? "orchid" : "sandybrown"
		}) >> #gainsboro ##grey {}\n`;
	}
	private _groupClassNamesToPackages(classNames: string[]) {
		const data: {
			packages: {
				[packageName: string]: {
					UIClasses: (CustomUIClass | CustomTSClass)[];
					views: IView[];
				};
			};
			viewsUsed: IView[];
			unpackagedClasses: string[];
		} = {
			packages: {},
			viewsUsed: [],
			unpackagedClasses: []
		};

		let className = classNames.pop();
		while (className) {
			const UIClass = <CustomUIClass | CustomTSClass>(
				UI5Plugin.getInstance().parser.classFactory.getUIClass(className)
			);
			if (
				UI5Plugin.getInstance().parser.classFactory.isClassAChildOfClassB(
					UIClass.className,
					"sap.ui.core.mvc.Controller"
				)
			) {
				const view = UI5Plugin.getInstance().parser.fileReader.getViewForController(className);
				if (view) {
					const UIClasses = [UIClass];
					data.viewsUsed.push(view);
					const viewName = view.name;
					const controllerName = UIClass.className;
					const viewControllerClassNames = [viewName, controllerName];

					const modelName = UI5Plugin.getInstance().parser.classFactory.getDefaultModelForClass(
						UIClass.className
					);
					if (modelName) {
						const model = UI5Plugin.getInstance().parser.classFactory.getUIClass(modelName);
						if (model instanceof CustomUIClass || model instanceof CustomTSClass) {
							UIClasses.push(model);
							if (classNames.includes(modelName)) {
								classNames.splice(classNames.indexOf(model.className), 1);
							}
							if (data.unpackagedClasses.includes(modelName)) {
								data.unpackagedClasses.splice(data.unpackagedClasses.indexOf(model.className), 1);
							}
						}
					}
					const packageName = this._findCommonPart(viewControllerClassNames);
					if (data.packages[packageName]) {
						data.packages[packageName].UIClasses.push(...UIClasses);
						data.packages[packageName].views.push(view);
					} else {
						data.packages[packageName] = {
							UIClasses: UIClasses,
							views: [view]
						};
					}
				} else {
					const classAlreadyUsed = Object.keys(data.packages).some(packageName => {
						const thePackage = data.packages[packageName];
						return thePackage.UIClasses.some(UIClass => UIClass.className === className);
					});
					if (!classAlreadyUsed) {
						data.unpackagedClasses.push(className);
					}
				}
			} else {
				const classAlreadyUsed = Object.keys(data.packages).some(packageName => {
					const thePackage = data.packages[packageName];
					return thePackage.UIClasses.some(UIClass => UIClass.className === className);
				});
				if (!classAlreadyUsed) {
					data.unpackagedClasses.push(className);
				}
			}

			className = classNames.pop();
		}

		return data;
	}
	private _findCommonPart(strings: string[]) {
		let commonPart = "";

		if (strings.length > 0) {
			let i = 0;
			const minLength = Math.min(...strings.map(str => str.length));
			while (i < minLength && this._getIfCharsAreIdentical(strings, i)) {
				commonPart += strings[0][i];
				i++;
			}
		}

		if (commonPart.endsWith(".")) {
			commonPart = commonPart.substring(0, commonPart.length - 1);
		}

		return commonPart;
	}

	private _getIfCharsAreIdentical(strings: string[], i: number) {
		const charsAtIndex = strings.map(string => string[i]);
		return !charsAtIndex.some(char => char !== charsAtIndex[0]);
	}

	private _generateRelationships(UIClass: CustomUIClass | CustomTSClass) {
		const relationships: string[] = [];
		const dependencies = [...new Set(this._gatherAllDependencies(UIClass))];
		const parent =
			UIClass.parentClassNameDotNotation &&
			UI5Plugin.getInstance().parser.classFactory.getUIClass(UIClass.parentClassNameDotNotation);
		if (parent instanceof CustomUIClass || parent instanceof CustomTSClass) {
			const parentIsFromSameProject = this._getIfClassesAreWithinSameProject(
				UIClass.className,
				UIClass.parentClassNameDotNotation
			);
			if (parentIsFromSameProject) {
				relationships.push(`${UIClass.parentClassNameDotNotation} <|-- ${UIClass.className}`);
			}
		}
		dependencies.forEach(dependency => {
			const dependencyClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(dependency);
			if (
				dependency !== UIClass.parentClassNameDotNotation &&
				(dependencyClass instanceof CustomUIClass || dependencyClass instanceof CustomTSClass)
			) {
				const dependencyIsFromSameProject = this._getIfClassesAreWithinSameProject(
					UIClass.className,
					dependency
				);
				if (dependencyIsFromSameProject) {
					relationships.push(`${UIClass.className} ..> ${dependency}`);
				}
			}
		});

		const fragments = UI5Plugin.getInstance().parser.fileReader.getFragmentsMentionedInClass(UIClass.className);
		const view = UI5Plugin.getInstance().parser.fileReader.getViewForController(UIClass.className);
		const XMLDocDependencies = [...fragments];
		if (view) {
			XMLDocDependencies.push(view);
		}

		XMLDocDependencies.forEach(dependency => {
			const dependencyIsFromSameProject = this._getIfClassesAreWithinSameProject(
				UIClass.className,
				dependency.name
			);
			if (dependencyIsFromSameProject) {
				const isView = dependency.fsPath.endsWith(".view.xml");
				relationships.push(`${UIClass.className} ..> ${dependency.name}${isView ? "View" : "Fragment"}`);
			}
		});

		return relationships;
	}
	private _gatherAllDependencies(UIClass: CustomUIClass | CustomTSClass) {
		const dependencies: string[] = [];
		const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(
			UI5Plugin.getInstance().parser.syntaxAnalyser
		);

		UIClass.UIDefine.forEach(UIDefine => {
			if (
				UIDefine.classNameDotNotation !== UIClass.className &&
				!UIClass.interfaces.includes(UIDefine.classNameDotNotation)
			) {
				dependencies.push(UIDefine.classNameDotNotation);
			}
		});

		UIClass.methods.forEach(UIMethod => {
			if ((<any>UIMethod).acornNode) {
				const memberExpressions = UI5Plugin.getInstance()
					.parser.syntaxAnalyser.expandAllContent((<any>UIMethod).acornNode)
					.filter((node: any) => node.type === "MemberExpression");
				memberExpressions.forEach((memberExpression: any) => {
					const className = strategy.acornGetClassName(UIClass.className, memberExpression.property.start);
					if (
						className &&
						!className.includes("__map__") &&
						className !== UIClass.className &&
						!dependencies.includes(className)
					) {
						dependencies.push(className);
					}
				});
			}
		});

		return dependencies;
	}
	private _getIfClassesAreWithinSameProject(className1: string, className2: string) {
		const thisClassManifest = UI5Plugin.getInstance().parser.fileReader.getManifestForClass(className1);
		const parentClassManifest = UI5Plugin.getInstance().parser.fileReader.getManifestForClass(className2);
		return thisClassManifest?.fsPath === parentClassManifest?.fsPath;
	}

	private _generateClassDiagram(UIClass: CustomUIClass | CustomTSClass) {
		const classColor = this._getClassColor(UIClass);
		const classOrInterface = this._getClassOrInterfaceKeyword(UIClass);
		const implementations = UIClass.interfaces.length > 0 ? ` implements ${UIClass.interfaces.join(", ")}` : "";
		const stereotype = this._getStereotype(UIClass);
		const isAbstract = UIClass.abstract ? "abstract " : "";
		let classDiagram = `${isAbstract}${classOrInterface} ${UIClass.className}${stereotype}${implementations} ${classColor}{\n`;

		UIClass.fields
			.filter(field => field.name !== "prototype")
			.forEach(UIField => {
				const visibilitySign = this._getVisibilitySign(UIField.visibility);
				const abstractStaticModifier = this._getAbstractOrStaticModifier(UIField);
				classDiagram += `\t${visibilitySign}${abstractStaticModifier}${UIField.name}: ${UIField.type}\n`;
			});
		UIClass.methods.forEach(UIMethod => {
			const visibilitySign = this._getVisibilitySign(UIMethod.visibility);
			const abstractStaticModifier = this._getAbstractOrStaticModifier(UIMethod);
			const params = UIMethod.params
				.map(param => `${param.name}${param.isOptional ? "?" : ""}: ${param.type}`)
				.join(", ");
			classDiagram += `\t${visibilitySign}${abstractStaticModifier}${UIMethod.name}(${params}): ${UIMethod.returnType}\n`;
		});

		classDiagram += "}\n";
		return classDiagram;
	}
	private _getStereotype(UIClass: CustomUIClass | CustomTSClass) {
		let stereotype = "";

		if (
			UI5Plugin.getInstance().parser.classFactory.isClassAChildOfClassB(UIClass.className, "sap.ui.model.Model")
		) {
			stereotype = " <<Model>>";
		} else if (
			UI5Plugin.getInstance().parser.classFactory.isClassAChildOfClassB(
				UIClass.className,
				"sap.ui.core.mvc.Controller"
			)
		) {
			stereotype = " <<Controller>>";
		} else if (
			UI5Plugin.getInstance().parser.classFactory.isClassAChildOfClassB(UIClass.className, "sap.ui.core.Control")
		) {
			stereotype = " <<Control>>";
		}

		return stereotype;
	}
	private _getClassOrInterfaceKeyword(UIClass: CustomUIClass | CustomTSClass) {
		let keyword = "class";
		const isInterface = !!UI5Plugin.getInstance()
			.parser.classFactory.getAllCustomUIClasses()
			.find(CustomUIClass => CustomUIClass.interfaces.includes(UIClass.className));
		if (isInterface) {
			keyword = "interface";
		}

		return keyword;
	}
	private _getClassColor(UIClass: CustomUIClass | CustomTSClass) {
		let color = "";
		const isModel = UI5Plugin.getInstance().parser.classFactory.isClassAChildOfClassB(
			UIClass.className,
			"sap.ui.model.Model"
		);
		const isController = UI5Plugin.getInstance().parser.classFactory.isClassAChildOfClassB(
			UIClass.className,
			"sap.ui.core.mvc.Controller"
		);

		if (isModel) {
			color = "#aliceblue ##lightsteelblue ";
		} else if (isController) {
			color = "#honeydew ##green ";
		}

		return color;
	}

	private _getAbstractOrStaticModifier(member: IAbstract & IStatic) {
		let modifier = "";

		if (member.abstract) {
			modifier = "{abstract} ";
		}
		if (member.static) {
			modifier = "{static} ";
		}

		return modifier;
	}

	private _getVisibilitySign(visibility: string) {
		let visibilitySign = "+ ";
		if (visibility === "protected") {
			visibilitySign = "# ";
		} else if (visibility === "private") {
			visibilitySign = "- ";
		}

		return visibilitySign;
	}
}
