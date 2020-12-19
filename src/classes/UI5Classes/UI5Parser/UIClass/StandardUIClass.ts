import { AbstractUIClass, UIMethod, UIProperty, UIEvent, UIAggregation, UIAssociation, TypeValue, UIField } from "./AbstractUIClass";
import { SAPNodeDAO } from "../../../librarydata/SAPNodeDAO";
import { MainLooper } from "../../JSParser/MainLooper";
import { URLBuilder } from "../../../utils/URLBuilder";
import { FileReader } from "../../../utils/FileReader";

const aXmlnsData = [{
	tag: "xmlns",
	value: "sap.m"
},{
	tag: "xmlns:f",
	value: "sap.f"
},{
	tag: "xmlns:c",
	value: "sap.ui.core"
},{
	tag: "xmlns:l",
	value: "sap.ui.layout"
},{
	tag: "xmlns:tnt",
	value: "sap.tnt"
},{
	tag: "xmlns:table",
	value: "sap.ui.table"
},{
	tag: "xmlns:unified",
	value: "sap.ui.unified"
},{
	tag: "xmlns:viz",
	value: "sap.viz"
},{
	tag: "xmlns:chart",
	value: "sap.chart"
},{
	tag: "xmlns:gantt",
	value: "sap.gantt"
},{
	tag: "xmlns:ovp",
	value: "sap.ovp"
},{
	tag: "xmlns:mc",
	value: "sap.suite.ui.microchart"
},{
	tag: "xmlns:commons",
	value: "sap.ui.commons"
},{
	tag: "xmlns:comp",
	value: "sap.ui.comp"
},{
	tag: "xmlns:uxap",
	value: "sap.uxap"
}];

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

		this.enrichWithXmlnsProperties();
	}

	private enrichWithXmlnsProperties() {
		if (this.className === "sap.ui.core.mvc.View" || this.className === "sap.ui.core.FragmentDefinition") {
			aXmlnsData.forEach(xmlnsData => {
				this.properties.push({
					name: xmlnsData.tag,
					description: xmlnsData.value,
					type: "string",
					visibility: "public",
					typeValues: [{text: xmlnsData.value, description: xmlnsData.value}]
				});
			});
		}
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
				description: `${StandardUIClass.removeTags(method.description)}`,
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

	public static removeTags(text: string = "") {
		let textWithoutTags = "";
		let i = 0;

		let tagOpened = 0;
		let tagClosed = 0;

		while (i < text.length) {
			if (text[i] === "<") {
				tagOpened++;
			} else if (text[i] === ">") {
				textWithoutTags += " ";
				tagClosed++;
			} else if (tagOpened === tagClosed) {
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

	private fillFields() {
		const SAPNode = this.findSAPNode(this.className);
		this.fields = SAPNode?.getFields().reduce((accumulator: UIField[], {name, type, description, visibility}:any) => {
			const additionalDescription = this.generateAdditionalDescriptionFrom(type);
			accumulator.push({
				name: name,
				type: type,
				description: `${additionalDescription}\n${StandardUIClass.removeTags(description)}`.trim(),
				visibility: visibility
			});
			return accumulator;
		}, []) || [];
	}

	private fillProperties() {
		this.properties = this.getStandardClassProperties(this.className);
	}

	private getStandardClassProperties(className: string) {
		let classProperties: UIProperty[] = [];
		const SAPNode = this.findSAPNode(className);
		classProperties = SAPNode?.getProperties().reduce((accumulator: UIProperty[], {name, type, description, visibility}:any) => {
			const additionalDescription = this.generateAdditionalDescriptionFrom(type);
			accumulator.push({
				name: name,
				type: type,
				typeValues: this.generateTypeValues(type),
				description: `${additionalDescription}\n${StandardUIClass.removeTags(description)}`.trim(),
				visibility: visibility
			});
			return accumulator;
		}, []) || [];
		return classProperties;
	}

	private generateAdditionalDescriptionFrom(className: string) {
		let additionalDescription = "";
		const isThisClassFromAProject = !!FileReader.getManifestForClass(className);
		if (!isThisClassFromAProject) {
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

		const isThisClassFromAProject = !!FileReader.getManifestForClass(type);
		if (typeValues.length === 0 && !isThisClassFromAProject) {
			const typeNode = this.findSAPNode(type);
			const metadata = typeNode?.getMetadata();
			typeValues = metadata?.rawMetadata?.properties?.map((property: any): TypeValue => {
				return {
					text: `${property.name}`.replace(`${type}.`, ""),
					description: StandardUIClass.removeTags(property.description)
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
		classEvents = SAPNode?.getEvents().reduce((accumulator: UIEvent[], event: any) => {
			accumulator.push({
				name: event.name,
				description: StandardUIClass.removeTags(event.description),
				visibility: event.visibility,
				params: event?.parameters?.filter((parameter: any) => parameter.depth === 2)
				.map((parameter: any) => {
					return {
						name: parameter.name,
						type: parameter.type
					};
				})
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

		classAggregations = SAPNode?.getAggregations().reduce((accumulator: UIAggregation[], aggregation: any) => {
			accumulator.push({
				name: aggregation.name,
				type: aggregation.type,
				multiple: aggregation.coordinality === "0..n",
				singularName: aggregation.singularName,
				description: StandardUIClass.removeTags(aggregation.description),
				visibility: aggregation.visibility,
				default: SAPNode.getMetadata()?.getUI5Metadata()?.defaultAggregation === aggregation.name
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
				description: StandardUIClass.removeTags(association.description),
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
			const codeExample = StandardUIClass.removeTags(constructor.codeExample);
			let parameterText = MainLooper.getEndOfChar("(", ")", codeExample);
			parameterText = parameterText.substring(1, parameterText.length - 1); //remove ()
			const parameters = parameterText.split(", ");

			this.methods.push({
				name: "constructor",
				description: StandardUIClass.removeTags(constructor.codeExample),
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