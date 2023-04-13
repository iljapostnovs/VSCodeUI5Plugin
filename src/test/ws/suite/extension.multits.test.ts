import assert = require("assert");
import { after, test } from "mocha";
import { ParserPool } from "ui5plugin-parser";
import * as vscode from "vscode";
import * as TestData from "./data/multits/TestData.json";
// import * as os from "os";

suite("Extension Test Suite", () => {
	after(() => {
		vscode.window.showInformationMessage("All tests done!");
	});

	test("Extension launched", async () => {
		const extension = vscode.extensions.getExtension("iljapostnovs.ui5plugin");
		await extension?.activate();

		assert.ok(extension?.isActive, "Extension activated");
	}).timeout(30000);

	test("Workspace: parsers initialized", () => {
		const parsers = ParserPool.getAllParsers();

		assert.equal(parsers.length, TestData.parserQuantity, "Parser quantity is incorrect");
	});

	test("Workspace: classes initialized", () => {
		const UIClasses = ParserPool.getAllCustomUIClasses();
		const classNames = UIClasses.map(UIClass => UIClass.className).sort();
		const testDataClassNames = TestData.classes.sort();

		assert.deepEqual(classNames, testDataClassNames, "Not all classes initialized");
	});

	test("Workspace: views initialized", () => {
		const views = ParserPool.getAllViews();
		const viewNames = views.map(view => view.name).sort();
		const testDataViewNames = TestData.views.sort();

		assert.deepEqual(viewNames, testDataViewNames, "Not all views initialized");
	});

	test("Workspace: fragments initialized", () => {
		const fragments = ParserPool.getAllFragments();
		const fragmentNames = fragments.map(fragment => fragment.name).sort();
		const testDatafragmentNames = TestData.fragments.sort();

		assert.deepEqual(fragmentNames, testDatafragmentNames, "Not all fragments initialized");
	});
});
