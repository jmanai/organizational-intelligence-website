import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

export function assessmentFixture(points = { MEET: [3,3,2,2], DECIDE: [2,2,2,1], SHARE: [2,2,2,1], AGREE: [2,1,1,1], ALIGN: [2,1,1,1] }) {
  const decode = value => value.replace(/&(rsquo|lsquo|rdquo|ldquo|mdash|ndash|amp|quot|hellip|nbsp);/g,
    (_, entity) => ({ rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', amp: '&', quot: '"', hellip: '…', nbsp: ' ' })[entity]);
  const source = readFileSync(new URL('../assets/js/check.js', import.meta.url), 'utf8')
    .replace(/  render\(\);\s*\}\)\(\);\s*$/, '  window.fixture = function(points, context) { state.context = context; return buildPayload(score(points)); };\n})();');
  const window = {};
  runInNewContext(source, { window, URLSearchParams, location: { search: '' },
    document: { referrer: '', getElementById: () => ({}), createElement: () => ({ innerHTML: '', get value() { return decode(this.innerHTML); } }) }
  });
  return JSON.parse(JSON.stringify(window.fixture(points, {
    firstName: 'Sample Report', email: 'sample@example.com', team: 'The leadership team', company: 'Northbank Group',
    role: 'Chief Operating Officer', teamSize: '11–20',
    oneThing: 'Stop having the same strategy conversation every month without anything changing afterwards.'
  })));
}
export function assessmentAssets() {
  return Object.fromEntries(Object.entries({
    anton: 'fonts/anton-latin-400-normal.ttf', archivo: 'fonts/archivo-latin-400-normal.ttf',
    archivoBold: 'fonts/archivo-latin-700-normal.ttf', courier: 'fonts/courier-prime-latin-400-normal.ttf',
    logoInk: 'img/logo-ink.png', logoLight: 'img/logo-light.png'
  }).map(([name, path]) => [name, readFileSync(new URL('../assets/' + path, import.meta.url))]));
}
