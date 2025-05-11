// Simple arithmetic expression evaluator
// Supports: + - * / % ( ) and variables via lookup callback

class ExprEvaluator {
    constructor(lookupFn = (name) => 0) {
        this.lookup = lookupFn;
    }

    evaluate(expr) {
        const tokens = this.tokenize(expr);
        const rpn = this.toRPN(tokens);
        return this.evalRPN(rpn);
    }

    tokenize(expr) {
        const regex = /\s*([A-Za-z_][\w]*|\d+|[-+*/%()])/g;
        const tokens = [];
        let match;
        while ((match = regex.exec(expr))) {
            tokens.push(match[1]);
        }
        return tokens;
    }

    toRPN(tokens) {
        const output = [];
        const ops = [];
        const prec = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2 };

        for (let token of tokens) {
            if (/^\d+$/.test(token)) {
                output.push(Number(token));
            } else if (/^[A-Za-z_]\w*$/.test(token)) {
                output.push({ var: token });
            } else if (token in prec) {
                while (ops.length && prec[ops.at(-1)] >= prec[token]) {
                    output.push(ops.pop());
                }
                ops.push(token);
            } else if (token === '(') {
                ops.push(token);
            } else if (token === ')') {
                while (ops.length && ops.at(-1) !== '(') {
                    output.push(ops.pop());
                }
                ops.pop(); // remove '('
            }
        }
        return output.concat(ops.reverse());
    }

    evalRPN(rpn) {
        const stack = [];
        for (let token of rpn) {
            if (typeof token === 'number') {
                stack.push(token);
            } else if (typeof token === 'object' && token.var) {
                stack.push(Number(this.lookup(token.var) ?? 0));
            } else {
                const b = stack.pop();
                const a = stack.pop();
                switch (token) {
                    case '+': stack.push(a + b); break;
                    case '-': stack.push(a - b); break;
                    case '*': stack.push(a * b); break;
                    case '/': stack.push(Math.floor(a / b)); break;
                    case '%': stack.push(a % b); break;
                }
            }
        }
        return stack[0];
    }
}

module.exports = { ExprEvaluator }