# SAPUI5 Extension

![TestAndBuildBadge](https://github.com/iljapostnovs/VSCodeUI5Plugin/workflows/Test%20and%20build/badge.svg?branch=development)

Any support is highly appreciated!<br/>
[<img src="https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub&color=%23fe8e86" height="30"/>](https://github.com/sponsors/iljapostnovs)
[<img src="https://newbie.zeromesh.net/donate.7.6.svg" height="30"/>](https://donate.cafe/iljapostnovs)

---

# v0.15.0 update

## Typescript support introduced! <br/>

Most of the functionality works now in typescript as well.
Things to know:

1. `tsconfig.json` should be located in the root folder of workspace
2. If any `.ts` files are found, project is considered to be TS project
3. `webapp` and `src-gen` are automatically excluded by extension if it's TS project. If build folder has different name, it should be added to folder exclusions in VSCode extension preferences
4. Not all linters work for TS, because TS has a lot out of the box features. E.g. Wrong field/method linter works only for JS, because TS has it's own syntax analysis for that.
5. After initial load when ts file is changed, VSCode might hang up for ~5-10s, because `ts-morph` (which is used as TS Parser) for some reason rereads the project instead of updating one file. It should work as expected afterwards.
6. Disabling TS standard reference code lens should be considered. This extension contains its own reference code lens, which includes references to views and fragments.

| Feature                                                | JS  | TS  | Comment                                  |
| :----------------------------------------------------- | :-: | :-: | :--------------------------------------- |
| Insert new method from XML for event handlers          | ✅  | ✅  |                                          |
| Insert new method from JS                              | ✅  | ❌  | TS has this out of the box               |
| i18n CodeLens                                          | ✅  | ✅  |                                          |
| Reference CodeLens                                     | ✅  | ✅  |                                          |
| Override CodeLens                                      | ✅  | ✅  |                                          |
| Event Handler CodeLens                                 | ✅  | ✅  |                                          |
| XML Completion Items                                   | ✅  | ✅  |                                          |
| JS Completion Items                                    | ✅  | ❌  | TS has this out of the box               |
| Ctrl+clickable control ids in js/ts                    | ✅  | ✅  |                                          |
| Ctrl+clickable fragment/view names                     | ✅  | ✅  |                                          |
| Ctrl+clickable event handlers in XML                   | ✅  | ✅  |                                          |
| sap.ui.define import                                   | ✅  | ❌  | TS has this out of the box               |
| JS Definition Provider                                 | ✅  | ❌  | TS has this out of the box               |
| Insert method/field from JS                            | ✅  | ❌  | TS has this out of the box               |
| Insert method from XML                                 | ✅  | ✅  |                                          |
| Automatic file template inserting                      | ✅  | ✅  |                                          |
| Hover information in JS                                | ✅  | ❌  | TS has this out of the box               |
| Hover information in XML                               | ✅  | ✅  |                                          |
| Signature Help                                         | ✅  | ❌  | TS has this out of the box               |
| UI5 Explorer                                           | ✅  | ✅  |                                          |
| XML Formatter                                          | ✅  | ✅  |                                          |
| Rename provider                                        | ✅  | ✅  | TS still needs to rename handlers in XML |
| Generate typedef JSDoc command                         | ✅  | ✅  |                                          |
| Export text to i18n command                            | ✅  | ✅  |                                          |
| Generate typedef JSDoc command                         | ✅  | ✅  |                                          |
| Controller/View/Model switch command                   | ✅  | ✅  |                                          |
| TS Interface generation for id-> class mapping command | ✅  | ✅  |                                          |
| TS Interface generation for OData entities command     | ✅  | ✅  |                                          |
| UML Class diagram generation command                   | ✅  | ✅  |                                          |
| Insert custom class name command                       | ✅  | ✅  |                                          |
| Regenerate sap.ui.define variables command             | ✅  | ❌  | Not needed for TS                        |
| WrongParametersLinter                                  | ✅  | ❌  | TS has this out of the box               |
| WrongOverrideLinter                                    | ✅  | ❌  | TS has this out of the box               |
| WrongImportLinter                                      | ✅  | ❌  | TS has this out of the box               |
| WrongFilePathLinter                                    | ✅  | ✅  |                                          |
| WrongFieldMethodLinter                                 | ✅  | ❌  | TS has this out of the box               |
| WrongClassNameLinter                                   | ✅  | ✅  |                                          |
| UnusedTranslationsLinter                               | ✅  | ✅  |                                          |
| UnusedNamespaceLinter                                  | ✅  | ✅  |                                          |
| UnusedMemberLinter                                     | ✅  | ✅  |                                          |
| WrongNamespaceLinter                                   | ❌  | ✅  | Necessary namespace for UI5 babel        |
| TagLinter                                              | ✅  | ✅  |                                          |
| TagAttributeLinter                                     | ✅  | ✅  |                                          |
| PublicMemberLinter                                     | ✅  | ❌  |                                          |
| InterfaceLinter                                        | ✅  | ❌  | TS has this out of the box               |
| AbstractClassLinter                                    | ✅  | ❌  | TS has this out of the box               |
| UnusedClassLinter                                      | ✅  | ✅  |                                          |

---

# v0.14.0 update

Part of current extension was splitted into two npm packages: [ui5plugin-parser](https://www.npmjs.com/package/ui5plugin-parser) and [ui5plugin-linter](https://www.npmjs.com/package/ui5plugin-linter).
As a result, all parser and linter related documentation moved there. Now it is possible to install linter npm package and run it globally without Visual Studio Code (which comes handy for building lint/test CI pipelines).

## Major changes

### Linter

As a result of migrating to npm packages, all linter related Visual Studio Code preferences were removed and now package.json is a source for linter configuration (see `Config` in [ui5plugin-linter](https://www.npmjs.com/package/ui5plugin-linter)). This opens some flexibility for multiple folder workspaces, because each folder can contain different linter configuration which was not an option before. Additionally, now it is possible to control severity of the errors.

### Parser

Parser related preference entries stays in Visual Studio Code for several technical reasons. <br/>
`UI5 version`, `exclude folder patterns`, `data source`, `reject unauthorized` and `libs to load` are still configured through Visual Studio Code and passed to [ui5plugin-parser](https://www.npmjs.com/package/ui5plugin-parser) afterwards.

---

This plugin contains perks for UI5 developers.

Before you start working with the plugin, it will be useful to set formatOnSave setting in VSCode preferences:

```json
"editor.formatOnSave": true
```

As well it's recommended to install `hookyqr.beautify` extension for formatting JS files.
The reason for it is described in [Known limitations](#known-limitations)

Make sure that you have `ui5.plugin.excludeFolderPattern` property set correctly. This property is critical if you have SAPUI5 libraries in your workspace.

---

## Completion Items

### XML

XML Completion Items for UI5 Controls.<br/>

> Check _ui5.plugin.addInheritedPropertiesAndAggregations_ preference if you want to generate less properties and aggregations<br/>

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

---

## Method Definitions

Definitions for custom methods are provided.<br/>

> Hotkey: Ctrl + Left Click<br/>

![Definition](/images/Definition.gif)

---

## XML Event Handler Definitions

Definitions for event handlers are provided.<br/>

> Hotkey: Ctrl + Left Click<br/>

![Definition](/images/XMLDefinition.gif)

---

## CodeLens

CodeLens for Internalization Texts, overriden methods, event handlers and references is provided
![DynamicCompletionItems](/images/XMLResourceModel.gif)

> Related preference entries:<br/> > _ui5.plugin.jsCodeLens_<br/> > _ui5.plugin.jsReferenceCodeLens_<br/> > _ui5.plugin.xmlCodeLens_<br/>

---

## XML Diagnostics

See [UI5 Linter](https://www.npmjs.com/package/ui5plugin-linter) for reference<br/>

> To make XML Linter ignore attribute errors of next tag, you can use `<-- @ui5ignore -->` comment right above the tag<br/>

![DynamicCompletionItems](/images/XMLDiagnostics.gif)

---

## JS Diagnostics

See [UI5 Linter](https://www.npmjs.com/package/ui5plugin-linter) for reference<br/>

> To make Unused method, public member, wrong parameter usage and wrong field/method linters ignore some methods or fields, you can use @ui5ignore JSDoc param<br/> > ![UI5IgnoreExample](/images/UI5IgnoreExample.png)

![DynamicCompletionItems](/images/JSDiagnostics.gif)

---

## Properties (i18n) Diagnostics

See [UI5 Linter](https://www.npmjs.com/package/ui5plugin-linter) for reference<br/>

---

## Code Action Provider

Code Actions for UI5 modules import and inserting non-existent methods in .js files are provided.<br/>
Code Actions for creating event handlers in controllers from xml views are provided.<br/>

> Hotkey: Alt + Enter<br/>

![CodeActionsProvider](/images/CodeActionsProvider.gif)
![CreateMethodCodeActionsProvider](/images/CreateMethodCodeActionsProvider.gif)

---

## JS and XML Hover Provider

Information on hover is provided.<br/>

![HoverProvider](/images/HoverProvider.gif)

---

## XML Formatter

XML Formatter is available.<br/>

![XMLFormatter](/images/XMLFormatter.gif)

---

## JS Rename Provider

Rename provider for js is provided.<br/>

![JSRenameProvider](/images/JSRenameProvider.gif)

---

## Commands

### Move sap.ui.define to parameters

> Hotkey: F5<br/>

> Related preference entries: _ui5.plugin.moveDefineToFunctionParametersOnAutocomplete_<br/>

![UIDefine](/images/UIDefine.gif)

### Export to i18n

Set your position to the string you want to export to i18n.properties file and execute command. Works both in XML and JS files.

> `this.getBundle()` method which returns ResourceBundle should be defined in Controller/BaseController

> Related preference entries:<br/> > _ui5.plugin.askUserToConfirmI18nId_<br/> > _ui5.plugin.addI18nTextLengthLimitation_<br/> > _ui5.plugin.textTransformationStrategy_<br/>

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

### UML Class Diagram generation

UML Class diagram can be generated either for currently active document or for the whole project.<br/>
Also it is possible to generate ER diagram for opened metadata.xml file.<br/>

> There are two ways to generate ER diagram:<br/>
>
> -   Open metadata.xml file, execute command "UI5: Generate ER diagram from metadata.xml"<br/>
> -   Execute command "UI5: Generate ER diagram from metadata.xml" and enter url to metadata.xml<br/>

It is possible to select in preferences which type of diagram to generate: DrawIO or PlantUML.<br/>

> Recommended VSCode extensions:<br/>
> DrawIO: _hediet.vscode-drawio-insiders-build_<br/>
> PlantUML: _jebbs.plantuml_<br/>

> UML Diagram example:<br/> >![UML.png](/images/UML.png)

> ER Diagram example:<br/> >![ERDiagram.png](/images/ERDiagram.png)

---

### JSDoc typedef generation from metadata

There is a possibility to generate typedef JSDocs from metadata

> ![GenerateJSDocTypedef.gif](/images/GenerateJSDocTypedef.gif)

---

### (TS) Generate interfaces for XML files (id to class mapping)

There is a possibility to generate mapping TS interfaces from control id to control type

> ![GenerateXMLToIdInterfaces.png](/images/GenerateXMLToIdInterfaces.png)

---

### (TS) Generate interfaces for OData entities

There is a possibility to generate TS interfaces for OData entities

> ![GenerateODataInterfaces.png](/images/GenerateODataInterfaces.png)

---

## Automatic template insertion

Inserts initial text for .js and .xml files<br/>
Extends "sap/ui/core/mvc/Controller" if file name ends with .controller.js and "sap/ui/base/ManagedObject" if file name ends with .js<br/>
![AutomaticTemplates](/images/AutomaticTemplates.gif)

---

## Automatic class name and class path renaming

Extension listens for .js file creation event (rename technically is file deletion and creation) and replaces all occurrences of class name to the new one<br/>
![AutomaticClassNameReplacingOnRename](/images/AutomaticClassNameReplacingOnRename.gif)

---

## UI5 Explorer

Custom UI5 Explorer in VSCode panel is available<br/>

1. For JS files tree view contains fields and methods<br/>
   ![JSTreeView](/images/JSTreeView.png) > Coloring for methods is based on lines count and references count. > _ Red color appears if there are more than 100 lines in one method > _ Orange color appears if there are more than 50 lines in one method or there are 0 references (reference count is ignored if method is overriden) > \* Green color appears for the rest of the cases

2. For XML files tree view contains class tag list<br/>
   ![XMLTreeView](/images/XMLTreeView.png)

---

## Hotkeys

|   Hotkey    | Command                                  |
| :---------: | ---------------------------------------- |
| Alt + Enter | Quick Fix Action                         |
|     F3      | Switch View/Controller                   |
|     F4      | Export string to i18n                    |
|     F5      | Move sap.ui.define imports to parameters |
|     F6      | Insert custom class name                 |

---

### Assumptions

-   File starts with sap.ui.define
-   Your class body is in AnyUI5Class.extend("name", {_here_});<br/>
-   You have manifest.json with app/lib id
-   App ID (Component name) and i18n paths are defined in manifest.json
-   File is without syntax errors
-   Name of the UI5Class is written accordingly to file path. (E.g. "/src/control/Text.js" => "anycomponentname.control.Text")
-   You have an access to https://ui5.sap.com for standard lib metadata preload

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

Standard VSCode JS Formatter is not handling all formatting issues, however `hookyqr.beautify` extension does. It's highly recommended to install it and use as JS formatter.

```json
"[javascript]": {
	"editor.defaultFormatter": "HookyQR.beautify"
}
```
