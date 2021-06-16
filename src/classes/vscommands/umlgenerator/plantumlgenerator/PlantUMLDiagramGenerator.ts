import { WorkspaceFolder } from "vscode";
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
		let diagram = "";
		if (UIClass.parentClassNameDotNotation && UIClassFactory.getUIClass(UIClass.parentClassNameDotNotation) instanceof CustomUIClass) {
			const parentIsFromSameProject = this._getIfClassesAreWithinSameProject(UIClass.className, UIClass.parentClassNameDotNotation);
			if (parentIsFromSameProject) {
				diagram += `${UIClass.parentClassNameDotNotation.replace("-", "_")} <|-- ${UIClass.className.replace("-", "_")}\n`;
			}
		}
		UIClass.UIDefine.forEach(UIDefine => {
			if (UIDefine.classNameDotNotation !== UIClass.parentClassNameDotNotation && UIClassFactory.getUIClass(UIDefine.classNameDotNotation) instanceof CustomUIClass) {
				const parentIsFromSameProject = this._getIfClassesAreWithinSameProject(UIClass.className, UIDefine.classNameDotNotation);
				if (parentIsFromSameProject) {
					diagram += `${UIClass.className.replace("-", "_")} --> ${UIDefine.classNameDotNotation.replace("-", "_")}\n`;
				}
			}
		});

		return diagram;
	}
	private _getIfClassesAreWithinSameProject(className1: string, className2: string) {
		const thisClassManifest = FileReader.getManifestForClass(className1);
		const parentClassManifest = FileReader.getManifestForClass(className2);
		return thisClassManifest?.fsPath === parentClassManifest?.fsPath;
	}

	private _generateClassDiagram(UIClass: CustomUIClass) {
		let classDiagram = `${UIClass.abstract ? "abstract " : ""}class ${UIClass.className.replace("-", "_")} {\n`;

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