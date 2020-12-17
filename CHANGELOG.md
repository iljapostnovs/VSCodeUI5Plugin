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