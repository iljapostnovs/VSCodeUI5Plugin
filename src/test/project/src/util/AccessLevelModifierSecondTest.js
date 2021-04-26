sap.ui.define([
	"sap/ui/base/ManagedObject",
	"com/test/util/AccessLevelModifierTest"
], function(
	ManagedObject,
	AccessLevelModifierTest
) {
	"use strict";

	return ManagedObject.extend("com.test.util.AccessLevelModifierSecondTest", {
		init: function() {
			const oAccessLevelModifierTest = new AccessLevelModifierTest();
			oAccessLevelModifierTest._privateMethod();
			oAccessLevelModifierTest._protectedMethod();
			oAccessLevelModifierTest.publicMethod();
		}
	});
});