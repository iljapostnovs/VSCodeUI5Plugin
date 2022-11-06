import Controller from "sap/ui/core/mvc/Controller";
import Util from "../model/Util";

/**
 * @namespace com.test.linter.UnusedMemberLinter.mvc.controller
 */
export default class BaseController extends Controller {
	util = new Util();
}