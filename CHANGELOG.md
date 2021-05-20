## 0.12.44 (21-05-2021)
* Added support for @ui5ignore JSDoc tag, which will make ignore errors of Unused Member, Public Member, Wrong Field/Method linters.

## 0.12.43 (19-05-2021)
* Bugfix for JS completion items

## 0.12.42 (19-05-2021)
* Added error message for failed http requests
* Bugfixes for file/folder rename handler

## 0.12.41 (17-05-2021)
* JS Rename provider fix

## 0.12.40 (17-05-2021)
* XML file path linter now also checks for classes

## 0.12.39 (17-05-2021)
* Bugfixes
* Wrong file path linter also added for XML Linter
* Now you can control-click on fragment/view names to navigate into them
* Now you can control-click on id of control to navigate into view/fragment

## 0.12.38 (11-05-2021)
* Added support for fragments defined in manifest extensions
* Improve detecting of function used in XML files
* JS Rename now also renames event handlers in XML files

## 0.12.37 (05-05-2021)
* Refactoring
* Information message added if manifest reading is too slow or there are too much manifests found

## 0.12.36 (05-05-2021)
* node_modules and dist added to default exclusions
* ui5.plugin.excludeFolderPattern is now an array

## 0.12.35 (04-05-2021)
* ui5.plugin.excludeFolderPattern preference entry introduced

## 0.12.34 (04-05-2021)
* Bugfixes and performance improvements

## 0.12.33 (04-05-2021)
* Bugfixes and performance improvements

## 0.12.32 (03-05-2021)
* Breaking (hopefully not really) change: Source folder preference entry removed, now plugin searches for manifest.json files and sets the namespaces relative to them using the id.
* Change XML completion items insert range
* Class completion items for JS Completion items introduced
* Bugfixes

## 0.12.31 (01-05-2021)
* DOM event handlers added to exceptions for JS linters

## 0.12.30 (29-04-2021)
* Wrong override linter introduced

## 0.12.29 (28-04-2021)
* Remove unnecessary console logs

## 0.12.28 (28-04-2021)
* FileWatcher bugfixes

## 0.12.27 (27-04-2021)
* File rename handler introduced. Now you can rename methods/fields.
* Bugfixes

## 0.12.26 (22-04-2021)
* Bugfixes
* Public member linter introduced
* Unused method linter now is replaced with unused member linter, which also checks fields

## 0.12.25 (21-04-2021)
* Bugfixes

## 0.12.24 (19-04-2021)
* Bugfixes

## 0.12.23 (16-04-2021)
* Bugfixes
* New field added to JSLinterExceptions property - applyToChildren

## 0.12.22 (12-04-2021)
* Bugfixes

## 0.12.21 (12-04-2021)
* Fix JS Linter exceptions for Wrong Parameters Linter

## 0.12.20 (31-03-2021)
* Update default JSLinter exceptions

## 0.12.19 (23-03-2021)
* Update readme

## 0.12.18 (23-03-2021)
* Bugfixes

## 0.12.17 (23-03-2021)
* Bugfixes

## 0.12.16 (21-03-2021)
* Support for controller extensions in manifest added
* Completion items for overriding methods/fields added
* Data types to JS method parameters Hover added

## 0.12.15 (20-03-2021)
* Update keywords

## 0.12.14 (18-03-2021)
* Bugfixes

## 0.12.13 (17-03-2021)
* Wrong File Path JS Linter added

## 0.12.12 (01-03-2021)
* Bugfixes

## 0.12.11 (01-03-2021)
* Bugfixes

## 0.12.10 (01-03-2021)
* Add @type JSDoc support for variable declarations

## 0.12.9 (17-02-2021)
* Fix #98 issue

## 0.12.8 (10-02-2021)
* Bugfixes

## 0.12.7 (07-02-2021)
* Bugfixes

## 0.12.5 (04-02-2021)
* Bugfixes

## 0.12.4 (04-02-2021)
* Bugfixes

## 0.12.3 (03-02-2021)
* Bugfixes

## 0.12.2 (02-02-2021)
* Bugfixes

## 0.12.1 (01-02-2021)
* Bugfixes

## 0.12.0 (30-01-2021)
* Bugfixes
* Performance improvements for XML and JS linting
* Code Actions for adding methods in custom class if they doesn't exist added
* Support for relative path import in SAP UI Define added
* JS Code lens for event handlers added
* Switch view controller now works for fragments and classes with first file where the fragment name was used
* XML Definition provider for event handlers added
* New VS Code settings added

## 0.11.12 (14-01-2021)
* Bugfixes

## 0.11.11 (13-01-2021)
* Bugfixes

## 0.11.10 (07-01-2021)
* Wrong SAP UI Define import linting added
* Bugfixes

## 0.11.9 (05-01-2021)
* Sync JS and XML diagnostics with file renaming/deletion

## 0.11.8 (28-12-2020)
* @type JSDoc tag support for class fields
* Bugfixes for JS hover provider

## 0.11.7 (28-12-2020)
* Bugfixes
* JS Diagnostics introduced

## 0.11.6 (20-12-2020)
* Bugfixes

## 0.11.5 (18-12-2020)
* Bugfixes
* Code Action for XML added. Now you can add missing event handler to the controller out of the view
* Completion items for event parameter names added

## 0.11.4 (17-12-2020)
* Performance improvements for large files

## 0.11.3 (17-12-2020)
* Performance improvements for large files

## 0.11.2 (17-12-2020)
* Bugfixes

## 0.11.1 (16-12-2020)
* Bugfixes

## 0.11.0 (16-12-2020)
* XML and JS Hover Provider introduced
* XML formatter introduced
* Completion items for methods now contains description
* Bugfixes

## 0.10.9 (13-12-2020)
* JS Completion items for first paramether of array methods (map, forEach, filter, find) introduced
* Data types are now added depending on hungarian notation as well
* Bugfixes

## 0.10.8 (06-12-2020)
* Projects that has a namespaces starting with "sap." now works fine as well
* Bugfixes for XML completion items

## 0.10.7 (05-12-2020)
* XML aggregation completion items are now merged with completion items of default aggregation type
* Bugfixes

## 0.10.4 (02-12-2020)
* Automatic template insertion for .xml files added
* Bugfixes
* XML Completion items for custom controls added
* rejectUnauthorized setting added

## 0.10.3 (12-11-2020)
* Code Actions for JS added. Now you can import variables to sap.ui.define.
* Hotkeys for commands added
* Schema for manifest.json added
* JS Code Lens for i18n texts added

## 0.10.2 (10-11-2020)
* Bugfixes for js and xml parsing

## 0.10.0 (26-10-2020)
* Acorn-loose is now used as JS parser
* Bugfixes

## 0.9.8 (05-10-2020)
* Bugfixes
* XML Linting now checks for unused namespaces
* UI5 Metadata source URL can now be configured

## 0.9.7 (16-05-2020)
* Bugfixes for XML Linting
* UML Class Generation for .js files added

## 0.9.6 (29-04-2020)
* Bugfix for multiple workspaces, when there are multiple apps with same component name begining (thanks to @CarlosOrozco88)

## 0.9.5 (26-04-2020)
* Bugfix for XML Linting and View -> Controller switching issues (thanks to @jeremies)

## 0.9.4 (15-03-2020)
* Bugfixes

## 0.9.3 (15-03-2020)
* For convenience purposes now check for two source folders is supported: source folder from preferences ("src" as default) and webapp, if any is found - it will be used as source folder automatically.
* For "Export to i18n" command there is a list of text types to choose from
* For "Export to i18n" command three configuration options were added
* Bugfixes

## 0.9.2 (27-02-2020)
* Bugfixes for automatic file renaming on unix-like OS
* Bugfix for definition provider

## 0.9.1 (25-02-2020)
* Bugfixes for unix-like OS
* Bugfixes for XML Linting

## 0.9.0 (24-02-2020)
* Method and constructor Signature Helper is added.
* Custom class Method Completion Items now are generated using custom defined metadata, meaning that all property/event/aggregation/association methods will also be suggested.
* Now classes that returns objects only ("static classes", map of functions, usually formatters) are also recognized.
* XML linting is implemented. Now attribute values are validated.
* Improved parsing for custom classes. Now Class.prototype.method and Class.method are parsed as well.
* Bugfixes and refactoring
* CodeLens for i18n texts in xml introduced

## 0.8.7 (04-02-2020)
* Improvements for version support. Now UI5 1.73.1 should be working.
## 0.8.6 (03-02-2020)
* Bugfixes for xml completion items
* Added value helps for properties which has enum values for xml files

## 0.8.5 (31-01-2020)
* Bugfixes
* Added parsing of destructured objects in function params
* Performance improvement for initial completion item generating
* Dynamic completion items for XML views added. Now autocomplition works for properties and events.

## 0.8.4 (19-01-2020)
* Bugfixes
* Moving params of sap.ui.define is more trustworthy now

## 0.8.3 (13-01-2020)
* Proxy support is added. Now ui5.sap.com will be requested using environment variables https_proxy or http_proxy, if there are any.
* Now everything what is loaded from ui5.sap.com is cached.

## 0.8.2 (09-01-2020)
* Bugfixes
* Opening of the standard library documentation now happens on "Go to type definition" command instead of "Go to definition"

## 0.8.1 (23-12-2019)
* Bugfixes

## 0.8.0 (16-12-2019)
* Method definition finder now opens new tab in the browser with documentation for the standard sapui5 methods
* Dynamic completion items now works with method return data type

## 0.7.0 (05-12-2019)
* "Insert Custom Class name" command added
* Now code templates are automatically added to new .js files
* Now on file renaming all occurrences of previous class name are replaced with new class name (for now works for .js files only)
* Bugfixes for method definition finder
* Partial support for ES6 added

## 0.6.1 (01-12-2019)
* Patch with bugfixes
* Add support of Completion item generation depending on this.byId (previously worked with this.getView().byId only)
* Now the extension is initialized only if there is manifest.json found in the workspace

## 0.6.0 (27-11-2019)
* Added support of "Go to Definition" for custom methods
* Minor bugfixes and major code refactoring

## 0.5.0 (25-11-2019)
* Initial version of the extension pack