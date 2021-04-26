sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/Dialog",
	"sap/ui/Device",
	"sap/ui/model/odata/type/Decimal",
	"com/test/util/Formatter",
	"com/test/controller/PublicMemberLinterTest"
], function(
	Controller,
	Dialog,
	Device,
	Decimal,
	Formatter,
	PublicMemberLinterTest
) {
	"use strict";

	return Controller.extend("com.test.controller.LinterTest", {
		formatter: Formatter,

		_onDelete: function(oEvent) {

		},

		onFragmentButtonPress: function(oEvent) {

		},

		onInit: function() {
			const controller = new PublicMemberLinterTest();
			controller.publicUsedMethodInOtherClass();
			controller.publicUsedField;
			const oText = new sap.m.Text();
			const iNumber = 123;
			this._nonExistentMethod();
			this._testMethodParams("123", new sap.m.Text());
			this._testMethodParams("123", oText, ["asd"]);
			this._testMethodParams("123", new sap.m.Text(), [iNumber]);
			this._testMethodParams().wrongMethod();
			this._testMethodParams().wrongField;
			this._testMethodParams().allowTextSelection(true);
			this._testMethodParams().allowTextSelection(true, "asd");
			this._testMethodParams().allowTextSelection(123);
			this._testMethodParams("123");
			this._testMethodParams("123", new sap.m.Dialog());
			oText.setText(123);
			oText.setBusy(Device.system.phone);

			this.getRouter().getRoute("Test").attachMatched(null, this._onRouteMatched, this);
			this.getRouter().getRoute("Test").attachEvent("matched", this._onRouteMatched2, this);
			this.getRouter().getRoute("Test").attachMatched(this._onRouteMatched3, this);

			sap.ui.xmlfragment("com.test.view.fragments.SecondFragment");
			sap.ui.xmlfragment("com.test.view.fragments.ThirdFragment");

			this._arrayExample();
		},

		_onRouteMatched: function(oEvent) {

		},

		_onRouteMatched2: function(oEvent) {

		},

		_onRouteMatched3: function(oEvent) {

		},

		/**
		 * @param {string} sFirstParam first string param
		 * @param {sap.m.Text} oSecondParam second param, instance of sap.m.Text
		 * @param {string[]} [aThirdParam] - optional string array param
		 * @returns {sap.m.Dialog} dialog
		 */
		_testMethodParams: function(sFirstParam, oSecondParam, aThirdParam) {

			return new Dialog();
		},

		/**
		 * @param {sap.m.Dialog|sap.m.Text|sap.m.Table} [vWhatIsThat] multiple type variable
		 */
		_testMultipleTypes: function(vWhatIsThat) {
			this._testMultipleTypes(new Text());
			this._testMultipleTypes(new Dialog());
			this._testMultipleTypes([]);
			this._testMultipleTypes();
			this._testMultipleTypes(vWhatIsThat);

			const oDecimal = new Decimal();
			const sValue = oDecimal.formatValue("123", "string");
			oDecimal.validateValue(sValue);

			this._testMultipleTypesTestMethod(vWhatIsThat);
		},

		/**
		 * @param {sap.m.ListBase|sap.m.Label} vListBaseOrLabel input
		 */
		_testMultipleTypesTestMethod: function(vListBaseOrLabel) {

		},

		onSecondFragmentSelectionChange: function(oEvent) {

		},

		onThirdFragmentSelectionChange: function(oEvent) {

		},

		/**
		 * function for getting the Router
		 * @public
		 * @returns {sap.m.routing.Router} - Router
		 */
		getRouter: function() {
			return UIComponent.getRouterFor(this);
		},

		unusedMethod: function() {

		},

		_arrayExample: function() {
			const aArray = [];
			const mMap = this._getMap();
			this._takesObjectAndReturnsIt(mMap);
		},

		/**
		 * @param {object} oObject
		 */
		_takesObjectAndReturnsIt: function(oObject) {
			return oObject;
		},

		_getMap: function() {
			var aRecords = this.getView().getModel().getProperty("/");
			return aRecords.find(sValue => ({
				asd: 123
			}));
		},

		onPaste: function() {},

		_onItemPress: function() {

		}
	});
});