import { Header } from "./drawiouml/Header";
import { Footer } from "./drawiouml/Footer";
import { FileReader } from "../../../Util/FileReader";
import { UIClassFactory } from "../../../CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";
import { DrawIOUMLDiagram } from "./DrawIOUMLDiagram";
import * as vscode from "vscode";
import { CustomUIClass } from "../../../CustomLibMetadata/UI5Parser/UIClass/CustomUIClass";
import { DependencyLine } from "./drawiouml/lines/DependencyLine";
import { IUMLGenerator } from "./drawiouml/interfaces/IUMLGenerator";
import { ImplementationLine } from "./drawiouml/lines/ImplementationLIne";

export class MassDrawIOUMLDiagram {
	static generateUMLClassDiagrams(wsFolder: vscode.WorkspaceFolder) {
		return new Promise(resolve => {

			const header = new Header();
			const footer = new Footer();
			let xAxis = 70;

			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Generating UML",
				cancellable: false
			}, async progress => {
				const classNames = FileReader.getAllJSClassNamesFromProject(wsFolder);
				const classQuantity = classNames.length;

				const UMLDiagrams: DrawIOUMLDiagram[] = [];
				let body = "";
				for (const className of classNames) {
					await (() => {

						return new Promise(resolve => {
							setTimeout(() => {
								try {
									const UIClass = UIClassFactory.getUIClass(className);
									const UMLDiagram = new DrawIOUMLDiagram(UIClass, header);
									UMLDiagrams.push(UMLDiagram);
									UMLDiagram.xAxis = xAxis;

									body += UMLDiagram.generateBody();
									xAxis += UMLDiagram.width + 10;

									progress.report({message: `${className} generated`, increment: Math.round(100 / classQuantity)});
								} catch (error) {
									console.log(`Failed to generate UML Diagram for ${className}`);
								}
								resolve();
							}, 0);
						});
					})();
				}

				let lines = "";
				UMLDiagrams.forEach(UMLDiagram => {
					const UIClass = UMLDiagram.UIClass;
					if (UIClass instanceof CustomUIClass) {
						UIClass.UIDefine.forEach(define => {
							const accordingUMLDiagram = UMLDiagrams.find(diagram => diagram.UIClass.className === define.classNameDotNotation);
							if (accordingUMLDiagram) {
								let line: IUMLGenerator;
								if (accordingUMLDiagram.UIClass.className === UMLDiagram.UIClass.parentClassNameDotNotation) {
									line = new ImplementationLine(header, {source: UMLDiagram.classHead, target: accordingUMLDiagram.classHead});
								} else {
									line = new DependencyLine(header, {source: UMLDiagram.classHead, target: accordingUMLDiagram.classHead});
								}
								lines += line.generateXML();
							}
						});
					}
				});

				const UMLDiagram = header.generateXML() + lines + body + footer.generateXML();
				resolve(UMLDiagram);
			});
		});
	}
}