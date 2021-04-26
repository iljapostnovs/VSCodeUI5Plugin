sap.ui.define([
	"sap/ui/base/ManagedObject"
], function(
	ManagedObject
) {
	"use strict";

	return ManagedObject.extend("com.test.memberrename.classes.MyCustomClass", {
		myField1: 123,

		myCustomMethod: function() {
			this.myField2 = "asd";
		}
	});
});