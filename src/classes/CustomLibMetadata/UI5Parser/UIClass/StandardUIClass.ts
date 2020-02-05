import { AbstractUIClass, UIMethod, UIProperty, UIEvent, UIAggregation } from "./AbstractUIClass";
import { SAPNodeDAO } from "../../../StandardLibMetadata/SAPNodeDAO";
import { MainLooper } from "../../JSParser/MainLooper";
import { URLBuilder } from "../../../Util/URLBuilder";

export class StandardUIClass extends AbstractUIClass {
	private readonly nodeDAO = new SAPNodeDAO();
	public methods: StandardClassUIMethod[] = [];

	constructor(className: string) {
		super(className);

		this.fillParentClassName();
		this.fillMethods();
		this.fillProperties();
		this.fillEvents();
		this.fillAggregations();
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
		let classPropeties:UIProperty[] = [];
		const SAPNode = this.findSAPNode(className);
		if (SAPNode) {
			const metadata = SAPNode.getMetadataSync();
			if (metadata) {
				if (metadata.getUI5Metadata().properties) {
					classPropeties = metadata.getUI5Metadata().properties.reduce((accumulator: UIProperty[], {visibility, name, type, description}:any) => {
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
		let classEvents:UIEvent[] = [];
		const SAPNode = this.findSAPNode(className);
		if (SAPNode) {
			const metadata = SAPNode.getMetadataSync();
			if (metadata) {
				if (metadata.rawMetadata.events) {
					classEvents = metadata.rawMetadata.events.reduce((accumulator: UIEvent[], event:any) => {
						if (event.visibility === "public") {
							accumulator.push({
								name: event.name,
								description: this.removeTags(event.description)
							});
						}
						return accumulator;
					}, []);
				}
			}

		}
		return classEvents;
	}

	private fillAggregations() {
		this.aggregations = this.getStandardClassAggregations(this.className);
	}

	private getStandardClassAggregations(className: string) {
		let classAggregations: UIAggregation[] = [];
		const SAPNode = this.findSAPNode(className);

		if (SAPNode) {
			const metadata = SAPNode.getMetadataSync();
			if (metadata) {
				if (metadata.getUI5Metadata() && metadata.getUI5Metadata().aggregations) {
					classAggregations = metadata.getUI5Metadata().aggregations.reduce((accumulator: UIAggregation[], aggregation:any) => {
						if (aggregation.visibility === "public") {
							accumulator.push({
								name: aggregation.name,
								type: aggregation.type,
								multiple: aggregation.coordinality === "0..n",
								singularName: aggregation.singularName
							});
						}
						return accumulator;
					}, []);
				}
			}

		}
		return classAggregations;
	}
}

interface StandardClassUIMethod extends UIMethod {
	isFromParent: boolean;
}