sap.ui.define([
	"sap/ui/base/ManagedObject",
	"com/test/fragmenttest/util/Formatter"
], function(
	ManagedObject,
	Formatter
) {
	"use strict";

	const oFormatter = new Formatter();
	return ManagedObject.extend("com.test.util.IfLinterTest", {
		metadata: {

		},
		test: function() {
			oFormatter.declarationAboveClass();
			if (this.dummyField) {

			} else if (this.secondDummyField) {

			}
		}
	});
});