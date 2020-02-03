# SAPUI5 Extension
This plugin contains perks for UI5 developers.

----------
## Completion Items
### XML
XML Completion Items for UI5 Controls.<br/>
![XMLCompletionItems](/images/XMLCompletionItems.gif)<br/>
![DynamicXMLCompletionItems](/images/DynamicXMLCompletionItems.gif)<br/>

### JS

#### sap.ui.define
Strings for import in sap.ui.define are provided.<br/>
![UIDefine](/images/UIDefine.gif)

#### Control ID Completion Items
IDs from the corresponding view of the controller are provided for view.byId or controller.byId method<br/>
![GetView](/images/GetView.gif)

#### Dynamic completion items
Completion items which are generated dynamically depending on current variable class. Trigger character - dot.<br/>
![DynamicCompletionItems](/images/DynamicCompletionItems.gif)

----------
## Method Definitions
Definitions for custom methods are provided.<br/>
![Definition](/images/Definition.gif)

----------
## Commands

> Idea to put hotkeys for commands might be useful

### Move sap.ui.define to parameters
![UIDefine](/images/UIDefine.gif)

### Export to i18n
Set your position to the string you want to export to i18n.properties file and execute command. Works both in XML and JS files.
> `this.getBundle()` method which returns ResourceBundle should be defined in Controller/BaseController

![ExportToI18n](/images/ExportToI18n.gif)

### Switch View/Controller
Goes to view from controller and to controller from view<br/>
![SwitchViewController](/images/SwitchViewController.gif)

### Insert Custom Class name
Inserts the class name into current position<br/>
![InsertCustomClassNameCommand](/images/InsertCustomClassNameCommand.gif)

### Clear Cache
Clears cache with SAPUI5 lib metadata

----------
## Automatic template insertion
Inserts initial text for .js files<br/>
Extends "sap/ui/core/mvc/Controller" if file name ends with .controller.js and "sap/ui/base/ManagedObject" if file name ends with .js<br/>
![AutomaticTemplates](/images/AutomaticTemplates.gif)

----------
## Automatic class name and class path renaming
Extension listens for .js file creation event (rename technically is file deletion and creation) and replaces all occurances of class name to the new one<br/>
![AutomaticClassNameReplacingOnRename](/images/AutomaticClassNameReplacingOnRename.gif)

----------
## Settings
There are two settings available:
* Your source folder name where manifest.json should be located at
* Library version (For now - tested only for 1.60.11)<br/>
![Settings](/images/Settings.png)

----------
# How it works
## SAPUI5 Metadata
* Standard SAPUI5 Library Metadata is fetched from ui5.sap.com and saved locally
* Tested using 1.60.11 only
> If you are using different versions, you might meet an unexpected behavior if the structure of the standard lib metadata is different

## Custom class metadata
Custom class metadata is dynamically generated using .js and view.xml files of the project.<br/>
There are several types of variable definitions:<br/>
* Class Fields<br/>
`this.variable`<br/>
Algorithm looks for all definitions in the functions of the object which is returned in
`return AnyUI5Class.extend("name", {})` part
* Function parameters<br/>
`function(oEvent) {}`<br/>
> Only way to find out the data type of the function parameter is JSDoc. Use `@param {UI5Class} UI5ClassParameter - description` if you want completion items to work for function params.<br/>
The same goes for function return data type. Use `@returns {UI5Class} UI5ClassVariable - description` if you want completion items to work for function return.<br/>
* Local variables<br/>
`function() {
	var oList = new List();
}`

### Custom file parsing limitations
* All variables defined in try/catch, for/while loops are ignored for now

### Assumptions
* File starts with sap.ui.define
* Your class body is in AnyUI5Class.extend("name", {here});<br/>(It means that dynamic completion items will not work for e.g. formatters, when you usually return an object right away)
* You have manifest.json in source folder
* App ID (Component name) and i18n paths are defined in manifest.json
* File is without syntax errors
* All your strings in sap.ui.define are not Relative (e.g. "./BaseController")
* Name of the class of the UI5Class is the same as file path. (E.g. "/src/control/Text.js" => "anycomponentname.control.Text")
* No ES6+ features are used (except const/let and arrow functions)
* You have an access to ui5.sap.com for standard lib metadata preload

### Proxy
If HTTP_PROXY or HTTPS_PROXY environment variables are set, ui5.sap.com will be requested using the proxy.