import { FileReader } from "../../../Util/FileReader";
import { AbstractType } from "../../JSParser/types/AbstractType";
import { JSFunction } from "../../JSParser/types/Function";
import { JSObject } from "../../JSParser/types/Object";
import { AbstractUIClass, UIField, UIAggregation, UIEvent, UIMethod, UIProperty, UIAssociation } from "./AbstractUIClass";
import * as acorn from "acorn";
const commentParser = require("comment-parser");

interface UIDefine {
	path: string;
	className: string;
	classNameDotNotation: string;
}

interface Comment {
	text: string;
	start: number;
	end: number;
	jsdoc: any;
}
export interface CustomClassUIMethod extends UIMethod {
	position?: number;
	fnRef?: JSFunction;
}
export class CustomUIClass extends AbstractUIClass {
	public methods: CustomClassUIMethod[] = [];
	public classBody: JSObject | undefined;
	public classText: string = "";
	public UIDefine: UIDefine[] = [];
	public jsPasredBody: AbstractType | undefined;
	public comments: Comment[] = [];
	public acornClassBody: any;
	public fileContent: any;
	private parentVariableName: any;

	constructor(className: string, documentText?: string) {
		super(className);

		this.readFileContainingThisClassCode(documentText); //todo: rename. not always reading anyore.
		this.UIDefine = this.getUIDefine();
		this.acornClassBody = this.getThisClassBodyAcorn();
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

			try {
				this.fileContent = acorn.parse(documentText, {
					ecmaVersion: 2020,
					onComment: (isBlock: boolean, text: string, start: number, end: number) => {
						if (isBlock && text.startsWith("*")) {
							this.comments.push({
								text: text,
								start: start,
								end: end,
								jsdoc: commentParser(`/*${text}*/`)[0]
							});
						}

					}}
				);
			} catch (error) {
				this.fileContent = null;
			}
		}
	}

	private getUIDefine() {
		let UIDefine: UIDefine[] = [];

		if (this.fileContent) {
			const args = this.fileContent?.body[0]?.expression?.arguments;
			if (args && args.length === 2) {
				const UIDefinePaths: string[] = args[0].elements?.map((part: any) => part.value);
				const UIDefineClassNames: string[] = args[1].params?.map((part: any) => part.name);
				UIDefine = UIDefineClassNames.map((className, index) : UIDefine => {
					return {
						path: UIDefinePaths[index],
						className: className,
						classNameDotNotation: UIDefinePaths[index] ? UIDefinePaths[index].replace(/\//g, ".") : ""
					};
				});
			}
		}

		return UIDefine;
	}

	private getThisClassBodyAcorn() {
		const body = this.fileContent;
		let classBody: any;

		const returnKeyword = body?.body[0]?.expression?.arguments[1]?.body?.body?.find((body: any) => body.type === "ReturnStatement");
		if (returnKeyword && body) {
			classBody = this.getClassBodyFromPartAcorn(returnKeyword.argument, body.body[0].expression.arguments[1].body);
		}

		return classBody;
	}

	private getClassBodyFromPartAcorn(part: any, partParent: any) : any {
		let classBody: any;

		if (part.type === "CallExpression") {
			classBody = this.getClassBodyFromClassExtendAcorn(part);

			if (classBody) {
				this.parentVariableName = part.callee.object.name;
			}
		} else if (part.type === "ObjectExpression") {
			classBody = part;
		} else if (part.type === "Identifier") {
			const variable = partParent.body
			.filter((body: any) => body.type === "VariableDeclaration")
			.find((variable: any) =>
				variable.declarations.find((declaration: any) => declaration.id.name === part.name)
			);

			if (variable) {
				const neededDeclaration = variable.declarations.find((declaration: any) => declaration.id.name === part.name);
				classBody = this.getClassBodyFromPartAcorn(neededDeclaration.init, partParent);
			}
		}

		return classBody;
	}

	private getClassBodyFromClassExtendAcorn(part: any) {
		let classBody: any;

		if (this.isThisPartAClassBodyAcorn(part)) {
			classBody = part.arguments[1];
		}

		return classBody;
	}

	private isThisPartAClassBodyAcorn(part: any) {
		const propertyName = part?.callee?.property?.name;

		return propertyName === "extend" || propertyName === "declareStaticClass";
	}

	public isAssignmentStatementForThisVariable(node: any) {
		return 	node.type === "ExpressionStatement" &&
				node.expression.type === "AssignmentExpression" &&
				node.expression.operator === "=" &&
				node.expression.left.type === "MemberExpression" &&
				node.expression.left.object.type === "ThisExpression";
	}
	private fillMethodsAndFields() {
		if (this.acornClassBody) {
			this.acornClassBody.properties.forEach((property: any) => {
				if (property.value.type === "FunctionExpression") {
					const functionParts = property.value.body.body;
					functionParts.forEach((node: any) => {
						if (this.isAssignmentStatementForThisVariable(node)) {
							this.fields.push({
								name: node.expression.left.property.name,
								type: node.expression.left.property.name.jsType,
								description: node.expression.left.property.name.jsType || ""
							});
						}
					});
				}
			});

			this.acornClassBody.properties.forEach((property: any) => {
				if (property.value.type === "FunctionExpression") {
					const description = `(${property.value.params.map((param: any) => param.name).join(", ")}) : ${(property.returnType ? property.returnType : "void")}`;
					this.methods.push({
						name: property.key.name,
						params: property.value.params.map((param: any) => param.name),
						returnType: property.returnType || "void",
						description: description,
						position: property.start,
						fnRef: undefined
					});
				} else if (property.value.type === "Identifier") {
					this.fields.push({
						name: property.key.name,
						type: property.jsType,
						description: property.jsType || ""
					});
				}
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
		}

		this.fillMethodsFromMetadata();
	}

	public fillTypesFromHungarionNotation() {
		this.fields.forEach(field => {
			if (!field.type) {
				field.type = this.getTypeFromHungariantNotation(field.name);
			}
		});
	}

	private getTypeFromHungariantNotation(variable: string) {
		let type;
		interface looseObject {
			[key: string]: any;
		}
		const map: looseObject = {
			$: "dom",
			o: "object",
			a: "array",
			i: "int",
			f: "float",
			m: "map",
			s: "string",
			b: "boolean",
			p: "Promise",
			d: "Date",
			r: "RegExp",
			v: "any"
		};

		variable = variable.replace("_", "").replace("this.", "");
		const firstChar = variable[0];
		const secondChar = variable[1];
		if (map[firstChar] && secondChar === secondChar.toUpperCase()) {
			type = map[firstChar];
		}

		return type;
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
				returnType: property.type || "void"
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
					returnType: aggregation.type || "void"
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
					returnType: this.className
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
					returnType: association.type || this.className
				});
			});

		});
	}

	private findParentClassNameDotNotation() {
		if (this.parentVariableName) {
			const parentClassUIDefine = this.UIDefine.find(UIDefine => UIDefine.className === this.parentVariableName);
			if (parentClassUIDefine) {
				this.parentClassNameDotNotation = parentClassUIDefine.classNameDotNotation;
			}
		}
	}

	public getClassOfTheVariable(variableName: string, position: number) {
		return "";
	}

	private fillUI5Metadata() {
		if (this.acornClassBody) {
			const metadataExists = !!this.acornClassBody.properties.find((property: any) => property.key.name === "metadata");
			const customMetadataExists = !!this.acornClassBody.properties.find((property: any) => property.key.name === "customMetadata");

			if (metadataExists) {
				const metadataObject = this.acornClassBody.properties.find((property: any) => property.key.name === "metadata");

				this.fillAggregations(metadataObject);
				this.fillEvents(metadataObject);
				this.fillProperties(metadataObject);
				this.fillByAssociations(metadataObject);
			}

			if (customMetadataExists) {
				const customMetadataObject = this.acornClassBody.properties.find((property: any) => property.key.name === "customMetadata");

				this.fillByAssociations(customMetadataObject);
			}
		}
	}

	private fillAggregations(metadata: any) {
		const aggregations = metadata.value.properties.find((metadataNode: any) => metadataNode.key.name === "aggregations");

		if (aggregations) {
			this.aggregations = aggregations.value.properties.map((aggregationNode: any) => {
				const aggregationName = aggregationNode.key.name;
				const aggregationProps = aggregationNode.value.properties;

				let aggregationType: undefined | string = undefined;
				const aggregationTypeProp = aggregationProps.find((aggregationProperty: any) => aggregationProperty.key.name === "type");
				if (aggregationTypeProp) {
					aggregationType = aggregationTypeProp.value.value;
				}

				let multiple = true;
				const multipleProp = aggregationProps.find((aggregationProperty: any) => aggregationProperty.key.name === "multiple");
				if (multipleProp) {
					multiple = multipleProp.value.value;
				}

				let singularName = "";
				const singularNameProp = aggregationProps.find((aggregationProperty: any) => aggregationProperty.key.name === "singularName");
				if (singularNameProp) {
					singularName = singularNameProp.value.value;
				}
				if (!singularName) {
					singularName = aggregationName;
				}

				const UIAggregations: UIAggregation = {
					name: aggregationName,
					type: aggregationType,
					multiple: multiple,
					singularName: singularName,
					description: ""
				};
				return UIAggregations;
			});
		}
	}

	private fillEvents(metadata: any) {
		const eventMetadataNode = metadata.value.properties.find((metadataNode: any) => metadataNode.key.name === "events");

		if (eventMetadataNode) {
			const events = eventMetadataNode.value.properties;
			this.events = events.map((eventNode: any) => {
				const UIEvent: UIEvent = {
					name: eventNode.key.name,
					description: ""

				};
				return UIEvent;
			});
		}
	}

	private fillProperties(metadata: any) {
		const propertiesMetadataNode = metadata.value.properties.find((metadataNode: any) => metadataNode.key.name === "properties");

		if (propertiesMetadataNode) {
			const properties = propertiesMetadataNode.value.properties;
			this.properties = properties.map((propertyNode: any, i: any) => {

				const propertyName = propertyNode.key.name;
				const propertyProps = propertyNode.value.properties;

				let propertyType: undefined | string = undefined;
				const propertyTypeProp = propertyProps.find((property: any) => property.key.name === "type");
				if (propertyTypeProp) {
					propertyType = propertyTypeProp.value.value;
				}

				const UIProperties: UIProperty = {
					name: propertyName,
					type: propertyType,
					description: "",
					typeValues: this.generateTypeValues(propertyType || "")
				};

				return UIProperties;
			});
		}
	}

	private fillByAssociations(metadata: any) {
		const associationMetadataNode = metadata.value.properties.find((metadataNode: any) => metadataNode.key.name === "associations");

		if (associationMetadataNode) {
			const associations = associationMetadataNode.value.properties;
			this.associations = this.associations.concat(associations.map((associationNode: any) => {

				const associationName = associationNode.key.name;
				const associationProps = associationNode.value.properties;

				let associationType: undefined | string = undefined;
				const associationTypeProp = associationProps.find((associationProperty: any) => associationProperty.key.name === "type");
				if (associationTypeProp) {
					associationType = associationTypeProp.value.value;
				}

				let multiple = true;
				const multipleProp = associationProps.find((associationProperty: any) => associationProperty.key.name === "multiple");
				if (multipleProp) {
					multiple = multipleProp.value.value;
				}

				let singularName = "";
				const singularNameProp = associationProps.find((associationProperty: any) => associationProperty.key.name === "singularName");
				if (singularNameProp) {
					singularName = singularNameProp.value.value;
				}
				if (!singularName) {
					singularName = associationName;
				}

				const UIAssociations: UIAssociation = {
					name: associationName,
					type: associationType,
					multiple: multiple,
					singularName: singularName,
					description: ""
				};
				return UIAssociations;
			}));
		}
	}
}
