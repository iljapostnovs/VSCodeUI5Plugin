import { SyntaxAnalyzer } from "../../SyntaxAnalyzer";
import * as vscode from "vscode";
import { UIClassFactory } from "./UIClassFactory";
import { CustomUIClass } from "./CustomUIClass";
import { FileReader } from "../../../Util/FileReader";
import LineColumn from 'line-column';
import { StandardUIClass } from "./StandardUIClass";
import { DifferentJobs } from "../../JSParser/DifferentJobs";
import { JSFunctionCall } from "../../JSParser/types/FunctionCall";

export class UIClassDefinitionFinder {
    public static getPositionAndUriOfCurrentVariableDefinition(classNameDotNotation?: string, methodName?: string) : vscode.Location | undefined {
        let location: vscode.Location | undefined;
        const textEditor = vscode.window.activeTextEditor;
        if (textEditor) {
            if (!classNameDotNotation) {
                const document = textEditor.document;
                const position = textEditor.selection.start;
                methodName = document.getText(document.getWordRangeAtPosition(position));
                classNameDotNotation = this.getVariableClass();
            }
            if (classNameDotNotation && methodName) {
                if (classNameDotNotation.startsWith("sap.")) {
                    this.openClassMethodInTheBrowser(classNameDotNotation, methodName);
                } else {
                    location = this.getVSCodeMethodLocation(classNameDotNotation, methodName);
                    if (!location) {
                        const UIClass = UIClassFactory.getUIClass(classNameDotNotation);
                        if (UIClass.parentClassNameDotNotation) {
                            location = this.getPositionAndUriOfCurrentVariableDefinition(UIClass.parentClassNameDotNotation, methodName);
                        }
                    }
                }
            }
        }

        return location;
    }

    private static getVSCodeMethodLocation(classNameDotNotation: string, methodName: string) {
        let location: vscode.Location | undefined;
        const UIClass = UIClassFactory.getUIClass(classNameDotNotation);

        if (UIClass instanceof CustomUIClass && UIClass.classBody) {
            const currentMethodIndex = UIClass.classBody.partNames.indexOf(methodName);
            if (currentMethodIndex > -1) {
                const methodFunction = UIClass.classBody.parts[currentMethodIndex];
                const classPath = FileReader.getClassPath(UIClass.className);
                if (classPath) {
                    const classUri = vscode.Uri.file(classPath);
                    const methodPositionOffset = methodFunction.positionBegin;
                    const position = LineColumn(UIClass.classText).fromIndex(methodPositionOffset);
                    if (position) {
                        const methodPosition = new vscode.Position(position.line - 1, position.col);
                        location = new vscode.Location(classUri, methodPosition);
                    }
                }
            }

        }

        return location;
    }

    private static getVariableClass(variable?: string) {
        //TODO: this should work not only for current document
        let UIClassName: string | undefined;
        if (!variable) {
            variable = SyntaxAnalyzer.getCurrentVariable();
        }
        const textEditor = vscode.window.activeTextEditor;

        if (textEditor) {
            const document = textEditor.document;
            const currentPositionOffset = document.offsetAt(textEditor.selection.start);
            //remove last part of the var begin
            let temporaryVariableParts = variable.split(".");
            temporaryVariableParts.splice(temporaryVariableParts.length - 1, 1);
            variable = temporaryVariableParts.join(".");
            //remove last part of the var end
            const currentClassName = SyntaxAnalyzer.getCurrentClass();
            let variableParts = variable.split(".");

            if (currentClassName) {

                if (variableParts[0] === "this" && variableParts.length > 1) {
                    UIClassName = SyntaxAnalyzer.getClassNameFromVariableParts(variableParts, currentClassName);
                } else if (variableParts[0] === "this" && variableParts.length === 1) {
                    UIClassName = currentClassName;
                } else {
                    const currentClass = UIClassFactory.getUIClass(currentClassName);
                    UIClassName = (<CustomUIClass>currentClass).getClassOfTheVariable(variable, currentPositionOffset);
                }
            }
        }

        return UIClassName;
    }

    private static openClassMethodInTheBrowser(classNameDotNotation: string, methodName: string) {
        const UIClass = UIClassFactory.getUIClass(classNameDotNotation);
        if (UIClass instanceof StandardUIClass) {
            const methodFromClass = UIClass.methods.find(method => method.name === methodName);
            if (methodFromClass) {
                if (methodFromClass.isFromParent) {
                    this.openClassMethodInTheBrowser(UIClass.parentClassNameDotNotation, methodName);
                } else {
                    const UI5Version = vscode.workspace.getConfiguration("ui5.plugin").get("ui5version");
                    const linkToDocumentation = `https://ui5.sap.com/${UI5Version}#/api/${classNameDotNotation}/methods/${methodName}`;
                    vscode.env.openExternal(vscode.Uri.parse(linkToDocumentation));
                }
            }
        }
    }

    public static getAdditionalJSTypesHierarchically(customClass: CustomUIClass) {
		if (customClass.classBody) {
			const variables = DifferentJobs.getAllVariables(customClass.classBody);
            variables.forEach(variable => {
                if (!variable.jsType && variable.parts.length > 0) {
                    const allPartsAreFunctionCalls = !variable.parts.find(part => !(part instanceof JSFunctionCall));
                    if (allPartsAreFunctionCalls) {
                        //TODO: calls parsing twice.
                        variable.jsType = SyntaxAnalyzer.getClassNameFromVariableParts(variable.parsedBody.split("."), customClass.className);
                    }
                }
            });
            debugger;
        }
    }
}