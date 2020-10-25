import assert = require("assert");
import { after, describe, it, test } from "mocha";
import * as path from "path";
import * as fs from "fs";
// You can import and use all API from the "vscode" module
// as well as import your extension to test it
import * as vscode from "vscode";
import { SyntaxAnalyzer } from "../../classes/CustomLibMetadata/SyntaxAnalyzer";
import { UIClassFactory } from "../../classes/CustomLibMetadata/UI5Parser/UIClass/UIClassFactory";
import * as data from "./data/TestData.json";

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
			const className = SyntaxAnalyzer.acornGetClassName(data.className, data.position);
			assert.strictEqual(data.type, className, `${data.className} position ${data.position} type is ${className} but expected ${data.type}`);
		});
	});
});
