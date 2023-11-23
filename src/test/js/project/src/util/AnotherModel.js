sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"com/test/util/AllBodyTest"
], function(
	JSONModel,
	AllBodyTest
) {
	"use strict";

	return JSONModel.extend("com.test.util.AnotherModel", {
		anotherMethod: function() {
			AllBodyTest.staticTest();
		}
	});
});