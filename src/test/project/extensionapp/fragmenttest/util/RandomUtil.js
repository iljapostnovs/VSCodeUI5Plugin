sap.ui.define([
	"sap/ui/base/ManagedObject"
], function(
	ManagedObject
) {
	"use strict";

	return ManagedObject.extend("com.extend.fragmenttest.util.RandomUtil", {
		formatValueExtensionFragment1() {},
		formatGlobal() {
			this.formatGlobal();
		}
	});
});