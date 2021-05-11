sap.ui.define([
	"sap/ui/base/ManagedObject",
	"sap/m/Label"
], function(
	ManagedObject,
	Label
) {
	"use strict";

	return ManagedObject.extend("com.test.util.ObjectTest", {
		testMap: {
			asd: 123,
			test: new sap.m.Text()
		},

		init: function() {
			const mObject = {
				testField1: "string value",
				testField2: 123,
				testField3: {
					testField4: {
						testField5: new sap.m.Text(),
						testField6: new Label()
					}
				},
				testField7: true
			};

			this.testMap.asd;
			this.testMap.test.setBusy(true);
			this.returnTest().test.setBusy(true);
			mObject.testField3.testField4.testField6.setWidth("100%");
			this._test().setBusy(true);
			return mObject;
		},

		_test: function() {
			return this.testMap.test;
		},

		returnTest: function() {
			return {
				test: new Label(),
				asd: "asd"
			}
		}
	});
});