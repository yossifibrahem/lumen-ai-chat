# Theme icon overrides

Default/global icons live in `static/js/icons/default.js`.

Theme icon packs live beside this file and are registered in `index.js` with the
same key used by `data-ui-theme`, for example `retro-pixel`.

A theme pack can be either:

- **Partial**: export only the icons that should look different.
- **Complete**: export every key from the default pack when the theme has a very
  different visual language, such as pixel art.

Example:

```js
export const MY_THEME_ICON_OVERRIDES = Object.freeze({
  logo: myIcon('<path d="..."/>'),
  send: myIcon('<path d="..."/>'),
});
```

Icons not listed by a theme automatically fall back to the default pack. This is
useful for small skins, but complete packs avoid visual mixing in strongly styled
themes.
