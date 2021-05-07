sap.ui.define([
	"sap/ui/base/ManagedObject"
], function(
	ManagedObject
) {
	"use strict";

	return ManagedObject.extend("com.test.fragmenttest.util.Formatter", {
		formatValueViewMaster() { },
		formatValueViewFragment1() { },
		formatValueFragmentController1() { },
		formatValueExtensionFragmentParent() { },
		unusedFormatValue() { },
		formatGlobal() {
			this.formatGlobal();
		}
	});
});