sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageToast",
	"com/test/util/Formatter",
	"com/test/util/CustomClassExtend",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/Dialog"
], function(
	Controller,
	MessageToast,
	Formatter,
	CustomClassExtend,
	Filter,
	FilterOperator,
	Dialog
) {
	"use strict";
	const test = Controller.extend("com.test.controller.Master", {
		_oPropertyTest: new Filter(),
		onInit: function() {
			this._oPropertyTest;
			const oModel = this.getView().getModel("TestModel");
			this.getView().setModel(oModel, "MyModel");
			this.getView().setModel(oModel);
			const oList = this.byId("idTable");
			oList.setBusy(true);
		},

		_testMyModel: function() {
			this.getView().getModel("MyModel").testMethod();
		},

		_testAnonymousModel: function() {
			this.getView().getModel().testMethod();
		},

		formatter: Formatter,
		/**
		 * @param {sap.m.MessageToast} test class
		 * @param {sap.m.MessageBox} test2 class
		 * @returns {sap.m.Dialog} instance
		 */
		onShowHello: function(test, test2) {
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
			/**
			 * test1
			 */

			while (3 > 5) {
				this._test;
			}

			/*test2*/
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

			// show message
			// MessageToast.show(sMsg);

			// this._test
			// this.formatter.
			this._customClassExtend = new CustomClassExtend();

			this._customClassExtend._customField.getBinding();
			this._customClassExtend.customMethod();
			// test2.

			this._oMessageBox = test2;
		},

		onOpenDialog: function() {
			this.getOwnerComponent().openHelloDialog();
			this._test2 = new Formatter();
			this._test123 = 123;


			const oText = this.getView().byId("idText");
			const oTextTwo = oText;
			this._oText = oTextTwo;

			return new Promise();

		},

		_getTable: function() {
			this._oTable = this.getView().byId("idTable");

			return this.byId("idTable");
		},

		_getArray: function() {
			return [];
		},

		_getString: function() {
			return "";
		},

		_getMap: function() {
			return {};
		},

		_testArrayMethods: function() {
			const aStringArray = this._getStringArray();
			const aFilterArray = this._mapToFilterArray(aStringArray);
			const aDialogArray = this._mapToDialogArray(aFilterArray);
			const aFilteredDialogArray = this._filterDialogArray(aDialogArray);
			const oDialog = this._findDialog(aFilteredDialogArray);
		},

		_mapToFilterArray: function(aStringArray) {
			const aFilterArray = aStringArray.map(sFilter => {
				return new Filter("test", FilterOperator.EQ, sFilter);
			});

			return aFilterArray;
		},

		/**
		 * @param {sap.ui.model.Filter[]} aFilterArray array
		 */
		_mapToDialogArray: function(aFilterArray) {
			const aDialogArray = aFilterArray.map(oFilter => {
				return new Dialog();
			});

			return aDialogArray;
		},

		/**
		 * @param {sap.m.Dialog[]} aDialogArray array
		 */
		_filterDialogArray: function(aDialogArray) {
			return aDialogArray.filter(oDialog => {
				return oDialog.getTitle() === "Hey";
			});
		},

		/**
		 * @param {sap.m.Dialog[]} aDialogArray array
		 */
		_findDialog: function(aDialogArray) {
			return aDialogArray.find(oDialog => oDialog.getTitle() === "Hey");
		},

		/**
		 * @param {sap.m.Dialog} oDialog dialog
		 */
		_getStringArray: function(oDialog) {
			return [oDialog.getTitle()];
		},

		_getMixedArrayMethodArray: function() {
			const aStrings = ["1", "2"];
			const aDialogs = aStrings
				.map(sString => {
					return new Dialog({
						title: sString
					});
				})
				.filter(oDialog => oDialog.getTitle())
				.find(oDialog => oDialog.getTitle());

			return [aDialogs];
		},

		onTableSelectionChange: function(oEvent) {
			const oListItem = oEvent.getParameter("listItem");
			return oListItem;
		},

		onTableSwipe: function(oEvent) {
			return oEvent.getSource();
		},

		methodFromFormatter: CustomClassExtend.staticTest
	});

	return test;
});