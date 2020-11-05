import * as vscode from "vscode";
import { UIClassFactory, FieldsAndMethods } from "./UI5Parser/UIClass/UIClassFactory";
import { FileReader } from "../Util/FileReader";
import { UIField, UIMethod } from "./UI5Parser/UIClass/AbstractUIClass";
import { CustomClassUIField, CustomUIClass } from "./UI5Parser/UIClass/CustomUIClass";

export class SyntaxAnalyzer {

	static getFieldsAndMethodsOfTheCurrentVariable() {
		let fieldsAndMethods: FieldsAndMethods | undefined;
		const UIClassName = this.getClassNameOfTheVariable();
		if (UIClassName) {
			const classNameParts = UIClassName.split("__map__");

			if (classNameParts.length === 1) {
				fieldsAndMethods = UIClassFactory.getFieldsAndMethodsForClass(classNameParts[0]);
			} else {
				const className = classNameParts.shift();
				if (className) {
					const mapFields = classNameParts;
					const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
					const currentFieldName = mapFields.shift();
					const field = UIClass.fields.find(field => field.name === currentFieldName);
					if (field) {
						fieldsAndMethods = this.getFieldsAndMethodsForMap(field, mapFields);
						fieldsAndMethods.className = className;
					}
				}
			}

			const ignoreAccessLevelModifiers = vscode.workspace.getConfiguration("ui5.plugin").get("ignoreAccessLevelModifiers");
			if (!ignoreAccessLevelModifiers) {
				const sCurrentDocumentClassName = this.getClassNameOfTheCurrentDocument();
				if (sCurrentDocumentClassName !== UIClassName) {
					if (fieldsAndMethods?.fields) {
						fieldsAndMethods.fields = fieldsAndMethods.fields.filter(field => field.visibility === "public");
					}
					if (fieldsAndMethods?.methods) {
						fieldsAndMethods.methods = fieldsAndMethods.methods.filter(method => method.visibility === "public");
					}
				}
			}

		}

		return fieldsAndMethods;
	}

	private static getFieldsAndMethodsForMap(field: CustomClassUIField, mapFields: string[]) {
		const fieldsAndMethods: FieldsAndMethods = {
			className: "",
			fields: this.getUIFieldsForMap(field.customData, mapFields),
			methods: []
		};

		return fieldsAndMethods;
	}

	private static getUIFieldsForMap(customData: any, mapFields: string[], fields: UIField[] = []) {
		const fieldName = mapFields.shift();
		if (fieldName) {
			customData = customData[fieldName];
		}

		if (mapFields.length === 0) {
			const newFields: UIField[] = Object.keys(customData).map(key => {
				return {
					name: key,
					description: "",
					type: undefined,
					visibility: "public"
				};
			});
			newFields.forEach(newField => {
				fields.push(newField);
			});
		} else {
			this.getUIFieldsForMap(customData, mapFields, fields);
		}

		return fields;
	}

	public static getClassNameOfTheVariable(setNewContentForClass: boolean = true) {
		let UIClassName;
		this.declarationStack = [];
		const currentClassName = this.getClassNameOfTheCurrentDocument();

		const activeTextEditor = vscode.window.activeTextEditor;
		if (currentClassName && activeTextEditor) {
			if (setNewContentForClass) {
				this.setNewContentForCurrentUIClass();
			}

			const position = activeTextEditor.document.offsetAt(activeTextEditor.selection.start);

			UIClassName = this.acornGetClassName(currentClassName, position);
		}

		return UIClassName;
	}

	public static acornGetClassName(className: string, position: number) {
		let classNameOfTheCurrentVariable;
		const stack = this.getStackOfNodesForPosition(className, position);
		if (stack.length > 0) {
			classNameOfTheCurrentVariable = this.findClassNameForStack(stack, className);
		}

		return classNameOfTheCurrentVariable;
	}

	public static getStackOfNodesForPosition(className: string, position: number, checkForLastPosition: boolean = false) {
		const stack: any[] = [];
		const UIClass = UIClassFactory.getUIClass(className);

		if (UIClass instanceof CustomUIClass) {
			const methodNode = UIClass.acornMethodsAndFields.find((node: any) => {
				return node.start < position && node.end >= position;
			})?.value;

			if (methodNode) {
				const methodBody = methodNode.body?.body;
				const nodeWithCurrentPosition = methodBody && this.findAcornNode(methodBody, position);

				if (nodeWithCurrentPosition) {
					this.generateStackOfNodes(nodeWithCurrentPosition, position, stack, checkForLastPosition);
				}
			}
		}

		return stack;
	}

	private static generateStackOfNodes(node: any, position: number, stack: any[], checkForLastPosition: boolean = false) {
		const nodeTypesToUnshift = ["CallExpression", "MemberExpression", "VariableDeclaration", "ThisExpression", "NewExpression", "Identifier"];
		const positionIsCorrect = node.end < position || (checkForLastPosition && node.end === position);
		if (node && positionIsCorrect && nodeTypesToUnshift.indexOf(node.type) > -1 && node.property?.name !== "✖" && node.property?.name !== "prototype") {
			stack.unshift(node);
		}

		const innerNode: any = this.findInnerNode(node, position);

		if (innerNode) {
			this.generateStackOfNodes(innerNode, position, stack, checkForLastPosition);
		}
	}

	private static findInnerNode(node: any, position: number) {
		let innerNode: any;
		if (node.type === "VariableDeclaration") {
			const declaration = this.findAcornNode(node.declarations, position - 1);
			if (declaration) {
				innerNode = declaration.init;
			}

		} else if (node.type === "TryStatement") {
			innerNode = this.findAcornNode(node.block.body, position);
			if (!innerNode && node.handler) {
				innerNode = this.findAcornNode(node.handler?.body?.body, position);
			}
			if (!innerNode && node.finalizer) {
				innerNode = this.findAcornNode(node.finalizer?.body, position);
			}
		} else if (node.type === "CallExpression") {
			innerNode = this.findAcornNode(node.arguments, position);
			if (!innerNode) {
				innerNode = node.callee;
			}
		} else if (node.type === "MemberExpression") {
			innerNode = this.findAcornNode([node.object], position) || this.findAcornNode([node.property], position) || node.object;
			// innerNode = node.object;
		} else if (node.type === "BlockStatement") {
			innerNode = this.findAcornNode(node.body, position);
		} else if (node.type === "ThrowStatement") {
			innerNode = node.argument;
		} else if (node.type === "AwaitExpression") {
			innerNode = node.argument;
		} else if (node.type === "ExpressionStatement") {
			innerNode = node.expression;
		} else if (node.type === "ThisExpression") {
			// innerNode = node.object;
		} else if (node.type === "ArrayExpression") {
			innerNode = this.findAcornNode(node.elements, position);
		} else if (node.type === "ReturnStatement") {
			innerNode = node.argument;
		} else if (node.type === "IfStatement") {
			innerNode = this.getIfStatementPart(node, position);
		} else if (node.type === "SwitchStatement") {
			innerNode = this.getSwitchStatementPart(node, position);
		} else if (node.type === "AssignmentExpression") {
			innerNode = node.right;
		} else if (node.type === "BinaryExpression") {
			innerNode = this.findAcornNode([node.right], position);
			if (!innerNode) {
				innerNode = this.findAcornNode([node.left], position);
			}
		} else if (node.type === "NewExpression") {
			if (node.callee.end > position) {
				innerNode = node.callee;
			} else {
				innerNode = this.findAcornNode(node.arguments, position);
			}
		} else if (node.type === "ObjectExpression") {
			innerNode = this.findAcornNode(node.properties, position)?.value;
		} else if (node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") {
			if (node.body) {
				innerNode = this.findAcornNode([node.body], position);
			}
			if (!innerNode) {
				innerNode = this.findAcornNode(node.params, position);
			}
		} else if (
			node.type === "WhileStatement" ||
			node.type === "DoWhileStatement" ||
			node.type === "ForStatement" ||
			node.type === "ForInStatement"
		) {
			innerNode = this.findAcornNode([node.body], position) || this.findAcornNode([node.test], position);
		}

		return innerNode;
	}
	private static getSwitchStatementPart(node: any, position: number) {
		let correctPart: any;

		const correctSwitchStatementPart = this.findAcornNode(node.cases, position);
		if (correctSwitchStatementPart) {
			correctPart = this.findAcornNode(correctSwitchStatementPart.consequent, position);
		}

		return correctPart;
	}

	private static getIfStatementPart(node: any, position: number) {
		let correctPart: any;

		if (node.test?.start < position && node.test?.end >= position) {
			correctPart = node.test;
		} if (node.consequent?.start < position && node.consequent?.end >= position) {
			correctPart = this.findAcornNode(node.consequent.body, position);
		} else if (node.alternate) {
			correctPart = this.getIfStatementPart(node.alternate, position);
		} else if (node.start < position && node.end >= position && node.type === "BlockStatement") {
			correctPart = this.findAcornNode(node.body, position);
		}

		return correctPart;
	}

	public static findClassNameForStack(stack: any[], currentClassName: string) {
		let className: string = "";

		if (stack.length === 0 || !currentClassName) {
			return "";
		}

		const isGetViewException = this.checkForGetViewByIdException(stack);

		//this.getView().byId("") exception
		if (isGetViewException) {
			currentClassName = this.getClassNameFromViewById(stack, currentClassName);
			if (stack.length > 0) {
				className = this.findClassNameForStack(stack, currentClassName);
			} else {
				className = currentClassName;
			}
		} else {
		//the rest of the cases
			const currentNode = stack.shift();
			if (currentNode.type === "ThisExpression") {
				if (stack.length > 0) {
					className = this.findClassNameForStack(stack, currentClassName);
				} else {
					className = currentClassName;
				}

			} else if (currentNode.type === "MemberExpression") {
				const memberName = currentNode.property.name;
				const isMethod = stack[0]?.type === "CallExpression";

				if (isMethod) {
					stack.shift();
					const method = this.findMethodHierarchically(currentClassName, memberName);
					if (method) {
						if (!method.returnType || method.returnType === "void") {
							this.findMethodReturnType(method, currentClassName);
						}
						className = method.returnType;
					} else {
						stack = [];
					}
				} else {
					const field = this.findFieldHierarchically(currentClassName, memberName);
					if (field) {
						if (!field.type) {
							this.findFieldType(field, currentClassName);
							className = field.type || "";
						} else if (field.type === "__map__") {
							className = `${currentClassName}__map__${memberName}`;
							className = this.generateClassNameFromStack(stack, className);
							stack = [];
						} else {
							className = field.type;
						}
					} else {
						stack = [];
					}
				}
			} else if (currentNode.type === "Identifier") {
				if (currentNode.name === "sap") {
					className = this.generateSAPStandardClassNameFromStack(stack);
				} else {
					const UIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);

					const variableDeclaration = this.getAcornVariableDeclarationFromUIClass(currentClassName, currentNode.name, currentNode.end);

					if (variableDeclaration) {
						const neededDeclaration = variableDeclaration.declarations.find((declaration: any) => declaration.id.name === currentNode.name);
						className = this.getClassNameFromAcornVariableDeclaration(neededDeclaration, UIClass);
					} else {
						className = this.getClassNameFromUIDefineDotNotation(currentNode.name, UIClass);

						if (!className) {
							className = this.getClassNameFromMethodParams(currentNode, UIClass);

							if (!className && currentNode.name === UIClass.classBodyAcornVariableName) {
								className = UIClass.className;
							}
						}
					}
				}

			} else if (currentNode.type === "NewExpression") {
				const UIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);
				if (currentNode.callee?.type === "Identifier") {
					className = this.getClassNameFromUIDefineDotNotation(currentNode.callee?.name, UIClass);
				} else if (currentNode.callee?.type === "MemberExpression") {
					const newStack = this.expandAllContent(currentNode).reverse();
					newStack.pop(); //removes NewExpression
					className = this.findClassNameForStack(newStack, currentClassName);
				}

			}
		}
		if (className && stack.length > 0) {
			className = this.findClassNameForStack(stack, className);
		}

		return className;
	}

	private static generateClassNameFromStack(stack: any[], className: string) {
		const nextProperty = stack.shift();
		if (nextProperty && nextProperty.type === "MemberExpression") {
			className += `__map__${nextProperty.property.name}`;
		}

		if (stack.length > 0) {
			className = this.generateClassNameFromStack(stack, className);
		}

		return className;
	}

	private static generateSAPStandardClassNameFromStack(stack: any[]) {
		const classNameParts: string[] = [];
		let usedNodeCount = 0;

		let node = stack[usedNodeCount];

		while (node && node.type === "MemberExpression") {
			if (node.object.type === "Identifier") {
				classNameParts.push(node.object.name);
			}
			classNameParts.push(node.property.name);

			usedNodeCount++;
			node = stack[usedNodeCount];
		}

		if (stack[usedNodeCount]?.type === "CallExpression") {
			//this means that last MemberExpression was related to the method name, not to the class name
			classNameParts.pop();
			usedNodeCount--;
		}

		stack.splice(0, usedNodeCount);

		return classNameParts.join(".");
	}

	private static checkForGetViewByIdException(stack: any[]) {
		let isGetViewByIdException = true;
		if (stack.length >= 4) {
			const [firstPart, secondPart, thirdPart, fourthPart] = stack;
			isGetViewByIdException = isGetViewByIdException && firstPart.type === "MemberExpression";
			isGetViewByIdException = isGetViewByIdException && secondPart.type === "CallExpression";
			isGetViewByIdException = isGetViewByIdException && thirdPart.type === "MemberExpression";
			isGetViewByIdException = isGetViewByIdException && fourthPart.type === "CallExpression";

			isGetViewByIdException = isGetViewByIdException && firstPart.property?.name === "getView";
			isGetViewByIdException = isGetViewByIdException && thirdPart.property?.name === "byId";
		} else {
			isGetViewByIdException = false;
		}

		return isGetViewByIdException;
	}

	private static getClassNameFromViewById(stack: any[], currentClassName: string) {
		let className = "";

		const callExpression = stack[3];
		stack.splice(0, 4);
		const controlId = callExpression.arguments[0]?.value;
		if (controlId) {
			className = FileReader.getClassNameFromView(currentClassName, controlId) || "";
		}

		return className;
	}

	public static findMethodReturnType(method: UIMethod, className: string, includeParentMethods: boolean = true) {
		const UIClass = UIClassFactory.getUIClass(className);
		if (method.returnType === "void") {

			const innerMethod = UIClass.methods.find(innermethod => method.name === innermethod.name);
			if (innerMethod && innerMethod.returnType !== "void") {
				method.returnType = innerMethod.returnType;
			} else if (UIClass instanceof CustomUIClass) {
				const methodNode = UIClass.acornMethodsAndFields?.find((property: any) => property.key.name === method.name);
				if (methodNode) {
					const methodBody = methodNode?.value?.body?.body;
					const returnStatement = methodBody?.find((bodyPart: any) => bodyPart.type === "ReturnStatement");

					if (returnStatement) {
						method.returnType = this.getClassNameFromAcornDeclaration(returnStatement.argument, UIClass) || "void";
						//this.acornGetClassName(className, returnStatement.argument.end + 1) || "void";
					}
				}
			}

			if (includeParentMethods && (!method.returnType || method.returnType === "void") && UIClass.parentClassNameDotNotation) {
				this.findMethodReturnType(method, UIClass.parentClassNameDotNotation);
			}
		}
		if (UIClass instanceof CustomUIClass) {
			UIClass.generateDescriptionForMethod(method);
		}
	}

	public static findFieldType(field: UIField, className: string, includeParentMethods: boolean = true) {
		const UIClass = UIClassFactory.getUIClass(className);

		const innerField = UIClass.fields.find(innerfield => innerfield.name === field.name);
		if (innerField && innerField.type) {
			field.type = innerField.type;
		} else if (UIClass instanceof CustomUIClass) {
			UIClass.acornMethodsAndFields.find((property: any) => {
				let typeFound = false;
				if (property.value.type === "FunctionExpression" || property.value.type === "ArrowFunctionExpression") {
					const assignmentEpxressions = SyntaxAnalyzer.expandAllContent(property.value.body).filter((node:any) => node.type === "AssignmentExpression");
					assignmentEpxressions.forEach((node: any) => {
						if (UIClass.isAssignmentStatementForThisVariable(node) && node?.left?.property?.name === field.name) {
							field.type = this.getClassNameFromAcornDeclaration(node.right, UIClass);
						}
					});
				} else if (property.value.type === "Identifier" && property.key.name === field.name) {
					field.type = this.getClassNameFromUIDefineDotNotation(property.value.name, UIClass);
				}
				if (field.type) {
					typeFound = true;
				}

				return typeFound;
			});
		}

		if (includeParentMethods && !field.type && UIClass.parentClassNameDotNotation) {
			this.findFieldType(field, UIClass.parentClassNameDotNotation);
		}
	}

	private static getAcornVariableDeclarationFromUIClass(className: string, variableName: string, position: number) {
		let variableDeclaration: any;
		const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);

		const functionExpression = UIClass.acornMethodsAndFields?.find((method: any) => method.start < position && method.end >= position);
		const functionParts = functionExpression?.value?.body?.body;

		if (functionParts) {
			const variableDeclarations = this.findAllDeclarations(functionParts);
			variableDeclaration = variableDeclarations.find(declaration => {
				return declaration.declarations.find((declaration: any) => declaration.id.name === variableName);
			});
		}

		return variableDeclaration;
	}

	private static findAllDeclarations(nodes: any[]) {
		let declarations: any[] = [];
		nodes.forEach((node: any) => {
			const content = this.expandAllContent(node);
			declarations = declarations.concat(content.filter((node: any) => node.type === "VariableDeclaration"));
		});

		return declarations;
	}

	public static expandAllContent(node: any, content: any[] = []) {
		//TODO: find out recursion reason, OrderItemGroupCRUDBehavior
		if (content.indexOf(node) === -1) {
			content.push(node);
			let innerNodes: any[] = [];

			if (node.type === "VariableDeclaration") {
				innerNodes = node.declarations.map((declaration: any) => declaration.init);
			} else if (node.type === "CallExpression") {
				innerNodes = node.arguments;
				if (node.callee) {
					innerNodes.push(node.callee);
				}
			} else if (node.type === "MemberExpression") {
				innerNodes.push(node.object);
			} else if (node.type === "ExpressionStatement") {
				innerNodes.push(node.expression);
			} else if (node.type === "ThisExpression") {
				//
			} else if (node.type === "AwaitExpression") {
				innerNodes.push(node.argument);
			} else if (node.type === "ArrayExpression") {
				innerNodes = node.elements;
			} else if (node.type === "TryStatement") {
				innerNodes = node.block.body;
				if (node.handler?.body?.body) {
					innerNodes = innerNodes.concat(node.handler.body.body);
				}
				if (node.finalizer?.body) {
					innerNodes = innerNodes.concat(node.finalizer.body.body);
				}
			} else if (node.type === "BlockStatement") {
				innerNodes = node.body;
			} else if (node.type === "ReturnStatement") {
				innerNodes.push(node.argument);
			} else if (node.type === "IfStatement") {
				if (node.consequent) {
					innerNodes = innerNodes.concat(node.consequent.body);
				} else if (node.alternate) {
					innerNodes.push(node.alternate);
				} else if (node.body) {
					innerNodes = innerNodes.concat(node.body);
				}
			} else if (node.type === "SwitchStatement") {
				innerNodes = node.cases.map((body: any) => body.consequent);
			} else if (node.type === "AssignmentExpression") {
				innerNodes.push(node.right);
			} else if (node.type === "NewExpression") {
				if (node.callee) {
					innerNodes.push(node.callee);
				}
				innerNodes = innerNodes.concat(node.arguments);
			} else if (node.type === "ObjectExpression") {
				innerNodes = node.properties.map((declaration: any) => declaration.value);
			} else if (node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") {
				innerNodes = [node.body].concat(node.params);
			} else if (
				node.type === "WhileStatement" ||
				node.type === "DoWhileStatement" ||
				node.type === "ForStatement" ||
				node.type === "ForInStatement"
			) {
				innerNodes.push(node.body);
			}

			innerNodes.forEach((node: any) => {
				if (node) {
					this.expandAllContent(node, content);
				}
			});
		}

		return content;
	}

	private static getClassNameFromAcornVariableDeclaration(declaration: any, UIClass: CustomUIClass) {
		return this.getClassNameFromAcornDeclaration(declaration.init, UIClass);
	}

	private static declarationStack: any[] = [];

	private static getClassNameFromAcornDeclaration(declaration: any, UIClass: CustomUIClass) {
		let className = "";
		if (this.declarationStack.indexOf(declaration) > -1) {
			this.declarationStack = [];
		}  else {
			this.declarationStack.push(declaration);
			if (declaration?.type === "NewExpression") {
				className = this.getClassNameFromUIDefineDotNotation(declaration.callee?.name, UIClass);
			} else if (declaration?.type === "CallExpression" || declaration?.type === "MemberExpression" || declaration?.type === "Identifier") {
				className = this.acornGetClassName(UIClass.className, declaration.end + 1) || "";
			} else if (declaration?.type === "ArrayExpression") {
				className = "array";
			} else if (declaration?.type === "ObjectExpression") {
				className = "map";
			} else if (declaration?.type === "Literal") {
				className = typeof declaration.value;
			}
		}

		return className;
	}

	private static getClassNameFromUIDefineDotNotation(UIDefineClassName: string, UIClass: CustomUIClass) {
		let className = "";
		if (UIDefineClassName) {
			const UIDefine = UIClass.UIDefine.find(UIDefine => UIDefine.className === UIDefineClassName);
			if (UIDefine) {
				className = UIDefine.classNameDotNotation;
			}
		}
		if (UIDefineClassName === "Promise") {
			className = "Promise";
		}

		return className;
	}

	private static getClassNameFromMethodParams(node: any, UIClass: CustomUIClass) {
		let className = "";

		const methodNode = this.findAcornNode(UIClass.acornMethodsAndFields, node.end - 1);
		if (methodNode) {
			const params = methodNode.value?.params;
			if (params) {
				const param = params.find((param: any) => param.name === node.name);
				if (param) {
					className = param.jsType;
				}
			}
		}

		return className;
	}

	public static findMethodHierarchically(className: string, methodName: string) : UIMethod | undefined {
		let method: UIMethod | undefined;
		const UIClass = UIClassFactory.getUIClass(className);

		method = UIClass.methods.find(method => method.name === methodName);
		if (!method && UIClass.parentClassNameDotNotation) {
			method = this.findMethodHierarchically(UIClass.parentClassNameDotNotation, methodName);
		}

		return method;
	}

	public static findFieldHierarchically(className: string, fieldName: string) : UIField | undefined {
		let field: UIField | undefined;
		const UIClass = UIClassFactory.getUIClass(className);

		field = UIClass.fields?.find(field => field.name === fieldName);
		if (!field && UIClass.parentClassNameDotNotation) {
			field = this.findFieldHierarchically(UIClass.parentClassNameDotNotation, fieldName);
		}

		return field;
	}

	public static findAcornNode(nodes: any[] = [], position: number) {
		return nodes.find((node: any) => node.start < position && node.end >= position);
	}

	public static setNewContentForCurrentUIClass() {
		const documentText = vscode.window.activeTextEditor?.document.getText();
		const currentClassName = this.getClassNameOfTheCurrentDocument();

		if (currentClassName && documentText) {
			UIClassFactory.setNewCodeForClass(currentClassName, documentText);
			this.declarationStack = [];
		} else {
			debugger;
		}
	}

	/* =========================================================== */
	/* begin: variable methods                                     */
	/* =========================================================== */

	static getUICompletionItemsWithUniqueViewIds() {
		let completionItems: UICompletionItem[] = [];

		const currentClass = this.getClassNameOfTheCurrentDocument();
		if (currentClass) {
			const viewText = FileReader.getViewText(currentClass);
			if (viewText) {
				const IdsResult = viewText.match(/(?<=\sid=").*?(?="\s)/g);
				if (IdsResult) {
					completionItems = IdsResult.map(Id => {
						const uniqueViewId: UICompletionItem = {
							name: Id,
							type: vscode.CompletionItemKind.Keyword,
							description: Id,
							visibility: "public",
							parameters: [],
							returnValue: "void"
						};

						return uniqueViewId;
					});
				}
			}
		}

		return completionItems;
	}

	public static getClassNameOfTheCurrentDocument(documentText?: string) {
		let returnClassName;
		if (!documentText && vscode.window.activeTextEditor) {
			documentText = vscode.window.activeTextEditor.document.getText();
		}
		if (documentText) {
			const rCurrentClass = /(?<=.*\..*?(extend|declareStaticClass)\(\").*?(?=\")/;
			const rCurrentClassResults = rCurrentClass.exec(documentText);
			if (rCurrentClassResults) {
				returnClassName = rCurrentClassResults[0];
			} else {
				const classPath = vscode.window.activeTextEditor?.document.uri.fsPath;
				if (classPath) {
					returnClassName = FileReader.getClassNameFromPath(classPath);
				}
			}
		}

		return returnClassName;
	}
	/* =========================================================== */
	/* end: Find Methods from class name                           */
	/* =========================================================== */
}
export interface UICompletionItem {
	name: string;
	description: string;
	type: vscode.CompletionItemKind;
	visibility: string;
	parameters: any[];
	returnValue: string;
}