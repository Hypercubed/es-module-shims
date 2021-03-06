import assert from 'assert';
import { analyzeModuleSyntax } from '../src/lexer.js';

function parse (source) {
  const result = analyzeModuleSyntax(source);
  if (result[2])
    throw result[2];
  return result;
}

suite('Lexer', () => {
  test('Simple import', () => {
    const source = `
      import test from "test";
      console.log(test);
    `;
    const [imports, exports] = parse(source);
    assert.equal(imports.length, 1);
    const { s, e, d } = imports[0];
    assert.equal(d, -1);
    assert.equal(source.slice(s, e), 'test');

    assert.equal(exports.length, 0);
  });

  test('Simple reexport', () => {
    const source = `
      export { hello as default } from "test-dep";
    `;
    const [imports, exports] = parse(source);
    assert.equal(imports.length, 1);
    const { s, e, d } = imports[0];
    assert.equal(d, -1);
    assert.equal(source.slice(s, e), 'test-dep');

    assert.equal(exports.length, 1); 
    assert.equal(exports[0], 'default');
  });

  test('import.meta', () => {
    const source = `
      export var hello = 'world';
      console.log(import.meta.url);
    `;
    const [imports, exports] = parse(source);
    assert.equal(imports.length, 1);
    const { s, e, d } = imports[0];
    assert.equal(d, -2);
    assert.equal(source.slice(s, e), 'import.meta');
  });

  test('import after code', () => {
    const source = `
      export function f () {
        g();
      }
      
      import { g } from './test-circular2.js';
    `;
    const [imports, exports] = parse(source);
    assert.equal(imports.length, 1);
    const { s, e, d } = imports[0];
    assert.equal(d, -1);
    assert.equal(source.slice(s, e), './test-circular2.js');

    assert.equal(exports.length, 1);
    assert.equal(exports[0], 'f');
  });

  test('Comments', () => {
    const source = `
      /**/
      // '
      /* / */
      /*

         * export { b }
      \\*/export { a }


      function () {
        /***/
      }
    `
    const [imports, exports] = parse(source);
    assert.equal(imports.length, 0);
    assert.equal(exports.length, 1);
    assert.equal(exports[0], 'a');
  });

  test('Strings', () => {
    const source = `
      "";
      \`
        \${
          import(\`test/\${ import(b)}\`); /*
              \`  }
          */
        }
      \`
      export { a }
    `
    const [imports, exports] = parse(source);
    assert.equal(imports.length, 2);
    assert.notEqual(imports[0].d, -1);
    assert.equal(source.slice(imports[0].s, imports[0].e), 'import');
    assert.notEqual(imports[1].d, -1);
    assert.equal(source.slice(imports[1].s, imports[1].e), 'import');
    assert.equal(exports.length, 1);
    assert.equal(exports[0], 'a');
  });

  test('Bracket matching', () => {
    parse(`
      instance.extend('parseExprAtom', function (nextMethod) {
        return function () {
          function parseExprAtom(refDestructuringErrors) {
            if (this.type === tt._import) {
              return parseDynamicImport.call(this);
            }
            return c(refDestructuringErrors);
          }
        }();
      });
      export { a }
    `);
  });

  test('Division / Regex ambiguity', () => {
    const source = `
      /as)df/; x();
      a / 2; '  /  '
      while (true)
        /test'/
      x-/a'/g
      finally{}/a'/g
      (){}/d'export { b }/g
      ;{}/e'/g;
      {}/f'/g
      a / 'b' / c;
      /a'/ - /b'/;
      +{} /g -'/g'
      ('a')/h -'/g'
      if //x
      ('a')/i'/g;
      /asdf/ / /as'df/; // '
      \`\${/test/ + 5}\`
      function () {
        return /*asdf8*// 5/;
      }
      export { a };
    `;
    const [imports, exports] = parse(source);
    assert.equal(imports.length, 0);
    assert.equal(exports.length, 1);
    assert.equal(exports[0], 'a');
  });
});