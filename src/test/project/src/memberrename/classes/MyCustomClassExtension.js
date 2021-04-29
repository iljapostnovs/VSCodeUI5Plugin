sap.ui.define([
	"com/test/memberrename/classes/MyCustomClass"
], function(
	MyCustomClass
) {
	"use strict";

	return MyCustomClass.extend("com.test.memberrename.classes.MyCustomClassExtension", {
		/**
		 * @override
		 */
		myCustomMethod: function() {
			this._myPrivateField = "asd";
			MyCustomClass.prototype.myCustomMethod.apply(this, arguments);
		},

		_myPrivateMethod: function() {

		},

		anotherCustomMethod: function() {

		}
	});
});