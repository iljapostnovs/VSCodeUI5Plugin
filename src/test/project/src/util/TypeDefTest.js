sap.ui.define([
	"sap/ui/base/ManagedObject"
], function(
	ManagedObject
) {
	"use strict";

	return ManagedObject.extend("com.test.util.TypeDefTest", {
		/**@ui5ignore */
		myCustomMethod() {
			/** @type {MyCustomType} */
			const mMyCustomTypeVariable;
			mMyCustomTypeVariable.Field2.customMethod();
			mMyCustomTypeVariable.Field1.toLowerCase();
		}
	});
});
/**
 * @typedef MyCustomType
 * @property {string} Field1
 * @property {com.test.util.CustomClass} Field2
 */