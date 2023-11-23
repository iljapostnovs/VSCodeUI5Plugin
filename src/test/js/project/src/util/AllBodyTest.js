sap.ui.define([
	"sap/ui/base/ManagedObject"
], function(
	ManagedObject
) {
	"use strict";

	const AllBodyTest = ManagedObject.extend("com.test.util.AllBodyTest", {
		_test() {
			this._test();
			AllBodyTest.staticTest();
		}
	});

	AllBodyTest.staticTest = function() {
		AllBodyTest.staticTest();
	};

	return AllBodyTest;
});