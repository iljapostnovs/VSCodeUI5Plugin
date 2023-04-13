import Controller from "sap/ui/core/mvc/Controller";
import Frontend2Model from "./Frontend2Model";

/**
 * @namespace com.test.proxyworkspace.frontend2.mvc
 */
export default class Frontend2 extends Controller {
	onInit() {
		super.onInit();
		this.getView().setModel(new Frontend2Model());
	}
}
