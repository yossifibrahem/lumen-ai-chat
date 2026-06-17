# UI themes

Selectable visual skins live here. To add a new theme:

1. Add a new stylesheet in this folder.
2. Add a disabled `<link>` for it in `templates/index.html` and `templates/startup_requirements.html`.
3. Register its key and link ID in `static/js/customization.js` inside `UI_THEME_STYLESHEETS`.
4. Add an `<option>` to the `cust-ui-theme` select in the Appearance tab.

The base app styles stay in `static/css/modules`. Theme files should only override visuals.
