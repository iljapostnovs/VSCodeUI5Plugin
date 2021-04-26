sap.ui.define([
	"sap/ui/base/ManagedObject"
], function(
	ManagedObject
) {
	"use strict";

	return ManagedObject.extend("com.test.util.AccessLevelModifierTest", {
		init: function() {
			this._privateMethod();
			this._protectedMethod();
		},

		/**
		 * @private
		 */
		_privateMethod: function() {

		},

		/**
		 * @protected
		 */
		_protectedMethod: function() {

		},

		publicMethod: function() {

		}
	});
});