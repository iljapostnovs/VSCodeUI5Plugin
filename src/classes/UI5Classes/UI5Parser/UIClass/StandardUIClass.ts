import {AbstractUIClass, UIMethod, UIProperty, UIEvent, UIAggregation, UIAssociation, TypeValue, UIField} from "./AbstractUIClass";
import {SAPNodeDAO} from "../../../librarydata/SAPNodeDAO";
import {MainLooper} from "../../JSParser/MainLooper";
import {URLBuilder} from "../../../utils/URLBuilder";
import {FileReader} from "../../../utils/FileReader";

const aXmlnsData = [{
	tag: "xmlns",
	value: "sap.m"
}, {
	tag: "xmlns:f",
	value: "sap.f"
}, {
	tag: "xmlns:c",
	value: "sap.ui.core"
}, {
	tag: "xmlns:l",
	value: "sap.ui.layout"
}, {
	tag: "xmlns:tnt",
	value: "sap.tnt"
}, {
	tag: "xmlns:table",
	value: "sap.ui.table"
}, {
	tag: "xmlns:unified",
	value: "sap.ui.unified"
}, {
	tag: "xmlns:viz",
	value: "sap.viz"
}, {
	tag: "xmlns:chart",
	value: "sap.chart"
}, {
	tag: "xmlns:gantt",
	value: "sap.gantt"
}, {
	tag: "xmlns:ovp",
	value: "sap.ovp"
}, {
	tag: "xmlns:mc",
	value: "sap.suite.ui.microchart"
}, {
	tag: "xmlns:commons",
	value: "sap.ui.commons"
}, {
	tag: "xmlns:comp",
	value: "sap.ui.comp"
}, {
	tag: "xmlns:uxap",
	value: "sap.uxap"
}];

export class StandardUIClass extends AbstractUIClass {
	private readonly _nodeDAO = new SAPNodeDAO();
	public methods: StandardClassUIMethod[] = [];

	constructor(className: string) {
		super(className);

		this.classExists = !!this._findSAPNode(this.className) || className.endsWith(".library");

		if (this.classExists) {
			this._fillParentClassName();
			this._fillMethods();
			this._fillProperties();
			this._fillFields();
			this._fillEvents();
			this._fillAggregations();
			this._fullAssociations();
			this._fillConstructor();
			this._fillInterfaces();

			this._enrichWithXmlnsProperties();
		}
	}

	private _enrichWithXmlnsProperties() {
		if (this.className === "sap.ui.core.mvc.View" || this.className === "sap.ui.core.FragmentDefinition") {
			aXmlnsData.forEach(xmlnsData => {
				this.properties.push({
					name: xmlnsData.tag,
					description: xmlnsData.value,
					type: "string",
					visibility: "public",
					typeValues: [{
						text: xmlnsData.value,
						description: xmlnsData.value
					}]
				});
			});
		}
	}

	private _fillMethods() {
		this.methods = this._getStandardClassMethods(this.className, true);
	}

	private _getStandardClassMethods(className: string, isParent: boolean) {
		let classMethods: StandardClassUIMethod[] = [];
		const SAPNode = this._findSAPNode(className);
		classMethods = SAPNode?.getMethods().map((method: any) => {
			let methodName = method.name.replace(`${this.className}.`, "");
			if (methodName.indexOf(SAPNode.getMetadata()?.getRawMetadata()?.name) > -1) {
				methodName = methodName.replace(SAPNode.getMetadata().getRawMetadata().name + ".", "");
			}

			const classMethod: StandardClassUIMethod = {
				name: methodName,
				description: `${StandardUIClass.removeTags(method.description)}`,
				params: method.parameters ? method.parameters
					.filter((parameter: any) => !parameter.depth)
					.map((parameter: any) => {
						return {
							name: parameter.name + (parameter.optional ? "?" : ""),
							description: StandardUIClass.removeTags(parameter.description),
							type: parameter.types ? parameter.types.map((type: any) => type.value).join("|") : "any",
							isOptional: parameter.optional || false
						};
					}) : [],
				returnType: method.returnValue ? method.returnValue.type : "void",
				isFromParent: !isParent,
				api: URLBuilder.getInstance().getMarkupUrlForMethodApi(SAPNode, method.name),
				visibility: method.visibility
			};

			this._removeFirstArgumentIfItIsEvent(classMethod);
			this._addParametersForDataMethod(classMethod);
			return classMethod;
		}) || [];
		return classMethods;
	}

	private _removeFirstArgumentIfItIsEvent(method: StandardClassUIMethod) {
		if (method.name.startsWith("attach")) {
			if (method.params?.length > 0) {
				const param = method.params.find(param => param.name === "oData?");
				if (param) {
					method.params.splice(method.params.indexOf(param), 1);
				}
			}
		}
	}

	private _addParametersForDataMethod(method: StandardClassUIMethod) {
		if (method.name === "data" && method.params.length === 0) {
			method.params.push({
				type: "string",
				name: "sCustomDataKey?",
				description: "Unique custom data key",
				isOptional: true
			});
			method.params.push({
				type: "any",
				name: "vData?",
				description: "data for Custom Data",
				isOptional: true
			});
			method.params.push({
				type: "boolean",
				name: "bWriteToDom?",
				description: "Custom data key",
				isOptional: true
			});
		}
	}

	private _findSAPNode(className: string) {
		return this._nodeDAO.findNode(className);
	}

	public static removeTags(text = "") {
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

	private _fillParentClassName() {
		const SAPNode = this._findSAPNode(this.className);
		if (SAPNode) {
			const metadata = SAPNode.getMetadata();
			if (metadata) {
				this.parentClassNameDotNotation = metadata.rawMetadata.extends;
			}
		}
	}

	private _fillFields() {
		const SAPNode = this._findSAPNode(this.className);
		this.fields = SAPNode?.getFields().reduce((accumulator: UIField[], {name, type, description, visibility}: any) => {
			const additionalDescription = this._generateAdditionalDescriptionFrom(type);
			accumulator.push({
				name: name,
				type: type,
				description: `${additionalDescription}\n${StandardUIClass.removeTags(description)}`.trim(),
				visibility: visibility
			});
			return accumulator;
		}, []) || [];
	}

	private _fillProperties() {
		this.properties = this._getStandardClassProperties(this.className);
	}

	private _getStandardClassProperties(className: string) {
		let classProperties: UIProperty[] = [];
		const SAPNode = this._findSAPNode(className);
		classProperties = SAPNode?.getProperties().reduce((accumulator: UIProperty[], {name, type, description, visibility}: any) => {
			const additionalDescription = this._generateAdditionalDescriptionFrom(type);
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

	private _generateAdditionalDescriptionFrom(className: string) {
		let additionalDescription = "";
		const isThisClassFromAProject = !!FileReader.getManifestForClass(className);
		if (!isThisClassFromAProject) {
			const SAPNode = this._findSAPNode(className);
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
			const typeNode = this._findSAPNode(type);
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

	private _fillEvents() {
		this.events = this._getStandardClassEvents(this.className);
	}

	private _getStandardClassEvents(className: string) {
		let classEvents: UIEvent[] = [];
		const SAPNode = this._findSAPNode(className);
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

	private _fillAggregations() {
		this.aggregations = this._getStandardClassAggregations(this.className);
	}

	private _getStandardClassAggregations(className: string) {
		let classAggregations: UIAggregation[] = [];
		const SAPNode = this._findSAPNode(className);

		classAggregations = SAPNode?.getAggregations().reduce((accumulator: UIAggregation[], aggregation: any) => {
			accumulator.push({
				name: aggregation.name,
				type: aggregation.type,
				multiple: aggregation.cardinality === "0..n",
				singularName: aggregation.singularName,
				description: StandardUIClass.removeTags(aggregation.description),
				visibility: aggregation.visibility,
				default: SAPNode.getMetadata()?.getUI5Metadata()?.defaultAggregation === aggregation.name
			});
			return accumulator;
		}, []) || [];

		return classAggregations;
	}

	private _fullAssociations() {
		this.associations = this._getStandardClassAssociations(this.className);
	}

	private _getStandardClassAssociations(className: string) {
		let classAssociation: UIAssociation[] = [];
		const SAPNode = this._findSAPNode(className);

		classAssociation = SAPNode?.getAssociations().reduce((accumulator: UIAssociation[], association: any) => {
			accumulator.push({
				name: association.name,
				type: association.type,
				description: StandardUIClass.removeTags(association.description),
				multiple: association.multiple || association.cardinality === "0..n",
				singularName: association.singularName,
				visibility: association.visibility
			});
			return accumulator;
		}, []) || [];
		return classAssociation;
	}

	private _fillConstructor() {
		const SAPNode = this._findSAPNode(this.className);
		const metadata = SAPNode?.getMetadata();
		if (metadata?.rawMetadata?.constructor?.codeExample) {
			const constructor = metadata.rawMetadata.constructor;
			const codeExample = StandardUIClass.removeTags(constructor.codeExample);
			let parameterText = MainLooper.getEndOfChar("(", ")", codeExample);
			parameterText = parameterText.substring(1, parameterText.length - 1); //remove ()
			const parameters = parameterText ? parameterText.split(", ") : [];

			this.methods.push({
				name: "constructor",
				description: StandardUIClass.removeTags(constructor.codeExample),
				params: parameters.map(param => {
					return {
						name: param,
						description: "",
						type: "any",
						isOptional: param.endsWith("?")
					};
				}),
				returnType: this.className,
				isFromParent: false,
				api: URLBuilder.getInstance().getUrlForClassApi(this),
				visibility: "public"
			});
		}
	}

	private _fillInterfaces() {
		const SAPNode = this._findSAPNode(this.className);
		const metadata = SAPNode?.getMetadata();
		if (metadata?.getRawMetadata()?.implements) {
			this.interfaces = metadata?.getRawMetadata()?.implements;
		}
	}
}

interface StandardClassUIMethod extends UIMethod {
	isFromParent: boolean;
}