import { WorkspaceFolder } from "vscode";
import { AcornSyntaxAnalyzer } from "../../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../../../UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { IAbstract, IStatic } from "../../../UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { CustomUIClass } from "../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../UI5Classes/UIClassFactory";
import { FileReader } from "../../../utils/FileReader";
import { DiagramGenerator } from "../abstraction/DiagramGenerator";

export class PlantUMLDiagramGenerator extends DiagramGenerator {
	getFileExtension() {
		return ".plantuml"
	}

	async generateUMLClassDiagrams(wsFolder: WorkspaceFolder) {
		let diagram = "@startuml ClassDiagram\nskinparam linetype ortho\n";

		const classNames = FileReader.getAllJSClassNamesFromProject(wsFolder).filter(className => !className.includes("test-resources"));
		classNames.forEach(className => {
			const UIClass = UIClassFactory.getUIClass(className);
			if (UIClass instanceof CustomUIClass) {
				diagram += this._generateClassDiagram(UIClass);
			}
		});

		const views = FileReader.getAllViews();
		const fragments = FileReader.getAllFragments();
		const XMLFiles = [...views, ...fragments];
		XMLFiles.forEach(XMLFile => {
			const manifest = FileReader.getManifestForClass(XMLFile.name);
			const dependencyIsFromSameProject = manifest && manifest.fsPath.startsWith(wsFolder.uri.fsPath);
			if (dependencyIsFromSameProject) {
				const isView = XMLFile.fsPath.endsWith(".view.xml");
				diagram += `class ${XMLFile.name}${isView ? "View" : "Fragment"} << (${isView ? "V" : "F"},orchid) >> #gainsboro ##grey {}\n`
			}
		});
		XMLFiles.forEach(XMLFile => {
			const manifest = FileReader.getManifestForClass(XMLFile.name);
			const dependencyIsFromSameProject = manifest && manifest.fsPath.startsWith(wsFolder.uri.fsPath);
			if (dependencyIsFromSameProject) {
				const isView = XMLFile.fsPath.endsWith(".view.xml");
				XMLFile.fragments.forEach(fragment => {
					diagram += `${XMLFile.name}${isView ? "View" : "Fragment"} --> ${fragment.name}Fragment\n`;
				});
			}
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
	private _generateRelationships(UIClass: CustomUIClass) {
		const dependencies = this._gatherAllDependencies(UIClass);
		let diagram = "";
		if (UIClass.parentClassNameDotNotation && UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation) instanceof CustomUIClass) {
			const parentIsFromSameProject = this._getIfClassesAreWithinSameProject(UIClass.className, UIClass.parentClassNameDotNotation);
			if (parentIsFromSameProject) {
				diagram += `${UIClass.parentClassNameDotNotation.replace("-", "_")} <|-- ${UIClass.className.replace("-", "_")}\n`;
			}
		}
		dependencies.forEach(dependency => {
			if (dependency !== UIClass.parentClassNameDotNotation && UIClassFactory.getUIClass(dependency) instanceof CustomUIClass) {
				const dependencyIsFromSameProject = this._getIfClassesAreWithinSameProject(UIClass.className, dependency);
				if (dependencyIsFromSameProject) {
					diagram += `${UIClass.className.replace("-", "_")} --> ${dependency.replace("-", "_")}\n`;
				}
			}
		});

		// const views = FileReader.getAllViews();
		// const fragments = FileReader.getAllFragments();
		// const XMLFiles = [...views, ...fragments];
		// XMLFiles.forEach(XMLFile => {
		// 	const isView = XMLFile.fsPath.endsWith(".view.xml");
		// 	diagram += `class ${XMLFile.name} << (${isView ? "V" : "F"},orchid) >> #gainsboro ##grey {}`
		// });
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
		const implementations = UIClass.interfaces.length > 0 ? ` implements ${UIClass.interfaces.join(", ")}` : "";
		let classDiagram = `${UIClass.abstract ? "abstract " : ""}class ${UIClass.className.replace("-", "_")}${implementations} ${classColor}{\n`;

		UIClass.fields.filter(field => field.name !== "prototype").forEach(UIField => {
			const visibilitySign = this._getVisibilitySign(UIField.visibility);
			const abstractStaticModifier = this._getAbstractOrStaticModifier(UIField);
			classDiagram += `\t${visibilitySign}${abstractStaticModifier}${UIField.name}: ${UIField.type?.replace("-", "_")}\n`;
		});
		UIClass.methods.forEach(UIMethod => {
			const visibilitySign = this._getVisibilitySign(UIMethod.visibility);
			const abstractStaticModifier = this._getAbstractOrStaticModifier(UIMethod);
			const params = UIMethod.params.map(param => `${param.name}${param.isOptional ? "?" : ""}: ${param.type.replace("-", "_")}`).join(", ");
			classDiagram += `\t${visibilitySign}${abstractStaticModifier}${UIMethod.name}(${params}): ${UIMethod.returnType.replace("-", "_")}\n`;
		});

		classDiagram += "}\n";
		return classDiagram;
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