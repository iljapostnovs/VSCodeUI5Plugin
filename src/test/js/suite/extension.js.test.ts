import assert = require("assert");
import { after, test } from "mocha";
import { JSLinterErrorFactory, PropertiesLinterErrorFactory, XMLLinterErrorFactory } from "ui5plugin-linter";
import { ParserPool, UI5JSParser, XMLParser } from "ui5plugin-parser";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "ui5plugin-parser/dist/classes/parsing/jsparser/typesearch/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { CustomJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import * as vscode from "vscode";
import { TextDocumentAdapter } from "../../../classes/adapters/vscode/TextDocumentAdapter";
import { FileRenameMediator } from "../../../classes/filerenaming/FileRenameMediator";
import { JSCodeLensProvider } from "../../../classes/providers/codelens/jscodelens/JSCodeLensProvider";
import { JSDynamicCompletionItemsFactory } from "../../../classes/providers/completionitems/factories/js/JSDynamicCompletionItemsFactory";
import { SAPUIDefineFactory } from "../../../classes/providers/completionitems/factories/js/sapuidefine/SAPUIDefineFactory";
import { ViewIdCompletionItemFactory } from "../../../classes/providers/completionitems/factories/js/ViewIdCompletionItemFactory";
import { XMLDynamicCompletionItemFactory } from "../../../classes/providers/completionitems/factories/xml/XMLDynamicCompletionItemFactory";
import { JSRenameProvider } from "../../../classes/providers/rename/JSRenameProvider";
import { FileWatcherMediator } from "../../../classes/utils/FileWatcherMediator";
import { XMLFormatter } from "../../../classes/utils/XMLFormatter";
import * as CodeLensData from "./data/CodeLensData.json";
import * as CompletionItemsData from "./data/completionitems/JSCompletionItems.json";
import * as XMLCompletionItemData from "./data/completionitems/XMLCompletionItems.json";
import * as renameData from "./data/RenameData.json";
import * as data from "./data/TestData.json";
import * as XMLFormatterData from "./data/XMLFormatterData.json";
// import * as os from "os";

suite("Extension Test Suite", () => {
	after(() => {
		vscode.window.showInformationMessage("All tests done!");
	});

	test("Extension launched", async () => {
		const extension = vscode.extensions.getExtension("iljapostnovs.ui5plugin");
		await extension?.activate();

		assert.ok(extension?.isActive, "Extension activated");
	});

	test("Method Types match", async () => {
		const testData = data.data;
		testData.forEach(data => {
			data.methods.forEach(testMethodData => {
				const parser = <UI5JSParser>ParserPool.getParserForCustomClass(data.className);
				const fieldsAndMethods = parser.classFactory.getFieldsAndMethodsForClass(data.className);
				const method = fieldsAndMethods.methods.find(method => method.name === testMethodData.name);
				if (method?.returnType === "void") {
					parser.syntaxAnalyser.findMethodReturnType(method, data.className, true, true);
				}
				assert.strictEqual(
					method?.returnType,
					testMethodData.returnType,
					`${data.className} -> ${testMethodData.name} return type is "${method?.returnType}" but expected "${testMethodData.returnType}"`
				);
			});
		});
	});

	test("Field Types match", async () => {
		const testData = data.data;
		testData.forEach(data => {
			data.fields.forEach(testFieldData => {
				const parser = <UI5JSParser>ParserPool.getParserForCustomClass(data.className);
				const fieldsAndMethods = parser.classFactory.getFieldsAndMethodsForClass(data.className);
				const field = fieldsAndMethods.fields.find(method => method.name === testFieldData.name);
				if (field && !field?.type) {
					parser.syntaxAnalyser.findFieldType(field, data.className, true, true);
				}
				assert.strictEqual(
					field?.type,
					testFieldData.type,
					`${data.className} -> ${testFieldData.name} return type is "${field?.type}" but expected "${testFieldData.type}"`
				);
			});
		});
	});

	test("Visibility is correct", async () => {
		const testData = data.VisibilityTest;
		testData.forEach(data => {
			data.fields.forEach(testFieldData => {
				const parser = <UI5JSParser>ParserPool.getParserForCustomClass(data.className);
				const fieldsAndMethods = parser.classFactory.getFieldsAndMethodsForClass(data.className);
				const field = fieldsAndMethods.fields.find(method => method.name === testFieldData.name);
				assert.strictEqual(
					field?.visibility,
					testFieldData.visibility,
					`${data.className} -> ${testFieldData.name} visibility is "${field?.visibility}" but expected "${testFieldData.visibility}"`
				);
			});

			data.methods.forEach(testMethodData => {
				const parser = <UI5JSParser>ParserPool.getParserForCustomClass(data.className);
				const fieldsAndMethods = parser.classFactory.getFieldsAndMethodsForClass(data.className);
				const field = fieldsAndMethods.methods.find(method => method.name === testMethodData.name);
				assert.strictEqual(
					field?.visibility,
					testMethodData.visibility,
					`${data.className} -> ${testMethodData.name} visibility is "${field?.visibility}" but expected "${testMethodData.visibility}"`
				);
			});
		});
	});

	test("Syntax Analyser finds correct types at positions", async () => {
		const testData = data.SyntaxAnalyser;
		testData.forEach(data => {
			const parser = <UI5JSParser>ParserPool.getParserForCustomClass(data.className);
			const UIClass = <CustomJSClass>parser.classFactory.getUIClass(data.className);
			const method = UIClass.acornMethodsAndFields.find(
				methodOrField => methodOrField.key?.name === data.methodName
			);
			const methodContent = parser.syntaxAnalyser.expandAllContent(method.value.body);
			const searchedNode = methodContent.find(node => {
				return compareProperties(data.node, node);
			});

			if (!searchedNode) {
				throw new Error(`Node '${JSON.stringify(data.node)}' in '${data.methodName}' not found`);
			}

			const position = searchedNode.property?.start || searchedNode.start + data.positionAddition;
			const positionBeforeCurrentStrategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(
				parser.syntaxAnalyser,
				parser
			);
			let classNameAtPosition = positionBeforeCurrentStrategy.acornGetClassName(data.className, position);
			if (classNameAtPosition) {
				const fieldsAndMethods =
					positionBeforeCurrentStrategy.destructureFieldsAndMethodsAccordingToMapParams(classNameAtPosition);
				classNameAtPosition = fieldsAndMethods?.className;
			}
			assert.strictEqual(
				classNameAtPosition,
				data.type,
				`"${data.className}" position ${position} method "${
					data.methodName
				}" type is "${classNameAtPosition}" but expected "${data.type}". Data: ${JSON.stringify(data)}`
			);
		});
	});

	test("JS Linter working properly", async () => {
		// const cpuSpeed = os.cpus()[0].speed;
		// const cpuSpeedTarget = 3700;
		// const cpuSpeedRelation = cpuSpeed / cpuSpeedTarget;
		const testData = data.JSLinter;
		// console.log(`CPU SPeed: ${cpuSpeed}`);

		for (const data of testData) {
			const parser = <UI5JSParser>ParserPool.getParserForCustomClass(data.className);
			const filePath = parser.fileReader.getClassFSPathFromClassName(data.className);
			if (filePath) {
				const document = await vscode.workspace.openTextDocument(filePath);
				const startTime = new Date().getTime();
				const errors = new JSLinterErrorFactory(parser).getLintingErrors(new TextDocumentAdapter(document));
				const endTime = new Date().getTime();
				const timeSpent = endTime - startTime;

				assert.strictEqual(
					errors.length,
					data.errors.length,
					`"${data.className}" class should have ${data.errors.length} errors, but got ${errors.length}`
				);
				assert.ok(
					timeSpent < data.timeLimit,
					`"${data.className}" linters should run less than ${data.timeLimit}ms, but it ran ${timeSpent} ms`
				);
				console.log(`JS Linter for ${data.className} spent ${timeSpent}ms, target: ${data.timeLimit}`);

				data.errors.forEach(dataError => {
					const errorInDocument = errors.find(error => error.message === dataError.text);
					assert.ok(
						!!errorInDocument,
						`"${data.className}" class should have "${dataError.text}" error, but it doesn't`
					);
				});
			}
		}
	});

	test("Properties Linter working properly", async () => {
		// const cpuSpeed = os.cpus()[0].speed;
		// const cpuSpeedTarget = 3700;
		// const cpuSpeedRelation = cpuSpeed / cpuSpeedTarget;
		const testData = data.PropertiesLinter;
		// console.log(`CPU SPeed: ${cpuSpeed}`);

		for (const data of testData) {
			const parser = <UI5JSParser>ParserPool.getParserForCustomClass(data.className);
			const filePath = parser.fileReader.convertClassNameToFSPath(data.className)?.replace(".js", ".properties");
			if (filePath) {
				const document = await vscode.workspace.openTextDocument(filePath);
				const startTime = new Date().getTime();
				const errors = new PropertiesLinterErrorFactory(parser).getLintingErrors(
					new TextDocumentAdapter(document)
				);
				const endTime = new Date().getTime();
				const timeSpent = endTime - startTime;

				assert.strictEqual(
					errors.length,
					data.errors.length,
					`"${data.className}" class should have ${data.errors.length} errors, but got ${errors.length}`
				);
				assert.ok(
					timeSpent < data.timeLimit,
					`"${data.className}" linters should run less than ${data.timeLimit}ms, but it ran ${timeSpent} ms`
				);
				console.log(`JS Linter for ${data.className} spent ${timeSpent}ms, target: ${data.timeLimit}`);

				data.errors.forEach(dataError => {
					const errorInDocument = errors.find(error => error.message === dataError.text);
					assert.ok(
						!!errorInDocument,
						`"${data.className}" class should have "${dataError.text}" error, but it doesn't`
					);
				});
			}
		}
	});

	test("XML View Linter working properly", async () => {
		// const cpuSpeed = os.cpus()[0].speed;
		// const cpuSpeedTarget = 3700;
		// const cpuSpeedRelation = cpuSpeed / cpuSpeedTarget;
		const testData = data.XMLLinter;

		for (const data of testData) {
			const parser = <UI5JSParser>ParserPool.getParserForCustomClass(data.className);
			const filePath = parser.fileReader.convertClassNameToFSPath(data.className, false, false, true);
			if (filePath) {
				const document = await vscode.workspace.openTextDocument(filePath);
				const startTime = new Date().getTime();
				const errors = new XMLLinterErrorFactory(parser).getLintingErrors(new TextDocumentAdapter(document));
				const endTime = new Date().getTime();
				const timeSpent = endTime - startTime;
				console.log(`XML Linter for ${data.className} spent ${timeSpent}ms, target: ${data.timeLimit}`);
				assert.strictEqual(
					data.errors.length,
					errors.length,
					`"${data.className}" class should have ${data.errors.length} errors, but got ${errors.length}`
				);
				assert.ok(
					timeSpent < data.timeLimit,
					`"${data.className}" linters should run less than ${data.timeLimit}ms, but it ran ${timeSpent} ms`
				);

				data.errors.forEach(dataError => {
					const errorInDocument = errors.find(error => error.message === dataError.text);
					assert.ok(
						!!errorInDocument,
						`"${data.className}" class should have ${dataError.text} error, but it doesn't`
					);
				});
			}
		}
	});

	test("XML Fragment Linter working properly", async () => {
		const testData = data.FragmentLinter;

		for (const data of testData) {
			const parser = <UI5JSParser>ParserPool.getParserForCustomClass(data.className);
			const filePath = parser.fileReader.convertClassNameToFSPath(data.className, false, true);
			if (filePath) {
				const document = await vscode.workspace.openTextDocument(filePath);
				const errors = new XMLLinterErrorFactory(parser).getLintingErrors(new TextDocumentAdapter(document));
				assert.strictEqual(
					data.errors.length,
					errors.length,
					`"${data.className}" class should have ${data.errors.length} errors, but got ${errors.length}`
				);

				data.errors.forEach(dataError => {
					const errorInDocument = errors.find(error => error.message === dataError.text);
					assert.ok(
						!!errorInDocument,
						`"${data.className}" class should have ${dataError.text} error, but it doesn't`
					);
				});
			}
		}
	});

	test("All event handlers are found", async () => {
		const testData = data.EventHandlers;

		for (const data of testData) {
			const parser = <UI5JSParser>ParserPool.getParserForCustomClass(data.className);
			const fieldsAndMethods = parser.classFactory.getFieldsAndMethodsForClass(data.className);
			data.eventHandlers.forEach(eventHandlerName => {
				const eventHandlerMethod: any = fieldsAndMethods.methods.find((method: any) => {
					return method.name === eventHandlerName;
				});
				assert.ok(
					!!eventHandlerMethod.isEventHandler,
					`"${data.className}" class should have "${eventHandlerName}" method recognized as event handler, but it doesn't`
				);
			});
		}
	});

	test("JS Rename Handler working properly", async () => {
		const testData = data.RenameProvider;

		for (const data of testData) {
			const parser = <UI5JSParser>ParserPool.getParserForCustomClass(data.className);
			const UIClass = <CustomJSClass>parser.classFactory.getUIClass(data.className);
			const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(parser.syntaxAnalyser, parser);

			const filePath = parser.fileReader.getClassFSPathFromClassName(data.className);
			if (filePath) {
				const uri = vscode.Uri.file(filePath);
				const document = await vscode.workspace.openTextDocument(uri);
				const method = UIClass.methods.find(method => method.name === data.methodName);
				if (method && method.position) {
					const position = document.positionAt(method.position);
					const newMethodName = `${data.methodName}New`;
					const workspaceEdits = await new JSRenameProvider(parser).provideRenameEdits(
						document,
						position,
						newMethodName
					);

					const entries = workspaceEdits?.entries();
					if (entries) {
						const textEditQuantity = entries.reduce((accumulator, entry) => {
							accumulator += entry[1].length;

							return accumulator;
						}, 0);
						const expectedEditQuantity = data.renames.methods.length + data.renames.XMLDocEdits.length + 1; //1 - edit of method in main class itself
						assert.strictEqual(
							textEditQuantity,
							expectedEditQuantity,
							`Expected ${expectedEditQuantity} edits, but got ${textEditQuantity} for "${data.className}" -> "${data.methodName}"`
						);

						if (workspaceEdits) {
							assertEntry(entries, uri, method.node.start, method.node.end);
						}

						for (const methodRename of data.renames.methods) {
							const filePath = parser.fileReader.getClassFSPathFromClassName(methodRename.className);
							const uri = filePath && vscode.Uri.file(filePath);
							if (uri) {
								const UIClass = <CustomJSClass>parser.classFactory.getUIClass(methodRename.className);
								const containerMethod = UIClass.methods.find(
									method => method.name === methodRename.containerMethod
								);
								const allNodes = parser.syntaxAnalyser.expandAllContent(containerMethod?.node);
								const allNodesWithCurrentMethod = allNodes.filter(
									(node: any) =>
										node.type === "MemberExpression" && node.property?.name === data.methodName
								);
								const allNodesFromCurrentClass = allNodesWithCurrentMethod.filter((node: any) => {
									const ownerClassName = strategy.acornGetClassName(
										methodRename.className,
										node.end,
										true
									);
									return ownerClassName === data.className;
								});

								assert.ok(
									allNodesFromCurrentClass.length > 0,
									`Nodes with "${data.methodName}" method in "${methodRename.className}" class "${methodRename.containerMethod}" method not found`
								);

								for (const node of allNodesFromCurrentClass) {
									await assertEntry(entries, uri, node.property.start, node.property.end);
								}
							}
						}

						for (const XMLDocEdit of data.renames.XMLDocEdits) {
							const filePath = parser.fileReader.convertClassNameToFSPath(
								XMLDocEdit.className,
								false,
								XMLDocEdit.type === "fragment",
								XMLDocEdit.type === "view"
							);
							if (filePath) {
								const xmlParser = new XMLParser(parser);
								const uri = vscode.Uri.file(filePath);
								const viewOrFragment =
									XMLDocEdit.type === "fragment"
										? parser.fileReader
											.getAllFragments()
											.find(fragment => fragment.fsPath === filePath)
										: parser.fileReader.getAllViews().find(view => view.fsPath === filePath);
								if (viewOrFragment) {
									const tagsAndAttributes = xmlParser.getXMLFunctionCallTagsAndAttributes(
										viewOrFragment,
										data.methodName
									);
									const tagAndAttribute = tagsAndAttributes.find(tagAndAttribute => {
										return (
											xmlParser.getClassNameFromTag(tagAndAttribute.tag.text) ===
											XMLDocEdit.tagClassName
										);
									});
									if (tagAndAttribute) {
										const attribute = tagAndAttribute.attributes.find(attribute => {
											return (
												xmlParser.getAttributeNameAndValue(attribute).attributeName ===
												XMLDocEdit.attribute
											);
										});
										if (attribute) {
											const { attributeValue } = xmlParser.getAttributeNameAndValue(attribute);
											const positionOfAttribute =
												tagAndAttribute.tag.positionBegin +
												tagAndAttribute.tag.text.indexOf(attribute);
											const positionOfValueBegin =
												positionOfAttribute + attribute.indexOf(attributeValue);
											const positionOfValueEnd = positionOfValueBegin + attributeValue.length;

											assertEntry(entries, uri, positionOfValueBegin, positionOfValueEnd);
										}
									}
								}
							}
						}
					}
					assert.ok(
						!!entries,
						`No workspace edit entries found. Class "${data.className}", method: "${data.methodName}"`
					);
				}
			}
		}
	});

	test("View ID Completion items generated successfully", async () => {
		const testData = CompletionItemsData.ViewId;

		for (const data of testData) {
			const parser = <UI5JSParser>ParserPool.getParserForCustomClass(data.className);
			const factory = new ViewIdCompletionItemFactory(parser);
			const filePath = parser.fileReader.getClassFSPathFromClassName(data.className);
			if (filePath) {
				const document = await vscode.workspace.openTextDocument(filePath);
				const offset = document.getText().indexOf(data.textToFind) + data.textToFind.length;
				const position = document.positionAt(offset);
				const completionItems = await factory.createCompletionItems(document, position);

				const completionItemInsertTexts = completionItems.map(
					(item: any) => item.insertText?.value || item.insertText
				);
				compareArrays(completionItemInsertTexts, data.items, data.className);
				assert.strictEqual(
					completionItems.length,
					data.items.length,
					`"${data.className}" at offset ${offset} expected to have ${data.items.length} completion items, but got ${completionItems.length}`
				);
			}
		}
	});

	test("JS Dynamic Completion items generated successfully", async () => {
		const testData = CompletionItemsData.JSDynamicCompletionItems;

		for (const data of testData) {
			const parser = <UI5JSParser>ParserPool.getParserForCustomClass(data.className);
			const factory = new JSDynamicCompletionItemsFactory(parser);
			const filePath = parser.fileReader.getClassFSPathFromClassName(data.className);
			if (filePath) {
				const document = await vscode.workspace.openTextDocument(filePath);
				const offset = document.getText().indexOf(data.textToFind) + data.textToFind.length;
				const position = document.positionAt(offset);
				const completionItems = await factory.createCompletionItems(document, position);

				const completionItemInsertTexts = completionItems.map(
					(item: any) => item.insertText?.value || item.insertText
				);
				compareArrays(completionItemInsertTexts, data.items, data.className);

				assert.strictEqual(
					completionItems.length,
					data.items.length,
					`"${data.className}" at offset ${offset} expected to have ${data.items.length} completion items, but got ${completionItems.length}. Search term "${data.textToFind}"`
				);
			}
		}
	});

	test("JS UI Define Completion items generated successfully", async () => {
		const testData = CompletionItemsData.UIDefine;

		for (const data of testData) {
			const parser = <UI5JSParser>ParserPool.getParserForCustomClass(data.className);
			const factory = new SAPUIDefineFactory(parser);
			const filePath = parser.fileReader.getClassFSPathFromClassName(data.className);
			if (filePath) {
				const completionItems = await factory.generateUIDefineCompletionItems();

				const completionItemInsertTexts = completionItems.map(
					(item: any) => item.insertText?.value || item.insertText
				);
				compareArrays(completionItemInsertTexts, data.items, data.className);
			}
		}
	});

	test("XML attribute Completion items generated successfully", async () => {
		const testData = XMLCompletionItemData.attributes;

		for (const data of testData) {
			const parser = <UI5JSParser>ParserPool.getParserForCustomClass(data.className);
			const factory = new XMLDynamicCompletionItemFactory(parser);
			const filePath = parser.fileReader.getClassFSPathFromClassName(data.className);
			if (filePath) {
				const document = await vscode.workspace.openTextDocument(filePath);
				const offset = document.getText().indexOf(data.searchText) + data.searchText.length;
				const position = document.positionAt(offset);
				const completionItems = await factory.createCompletionItems(document, position);

				const completionItemInsertTexts = completionItems.map(
					(item: any) => item.insertText?.value || item.insertText || item.label
				);
				compareArrays(completionItemInsertTexts, data.items, data.className);
			}
		}
	});

	test("XML attribute values Completion items generated successfully", async () => {
		const testData = XMLCompletionItemData.attributeValues;

		for (const data of testData) {
			const parser = <UI5JSParser>ParserPool.getParserForCustomClass(data.className);
			const factory = new XMLDynamicCompletionItemFactory(parser);
			const filePath = parser.fileReader.getClassFSPathFromClassName(data.className);
			if (filePath) {
				const document = await vscode.workspace.openTextDocument(filePath);
				const offset = document.getText().indexOf(data.searchText) + data.searchText.length;
				const position = document.positionAt(offset);
				const completionItems = await factory.createCompletionItems(document, position);

				const completionItemInsertTexts = completionItems.map(
					(item: any) => item.insertText?.value || item.insertText || item.label
				);
				compareArrays(completionItemInsertTexts, data.items, data.className);
			}
		}
	});

	test("XML aggregation Completion items generated successfully", async () => {
		const testData = XMLCompletionItemData.tags.aggregations;

		for (const data of testData) {
			const parser = <UI5JSParser>ParserPool.getParserForCustomClass(data.className);
			const factory = new XMLDynamicCompletionItemFactory(parser);
			const filePath = parser.fileReader.getClassFSPathFromClassName(data.className);
			if (filePath) {
				const document = await vscode.workspace.openTextDocument(filePath);
				const offset = document.getText().indexOf(data.searchText) + data.searchText.length;
				const position = document.positionAt(offset);
				const completionItems = await factory.createCompletionItems(document, position);

				const completionItemInsertTexts = completionItems.map(
					(item: any) => item.insertText?.value || item.insertText || item.label
				);
				compareArrays(completionItemInsertTexts, data.items, data.className);
			}
		}
	});

	test("XML class Completion items generated successfully", async () => {
		const testData = XMLCompletionItemData.tags.classTags;

		for (const data of testData) {
			const parser = <UI5JSParser>ParserPool.getParserForCustomClass(data.className);
			const factory = new XMLDynamicCompletionItemFactory(parser);
			const filePath = parser.fileReader.getClassFSPathFromClassName(data.className);
			if (filePath) {
				const document = await vscode.workspace.openTextDocument(filePath);
				const offset = document.getText().indexOf(data.searchText) + data.searchText.length;
				const position = document.positionAt(offset);
				const completionItems = await factory.createCompletionItems(document, position);

				const completionItemInsertTexts = completionItems.map(
					(item: any) => item.insertText?.value || item.insertText || item.label
				);
				compareArrays(completionItemInsertTexts, data.items, data.className);
			}
		}
	});

	test("Folder rename working as expected", async () => {
		const testData = renameData.folderRenames;

		for (const data of testData) {
			const parser = <UI5JSParser>ParserPool.getParserForCustomClass(data.uriFrom);
			const fileWatcherMediator = parser.getCustomData<FileWatcherMediator>("FileWatcherMediator");
			const pathFrom = parser.fileReader.convertClassNameToFSPath(data.uriFrom, false, false, false, true);
			const pathTo = parser.fileReader.convertClassNameToFSPath(data.uriTo, false, false, false, true);
			if (pathFrom && pathTo) {
				const uriFrom = vscode.Uri.file(pathFrom);
				const uriTo = vscode.Uri.file(pathTo);
				const fileChanges = fileWatcherMediator?.getFileChangeData() || [];
				new FileRenameMediator(parser).handleFolderRename(uriFrom, uriTo, fileChanges);
				const changedFiles = fileChanges.filter(fileChange => fileChange.changed);

				assert.strictEqual(
					changedFiles.length,
					data.result.length,
					`Renaming from "${data.uriFrom}" to "${data.uriTo}" returned ${changedFiles.length} results, but expected ${data.result.length}`
				);
				changedFiles.forEach(changedFile => {
					const resultWithSameContent = data.result.find(
						result =>
							result.fileData.content.replace(/(\r|\n|\t)/g, "") ===
							changedFile.fileData.content.replace(/(\r|\n|\t)/g, "")
					);
					assert.ok(
						!!resultWithSameContent,
						`File "${changedFile.fileData.fsPath}" was not found in the renaming result`
					);
					assert.strictEqual(
						changedFile.renames.length,
						resultWithSameContent.renames.length,
						`File "${changedFile.fileData.fsPath}" must have ${resultWithSameContent.renames.length} renames, but got ${changedFile.renames.length}`
					);
				});
			}
		}
	});

	test("XML Formatter is working as expected", async () => {
		const testData = XMLFormatterData.formatterData;

		for (const data of testData) {
			const parser = <UI5JSParser>ParserPool.getParserForCustomClass(data.className);
			const fsPath = parser.fileReader.convertClassNameToFSPath(data.className, false, false, true);
			if (fsPath) {
				const uri = vscode.Uri.file(fsPath);
				const document = await vscode.workspace.openTextDocument(uri);
				const textEdits = new XMLFormatter(parser).formatDocument(document);
				assert.strictEqual(
					textEdits[0].newText.replaceAll("\r", ""),
					data.formattedText.replaceAll("\r", ""),
					`XML Formatter for "${data.className}" should have formatted to "${data.formattedText}", but result was "${textEdits[0].newText}"`
				);
			}
		}
	});

	test("JS CodeLens is working as expected", async () => {
		const testData = CodeLensData.jsCodeLenses;

		for (const data of testData) {
			const parser = <UI5JSParser>ParserPool.getParserForCustomClass(data.className);
			const fsPath = parser.fileReader.getClassFSPathFromClassName(data.className);
			if (fsPath) {
				const uri = vscode.Uri.file(fsPath);
				const document = await vscode.workspace.openTextDocument(uri);
				const codeLens = await new JSCodeLensProvider(parser).getCodeLenses(document);
				const actualCodeLens = codeLens.map(codeLens => codeLens.command?.title || "");
				compareStringArrays(actualCodeLens, data.result, `JS Code Lens for class "${data.className}"`);
			}
		}
	});
});

function compareStringArrays(actualArray: string[], expectedArray: string[], assertText: string) {
	expectedArray.forEach((expectedValue, index) => {
		assert.strictEqual(
			actualArray[index],
			expectedValue,
			`${assertText}, expected: "${expectedValue}", but got "${actualArray[index]}"`
		);
	});
}

async function assertEntry(
	entries: [vscode.Uri, vscode.TextEdit[]][],
	uri: vscode.Uri,
	offsetBegin: number,
	offsetEnd: number
) {
	let necessaryEntry: [vscode.Uri, vscode.TextEdit[]] | undefined;
	for (const entry of entries) {
		const entryUri = entry[0];
		if (uri.fsPath === uri.fsPath) {
			const document = await vscode.workspace.openTextDocument(entryUri);
			const textEdits = entry[1];
			for (const textEdit of textEdits) {
				const startOffset = document.offsetAt(textEdit.range.start);
				const endOffset = document.offsetAt(textEdit.range.end);
				if (offsetBegin === startOffset && offsetEnd === endOffset) {
					necessaryEntry = entry;
					break;
				}
			}
			if (necessaryEntry) {
				break;
			}
		}
	}

	assert.ok(!!necessaryEntry, `Workspace edit for "${uri.fsPath}" position ${offsetBegin}-${offsetEnd} not found`);

	return !!necessaryEntry;
}

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

function compareArrays(
	completionItemInsertTexts: (string | vscode.SnippetString | undefined)[],
	items: string[],
	className: string
) {
	completionItemInsertTexts.forEach(insertText => {
		const stringToInsert =
			typeof insertText === "string"
				? insertText
				: insertText instanceof vscode.SnippetString
					? insertText.value
					: undefined;
		const item = items.find(item => item === stringToInsert);
		assert.ok(
			!!item,
			`Class: "${className}", "${stringToInsert}" wasn't found in "${JSON.stringify(
				items.slice(0, 10)
			)}"... array`
		);
	});
}
