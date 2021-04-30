import assert = require("assert");
import { after, test } from "mocha";
import * as vscode from "vscode";
import { AcornSyntaxAnalyzer } from "../../classes/UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { UIClassFactory } from "../../classes/UI5Classes/UIClassFactory";
import * as data from "./data/TestData.json";
import { CustomUIClass } from "../../classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../../classes/UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { FileReader } from "../../classes/utils/FileReader";
import { JSLinter } from "../../classes/providers/diagnostics/js/jslinter/JSLinter";
import { XMLLinter } from "../../classes/providers/diagnostics/xml/xmllinter/XMLLinter";
import { UI5Plugin } from "../../UI5Plugin";
import { JSRenameProvider } from "../../classes/providers/rename/JSRenameProvider";

suite("Extension Test Suite", () => {
	after(() => {
		vscode.window.showInformationMessage("All tests done!");
	});

	test("Extension launched", async () => {
		const extension = vscode.extensions.getExtension("ui5.plugin");
		await extension?.activate();
		await UI5Plugin.pWhenPluginInitialized;

		assert.ok(true, "Extension activated");
	});

	test("Method Types match", async () => {
		const testData = data.data;
		testData.forEach(data => {
			data.methods.forEach(testMethodData => {
				const fieldsAndMethods = UIClassFactory.getFieldsAndMethodsForClass(data.className);
				const method = fieldsAndMethods.methods.find(method => method.name === testMethodData.name);
				if (method?.returnType === "void") {
					AcornSyntaxAnalyzer.findMethodReturnType(method, data.className, true, true);
				}
				assert.strictEqual(method?.returnType, testMethodData.returnType, `${data.className} -> ${testMethodData.name} return type is "${method?.returnType}" but expected "${testMethodData.returnType}"`);
			});
		});
	});

	test("Field Types match", async () => {
		const testData = data.data;
		testData.forEach(data => {
			data.fields.forEach(testFieldData => {
				const fieldsAndMethods = UIClassFactory.getFieldsAndMethodsForClass(data.className);
				const field = fieldsAndMethods.fields.find(method => method.name === testFieldData.name);
				if (field && !field?.type) {
					AcornSyntaxAnalyzer.findFieldType(field, data.className, true, true);
				}
				assert.strictEqual(field?.type, testFieldData.type, `${data.className} -> ${testFieldData.name} return type is "${field?.type}" but expected "${testFieldData.type}"`);
			});
		});
	});

	test("Syntax Analyser finds correct types at positions", async () => {
		const testData = data.SyntaxAnalyser;
		testData.forEach(data => {
			const UIClass = <CustomUIClass>UIClassFactory.getUIClass(data.className);
			const method = UIClass.acornMethodsAndFields.find(methodOrField => methodOrField.key?.name === data.methodName);
			const methodContent = AcornSyntaxAnalyzer.expandAllContent(method.value.body);
			const searchedNode = methodContent.find(node => {
				return compareProperties(data.node, node);
			});

			if (!searchedNode) {
				throw new Error(`Node '${JSON.stringify(data.node)}' in '${data.methodName}' not found`);
			}

			const position = searchedNode.property?.start || searchedNode.start + data.positionAddition;
			const positionBeforeCurrentStrategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();
			let classNameAtPosition = positionBeforeCurrentStrategy.acornGetClassName(data.className, position);
			if (classNameAtPosition) {
				const fieldsAndMethods = positionBeforeCurrentStrategy.destructueFieldsAndMethodsAccordingToMapParams(classNameAtPosition);
				classNameAtPosition = fieldsAndMethods?.className;
			}
			assert.strictEqual(classNameAtPosition, data.type, `"${data.className}" position ${position} method "${data.methodName}" type is "${classNameAtPosition}" but expected "${data.type}". Data: ${JSON.stringify(data)}`);
		});
	});

	test("JS Linter working properly", async () => {
		const testData = data.JSLinter;

		for (const data of testData) {
			const filePath = FileReader.getClassPathFromClassName(data.className);
			if (filePath) {
				const document = await vscode.workspace.openTextDocument(filePath);
				const errors = JSLinter.getLintingErrors(document);
				assert.strictEqual(errors.length, data.errors.length, `"${data.className}" class should have ${data.errors.length} errors, but got ${errors.length}`);

				data.errors.forEach(dataError => {
					const errorInDocument = errors.find(error => error.message === dataError.text);
					assert.ok(!!errorInDocument, `"${data.className}" class should have "${dataError.text}" error, but it doesn't`);
				});
			}

		}
	});

	test("XML View Linter working properly", async () => {
		const testData = data.XMLLinter;

		for (const data of testData) {
			const filePath = FileReader.convertClassNameToFSPath(data.className, false, false, true);
			if (filePath) {
				const document = await vscode.workspace.openTextDocument(filePath);
				const errors = XMLLinter.getLintingErrors(document);
				assert.strictEqual(data.errors.length, errors.length, `"${data.className}" class should have ${data.errors.length} errors, but got ${errors.length}`);

				data.errors.forEach(dataError => {
					const errorInDocument = errors.find(error => error.message === dataError.text);
					assert.ok(!!errorInDocument, `"${data.className}" class should have ${dataError.text} error, but it doesn't`);
				});
			}

		}
	});

	test("XML Fragment Linter working properly", async () => {
		const testData = data.FragmentLinter;

		for (const data of testData) {
			const filePath = FileReader.convertClassNameToFSPath(data.className, false, true);
			if (filePath) {
				const document = await vscode.workspace.openTextDocument(filePath);
				const errors = XMLLinter.getLintingErrors(document);
				assert.strictEqual(data.errors.length, errors.length, `"${data.className}" class should have ${data.errors.length} errors, but got ${errors.length}`);

				data.errors.forEach(dataError => {
					const errorInDocument = errors.find(error => error.message === dataError.text);
					assert.ok(!!errorInDocument, `"${data.className}" class should have ${dataError.text} error, but it doesn't`);
				});
			}

		}
	});

	test("All event handlers are found", async () => {
		const testData = data.EventHandlers;

		for (const data of testData) {
			const fieldsAndMethods = UIClassFactory.getFieldsAndMethodsForClass(data.className);
			data.eventHandlers.forEach(eventHandlerName => {
				const eventHandlerMethod: any = fieldsAndMethods.methods.find((method: any) => {
					return method.name === eventHandlerName;
				});
				assert.ok(!!eventHandlerMethod.isEventHandler, `"${data.className}" class should have "${eventHandlerName}" method recognized as event handler, but it doesn't`);
			});

		}
	});

	test("JS Rename Handler working properly", async () => {
		const testData = data.RenameProvider;
		const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy();

		for (const data of testData) {
			const UIClass = <CustomUIClass>UIClassFactory.getUIClass(data.className);

			const filePath = FileReader.convertClassNameToFSPath(data.className);
			if (filePath) {
				const document = await vscode.workspace.openTextDocument(filePath);
				const method = UIClass.methods.find(method => method.name === data.methodName);
				if (method && method.memberPropertyNode) {
					const position = document.positionAt(method.memberPropertyNode.start);
					const newMethodName = `${data.methodName}New`;
					const workspaceEdits = await JSRenameProvider.provideRenameEdits(document, position, newMethodName);

					const entries = workspaceEdits?.entries();
					const entry = entries?.shift();
					if (workspaceEdits && entry) {
						const uri = entry[0];
						const textEdit = entry[1];
						const startOffset = document.offsetAt(textEdit[0].range.start);
						const endOffset = document.offsetAt(textEdit[0].range.end);

						assert.strictEqual(uri.fsPath, filePath);
						assert.strictEqual(method.memberPropertyNode.start, startOffset);
						assert.strictEqual(method.memberPropertyNode.end, endOffset);
					}

					for (const methodRename of data.renames.methods) {
						const UIClass = <CustomUIClass>UIClassFactory.getUIClass(methodRename.className);
						const containerMethod = UIClass.methods.find(method => method.name === methodRename.containerMethod);
						const allNodes = AcornSyntaxAnalyzer.expandAllContent(containerMethod?.acornNode);
						const allNodesWithCurrentMethod = allNodes.filter((node: any) => node.type === "MemberExpression" && node.property?.name === data.methodName);
						const allNodesFromCurrentClass = allNodesWithCurrentMethod.filter((node: any) => {
							const ownerClassName = strategy.acornGetClassName(methodRename.className, node.end, true);
							return ownerClassName === data.className;
						});

						assert.ok(allNodesFromCurrentClass.length > 0, `Nodes with "${data.methodName}" method in "${methodRename.className}" class "${methodRename.containerMethod}" method not found`);

						if (entries) {
							for (const node of allNodesFromCurrentClass) {
								let necessaryEntry: [vscode.Uri, vscode.TextEdit[]] | undefined;
								for (const entry of entries) {
									const uri = entry[0];
									const document = await vscode.workspace.openTextDocument(uri);
									const textEdit = entry[1];
									const startOffset = document.offsetAt(textEdit[0].range.start);
									const endOffset = document.offsetAt(textEdit[0].range.end);
									if (
										node.property.start === startOffset &&
										node.property.end === endOffset
									) {
										necessaryEntry = entry;
										break;
									}
								}

								assert.ok(!!necessaryEntry, `Workspace edit for node "${node.property.name}" not found`);
								if (necessaryEntry) {
									const index = entries?.indexOf(necessaryEntry);
									entries?.splice(index, 1);
								}
							}
						}
					}

					if (entries) {
						assert.ok(entries.length === 0, "All workspace edit entries found");
					}
				}
			}
		}
	});
});

function compareProperties(dataNode: any, node2: any): boolean {
	let allInnerNodesExists = true;
	for (const i in dataNode) {
		if (node2[i]) {
			if (typeof node2[i] === "object") {
				allInnerNodesExists = compareProperties(dataNode[i], node2[i]);
			} else {
				allInnerNodesExists = allInnerNodesExists && dataNode[i] === node2[i];
			}
		} else {
			allInnerNodesExists = false;
		}
	}

	return allInnerNodesExists;
}