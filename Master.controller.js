sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageToast",
	"com/test/util/Formatter",
	"com/test/util/CustomClassExtend"
], function (
	Controller,
	MessageToast,
	Formatter,
	CustomClassExtend
	) {
	"use strict";
	const test = Controller.extend("com.test.controller.Master", {
		formatter: Formatter,
		/**
		 * @param {sap.m.MessageToast} test class
		 * @param {sap.m.Text} test2 class
		 */
		onShowHello: function (test, test2) {
		// read msg from i18n model
			this._test = new Formatter();
			if (3 > 9) {
				// this._test.
			} else if (3 < 0) {
				// this._test.
			} else {
				// this._test.
			}

			switch (this._test) {
				case "123":
					// this._test.
					break;

				case "234":
					// this._test.
					break;

				default:
					// this._test;
					break;
			}

			while (3 > 5) {
				this._test;
			}

			do {
				this._test;
			} while (3 > 5);
			for (let index = 0; index < array.length; index++) {
				this._test;
			}
			const oFormatter = new Formatter();
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var sRecipient = this.getView().getModel().getProperty("/recipient/name");
			this.getView().getModel().getProperty("/recipient/name");
			var sMsg = oBundle.getText("helloMsg", [sRecipient]);

			const oText = this.getView().byId("idText");
			const oTextTwo = oText;
			oTextTwo.text;

			// show message
			// MessageToast.show(sMsg);

			// this._test
			// this.formatter.
			this._customClassExtend = new CustomClassExtend();

			// this._customClassExtend._customField.getBinding().
			// this._customClassExtend.customMethod().
		},

		onOpenDialog : function () {
			this.getOwnerComponent().openHelloDialog();
			this._test2 = new Formatter();
			this._test123 = 123;

		}
	});

	return test;
});