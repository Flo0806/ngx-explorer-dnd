/**
 * Set styles to a HTMLElement.
 * @param dest HTMLElements style property.
 * @param source The styles as JS object.
 * @param importantProperties Name of important style properties. This properties will be set to `!important`.
 */
export function extendStyles(
  dest: CSSStyleDeclaration,
  source: Record<string, string>,
  importantProperties?: Set<string>
) {
  for (let key in source) {
    if (source.hasOwnProperty(key)) {
      const value = source[key];

      if (value) {
        dest.setProperty(
          key,
          value,
          importantProperties?.has(key) ? 'important' : ''
        );
      } else {
        dest.removeProperty(key);
      }
    }
  }

  return dest;
}
