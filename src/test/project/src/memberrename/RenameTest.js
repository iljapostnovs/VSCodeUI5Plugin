sap.ui.define([
	"sap/ui/base/ManagedObject",
	"com/test/memberrename/classes/MyCustomClass",
	"com/test/memberrename/classes/MyCustomClassExtension"
], function(
	ManagedObject,
	MyCustomClass,
	MyCustomClassExtension
) {
	"use strict";

	return ManagedObject.extend("com.test.memberrename.RenameTest", {
		init: function() {
			const oMyCustomClass = new MyCustomClass();
			const oMyCustomClassExtension = new MyCustomClassExtension();

			oMyCustomClass.myCustomMethod();
			oMyCustomClass.myField2 = "123";
			oMyCustomClass.myField3 = 123;

			oMyCustomClass.myInstanceMethod();
			oMyCustomClass.myStaticMethod();
			oMyCustomClass.myStaticField;
			oMyCustomClass.myInstanceField;

			oMyCustomClassExtension.myCustomMethod();
			oMyCustomClassExtension.anotherCustomMethod();
		}
	});
});