const { ExprEvaluator } = require('../repl/expression-evaluator.js');

const scope = { a1: '12' };
const expr = '3 * (1 + a1 + b)';
const evaluator = new ExprEvaluator(name => {
  if (scope[name]) {
    return scope[name];
  } else {
    throw new Error('Undefined macro variable ' + name);
  }
});

try {
  console.log(evaluator.evaluate(expr));
} catch (err) {
  console.error(err.message);
}
