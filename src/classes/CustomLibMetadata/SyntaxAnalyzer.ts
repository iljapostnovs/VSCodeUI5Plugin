import * as vscode from "vscode";
import { UIClassFactory, FieldsAndMethods } from "./UI5Parser/UIClass/UIClassFactory";
import { FileReader } from "../Util/FileReader";
import { UIClassDefinitionFinder } from "./UI5Parser/UIClass/UIClassDefinitionFinder";
import { AbstractUIClass, UIField, UIMethod } from "./UI5Parser/UIClass/AbstractUIClass";
import { CustomUIClass } from "./UI5Parser/UIClass/CustomUIClass";
import { assert } from "console";

export class SyntaxAnalyzer {

	static getFieldsAndMethodsOfTheCurrentVariable(variable?: string) {
		let fieldsAndMethods: FieldsAndMethods | undefined;

		const UIClassName = this.getClassNameOfTheVariable();
		if (UIClassName) {
			fieldsAndMethods = this.getFieldsAndMethodsFor("this", UIClassName);
		}

		return fieldsAndMethods;
	}

	static getClassNameOfTheVariable(variable?: string, setNewContentForClass: boolean = true) {
		let UIClassName;
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

	public static getStackOfNodesForPosition(className: string, position: number) {
		const stack: any[] = [];
		const UIClass = UIClassFactory.getUIClass(className);

		if (UIClass instanceof CustomUIClass) {
			const methodNode = UIClass.acornClassBody?.properties.find((node: any) => {
				return node.start < position && node.end >= position;
			})?.value;

			if (methodNode) {
				const methodBody = methodNode.body.body;
				const nodeWithCurrentPosition = this.findAcornNode(methodBody, position);

				if (nodeWithCurrentPosition) {
					this.generateStackOfNodes(nodeWithCurrentPosition, position, stack);
				}
			}
		}

		return stack;
	}

	private static generateStackOfNodes(node: any, position: number, stack: any[]) {
		const nodeTypesToUnshift = ["CallExpression", "MemberExpression", "VariableDeclaration", "ThisExpression", "NewExpression", "Identifier"];
		let innerNode: any;
		if (node && node.end <= position && nodeTypesToUnshift.indexOf(node.type) > -1) {
			stack.unshift(node);
		}

		if (node.type === "VariableDeclaration") {
			const declaration = this.findAcornNode(node.declarations, position - 1);
			if (declaration) {
				innerNode = declaration.init;
			}

		} else if (node.type === "CallExpression") {
			innerNode = node.callee;
		} else if (node.type === "MemberExpression") {
			innerNode = node.object;
		} else if (node.type === "ExpressionStatement") {
			innerNode = node.expression;
		} else if (node.type === "ThisExpression") {
			// innerNode = node.object;
		} else if (node.type === "ReturnStatement") {
			innerNode = node.argument;
		} else if (node.type === "IfStatement") {
			innerNode = this.getIfStatementPart(node, position);
		} else if (node.type === "SwitchStatement") {
			innerNode = this.getSwitchStatementPart(node, position);
		} else if (
			node.type === "WhileStatement" ||
			node.type === "DoWhileStatement" ||
			node.type === "ForStatement"
		) {
			innerNode = this.findAcornNode(node.body.body, position);
		}


		if (innerNode) {
			innerNode = this.generateStackOfNodes(innerNode, position, stack);
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

		if (node.consequent?.start < position && node.consequent?.end > position) {
			correctPart = this.findAcornNode(node.consequent.body, position);
		} else if (node.alternate) {
			correctPart = this.getIfStatementPart(node.alternate, position);
		} else if (node.start < position && node.end > position && node.type === "BlockStatement") {
			correctPart = this.findAcornNode(node.body, position);
		}

		return correctPart;
	}

	public static findClassNameForStack(stack: any[], currentClassName: string) {
		let className: string = "";

		if (stack.length === 0) {
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
						}
						className = field.type || "";
					} else {
						stack = [];
					}
				}

				if (stack.length > 0) {
					className = this.findClassNameForStack(stack, className);
				}
			} else if (currentNode.type === "Identifier") {
				const UIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);

				const variableDeclaration = this.getAcornVariableDeclarationFromUIClass(currentClassName, currentNode.name, currentNode.end);

				if (variableDeclaration) {
					const neededDeclaration = variableDeclaration.declarations.find((declaration: any) => declaration.id.name === currentNode.name);
					className = this.getClassNameFromAcornVariableDeclaration(neededDeclaration, UIClass);
				} else {
					className = this.getClassNameFromUIDefineDotNotation(currentNode.name, UIClass);

					if (!className) {
						className = this.getClassNameFromMethodParams(currentNode, UIClass);
					}
				}

			} else if (currentNode.type === "NewExpression") {
				const UIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);
				className = this.getClassNameFromUIDefineDotNotation(currentNode.callee?.name, UIClass);

			}/* else {
				className = currentClassName;
			}*/
		}

		return className;
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

	private static findMethodReturnType(method: UIMethod, className: string) {
		assert(!method.returnType || method.returnType === "void");

		const UIClass = UIClassFactory.getUIClass(className);

		if (UIClass instanceof CustomUIClass) {
			const methodNode = UIClass.acornClassBody?.properties.find((property: any) => property.key.name === method.name);
			if (methodNode) {
				const methodBody = methodNode.value.body.body;
				const returnStatement = methodBody.find((bodyPart: any) => bodyPart.type === "ReturnStatement");

				method.returnType = this.acornGetClassName(className, returnStatement.argument.end + 1) || "void";
			}
		}

		if ((!method.returnType || method.returnType === "void") && UIClass.parentClassNameDotNotation) {
			this.findMethodReturnType(method, UIClass.parentClassNameDotNotation);
		}
	}

	private static findFieldType(field: UIField, className: string) {
		assert(!field.type);
		const UIClass = UIClassFactory.getUIClass(className);

		if (UIClass instanceof CustomUIClass) {
			UIClass.acornClassBody?.properties.forEach((property: any) => {
				if (property.value.type === "FunctionExpression") {
					const functionParts = property.value.body.body;
					functionParts.forEach((node: any) => {
						if (UIClass.isAssignmentStatementForThisVariable(node) && node.expression?.left?.property?.name === field.name) {
							field.type = this.getClassNameOfTheDeclaration(node.expression.right, UIClass);
						}
					});
				} else if (property.value.type === "Identifier" && property.key.name === field.name) {
					field.type = this.getClassNameFromUIDefineDotNotation(property.value.name, UIClass);
				}
			});
		}

		if (!field.type && UIClass.parentClassNameDotNotation) {
			this.findFieldType(field, UIClass.parentClassNameDotNotation);
		}
	}

	private static getAcornVariableDeclarationFromUIClass(className: string, variableName: string, position: number) {
		const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);

		const functionExpressions = UIClass.acornClassBody?.properties.filter((property: any) => property.value.type === "FunctionExpression");
		const functionExpression = functionExpressions.find((expression: any) => expression.start < position && expression.end >= position);
		const functionParts = functionExpression.value.body.body;
		const variableDeclaration = functionParts.find((node: any) => {
			let declarationFound = false;
			if (node.type === "VariableDeclaration") {
				declarationFound = !!node.declarations.find((declaration: any) => declaration.id.name === variableName);
			}

			return declarationFound;
		});

		return variableDeclaration;
	}

	private static getClassNameFromAcornVariableDeclaration(declaration: any, UIClass: CustomUIClass) {
		return this.getClassNameOfTheDeclaration(declaration.init, UIClass);
	}

	private static getClassNameOfTheDeclaration(node: any, UIClass: CustomUIClass) {
		let className = "";
		if (node.type === "NewExpression") {
			className = this.getClassNameFromUIDefineDotNotation(node.callee?.name, UIClass);
		} else if (node.type === "CallExpression" || node.type === "MemberExpression" || node.type === "Identifier") {
			className = this.acornGetClassName(UIClass.className, node.end + 1) || "";
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

		return className;
	}

	private static getClassNameFromMethodParams(node: any, UIClass: CustomUIClass) {
		let className = "";

		const methodNode = this.findAcornNode(UIClass.acornClassBody?.properties, node.end - 1);
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

		field = UIClass.fields.find(field => field.name === fieldName);
		if (!field && UIClass.parentClassNameDotNotation) {
			field = this.findFieldHierarchically(UIClass.parentClassNameDotNotation, fieldName);
		}

		return field;
	}

	private static findAcornNode(nodes: any[], position: number) {
		return nodes.find((node: any) => node.start < position && node.end >= position);
	}

	public static setNewContentForCurrentUIClass() {
		if (vscode.window.activeTextEditor) {
			let documentText = vscode.window.activeTextEditor.document.getText();
			const position = vscode.window.activeTextEditor.document.offsetAt(vscode.window.activeTextEditor.selection.start);

			const currentClassName = this.getClassNameOfTheCurrentDocument();
			if (currentClassName) {
				if (documentText[position - 1] === ".") {
					documentText = documentText.substring(0, position - 1) + ";" + documentText.substring(position, documentText.length);
				}
				UIClassFactory.setNewCodeForClass(currentClassName, documentText);
			} else {
				debugger;
			}
		}
	}

	private static getFieldsAndMethodsFor(variable: string, className: string, position: number = 0) {
		let fieldsAndMethods;
		if (vscode.window.activeTextEditor) {
			fieldsAndMethods = UIClassFactory.getFieldsAndMethodsForVariable(variable, className, position);
		}
		return fieldsAndMethods;
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