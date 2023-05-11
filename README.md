# SAPUI5 Extension

![TestAndBuildBadge](https://github.com/iljapostnovs/VSCodeUI5Plugin/workflows/Test%20and%20build/badge.svg?branch=development)

Any support is highly appreciated!<br/>
[<img src="https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub&color=%23fe8e86" height="30"/>](https://github.com/sponsors/iljapostnovs)
[<img src="./images/donate.png" height="30"/>](https://donate.cafe/iljapostnovs)

---

# v1.0.0 update

## UI5 Parser

Main changes happened in whole parsing architecture. It was previously "one parser instance for everything", now there can be many. As a result, it is possible to have different project types in one folder/workspace, and every project might have its own configuration. For example, it is possible now to have such funny things as JS app with TS library.

### Removed preference entries

All UI5 Parser related preference entries were removed from VSCode, now they should be defined in `package.json`. See [Config default values](https://github.com/iljapostnovs/ui5plugin-parser/blob/master/README.md#config-default-values) for reference.

> **Hint!** Path to global `<any_name>.json` can be defined using `ui5.plugin.globalConfigurationPath` preference entry.

### Parser instantiation logic

Let's introduce two terms which will be used here:

-   **CWD** - current working directory, or the root folder of the project which is opened in the VSCode.
-   **Workspace** - UI5 workspace, or the folder which has `manifest.json` in it.

```
--- CWD ---
├── webapp
--- Workspace 1 ---
│   ├── Component.js
│   └── manifest.json
├── library
--- Workspace 2 ---
│   ├── library.js
│   └── manifest.json
└── package.json
```

The basic way for instantiating the parser looks as follows:

-   Read `package.json` in `CWD` and use it as a configuration source
-   Read all `Workspaces` and create UI5 Parser instance for it, using `package.json` as configuration source from previous step
-   If `CWD` has `tsconfig.json` and any `.ts` files, it is considered to be TS project. Otherwise it's JS project.

> **Important!** Take in mind that nested projects are not supported anymore, which means that there can be no folders with such structure:

```
├── webapp
│   ├── library
│   │   ├── library.js
│   │   └── manifest.json
│   ├── Component.js
│   └── manifest.json
```

> The structure which will work as expected:

```
├── library
│   ├── library.js
│   └── manifest.json
├── webapp
│   ├── Component.js
│   └── manifest.json
```

### Additional Workspaces

If there is a e.g. library outside of the `CWD`, checkout `additionalWorkspaces` config for `ui5parser`.
Example:

```
├── MyApp (CWD)
│   │   ├── webapp
│   │   │   ├── manifest.json
│   │   │   └── Component.js
│   └── package.json
├── MyLibrary (Outside of CWD)
│   │   ├── src
│   │   │   ├── manifest.json
│   │   │   └── library.js
│   └── package.json
└── tsconfig.json
```

To make this work, corresponding entry in `package.json` should be added

```json
"ui5": {
   "ui5parser": {
      "additionalWorkspaces" : ["../MyLibrary"]
   }
}
```

### Proxy Workspaces

There are cases when project is mixed, meaning that one folder may contain many different projects inside, non-ui5 as well. Most frequent case would be CAP project with both backend and frontend in one folder.

Example:

```
├── frontend
│   ├── webapp
│   │   └── manifest.json
│   ├── package.json (<- this file will be used as configuration source after proxyWorkspaces is configured)
│   └── tsconfig.json
├── backend
│   ├── Whatever.js
│   └── package.json
├── package.json (<- proxyWorkspaces should be configured here)
└── tsconfig.json
```

To make the parser work only for `frontend` folder, corresponding entry in `package.json` should be added

```json
"ui5": {
   "ui5parser": {
      "proxyWorkspaces" : ["./frontend"]
   }
}
```

What happens is that `CWD` is replaced with the new path from `proxyWorkspaces`, so at instantiation stage `package.json` and `tsconfig.json` from `frontend` folder will be used instead of root folder.

### Other changes

-   If `ui5parser` related entries were changed in the `package.json`, VSCode should be reloaded manually
-   Check out [Changelog](CHANGELOG.md) for the rest of the changes.

---

# v0.15.0 update

## Typescript support introduced!

[Check the blog to get some ideas for developing with TS!](https://blogs.sap.com/2022/10/28/visual-studio-code-sapui5-extension-now-supports-typescript)

Most of the functionality works now in typescript as well.
Things to know:

1. `tsconfig.json` should be located in the root folder of workspace
2. If any `.ts` files are found and `tsconfig.json` is found, project is considered to be TS project
3. `src-gen` folder is automatically excluded by extension if it's TS project. If build folder has different name, it should be added to folder exclusions in VSCode extension preferences.
4. Folder with builded resources should be added to exclusions of `ui5parser`. Check `excludeFolderPatterns` in package.json.
5. Not all linters work for TS, because TS has a lot out of the box features. E.g. Wrong field/method linter works only for JS, because TS has it's own syntax analysis for that.
6. `ts-morph` is used as TS parser and it has some drawbacks. When using typechecker to get type e.g. of the field or return type of the method, `ts-morph` might hang up for about ~10s, which is not great. However, types are crucial for Reference CodeLens/Linters, specifically for fields in order to be able to distinguish them in views/fragments. As a workaround for performance issues, typechecker is not used to get field types. Because of that only simple structure is allowed.

Examples which should work as expected:

```typescript
export default class Random {
  formatterInstance = new Formatter(),
  formatterObject = Formatter
}
```

At the same time type detection will work if the type is specifically written, e.g.

```typescript
formatter: Formatter = ...
```

6. Disabling TS standard reference code lens should be considered. This extension contains its own reference code lens, which includes references to views and fragments.

# Feature support

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
| PublicMemberLinter                                     | ✅  | ✅  |                                          |
| InterfaceLinter                                        | ✅  | ❌  | TS has this out of the box               |
| AbstractClassLinter                                    | ✅  | ❌  | TS has this out of the box               |
| UnusedClassLinter                                      | ✅  | ✅  |                                          |

---

This plugin contains perks for UI5 developers.

Before you start working with the plugin, it will be useful to set formatOnSave setting in VSCode preferences:

```json
"editor.formatOnSave": true
```

As well it's recommended to install e.g. Prettier extension for JS/TS files formatting.
The reason for it is described in [Known limitations](#known-limitations)

Make sure that you have `excludeFolderPattern` property set correctly for `ui5parser`. This property is critical if you have SAPUI5 libraries in your workspace.

---

## Completion Items

### XML

XML Completion Items for UI5 Controls.<br/>

> Related preference entries:<br/>_ui5.plugin.addInheritedPropertiesAndAggregations_ <br/>_ui5.plugin.addTagAttributes_ <br/>_ui5.plugin.addTagAggregations_ <br/>

![XMLCompletionItems](/images/XMLCompletionItems.gif)<br/>
XML Completion Items for properties, aggregations, associations and events<br/>
![DynamicXMLCompletionItems](/images/DynamicXMLCompletionItems.gif)<br/>

### JS/TS

#### sap.ui.define

Strings for import in `sap.ui.define` are provided.<br/>
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

> Related preference entries:<br/> _ui5.plugin.jsCodeLens_<br/> _ui5.plugin.jsReferenceCodeLens_<br/> _ui5.plugin.xmlCodeLens_<br/> _ui5.plugin.propertiesCodeLens_<br/>

---

## XML Diagnostics

See [UI5 Linter](https://www.npmjs.com/package/ui5plugin-linter) for reference<br/>

> To make XML Linter ignore attribute errors of next tag, you can use `<-- @ui5ignore -->` comment right above the tag<br/>

![DynamicCompletionItems](/images/XMLDiagnostics.gif)

---

## JS/TS Diagnostics

See [UI5 Linter](https://www.npmjs.com/package/ui5plugin-linter) for reference<br/>

> To make Unused method, public member, wrong parameter usage and wrong field/method linters ignore some methods or fields, you can use @ui5ignore JSDoc param<br/> ![UI5IgnoreExample](/images/UI5IgnoreExample.png)

![DynamicCompletionItems](/images/JSDiagnostics.gif)

---

## Properties (i18n) Diagnostics

See [UI5 Linter](https://www.npmjs.com/package/ui5plugin-linter) for reference<br/>

---

## Code Action Provider

Code Actions for UI5 modules import and inserting non-existent methods in `.js`/`.ts` files are provided.<br/>
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

> Related preference entries: _ui5.plugin.xmlFormatterTagEndingNewline_<br/>

---

## JS/TS Rename Provider

Rename provider for `js`/`ts` is provided.<br/>
The provider renames all references to the class for `JS` projects, and all references for the views/fragments for both `TS`/`JS` projects.<br/>

![JSRenameProvider](/images/JSRenameProvider.gif)

---

## Commands

### Move sap.ui.define to parameters

> Hotkey: F5<br/>

> Related preference entries: _ui5.plugin.moveDefineToFunctionParametersOnAutocomplete_<br/>

![UIDefine](/images/UIDefine.gif)

### Export to i18n

Set your position to the string you want to export to i18n.properties file and execute command. Works both in XML and JS files.

> **Info!** If there is no selection, whole string will be exported. If there is a selection, only the selected part of the string will be exported.

> `this.getBundle()` method which returns ResourceBundle should be defined in Controller/BaseController

> Related preference entries:<br/> _ui5.plugin.askUserToConfirmI18nId_<br/> _ui5.plugin.addI18nTextLengthLimitation_<br/> _ui5.plugin.textTransformationStrategy_<br/>

> Hotkey: F4<br/>

![ExportToI18n](/images/ExportToI18n.gif)

### Switch View/Controller

Goes to view from controller and to controller from view<br/>
If somebody uses `MVC`, the command actually switches between `Model` (Default model, which is set as `this.getView().setModel(oModel)` in the controller) `View` and `Controller`<br/>

> For TS projects it is possible to add `@ui5model` JSDoc to the class, which should have a class name of the model to which the command will switch to. It will improve the performance issue, because reading type of default model might take seconds. Example:

```javascript
/**
 * My Controller JSDoc
 * @ui5model {com.test.mvc.master.model.MyMasterModel}
 */
```

> Hotkey: F3<br/>

![SwitchViewController](/images/SwitchViewController.gif)

### Insert Custom Class name

Inserts the class name into current position<br/>

> Hotkey: F6<br/>

![InsertCustomClassNameCommand](/images/InsertCustomClassNameCommand.gif)

### Clear Cache

Clears cache with SAPUI5 lib metadata

### UML Class Diagram generation

UML Class diagram generates for the project of the currently opened file.<br/>
Also it is possible to generate ER diagram for opened metadata.xml file.<br/>

> There are two ways to generate ER diagram:<br/>
>
> -   Open metadata.xml file, execute command "UI5: Generate ER diagram from metadata.xml"<br/>
> -   Execute command "UI5: Generate ER diagram from metadata.xml" and enter url to metadata.xml<br/>

It is possible to select in preferences which type of diagram to generate: DrawIO or PlantUML.<br/>
However, DrawIO is not supported anymore.<br/>

> Recommended VSCode extensions:<br/>
> DrawIO: _hediet.vscode-drawio-insiders-build_<br/>
> PlantUML: _jebbs.plantuml_<br/>

> UML Diagram example:<br/> ![UML.png](/images/UML.png)

> ER Diagram example:<br/> ![ERDiagram.png](/images/ERDiagram.png)
> Works only with V2 OData Service <br/>
> Related preference entries:<br/> _ui5.plugin.umlGenerationPath_<br/>

---

### JSDoc typedef generation from metadata

There is a possibility to generate typedef JSDocs from metadata

> Works only with V2 OData Service <br/>

> Related preference entries:<br/> _ui5.plugin.JSTypeDefDocPath_<br/>

> ![GenerateJSDocTypedef.gif](/images/GenerateJSDocTypedef.gif)

---

### (TS) Generate interfaces for XML files (id to class mapping)

There is a possibility to generate mapping TS interfaces from control id to control type

> Related preference entries:<br/> _ui5.plugin.XMLFileInterfacePath_<br/> _ui5.plugin.generateXMLFileInterfacesOnSave_<br/>

![GenerateODataInterfaces.png](/images/GenerateODataInterfaces.png)

---

### (TS) Generate interfaces for OData entities

There is a possibility to generate TS interfaces for OData entities

> Works only with V2 OData Service

> Related preference entries:<br/> _ui5.plugin.TSODataInterfacesPath_<br/> _ui5.plugin.TSODataInterfacesFetchingData_<br/>

![GenerateXMLToIdInterfaces.png](/images/GenerateXMLToIdInterfaces.png)

---

### (TS) Generate interfaces for OData entities (Mass)

Works the same as previous command, but can be used for multiple OData models at once. `ui5.plugin.massTSODataInterfacesFetchingData` preference entry should be configured for this command to work.

> Related preference entries:<br/> _ui5.plugin.massTSODataInterfacesFetchingData_<br/>

---

## Automatic template insertion

Inserts initial text for `.js`, `.ts` and `.xml` files<br/>
Extends `"sap/ui/core/mvc/Controller"` if file name ends with `.controller.js`/`.controller.ts` and `"sap/ui/base/ManagedObject"` if file name ends with `.js`/`.ts`<br/>

> Related preference entries:<br/> _ui5.plugin.insertControllerModule_<br/> _ui5.plugin.insertManagedObjectModule_<br/> > ![AutomaticTemplates](/images/AutomaticTemplates.gif)

---

## Automatic class name and class path renaming

Extension listens for `.js`/`.ts` file creation event (rename technically is file deletion and creation) and replaces all occurrences of class name to the new one<br/>
![AutomaticClassNameReplacingOnRename](/images/AutomaticClassNameReplacingOnRename.gif)

---

## UI5 Explorer

Custom UI5 Explorer in VSCode panel is available<br/>

1. For JS/TS files tree view contains fields and methods<br/>
   ![JSTreeView](/images/JSTreeView.png)

    > Coloring for methods is based on lines count and references count.<br/> > **Red** color appears if there are more than 100 lines in one method<br/> > **Orange** color appears if there are more than 50 lines in one method or there are 0 references (reference count is ignored if method is overriden)<br/> > **Green** color appears for the rest of the cases

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

-   File starts with sap.ui.define (JS)
-   Your class body is in AnyUI5Class.extend("name", {_here_}); (JS)<br/>
-   You have manifest.json with App ID
-   App ID (Component name) and i18n paths are defined in manifest.json
-   File is without syntax errors
-   Name of the UI5Class is written accordingly to file path. (E.g. "/src/control/Text.js" => "anycomponentname.control.Text")
-   You have an access to https://ui5.sap.com for standard lib metadata preload

### Proxy

If HTTP_PROXY or HTTPS_PROXY environment variables are set, https://ui5.sap.com will be requested using the proxy.

# Known issues

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

Standard VSCode JS Formatter is not handling all formatting issues. `hookyqr.beautify` extension did, but it got deprecated. It's highly recommended to install some kind of formatter, e.g. Prettier, and use as JS formatter.

```json
"[javascript]": {
	"editor.defaultFormatter": "<YourFormatter>"
}
```

## ui5.sap.com damaged JSON response

For some reason `ui5.sap.com` sometimes might return damaged JSON when requesting standard library metadata. As a result, it is possible to get such error as:<br/>
![UIFiveError](/images/UIFiveError.png)<br/>
To solve it, please run `UI5: Clear cache` command and reload VSCode.
