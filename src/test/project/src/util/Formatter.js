sap.ui.define([
    "sap/m/Dialog"
], function (
    Dialog
) {
	"use strict";

	return {
        customMethod: function() {
            return new Dialog();
        },
        asyncCustomMethod: async (a, b) => {
            return a;
        },
        /**
         * @param {sap.m.Label} a - a
         * @param {sap.m.Text} b - b
         */
        anotherCustomMethod: (a, b) => {
            return a;
        }
	};
});