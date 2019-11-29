import { FileReader } from "../../../Util/FileReader";
import { MainLooper } from "../../JSParser/MainLooper";
import { AbstractType } from "../../JSParser/types/AbstractType";
import { DifferentJobs } from "../../JSParser/DifferentJobs";
import { JSFunction } from "../../JSParser/types/Function";
import { JSFunctionCall } from "../../JSParser/types/FunctionCall";
import { JSObject } from "../../JSParser/types/Object";
import { JSVariable } from "../../JSParser/types/Variable";
import { AbstractUIClass, UIField } from "./AbstractUIClass";

interface UIDefine {
	path: string,
	className: string,
	classNameDotNotation: string
}
export class CustomUIClass extends AbstractUIClass {
	public classBody: JSObject | undefined;
	public classText: string = "";
	private UIDefine: UIDefine[] = [];
	private jsPasredBody: AbstractType | undefined;

	constructor(className: string, documentText?: string) {
		super(className);

		this.readFileContainingThisClassCode(documentText); //todo: rename. not always reading anyore.
		this.UIDefine = this.getUIDefine();
		this.classBody = this.getThisClassBody();
		this.fillMethodsAndFields();
		this.findParentClassNameDotNotation();
	}

	private readFileContainingThisClassCode(documentText?: string) {
		if (!documentText) {
			documentText = FileReader.getDocumentTextFromCustomClassName(this.className);
		}
		this.classText = documentText || "";
		if (documentText) {
			const parsedBodies = MainLooper.startAnalysing(documentText);
			parsedBodies.forEach(part => {
				part.setPositions();
			});

			//lets concentrate on good old sap.ui.define only
			if (parsedBodies.length === 1) {
				this.jsPasredBody = parsedBodies[0];
				DifferentJobs.finalizeParsing(this.jsPasredBody);
			}
		}
	}

	private getUIDefine() {
		let UIDefine: UIDefine[] = [];

		if (this.jsPasredBody) {
			const UIDefinePaths = this.jsPasredBody.parts[0].parts.map(part => part.parsedBody.substring(1, part.parsedBody.length - 1));
			const UIDefineClassNames = (<JSFunction>this.jsPasredBody.parts[1]).params.map(part => part.parsedName);
			UIDefine = UIDefineClassNames.map((className, index) : UIDefine => {
				return {
					path: UIDefinePaths[index],
					className: className,
					classNameDotNotation: UIDefinePaths[index].replace(/\//g, ".")
				}
			});
		}

		return UIDefine;
	}

	private getThisClassBody() {
		let classBody: JSObject | undefined;
		if (this.jsPasredBody) {
			const classFNCall = this.jsPasredBody.parts[1].parts.find(part => part instanceof JSFunctionCall && (part.parsedName.indexOf(".extend") > -1 || part.parsedName.indexOf(".declareStaticClass")));
			if (classFNCall) {
				classBody = <JSObject>classFNCall.parts[1];
			} else {
				for (let index = 0; index < this.jsPasredBody.parts[1].parts.length; index++) {
					const part = this.jsPasredBody.parts[1].parts[index];

					const classFNCall = part.parts.find(part => part instanceof JSFunctionCall);
					if (classFNCall) {
						classBody = <JSObject>classFNCall.parts[1];
						break;
					}
				}
			}
		}

		return classBody;
	}

	private fillMethodsAndFields() {
		if (this.classBody) {

			//find all variables
			const allVariables = DifferentJobs.getAllVariables(this.classBody);

			//transform all var types to types from UI Define dot notation
			allVariables.forEach(variable => {
				if (variable.jsType) {
					const classNameDotNotation = this.getClassNameFromUIDefine(variable.jsType);
					if (classNameDotNotation) {
						variable.jsType = classNameDotNotation;
					}
				} else {
					const classNameDotNotation = this.getClassNameFromUIDefine(variable.parsedName);
					if (classNameDotNotation) {
						variable.jsType = classNameDotNotation;
					}
				}
			});

			//fill getView types from view
			const allGetViewVars = allVariables.filter(
				variable => variable.parsedBody.startsWith("this.getView().byId(") ||
							variable.parsedBody.startsWith("this.byId(")
			);
			allGetViewVars.forEach(jsVariable => {
				const controlIdResult = /(?<=this\.(getView)?\(\)\.byId\(").*(?="\))/.exec(jsVariable.parsedBody);
				const controlId = controlIdResult ? controlIdResult[0] : "";
				if (controlId) {
					jsVariable.jsType = FileReader.getClassNameFromView(this.className, controlId);
				}
			});

			const allThisVariables = allVariables.filter(jsVariable => jsVariable.parsedName.startsWith("this."));
			allThisVariables.forEach(thisVariable => {
				this.fields.push({
					name: thisVariable.parsedName.replace("this.", ""),
					type: (<JSVariable>thisVariable).jsType,
					description: ""
				});
			});

			//remove duplicates. Think about how to find data type for same variables w/o data type
			this.fields = this.fields.reduce((accumulator: UIField[], field: UIField) => {
				const existingField = accumulator.find(accumulatedField => accumulatedField.name === field.name);
				if (existingField && field.type && !existingField.type) {
					accumulator[accumulator.indexOf(existingField)] = field;
				} else if (!existingField) {
					accumulator.push(field);
				}
				return accumulator;
			}, [])

			this.classBody.partNames.forEach((partName, index) => {
				if (this.classBody) {
					let part = this.classBody.parts[index];
					if (part instanceof JSFunction) {
						this.methods.push({
							name: partName,
							params: (<JSFunction>part).params.map(part => part.parsedName),
							returnType: "void",
							description: ""
						});
					} else if (part instanceof JSVariable) {
						this.fields.push({
							name: partName.replace("this.", ""),
							type: (<JSVariable>part).jsType,
							description: ""
						});
					}
				}
			});
		}
	}

	private getClassNameFromUIDefine(className: string) {
		let classNameFromUIDefine: string | undefined;
		const accordingUIDefine = this.UIDefine.find(UIDefine => {
			return UIDefine.className === className;
		});
		if (accordingUIDefine) {
			classNameFromUIDefine = accordingUIDefine.classNameDotNotation;
		}
		return classNameFromUIDefine;
	}

	private findParentClassNameDotNotation() {
		if (this.classBody && this.classBody.parent) {
			const parsedParentName = this.classBody.parent.parsedName;
			const parentClassUIDefineName = parsedParentName.replace("return", "").replace(".extend", "").replace(".declareStaticClass", "").trim();
			const parentClassUIDefine = this.UIDefine.find(UIDefine => UIDefine.className === parentClassUIDefineName);
			if (parentClassUIDefine) {
				this.parentClassNameDotNotation = parentClassUIDefine.classNameDotNotation;
			}
		}
	}

	public getClassOfTheVariable(variableName: string, position: number) {
		let className: string | undefined;
		if (variableName.startsWith("this.")) {
			variableName = variableName.replace("this.", "");
			const field = this.fields.find(field => field.name === variableName);
			if (field && field.type) {
				className = field.type;
			} else if (field && !field.type && this.classBody) {
				//TODO: THIS ABOUT THIS! reason for this is that not always all types for this. variables are found right away.
				const allVariables = DifferentJobs.getAllVariables(this.classBody);
				const thisVariable = allVariables.find(variable => variable.parsedName === "this." + variableName);
				if (thisVariable) {
					const definition = thisVariable.findDefinition(thisVariable);
					if (definition) {
						className = (<JSVariable>definition).jsType;
					}
				}
			}
		} else if (this.classBody) {
			const definitionFromUIDefine = this.UIDefine.find(UIDefineVar => UIDefineVar.className === variableName);
			if (definitionFromUIDefine) {
				className = definitionFromUIDefine.classNameDotNotation;
			} else {
				const currentFunction = this.classBody.findFunctionByPosition(position);
				if (currentFunction) {
					const definition = currentFunction.findDefinition(new JSVariable(variableName, ""));
					if (definition) {
						className = (<JSVariable>definition).jsType;
					}
				}
			}
		}

		return className;
	}
}
