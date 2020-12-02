import assert = require("assert");
import { after, describe, it, test } from "mocha";
import * as path from "path";
import * as fs from "fs";
// You can import and use all API from the "vscode" module
// as well as import your extension to test it
import * as vscode from "vscode";
import { AcornSyntaxAnalyzer } from "../../classes/UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { UIClassFactory } from "../../classes/UI5Classes/UIClassFactory";
import * as data from "./data/TestData.json";
import { CustomUIClass } from "../../classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";

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
		const testData: any[] = data.data;
		testData.forEach((data: any) => {
			data.methods.forEach((testMethodData: any) => {
				const UIClass = UIClassFactory.getUIClass(data.className);
				const method = UIClass.methods.find(method => method.name === testMethodData.name);
				assert.strictEqual(method?.returnType, testMethodData.returnType, `${data.className} -> ${testMethodData.name} return type is "${method?.returnType}" but expected "${testMethodData.returnType}"`);
			});
		});
	});

	test("Field Types match", async () => {
		const testData: any[] = data.data;
		testData.forEach((data: any) => {
			data.fields.forEach((testFieldData: any) => {
				const UIClass = UIClassFactory.getUIClass(data.className);
				const field = UIClass.fields.find(method => method.name === testFieldData.name);
				assert.strictEqual(field?.type, testFieldData.type, `${data.className} -> ${testFieldData.name} return type is "${field?.type}" but expected "${testFieldData.type}"`);
			});
		});
	});

	test("Syntax Analyser finds correct types at positions", async () => {
		const testData: any[] = data.SyntaxAnalyser;
		testData.forEach((data: any) => {
			const UIClass = <CustomUIClass>UIClassFactory.getUIClass(data.className);
			const method = UIClass.acornMethodsAndFields.find(methodOrField => methodOrField.key?.name === data.methodName);
			const methodContent = AcornSyntaxAnalyzer.expandAllContent(method.value.body);
			const searchedNode = methodContent.find(node => {
				return compareProperties(data.node, node);
			});

			const position = searchedNode.property.start + data.positionAddition;
			const classNameAtPosition = AcornSyntaxAnalyzer.acornGetClassName(data.className, position);
			assert.strictEqual(data.type, classNameAtPosition, `${data.className} position ${position} type is ${classNameAtPosition} but expected ${data.type}`);
		});
	});
});

function compareProperties(node1: any, node2: any) : boolean {
	let allInnerNodesExists = true;
	for (const i in node1) {
		if (node2[i]) {
			if (typeof node2[i] === "object") {
				allInnerNodesExists = compareProperties(node1[i], node2[i]);
			} else {
				allInnerNodesExists = allInnerNodesExists && node1[i] === node2[i];
			}
		} else {
			allInnerNodesExists = false;
		}

	}

	return allInnerNodesExists;
}