import { WorkspaceFolder } from "vscode";
import { AcornSyntaxAnalyzer } from "../../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../../../UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { IAbstract, IStatic } from "../../../UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { CustomUIClass } from "../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../UI5Classes/UIClassFactory";
import { FileReader, IFragment, IView, IXMLFile } from "../../../utils/FileReader";
import { DiagramGenerator } from "../abstraction/DiagramGenerator";

export class PlantUMLDiagramGenerator extends DiagramGenerator {
	getFileExtension() {
		return ".plantuml"
	}

	async generateUMLClassDiagrams(wsFolder: WorkspaceFolder) {
		let diagram = "@startuml ClassDiagram\nskinparam linetype ortho\nset namespaceSeparator none\n";

		const classNames = FileReader.getAllJSClassNamesFromProject(wsFolder)
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
			const UIClass = UIClassFactory.getUIClass(className);
			if (UIClass instanceof CustomUIClass) {
				diagram += this._generateClassDiagram(UIClass);
			}
		});

		const views = FileReader.getAllViews().filter(XMLFile => !groupedClassNames.viewsUsed.includes(XMLFile));
		const fragments = FileReader.getAllFragments();
		const XMLFiles = [...views, ...fragments].filter((XMLFile: IXMLFile) => {
			const manifest = FileReader.getManifestForClass(XMLFile.name);
			const dependencyIsFromSameProject = manifest && manifest.fsPath.startsWith(wsFolder.uri.fsPath);
			return dependencyIsFromSameProject;
		});

		XMLFiles.forEach(XMLFile => {
			diagram += this._generateClassDiagramForXMLFile(XMLFile);
		});
		XMLFiles.concat(groupedClassNames.viewsUsed).forEach(XMLFile => {
			const isView = XMLFile.fsPath.endsWith(".view.xml");
			XMLFile.fragments.forEach(fragment => {
				diagram += `${XMLFile.name}${isView ? "View" : "Fragment"} --> ${fragment.name}Fragment\n`;
			});
		});

		classNames.forEach(className => {
			const UIClass = UIClassFactory.getUIClass(className);
			if (UIClass instanceof CustomUIClass) {
				diagram += this._generateRelationships(UIClass);
			}
		});

		diagram += "\n@enduml";
		return diagram;
	}
	private _generateClassDiagramForXMLFile(XMLFile: IFragment) {
		const isView = XMLFile.fsPath.endsWith(".view.xml");
		return `class ${XMLFile.name}${isView ? "View" : "Fragment"} << (${isView ? "V" : "F"},${isView ? "orchid" : "sandybrown"}) >> #gainsboro ##grey {}\n`;
	}
	private _groupClassNamesToPackages(classNames: string[]) {
		const data: {
			packages: {
				[packageName: string]: {
					UIClasses: CustomUIClass[],
					views: IView[]
				}
			},
			viewsUsed: IView[],
			unpackagedClasses: string[]
		} = {
			packages: {},
			viewsUsed: [],
			unpackagedClasses: []
		};

		let className = classNames.pop();
		while (className) {
			const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
			if (UIClassFactory.isClassAChildOfClassB(UIClass.className, "sap.ui.core.mvc.Controller")) {
				const view = FileReader.getViewForController(className);
				if (view) {
					const UIClasses: CustomUIClass[] = [UIClass];
					data.viewsUsed.push(view);
					const viewName = view.name;
					const controllerName = UIClass.className;
					const classNames = [viewName, controllerName];

					const modelName = UIClassFactory.getDefaultModelForClass(UIClass.className);
					if (modelName) {
						const model = UIClassFactory.getUIClass(modelName);
						if (model instanceof CustomUIClass) {
							UIClasses.push(model);
							if (classNames.includes(modelName)) {
								classNames.splice(classNames.indexOf(className), 1);
							}
						}
					}
					const packageName = this._findCommonPart(classNames);
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
					data.unpackagedClasses.push(className);
				}
			} else {
				data.unpackagedClasses.push(className);
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

	private _generateRelationships(UIClass: CustomUIClass) {
		const dependencies = this._gatherAllDependencies(UIClass);
		let diagram = "";
		if (UIClass.parentClassNameDotNotation && UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation) instanceof CustomUIClass) {
			const parentIsFromSameProject = this._getIfClassesAreWithinSameProject(UIClass.className, UIClass.parentClassNameDotNotation);
			if (parentIsFromSameProject) {
				diagram += `${UIClass.parentClassNameDotNotation} <|-- ${UIClass.className}\n`;
			}
		}
		dependencies.forEach(dependency => {
			if (dependency !== UIClass.parentClassNameDotNotation && UIClassFactory.getUIClass(dependency) instanceof CustomUIClass) {
				const dependencyIsFromSameProject = this._getIfClassesAreWithinSameProject(UIClass.className, dependency);
				if (dependencyIsFromSameProject) {
					diagram += `${UIClass.className} --> ${dependency}\n`;
				}
			}
		});

		const fragments = FileReader.getFragmentsMentionedInClass(UIClass.className);
		const view = FileReader.getViewForController(UIClass.className);
		const XMLDocDependencies = [...fragments];
		if (view) {
			XMLDocDependencies.push(view);
		}

		XMLDocDependencies.forEach(dependency => {
			const dependencyIsFromSameProject = this._getIfClassesAreWithinSameProject(UIClass.className, dependency.name);
			if (dependencyIsFromSameProject) {
				const isView = dependency.fsPath.endsWith(".view.xml");
				diagram += `${UIClass.className} --> ${dependency.name}${isView ? "View" : "Fragment"}\n`;
			}
		});

		return diagram;
	}
	private _gatherAllDependencies(UIClass: CustomUIClass) {
		const dependencies: string[] = [];
		const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();

		UIClass.UIDefine.forEach(UIDefine => {
			if (UIDefine.classNameDotNotation !== UIClass.className && !UIClass.interfaces.includes(UIDefine.classNameDotNotation)) {
				dependencies.push(UIDefine.classNameDotNotation);
			}
		});

		UIClass.methods.forEach(UIMethod => {
			if (UIMethod.acornNode) {
				const memberExpressions = AcornSyntaxAnalyzer.expandAllContent(UIMethod.acornNode).filter((node: any) => node.type === "MemberExpression");
				memberExpressions.forEach((memberExpression: any) => {
					const className = strategy.acornGetClassName(UIClass.className, memberExpression.property.start);
					if (className && !className.includes("__map__") && className !== UIClass.className && !dependencies.includes(className)) {
						dependencies.push(className);
					}
				});
			}
		});

		return dependencies;
	}
	private _getIfClassesAreWithinSameProject(className1: string, className2: string) {
		const thisClassManifest = FileReader.getManifestForClass(className1);
		const parentClassManifest = FileReader.getManifestForClass(className2);
		return thisClassManifest?.fsPath === parentClassManifest?.fsPath;
	}

	private _generateClassDiagram(UIClass: CustomUIClass) {
		const classColor = this._getClassColor(UIClass);
		const classOrInterface = this._getClassOrInterfaceKeyword(UIClass);
		const implementations = UIClass.interfaces.length > 0 ? ` implements ${UIClass.interfaces.join(", ")}` : "";
		const stereotype = this._getStereotype(UIClass);
		const isAbstract = UIClass.abstract ? "abstract " : "";
		let classDiagram = `${isAbstract}${classOrInterface} ${UIClass.className}${stereotype}${implementations} ${classColor}{\n`;

		UIClass.fields.filter(field => field.name !== "prototype").forEach(UIField => {
			const visibilitySign = this._getVisibilitySign(UIField.visibility);
			const abstractStaticModifier = this._getAbstractOrStaticModifier(UIField);
			classDiagram += `\t${visibilitySign}${abstractStaticModifier}${UIField.name}: ${UIField.type}\n`;
		});
		UIClass.methods.forEach(UIMethod => {
			const visibilitySign = this._getVisibilitySign(UIMethod.visibility);
			const abstractStaticModifier = this._getAbstractOrStaticModifier(UIMethod);
			const params = UIMethod.params.map(param => `${param.name}${param.isOptional ? "?" : ""}: ${param.type}`).join(", ");
			classDiagram += `\t${visibilitySign}${abstractStaticModifier}${UIMethod.name}(${params}): ${UIMethod.returnType}\n`;
		});

		classDiagram += "}\n";
		return classDiagram;
	}
	private _getStereotype(UIClass: CustomUIClass) {
		let stereotype = "";

		if (UIClassFactory.isClassAChildOfClassB(UIClass.className, "sap.ui.model.Model")) {
			stereotype = " <<Model>>";
		} else if (UIClassFactory.isClassAChildOfClassB(UIClass.className, "sap.ui.core.mvc.Controller")) {
			stereotype = " <<Controller>>";
		} else if (UIClassFactory.isClassAChildOfClassB(UIClass.className, "sap.ui.core.Control")) {
			stereotype = " <<Control>>";
		}

		return stereotype;
	}
	private _getClassOrInterfaceKeyword(UIClass: CustomUIClass) {
		let keyword = "class";
		const isInterface = !!UIClassFactory.getAllCustomUIClasses().find(CustomUIClass => CustomUIClass.interfaces.includes(UIClass.className));
		if (isInterface) {
			keyword = "interface";
		}

		return keyword;
	}
	private _getClassColor(UIClass: CustomUIClass) {
		let color = "";
		const isModel = UIClassFactory.isClassAChildOfClassB(UIClass.className, "sap.ui.model.Model");
		const isController = UIClassFactory.isClassAChildOfClassB(UIClass.className, "sap.ui.core.mvc.Controller");

		if (isModel) {
			color = "#aliceblue ##lightsteelblue "
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
		let visibilitySign = "+ "
		if (visibility === "protected") {
			visibilitySign = "# ";
		} else if (visibility === "private") {
			visibilitySign = "- ";
		}

		return visibilitySign;
	}
}