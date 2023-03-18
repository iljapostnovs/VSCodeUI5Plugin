import assert = require("assert");
import { after, test } from "mocha";
import { UnusedMemberLinter } from "ui5plugin-linter/dist/classes/js/parts/UnusedMemberLinter";
import { TSReferenceFinder } from "ui5plugin-linter/dist/classes/js/parts/util/TSReferenceFinder";
import { ParserPool, TextDocument, UI5TSParser } from "ui5plugin-parser";
import {
	ICustomClassField,
	ICustomClassMethod
} from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractCustomClass";
import { CustomTSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/ts/CustomTSClass";
import { CustomTSObject } from "ui5plugin-parser/dist/classes/parsing/ui5class/ts/CustomTSObject";
import * as vscode from "vscode";
import { VSCodeLinterConfigHandler } from "../../../classes/ui5linter/config/VSCodeLinterConfigHandler";
import * as JSLinterData from "./data/linter/JSLinterData.json";
import * as ClassParsing from "./data/parser/ClassParsing.json";
import * as References from "./data/reference/References.json";
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
			const parser = <UI5TSParser>ParserPool.getParserForCustomClass(testData.className);
			const UIClass = parser.classFactory.getUIClass(testData.className);
			const TSClass = testData.type === "TSClass" ? CustomTSClass : CustomTSObject;
			assert.ok(UIClass instanceof TSClass, `Class "${testData.className}" is not recognized as Custom Class`);

			UIClass.loadTypes();
			assert.equal(
				UIClass.methods.length,
				testData.methods.length,
				`Class "${UIClass.className}" has wrong method quantity`
			);
			assert.equal(
				UIClass.fields.length,
				testData.fields.length,
				`Class "${UIClass.className}" has wrong field quantity`
			);
			testData.methods.forEach(methodData => {
				testMethod(UIClass, methodData);
			});
			testData.fields.forEach(fieldData => {
				testField(UIClass, fieldData);
			});
		});
	});

	test("Linter: TS Linters, Unused Member Linter", async () => {
		const allTestData = JSLinterData.data;

		for (const testData of allTestData) {
			const parser = <UI5TSParser>ParserPool.getParserForCustomClass(testData.className);
			const UIClass = parser.classFactory.getUIClass(testData.className);
			if (parser.classFactory.isCustomClass(UIClass)) {
				const document = await vscode.workspace.openTextDocument(UIClass.fsPath);

				const linter = new UnusedMemberLinter(parser, new VSCodeLinterConfigHandler(parser));
				const errors = linter.getLintingErrors(new TextDocument(document.getText(), document.uri.fsPath));
				const errorMessages = errors.map(error => error.message);
				// copy(JSON.stringify(errorMessages))
				assert.deepEqual(
					errorMessages,
					testData.UnusedMemberLinter,
					`Class "${UIClass.className}" has wrong error messages for UnusedMemberLinter`
				);
			}
		}
	});

	test("References: TS references", () => {
		const allTestData = References.data;

		for (const testData of allTestData) {
			const parser = <UI5TSParser>ParserPool.getParserForCustomClass(testData.className);
			const UIClass = parser.classFactory.getUIClass(testData.className);
			if (parser.classFactory.isCustomClass(UIClass)) {
				const members = [...UIClass.fields, ...UIClass.methods];

				const referenceFinder = new TSReferenceFinder(parser);
				testData.References.forEach(referenceData => {
					const member = members.find(member => member.name === referenceData.member);
					if (member) {
						const locations = referenceFinder.getReferenceLocations(member);
						assert.equal(
							locations.length,
							referenceData.quantity,
							`Class "${UIClass.className}" member "${referenceData.member}" has wrong reference quantity`
						);
					} else {
						assert.ok(
							false,
							`Class "${UIClass.className}" doesn't have "${referenceData.member}" member. (Reference finder)`
						);
					}
				});
			}
		}
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
