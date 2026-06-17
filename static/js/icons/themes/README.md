# Theme icon overrides

Default icons live in `static/js/icons/default.js` and are used globally.

A theme icon pack should export a small object containing only the keys it wants
to replace. Register that object in `index.js` using the same key as the UI theme.

Example:

```js
export const MY_THEME_ICON_OVERRIDES = Object.freeze({
  logo: myIcon('<path d="..."/>'),
  send: myIcon('<path d="..."/>'),
});
```

Icons not listed in a theme pack automatically fall back to the default pack.
