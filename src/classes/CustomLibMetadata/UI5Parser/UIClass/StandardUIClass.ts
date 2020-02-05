import { AbstractUIClass, UIMethod, UIProperties, UIEvents } from "./AbstractUIClass";
import { SAPNodeDAO } from "../../../StandardLibMetadata/SAPNodeDAO";
import { MainLooper } from "../../JSParser/MainLooper";
import { URLBuilder } from "../../../Util/URLBuilder";

export class StandardUIClass extends AbstractUIClass {
	private nodeDAO = new SAPNodeDAO();
	public methods: StandardClassUIMethod[] = [];

	constructor(className: string) {
		super(className);

		this.fillMethods();
		this.fillParentClassName();
		this.fillProperties();
		this.fillEvents();
	}

	private fillMethods() {
		this.methods = this.getStandardClassMethods(this.className, true);
	}

	private getStandardClassMethods(className: string, isParent: boolean) {
		let classMethods:StandardClassUIMethod[] = [];
		const SAPNode = this.findSAPNode(className);
		if (SAPNode) {
			const metadata = SAPNode.getMetadataSync();
			if (metadata) {
				classMethods = metadata.rawMetadata.methods.reduce((accumulator: StandardClassUIMethod[], method:any) => {
					if (method.visibility === "public") {
						accumulator.push({
							name: method.name,
							description: this.removeTags(method.code),
							params: method.parameters ? method.parameters.map((parameter: any) => parameter.name + (parameter.optional ? "?" : "")) : [],
							returnType: method.returnValue ? method.returnValue.type : "void",
							isFromParent: !isParent,
							api: URLBuilder.getInstance().getMarkupUrlForMethodApi(SAPNode, method.name)
						});
					}
					return accumulator;
				}, []);

				if (metadata.rawMetadata.extends) {
					classMethods = classMethods.concat(this.getStandardClassMethods(metadata.rawMetadata.extends, false));
				}
			}
		}
		return classMethods;
	}

	private findSAPNode(className: string) {
		return this.nodeDAO.findNode(className);
	}

	private removeTags(text: string) {
		const noTagsTestResult = /(?<=\<.*\>).*(?=\<.*\>)/.exec(text);
		return noTagsTestResult ? noTagsTestResult[0] : text;
	}

	private fillParentClassName() {
		const SAPNode = this.findSAPNode(this.className);
		if (SAPNode) {
			const metadata = SAPNode.getMetadataSync();
			if (metadata) {
				this.parentClassNameDotNotation = metadata.rawMetadata.extends;
			}
		}
	}

	public getClassOfTheVariable(variableName: string, position: number) {
		let className: string | undefined;
		if (variableName === "this") {
			className = this.className;
		} else {
			const methodParams = MainLooper.getEndOfChar("(", ")", variableName);
			const methodName = variableName.replace(methodParams, "").replace("this.", "");
			const method = this.methods.find(method => method.name === methodName);
			if (method) {
				className = method.returnType;
			}
		}
		return className;
	}

	private fillProperties() {
		this.properties = this.getStandardClassProperties(this.className);
	}

	private getStandardClassProperties(className: string) {
		let classPropeties:UIProperties[] = [];
		const SAPNode = this.findSAPNode(className);
		if (SAPNode) {
			const metadata = SAPNode.getMetadataSync();
			if (metadata) {
				if (metadata.getUI5Metadata().properties) {
					classPropeties = metadata.getUI5Metadata().properties.reduce((accumulator: UIProperties[], {visibility, name, type, description}:any) => {
						const additionalDescription = this.generateAdditionalDescriptionFrom(type);
						if (visibility === "public") {
							accumulator.push({
								name: name,
								type: type,
								typeValues: this.generateTypeValues(type),
								description: `${additionalDescription}\n${this.removeTags(description)}`.trim()
							});
						}
						return accumulator;
					}, []);
				}

				if (metadata.rawMetadata.extends) {
					classPropeties = classPropeties.concat(this.getStandardClassProperties(metadata.rawMetadata.extends));
				}
			}
		}
		return classPropeties;
	}

	private generateAdditionalDescriptionFrom(type: string) {
		let additionalDescription = "";
		if (type && type.startsWith("sap.")) {
			const typeNode = this.findSAPNode(type);
			if (typeNode) {
				const metadata = typeNode.getMetadataSync();
				if (metadata && metadata.rawMetadata && metadata.rawMetadata.properties) {
					additionalDescription = metadata.rawMetadata.properties.reduce((accumulator: string, property: any) => {
						accumulator += `${property.name}\n`;

						return accumulator;
					}, "");
				}
			}
		}

		return additionalDescription;
	}

	private generateTypeValues(type: string) {
		let typeValues = [];
		if (type && type.startsWith("sap.")) {
			const typeNode = this.findSAPNode(type);
			if (typeNode) {
				const metadata = typeNode.getMetadataSync();
				if (metadata) {
					typeValues = metadata.rawMetadata.properties.map((property: any) => `${property.name}`.replace(`${type}.`, ""));
				}
			}
		}

		return typeValues;
	}

	private fillEvents() {
		this.events = this.getStandardClassEvents(this.className);
	}

	private getStandardClassEvents(className: string) {
		let classEvents:UIEvents[] = [];
		const SAPNode = this.findSAPNode(className);
		if (SAPNode) {
			const metadata = SAPNode.getMetadataSync();
			if (metadata) {
				if (metadata.rawMetadata.events) {
					classEvents = metadata.rawMetadata.events.reduce((accumulator: UIEvents[], event:any) => {
						if (event.visibility === "public") {
							accumulator.push({
								name: event.name,
								description: this.removeTags(event.description)
							});
						}
						return accumulator;
					}, []);
				}

				if (metadata.rawMetadata.extends) {
					classEvents = classEvents.concat(this.getStandardClassEvents(metadata.rawMetadata.extends));
				}
			}

		}
		return classEvents;
	}
}

interface StandardClassUIMethod extends UIMethod {
	isFromParent: boolean;
}