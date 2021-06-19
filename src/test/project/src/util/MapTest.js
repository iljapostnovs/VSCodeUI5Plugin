sap.ui.define([
	"sap/ui/base/ManagedObject"
], function(
	ManagedObject
) {
	"use strict";

	return ManagedObject.extend("com.test.util.MapTest", {
		test(aData) {
			const aMappedData = this._getMapArray(aData);
			const aMappedData2 = this._getMapArray2(aData);
		},

		_getMapArray(aData) {
			return aData.map(mData => {
				const mAnyMap = {};
				return mAnyMap;
			});
		},

		_getMapArray2(aData) {
			return aData.map(mData => {
				const mAnyMap = {
					test: 123
				};
				return mAnyMap;
			});
		}
	});
});