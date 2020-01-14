## 0.5.0 (25-11-2019)
* Initial version of the extension pack

## 0.6.0 (27-11-2019)
* Added support of "Go to Definition" for custom methods
* Minor bugfixes and major code refactoring

## 0.6.1 (01-12-2019)
* Patch with bugfixes
* Add support of Completion item generation depending on this.byId (previously worked with this.getView().byId only)
* Now the extension is initialized only if there is manifest.json found in the workspace

## 0.7.0 (05-12-2019)
* "Insert Custom Class name" command added
* Now code templates are automatically added to new .js files
* Now on file renaming all occurances of previous class name are replaced with new class name (for now works for .js files only)
* Bugfixes for method definition finder
* Partial support for ES6 added

## 0.8.0 (16-12-2019)
* Method definition finder now opens new tab in the browser with documentation for the standard sapui5 methods
* Dynamic completion items now works with method return data type

## 0.8.1 (23-12-2019)
* Bugfixes

## 0.8.2 (09-01-2020)
* Bugfixes
* Opening of the standard library documentation now happens on "Go to type definition" command instead of "Go to definition"

## 0.8.3 (13-01-2020)
* Proxy support is added. Now ui5.sap.com will be requested using environment variables https_proxy or http_proxy, if there are any.
* Now everything what is loaded from ui5.sap.com is cached.
