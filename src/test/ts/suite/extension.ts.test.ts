import assert = require("assert");
import { after, test } from "mocha";
import { AbstractUI5Parser, UI5TSParser } from "ui5plugin-parser";
import { ICustomClassField, ICustomClassMethod } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractCustomClass";
import { CustomTSClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomTSClass";
import { CustomTSObject } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomTSObject";
import * as vscode from "vscode";
import * as ClassParsing from "./data/parser/ClassParsing.json";
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

	test("Parser: class parsing", () => {
		const testData = ClassParsing.classParsing;

		testData.forEach(testData => {
			const parser = AbstractUI5Parser.getInstance(UI5TSParser);
			const UIClass = parser.classFactory.getUIClass(testData.className);
			const TSClass = testData.type === "TSClass" ? CustomTSClass : CustomTSObject;
			assert.ok(UIClass instanceof TSClass, `Class "${testData.className}" is not recognized as Custom Class`);

			UIClass.loadTypes();
			assert.equal(UIClass.methods.length, testData.methods.length, `Class "${UIClass.className}" has wrong method quantity`);
			assert.equal(UIClass.fields.length, testData.fields.length, `Class "${UIClass.className}" has wrong field quantity`);
			testData.methods.forEach(methodData => {
				testMethod(UIClass, methodData);
			});
			testData.fields.forEach(fieldData => {
				testField(UIClass, fieldData);
			});
		});
	});
});

function testField(
	UIClass: CustomTSClass | CustomTSObject,
	fieldData: {
		name: string;
		type: string;
		visibility: string;
	}
) {
	const fields: ICustomClassField[] = UIClass.fields;
	const field = fields.find(field => field.name === fieldData.name);
	assert.ok(!!field, `Field "${fieldData.name}" not found`);

	assert.equal(field.visibility, fieldData.visibility, `Field "${fieldData.name}" has wrong visibility`);
	assert.equal(field.type, fieldData.type, `Field "${fieldData.type}" has wrong type`);
}

function testMethod(
	UIClass: CustomTSClass | CustomTSObject,
	methodData: { name: string; returnType: string; visibility: string; params: { name: string; type: string }[] }
) {
	const method = UIClass.methods.find(method => method.name === methodData.name);
	assert.ok(!!method, `Method "${methodData.name}" not found`);

	assert.equal(method.visibility, methodData.visibility, `Method "${methodData.name}" has wrong visibility`);
	assert.equal(method.returnType, methodData.returnType, `Method "${methodData.name}" has wrong return type`);

	assert.equal(
		method.params.length,
		methodData.params.length,
		`Method "${methodData.name}" has wrong param quantity`
	);

	testMethodParam(methodData, method);
}

function testMethodParam(
	methodData: { name: string; returnType: string; visibility: string; params: { name: string; type: string }[] },
	method: ICustomClassMethod
) {
	methodData.params.forEach(paramData => {
		const param = method.params.find(param => param.name === paramData.name);
		assert.ok(!!param, `Parameter "${paramData.name}" not found`);

		assert.equal(param.type, paramData.type, `Parameter "${paramData.name}" has wrong type`);
	});
}
