import { AbstractUIClass, UIMethod, UIProperty, UIEvent, UIAggregation, UIAssociation } from "./AbstractUIClass";
import { SAPNodeDAO } from "../../../StandardLibMetadata/SAPNodeDAO";
import { MainLooper } from "../../JSParser/MainLooper";
import { URLBuilder } from "../../../Util/URLBuilder";
import { SAPIcons } from "../../SAPIcons";

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
		this.fullAssociations();
		this.fillConstructor();
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
		let textWithoutTags = "";
		let i = 0;

		let tagOpened = 0;
		let tagClosed = 0;

		while (i < text.length) {
			if (text[i] === "<") {
				tagOpened++;
			} else if (text[i] === ">") {
				tagClosed++;
			} else if (tagOpened - tagClosed === 0) {
				textWithoutTags += text[i];
			}

			i++;
		}

		return textWithoutTags;
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
			if (metadata?.getUI5Metadata()?.properties) {
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
		return classPropeties;
	}

	private generateAdditionalDescriptionFrom(type: string) {
		let additionalDescription = "";
		if (type?.startsWith("sap.")) {
			const typeNode = this.findSAPNode(type);
			if (typeNode) {
				const metadata = typeNode.getMetadataSync();
				if (metadata?.rawMetadata?.properties) {
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
		let typeValues: string[] = [];
		if (type === "sap.ui.core.URI") {
			typeValues = SAPIcons.icons;
		} else if (type?.startsWith("sap.")) {
			const typeNode = this.findSAPNode(type);
			const metadata = typeNode?.getMetadataSync();
			typeValues = metadata?.rawMetadata?.properties?.map((property: any) => `${property.name}`.replace(`${type}.`, "")) || [];
		}

		return typeValues;
	}

	private fillEvents() {
		this.events = this.getStandardClassEvents(this.className);
	}

	private getStandardClassEvents(className: string) {
		let classEvents: UIEvent[] = [];
		const SAPNode = this.findSAPNode(className);
		const metadata = SAPNode?.getMetadataSync();
		if (metadata?.rawMetadata?.events) {
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
		return classEvents;
	}

	private fillAggregations() {
		this.aggregations = this.getStandardClassAggregations(this.className);
	}

	private getStandardClassAggregations(className: string) {
		let classAggregations: UIAggregation[] = [];
		const SAPNode = this.findSAPNode(className);

		const metadata = SAPNode?.getMetadataSync();
		if (metadata?.getUI5Metadata()?.aggregations) {
			classAggregations = metadata.getUI5Metadata().aggregations.reduce((accumulator: UIAggregation[], aggregation:any) => {
				if (aggregation.visibility === "public") {
					accumulator.push({
						name: aggregation.name,
						type: aggregation.type,
						multiple: aggregation.coordinality === "0..n",
						singularName: aggregation.singularName,
						description: this.removeTags(aggregation.description)
					});
				}
				return accumulator;
			}, []);
		}

		return classAggregations;
	}

	private fullAssociations() {
		this.associations = this.getStandardClassAssociations(this.className);
	}

	private getStandardClassAssociations(className: string) {
		let classAssociation: UIAssociation[] = [];
		const SAPNode = this.findSAPNode(className);

		const metadata = SAPNode?.getMetadataSync();
		if (metadata?.getUI5Metadata()?.associations) {
			classAssociation = metadata.getUI5Metadata().associations.reduce((accumulator: UIAssociation[], association:any) => {
				if (association.visibility === "public") {
					accumulator.push({
						name: association.name,
						type: association.type,
						description: this.removeTags(association.description),
						multiple: association.multiple || association.coordinality === "0..n",
						singularName: association.singularName
					});
				}
				return accumulator;
			}, []);
		}
		return classAssociation;
	}

	public fillConstructor() {
		const SAPNode = this.findSAPNode(this.className);
		const metadata = SAPNode?.getMetadataSync();
		if (metadata?.rawMetadata?.constructor) {
			const constructor = metadata.rawMetadata.constructor;
			// let parameters = constructor.parameters || [];
			// parameters = parameters.map((parameter: any) => parameter.name);
			const codeExample = this.removeTags(constructor.codeExample);
			let parameterText = MainLooper.getEndOfChar("(", ")", codeExample);
			parameterText = parameterText.substring(1, parameterText.length - 1); //remove ()
			const parameters = parameterText.split(", ");

			this.methods.push({
				name: "constructor",
				description: this.removeTags(constructor.codeExample),
				params: parameters,
				returnType: this.className,
				isFromParent: false,
				api: URLBuilder.getInstance().getUrlForClassApi(this)
			});
		}
	}
}

interface StandardClassUIMethod extends UIMethod {
	isFromParent: boolean;
}