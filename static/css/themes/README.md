# UI themes

Selectable visual skins live here. To add a new theme:

1. Add a new stylesheet in this folder.
2. Add a disabled `<link>` for it in `templates/index.html` and `templates/startup_requirements.html`.
3. Register its key and link ID in `static/js/customization.js` inside `UI_THEME_STYLESHEETS`.
4. Add an `<option>` to the `cust-ui-theme` select in the Appearance tab.

The base app styles stay in `static/css/modules`. Theme files should only override visuals.

Theme-specific icons are optional. Default/global icons live in `static/js/icons/default.js`.
To override only the icons a theme needs, add a small override file in
`static/js/icons/themes/` and register it in `static/js/icons/themes/index.js`.
Any icon key not listed by the theme automatically uses the default icon.

Current optional skins:

- `retro-flat-pixel.css` → `retro-pixel`
- `vintage-typewriter.css` → `vintage-typewriter`
