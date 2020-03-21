import { Header } from "./drawiouml/Header";
import { Footer } from "./drawiouml/Footer";
import { FileReader } from "../../../Util/FileReader";
import { UIClassFactory } from "../../../CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";
import { DrawIOUMLDiagram } from "./DrawIOUMLDiagram";
import * as vscode from "vscode";

export class MassDrawIOUMLDiagram {
	static generateUMLClassDiagrams() {
		return new Promise((resolve, reject) => {

			const header = new Header();
			const footer = new Footer();
			let xAxis = 70;

			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Generating UML",
				cancellable: false
			}, async progress => {
				const classNames = FileReader.getAllJSClassNamesFromProject();
				const classQuantity = classNames.length;

				let body = "";
				for (const className of classNames) {
					await (() => {

						return new Promise(resolve => {
							setTimeout(() => {
								try {
									const UIClass = UIClassFactory.getUIClass(className);
									const UMLDiagram = new DrawIOUMLDiagram(UIClass);
									UMLDiagram.xAxis = xAxis;

									body += UMLDiagram.generateBody(header);
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

				const UMLDiagram = header.generateXML() + body + footer.generateXML();
				resolve(UMLDiagram);
			});
		});
	}
}