sap.ui.define([
	"com/test/fragmenttest/controller/Master.controller",
	"com/extend/fragmenttest/util/FormatterExtension"
], function(
	MasterController,
	FormatterExtension
) {
	"use strict";

	return MasterController.extend("com.extend.fragmenttest.controller.MasterExtend", {
		formatter: FormatterExtension,
		eventHandler10(oEvent) {
			"com.extend.fragmenttest.view.fragments.FragmentController2"
			const test = this.getView().byId("idButtonInFragmentInExtensionFragment1");
			test.setBusy(123);
			const oSource = oEvent.getSource();
			this.eventHandler10(oEvent);
		},
		eventHandler11() {},
		unusedEventHandlerExtended() {},
		eventHandler14(oEvent) {
			const source = oEvent.getSource();
		}
	});
});