# SAPUI5 Extension
![TestAndBuildBadge](https://github.com/iljapostnovs/VSCodeUI5Plugin/workflows/Test%20and%20build/badge.svg?branch=development)

This plugin contains perks for UI5 developers.

Before you start working with the plugin, it will be useful to set formatOnSave setting in VSCode preferences:
```json
"editor.formatOnSave": true
```
The reason for it is described in [Known limitations](#known-limitations)

Make sure that you have ```ui5.plugin.excludeFolderPattern``` property set correctly. This property is critical if you have SAPUI5 libraries in your workspace.

----------
## Completion Items
### XML
XML Completion Items for UI5 Controls.<br/>
> Check *ui5.plugin.addInheritedPropertiesAndAggregations* preference if you want to generate less properties and aggregations<br/>

![XMLCompletionItems](/images/XMLCompletionItems.gif)<br/>
XML Completion Items for properties, aggregations, associations and events<br/>
![DynamicXMLCompletionItems](/images/DynamicXMLCompletionItems.gif)<br/>

### JS

#### sap.ui.define
Strings for import in sap.ui.define are provided.<br/>
![UIDefine](/images/UIDefine.gif)

#### Control ID Completion Items
IDs from the corresponding view of the controller are provided for view.byId or controller.byId method<br/>
![GetView](/images/GetView.gif)

#### Dynamic Completion Items
Completion items which are generated dynamically depending on current variable type or method return value type. Trigger character - dot.<br/>
![DynamicCompletionItems](/images/DynamicCompletionItems.gif)

### Manifest.json
Schema for manifest.json properties is added.<br/>

![ManifestCompletionItems](/images/ManifestCompletionItems.gif)

----------
## Method Definitions
Definitions for custom methods are provided.<br/>
> Hotkey: Ctrl + Left Click<br/>

![Definition](/images/Definition.gif)

----------
## XML Event Handler Definitions
Definitions for event handlers are provided.<br/>
> Hotkey: Ctrl + Left Click<br/>

![Definition](/images/XMLDefinition.gif)

----------
## CodeLens
CodeLens for Internalization Texts, overriden methods, event handlers and references is provided
![DynamicCompletionItems](/images/XMLResourceModel.gif)
> Related preference entries:<br/>
> *ui5.plugin.jsCodeLens*<br/>
> *ui5.plugin.jsReferenceCodeLens*<br/>
> *ui5.plugin.xmlCodeLens*<br/>

----------
## XML Diagnostics
XML Diagnostics is provided<br/>
XML Linters available:<br/>
* Attribute linter<br/>
>Checks for property existence, property value, prefix existence, event handler existence and if default value is not the same as entered value
* Unused namespace linter<br/>
>Checks if declared namespaces are used
* Tag linter<br/>
>Checks for class and aggregation existence
* Wrong file path linter<br/>
>Checks if any strings that contains app namespace have according fragment or view


> Related preference entries:<br/>
> *ui5.plugin.xmlDiagnostics*<br/>

![DynamicCompletionItems](/images/XMLDiagnostics.gif)

----------
## JS Diagnostics
> You can define diagnostic exceptions using *ui5.plugin.JSLinterExceptions* preference entry.

JS Diagnostics is provided<br/>
JS Linters available:<br/>
* Wrong field/method usage linter<br/>
>It checks for existence of the class members and if they are used correctly according to access level modifiers
* Wrong custom class name linter<br/>
>It checks if your class name in ```<AnyClass>.extend("here")``` is correct
* Wrong import path linter<br/>
>It checks if imported module exists
* Unused field/method linter<br/>
>Self explanatory: checks if methods/fields are used at all
* Wrong file path linter<br/>
>Checks if any strings that contains app namespace have according fragment, view or class
* Public member linter<br/>
>Checks if class members should be public. Warning is generated if member is public, but there are no references for it in other classes
* Wrong override linter<br/>
>Checks if overriden members are not protected/private
* Abstract class linter<br/>
>Checks if all abstract members are implemented
* Interface linter<br/>
>Checks if all interface members are implemented
* Wrong parameter usage in the methods linter, which checks for parameter quantity and data type<br/>
	> Use jsdoc to make your parameters optional, e.g.
	```javascript
	/**
	 *@param {string} [sOptionalString] - optional string param
	 *@param {string} sMandatoryString - mandatory string param
	 */
	```

> Related preference entries:<br/>
> *ui5.plugin.jsDiagnostics*<br/>
> *ui5.plugin.useWrongFieldMethodLinter*<br/>
> *ui5.plugin.useWrongClassNameLinter*<br/>
> *ui5.plugin.useWrongImportLinter*<br/>
> *ui5.plugin.useWrongParametersLinter*<br/>
> *ui5.plugin.useUnusedMemberLinter*<br/>
> *ui5.plugin.useWrongFilePathLinter*<br/>
> *ui5.plugin.usePublicMemberLinter*<br/>
> *ui5.plugin.useWrongOverrideLinter*<br/>

> To make Unused method, public member, wrong parameter usage and wrong field/method linters ignore some methods or fields, you can use @ui5ignore JSDoc param<br/>
> ![UI5IgnoreExample](/images/UI5IgnoreExample.png)

![DynamicCompletionItems](/images/JSDiagnostics.gif)

----------
## Properties (i18n) Diagnostics
Properties Diagnostics is provided<br/>
Properties Linters available:<br/>
* Unused translations linter<br/>
>Checks if translations are used

----------
## Code Action Provider
Code Actions for UI5 modules import and inserting non-existent methods in .js files are provided.<br/>
Code Actions for creating event handlers in controllers from xml views are provided.<br/>
> Hotkey: Alt + Enter<br/>

![CodeActionsProvider](/images/CodeActionsProvider.gif)
![CreateMethodCodeActionsProvider](/images/CreateMethodCodeActionsProvider.gif)

----------
## JS and XML Hover Provider
Information on hover is provided.<br/>

![HoverProvider](/images/HoverProvider.gif)

----------
## XML Formatter
XML Formatter is available.<br/>

![XMLFormatter](/images/XMLFormatter.gif)

----------
## JS Rename Provider
Rename provider for js is provided.<br/>

![JSRenameProvider](/images/JSRenameProvider.gif)

----------
## Commands

### Move sap.ui.define to parameters
> Hotkey: F5<br/>

> Related preference entries: *ui5.plugin.moveDefineToFunctionParametersOnAutocomplete*<br/>

![UIDefine](/images/UIDefine.gif)

### Export to i18n
Set your position to the string you want to export to i18n.properties file and execute command. Works both in XML and JS files.
> `this.getBundle()` method which returns ResourceBundle should be defined in Controller/BaseController

> Related preference entries:<br/>
> *ui5.plugin.askUserToConfirmI18nId*<br/>
> *ui5.plugin.addI18nTextLengthLimitation*<br/>
> *ui5.plugin.textTransformationStrategy*<br/>

> Hotkey: F4<br/>

![ExportToI18n](/images/ExportToI18n.gif)

### Switch View/Controller
Goes to view from controller and to controller from view<br/>
> Hotkey: F3<br/>

![SwitchViewController](/images/SwitchViewController.gif)

### Insert Custom Class name
Inserts the class name into current position<br/>
> Hotkey: F6<br/>

![InsertCustomClassNameCommand](/images/InsertCustomClassNameCommand.gif)

### Clear Cache
Clears cache with SAPUI5 lib metadata

----------
## Automatic template insertion
Inserts initial text for .js and .xml files<br/>
Extends "sap/ui/core/mvc/Controller" if file name ends with .controller.js and "sap/ui/base/ManagedObject" if file name ends with .js<br/>
![AutomaticTemplates](/images/AutomaticTemplates.gif)

----------
## Automatic class name and class path renaming
Extension listens for .js file creation event (rename technically is file deletion and creation) and replaces all occurrences of class name to the new one<br/>
![AutomaticClassNameReplacingOnRename](/images/AutomaticClassNameReplacingOnRename.gif)

----------
## UI5 Explorer
Custom UI5 Explorer in VSCode panel is available<br/>
1) For JS files tree view contains fields and methods<br/>
![JSTreeView](/images/JSTreeView.png)
	> Coloring for methods is based on lines count and references count.
	> * Red color appears if there are more than 100 lines in one method
	> * Orange color appears if there are more than 50 lines in one method or there are 0 references (reference count is ignored if method is overriden)
	> * Green color appears for the rest of the cases

2) For XML files tree view contains class tag list<br/>
![XMLTreeView](/images/XMLTreeView.png)

----------
## UML Class Diagram generation
UML Class diagram can be generated either for currently active document or for the whole project.<br/>
Also it is possible to generate ER diagram for opened metadata.xml file.<br/>
> There are two ways to generate ER diagram:<br/>
> * Open metadata.xml file, execute command "UI5: Generate ER diagram from metadata.xml"<br/>
> * Execute command "UI5: Generate ER diagram from metadata.xml" and enter url to metadata.xml<br/>

It is possible to select in preferences which type of diagram to generate: DrawIO or PlantUML.<br/>
> Recommended VSCode extensions:<br/>
> DrawIO: *hediet.vscode-drawio-insiders-build*<br/>
> PlantUML: *jebbs.plantuml*<br/>

>UML Diagram example:<br/>
>![UML.png](/images/UML.png)

>ER Diagram example:<br/>
>![ERDiagram.png](/images/ERDiagram.png)

----------
## Hotkeys
| Hotkey        | Command                                  |
|:-------------:| -------------                            |
| Alt + Enter   | Quick Fix Action                         |
| F3            | Switch View/Controller                   |
| F4            | Export string to i18n                    |
| F5            | Move sap.ui.define imports to parameters |
| F6            | Insert custom class name                 |

----------

### Assumptions
* File starts with sap.ui.define
* Your class body is in AnyUI5Class.extend("name", {_here_});<br/>
* You have manifest.json with app/lib id
* App ID (Component name) and i18n paths are defined in manifest.json
* File is without syntax errors
* Name of the UI5Class is written accordingly to file path. (E.g. "/src/control/Text.js" => "anycomponentname.control.Text")
* You have an access to https://ui5.sap.com for standard lib metadata preload

### Proxy
If HTTP_PROXY or HTTPS_PROXY environment variables are set, ui5.sap.com will be requested using the proxy.

# Known limitations
## acorn-loose
acorn-loose is used as JS parser. It has issues if you have mixed spaces and tabs.
Example:
```javascript
function() {
	 var oModel = this.getModel();
	var asd;
}
```
There is an unnecessary space before `var oModel` and acorn is parsing it incorrectly.
As a result - the file will not be parsed as expected and you might not get JS completion items and get errors in xml views regarding wrong values for event handlers.<br/>
Keep your code clean, it will help you to have the plugin working correctly :)<br/>
It's highly recommended to set formatting on save in your VS Code preferences, it will help to avoid such issues.
```json
"editor.formatOnSave": true
```