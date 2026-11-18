import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// Resolve the original bundler-style imports without editing their source files.
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.') && context.parentURL) {
    const url = new URL(specifier, context.parentURL);
    if (existsSync(fileURLToPath(url) + '.ts')) return next(url.href + '.ts', context);
    if (url.pathname.endsWith('.json')) return next(url.href, { ...context, importAttributes: { type: 'json' } });
  }
  return next(specifier, context);
}, load(url, context, next) {
  if (url.endsWith('.json')) return {format:'module',source:'export default '+readFileSync(new URL(url),'utf8'),shortCircuit:true};
  return next(url, context);
}});
