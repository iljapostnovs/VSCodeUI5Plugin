import { AbstractUIClass, UIMethod, UIProperty, UIEvent, UIAggregation, UIAssociation, TypeValue, UIField } from "./AbstractUIClass";
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
		this.fillFields();
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
		classMethods = SAPNode?.getMethods().map((method: any) => {
			return {
				name: method.name.replace(`${this.className}.`, ""),
				description: this.removeTags(method.code),
				params: method.parameters ? method.parameters.map((parameter: any) => parameter.name + (parameter.optional ? "?" : "")) : [],
				returnType: method.returnValue ? method.returnValue.type : "void",
				isFromParent: !isParent,
				api: URLBuilder.getInstance().getMarkupUrlForMethodApi(SAPNode, method.name),
				visibility: method.visibility
			};
		}) || [];
		return classMethods;
	}

	private findSAPNode(className: string) {
		return this.nodeDAO.findNode(className);
	}

	public removeTags(text: string = "") {
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
			const metadata = SAPNode.getMetadata();
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

	private fillFields() {
		const SAPNode = this.findSAPNode(this.className);
		this.fields = SAPNode?.getFields().reduce((accumulator: UIField[], {name, type, description, visibility}:any) => {
			const additionalDescription = this.generateAdditionalDescriptionFrom(type);
			accumulator.push({
				name: name,
				type: type,
				description: `${additionalDescription}\n${this.removeTags(description)}`.trim(),
				visibility: visibility
			});
			return accumulator;
		}, []);
	}

	private fillProperties() {
		this.properties = this.getStandardClassProperties(this.className);
	}

	private getStandardClassProperties(className: string) {
		let classPropeties: UIProperty[] = [];
		const SAPNode = this.findSAPNode(className);
		classPropeties = SAPNode?.getProperties().reduce((accumulator: UIProperty[], {name, type, description, visibility}:any) => {
			const additionalDescription = this.generateAdditionalDescriptionFrom(type);
			accumulator.push({
				name: name,
				type: type,
				typeValues: this.generateTypeValues(type),
				description: `${additionalDescription}\n${this.removeTags(description)}`.trim(),
				visibility: visibility
			});
			return accumulator;
		}, []) || [];
		return classPropeties;
	}

	private generateAdditionalDescriptionFrom(className: string) {
		let additionalDescription = "";
		if (className?.startsWith("sap.")) {
			const SAPNode = this.findSAPNode(className);
			additionalDescription = SAPNode?.getProperties().reduce((accumulator: string, property: any) => {
				accumulator += `${property.name}\n`;

				return accumulator;
			}, "") || "";
		}

		return additionalDescription;
	}

	protected generateTypeValues(type: string) {
		let typeValues = super.generateTypeValues(type);

		if (typeValues.length === 0 && type?.startsWith("sap.")) {
			const typeNode = this.findSAPNode(type);
			const metadata = typeNode?.getMetadata();
			typeValues = metadata?.rawMetadata?.properties?.map((property: any): TypeValue => {
				return {
					text: `${property.name}`.replace(`${type}.`, ""),
					description: this.removeTags(property.description)
				};
			}) || [];
		}

		return typeValues;
	}

	private fillEvents() {
		this.events = this.getStandardClassEvents(this.className);
	}

	private getStandardClassEvents(className: string) {
		let classEvents: UIEvent[] = [];
		const SAPNode = this.findSAPNode(className);
		classEvents = SAPNode?.getEvents().reduce((accumulator: UIEvent[], event:any) => {
			accumulator.push({
				name: event.name,
				description: this.removeTags(event.description),
				visibility: event.visibility
			});
			return accumulator;
		}, []) || [];

		return classEvents;
	}

	private fillAggregations() {
		this.aggregations = this.getStandardClassAggregations(this.className);
	}

	private getStandardClassAggregations(className: string) {
		let classAggregations: UIAggregation[] = [];
		const SAPNode = this.findSAPNode(className);

		classAggregations = SAPNode?.getAggregations().reduce((accumulator: UIAggregation[], aggregation:any) => {
			accumulator.push({
				name: aggregation.name,
				type: aggregation.type,
				multiple: aggregation.coordinality === "0..n",
				singularName: aggregation.singularName,
				description: this.removeTags(aggregation.description),
				visibility: aggregation.visibility
			});
			return accumulator;
		}, []) || [];

		return classAggregations;
	}

	private fullAssociations() {
		this.associations = this.getStandardClassAssociations(this.className);
	}

	private getStandardClassAssociations(className: string) {
		let classAssociation: UIAssociation[] = [];
		const SAPNode = this.findSAPNode(className);

		classAssociation = SAPNode?.getAssociations().reduce((accumulator: UIAssociation[], association:any) => {
			accumulator.push({
				name: association.name,
				type: association.type,
				description: this.removeTags(association.description),
				multiple: association.multiple || association.coordinality === "0..n",
				singularName: association.singularName,
				visibility: association.visibility
			});
			return accumulator;
		}, []) || [];
		return classAssociation;
	}

	public fillConstructor() {
		const SAPNode = this.findSAPNode(this.className);
		const metadata = SAPNode?.getMetadata();
		if (metadata?.rawMetadata?.constructor?.codeExample) {
			const constructor = metadata.rawMetadata.constructor;
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
				api: URLBuilder.getInstance().getUrlForClassApi(this),
				visibility: "public"
			});
		}
	}
}

interface StandardClassUIMethod extends UIMethod {
	isFromParent: boolean;
}