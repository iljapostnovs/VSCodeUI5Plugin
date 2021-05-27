sap.ui.define([
	"sap/ui/base/ManagedObject"
], function(
	ManagedObject
) {
	"use strict";

	return ManagedObject.extend("com.test.util.AsyncAwaitTest", {
		_testAsyncAwait: async function() {
			this._oDialogNestesPromiseThree = this._returnPromiseAsyncWithoutAwaitFromAnotherFN();
			this._oDialogNestesPromiseTwo = await this._returnPromiseAsyncWithoutAwaitFromAnotherFN();
			this._oDialogNestesPromiseOne = await (await this._returnPromiseAsyncWithoutAwaitFromAnotherFN());
			this._oDialogNestesPromiseZero = await(await (await this._returnPromiseAsyncWithoutAwaitFromAnotherFN()));
			this._pPromise = this._returnAsyncDialog();
			this._oDialog = await this._returnAsyncDialog();

			this._oDialogWOJSDoc = await this._returnAsyncDialogWithoutJSDoc();
			this._oDialogFromAnotherFN = await this._returnPromiseFromAnotherFN();
			this._oDialogAsyncFromAnotherFN = await this._returnPromiseAsyncFromAnotherFN();
		},

		/**
		 * @returns {Promise<sap.m.Dialog>} dialogcom.test.util.AsyncAwaitTest
		 */
		_returnAsyncDialog: async function() {
			return new sap.m.Dialog();
		},

		_returnAsyncDialogWithoutJSDoc: async function() {
			return new sap.m.Dialog();
		},

		_returnPromiseFromAnotherFN: function() {
			return this._returnAsyncDialog();
		},

		_returnPromiseAsyncFromAnotherFN: async function() {
			return await this._returnAsyncDialog();
		},

		/**
		 *
		 * @returns {Promise<Promise<Promise<sap.m.Dialog>>>} promise
		 */
		_returnPromiseAsyncWithoutAwaitFromAnotherFN: async function() {
			return this._returnAsyncDialog();
		}
	});
});