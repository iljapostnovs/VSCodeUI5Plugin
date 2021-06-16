import { WorkspaceFolder } from "vscode";
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
			diagram += `${UIClass.parentClassNameDotNotation.replace("-", "_")} <|-- ${UIClass.className.replace("-", "_")}\n`;
		}
		UIClass.UIDefine.forEach(UIDefine => {
			if (UIDefine.classNameDotNotation !== UIClass.parentClassNameDotNotation && UIClassFactory.getUIClass(UIDefine.classNameDotNotation) instanceof CustomUIClass) {
				diagram += `${UIClass.className.replace("-", "_")} --> ${UIDefine.classNameDotNotation.replace("-", "_")}\n`;
			}
		});

		return diagram;
	}

	private _generateClassDiagram(UIClass: CustomUIClass) {
		let classDiagram = `class ${UIClass.className.replace("-", "_")} {\n`;

		UIClass.fields.forEach(UIField => {
			const visibilitySign = this._getVisibilitySign(UIField.visibility);
			classDiagram += `\t${visibilitySign}${UIField.name}: ${UIField.type?.replace("-", "_")}\n`;
		});
		UIClass.methods.forEach(UIMethod => {
			const visibilitySign = this._getVisibilitySign(UIMethod.visibility);
			const params = UIMethod.params.map(param => `${param.name}${param.isOptional ? "?" : ""}: ${param.type.replace("-", "_")}`).join(", ");
			classDiagram += `\t${visibilitySign}${UIMethod.name}(${params}): ${UIMethod.returnType.replace("-", "_")}\n`;
		});

		classDiagram += "}\n";
		return classDiagram;
	}

	private _getVisibilitySign(visibility: string) {
		let visibilitySign = "+"
		if (visibility === "protected") {
			visibilitySign = "#";
		} else if (visibility === "private") {
			visibilitySign = "-";
		}

		return visibilitySign;
	}
}