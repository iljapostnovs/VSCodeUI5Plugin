sap.ui.define([
	"sap/ui/base/ManagedObject"
], function(
	ManagedObject
) {
	"use strict";

	return ManagedObject.extend("com.test.controller.WrongFilePathLinterTest", {
		init: function() {
			"com.test.controller.wrong.Path"; //wrong
			"com.test.controller.WrongFilePathLinterTest"; //correct
			"com.test.fragments.FragmentTemplate"; //correct
			"com.test.fragments.WrongFragmentTemplate"; //wrong
			"com.test.view.LinterTest" //correct
			"com.test.view.WrongLinterTest" //wrong
			"com.test.util.Formatter" //correct
			"com.test.util.WrongFormatter" //wrong
		}
	});
});