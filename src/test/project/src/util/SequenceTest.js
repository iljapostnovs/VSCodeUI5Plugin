sap.ui.define([
	"sap/ui/base/ManagedObject"
], function(
	ManagedObject
) {
	"use strict";

	return ManagedObject.extend("com.test.util.SequenceTest", {
		init: function() {
			this._testSequence1();
		},

		_testSequence1: function() {
			return this._testSequence2();
		},

		_testSequence2: async function() {
			return [];
		}
	});
});