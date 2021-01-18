import assert = require("assert");
import { after, test } from "mocha";
import * as vscode from "vscode";
import { AcornSyntaxAnalyzer } from "../../classes/UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { UIClassFactory } from "../../classes/UI5Classes/UIClassFactory";
import * as data from "./data/TestData.json";
import { CustomUIClass } from "../../classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../../classes/UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";

suite("Extension Test Suite", () => {
	after(() => {
		vscode.window.showInformationMessage("All tests done!");
	});

	test("Extension launched", async () => {
		const extension = vscode.extensions.getExtension("ui5.plugin");
		await extension?.activate();

		assert.ok(true, "Extension activated");
	});

	test("Method Types match", async () => {
		const testData = data.data;
		testData.forEach(data => {
			data.methods.forEach(testMethodData => {
				const UIClass = UIClassFactory.getUIClass(data.className);
				const method = UIClass.methods.find(method => method.name === testMethodData.name);
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
				const UIClass = UIClassFactory.getUIClass(data.className);
				const field = UIClass.fields.find(method => method.name === testFieldData.name);
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
			const classNameAtPosition = positionBeforeCurrentStrategy.acornGetClassName(data.className, position);
			assert.strictEqual(data.type, classNameAtPosition, `"${data.className}" position ${position} method "${data.methodName}" type is "${classNameAtPosition}" but expected "${data.type}"`);
		});
	});
});

function compareProperties(dataNode: any, node2: any) : boolean {
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