sap.ui.define([
], function(
) {

	"use strict";


	/**
	 * @namespace
	 * @alias com.test.library
	 */
	sap.ui.getCore().initLibrary({
		name: "com.test.library",
		dependencies: ["sap.ui.core", "sap.m"],
		types: [
		],
		interfaces: [
		],
		controls: [
		],
		elements: [
		],
		version: "1.60.10"
	});

	let sPath = sap.ui.require.toUrl("com/test/library");

	return com.test.library;

});