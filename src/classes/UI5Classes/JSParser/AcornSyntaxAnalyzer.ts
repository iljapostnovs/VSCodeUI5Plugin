import * as vscode from "vscode";
import { UIClassFactory, IFieldsAndMethods } from "../UIClassFactory";
import { FileReader, IXMLFile } from "../../utils/FileReader";
import { IUIField, IUIMethod } from "../UI5Parser/UIClass/AbstractUIClass";
import { ICustomClassUIMethod, CustomUIClass, ICustomClassUIField } from "../UI5Parser/UIClass/CustomUIClass";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "./strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { FieldPropertyMethodGetterStrategy } from "./strategies/abstraction/FieldPropertyMethodGetterStrategy";
import { InnerPropertiesStrategy } from "./strategies/InnerPropertiesStrategy";
import { XMLParser } from "../../utils/XMLParser";
import { SAPNodeDAO } from "../../librarydata/SAPNodeDAO";
import { ParentMethodStrategy } from "./strategies/ParentMethodStrategy";
export class AcornSyntaxAnalyzer {
	static getFieldsAndMethodsOfTheCurrentVariable(document: vscode.TextDocument, position: vscode.Position) {
		let fieldsAndMethods: IFieldsAndMethods | undefined;

		const aStrategies: FieldPropertyMethodGetterStrategy[] = [
			new FieldsAndMethodForPositionBeforeCurrentStrategy(),
			new InnerPropertiesStrategy(),
			new ParentMethodStrategy()
		];

		aStrategies.find(strategy => {
			fieldsAndMethods = strategy.getFieldsAndMethods(document, position);

			return !!fieldsAndMethods;
		});

		return fieldsAndMethods;
	}

	public static findInnerNode(node: any, position: number) {
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
			// innerNode = this.findAcornNode([node.object], position) || this.findAcornNode([node.property], position) || node.object;
			innerNode = node.object;
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
		} else if (node.type === "SpreadElement") {
			innerNode = node.argument;
		} else if (node.type === "IfStatement") {
			innerNode = this._getIfStatementPart(node, position);
		} else if (node.type === "SwitchStatement") {
			innerNode = this._getSwitchStatementPart(node, position);
		} else if (node.type === "AssignmentExpression") {
			innerNode = this.findAcornNode([node.right], position);
			if (!innerNode) {
				innerNode = this.findAcornNode([node.left], position);
			}
		} else if (node.type === "BinaryExpression") {
			innerNode = node.right && this.findAcornNode([node.right], position);
			if (!innerNode && node.left) {
				innerNode = this.findAcornNode([node.left], position);
			}
		} else if (node.type === "ConditionalExpression") {
			innerNode = this._getIfStatementPart(node, position);
		} else if (node.type === "LogicalExpression") {
			innerNode = node.right && this.findAcornNode([node.right], position);

			if (!innerNode) {
				innerNode = node.left && this.findAcornNode([node.left], position);
			}
		} else if (node.type === "NewExpression") {
			if (node.callee.end > position) {
				innerNode = node.callee;
			} else {
				innerNode = this.findAcornNode(node.arguments, position);
			}
		} else if (node.type === "ObjectExpression") {
			innerNode = this.findAcornNode(node.properties, position)?.value;
		} else if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") {
			if (node.body) {
				innerNode = this.findAcornNode([node.body], position);
			}
			if (!innerNode) {
				innerNode = this.findAcornNode(node.params, position);
			}
		} else if (node.type === "UnaryExpression") {
			if (node.argument) {
				innerNode = this.findAcornNode([node.argument], position);
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
	private static _getSwitchStatementPart(node: any, position: number) {
		let correctPart: any;

		const correctSwitchStatementPart = this.findAcornNode(node.cases, position);
		if (correctSwitchStatementPart) {
			correctPart = this.findAcornNode(correctSwitchStatementPart.consequent, position);
		}

		return correctPart;
	}

	private static _getIfStatementPart(node: any, position: number) {
		let correctPart: any;

		if (node.test?.start < position && node.test?.end >= position) {
			correctPart = node.test;
		} else if (node.consequent?.start < position && node.consequent?.end >= position) {
			correctPart = this.findAcornNode(node.consequent.body || [node.consequent], position);
		} else if (node.alternate) {
			correctPart = this._getIfStatementPart(node.alternate, position);
		} else if (node.start < position && node.end >= position && node.type === "BlockStatement") {
			correctPart = this.findAcornNode(node.body, position);
		} else if (node.start < position && node.end >= position && node.type !== "IfStatement") {
			correctPart = node;
		}

		return correctPart;
	}

	public static findClassNameForStack(stack: any[], currentClassName: string, primaryClassName: string = currentClassName, clearStack = false) {
		let className = "";
		let stackWasModified = false;

		if (clearStack) {
			this.declarationStack = [];
		}
		if (stack.length === 0 || !currentClassName) {
			return "";
		}

		const isGetViewException = this._checkForGetViewByIdException(stack, currentClassName);

		//this.getView().byId("") exception
		if (isGetViewException) {
			currentClassName = this._getClassNameFromViewById(stack, primaryClassName);
			if (stack.length > 0) {
				className = this.findClassNameForStack(stack, currentClassName, primaryClassName, false);
			} else {
				className = currentClassName;
			}
		} else {
			let temporaryCurrentClassName = currentClassName;
			//the rest of the cases
			const currentNode = stack.shift();
			if (currentNode.type === "ThisExpression") {
				if (stack.length > 0) {
					className = this.findClassNameForStack(stack, currentClassName, primaryClassName, false);
				} else {
					className = currentClassName;
				}

			} else if (currentNode._acornSyntaxAnalyserType && currentNode._acornSyntaxAnalyserType !== "map") {
				className = currentNode._acornSyntaxAnalyserType;
				if (stack[0]?.type === "CallExpression") {
					stack.shift();
				}
			} else if (currentNode.type === "MemberExpression") {
				const memberName = currentNode.property?.name;
				const isCallOrApply = stack[0]?.type === "MemberExpression" && (stack[0]?.property?.name === "call" || stack[0]?.property?.name === "apply");
				const isMethod = stack[0]?.type === "CallExpression" || isCallOrApply;
				const isArray = currentClassName.endsWith("[]");
				if (!isMethod && isArray) {
					// className = currentClassName.replace("[]", "");
				} else if (isMethod) {
					if (isCallOrApply) {
						stack.shift();
					}

					const callExpression = stack.shift();
					if (currentClassName === "sap.ui.core.UIComponent" && memberName === "getRouterFor") {
						className = this._getClassNameOfTheRouterFromManifest(primaryClassName);
					} else if (memberName === "getOwnerComponent") {
						className = this._getClassNameOfTheComponent(primaryClassName);
					} else if (memberName === "getModel" && callExpression.arguments) {
						const modelName = callExpression.arguments[0]?.value || "";
						className = this.getClassNameOfTheModelFromManifest(modelName, primaryClassName) || className;
					}

					if (!className) {
						const method = this.findMethodHierarchically(currentClassName, memberName);
						if (method) {
							if (currentClassName === "sap.ui.base.Event") {
								stack.unshift(callExpression);
								className = this._handleBaseEventException(currentNode, stack, primaryClassName);
							}
							if (!className) {
								if (!method.returnType || method.returnType === "void" || method.returnType === "Promise") {
									this.findMethodReturnType(method, currentClassName);
								}
								className = method.returnType;
							}

							if (className === "map" && (<ICustomClassUIMethod>method).acornNode) {
								currentNode._acornSyntaxAnalyserType = "map";
								const UIClass = UIClassFactory.getUIClass(currentClassName);
								if (UIClass instanceof CustomUIClass) {
									const body = (method as ICustomClassUIMethod).acornNode.body?.body;
									if (body) {
										const returnStatement = body.find((node: any) => node.type === "ReturnStatement");
										if (returnStatement?.argument) {
											className = this.getClassNameFromSingleAcornNode(returnStatement.argument, UIClass, stack);
										}
									}
								}
							}
						} else {
							stack = [];
						}
					}
				} else {
					const field = this._findFieldHierarchically(currentClassName, memberName);
					if (field) {
						if (!field.type) {
							this.findFieldType(field, currentClassName);
							className = field.type || "";
						} else {
							className = field.type;
						}

						if (className === "map" && (<ICustomClassUIField>field).acornNode?.value) {
							currentNode._acornSyntaxAnalyserType = "map";
							const UIClass = UIClassFactory.getUIClass(primaryClassName);
							if (UIClass instanceof CustomUIClass) {
								className = this.getClassNameFromSingleAcornNode((field as ICustomClassUIField).acornNode.value, UIClass, stack);
							}
						}
					}

					if (!className && currentClassName === "map") {
						const UIClass = UIClassFactory.getUIClass(primaryClassName);
						if (UIClass instanceof CustomUIClass) {
							className = this.getClassNameFromSingleAcornNode(currentNode, UIClass, stack);
						}
					}

					if (!className) {
						stack = [];
					}
				}
			} else if (currentNode.type === "Identifier") {
				if (currentNode.name === "sap") {
					className = this._generateSAPStandardClassNameFromStack(stack);
				} else {
					const UIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);

					const variableDeclaration = this._getAcornVariableDeclarationFromUIClass(currentClassName, currentNode.name, currentNode.end);

					if (variableDeclaration) {
						const neededDeclaration = variableDeclaration.declarations.find((declaration: any) => declaration.id?.name === currentNode.name);
						const stackBeforeDeclaration = stack.length;
						className = this._getClassNameFromAcornVariableDeclaration(neededDeclaration, UIClass, stack);
						stackWasModified = stackBeforeDeclaration !== stack.length;
					} else {
						const neededAssignment = this._getAcornAssignmentsFromUIClass(currentClassName, currentNode.name, currentNode.end);
						if (neededAssignment) {
							className = this.getClassNameFromSingleAcornNode(neededAssignment.right, UIClass, stack);
						}
					}

					if (!className) {
						//get class name from sap.ui.define
						className = this._getClassNameFromUIDefineDotNotation(currentNode.name, UIClass);
					}

					if (!className) {
						//get class name from method parameters
						className = this._getClassNameFromMethodParams(currentNode, UIClass);
					}

					//if variable is map
					if (className?.indexOf("__mapparam__") > -1) {
						const fields = stack.filter(stackPart => stackPart.type === "MemberExpression").map(memberExpression => memberExpression.property?.name).join(".");
						className = `${className}__mapparam__${fields}`;
						stack = [];
					}

					//if variable is the variable of current class
					if (!className && currentNode.name === UIClass.classBodyAcornVariableName) {
						className = UIClass.className;
					}

					//if variable is part of .map, .forEach etc
					if (!className && currentClassName) {
						className = this._getClassNameIfNodeIsParamOfArrayMethod(currentNode, currentClassName);
					}

					//get hungarian notation type
					if ((!className || className === "any" || className === "void") && !stackWasModified) {
						className = CustomUIClass.getTypeFromHungarianNotation(currentNode.name) || "";
					}
				}

			} else if (currentNode.type === "NewExpression") {
				const UIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);
				if (currentNode.callee?.type === "Identifier") {
					className = this._getClassNameFromUIDefineDotNotation(currentNode.callee?.name, UIClass);
				} else if (currentNode.callee?.type === "MemberExpression") {
					const newStack = this.expandAllContent(currentNode).reverse();
					newStack.pop(); //removes NewExpression
					className = this.findClassNameForStack(newStack, currentClassName, primaryClassName, false);
				}

			} else if (currentNode.type === "AwaitExpression") {
				// const nodesInPromise = this.getContent(currentNode.argument);
				// stack = stack.filter((node: any) => !nodesInPromise.includes(node));
				// const promiseClassName = this.findClassNameForStack(nodesInPromise, currentClassName, primaryClassName, false);
				className = this.getResultOfPromise(currentClassName);
			}

			if (!currentNode._acornSyntaxAnalyserType && !stackWasModified && !className?.includes("__map__")) {
				currentNode._acornSyntaxAnalyserType = className || "any";
			}

			temporaryCurrentClassName = this._handleArrayMethods(stack, primaryClassName, className);
			if (temporaryCurrentClassName) {
				className = temporaryCurrentClassName;
			}
		}

		if (className?.includes("module:")) {
			className = className.replace(/module:/g, "");
			className = className.replace(/\//g, ".");
		}

		if (className && stack.length > 0) {
			className = this.findClassNameForStack(stack, className, primaryClassName, false);
		}

		if (className === "array") {
			className = "any[]";
		}

		return className;
	}

	public static getResultOfPromise(className: string) {
		if (/Promise<.*?>/.test(className)) {
			className = this._removeOnePromiseLevel(className);
		} else if (className === "Promise") {
			className = "any";
		}

		return className;
	}

	private static _removeOnePromiseLevel(className: string) {
		let openedLTCount = 0;
		let closedLTCount = 0;
		let startIndex = 0;
		let endIndex = 0;

		let i = 0;
		while (i < className.length && !(openedLTCount > 0 && closedLTCount > 0 && openedLTCount - closedLTCount === 0)) {
			if (className[i] === "<") {
				openedLTCount++;
				if (openedLTCount === 1) {
					startIndex = i;
				}

			}
			if (className[i] === ">") {
				closedLTCount++;
				endIndex = i;
			}
			i++;
		}
		return className.substring(startIndex + 1, endIndex) + className.substring(endIndex + 1, className.length);
	}

	public static getClassNameOfTheModelFromManifest(modelName: string, className: string, clearStack = false) {
		const stackCopy = [...this.declarationStack];
		if (clearStack) {
			this.declarationStack = [];
		}
		let modelClassName = "";
		const manifest = FileReader.getManifestForClass(className);
		if (manifest && manifest.content["sap.ui5"]?.models) {
			const modelEntry = manifest.content["sap.ui5"].models[modelName];
			if (modelEntry?.type) {
				modelClassName = modelEntry.type;
			}
		}

		if (!modelClassName) {
			const methods = UIClassFactory.getClassMethods(className);
			const method = (<ICustomClassUIMethod[]>methods).find(method => {
				let methodFound = false;
				if (method.acornNode) {
					const content = this.expandAllContent(method.acornNode);
					const memberExpression: any = content.find(
						content => this._checkOfThisIsCorrectSetModel(content, modelName, className)
					);
					methodFound = !!memberExpression;
				}

				return methodFound;
			});

			if (method?.acornNode) {
				const content = this.expandAllContent(method.acornNode);
				const memberExpression = content.find(content =>
					this._checkOfThisIsCorrectSetModel(content, modelName, className)
				);
				if (memberExpression && memberExpression.arguments[0]) {
					this.declarationStack = stackCopy;
					const model = memberExpression.arguments[0];
					const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
					if (!this.declarationStack.includes(model)) {
						this.declarationStack.push(model);
						const stack = strategy.getStackOfNodesForPosition(className, model.end, true);
						modelClassName = this.findClassNameForStack(stack, className) || "";
					} else {
						this.declarationStack = [];
					}
				}
			}
		}
		return modelClassName;
	}

	private static _checkOfThisIsCorrectSetModel(content: any, modelName: string, className: string) {
		let bIsSetModelMethod =
			content.type === "CallExpression" &&
			content.callee?.property?.name === "setModel" &&
			(content.arguments[1] && content.arguments[1].value || "") === modelName;

		if (bIsSetModelMethod) {
			const position = content.callee.property.start;
			const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
			const classNameAtCurrentPosition = strategy.getClassNameOfTheVariableAtPosition(className, position);
			bIsSetModelMethod = classNameAtCurrentPosition === className || classNameAtCurrentPosition === "sap.ui.core.mvc.View";
		}

		return bIsSetModelMethod;
	}

	private static _getClassNameOfTheRouterFromManifest(className: string) {
		let routerClassName = "";

		const manifest = FileReader.getManifestForClass(className);
		if (manifest && manifest.content["sap.ui5"]?.routing?.config?.routerClass) {
			routerClassName = manifest.content["sap.ui5"].routing.config.routerClass;
		}

		if (!routerClassName) {
			const manifests = FileReader.getAllManifests();
			const manifest = manifests.find(manifest => {
				return manifest.content["sap.ui5"]?.routing?.config?.routerClass;
			});
			if (manifest) {
				routerClassName = manifest.content["sap.ui5"].routing.config.routerClass;
			}
		}

		return routerClassName;
	}

	private static _getClassNameOfTheComponent(className: string) {
		let componentClassName = "";
		const manifest = FileReader.getManifestForClass(className);
		if (manifest && manifest.content["sap.app"]?.id) {
			componentClassName = `${manifest.content["sap.app"]?.id}.Component`;
		}

		return componentClassName;
	}

	private static _handleBaseEventException(node: any, stack: any[], primaryClassName: string) {
		let className = "";
		const callExpression = stack.shift();
		const UIClass = UIClassFactory.getUIClass(primaryClassName);
		if (UIClass instanceof CustomUIClass && node.property?.name) {
			const methodName = node.property.name;
			const eventData = this.getEventHandlerData(node, primaryClassName);
			if (eventData) {
				if (methodName === "getSource") {
					className = eventData.className;
				} else if (methodName === "getParameter") {
					if (callExpression && callExpression.arguments && callExpression.arguments[0]) {
						const parameterName = callExpression.arguments[0].value;
						const parameters = this.getParametersOfTheEvent(eventData.eventName, eventData.className);
						const parameter = parameters?.find(param => param.name === parameterName);
						if (parameter) {
							className = parameter.type;
						}
					}
				}
			}

		}

		return className;
	}

	public static getParametersOfTheEvent(eventName: string, className: string) {
		const events = UIClassFactory.getClassEvents(className);
		const event = events.find(event => event.name === eventName);
		return event?.params;
	}

	public static getEventHandlerData(node: any, className: string) {
		let eventHandlerData;

		const UIClass = UIClassFactory.getUIClass(className);
		if (UIClass instanceof CustomUIClass) {
			const currentClassEventHandlerName = this._getEventHandlerName(node, className);
			const viewOfTheController = FileReader.getViewForController(className);
			if (viewOfTheController && currentClassEventHandlerName) {
				eventHandlerData = this._getEventHandlerDataFromXMLText(viewOfTheController, currentClassEventHandlerName);
				if (!eventHandlerData) {
					viewOfTheController.fragments.find(fragment => {
						eventHandlerData = this._getEventHandlerDataFromXMLText(fragment, currentClassEventHandlerName);

						return !!eventHandlerData;
					});
				}
			}
			if (currentClassEventHandlerName && !eventHandlerData) {
				// const fragmentsOfTheController = FileReader.getFragmentsForClass(className);
				const UIClass = UIClassFactory.getUIClass(className);
				if (UIClass instanceof CustomUIClass) {
					const fragmentsOfTheController = UIClassFactory.getViewsAndFragmentsOfControlHierarchically(UIClass).fragments;
					fragmentsOfTheController.find(fragmentOfTheController => {
						eventHandlerData = this._getEventHandlerDataFromXMLText(fragmentOfTheController, currentClassEventHandlerName);

						return !!eventHandlerData;
					});

					if (!eventHandlerData) {
						eventHandlerData = this.getEventHandlerDataFromJSClass(className, currentClassEventHandlerName);
					}
				}
			}
		}

		return eventHandlerData;
	}

	static getEventHandlerDataFromJSClass(className: string, eventHandlerName: string): { className: string, eventName: string, node: any } | undefined {
		let eventHandlerData;
		const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);
		const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
		const eventHandler = UIClass.methods.find(method => method.name === eventHandlerName);
		if (eventHandler) {
			let eventHandlerNode: any = null;
			UIClass.methods.find(method => {
				if (method.acornNode) {
					const callExpressions = AcornSyntaxAnalyzer.expandAllContent(method.acornNode).filter((node: any) => node.type === "CallExpression");
					callExpressions.find((callExpression: any) => {
						if (
							callExpression.arguments &&
							callExpression.arguments.length > 0 &&
							callExpression.callee?.property?.name
						) {
							const attachMethodName = callExpression.callee.property.name;
							const eventMethodNameCapital = attachMethodName.replace("attach", "");
							let eventName = `${eventMethodNameCapital[0].toLowerCase()}${eventMethodNameCapital.substring(1, eventMethodNameCapital.length)}`;
							let firstArgument, secondArgument;

							if (eventName === "event") {
								eventName = callExpression.arguments[0].value;
								firstArgument = callExpression.arguments[1];
								secondArgument = callExpression.arguments[2];
							} else {
								firstArgument = callExpression.arguments[0];
								secondArgument = callExpression.arguments[1];
							}
							if (firstArgument?.type === "MemberExpression" && firstArgument?.object?.type === "ThisExpression") {
								eventHandlerNode = firstArgument;
							} else if (secondArgument?.type === "MemberExpression" && secondArgument?.object?.type === "ThisExpression") {
								eventHandlerNode = secondArgument;
							}

							if (eventHandlerNode && eventHandlerNode.property?.name === eventHandler.name) {
								const className = strategy.acornGetClassName(UIClass.className, callExpression.callee.property.start, false);
								if (className) {
									const events = UIClassFactory.getClassEvents(className);
									if (events.find(event => event.name === eventName)) {
										eventHandlerData = {
											className: className,
											eventName: eventName,
											node: eventHandlerNode
										};
									}

								} else {
									eventHandlerNode = null;
								}
							} else {
								eventHandlerNode = null;
							}
						}
						return !!eventHandlerNode;
					});
				}
				return !!eventHandlerNode;
			});
		}

		return eventHandlerData;
	}

	private static _getEventHandlerDataFromXMLText(viewOrFragment: IXMLFile, currentClassEventHandlerName: string) {
		let eventHandlerData;

		const tagsAndAttributes = XMLParser.getXMLFunctionCallTagsAndAttributes(viewOrFragment, currentClassEventHandlerName);
		if (tagsAndAttributes.length > 0) {
			const { tag, attributes } = tagsAndAttributes[0];
			const attribute = attributes[0];
			const { attributeName } = XMLParser.getAttributeNameAndValue(attribute);
			const eventName = attributeName;
			if (eventName) {
				const tagPrefix = XMLParser.getTagPrefix(tag.text);
				const classNameOfTheTag = XMLParser.getClassNameFromTag(tag.text);

				if (classNameOfTheTag) {
					const libraryPath = XMLParser.getLibraryPathFromTagPrefix(viewOrFragment, tagPrefix, tag.positionBegin);
					const classOfTheTag = [libraryPath, classNameOfTheTag].join(".");
					eventHandlerData = {
						className: classOfTheTag,
						eventName: eventName
					};
				}
			}
		}

		return eventHandlerData;
	}

	private static _getEventHandlerName(node: any, className: string) {
		let eventHandlerName = "";
		const UIClass = UIClassFactory.getUIClass(className);
		if (UIClass instanceof CustomUIClass) {
			const eventHandlerMethod = UIClass.methods.find(method => {
				let correctMethod = false;
				if (method.acornNode) {
					correctMethod = method.acornNode.start < node.start && method.acornNode.end > node.start;
				}

				return correctMethod;
			});
			if (eventHandlerMethod) {
				eventHandlerName = eventHandlerMethod.name;
			}
		}

		return eventHandlerName;
	}

	private static _handleArrayMethods(stack: any[], currentClassName: string, variableClassName: string) {
		let className = "";
		//if it is map, filter or find
		const arrayMethods = ["map", "filter", "find"];
		const propertyName = stack[0]?.property?.name;
		if (stack.length >= 2 && stack[0].type === "MemberExpression" && stack[1].type === "CallExpression" && arrayMethods.includes(propertyName)) {
			if (propertyName === "map") {
				const returnClass = stack[1].arguments[0];
				let returnStatement;
				if (returnClass?.body?.body) {
					returnStatement = returnClass?.body?.body?.find((node: any) => node.type === "ReturnStatement")?.argument;
				} else {
					returnStatement = returnClass?.body;
				}
				if (returnStatement) {
					const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
					const newStack = strategy.getStackOfNodesForPosition(currentClassName, returnStatement.end, true);
					className = this.findClassNameForStack(newStack, currentClassName) || (typeof returnStatement.value === "undefined" ? "any" : typeof returnStatement.value);
				}
				if (propertyName === "map") {
					className = `${className}[]`;
				}
			} else if (propertyName === "filter") {
				className = variableClassName;
			} else if (propertyName === "find") {
				if (variableClassName === "array") {
					variableClassName = "any[]";
				}
				className = variableClassName.replace("[]", "");
			}
			stack.splice(0, 2);
			className = this._handleArrayMethods(stack, currentClassName, className);
		} else {
			className = variableClassName;
		}

		return className;
	}

	private static _getClassNameIfNodeIsParamOfArrayMethod(identifierNode: any, currentClassName: string) {
		let className = "";

		if (!this.declarationStack.includes(identifierNode)) {
			const UIClass = UIClassFactory.getUIClass(currentClassName);
			this.declarationStack.push(identifierNode);
			if (UIClass instanceof CustomUIClass) {
				const acornMethod = this.findAcornNode(UIClass.acornMethodsAndFields, identifierNode.end);
				if (acornMethod) {
					const content = this.expandAllContent(acornMethod.value);
					const node = this._getCallExpressionNodeWhichIsArrayMethod(content, identifierNode.end);
					if (node) {
						const isFirstParamOfArrayMethod = node.arguments[0]?.params && node.arguments[0]?.params[0]?.name === identifierNode.name;
						if (isFirstParamOfArrayMethod) {
							const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
							className = strategy.acornGetClassName(currentClassName, node.callee.object.end + 1, false) || "";
							if (className.endsWith("[]")) {
								className = className.replace("[]", "");
							} else if (className.toLowerCase() === "array") {
								className = "any";
							}
						}
					}
				}
			}
		}

		return className;
	}

	private static _getCallExpressionNodeWhichIsArrayMethod(nodes: any[], position: number): any | undefined {
		const content = nodes.filter(content => content.type === "CallExpression" && this._isArrayMethod(content.callee?.property?.name)).reverse();
		return this.findAcornNode(content, position);
	}

	private static _isArrayMethod(methodName: string) {
		const arrayMethods = ["forEach", "map", "filter", "find"];

		return arrayMethods.indexOf(methodName) > -1;
	}

	private static _generateSAPStandardClassNameFromStack(stack: any[]) {
		const classNameParts: string[] = [];
		let usedNodeCount = 0;

		let node = stack[usedNodeCount];

		while (node && node.type === "MemberExpression") {
			if (node.object.type === "Identifier") {
				classNameParts.push(node.object.name);
				node.object._acornSyntaxAnalyserType = classNameParts.join(".");
			}
			classNameParts.push(node.property.name);
			node._acornSyntaxAnalyserType = classNameParts.join(".");

			usedNodeCount++;
			node = stack[usedNodeCount];

			const UIClass = UIClassFactory.getUIClass(classNameParts.join("."));
			if (UIClass.classExists) {
				const nodeDAO = new SAPNodeDAO();
				const node = nodeDAO.findNode(UIClass.className);
				if (node?.getMetadata()?.getRawMetadata()?.kind === "class") {
					break;
				}
			}
		}

		if (stack[usedNodeCount]?.type === "CallExpression") {
			//this means that last MemberExpression was related to the method name, not to the class name
			classNameParts.pop();
			usedNodeCount--;
			node = stack[usedNodeCount];
			if (node && node._acornSyntaxAnalyserType) {
				node._acornSyntaxAnalyserType = null;
			}
		}

		stack.splice(0, usedNodeCount);

		return classNameParts.join(".");
	}

	private static _checkForGetViewByIdException(stack: any[], className: string) {
		let isGetViewByIdException = false;
		if (
			(className === "sap.ui.core.mvc.View" || className === "sap.ui.core.Element" || UIClassFactory.isClassAChildOfClassB(className, "sap.ui.core.mvc.Controller"))
			&& stack.length > 1 &&
			stack[0].property?.name === "byId" &&
			stack[1].arguments?.length === 1
		) {
			isGetViewByIdException = true;
		}

		return isGetViewByIdException;
	}

	private static _getClassNameFromViewById(stack: any[], currentControllerName: string) {
		let className = "";

		if (stack.length > 1) {
			const callExpression = stack[1];

			stack.splice(0, 2);
			const controlId = callExpression.arguments[0]?.value;
			if (controlId) {
				className = FileReader.getClassNameFromView(currentControllerName, controlId) || "";
			}
		}

		return className;
	}

	public static findMethodReturnType(method: IUIMethod, className: string, includeParentMethods = true, clearStack = false) {
		if (clearStack) {
			this.declarationStack = [];
		}
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
						method.returnType = this.getClassNameFromSingleAcornNode(returnStatement.argument, UIClass) || "void";
					}
				}
			}

			if (includeParentMethods && (!method.returnType || method.returnType === "void") && UIClass.parentClassNameDotNotation) {
				this.findMethodReturnType(method, UIClass.parentClassNameDotNotation);
			}
		} else if (method.returnType === "Promise") {
			if (UIClass instanceof CustomUIClass) {
				const UIMethod = UIClass.methods.find(innerMethod => innerMethod.name === method.name);
				if (UIMethod) {
					const methodBody = UIMethod.acornNode?.body?.body;
					const returnStatement = methodBody?.find((bodyPart: any) => bodyPart.type === "ReturnStatement");

					if (returnStatement) {
						const returnType = this.getClassNameFromSingleAcornNode(returnStatement.argument, UIClass) || "void";
						if (returnType) {
							if (UIMethod.acornNode?.async) {
								method.returnType = `Promise<${returnType}>`;
							} else {
								method.returnType = returnType;
							}
						}
					}
				}
			}
		}

		if (method.returnType?.includes("__map__")) {
			method.returnType = "map";
		}
	}

	public static findFieldType(field: IUIField, className: string, includeParentMethods = true, clearStack = false) {
		const UIClass = UIClassFactory.getUIClass(className);
		if (clearStack) {
			this.declarationStack = [];
		}

		const innerField = UIClass.fields.find(innerfield => innerfield.name === field.name);
		const customField = innerField as ICustomClassUIField;
		if (customField?.acornNode?.value?.type === "Literal" && UIClass instanceof CustomUIClass) {
			customField.type = this.getClassNameFromSingleAcornNode(customField.acornNode.value, UIClass);
		}
		if (innerField && innerField.type) {
			field.type = innerField.type;
		} else if (UIClass instanceof CustomUIClass) {
			UIClass.acornMethodsAndFields.find((property: any) => {
				let typeFound = false;
				if (property.value.type === "FunctionExpression" || property.value.type === "ArrowFunctionExpression") {
					const assignmentExpressions = this.expandAllContent(property.value.body).filter((node: any) => node.type === "AssignmentExpression");
					assignmentExpressions.forEach((node: any) => {
						if (UIClass.isAssignmentStatementForThisVariable(node) && node?.left?.property?.name === field.name) {
							field.type = this.getClassNameFromSingleAcornNode(node.right, UIClass);
						}
					});
				} else if (property.value.type === "Identifier" && property.key.name === field.name) {
					field.type = this._getClassNameFromUIDefineDotNotation(property.value.name, UIClass);
				} else if (property.value.type === "MemberExpression" && property.key.name === field.name) {
					const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
					const stack = strategy.getStackOfNodesForPosition(className, property.value.end, true);
					if (stack.length > 0) {
						const lastMember = stack.pop();
						const type = this.findClassNameForStack(stack, className);
						if (type) {
							const fieldsAndMethods = strategy.destructueFieldsAndMethodsAccordingToMapParams(type);
							const fieldFromAnotherClass = fieldsAndMethods?.fields.find(field => field.name === lastMember.property.name);
							const methodFromAnotherClass = fieldsAndMethods?.methods.find(method => method.name === lastMember.property.name);
							if (fieldFromAnotherClass) {
								field.type = fieldFromAnotherClass.type;
							} else if (methodFromAnotherClass) {
								const UIClass = UIClassFactory.getUIClass(className);
								UIClass.fields.splice(UIClass.fields.indexOf(field), 1);
								UIClass.methods.push({
									name: field.name,
									description: field.description,
									params: methodFromAnotherClass.params,
									returnType: methodFromAnotherClass.returnType,
									visibility: field.visibility,
									owner: UIClass.className,
									static: field.static,
									abstract: field.abstract
								});
							}
						}
					}
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
		if (!field.type && UIClass instanceof CustomUIClass) {
			field.type = CustomUIClass.getTypeFromHungarianNotation(field.name);
		}

		if (field.type?.includes("__map__")) {
			field.type = "map";
		}
	}

	private static _getAcornVariableDeclarationFromUIClass(className: string, variableName: string, position: number) {
		let variableDeclaration: any;
		const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);

		const functionExpression = UIClass.acornMethodsAndFields?.find((method: any) => method.start < position && method.end >= position);
		const functionParts = functionExpression?.value?.body?.body;

		if (functionParts) {
			const variableDeclarations = this._findAllDeclarations(functionParts);
			variableDeclaration = variableDeclarations.find(declaration => {
				return declaration.declarations.find((declaration: any) => declaration.id.name === variableName);
			});
		}

		return variableDeclaration;
	}

	private static _findAllDeclarations(nodes: any[]) {
		let declarations: any[] = [];
		nodes.forEach((node: any) => {
			const content = this.expandAllContent(node);
			declarations = declarations.concat(content.filter((node: any) => node.type === "VariableDeclaration"));
		});

		return declarations;
	}

	private static _getAcornAssignmentsFromUIClass(className: string, variableName: string, position: number) {
		let variableAssignment: any;
		const UIClass = <CustomUIClass>UIClassFactory.getUIClass(className);

		const functionExpression = UIClass.acornMethodsAndFields?.find((method: any) => method.start < position && method.end >= position);
		const functionParts = functionExpression?.value?.body?.body;

		if (functionParts) {
			const assignments = this._findAllAssignments(functionParts);
			variableAssignment = assignments.find(assignment => assignment.left.name === variableName && assignment.right);
		}

		return variableAssignment;
	}

	private static _findAllAssignments(nodes: any[]) {
		let assignments: any[] = [];
		nodes.forEach((node: any) => {
			const content = this.expandAllContent(node);
			assignments = assignments.concat(content.filter((node: any) => node.type === "AssignmentExpression"))
		});

		return assignments;
	}

	public static expandAllContent(node: any, content: any[] = []) {
		if (node.expandedContent) {
			content.push(...node.expandedContent);
		} else {
			if (!content.includes(node)) {
				content.push(node);
			}
			const innerNodes: any[] = this.getContent(node).filter(node => !content.includes(node));
			innerNodes.forEach((node: any) => {
				if (node) {
					this.expandAllContent(node, content);
				}
			});

			node.expandedContent = content.concat([]);
		}

		return content;
	}
	public static getContent(node: any) {
		let innerNodes: any[] = [];

		if (node.type === "VariableDeclaration") {
			if (node.declarations) {
				innerNodes = [...node.declarations];
			}
		} else if (node.type === "VariableDeclarator") {
			if (node.init) {
				innerNodes.push(node.init);
			}
			if (node.id) {
				innerNodes.push(node.id);
			}
		} else if (node.type === "CallExpression") {
			innerNodes = [...node.arguments];
			if (node.callee) {
				innerNodes.push(node.callee);
			}
		} else if (node.type === "MemberExpression") {
			innerNodes.push(node.object);
			if (node.property) {
				innerNodes.push(node.property);
			}
		} else if (node.type === "BinaryExpression") {
			if (node.right) {
				innerNodes.push(node.right);
			}
			if (node.left) {
				innerNodes.push(node.left);
			}
		} else if (node.type === "ExpressionStatement") {
			innerNodes.push(node.expression);
		} else if (node.type === "ThisExpression") {
			//
		} else if (node.type === "AwaitExpression") {
			innerNodes.push(node.argument);
		} else if (node.type === "SpreadElement") {
			innerNodes.push(node.argument);
		} else if (node.type === "ArrayExpression") {
			innerNodes = [...node.elements];
		} else if (node.type === "TryStatement") {
			innerNodes = [...node.block.body];
			if (node.handler?.body) {
				innerNodes = innerNodes.concat(node.handler.body);
			}
			if (node.finalizer?.body) {
				innerNodes = innerNodes.concat(node.finalizer.body);
			}
		} else if (node.type === "BlockStatement") {
			innerNodes = [...node.body];
		} else if (node.type === "ReturnStatement") {
			innerNodes.push(node.argument);
		} else if (node.type === "IfStatement") {
			if (node.consequent) {
				innerNodes.push(node.consequent);
			}
			if (node.alternate) {
				innerNodes.push(node.alternate);
			}
			if (node.body) {
				innerNodes = innerNodes.concat(node.body);
			}
			if (node.test) {
				innerNodes.push(node.test);
			}
		} else if (node.type === "ConditionalExpression") {
			if (node.consequent) {
				innerNodes.push(node.consequent);
			}
			if (node.alternate) {
				innerNodes.push(node.alternate);
			}
			if (node.test) {
				innerNodes.push(node.test);
			}
		} else if (node.type === "SwitchStatement") {
			node.cases.forEach((body: any) => {
				innerNodes.push(...body.consequent);
			});
		} else if (node.type === "AssignmentExpression") {
			innerNodes.push(node.right);
			if (node.left) {
				innerNodes.push(node.left);
			}
		} else if (node.type === "NewExpression") {
			if (node.callee) {
				innerNodes.push(node.callee);
			}
			innerNodes = innerNodes.concat(node.arguments);
		} else if (node.type === "LogicalExpression") {
			if (node.right) {
				innerNodes.push(node.right);
			}
			if (node.left) {
				innerNodes.push(node.left);
			}
		} else if (node.type === "ObjectExpression") {
			innerNodes = node.properties.map((declaration: any) => declaration.value);
		} else if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") {
			innerNodes = [node.body].concat(node.params);
		} else if (node.type === "UnaryExpression") {
			if (node.argument) {
				innerNodes.push(node.argument);
			}
		} else if (
			node.type === "WhileStatement" ||
			node.type === "DoWhileStatement" ||
			node.type === "ForStatement" ||
			node.type === "ForInStatement"
		) {
			innerNodes.push(node.body);
		}

		innerNodes = innerNodes.filter(node => !!node);

		return innerNodes;
	}

	private static _getClassNameFromAcornVariableDeclaration(declaration: any, UIClass: CustomUIClass, stack: any[] = []) {
		let className = "";
		if (declaration._acornSyntaxAnalyserType) {
			className = declaration._acornSyntaxAnalyserType;
		} else {
			const stackWasEmpty = stack.length === 0;
			if (declaration.init) {
				className = this.getClassNameFromSingleAcornNode(declaration.init, UIClass, stack);
				if (declaration.id.name && (!className || className === "any" || className === "void") && declaration.init?.type !== "ObjectExpression") {
					className = CustomUIClass.getTypeFromHungarianNotation(declaration.id.name) || className;
				}

				if (className && !className.includes("__map__") && stackWasEmpty) {
					declaration._acornSyntaxAnalyserType = className;
				}
			}
		}


		return className;
	}

	public static declarationStack: any[] = [];

	public static getClassNameFromSingleAcornNode(node: any, UIClass: CustomUIClass, stack: any[] = []) {
		let className = "";
		if (this.declarationStack.indexOf(node) > -1) {
			this.declarationStack = [];
		} else {
			this.declarationStack.push(node);
			if (node?.type === "NewExpression") {
				if (node.callee?.type === "Identifier" && node.callee?.name) {
					className = this._getClassNameFromUIDefineDotNotation(node.callee?.name, UIClass);
				} else if (node.callee?.type === "MemberExpression") {
					className = this._getObjectNameFromMemberExpressionRecursively(node.callee);
				}
			} else if (node?.type === "CallExpression" || node?.type === "MemberExpression" || node?.type === "Identifier") {
				const positionBeforeCurrentStrategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
				className = positionBeforeCurrentStrategy.acornGetClassName(UIClass.className, node.end, false, true) || "";
			} else if (node?.type === "ArrayExpression") {
				className = "any[]";
				if (node.elements && node.elements.length > 0) {
					const firstElement = node.elements[0];
					const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
					const newStack = strategy.getStackOfNodesForPosition(UIClass.className, firstElement.end, true);
					className = this.findClassNameForStack(newStack, UIClass.className) || (typeof firstElement.value === "undefined" ? "any" : typeof firstElement.value);
					if (className) {
						className = `${className}[]`;
					}
				}
			} else if (node?.type === "ObjectExpression") {
				className = "map";
				if (stack.length > 0) {
					const nextNode = stack.shift();
					if (nextNode) {
						const field = node.properties.find((property: any) => property.key?.name === nextNode.property?.name);
						if (field && field.value) {
							className = this.getClassNameFromSingleAcornNode(field.value, UIClass, stack);
						} else {
							className = "any";
						}
					}

				} else {
					const fields = node.properties.map((property: any) => property.key?.name);
					if (fields.length > 0) {
						className = `${UIClass.className}__map__${fields.join("__map__")}`;
					}
					if (!className) {
						className = "map"
					}
					node._acornSyntaxAnalyserType = className;
				}
			} else if (node?.type === "Literal") {
				if (node?.value === null) {
					className = "any";
				} else {
					className = typeof node.value;
				}
			} else if (node?.type === "ThisExpression") {
				className = UIClass.className;
			} else if (node?.type === "AwaitExpression" && node.argument) {
				const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
				const newStack = strategy.getStackOfNodesForPosition(UIClass.className, node.argument.end, true);
				className = this.findClassNameForStack(newStack, UIClass.className);
				if (node.argument.type === "AwaitExpression") {
					className = this.getResultOfPromise(className);
				}
			} //else if (declaration?.type === "BinaryExpression") {
			//className = "boolean";
			//} //else if (declaration?.type === "LogicalExpression") {
			// className = "boolean";
			//}
		}

		return className;
	}

	private static _getObjectNameFromMemberExpressionRecursively(node: any, names: string[] = []) {
		if (node.type === "MemberExpression") {
			names.unshift(node.property?.name);
			if (node.object) {
				this._getObjectNameFromMemberExpressionRecursively(node.object, names);
			}
		} if (node.type === "Identifier") {
			names.unshift(node?.name);
		}

		return names.join(".");
	}

	private static _getClassNameFromUIDefineDotNotation(UIDefineClassName: string, UIClass: CustomUIClass) {
		let className = "";
		if (UIDefineClassName) {
			const UIDefine = UIClass.UIDefine?.find(UIDefine => UIDefine.className === UIDefineClassName);
			if (UIDefine) {
				className = UIDefine.classNameDotNotation;
			}
		}
		if (UIDefineClassName === "Promise") {
			className = "Promise";
		}

		return className;
	}

	private static _getClassNameFromMethodParams(node: any, UIClass: CustomUIClass) {
		let className = "";

		const methodNode = this.findAcornNode(UIClass.acornMethodsAndFields, node.end - 1);
		if (methodNode) {
			const params = methodNode.value?.params;
			if (params) {
				const param = params.find((param: any) => param.name === node.name);
				if (param) {
					className = param.jsType;
					if (param.customData) {
						const stringifiedCustomData = JSON.stringify(param.customData);
						className = `${className} __mapparam__${stringifiedCustomData} `;
					}
				}
			}
		}

		return className;
	}

	public static findMethodHierarchically(className: string, methodName: string): IUIMethod | undefined {
		const method = UIClassFactory.getClassMethods(className).find(method => method.name === methodName);

		return method;
	}

	private static _findFieldHierarchically(className: string, fieldName: string): IUIField | undefined {
		const field = UIClassFactory.getClassFields(className).find(field => field.name === fieldName);

		return field;
	}

	public static findAcornNode(nodes: any[] = [], position: number) {
		return nodes.find((node: any) => node.start < position && node.end >= position);
	}

	//TODO: Refactoring
	public static getClassNameOfTheCurrentDocument(classPath?: string) {
		let returnClassName;

		if (!classPath) {
			classPath = vscode.window.activeTextEditor?.document.uri.fsPath;
		}

		if (classPath) {
			returnClassName = FileReader.getClassNameFromPath(classPath);
		}

		return returnClassName;
	}
}