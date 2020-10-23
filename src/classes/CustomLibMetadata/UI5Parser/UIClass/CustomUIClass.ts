import { FileReader } from "../../../Util/FileReader";
import { AbstractUIClass, UIField, UIAggregation, UIEvent, UIMethod, UIProperty, UIAssociation } from "./AbstractUIClass";
const commentParser = require("comment-parser");
const acornLoose = require("acorn-loose");

interface UIDefine {
	path: string;
	className: string;
	classNameDotNotation: string;
}
interface LooseObject {
	[key: string]: any;
}

interface Comment {
	text: string;
	start: number;
	end: number;
	jsdoc: any;
}
export interface CustomClassUIMethod extends UIMethod {
	position?: number;
}
export interface CustomClassUIField extends UIField {
	customData?: LooseObject;
}
export class CustomUIClass extends AbstractUIClass {
	public methods: CustomClassUIMethod[] = [];
	public fields: CustomClassUIField[] = [];
	public classText: string = "";
	public UIDefine: UIDefine[] = [];
	public comments: Comment[] = [];
	public acornClassBody: any;
	public acornMethodsAndFields: any[] = [];
	public fileContent: any;
	private parentVariableName: any;
	private classBodyacornVariableName: string | undefined;

	constructor(className: string, documentText?: string) {
		super(className);

		this.readFileContainingThisClassCode(documentText); //todo: rename. not always reading anyore.
		this.UIDefine = this.getUIDefine();
		this.acornClassBody = this.getThisClassBodyAcorn();
		this.findParentClassNameDotNotation();
		this.fillUI5Metadata();
		this.fillMethodsAndFields();
		this.enrichMethodInfoWithJSDocs();
	}

	private enrichMethodInfoWithJSDocs() {
		if (this.acornClassBody) {
			//instance methods
			let methods = this.acornClassBody.properties?.filter((node: any) =>
				node.value.type === "FunctionExpression" ||
				node.value.type === "ArrowFunctionExpression"
			) || [];

			//static methods
			//TODO: Move this
			const UIDefineBody = this.fileContent?.body[0]?.expression?.arguments[1]?.body?.body;
			if (UIDefineBody && this.classBodyacornVariableName) {
				const thisClassVariableAssignments: any[] = UIDefineBody.filter((node: any) => {
					return 	node.type === "ExpressionStatement" &&
							(
								node.expression?.left?.object?.name === this.classBodyacornVariableName ||
								node.expression?.left?.object?.object?.name === this.classBodyacornVariableName
							);
				});

				const staticMethods = thisClassVariableAssignments
				.filter(node => {
					const assignmentBody = node.expression.right;
					return assignmentBody.type === "ArrowFunctionExpression" || assignmentBody.type === "FunctionExpression";
				}).map(node => ({
					key: {
						name: node.expression.left.property.name,
						start: node.expression.left.property.start,
						end: node.expression.left.property.end,
						type:'Identifier'
					},
					value: node.expression.right,
					start: node.expression.left.object.start,
					end: node.expression.right.end,
					type: "Property"
				}));
				methods = methods.concat(staticMethods);
			}

			this.acornMethodsAndFields = this.acornMethodsAndFields.concat(methods);

			methods.forEach((method: any) => {
				const methodName = method.key.name;
				const params = method.value.params;
				const comment = this.comments.find(comment => {
					const positionDifference = method.start - comment.end;
					return positionDifference < 10 && positionDifference > 0;
				});
				if (comment) {
					const paramTags = comment.jsdoc?.tags?.filter((tag: any) => tag.tag === "param");
					const returnTag = comment.jsdoc?.tags?.find((tag: any) => tag.tag === "return" || tag.tag === "returns");
					const asyncTag = comment.jsdoc?.tags?.find((tag: any) => tag.tag === "async");

					if (paramTags) {
						paramTags.forEach((tag: any) => {
							const param = params.find((param: any) => param.name === tag.name);
							if (param) {
								param.jsType = tag.type;
							}
						});
					}

					if (asyncTag) {
						const UIMethod = this.methods.find(method => method.name === methodName);
						if (UIMethod) {
							UIMethod.returnType = "Promise";
							this.generateDescriptionForMethod(UIMethod)
						}
					} else if (returnTag) {
						const UIMethod = this.methods.find(method => method.name === methodName);
						if (UIMethod) {
							UIMethod.returnType = returnTag.type;
							this.generateDescriptionForMethod(UIMethod);
						}
					}
				}
			});
		}
	}

	private readFileContainingThisClassCode(documentText?: string) {
		if (!documentText) {
			documentText = FileReader.getDocumentTextFromCustomClassName(this.className);
		}
		this.classText = documentText || "";
		if (documentText) {

			try {
				this.fileContent = acornLoose.parse(documentText, {
					ecmaVersion: 11,
					onComment: (isBlock: boolean, text: string, start: number, end: number) => {
						if (isBlock && text.startsWith("*")) {
							this.comments.push({
								text: text,
								start: start,
								end: end,
								jsdoc: commentParser(`/*${text}*/`)[0]
							});
						}

					}
				});
			} catch (error) {
				console.error(error);
				this.fileContent = null;
			}
		}
	}

	private getUIDefine() {
		let UIDefine: UIDefine[] = [];

		if (this.fileContent) {
			const args = this.fileContent?.body[0]?.expression?.arguments;
			if (args && args.length === 2) {
				const UIDefinePaths: string[] = args[0].elements?.map((part: any) => part.value) || [];
				const UIDefineClassNames: string[] = args[1].params?.map((part: any) => part.name) || [];
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
				this.classBodyacornVariableName = part.name;
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
		if (this.acornClassBody?.properties) {
			this.acornClassBody.properties.forEach((property: any) => {
				if (property.value.type === "FunctionExpression" || property.value.type === "ArrowFunctionExpression") {
					const functionParts = property.value.body?.body || [];
					functionParts.forEach((node: any) => {
						if (this.isAssignmentStatementForThisVariable(node)) {
							this.fields.push({
								name: node.expression.left.property.name,
								type: node.expression.left.property.name.jsType,
								description: node.expression.left.property.name.jsType || ""
							});

							// this.acornMethodsAndFields.push({
							// 	key: node.expression.left.property,
							// 	value: node.expression.right
							// });
						}
					});
				}
			});

			this.acornClassBody.properties.forEach((property: any) => {
				if (property.value.type === "FunctionExpression" || property.value.type === "ArrowFunctionExpression") {
					const method: CustomClassUIMethod = {
						name: property.key.name,
						params: this.generateParamTextForMethod(property.value.params),
						returnType: property.returnType || property.value.async ? "Promise" : "void",
						position: property.start,
						description: ""
					};
					this.generateDescriptionForMethod(method);
					this.methods.push(method);
				} else if (property.value.type === "Identifier" || property.value.type === "Literal") {
					this.fields.push({
						name: property.key.name,
						type: property.jsType,
						description: property.jsType || ""
					});
					this.acornMethodsAndFields.push(property);
				} else if (property.value.type === "ObjectExpression") {
					this.fields.push({
						name: property.key.name,
						type: "__map__",
						description: "map",
						customData: this.generateCustomDataForObject(property.value)
					});
					this.acornMethodsAndFields.push(property);
				}
			});

			this.fillStaticMethodsAndFields();

			//remove duplicates
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

	private generateParamTextForMethod(acornParams: any[]) {
		const params: string[] = acornParams.map((param: any) => {
			if (param.type === "Identifier") {
				return param.name || "Unknown";
			} else if (param.type === "AssignmentPattern") {
				return param.left?.name || "Unknown";
			} else {
				return "Unknown";
			}
		});

		return params;
	}

	private generateCustomDataForObject(node: any, looseObject: LooseObject = {}) {
		node.properties.forEach((property: any) => {
			looseObject[property.key.name] = {};
			if (property.value.type === "ObjectExpression") {
				this.generateCustomDataForObject(property.value, looseObject[property.key.name]);
			}
		});

		return looseObject;
	}

	private fillStaticMethodsAndFields() {
		const UIDefineBody = this.fileContent?.body[0]?.expression?.arguments[1]?.body?.body;

		if (UIDefineBody && this.classBodyacornVariableName) {
			const thisClassVariableAssignments: any[] = UIDefineBody.filter((node: any) => {
				return 	node.type === "ExpressionStatement" &&
						(
							node.expression?.left?.object?.name === this.classBodyacornVariableName ||
							node.expression?.left?.object?.object?.name === this.classBodyacornVariableName
						);
			});

			thisClassVariableAssignments.forEach(node => {
				const assignmentBody = node.expression.right;
				const isMethod = assignmentBody.type === "ArrowFunctionExpression" || assignmentBody.type === "FunctionExpression";
				const isField = !isMethod;

				const name = node.expression.left.property.name;
				if (isMethod) {
					const method: CustomClassUIMethod = {
						name: name,
						params: assignmentBody.params.map((param: any) => param.name),
						returnType: assignmentBody.returnType || assignmentBody.async ? "Promise" : "void",
						position: assignmentBody.start,
						description: ""
					};
					this.generateDescriptionForMethod(method);
					this.methods.push(method);
				} else if (isField) {
					this.fields.push({
						name: name,
						type: assignmentBody.jsType,
						description: assignmentBody.jsType || ""
					});
				}
			});
		}
	}

	public generateDescriptionForMethod(method: UIMethod) {
		const description = `(${method.params.map(param => param).join(", ")}) : ${(method.returnType ? method.returnType : "void")}`;
		method.description = description;
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
		const map: LooseObject = {
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
		this.properties?.forEach(property => {
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
		if (this.acornClassBody?.properties) {
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
