sap.ui.define([
	"sap/ui/base/ManagedObject"
], function(
	ManagedObject
) {
	"use strict";

	const MyCustomClass = ManagedObject.extend("com.test.memberrename.classes.MyCustomClass", {
		myField2: 123,

		myCustomMethod: function() {
			this.myField3 = "asd";
			this._myPrivateField = 123;
			this._myPrivateMethod();
		},

		_myPrivateMethod: function() {

		}
	});

	MyCustomClass.prototype.myInstanceMethod = function() {

	};

	MyCustomClass.myStaticMethod = function() {

	};

	MyCustomClass.myStaticField = 123;
	MyCustomClass.prototype.myInstanceField = 123;

	return MyCustomClass;
});