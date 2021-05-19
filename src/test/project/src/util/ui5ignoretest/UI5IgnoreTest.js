sap.ui.define([
	"sap/ui/base/ManagedObject",
	"com/test/util/ui5ignoretest/UI5IgnoreTestClass"
], function(
	ManagedObject,
	UI5IgnoreTestClass
) {
	"use strict";

	return ManagedObject.extend("com.test.util.ui5ignoretest.UI5IgnoreTest", {
		init: function() {
			const oUI5Ignore = new UI5IgnoreTestClass();
			oUI5Ignore._privateMethod(123);
			oUI5Ignore._protectedMethod(123, 123);
			oUI5Ignore.publicMethod(123);
		},

		/**
		 * @ui5ignore
		 */
		test: function() {

		}
	});
});