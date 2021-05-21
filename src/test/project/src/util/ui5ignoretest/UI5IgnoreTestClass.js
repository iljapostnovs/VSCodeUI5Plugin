sap.ui.define([
	"sap/ui/base/ManagedObject"
], function(
	ManagedObject
) {
	"use strict";

	return ManagedObject.extend("com.test.util.ui5ignoretest.UI5IgnoreTestClass", {
		init: function() {
			this._privateMethod();
			this._protectedMethod();
		},

		/**
		 * @ui5ignore
		 * @private
		 */
		_privateMethod: function() {

		},

		/**
		 * @ui5ignore
		 * @protected
		 */
		_protectedMethod: function() {

		},

		/**
		 * @ui5ignore
		 */
		publicMethod: function() {

		}
	});
});