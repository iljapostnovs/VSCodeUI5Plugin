import { FileReader } from "../../../Util/FileReader";
import { MainLooper } from "../../JSParser/MainLooper";
import { AbstractType } from "../../JSParser/types/AbstractType";
import { DifferentJobs } from "../../JSParser/DifferentJobs";
import { JSFunction } from "../../JSParser/types/Function";
import { JSFunctionCall } from "../../JSParser/types/FunctionCall";
import { JSObject } from "../../JSParser/types/Object";
import { JSVariable } from "../../JSParser/types/Variable";
import { AbstractUIClass, UIField, UIAggregation, UIEvent, UIMethod, UIProperty, UIAssociation } from "./AbstractUIClass";
import { JSString } from "../../JSParser/types/String";
import { JSComment } from "../../JSParser/types/JSComment";

interface UIDefine {
	path: string;
	className: string;
	classNameDotNotation: string;
}
interface CustomClassUIMethod extends UIMethod {
	position?: number;
}
export class CustomUIClass extends AbstractUIClass {
	public methods: CustomClassUIMethod[] = [];
	public classBody: JSObject | undefined;
	public classText: string = "";
	public UIDefine: UIDefine[] = [];
	public jsPasredBody: AbstractType | undefined;
	private currentClassHolderVariable: AbstractType | undefined;

	constructor(className: string, documentText?: string) {
		super(className);

		this.readFileContainingThisClassCode(documentText); //todo: rename. not always reading anyore.
		this.UIDefine = this.getUIDefine();
		this.classBody = this.getThisClassBody();
		this.findParentClassNameDotNotation();
		this.fillUI5Metadata();
		this.fillMethodsAndFields();
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
					classNameDotNotation: UIDefinePaths[index] ? UIDefinePaths[index].replace(/\//g, ".") : ""
				};
			});
		}

		return UIDefine;
	}

	private getThisClassBody() {
		let classBody: JSObject | undefined = this.getClassBodyFromClassExtend();

		if (!classBody) {
			classBody = this.getClassBodyFromReturnedObject();
		}

		return classBody;
	}

	private getClassBodyFromClassExtend() {
		let classBody: JSObject | undefined;

		if (this.jsPasredBody) {
			//returns Object.extend("", {}) right away
			const classFNCall = this.jsPasredBody.parts[1].parts.find(part => this.isThisPartAClassBody(part));
			if (classFNCall) {
				classBody = <JSObject>classFNCall.parts[1];
			} else {
				//there is a variable which has the class assigned. E.g. var Class = Object.extend("", {});
				for (let index = 0; index < this.jsPasredBody.parts[1].parts.length; index++) {
					const part = this.jsPasredBody.parts[1].parts[index];

					const classFNCall = part.parts.find(part => this.isThisPartAClassBody(part));
					if (classFNCall) {
						this.currentClassHolderVariable = part;
						(<JSVariable>part).jsType = this.className;
						classBody = <JSObject>classFNCall.parts[1];
						break;
					}
				}
			}
		}

		return classBody;
	}

	private isThisPartAClassBody(part: AbstractType) {
		return part instanceof JSFunctionCall && (part.parsedName.indexOf(".extend") > -1 || part.parsedName.indexOf(".declareStaticClass")) > -1;
	}

	private getClassBodyFromReturnedObject() {
		let classBody: JSObject | undefined;

		if (this.jsPasredBody) {
			const jsObject = this.jsPasredBody.parts[1].parts.find(part => part instanceof JSObject);
			if (jsObject) {
				classBody = <JSObject>jsObject;
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
				const controlIdResult = /(?<=this\.(getView\(\)\.)?byId\(").*(?="\))/.exec(jsVariable.parsedBody);
				const controlId = controlIdResult ? controlIdResult[0] : "";
				if (controlId) {
					jsVariable.jsType = FileReader.getClassNameFromView(this.className, controlId);
				}
			});

			const allThisVariables = allVariables.filter(jsVariable => jsVariable.parsedName.startsWith("this."));
			//share all this variable data types
			allThisVariables.forEach(thisVariable => {
				if (!thisVariable.jsType) {
					const theSameThisVariable = allThisVariables.find(correspondingThisVariable => correspondingThisVariable.parsedName === thisVariable.parsedName && thisVariable !== correspondingThisVariable && !!correspondingThisVariable.jsType);
					if (theSameThisVariable) {
						thisVariable.jsType = theSameThisVariable.jsType;
					}

				}
			});

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
			}, []);

			this.classBody.partNames.forEach((partName, index) => {
				if (this.classBody) {
					const part = this.classBody.parts[index];
					this.fillMethodsAndFieldsFromPart(part, partName);
				}
			});

			if (this.currentClassHolderVariable) {
				const rIsFieldOrMethod = new RegExp(`${this.currentClassHolderVariable.parsedName}(\\.prototype)?\\..*`);

				const body = this.currentClassHolderVariable.parent;
				if (body) {
					body.parts.forEach((part, index) => {
						if (rIsFieldOrMethod.test(part.parsedName)) {
							if (part.parts.length === 1) {
								let name = part.parsedName.replace(`${this.currentClassHolderVariable?.parsedName}.`, "");
								name = name.replace(`prototype.`, "");

								const previousPart = body.parts[index - 1];
								if (previousPart && previousPart instanceof JSComment) {
									if (previousPart.isJSDoc() && part.parts[0] instanceof JSFunction) {
										(<JSFunction>part.parts[0]).setJSDoc(previousPart);
									}
								}
								this.fillMethodsAndFieldsFromPart(part.parts[0], name);
							}
						}
					});
				}
			}
		}

		this.fillMethodsFromMetadata();
	}

	private fillMethodsAndFieldsFromPart(part: AbstractType, partName: string) {
		if (part instanceof JSFunction) {
			const description = `(${part.params.map(part => part.parsedName).join(", ")}) : ${(part.returnType ? part.returnType : "void")}`;
			this.methods.push({
				name: partName,
				params: part.params.map(part => part.parsedName),
				returnType: part.returnType || "void",
				description: description,
				position: part.positionBegin
			});

		} else if (part instanceof JSVariable) {
			this.fields.push({
				name: partName.replace("this.", ""),
				type: part.jsType,
				description: part.jsType || ""
			});
		}
	}

	private fillMethodsFromMetadata() {
		const additionalMethods: CustomClassUIMethod[] = [];

		this.fillPropertyMethods(additionalMethods);
		this.fillAggregationMethods(additionalMethods);
		this.fillEventMethods(additionalMethods);
		this.fillAssociationMethods(additionalMethods);

		this.methods = this.methods.concat(additionalMethods);
	}

	private fillPropertyMethods(aMethods: CustomClassUIMethod[]) {
		this.properties.forEach(property => {
			const propertyWithFirstBigLetter = `${property.name[0].toUpperCase()}${property.name.substring(1, property.name.length)}`;
			const getter = `get${propertyWithFirstBigLetter}`;
			const setter = `set${propertyWithFirstBigLetter}`;

			aMethods.push({
				name: getter,
				description: `Getter for property ${property.name}`,
				params: [],
				returnType: "void"
			});

			aMethods.push({
				name: setter,
				description: `Setter for property ${property.name}`,
				params: [`v${propertyWithFirstBigLetter}`],
				returnType: "void"
			});
		});
	}

	private fillAggregationMethods(additionalMethods: CustomClassUIMethod[]) {
		this.aggregations.forEach(aggregation => {
			const aggregationWithFirstBigLetter = `${aggregation.singularName[0].toUpperCase()}${aggregation.singularName.substring(1, aggregation.singularName.length)}`;

			let aMethods = [];
			if (aggregation.multiple) {
				aMethods = [
					`get${aggregationWithFirstBigLetter}s`,
					`add${aggregationWithFirstBigLetter}`,
					`insert${aggregationWithFirstBigLetter}`,
					`indexOf${aggregationWithFirstBigLetter}`,
					`remove${aggregationWithFirstBigLetter}`,
					`destroy${aggregationWithFirstBigLetter}s`,
					`bind${aggregationWithFirstBigLetter}s`,
					`unbind${aggregationWithFirstBigLetter}s`
				];
			} else {
				aMethods = [
					`get${aggregationWithFirstBigLetter}`,
					`set${aggregationWithFirstBigLetter}`,
					`bind${aggregationWithFirstBigLetter}`,
					`unbind${aggregationWithFirstBigLetter}`
				];
			}

			aMethods.forEach(methodName => {
				additionalMethods.push({
					name: methodName,
					description: `Generic method from ${aggregation.name} aggregation`,
					params: [],
					returnType: "void"
				});
			});

		});
	}

	private fillEventMethods(aMethods: CustomClassUIMethod[]) {
		this.events.forEach(event => {
			const eventWithFirstBigLetter = `${event.name[0].toUpperCase()}${event.name.substring(1, event.name.length)}`;
			const aEventMethods = [
				`fire${eventWithFirstBigLetter}`,
				`attach${eventWithFirstBigLetter}`,
				`detach${eventWithFirstBigLetter}`
			];

			aEventMethods.forEach(eventMethod => {
				aMethods.push({
					name: eventMethod,
					description: `Generic method for event ${event.name}`,
					params: [],
					returnType: "void"
				});
			});
		});
	}

	private fillAssociationMethods(additionalMethods: CustomClassUIMethod[]) {
		this.associations.forEach(association => {
			const associationWithFirstBigLetter = `${association.singularName[0].toUpperCase()}${association.singularName.substring(1, association.singularName.length)}`;

			let aMethods = [];
			if (association.multiple) {
				aMethods = [
					`get${associationWithFirstBigLetter}`,
					`add${associationWithFirstBigLetter}`,
					`remove${associationWithFirstBigLetter}`,
					`removeAll${associationWithFirstBigLetter}s`,
				];
			} else {
				aMethods = [
					`get${associationWithFirstBigLetter}`,
					`set${associationWithFirstBigLetter}`
				];
			}

			aMethods.forEach(methodName => {
				additionalMethods.push({
					name: methodName,
					description: `Generic method from ${association.name} association`,
					params: [],
					returnType: "void"
				});
			});

		});
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
		if (this.classBody?.parent) {
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

		if (variableName === "this") {
			className = this.className;
		} else {
			const isMethod = variableName.endsWith(")");
			if (variableName.startsWith("this.")) {
				variableName = variableName.replace("this.", "");
				if (isMethod) {
					const methodParams = MainLooper.getEndOfChar("(", ")", variableName);
					const methodName = variableName.replace(methodParams, "");
					const method = this.methods.find(method => method.name === methodName);
					if (method) {
						className = method.returnType;
					}
				} else {
					const field = this.fields.find(field => field.name === variableName);
					if (field?.type) {
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
		}

		return className;
	}

	private fillUI5Metadata() {
		if (this.classBody) {
			const metadataExists = this.classBody.partNames.indexOf("metadata") > -1;

			if (metadataExists) {
				const metadataObjectIndex = this.classBody.partNames.indexOf("metadata");
				const metadataObject = this.classBody.parts[metadataObjectIndex];

				this.fillAggregations(<JSObject>metadataObject);
				this.fillEvents(<JSObject>metadataObject);
				this.fillProperties(<JSObject>metadataObject);
				this.fillAssociations(<JSObject>metadataObject);
			}
		}
	}

	private fillAggregations(metadata: JSObject) {
		const indexOfAggregations = metadata.partNames.indexOf("aggregations");

		if (indexOfAggregations > -1) {
			const aggregations = <JSObject>metadata.parts[indexOfAggregations];
			this.aggregations = aggregations.partNames.map((partName, i) => {
				const aggregationProps = <JSObject>aggregations.parts[i];

				const aggregationTypeIndex = aggregationProps.partNames.indexOf("type");
				let aggregationType: undefined | string = undefined;
				if (aggregationTypeIndex > -1) {
					aggregationType = (<JSString>aggregationProps.parts[aggregationTypeIndex]).parsedBody;
					aggregationType = aggregationType.substring(1, aggregationType.length - 1);
				}

				const multipleIndex = aggregationProps.partNames.indexOf("multiple");
				let multiple = true;
				if (multipleIndex > -1) {
					multiple = aggregationProps.parts[multipleIndex].parsedName === "true";
				}

				const singularNameIndex = aggregationProps.partNames.indexOf("singularName");
				let singularName = "";
				if (singularNameIndex > -1) {
					singularName = (<JSString>aggregationProps.parts[singularNameIndex]).parsedBody;
					singularName = singularName.substring(1, singularName.length - 1);
				}
				if (!singularName) {
					singularName = partName.substring(0, partName.length - 1);
				}

				const UIAggregations: UIAggregation = {
					name: partName,
					type: aggregationType,
					multiple: multiple,
					singularName: singularName,
					description: ""
				};
				return UIAggregations;
			});
		}
	}

	private fillEvents(metadata: JSObject) {
		const indexOfEvents = metadata.partNames.indexOf("events");

		if (indexOfEvents > -1) {
			const events = <JSObject>metadata.parts[indexOfEvents];
			this.events = events.partNames.map(partName => {
				const UIEvent: UIEvent = {
					name: partName,
					description: ""

				};
				return UIEvent;
			});
		}
	}

	private fillProperties(metadata: JSObject) {
		const indexOfProperties = metadata.partNames.indexOf("properties");

		if (indexOfProperties > -1) {
			const properties = <JSObject>metadata.parts[indexOfProperties];
			this.properties = properties.partNames.map((partName, i) => {
				const aggregationProps = <JSObject>properties.parts[i];
				const propertyTypeIndex = aggregationProps.partNames.indexOf("type");
				let propertyType: undefined | string = undefined;
				if (propertyTypeIndex > -1) {
					propertyType = (<JSString>aggregationProps.parts[propertyTypeIndex]).parsedBody;
					propertyType = propertyType.substring(1, propertyType.length -1 );
				}
				const UIProperties: UIProperty = {
					name: partName,
					type: propertyType,
					description: "",
					typeValues: []
				};

				return UIProperties;
			});
		}
	}

	private fillAssociations(metadata: JSObject) {
		const indexOfAssociations = metadata.partNames.indexOf("associations");

		if (indexOfAssociations > -1) {
			const associations = <JSObject>metadata.parts[indexOfAssociations];
			this.associations = associations.partNames.map((partName, i) => {
				const associationProps = <JSObject>associations.parts[i];

				const associationTypeIndex = associationProps.partNames.indexOf("type");
				let associationType: undefined | string = undefined;
				if (associationTypeIndex > -1) {
					associationType = (<JSString>associationProps.parts[associationTypeIndex]).parsedBody;
					associationType = associationType.substring(1, associationType.length - 1);
				}

				const multipleIndex = associationProps.partNames.indexOf("multiple");
				let multiple = true;
				if (multipleIndex > -1) {
					multiple = associationProps.parts[multipleIndex].parsedName === "true";
				}

				const singularNameIndex = associationProps.partNames.indexOf("singularName");
				let singularName = "";
				if (singularNameIndex > -1) {
					singularName = (<JSString>associationProps.parts[singularNameIndex]).parsedBody;
					singularName = singularName.substring(1, singularName.length - 1);
				}
				if (!singularName) {
					singularName = partName.substring(0, partName.length - 1);
				}

				const UIAssociations: UIAssociation = {
					name: partName,
					type: associationType,
					multiple: multiple,
					singularName: singularName,
					description: ""
				};
				return UIAssociations;
			});
		}
	}
}
