/* VizMath web studio for orlproducts.com/vizmath.html
 *
 * A small browser version of three things the app does: graph equations
 * (explicit and implicit curves, with sliders for any extra letter), draw a
 * surface z = f(x, y) in 3D, and solve a typed problem with numbered steps.
 *
 * No libraries. The math core (parser, exact fractions, symbolic derivative,
 * polynomial and numeric root finding, linear systems, inequalities) has no
 * DOM dependency and is exposed as window.VizMath so the self-test page
 * (vizmath-web.test.html) can check it. The UI part only starts when the
 * studio's markup is on the page. Everything runs locally; nothing typed into
 * the studio is sent anywhere.
 */
(function (global) {
  'use strict';

  /* ===================================================================
   * Strings. Steps and messages are generated here, so they are
   * translated here; the page's own labels go through orl-i18n.
   * =================================================================== */
  var STR = {
    en: {
      'err.empty': 'Type a problem first.',
      'err.char': 'Unexpected character “{0}”.',
      'err.end': 'The expression ends too early.',
      'err.unexpected': 'Unexpected “{0}”.',
      'err.paren': 'A “(” is missing its “)”.',
      'err.bar': 'An absolute value |…| is not closed.',
      'err.deep': 'The expression is nested too deeply.',
      'err.number': '“{0}” is not a valid number.',
      'err.fnarg': '{0} needs an argument, for example {0}(x).',
      'err.twoRel': 'Use at most one “=”, “<” or “>” per line.',
      'err.3dform': 'Use the form z = f(x, y).',
      'err.nonlinearSystem': 'This demo solves linear systems only. Each equation must be linear in {0}.',
      'err.systemVars': 'A system of {0} equations needs {0} unknowns (found {1}).',
      'err.integralForm': 'Write an integral like “integral of x^2 from 0 to 3” or “∫ x^2 dx from 0 to 3”.',
      'err.indefinite': 'Only polynomials get an antiderivative here. Add limits, for example “from 0 to 1”.',
      'err.bounds': 'The limits must be numbers.',
      'err.undefined': 'The expression is undefined for these values.',
      'err.nothing': 'Nothing to solve here.',
      'err.ineqVar': 'An inequality needs the unknown x.',
      'err.graphLine': 'Line {0}: {1}',
      'step.oneSide': 'Move everything to one side: {0} = 0',
      'step.linearForm': 'This is linear: a = {0}, b = {1} in ax + b = 0.',
      'step.linearSolve': 'Divide by a: x = −b / a = {0}',
      'step.quadForm': 'This is quadratic: a = {0}, b = {1}, c = {2}.',
      'step.disc': 'Discriminant: D = b² − 4ac = {0}',
      'step.discPos': 'D > 0, so there are two real roots: x = (−b ± √D) / (2a).',
      'step.discZero': 'D = 0, so there is one double root: x = −b / (2a).',
      'step.discNeg': 'D < 0, so there are no real roots. The complex roots are x = (−b ± i√−D) / (2a).',
      'step.constTrue': 'Every x cancels and what is left, 0 = 0, is always true.',
      'step.constFalse': 'Every x cancels and what is left, {0} = 0, is never true.',
      'step.ratRoots': 'Rational root test: {0} is a root. Divide it out.',
      'step.remainder': 'What remains has degree {0}: {1}',
      'step.numericPoly': 'Find the remaining roots numerically (Durand–Kerner), then polish with Newton’s method.',
      'step.numeric': 'This is not a polynomial equation, so VizMath samples {0} on [−100, 100] and refines every sign change by bisection.',
      'step.zeroRoot': 'Factor out x: x = 0 is a root.',
      'ans.noReal': 'No real solutions',
      'ans.noRealIn': 'No real solutions in [−100, 100]',
      'ans.all': 'All real numbers',
      'ans.none': 'No solution',
      'ans.complex': 'Complex roots: {0}',
      'ans.more': '… {0} roots in total in [−100, 100]',
      'ans.or': ' or ',
      'step.sysForm': 'Write each equation in standard form:',
      'step.sysMatrix': 'Augmented matrix: {0}',
      'step.sysSwap': 'Swap R{0} and R{1}.',
      'step.sysScale': 'R{0} ← R{0} ÷ {1}',
      'step.sysElim': 'R{0} ← R{0} − ({1})·R{2}',
      'step.sysResult': 'Reduced matrix: {0}',
      'ans.sysNone': 'No solution: the equations contradict each other.',
      'ans.sysInf': 'Infinitely many solutions: the equations are not independent.',
      'step.ineqForm': 'Move everything to one side: {0} {1} 0',
      'step.ineqCrit': 'Critical points (where the left side is 0 or undefined): {0}',
      'step.ineqNoCrit': 'The left side never changes sign.',
      'step.ineqTest': 'Test one point in each interval: {0}',
      'step.ineqFlip': 'Dividing by the negative number {0} flips the sign.',
      'step.ineqRange': 'Checked numerically on [−100, 100].',
      'step.arith': 'Evaluate exactly, keeping fractions as fractions.',
      'step.arithDec': 'The result is not a fraction, so it is given as a decimal.',
      'step.params': 'With {0}',
      'step.deriv': 'Differentiate {0} with respect to {1}.',
      'step.rules': 'Rules used: {0}',
      'step.derivSimplify': 'Simplify: {0}',
      'step.derivAt': 'At {0} = {1}: {2}',
      'rule.constant': 'constant',
      'rule.power': 'power rule',
      'rule.sum': 'sum rule',
      'rule.product': 'product rule',
      'rule.quotient': 'quotient rule',
      'rule.chain': 'chain rule',
      'rule.exp': 'exponential rule',
      'rule.log': 'logarithm rule',
      'rule.trig': 'trig derivatives',
      'step.intPoly': 'The integrand is a polynomial. Antiderivative: F(x) = {0}',
      'step.intEval': 'F({0}) − F({1}) = {2}',
      'step.intSimpson': 'No exact antiderivative is used here: Simpson’s rule with n = {0} subintervals.',
      'step.intIndef': 'Antiderivative: {0} + C',
      'fa.yint': 'y-intercept: f(0) = {0}',
      'fa.yintNone': 'y-intercept: f(0) is undefined',
      'fa.roots': 'Roots: {0}',
      'fa.rootsNone': 'Roots: none found',
      'fa.deriv1': 'f′(x) = {0}',
      'fa.deriv2': 'f″(x) = {0}',
      'fa.extrema': 'Extrema: {0}',
      'fa.extremaNone': 'Extrema: none',
      'fa.inflection': 'Inflection points: {0}',
      'fa.inflectionNone': 'Inflection points: none',
      'fa.max': 'max',
      'fa.min': 'min',
      'fa.vertex': 'vertex',
      'g.roots': 'roots',
      'g.yint': 'y-intercept',
      'g.extrema': 'extrema',
      'g.none': 'none',
      'g.implicit': 'implicit curve',
      'g.region': 'shaded region',
      'g.vertical': 'vertical line',
      'g.range': 'Roots and extrema are searched on [−100, 100].',
      'g.empty': 'Type an equation to draw it.',
      'g3.range': 'z from {0} to {1} on −{2} ≤ x, y ≤ {2}',
      'slider': 'Slider {0}',
      'answer': 'Answer',
      'steps': 'Steps',
      'plot.label': 'Plot of the result'
    },
    vi: {
      'err.empty': 'Hãy nhập một bài toán trước.',
      'err.char': 'Ký tự không hợp lệ “{0}”.',
      'err.end': 'Biểu thức kết thúc quá sớm.',
      'err.unexpected': 'Không mong đợi “{0}”.',
      'err.paren': 'Thiếu dấu “)” cho một dấu “(”.',
      'err.bar': 'Dấu giá trị tuyệt đối |…| chưa được đóng.',
      'err.deep': 'Biểu thức lồng nhau quá sâu.',
      'err.number': '“{0}” không phải là số hợp lệ.',
      'err.fnarg': '{0} cần một đối số, ví dụ {0}(x).',
      'err.twoRel': 'Mỗi dòng chỉ dùng tối đa một dấu “=”, “<” hoặc “>”.',
      'err.3dform': 'Hãy dùng dạng z = f(x, y).',
      'err.nonlinearSystem': 'Bản web này chỉ giải hệ phương trình tuyến tính. Mỗi phương trình phải tuyến tính theo {0}.',
      'err.systemVars': 'Hệ {0} phương trình cần {0} ẩn (tìm thấy {1}).',
      'err.integralForm': 'Hãy viết tích phân như “integral of x^2 from 0 to 3” hoặc “∫ x^2 dx from 0 to 3”.',
      'err.indefinite': 'Ở đây chỉ đa thức mới có nguyên hàm. Hãy thêm cận, ví dụ “from 0 to 1”.',
      'err.bounds': 'Các cận phải là số.',
      'err.undefined': 'Biểu thức không xác định với các giá trị này.',
      'err.nothing': 'Không có gì để giải.',
      'err.ineqVar': 'Bất phương trình cần có ẩn x.',
      'err.graphLine': 'Dòng {0}: {1}',
      'step.oneSide': 'Chuyển tất cả về một vế: {0} = 0',
      'step.linearForm': 'Đây là phương trình bậc nhất: a = {0}, b = {1} trong ax + b = 0.',
      'step.linearSolve': 'Chia cho a: x = −b / a = {0}',
      'step.quadForm': 'Đây là phương trình bậc hai: a = {0}, b = {1}, c = {2}.',
      'step.disc': 'Biệt thức: D = b² − 4ac = {0}',
      'step.discPos': 'D > 0 nên có hai nghiệm thực: x = (−b ± √D) / (2a).',
      'step.discZero': 'D = 0 nên có một nghiệm kép: x = −b / (2a).',
      'step.discNeg': 'D < 0 nên không có nghiệm thực. Nghiệm phức là x = (−b ± i√−D) / (2a).',
      'step.constTrue': 'Mọi x đều triệt tiêu và còn lại 0 = 0, luôn đúng.',
      'step.constFalse': 'Mọi x đều triệt tiêu và còn lại {0} = 0, không bao giờ đúng.',
      'step.ratRoots': 'Kiểm tra nghiệm hữu tỉ: {0} là một nghiệm. Chia đa thức cho nhân tử này.',
      'step.remainder': 'Phần còn lại có bậc {0}: {1}',
      'step.numericPoly': 'Tìm các nghiệm còn lại bằng phương pháp số (Durand–Kerner), rồi làm chính xác bằng phương pháp Newton.',
      'step.numeric': 'Đây không phải phương trình đa thức, nên VizMath lấy mẫu {0} trên [−100, 100] và chia đôi khoảng tại mỗi lần đổi dấu.',
      'step.zeroRoot': 'Đặt x làm nhân tử chung: x = 0 là một nghiệm.',
      'ans.noReal': 'Không có nghiệm thực',
      'ans.noRealIn': 'Không có nghiệm thực trong [−100, 100]',
      'ans.all': 'Mọi số thực',
      'ans.none': 'Vô nghiệm',
      'ans.complex': 'Nghiệm phức: {0}',
      'ans.more': '… tổng cộng {0} nghiệm trong [−100, 100]',
      'ans.or': ' hoặc ',
      'step.sysForm': 'Viết mỗi phương trình ở dạng chuẩn:',
      'step.sysMatrix': 'Ma trận mở rộng: {0}',
      'step.sysSwap': 'Đổi chỗ H{0} và H{1}.',
      'step.sysScale': 'H{0} ← H{0} ÷ {1}',
      'step.sysElim': 'H{0} ← H{0} − ({1})·H{2}',
      'step.sysResult': 'Ma trận rút gọn: {0}',
      'ans.sysNone': 'Vô nghiệm: các phương trình mâu thuẫn nhau.',
      'ans.sysInf': 'Vô số nghiệm: các phương trình không độc lập.',
      'step.ineqForm': 'Chuyển tất cả về một vế: {0} {1} 0',
      'step.ineqCrit': 'Các điểm tới hạn (vế trái bằng 0 hoặc không xác định): {0}',
      'step.ineqNoCrit': 'Vế trái không bao giờ đổi dấu.',
      'step.ineqTest': 'Thử một điểm trong mỗi khoảng: {0}',
      'step.ineqFlip': 'Chia cho số âm {0} thì đổi chiều bất đẳng thức.',
      'step.ineqRange': 'Đã kiểm tra bằng phương pháp số trên [−100, 100].',
      'step.arith': 'Tính chính xác, giữ phân số ở dạng phân số.',
      'step.arithDec': 'Kết quả không phải phân số nên được ghi dưới dạng thập phân.',
      'step.params': 'Với {0}',
      'step.deriv': 'Lấy đạo hàm của {0} theo {1}.',
      'step.rules': 'Các quy tắc đã dùng: {0}',
      'step.derivSimplify': 'Rút gọn: {0}',
      'step.derivAt': 'Tại {0} = {1}: {2}',
      'rule.constant': 'hằng số',
      'rule.power': 'quy tắc lũy thừa',
      'rule.sum': 'quy tắc tổng',
      'rule.product': 'quy tắc tích',
      'rule.quotient': 'quy tắc thương',
      'rule.chain': 'quy tắc hàm hợp',
      'rule.exp': 'quy tắc hàm mũ',
      'rule.log': 'quy tắc hàm logarit',
      'rule.trig': 'đạo hàm lượng giác',
      'step.intPoly': 'Hàm dưới dấu tích phân là đa thức. Nguyên hàm: F(x) = {0}',
      'step.intEval': 'F({0}) − F({1}) = {2}',
      'step.intSimpson': 'Không dùng nguyên hàm chính xác: quy tắc Simpson với n = {0} khoảng con.',
      'step.intIndef': 'Nguyên hàm: {0} + C',
      'fa.yint': 'Giao điểm với trục y: f(0) = {0}',
      'fa.yintNone': 'Giao điểm với trục y: f(0) không xác định',
      'fa.roots': 'Nghiệm: {0}',
      'fa.rootsNone': 'Nghiệm: không tìm thấy',
      'fa.deriv1': 'f′(x) = {0}',
      'fa.deriv2': 'f″(x) = {0}',
      'fa.extrema': 'Cực trị: {0}',
      'fa.extremaNone': 'Cực trị: không có',
      'fa.inflection': 'Điểm uốn: {0}',
      'fa.inflectionNone': 'Điểm uốn: không có',
      'fa.max': 'cực đại',
      'fa.min': 'cực tiểu',
      'fa.vertex': 'đỉnh',
      'g.roots': 'nghiệm',
      'g.yint': 'cắt trục y',
      'g.extrema': 'cực trị',
      'g.none': 'không có',
      'g.implicit': 'đường cong ẩn',
      'g.region': 'miền được tô',
      'g.vertical': 'đường thẳng đứng',
      'g.range': 'Nghiệm và cực trị được tìm trên [−100, 100].',
      'g.empty': 'Nhập một phương trình để vẽ.',
      'g3.range': 'z từ {0} đến {1} với −{2} ≤ x, y ≤ {2}',
      'slider': 'Thanh trượt {0}',
      'answer': 'Đáp án',
      'steps': 'Các bước',
      'plot.label': 'Đồ thị của kết quả'
    },
    es: {
      'err.empty': 'Escribe primero un problema.',
      'err.char': 'Carácter inesperado «{0}».',
      'err.end': 'La expresión termina demasiado pronto.',
      'err.unexpected': '«{0}» inesperado.',
      'err.paren': 'Falta el «)» de un «(».',
      'err.bar': 'Un valor absoluto |…| no está cerrado.',
      'err.deep': 'La expresión está anidada demasiado.',
      'err.number': '«{0}» no es un número válido.',
      'err.fnarg': '{0} necesita un argumento, por ejemplo {0}(x).',
      'err.twoRel': 'Usa como máximo un «=», «<» o «>» por línea.',
      'err.3dform': 'Usa la forma z = f(x, y).',
      'err.nonlinearSystem': 'Esta demo solo resuelve sistemas lineales. Cada ecuación debe ser lineal en {0}.',
      'err.systemVars': 'Un sistema de {0} ecuaciones necesita {0} incógnitas (se encontraron {1}).',
      'err.integralForm': 'Escribe una integral como «integral of x^2 from 0 to 3» o «∫ x^2 dx from 0 to 3».',
      'err.indefinite': 'Aquí solo los polinomios tienen primitiva. Añade límites, por ejemplo «from 0 to 1».',
      'err.bounds': 'Los límites deben ser números.',
      'err.undefined': 'La expresión no está definida para estos valores.',
      'err.nothing': 'No hay nada que resolver.',
      'err.ineqVar': 'Una inecuación necesita la incógnita x.',
      'err.graphLine': 'Línea {0}: {1}',
      'step.oneSide': 'Pasa todo a un lado: {0} = 0',
      'step.linearForm': 'Es lineal: a = {0}, b = {1} en ax + b = 0.',
      'step.linearSolve': 'Divide entre a: x = −b / a = {0}',
      'step.quadForm': 'Es cuadrática: a = {0}, b = {1}, c = {2}.',
      'step.disc': 'Discriminante: D = b² − 4ac = {0}',
      'step.discPos': 'D > 0, así que hay dos raíces reales: x = (−b ± √D) / (2a).',
      'step.discZero': 'D = 0, así que hay una raíz doble: x = −b / (2a).',
      'step.discNeg': 'D < 0, así que no hay raíces reales. Las raíces complejas son x = (−b ± i√−D) / (2a).',
      'step.constTrue': 'Todas las x se cancelan y queda 0 = 0, que siempre es cierto.',
      'step.constFalse': 'Todas las x se cancelan y queda {0} = 0, que nunca es cierto.',
      'step.ratRoots': 'Prueba de raíces racionales: {0} es una raíz. Se divide el polinomio por ese factor.',
      'step.remainder': 'Lo que queda tiene grado {0}: {1}',
      'step.numericPoly': 'Las raíces restantes se hallan numéricamente (Durand–Kerner) y se afinan con el método de Newton.',
      'step.numeric': 'No es una ecuación polinómica, así que VizMath muestrea {0} en [−100, 100] y afina cada cambio de signo por bisección.',
      'step.zeroRoot': 'Saca x como factor común: x = 0 es una raíz.',
      'ans.noReal': 'No hay soluciones reales',
      'ans.noRealIn': 'No hay soluciones reales en [−100, 100]',
      'ans.all': 'Todos los números reales',
      'ans.none': 'Sin solución',
      'ans.complex': 'Raíces complejas: {0}',
      'ans.more': '… {0} raíces en total en [−100, 100]',
      'ans.or': ' o ',
      'step.sysForm': 'Escribe cada ecuación en forma estándar:',
      'step.sysMatrix': 'Matriz ampliada: {0}',
      'step.sysSwap': 'Intercambia F{0} y F{1}.',
      'step.sysScale': 'F{0} ← F{0} ÷ {1}',
      'step.sysElim': 'F{0} ← F{0} − ({1})·F{2}',
      'step.sysResult': 'Matriz reducida: {0}',
      'ans.sysNone': 'Sin solución: las ecuaciones se contradicen.',
      'ans.sysInf': 'Infinitas soluciones: las ecuaciones no son independientes.',
      'step.ineqForm': 'Pasa todo a un lado: {0} {1} 0',
      'step.ineqCrit': 'Puntos críticos (donde el lado izquierdo vale 0 o no está definido): {0}',
      'step.ineqNoCrit': 'El lado izquierdo nunca cambia de signo.',
      'step.ineqTest': 'Prueba un punto de cada intervalo: {0}',
      'step.ineqFlip': 'Al dividir entre el número negativo {0}, el signo se invierte.',
      'step.ineqRange': 'Comprobado numéricamente en [−100, 100].',
      'step.arith': 'Calcula de forma exacta, manteniendo las fracciones.',
      'step.arithDec': 'El resultado no es una fracción, así que se da en decimal.',
      'step.params': 'Con {0}',
      'step.deriv': 'Deriva {0} respecto de {1}.',
      'step.rules': 'Reglas usadas: {0}',
      'step.derivSimplify': 'Simplifica: {0}',
      'step.derivAt': 'En {0} = {1}: {2}',
      'rule.constant': 'constante',
      'rule.power': 'regla de la potencia',
      'rule.sum': 'regla de la suma',
      'rule.product': 'regla del producto',
      'rule.quotient': 'regla del cociente',
      'rule.chain': 'regla de la cadena',
      'rule.exp': 'regla exponencial',
      'rule.log': 'regla del logaritmo',
      'rule.trig': 'derivadas trigonométricas',
      'step.intPoly': 'El integrando es un polinomio. Primitiva: F(x) = {0}',
      'step.intEval': 'F({0}) − F({1}) = {2}',
      'step.intSimpson': 'Aquí no se usa una primitiva exacta: regla de Simpson con n = {0} subintervalos.',
      'step.intIndef': 'Primitiva: {0} + C',
      'fa.yint': 'Corte con el eje y: f(0) = {0}',
      'fa.yintNone': 'Corte con el eje y: f(0) no está definido',
      'fa.roots': 'Raíces: {0}',
      'fa.rootsNone': 'Raíces: no se encontraron',
      'fa.deriv1': 'f′(x) = {0}',
      'fa.deriv2': 'f″(x) = {0}',
      'fa.extrema': 'Extremos: {0}',
      'fa.extremaNone': 'Extremos: ninguno',
      'fa.inflection': 'Puntos de inflexión: {0}',
      'fa.inflectionNone': 'Puntos de inflexión: ninguno',
      'fa.max': 'máx',
      'fa.min': 'mín',
      'fa.vertex': 'vértice',
      'g.roots': 'raíces',
      'g.yint': 'corte con y',
      'g.extrema': 'extremos',
      'g.none': 'ninguno',
      'g.implicit': 'curva implícita',
      'g.region': 'región sombreada',
      'g.vertical': 'recta vertical',
      'g.range': 'Las raíces y los extremos se buscan en [−100, 100].',
      'g.empty': 'Escribe una ecuación para dibujarla.',
      'g3.range': 'z de {0} a {1} en −{2} ≤ x, y ≤ {2}',
      'slider': 'Deslizador {0}',
      'answer': 'Respuesta',
      'steps': 'Pasos',
      'plot.label': 'Gráfica del resultado'
    }
  };

  function lang() {
    var l = (typeof document !== 'undefined' && document.documentElement.getAttribute('lang')) || 'en';
    l = l.toLowerCase().split('-')[0];
    return STR[l] ? l : 'en';
  }
  function T(key) {
    var s = STR[lang()][key] || STR.en[key] || key;
    for (var i = 1; i < arguments.length; i++) {
      s = s.split('{' + (i - 1) + '}').join(String(arguments[i]));
    }
    return s;
  }

  function MathError(key) {
    this.key = key;
    this.args = Array.prototype.slice.call(arguments, 1);
    this.message = T.apply(null, [key].concat(this.args));
  }

  /* ===================================================================
   * Exact numbers: a value is either a rational {n, d} with safe integer
   * parts, or a plain float when exactness is impossible or lost.
   * =================================================================== */
  var SAFE = 9007199254740991;
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
  function lcm(a, b) { return a / gcd(a, b) * b; }
  function Q(n, d) {
    if (d === undefined) d = 1;
    if (!Number.isInteger(n) || !Number.isInteger(d) || d === 0) return null;
    if (Math.abs(n) > SAFE || Math.abs(d) > SAFE) return null;
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d) || 1;
    return { n: n / g + 0, d: d / g };
  }
  function isQ(v) { return v !== null && typeof v === 'object' && v.t === undefined && typeof v.d === 'number'; }
  function F(v) { return isQ(v) ? v.n / v.d : v; }
  function qOr(n, d, f) { var q = Q(n, d); return q || f; }
  function vAdd(a, b) {
    if (isQ(a) && isQ(b)) return qOr(a.n * b.d + b.n * a.d, a.d * b.d, F(a) + F(b));
    return F(a) + F(b);
  }
  function vNeg(a) { return isQ(a) ? { n: -a.n + 0, d: a.d } : -a; }
  function vSub(a, b) { return vAdd(a, vNeg(b)); }
  function vMul(a, b) {
    if (isQ(a) && isQ(b)) return qOr(a.n * b.n, a.d * b.d, F(a) * F(b));
    return F(a) * F(b);
  }
  function vDiv(a, b) {
    if (isQ(a) && isQ(b)) { if (b.n === 0) return NaN; return qOr(a.n * b.d, a.d * b.n, F(a) / F(b)); }
    return F(a) / F(b);
  }
  function vIsZero(a) { return isQ(a) ? a.n === 0 : Math.abs(a) < 1e-12; }
  function vIsInt(a) { return isQ(a) ? a.d === 1 : Number.isInteger(a); }
  function vSign(a) { var f = F(a); return f > 0 ? 1 : f < 0 ? -1 : 0; }
  function vEq(a, b) { return vIsZero(vSub(a, b)); }
  function realPow(a, b) {
    if (a < 0 && !Number.isInteger(b)) {
      var r = approxRational(b, 99);
      if (r && r.d % 2 === 1) return (r.n % 2 === 0 ? 1 : -1) * Math.pow(-a, b);
      return NaN;
    }
    return Math.pow(a, b);
  }
  function vPow(a, b) {
    if (isQ(a) && isQ(b) && b.d === 1 && Math.abs(b.n) <= 64) {
      var e = Math.abs(b.n), r = Q(1), base = a;
      for (var i = 0; i < e; i++) { r = isQ(r) ? vMul(r, base) : r * F(base); }
      if (b.n < 0) r = vDiv(Q(1), r);
      return r;
    }
    if (isQ(a) && isQ(b) && b.d > 1 && a.n >= 0) {
      // exact roots of perfect powers, e.g. (9/4)^(1/2) = 3/2
      var rn = Math.round(Math.pow(a.n, 1 / b.d)), rd = Math.round(Math.pow(a.d, 1 / b.d));
      if (Math.pow(rn, b.d) === a.n && Math.pow(rd, b.d) === a.d) return vPow(Q(rn, rd), Q(b.n));
    }
    return realPow(F(a), F(b));
  }
  // Best rational with denominator <= maxD within a tight tolerance, else null.
  function approxRational(x, maxD, tol) {
    if (!isFinite(x)) return null;
    if (Number.isInteger(x)) return Q(x);
    tol = tol || 1e-11 * Math.max(1, Math.abs(x));
    var h0 = 0, h1 = 1, k0 = 1, k1 = 0, v = x;
    for (var i = 0; i < 40; i++) {
      var a = Math.floor(v);
      var h2 = a * h1 + h0, k2 = a * k1 + k0;
      if (k2 > maxD) break;
      if (Math.abs(h2 / k2 - x) <= tol) return Q(h2, k2);
      h0 = h1; h1 = h2; k0 = k1; k1 = k2;
      if (v - a === 0) break;
      v = 1 / (v - a);
    }
    return null;
  }
  function toV(x) { return approxRational(x, 10000) || x; }

  /* ===================================================================
   * Formatting
   * =================================================================== */
  function fmtNum(x, digits) {
    if (!isFinite(x)) return x > 0 ? '∞' : x < 0 ? '-∞' : 'undefined';
    digits = digits === undefined ? 6 : digits;
    if (Math.abs(x) < 1e-12) return '0';
    var r = Math.round(x);
    if (Math.abs(x - r) < 1e-9 * Math.max(1, Math.abs(x))) return String(r);
    var s;
    if (Math.abs(x) >= 1e7 || Math.abs(x) < 1e-5) s = x.toExponential(digits - 1).replace(/\.?0+e/, 'e');
    else s = x.toFixed(digits).replace(/\.?0+$/, '');
    return s === '-0' ? '0' : s;
  }
  function fmtV(v, digits) {
    if (isQ(v)) return v.d === 1 ? String(v.n) : v.n + '/' + v.d;
    return fmtNum(v, digits);
  }
  // ASCII math -> display: − × superscripts, √
  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  function pretty(s) {
    return String(s)
      .replace(/\^\((-?\d+)\)/g, function (m, d) { return d.split('').map(function (c) { return SUP[c]; }).join(''); })
      .replace(/\^(\d+)/g, function (m, d) { return d.split('').map(function (c) { return SUP[c]; }).join(''); })
      .replace(/sqrt\(/g, '√(')
      .replace(/\bpi\b/g, 'π')
      .replace(/\*/g, '·')
      .replace(/(^|[^e\d])-/g, '$1−')
      .replace(/^-/, '−');
  }

  /* ===================================================================
   * Lexer and recursive-descent parser
   * =================================================================== */
  var FUNCS = ['arcsin', 'arccos', 'arctan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh',
    'sqrt', 'cbrt', 'floor', 'ceil', 'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'abs', 'exp',
    'log', 'ln'];
  var ALIAS = { arcsin: 'asin', arccos: 'acos', arctan: 'atan' };
  var NAMES = FUNCS.concat(['pi']).sort(function (a, b) { return b.length - a.length; });

  function normalize(s) {
    return String(s)
      .replace(/[−–—]/g, '-')
      .replace(/[×·⋅∙]/g, '*')
      .replace(/÷/g, '/')
      .replace(/²/g, '^2').replace(/³/g, '^3')
      .replace(/√/g, 'sqrt')
      .replace(/π/g, 'pi')
      .replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/≠/g, '!=')
      .replace(/\*\*/g, '^')
      .replace(/[   ]/g, ' ');
  }

  function lex(src) {
    var s = normalize(src), toks = [], i = 0;
    while (i < s.length) {
      var c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        var m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i));
        // "2e" followed by a letter that is not an exponent: take only the digits
        if (!m) throw new MathError('err.number', c);
        var txt = m[0];
        if (/e/i.test(txt) && !/e[+-]?\d/i.test(txt)) txt = m[1];
        var dot = txt.indexOf('.'), v = parseFloat(txt), q = null;
        if (!/e/i.test(txt)) {
          if (dot < 0) q = Q(parseInt(txt, 10));
          else {
            var frac = txt.slice(dot + 1), whole = txt.slice(0, dot) || '0';
            if (frac.length <= 12) q = Q(parseInt(whole + frac, 10), Math.pow(10, frac.length));
          }
        }
        if (isNaN(v)) throw new MathError('err.number', txt);
        toks.push({ t: 'num', v: v, q: q, s: txt });
        i += txt.length;
        continue;
      }
      if (/[a-zA-Z]/.test(c)) {
        var run = /^[a-zA-Z]+/.exec(s.slice(i))[0], j = 0, low = run.toLowerCase();
        while (j < run.length) {
          var hit = null;
          for (var k = 0; k < NAMES.length; k++) {
            if (low.substr(j, NAMES[k].length) === NAMES[k]) { hit = NAMES[k]; break; }
          }
          if (hit) { toks.push({ t: hit === 'pi' ? 'id' : 'fn', v: ALIAS[hit] || hit }); j += hit.length; }
          else { toks.push({ t: 'id', v: run[j] }); j++; }
        }
        i += run.length;
        continue;
      }
      var two = s.substr(i, 2);
      if (two === '<=' || two === '>=' || two === '!=') { toks.push({ t: 'cmp', v: two }); i += 2; continue; }
      if (c === '=' || c === '<' || c === '>') { toks.push({ t: 'cmp', v: c }); i++; continue; }
      if ('+-*/^'.indexOf(c) >= 0) { toks.push({ t: 'op', v: c }); i++; continue; }
      if (c === '(' || c === '[' || c === '{') { toks.push({ t: '(' , v: '(' }); i++; continue; }
      if (c === ')' || c === ']' || c === '}') { toks.push({ t: ')', v: ')' }); i++; continue; }
      if (c === '|') { toks.push({ t: '|', v: '|' }); i++; continue; }
      if (c === ',') { toks.push({ t: ',', v: ',' }); i++; continue; }
      throw new MathError('err.char', c);
    }
    toks.push({ t: 'end', v: '' });
    return toks;
  }

  // AST constructors
  function N(v, q) {
    if (isQ(v)) return { t: 'num', v: F(v), q: v };
    return { t: 'num', v: v, q: q === undefined ? (Number.isInteger(v) ? Q(v) : null) : q };
  }
  function Var(n) { return n === 'pi' || n === 'e' ? { t: 'const', n: n } : { t: 'var', n: n }; }
  function B(op, a, b) { return { t: 'bin', op: op, a: a, b: b }; }
  function Neg(a) { return { t: 'neg', a: a }; }
  function Fn(f, a) { return { t: 'fn', f: f, a: a }; }
  function nodeVal(n) { return n.q || n.v; }

  function Parser(toks) { this.toks = toks; this.p = 0; this.depth = 0; }
  Parser.prototype.peek = function () { return this.toks[this.p]; };
  Parser.prototype.next = function () { return this.toks[this.p++]; };
  Parser.prototype.fail = function (tok) {
    if (tok.t === 'end') throw new MathError('err.end');
    throw new MathError('err.unexpected', tok.v);
  };
  Parser.prototype.enter = function () { if (++this.depth > 120) throw new MathError('err.deep'); };
  Parser.prototype.expr = function () {
    this.enter();
    var a = this.term();
    while (this.peek().t === 'op' && (this.peek().v === '+' || this.peek().v === '-')) {
      var op = this.next().v;
      a = B(op, a, this.term());
    }
    this.depth--;
    return a;
  };
  Parser.prototype.startsPrimary = function (t) {
    return t.t === 'num' || t.t === 'id' || t.t === 'fn' || t.t === '(';
  };
  Parser.prototype.term = function () {
    var a = this.unary();
    for (;;) {
      var t = this.peek();
      if (t.t === 'op' && (t.v === '*' || t.v === '/')) { this.next(); a = B(t.v, a, this.unary()); }
      else if (this.startsPrimary(t)) { a = B('*', a, this.power()); }
      else break;
    }
    return a;
  };
  Parser.prototype.unary = function () {
    var t = this.peek();
    if (t.t === 'op' && t.v === '-') { this.next(); this.enter(); var u = this.unary(); this.depth--; return Neg(u); }
    if (t.t === 'op' && t.v === '+') { this.next(); return this.unary(); }
    return this.power();
  };
  Parser.prototype.power = function () {
    var base = this.primary();
    if (this.peek().t === 'op' && this.peek().v === '^') {
      this.next();
      this.enter();
      var e = this.unary();
      this.depth--;
      return B('^', base, e);
    }
    return base;
  };
  Parser.prototype.primary = function () {
    var t = this.next();
    if (t.t === 'num') return N(t.v, t.q);
    if (t.t === 'id') return Var(t.v);
    if (t.t === 'fn') {
      var powE = null;
      // sin^2(x)
      if (this.peek().t === 'op' && this.peek().v === '^' && this.toks[this.p + 1].t === 'num') {
        this.next(); var nt = this.next(); powE = N(nt.v, nt.q);
      }
      var nx = this.peek(), arg;
      if (nx.t === '(') { this.next(); arg = this.expr(); this.close(); }
      else if (this.startsPrimary(nx) || (nx.t === 'op' && nx.v === '-')) { this.enter(); arg = this.unary(); this.depth--; }
      else throw new MathError('err.fnarg', t.v);
      var f = Fn(t.v, arg);
      return powE ? B('^', f, powE) : f;
    }
    if (t.t === '(') { var e = this.expr(); this.close(); return e; }
    if (t.t === '|') {
      var inner = this.expr();
      if (this.peek().t !== '|') throw new MathError('err.bar');
      this.next();
      return Fn('abs', inner);
    }
    this.fail(t);
  };
  Parser.prototype.close = function () {
    if (this.peek().t !== ')') { if (this.peek().t === 'end') throw new MathError('err.paren'); this.fail(this.peek()); }
    this.next();
  };

  // parse an expression or a relation (one = < > <= >= != at most)
  function parseRelation(src) {
    var ps = new Parser(lex(src));
    var lhs = ps.expr(), t = ps.peek();
    if (t.t === 'end') return { expr: lhs };
    if (t.t !== 'cmp') ps.fail(t);
    ps.next();
    var rhs = ps.expr();
    if (ps.peek().t === 'cmp') throw new MathError('err.twoRel');
    if (ps.peek().t !== 'end') ps.fail(ps.peek());
    return { lhs: lhs, op: t.v, rhs: rhs };
  }
  function parse(src) {
    var r = parseRelation(src);
    if (!r.expr) throw new MathError('err.unexpected', r.op);
    return r.expr;
  }

  /* ===================================================================
   * Evaluation
   * =================================================================== */
  var FN = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, sqrt: Math.sqrt, cbrt: Math.cbrt,
    abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp, floor: Math.floor, ceil: Math.ceil,
    sec: function (x) { return 1 / Math.cos(x); }, csc: function (x) { return 1 / Math.sin(x); },
    cot: function (x) { return 1 / Math.tan(x); }
  };
  function compile(node) {
    switch (node.t) {
      case 'num': var v = node.v; return function () { return v; };
      case 'const': var c = node.n === 'pi' ? Math.PI : Math.E; return function () { return c; };
      case 'var': var n = node.n; return function (env) { var x = env[n]; return x === undefined ? NaN : x; };
      case 'neg': var a = compile(node.a); return function (env) { return -a(env); };
      case 'fn': var f = FN[node.f], g = compile(node.a); return function (env) { return f(g(env)); };
      case 'bin':
        var l = compile(node.a), r = compile(node.b);
        switch (node.op) {
          case '+': return function (env) { return l(env) + r(env); };
          case '-': return function (env) { return l(env) - r(env); };
          case '*': return function (env) { return l(env) * r(env); };
          case '/': return function (env) { return l(env) / r(env); };
          case '^': return function (env) { return realPow(l(env), r(env)); };
        }
    }
    return function () { return NaN; };
  }
  function freeVars(node, set) {
    set = set || {};
    if (node.t === 'var') set[node.n] = true;
    if (node.a) freeVars(node.a, set);
    if (node.b) freeVars(node.b, set);
    return set;
  }
  function hasVar(node, x) {
    if (node.t === 'var') return node.n === x;
    return !!((node.a && hasVar(node.a, x)) || (node.b && hasVar(node.b, x)));
  }
  // replace variables by numbers
  function subst(node, env) {
    switch (node.t) {
      case 'var': return env[node.n] !== undefined ? N(env[node.n]) : node;
      case 'neg': return Neg(subst(node.a, env));
      case 'fn': return Fn(node.f, subst(node.a, env));
      case 'bin': return B(node.op, subst(node.a, env), subst(node.b, env));
    }
    return node;
  }
  function substNode(node, name, repl) {
    switch (node.t) {
      case 'var': return node.n === name ? repl : node;
      case 'neg': return Neg(substNode(node.a, name, repl));
      case 'fn': return Fn(node.f, substNode(node.a, name, repl));
      case 'bin': return B(node.op, substNode(node.a, name, repl), substNode(node.b, name, repl));
    }
    return node;
  }

  // exact function values where they exist
  function fnExact(f, a) {
    if (isQ(a)) {
      if (f === 'abs') return Q(Math.abs(a.n), a.d);
      if (f === 'floor') return Q(Math.floor(a.n / a.d));
      if (f === 'ceil') return Q(Math.ceil(a.n / a.d));
      if (f === 'sqrt' && a.n >= 0) { var r = vPow(a, Q(1, 2)); if (isQ(r)) return r; }
      if (f === 'cbrt') {
        var s = a.n < 0 ? -1 : 1, c = vPow(Q(Math.abs(a.n), a.d), Q(1, 3));
        if (isQ(c)) return Q(s * c.n, c.d);
      }
      if (a.n === 0 && (f === 'sin' || f === 'tan' || f === 'asin' || f === 'atan' || f === 'sinh' || f === 'tanh')) return Q(0);
      if (a.n === 0 && (f === 'cos' || f === 'cosh' || f === 'exp')) return Q(1);
      if (a.n === a.d && (f === 'ln' || f === 'log')) return Q(0);
      if (f === 'log' && a.d === 1 && a.n > 0) {
        var l = Math.round(Math.log10(a.n));
        if (Math.pow(10, l) === a.n) return Q(l);
      }
    }
    return FN[f](F(a));
  }
  function evalExact(node, env) {
    switch (node.t) {
      case 'num': return node.q || node.v;
      case 'const': return node.n === 'pi' ? Math.PI : Math.E;
      case 'var': var v = env[node.n]; return v === undefined ? NaN : v;
      case 'neg': return vNeg(evalExact(node.a, env));
      case 'fn':
        if (node.f === 'ln' && node.a.t === 'const' && node.a.n === 'e') return Q(1);
        return fnExact(node.f, evalExact(node.a, env));
      case 'bin':
        var a = evalExact(node.a, env), b = evalExact(node.b, env);
        switch (node.op) {
          case '+': return vAdd(a, b);
          case '-': return vSub(a, b);
          case '*': return vMul(a, b);
          case '/': return vDiv(a, b);
          case '^': return vPow(a, b);
        }
    }
    return NaN;
  }

  /* ===================================================================
   * Polynomials (coefficient arrays, index = power) with exact values
   * =================================================================== */
  var MAXDEG = 30;
  function pTrim(p) {
    while (p.length > 1 && vIsZero(p[p.length - 1])) p.pop();
    return p;
  }
  function pAdd(a, b) {
    var r = [];
    for (var i = 0; i < Math.max(a.length, b.length); i++) r.push(vAdd(a[i] || Q(0), b[i] || Q(0)));
    return pTrim(r);
  }
  function pMul(a, b) {
    if (a.length + b.length - 2 > MAXDEG) return null;
    var r = [];
    for (var i = 0; i < a.length + b.length - 1; i++) r.push(Q(0));
    for (i = 0; i < a.length; i++) for (var j = 0; j < b.length; j++) r[i + j] = vAdd(r[i + j], vMul(a[i], b[j]));
    return pTrim(r);
  }
  function toPoly(node, x, env) {
    switch (node.t) {
      case 'num': return [node.q || node.v];
      case 'const': return [node.n === 'pi' ? Math.PI : Math.E];
      case 'var':
        if (node.n === x) return [Q(0), Q(1)];
        return env[node.n] !== undefined ? [env[node.n]] : null;
      case 'neg': var p = toPoly(node.a, x, env); return p && p.map(vNeg);
      case 'fn':
        var a = toPoly(node.a, x, env);
        if (!a || a.length > 1) return null;
        return [fnExact(node.f, a[0])];
      case 'bin':
        var l = toPoly(node.a, x, env); if (!l) return null;
        var r = toPoly(node.b, x, env); if (!r) return null;
        switch (node.op) {
          case '+': return pAdd(l, r);
          case '-': return pAdd(l, r.map(vNeg));
          case '*': return pMul(l, r);
          case '/':
            if (r.length > 1 || vIsZero(r[0])) return null;
            return pTrim(l.map(function (c) { return vDiv(c, r[0]); }));
          case '^':
            if (r.length > 1) return null;
            if (l.length === 1) return [vPow(l[0], r[0])];
            var e = r[0];
            if (!vIsInt(e) || F(e) < 0 || F(e) > MAXDEG) return null;
            var res = [Q(1)];
            for (var i = 0; i < F(e); i++) { res = pMul(res, l); if (!res) return null; }
            return res;
        }
    }
    return null;
  }
  function pEval(p, x) { var r = 0; for (var i = p.length - 1; i >= 0; i--) r = r * x + F(p[i]); return r; }
  function pEvalV(p, x) { var r = Q(0); for (var i = p.length - 1; i >= 0; i--) r = vAdd(vMul(r, x), p[i]); return r; }
  function pDeriv(p) { var r = []; for (var i = 1; i < p.length; i++) r.push(vMul(p[i], Q(i))); return r.length ? r : [Q(0)]; }
  function polyToStr(p, x) {
    x = x || 'x';
    var parts = [];
    for (var i = p.length - 1; i >= 0; i--) {
      var c = p[i];
      if (vIsZero(c)) continue;
      var neg = vSign(c) < 0, a = neg ? vNeg(c) : c, cs = fmtV(a), mon = i === 0 ? '' : i === 1 ? x : x + '^' + i;
      var t;
      if (!mon) t = cs;
      else if (isQ(a) && a.n === 1 && a.d === 1) t = mon;
      else if (isQ(a) && a.d !== 1) t = (a.n === 1 ? '' : a.n) + mon + '/' + a.d;
      else t = cs + mon;
      parts.push({ neg: neg, t: t });
    }
    if (!parts.length) return '0';
    return parts.map(function (pt, k) { return k === 0 ? (pt.neg ? '-' : '') + pt.t : (pt.neg ? ' - ' : ' + ') + pt.t; }).join('');
  }
  function allQ(p) { return p.every(isQ); }

  /* Surds: sqrt of a non-negative rational as  s·√r / q  with r squarefree */
  function surd(v) { // v: Q >= 0 → {s: Q coefficient, r: integer radicand}
    var N0 = v.n * v.d; // √(n/d) = √(n·d)/d
    if (!Number.isSafeInteger(N0)) return null;
    var s = 1, r = N0;
    for (var k = 2; k * k <= r; k++) { while (r % (k * k) === 0) { r /= k * k; s *= k; } }
    return { s: Q(s, v.d), r: r };
  }
  // format  A ± B·√r   (unit = 'i' for complex)
  function fmtPlusMinus(A, Bc, r, unit) {
    unit = unit || '';
    var rad = r === 1 ? '' : '√' + r;
    var tail = rad + (unit ? (rad ? ' ' : '') + unit : '');
    if (vIsZero(A)) {
      var n = Bc.n === 1 && tail ? '' : String(Bc.n);
      return '±' + n + tail + (Bc.d === 1 ? '' : '/' + Bc.d);
    }
    var L = lcm(A.d, Bc.d), an = A.n * (L / A.d), bn = Bc.n * (L / Bc.d);
    var num = an + ' ± ' + (bn === 1 && tail ? '' : bn) + tail;
    return L === 1 ? num : '(' + num + ')/' + L;
  }
  function fmtSurd(A, Bc, r, sign) { // single root A + sign·B√r
    var rad = r === 1 ? '' : '√' + r;
    var L = lcm(A.d, Bc.d), an = A.n * (L / A.d), bn = Bc.n * (L / Bc.d);
    var bpart = (bn === 1 && rad ? '' : String(bn)) + rad;
    var num;
    if (an === 0) num = (sign < 0 ? '-' : '') + bpart;
    else num = an + (sign < 0 ? ' - ' : ' + ') + bpart;
    if (L === 1) return num;
    return (an === 0 ? num : '(' + num + ')') + '/' + L;
  }

  // Durand–Kerner: all complex roots of a float polynomial
  function dkRoots(p) {
    var n = p.length - 1, lead = F(p[n]), c = p.map(function (v) { return F(v) / lead; });
    var re = [], im = [];
    for (var k = 0; k < n; k++) { var ang = 2 * Math.PI * k / n + 0.4; re.push(Math.cos(ang) * 1.1); im.push(Math.sin(ang) * 1.1); }
    for (var it = 0; it < 2000; it++) {
      var delta = 0;
      for (var i = 0; i < n; i++) {
        // value at z_i
        var vr = 1, vi = 0;
        for (var d = n - 1; d >= 0; d--) { var tr = vr * re[i] - vi * im[i] + c[d]; vi = vr * im[i] + vi * re[i]; vr = tr; }
        var dr = 1, di = 0;
        for (var j = 0; j < n; j++) {
          if (j === i) continue;
          var xr = re[i] - re[j], xi = im[i] - im[j];
          var t2 = dr * xr - di * xi; di = dr * xi + di * xr; dr = t2;
        }
        var den = dr * dr + di * di;
        if (den === 0) { dr = 1e-12; den = 1e-24; }
        var qr = (vr * dr + vi * di) / den, qi = (vi * dr - vr * di) / den;
        re[i] -= qr; im[i] -= qi;
        delta = Math.max(delta, Math.abs(qr) + Math.abs(qi));
      }
      if (delta < 1e-15) break;
    }
    var out = [];
    for (i = 0; i < n; i++) out.push({ re: re[i], im: im[i] });
    return out;
  }

  function divisors(n) {
    n = Math.abs(n);
    var r = [];
    for (var i = 1; i * i <= n; i++) if (n % i === 0) { r.push(i); if (i * i !== n) r.push(n / i); }
    return r;
  }
  function syntheticDiv(p, r) { // divide by (x - r), exact
    var n = p.length - 1, out = new Array(n), acc = Q(0);
    for (var i = n; i >= 1; i--) { acc = vAdd(vMul(acc, r), p[i]); out[i - 1] = acc; }
    return out;
  }

  /* Real roots of a polynomial, exact where possible.
   * Returns { roots: [{v, s}], complex: string|null, steps: [], kind } */
  function polyRoots(p0, opts) {
    opts = opts || {};
    var p = pTrim(p0.slice()), steps = [], roots = [], complex = null;
    var deg = p.length - 1;
    function addRoot(v, s) {
      for (var i = 0; i < roots.length; i++) if (Math.abs(roots[i].v - v) < 1e-9 * Math.max(1, Math.abs(v))) { roots[i].mult = (roots[i].mult || 1) + 1; return; }
      roots.push({ v: v, s: s, mult: 1 });
    }
    // factor out x
    while (p.length > 1 && vIsZero(p[0]) && deg > 2) {
      p = p.slice(1); deg--;
      if (!roots.length) steps.push(T('step.zeroRoot'));
      addRoot(0, '0');
    }
    // rational roots for degree >= 3 with rational coefficients
    if (deg >= 3 && allQ(p)) {
      var L = 1;
      p.forEach(function (c) { L = lcm(L, c.d); });
      var ints = p.map(function (c) { return c.n * (L / c.d); });
      if (ints.every(Number.isSafeInteger) && Math.abs(ints[0]) <= 1e7 && Math.abs(ints[deg]) <= 1e7) {
        var guard = 0, found = true;
        while (found && deg >= 3 && guard++ < 40) {
          found = false;
          if (vIsZero(p[0])) { p = p.slice(1); deg--; addRoot(0, '0'); steps.push(T('step.ratRoots', '0')); found = true; continue; }
          L = 1; p.forEach(function (c) { L = lcm(L, c.d); });
          ints = p.map(function (c) { return c.n * (L / c.d); });
          var P = divisors(ints[0]), Qs = divisors(ints[deg]);
          if (P.length * Qs.length > 4000) break;
          var cands = [];
          P.forEach(function (a) { Qs.forEach(function (b) { cands.push(Q(a, b), Q(-a, b)); }); });
          cands.sort(function (a, b) { return Math.abs(F(a)) - Math.abs(F(b)) || F(a) - F(b); });
          for (var ci = 0; ci < cands.length; ci++) {
            var val = pEvalV(p, cands[ci]);
            if (isQ(val) && val.n === 0) {
              addRoot(F(cands[ci]), fmtV(cands[ci]));
              steps.push(T('step.ratRoots', 'x = ' + fmtV(cands[ci])));
              p = syntheticDiv(p, cands[ci]); deg--;
              found = true;
              break;
            }
          }
        }
        if (roots.length && deg >= 1) steps.push(T('step.remainder', deg, polyToStr(p) + ' = 0'));
      }
    }
    if (deg === 1) {
      var r1 = vDiv(vNeg(p[0]), p[1]);
      addRoot(F(r1), fmtV(r1));
    } else if (deg === 2) {
      var a = p[2], b = p[1], c = p[0];
      var D = vSub(vMul(b, b), vMul(Q(4), vMul(a, c)));
      if (!opts.quiet) {
        steps.push(T('step.quadForm', fmtV(a), fmtV(b), fmtV(c)));
        steps.push(T('step.disc', fmtV(D)));
      }
      var two_a = vMul(Q(2), a), A = vDiv(vNeg(b), two_a);
      var exact = isQ(D) && isQ(A);
      if (vIsZero(D)) {
        if (!opts.quiet) steps.push(T('step.discZero'));
        addRoot(F(A), fmtV(A)); roots[roots.length - 1].mult = 2;
      } else if (F(D) > 0) {
        if (!opts.quiet) steps.push(T('step.discPos'));
        var sq = Math.sqrt(F(D)), x1 = (-F(b) - sq) / (2 * F(a)), x2 = (-F(b) + sq) / (2 * F(a));
        if (x1 > x2) { var tmp = x1; x1 = x2; x2 = tmp; }
        var s1 = null, s2 = null;
        if (exact) {
          var su = surd(D);
          if (su) {
            var Bc = vDiv(su.s, two_a); if (vSign(Bc) < 0) Bc = vNeg(Bc);
            if (isQ(Bc)) {
              if (su.r === 1) { s1 = fmtV(toV(x1)); s2 = fmtV(toV(x2)); }
              else { s1 = fmtSurd(A, Bc, su.r, -1); s2 = fmtSurd(A, Bc, su.r, 1); roots.pm = 'x = ' + fmtPlusMinus(A, Bc, su.r); }
            }
          }
        }
        addRoot(x1, s1); addRoot(x2, s2);
      } else {
        if (!opts.quiet) steps.push(T('step.discNeg'));
        if (exact) {
          var sn = surd(vNeg(D));
          if (sn) {
            var Bi = vDiv(sn.s, two_a); if (vSign(Bi) < 0) Bi = vNeg(Bi);
            complex = 'x = ' + fmtPlusMinus(A, Bi, sn.r, 'i');
          }
        }
        if (!complex) {
          var im = Math.sqrt(-F(D)) / Math.abs(2 * F(a));
          complex = 'x = ' + fmtNum(F(A), 4) + ' ± ' + fmtNum(im, 4) + 'i';
        }
      }
    } else if (deg >= 3) {
      steps.push(T('step.numericPoly'));
      var cr = dkRoots(p), nonreal = [];
      cr.forEach(function (z) {
        if (Math.abs(z.im) < 1e-6 * (1 + Math.abs(z.re))) {
          var x = z.re;
          for (var k = 0; k < 30; k++) {
            var fx = pEval(p, x), d = pEval(pDeriv(p), x);
            if (!d) break;
            var nx = x - fx / d;
            if (!isFinite(nx)) break;
            if (Math.abs(nx - x) < 1e-15) { x = nx; break; }
            x = nx;
          }
          var snap = Math.round(x * 1e8) / 1e8;
          if (Math.abs(pEval(p, snap)) <= Math.abs(pEval(p, x))) x = snap;
          addRoot(x, null);
        } else if (z.im > 0) nonreal.push(z);
      });
      if (!roots.length && nonreal.length) {
        complex = nonreal.map(function (z) { return fmtNum(z.re, 4) + ' ± ' + fmtNum(z.im, 4) + 'i'; }).join(', ');
      }
    }
    roots.sort(function (a, b) { return a.v - b.v; });
    return { roots: roots, complex: complex, steps: steps, degree: p0.length - 1, pm: roots.pm };
  }

  /* ===================================================================
   * Numeric roots for anything (sampling + bisection)
   * =================================================================== */
  function numericRoots(f, lo, hi, n) {
    lo = lo === undefined ? -100 : lo; hi = hi === undefined ? 100 : hi; n = n || 20000;
    var h = (hi - lo) / n, roots = [], poles = [];
    function push(list, x) {
      for (var i = 0; i < list.length; i++) if (Math.abs(list[i] - x) < h * 0.6) return;
      list.push(x);
    }
    var x0 = lo, y0 = f(x0), xp = NaN, yp = NaN;
    for (var i = 1; i <= n; i++) {
      var x1 = lo + i * h, y1 = f(x1);
      if (isFinite(y0) && y0 === 0) push(roots, x0);
      else if (isFinite(y0) && isFinite(y1) && y0 * y1 < 0) {
        var a = x0, b = x1, fa = y0;
        for (var k = 0; k < 80; k++) {
          var m = (a + b) / 2, fm = f(m);
          if (!isFinite(fm)) break;
          if (fm === 0) { a = b = m; break; }
          if (fa * fm < 0) b = m; else { a = m; fa = fm; }
        }
        var r = (a + b) / 2, fr = Math.abs(f(r));
        if (fr < 1e-6 || fr <= Math.min(Math.abs(y0), Math.abs(y1)) * 1e-3) push(roots, r);
        else push(poles, r);
      } else if (isFinite(yp) && isFinite(y0) && isFinite(y1) && Math.abs(y0) < Math.abs(yp) && Math.abs(y0) <= Math.abs(y1) && yp * y1 > 0 && y0 * y1 >= 0) {
        // touching root: minimise |f| on [xp, x1]
        var A = xp, Bb = x1, g = 0.6180339887;
        for (var kk = 0; kk < 80; kk++) {
          var c1 = Bb - g * (Bb - A), c2 = A + g * (Bb - A);
          if (Math.abs(f(c1)) < Math.abs(f(c2))) Bb = c2; else A = c1;
        }
        var t = (A + Bb) / 2;
        if (Math.abs(f(t)) < 1e-9) push(roots, t);
      } else if (isFinite(y0) !== isFinite(y1)) {
        push(poles, isFinite(y0) ? x1 : x0);
      }
      xp = x0; yp = y0; x0 = x1; y0 = y1;
    }
    roots = roots.map(function (r) {
      var s = Math.round(r * 1e9) / 1e9;
      return Math.abs(f(s)) <= Math.abs(f(r)) ? s : r;
    });
    roots.sort(function (a, b) { return a - b; });
    poles.sort(function (a, b) { return a - b; });
    return { roots: roots, poles: poles };
  }

  // Real roots of node in variable x, exact where possible.
  function realRoots(node, x, env) {
    var p = toPoly(node, x, env || {});
    if (p) {
      p = pTrim(p);
      if (p.length === 1) return { roots: [], constant: p[0], poly: p };
      var pr = polyRoots(p, { quiet: true });
      return { roots: pr.roots, poly: p, complex: pr.complex };
    }
    var f = compile(node), e = Object.assign({}, env ? toFloatEnv(env) : {});
    var nr = numericRoots(function (t) { e[x] = t; return f(e); });
    return { roots: nr.roots.map(function (v) { return { v: v, s: null }; }), poles: nr.poles, numeric: true };
  }
  function toFloatEnv(env) { var o = {}; for (var k in env) o[k] = F(env[k]); return o; }
  function rootStr(r, digits) { return r.s ? r.s : fmtNum(r.v, digits || 4); }
  function rootStrApprox(r) {
    if (r.s && /[√/]/.test(r.s)) return r.s + ' ≈ ' + fmtNum(r.v, 4);
    if (r.s) return r.s;
    var n = fmtNum(r.v, 4);
    return Math.abs(r.v - Math.round(r.v)) < 1e-9 ? n : '≈ ' + n;
  }

  /* ===================================================================
   * Simplifier: canonical sums of products with numeric coefficients
   * =================================================================== */
  function key(node) { return toStr(node); }
  function isNum(n) { return n.t === 'num'; }
  function numV(n) { return n.q || n.v; }

  function termsOf(node, sign, out) { // flatten sums
    if (node.t === 'bin' && node.op === '+') { termsOf(node.a, sign, out); termsOf(node.b, sign, out); }
    else if (node.t === 'bin' && node.op === '-') { termsOf(node.a, sign, out); termsOf(node.b, -sign, out); }
    else if (node.t === 'neg') termsOf(node.a, -sign, out);
    else { var t = termOf(node); if (sign < 0) t.c = vNeg(t.c); out.push(t); }
    return out;
  }
  function termOf(node) { // -> {c, f: [{b, e}]}
    if (isNum(node)) return { c: numV(node), f: [] };
    if (node.t === 'neg') { var t0 = termOf(node.a); t0.c = vNeg(t0.c); return t0; }
    if (node.t === 'bin' && node.op === '*') return tMul(termOf(node.a), termOf(node.b));
    if (node.t === 'bin' && node.op === '/') {
      var den = termOf(node.b);
      if (vIsZero(den.c)) return { c: Q(1), f: [{ b: node, e: Q(1) }] };
      return tMul(termOf(node.a), tPow(den, Q(-1)));
    }
    if (node.t === 'bin' && node.op === '^' && isNum(node.b) && isQ(numV(node.b))) {
      return tPow(termOf(node.a), numV(node.b));
    }
    if (node.t === 'bin' && (node.op === '+' || node.op === '-')) {
      // a sum used as a factor: keep it whole
      return { c: Q(1), f: [{ b: node, e: Q(1) }] };
    }
    if (node.t === 'bin' && node.op === '^') return { c: Q(1), f: [{ b: node.a, e: node.b }] };
    return { c: Q(1), f: [{ b: node, e: Q(1) }] };
  }
  function tMul(a, b) { return { c: vMul(a.c, b.c), f: a.f.concat(b.f) }; }
  function tPow(t, e) {
    if (vIsInt(e)) {
      var c = vPow(t.c, e);
      return { c: c, f: t.f.map(function (fa) { return { b: fa.b, e: isQ(fa.e) || typeof fa.e === 'number' ? vMul(fa.e, e) : B('*', fa.e, N(e)) }; }) };
    }
    // non-integer power: keep the whole term as base
    var node = buildTerm(t);
    return { c: Q(1), f: [{ b: node, e: e }] };
  }
  function isVal(e) { return isQ(e) || typeof e === 'number'; }
  function mergeFactors(fs) {
    var map = {}, order = [];
    fs.forEach(function (fa) {
      var k = key(fa.b);
      if (!map[k]) { map[k] = { b: fa.b, e: fa.e }; order.push(k); }
      else {
        var cur = map[k];
        if (isVal(cur.e) && isVal(fa.e)) cur.e = vAdd(cur.e, fa.e);
        else cur.e = simplify(B('+', isVal(cur.e) ? N(cur.e) : cur.e, isVal(fa.e) ? N(fa.e) : fa.e));
      }
    });
    var out = [];
    order.forEach(function (k) {
      var fa = map[k];
      if (isVal(fa.e) && vIsZero(fa.e)) return;
      if (!isVal(fa.e) && isNum(fa.e)) fa.e = numV(fa.e);
      out.push(fa);
    });
    return out;
  }
  function degreeOf(t) {
    var d = 0;
    t.f.forEach(function (fa) { if (fa.b.t === 'var' && isVal(fa.e)) d += F(fa.e); else if (fa.b.t !== 'const') d += 0.5; });
    return d;
  }
  function buildPow(b, e) {
    if (isVal(e)) { if (vEq(e, Q(1))) return b; return B('^', b, N(e)); }
    return B('^', b, e);
  }
  function buildTerm(t) { // coefficient magnitude/sign included
    var c = t.c, neg = vSign(c) < 0;
    if (neg) c = vNeg(c);
    var num = [], den = [];
    t.f.forEach(function (fa) {
      if (isVal(fa.e) && vSign(fa.e) < 0) den.push(buildPow(fa.b, vNeg(fa.e)));
      else num.push(buildPow(fa.b, fa.e));
    });
    var cn = isQ(c) ? Q(c.n) : c, cd = isQ(c) ? c.d : 1;
    var top = null;
    if (!(isQ(cn) && cn.n === 1 && num.length)) top = N(cn);
    num.forEach(function (f) { top = top ? B('*', top, f) : f; });
    if (!top) top = N(Q(1));
    var bottom = cd !== 1 ? N(Q(cd)) : null;
    den.forEach(function (f) { bottom = bottom ? B('*', bottom, f) : f; });
    var r = bottom ? B('/', top, bottom) : top;
    return neg ? Neg(r) : r;
  }
  function foldFn(node) {
    var a = node.a;
    if (isNum(a)) {
      var v = numV(a), r = fnExact(node.f, v);
      if (isQ(r)) return N(r);
    }
    if (node.f === 'ln' && a.t === 'const' && a.n === 'e') return N(Q(1));
    if (node.f === 'exp' && a.t === 'fn' && a.f === 'ln') return a.a;
    if (node.f === 'ln' && a.t === 'fn' && a.f === 'exp') return a.a;
    return node;
  }
  function simplify(node) {
    switch (node.t) {
      case 'num': case 'var': case 'const': return node;
      case 'fn': return foldFn(Fn(node.f, simplify(node.a)));
      case 'neg': {
        var a = simplify(node.a);
        if (isNum(a)) return N(vNeg(numV(a)));
        if (a.t === 'neg') return a.a;
        return canon(Neg(a));
      }
      case 'bin': {
        var l = simplify(node.a), r = simplify(node.b);
        if (node.op === '^') {
          if (isNum(r) && vIsZero(numV(r))) return N(Q(1));
          if (isNum(r) && vEq(numV(r), Q(1))) return l;
          if (isNum(l) && isNum(r)) { var pv = vPow(numV(l), numV(r)); if (isQ(pv)) return N(pv); }
          if (isNum(l) && vEq(numV(l), Q(1))) return N(Q(1));
        }
        if (node.op === '/' && isNum(r) && vIsZero(numV(r))) return B('/', l, r);
        return canon(B(node.op, l, r));
      }
    }
    return node;
  }
  function canon(node) {
    var terms = termsOf(node, 1, []);
    // merge factors in each term, then like terms
    var map = {}, order = [];
    terms.forEach(function (t) {
      t.f = mergeFactors(t.f);
      // numbers that ended up as bases with numeric exponents fold into c
      var keep = [];
      t.f.forEach(function (fa) {
        if (isNum(fa.b) && isVal(fa.e)) { var pv = vPow(numV(fa.b), fa.e); if (isQ(pv)) { t.c = vMul(t.c, pv); return; } }
        keep.push(fa);
      });
      t.f = keep;
      t.f.sort(function (a, b) { return factorRank(a) - factorRank(b); });
      var k = t.f.map(function (fa) { return key(fa.b) + '^' + (isVal(fa.e) ? fmtV(fa.e) : key(fa.e)); }).join('*');
      if (map[k]) map[k].c = vAdd(map[k].c, t.c);
      else { map[k] = t; order.push(k); }
    });
    var out = order.map(function (k) { return map[k]; }).filter(function (t) { return !vIsZero(t.c); });
    if (!out.length) return N(Q(0));
    out = out.map(function (t, i) { return { t: t, i: i, d: degreeOf(t) }; })
      .sort(function (a, b) { return (b.d - a.d) || (a.i - b.i); })
      .map(function (o) { return o.t; });
    var res = null;
    out.forEach(function (t) {
      var n = buildTerm(t);
      if (!res) res = n;
      else if (n.t === 'neg') res = B('-', res, n.a);
      else res = B('+', res, n);
    });
    return res;
  }
  function factorRank(fa) {
    var b = fa.b;
    if (b.t === 'const') return 0;
    if (b.t === 'var') return 1 + (b.n.charCodeAt(0) / 1000);
    if (b.t === 'fn') return 3;
    return 4;
  }

  /* ===================================================================
   * Printer (ASCII; pretty() turns it into display math)
   * =================================================================== */
  function prec(n) {
    if (n.t === 'bin') return n.op === '+' || n.op === '-' ? 1 : n.op === '^' ? 4 : 2;
    if (n.t === 'neg') return 1.5;
    if (n.t === 'num') return (n.v < 0) ? 1.5 : (isQ(n.q) && n.q.d !== 1) ? 2 : 5;
    return 5;
  }
  function wrap(s, cond) { return cond ? '(' + s + ')' : s; }
  function isSimpleFactor(n) { // single letters or their powers
    return n.t === 'var' || n.t === 'const' || (n.t === 'bin' && n.op === '^' && (n.a.t === 'var' || n.a.t === 'const'));
  }
  function toStr(n) {
    switch (n.t) {
      case 'num': return n.q ? fmtV(n.q) : fmtNum(n.v);
      case 'var': return n.n;
      case 'const': return n.n === 'pi' ? 'pi' : 'e';
      case 'fn': return n.f + '(' + toStr(n.a) + ')';
      case 'neg': return '-' + wrap(toStr(n.a), prec(n.a) < 2);
      case 'bin': {
        var a = n.a, b = n.b, pa = prec(a), pb = prec(b);
        switch (n.op) {
          case '+': return toStr(a) + ' + ' + wrap(toStr(b), pb < 1.5 && b.t !== 'neg' ? false : b.t === 'neg' || (b.t === 'num' && b.v < 0));
          case '-': return toStr(a) + ' - ' + wrap(toStr(b), pb <= 1.5);
          case '*': {
            var sa = wrap(toStr(a), pa < 2), sb = wrap(toStr(b), pb < 2 || (b.t === 'num' && pb === 2));
            var juxt = false;
            if (a.t === 'num' && !/^[\d.(]/.test(sb) && pa === 5) juxt = true;
            else if (a.t === 'num' && /^\(/.test(sb) && pa === 5) juxt = true;
            else if (isSimpleFactor(b) && (isSimpleFactor(a) || (a.t === 'bin' && a.op === '*' && isSimpleFactor(a.b)) || (a.t === 'bin' && a.op === '*' && a.a.t === 'num' && isSimpleFactor(a.b)))) juxt = true;
            if (juxt && /\d$/.test(sa) && /^\d/.test(sb)) juxt = false;
            if (juxt && a.t === 'const' && b.t === 'var') juxt = false;
            return sa + (juxt ? '' : '*') + sb;
          }
          case '/': return wrap(toStr(a), pa < 2) + '/' + wrap(toStr(b), pb <= 2);
          case '^': {
            var base = wrap(toStr(a), pa < 5);
            var ex = toStr(b);
            return base + '^' + wrap(ex, !(b.t === 'var' || b.t === 'const' || (b.t === 'num' && b.v >= 0 && (!b.q || b.q.d === 1))));
          }
        }
      }
    }
    return '?';
  }

  /* ===================================================================
   * Symbolic differentiation
   * =================================================================== */
  function D(n, x, rules) {
    function rule(r) { rules[r] = true; }
    var konst = !hasVar(n, x);
    if (konst) { rule('constant'); return N(Q(0)); }
    switch (n.t) {
      case 'var': return N(Q(1));
      case 'neg': return Neg(D(n.a, x, rules));
      case 'fn': {
        var u = n.a, du = D(u, x, rules), outer;
        if (!(u.t === 'var' && u.n === x)) rule('chain');
        switch (n.f) {
          case 'sin': rule('trig'); outer = Fn('cos', u); break;
          case 'cos': rule('trig'); outer = Neg(Fn('sin', u)); break;
          case 'tan': rule('trig'); outer = B('/', N(Q(1)), B('^', Fn('cos', u), N(Q(2)))); break;
          case 'sec': rule('trig'); outer = B('*', Fn('sec', u), Fn('tan', u)); break;
          case 'csc': rule('trig'); outer = Neg(B('*', Fn('csc', u), Fn('cot', u))); break;
          case 'cot': rule('trig'); outer = Neg(B('/', N(Q(1)), B('^', Fn('sin', u), N(Q(2))))); break;
          case 'asin': rule('trig'); outer = B('/', N(Q(1)), Fn('sqrt', B('-', N(Q(1)), B('^', u, N(Q(2)))))); break;
          case 'acos': rule('trig'); outer = Neg(B('/', N(Q(1)), Fn('sqrt', B('-', N(Q(1)), B('^', u, N(Q(2))))))); break;
          case 'atan': rule('trig'); outer = B('/', N(Q(1)), B('+', N(Q(1)), B('^', u, N(Q(2))))); break;
          case 'sinh': outer = Fn('cosh', u); break;
          case 'cosh': outer = Fn('sinh', u); break;
          case 'tanh': outer = B('/', N(Q(1)), B('^', Fn('cosh', u), N(Q(2)))); break;
          case 'sqrt': rule('power'); outer = B('/', N(Q(1)), B('*', N(Q(2)), Fn('sqrt', u))); break;
          case 'cbrt': rule('power'); outer = B('/', N(Q(1)), B('*', N(Q(3)), B('^', Fn('cbrt', u), N(Q(2))))); break;
          case 'abs': outer = B('/', u, Fn('abs', u)); break;
          case 'ln': rule('log'); outer = B('/', N(Q(1)), u); break;
          case 'log': rule('log'); outer = B('/', N(Q(1)), B('*', u, Fn('ln', N(Q(10))))); break;
          case 'exp': rule('exp'); outer = Fn('exp', u); break;
          default: outer = N(Q(0));
        }
        return B('*', outer, du);
      }
      case 'bin': {
        var a = n.a, b = n.b, ca = !hasVar(a, x), cb = !hasVar(b, x);
        switch (n.op) {
          case '+': case '-': rule('sum'); return B(n.op, D(a, x, rules), D(b, x, rules));
          case '*':
            if (ca) return B('*', a, D(b, x, rules));
            if (cb) return B('*', D(a, x, rules), b);
            rule('product');
            return B('+', B('*', D(a, x, rules), b), B('*', a, D(b, x, rules)));
          case '/':
            if (cb) return B('/', D(a, x, rules), b);
            rule('quotient');
            return B('/', B('-', B('*', D(a, x, rules), b), B('*', a, D(b, x, rules))), B('^', b, N(Q(2))));
          case '^':
            if (cb) {
              rule('power');
              if (!(a.t === 'var' && a.n === x)) rule('chain');
              return B('*', B('*', b, B('^', a, B('-', b, N(Q(1))))), D(a, x, rules));
            }
            if (ca) {
              rule('exp');
              var lnA = a.t === 'const' && a.n === 'e' ? null : Fn('ln', a);
              var core = lnA ? B('*', n, lnA) : n;
              return B('*', core, D(b, x, rules));
            }
            rule('exp'); rule('log');
            return B('*', n, B('+', B('*', D(b, x, rules), Fn('ln', a)), B('/', B('*', b, D(a, x, rules)), a)));
        }
      }
    }
    return N(Q(0));
  }
  function derivative(node, x) {
    var rules = {};
    var d = simplify(D(node, x || 'x', rules));
    d = simplify(d);
    return { node: d, str: toStr(d), rules: Object.keys(rules) };
  }

  /* ===================================================================
   * Linear systems
   * =================================================================== */
  function linForm(node, vars, env) { // -> {c: [V], k: V} meaning sum c_i v_i + k
    function zero() { return { c: vars.map(function () { return Q(0); }), k: Q(0) }; }
    function isConstL(l) { return l.c.every(vIsZero); }
    function scale(l, s) { return { c: l.c.map(function (v) { return vMul(v, s); }), k: vMul(l.k, s) }; }
    function add(a, b, s) { return { c: a.c.map(function (v, i) { return vAdd(v, vMul(b.c[i], s)); }), k: vAdd(a.k, vMul(b.k, s)) }; }
    function go(n) {
      switch (n.t) {
        case 'num': var z = zero(); z.k = n.q || n.v; return z;
        case 'const': var z2 = zero(); z2.k = n.n === 'pi' ? Math.PI : Math.E; return z2;
        case 'var':
          var i = vars.indexOf(n.n), z3 = zero();
          if (i >= 0) { z3.c[i] = Q(1); return z3; }
          if (env[n.n] !== undefined) { z3.k = env[n.n]; return z3; }
          return null;
        case 'neg': var a = go(n.a); return a && scale(a, Q(-1));
        case 'fn': var f = go(n.a); if (!f || !isConstL(f)) return null; var z4 = zero(); z4.k = fnExact(n.f, f.k); return z4;
        case 'bin':
          var l = go(n.a), r = go(n.b);
          if (!l || !r) return null;
          switch (n.op) {
            case '+': return add(l, r, Q(1));
            case '-': return add(l, r, Q(-1));
            case '*': if (isConstL(l)) return scale(r, l.k); if (isConstL(r)) return scale(l, r.k); return null;
            case '/': if (!isConstL(r) || vIsZero(r.k)) return null; return scale(l, vDiv(Q(1), r.k));
            case '^': if (!isConstL(r)) return null; if (isConstL(l)) { var z5 = zero(); z5.k = vPow(l.k, r.k); return z5; }
              if (vEq(r.k, Q(1))) return l; return null;
          }
      }
      return null;
    }
    return go(node);
  }
  function fmtMatrix(M) {
    return '[' + M.map(function (row) {
      return row.slice(0, -1).map(function (v) { return fmtV(v, 4); }).join(' ') + ' | ' + fmtV(row[row.length - 1], 4);
    }).join('; ') + ']';
  }
  function linEqStr(row, vars) {
    var parts = [];
    vars.forEach(function (v, i) {
      var c = row[i];
      if (vIsZero(c)) return;
      var neg = vSign(c) < 0, a = neg ? vNeg(c) : c;
      var cs = isQ(a) && a.n === 1 && a.d === 1 ? '' : fmtV(a, 4);
      if (isQ(a) && a.d !== 1) cs = '(' + cs + ')';
      parts.push((parts.length ? (neg ? ' - ' : ' + ') : (neg ? '-' : '')) + cs + v);
    });
    return (parts.join('') || '0') + ' = ' + fmtV(row[row.length - 1], 4);
  }
  function gauss(M, n, steps) {
    var rows = M.length, r = 0, pivots = [];
    for (var col = 0; col < n && r < rows; col++) {
      var piv = -1;
      for (var i = r; i < rows; i++) if (!vIsZero(M[i][col])) { piv = i; break; }
      if (piv < 0) continue;
      if (piv !== r) { var t = M[piv]; M[piv] = M[r]; M[r] = t; steps.push(T('step.sysSwap', r + 1, piv + 1)); }
      var pv = M[r][col];
      if (!vEq(pv, Q(1))) {
        M[r] = M[r].map(function (v) { return vDiv(v, pv); });
        steps.push(T('step.sysScale', r + 1, fmtV(pv, 4)));
      }
      for (i = 0; i < rows; i++) {
        if (i === r || vIsZero(M[i][col])) continue;
        var f = M[i][col];
        M[i] = M[i].map(function (v, j) { return vSub(v, vMul(f, M[r][j])); });
        steps.push(T('step.sysElim', i + 1, fmtV(f, 4), r + 1));
      }
      pivots.push(col);
      r++;
    }
    return pivots;
  }

  /* ===================================================================
   * Solver
   * =================================================================== */
  var PARAM_DEFAULT = 1;
  function paramValue(params, name) {
    var v = params && params[name] !== undefined ? +params[name] : PARAM_DEFAULT;
    return toV(Math.round(v * 1e6) / 1e6);
  }
  function lettersOf(nodes) {
    var s = {};
    nodes.forEach(function (n) { freeVars(n, s); });
    return Object.keys(s).sort();
  }
  function paramEnv(names, params) {
    var env = {};
    names.forEach(function (n) { env[n] = paramValue(params, n); });
    return env;
  }
  function paramStep(names, env) {
    if (!names.length) return null;
    return T('step.params', names.map(function (n) { return n + ' = ' + fmtV(env[n], 4); }).join(', '));
  }
  function result(o) {
    o.ok = true;
    o.steps = (o.steps || []).filter(Boolean);
    o.values = o.values || [];
    o.params = o.params || [];
    return o;
  }

  function cleanNum(s) { return s.replace(/,$/, ''); }
  function parseBound(s, env) {
    var v = evalExact(parse(s), env || {});
    if (!isFinite(F(v))) throw new MathError('err.bounds');
    return v;
  }

  function solveDerivative(m, params) {
    var x = m.v || 'x', body = m.body, at = null;
    var atM = /^(.*?)\s*(?:,|\bat\b|\btại\b|\ben\b|\bwhen\b|\bkhi\b)\s*([a-z])\s*=\s*(.+)$/i.exec(body);
    if (atM) { body = atM[1]; x = atM[2]; at = atM[3]; }
    var node = parse(body);
    var names = lettersOf([node]).filter(function (v) { return v !== x; });
    var env = paramEnv(names, params);
    var d = derivative(node, x);
    var steps = [paramStep(names, env), T('step.deriv', pretty(toStr(simplify(node))), x)];
    if (d.rules.length) steps.push(T('step.rules', d.rules.map(function (r) { return T('rule.' + r); }).join(', ')));
    steps.push(T('step.derivSimplify', pretty('d/d' + x + ' = ' + d.str)));
    var answer = 'd/d' + x + ' = ' + d.str, values = [], plot = null;
    var fF = compile(node), dF = compile(d.node), fenv = toFloatEnv(env);
    if (at !== null) {
      var a = parseBound(at, env), e2 = Object.assign({}, env); e2[x] = a;
      var val = evalExact(d.node, e2);
      steps.push(T('step.derivAt', x, fmtV(a), fmtV(val)));
      answer += ';  ' + x + ' = ' + fmtV(a) + ': ' + fmtV(val);
      values.push(F(val));
    }
    var fx = function (t) { fenv[x] = t; return fF(fenv); }, dx = function (t) { fenv[x] = t; return dF(fenv); };
    plot = { fns: [{ f: fx, label: 'f' }, { f: dx, label: "f'", dash: true }] };
    if (at !== null) { var av = values.length ? F(parseBound(at, env)) : 0; plot.points = [{ x: av, y: fx(av) }]; }
    return result({ type: 'derivative', steps: steps, answer: answer, derivative: d.str, values: values, params: names, plot: plot });
  }

  function solveIntegral(m, params) {
    var body = m.body.trim(), x = m.v || 'x';
    var dm = /^(.*?)\s*\bd([a-z])\s*$/.exec(body);
    if (dm) { body = dm[1]; x = dm[2]; }
    var node = parse(body);
    var names = lettersOf([node]).filter(function (v) { return v !== x; });
    var env = paramEnv(names, params);
    var steps = [paramStep(names, env)];
    var poly = toPoly(node, x, env);
    if (m.a === undefined) {
      if (!poly) throw new MathError('err.indefinite');
      var anti = [Q(0)].concat(poly.map(function (c, i) { return vDiv(c, Q(i + 1)); }));
      steps.push(T('step.intIndef', pretty(polyToStr(anti, x))));
      return result({ type: 'integral', steps: steps, answer: '∫ = ' + polyToStr(anti, x) + ' + C', antiderivative: polyToStr(anti, x), params: names,
        plot: { fns: [{ f: function (t) { return pEval(poly, t); } }] } });
    }
    var a = parseBound(m.a, env), b = parseBound(m.b, env), value;
    if (poly) {
      var P = [Q(0)].concat(poly.map(function (c, i) { return vDiv(c, Q(i + 1)); }));
      steps.push(T('step.intPoly', pretty(polyToStr(P, x))));
      value = vSub(pEvalV(P, b), pEvalV(P, a));
      steps.push(T('step.intEval', fmtV(b), fmtV(a), fmtV(value) + (isQ(value) && value.d !== 1 ? ' ≈ ' + fmtNum(F(value)) : '')));
    } else {
      var f = compile(node), fe = toFloatEnv(env), nSub = 2000, A = F(a), Bv = F(b), h = (Bv - A) / nSub, s = 0;
      for (var i = 0; i <= nSub; i++) {
        fe[x] = A + i * h;
        var y = f(fe);
        if (!isFinite(y)) throw new MathError('err.undefined');
        s += (i === 0 || i === nSub) ? y : (i % 2 ? 4 * y : 2 * y);
      }
      value = s * h / 3;
      steps.push(T('step.intSimpson', nSub));
    }
    var fe2 = toFloatEnv(env), ff = compile(node);
    return result({ type: 'integral', steps: steps, answer: '∫ = ' + fmtV(value) + (isQ(value) && value.d !== 1 ? ' ≈ ' + fmtNum(F(value)) : ''),
      values: [F(value)], params: names,
      plot: { fns: [{ f: function (t) { fe2[x] = t; return ff(fe2); } }], shade: { a: F(a), b: F(b) } } });
  }

  function solveSystem(parts, params) {
    var rels = parts.map(function (p) { return parseRelation(p); });
    rels.forEach(function (r) { if (r.op !== '=') throw new MathError('err.nothing'); });
    var nodes = rels.map(function (r) { return B('-', r.lhs, r.rhs); });
    var letters = lettersOf(nodes), n = nodes.length;
    var prefer = ['x', 'y', 'z'].slice(0, n), vars;
    if (prefer.every(function (v) { return letters.indexOf(v) >= 0; }) || (n === 2 && letters.indexOf('x') >= 0 && letters.indexOf('y') >= 0)) vars = prefer;
    else if (letters.length === n) vars = letters;
    else {
      var xyz = letters.filter(function (v) { return 'xyz'.indexOf(v) >= 0; });
      if (xyz.length === n) vars = xyz; else throw new MathError('err.systemVars', n, letters.length);
    }
    var names = letters.filter(function (v) { return vars.indexOf(v) < 0; });
    var env = paramEnv(names, params);
    var M = nodes.map(function (nd) {
      var l = linForm(nd, vars, env);
      if (!l) throw new MathError('err.nonlinearSystem', vars.join(', '));
      return l.c.concat([vNeg(l.k)]);
    });
    var steps = [paramStep(names, env), T('step.sysForm')];
    M.forEach(function (row) { steps.push('   ' + pretty(linEqStr(row, vars))); });
    steps.push(T('step.sysMatrix', pretty(fmtMatrix(M))));
    var R = M.map(function (r) { return r.slice(); });
    var piv = gauss(R, vars.length, steps);
    steps.push(T('step.sysResult', pretty(fmtMatrix(R))));
    var inconsistent = R.some(function (row) { return row.slice(0, -1).every(vIsZero) && !vIsZero(row[row.length - 1]); });
    var out = { type: 'system', steps: steps, params: names, vars: vars };
    var fenv = toFloatEnv(env);
    if (vars.length === 2) {
      out.plot = { implicit: nodes.map(function (nd) { var f = compile(nd); return function (X, Y) { fenv[vars[0]] = X; fenv[vars[1]] = Y; return f(fenv); }; }) };
    }
    if (inconsistent) { out.answer = T('ans.sysNone'); out.status = 'none'; return result(out); }
    if (piv.length < vars.length) { out.answer = T('ans.sysInf'); out.status = 'infinite'; return result(out); }
    var sol = vars.map(function (v, i) { return R[i][R[i].length - 1]; });
    out.status = 'unique';
    out.values = sol.map(F);
    out.solution = {};
    vars.forEach(function (v, i) { out.solution[v] = fmtV(sol[i]); });
    out.answer = vars.map(function (v, i) { return v + ' = ' + fmtV(sol[i]); }).join(', ');
    if (out.plot) out.plot.points = [{ x: F(sol[0]), y: F(sol[1]) }];
    return result(out);
  }

  function fmtInterval(iv, op) {
    var a = iv.a, b = iv.b;
    var ls = iv.ac ? '<=' : '<', rs = iv.bc ? '<=' : '<';
    if (a === null && b === null) return T('ans.all');
    if (a !== null && b !== null && Math.abs(a.v - b.v) < 1e-12) return 'x = ' + rootStr(a);
    if (a === null) return 'x ' + rs + ' ' + rootStr(b);
    if (b === null) return 'x ' + (iv.ac ? '>=' : '>') + ' ' + rootStr(a);
    return rootStr(a) + ' ' + ls + ' x ' + rs + ' ' + rootStr(b);
  }
  function intervalNotation(iv) {
    if (iv.a && iv.b && Math.abs(iv.a.v - iv.b.v) < 1e-12) return '{' + rootStr(iv.a) + '}';
    return (iv.a ? (iv.ac ? '[' : '(') + rootStr(iv.a) : '(-∞') + ', ' + (iv.b ? rootStr(iv.b) + (iv.bc ? ']' : ')') : '∞)');
  }

  function solveInequality(rel, params) {
    var node = B('-', rel.lhs, rel.rhs);
    var letters = lettersOf([node]);
    var x = letters.indexOf('x') >= 0 ? 'x' : letters.length === 1 ? letters[0] : null;
    if (!x) throw new MathError('err.ineqVar');
    var names = letters.filter(function (v) { return v !== x; });
    var env = paramEnv(names, params);
    var op = rel.op === '!=' ? '!=' : rel.op;
    var shown = simplify(subst(node, toFloatEnvQ(env)));
    var steps = [paramStep(names, env), T('step.ineqForm', pretty(toStr(shown)), pretty(op.replace('<=', '≤').replace('>=', '≥')))];
    var f = compile(node), fe = toFloatEnv(env);
    var fx = function (t) { fe[x] = t; return f(fe); };
    var rr = realRoots(node, x, env);
    if (rr.poly && rr.poly.length === 2) {
      var a = rr.poly[1];
      if (vSign(a) < 0 && op !== '!=') steps.push(T('step.ineqFlip', fmtV(a)));
    }
    var crit = rr.roots.map(function (r) { return { v: r.v, s: r.s, root: true }; });
    (rr.poles || []).forEach(function (p) { crit.push({ v: p, s: null, root: false }); });
    crit.sort(function (a, b) { return a.v - b.v; });
    if (crit.length) steps.push(T('step.ineqCrit', crit.map(function (c) { return pretty(rootStrApprox(c)); }).join(', ')));
    else steps.push(T('step.ineqNoCrit'));
    function holds(y) {
      if (!isFinite(y)) return false;
      var eps = 1e-12;
      switch (op) {
        case '<': return y < -eps; case '<=': return y <= eps; case '>': return y > eps; case '>=': return y >= -eps; case '!=': return Math.abs(y) > eps;
      }
      return false;
    }
    var inclusive = op === '<=' || op === '>=';
    var ivs = [], tests = [];
    for (var i = 0; i <= crit.length; i++) {
      var lo = i === 0 ? null : crit[i - 1], hi = i === crit.length ? null : crit[i];
      var t = lo === null && hi === null ? 0 : lo === null ? hi.v - 1 : hi === null ? lo.v + 1 : (lo.v + hi.v) / 2;
      var y = fx(t), ok = holds(y);
      tests.push('x = ' + fmtNum(t, 3) + ' → ' + (ok ? '✓' : '✗'));
      if (ok) ivs.push({ a: lo, b: hi, ac: !!(lo && lo.root && inclusive), bc: !!(hi && hi.root && inclusive) });
    }
    steps.push(T('step.ineqTest', tests.join(', ')));
    // isolated root points for ≤ / ≥ (e.g. x^2 <= 0)
    if (inclusive) crit.forEach(function (c) {
      if (!c.root) return;
      var covered = ivs.some(function (iv) { return (iv.a === c && iv.ac) || (iv.b === c && iv.bc); });
      if (!covered) ivs.push({ a: c, b: c, ac: true, bc: true });
    });
    ivs.sort(function (p, q) { return (p.a ? p.a.v : -Infinity) - (q.a ? q.a.v : -Infinity); });
    // merge touching intervals with a closed shared endpoint
    var merged = [];
    ivs.forEach(function (iv) {
      var last = merged[merged.length - 1];
      if (last && last.b && iv.a && last.b === iv.a && (last.bc || iv.ac)) { last.b = iv.b; last.bc = iv.bc; }
      else if (last && last.b && iv.a && last.b === iv.a && last.b === last.a) { last.b = iv.b; last.bc = iv.bc; }
      else merged.push({ a: iv.a, b: iv.b, ac: iv.ac, bc: iv.bc });
    });
    if (rr.numeric) steps.push(T('step.ineqRange'));
    var answer, notation;
    if (!merged.length) { answer = T('ans.none'); notation = '∅'; }
    else {
      answer = merged.slice(0, 10).map(function (iv) { return fmtInterval(iv); }).join(T('ans.or')) + (merged.length > 10 ? ' …' : '');
      notation = merged.slice(0, 10).map(intervalNotation).join(' ∪ ') + (merged.length > 10 ? ' ∪ …' : '');
    }
    var lhsF = compile(rel.lhs), rhsF = compile(rel.rhs);
    return result({ type: 'inequality', steps: steps, answer: answer, notation: notation, intervals: merged.map(function (iv) {
      return { a: iv.a ? iv.a.v : -Infinity, b: iv.b ? iv.b.v : Infinity, ac: iv.ac, bc: iv.bc };
    }), params: names, plot: { fns: [{ f: function (t) { fe[x] = t; return lhsF(fe); } }, { f: function (t) { fe[x] = t; return rhsF(fe); }, dash: true }],
      xIntervals: merged.map(function (iv) { return { a: iv.a ? iv.a.v : -Infinity, b: iv.b ? iv.b.v : Infinity }; }) } });
  }
  function toFloatEnvQ(env) { var o = {}; for (var k in env) o[k] = env[k]; return o; }

  function solveEquation(rel, params) {
    var node = B('-', rel.lhs, rel.rhs);
    var letters = lettersOf([node]);
    var x = letters.indexOf('x') >= 0 ? 'x' : letters.length ? letters[letters.length - 1] : 'x';
    if (letters.length > 1 && letters.indexOf('x') < 0) {
      // prefer y, z, t … over parameter-looking letters
      var pref = ['y', 'z', 't', 'u', 'v', 'w'].filter(function (v) { return letters.indexOf(v) >= 0; });
      if (pref.length) x = pref[0];
    }
    var names = letters.filter(function (v) { return v !== x; });
    var env = paramEnv(names, params);
    var steps = [paramStep(names, env)];
    var shownNode = simplify(subst(node, env));
    steps.push(T('step.oneSide', pretty(toStr(shownNode).replace(/\bx\b/g, x))));
    var f = compile(node), fe = toFloatEnv(env);
    var fx = function (t) { fe[x] = t; return f(fe); };
    var lhsF = compile(rel.lhs), rhsF = compile(rel.rhs);
    var plot = { fns: [{ f: function (t) { fe[x] = t; return lhsF(fe); } }, { f: function (t) { fe[x] = t; return rhsF(fe); }, dash: true }] };
    var poly = toPoly(node, x, env);
    var out = { type: 'equation', steps: steps, params: names, variable: x, plot: plot };
    if (poly) {
      poly = pTrim(poly);
      var deg = poly.length - 1;
      if (deg === 0) {
        if (vIsZero(poly[0])) { steps.push(T('step.constTrue')); out.answer = T('ans.all'); out.status = 'all'; }
        else { steps.push(T('step.constFalse', fmtV(poly[0]))); out.answer = T('ans.none'); out.status = 'none'; }
        return result(out);
      }
      out.type = deg === 1 ? 'linear' : deg === 2 ? 'quadratic' : 'polynomial';
      if (deg === 1) {
        steps.push(T('step.linearForm', fmtV(poly[1]), fmtV(poly[0])));
        var r = vDiv(vNeg(poly[0]), poly[1]);
        steps.push(T('step.linearSolve', fmtV(r) + (isQ(r) && r.d !== 1 ? ' ≈ ' + fmtNum(F(r), 4) : '')));
        out.values = [F(r)];
        out.roots = [fmtV(r)];
        out.answer = x + ' = ' + fmtV(r) + (isQ(r) && r.d !== 1 ? ' ≈ ' + fmtNum(F(r), 4) : '');
        plot.points = [{ x: F(r), y: (function () { fe[x] = F(r); return rhsF(fe); })() }];
        return result(out);
      }
      var pr = polyRoots(poly);
      pr.steps.forEach(function (s) { steps.push(s); });
      out.values = pr.roots.map(function (r) { return r.v; });
      out.roots = pr.roots.map(function (r) { return rootStr(r); });
      if (!pr.roots.length) {
        out.answer = T('ans.noReal') + (pr.complex ? '. ' + T('ans.complex', pr.complex) : '');
        out.complex = pr.complex;
        out.status = 'noreal';
      } else if (pr.pm && pr.roots.length === 2) {
        out.answer = pr.pm.replace(/^x/, x) + '  (' + pr.roots.map(function (r) { return '≈ ' + fmtNum(r.v, 4); }).join(', ') + ')';
      } else {
        out.answer = pr.roots.map(function (r) { return x + ' = ' + rootStrApprox(r).replace(/^≈ /, '≈ '); }).join(T('ans.or')).replace(new RegExp(x + ' = ≈ ', 'g'), x + ' ≈ ');
      }
      plot.points = pr.roots.map(function (r) { fe[x] = r.v; return { x: r.v, y: rhsF(fe) }; });
      return result(out);
    }
    out.type = 'numeric';
    steps.push(T('step.numeric', pretty(toStr(simplify(node)))));
    var nr = numericRoots(fx);
    out.values = nr.roots;
    out.roots = nr.roots.map(function (v) { return fmtNum(v, 4); });
    if (!nr.roots.length) { out.answer = T('ans.noRealIn'); out.status = 'noreal'; }
    else {
      var shown = nr.roots.slice(0, 12).map(function (v) {
        return x + (Math.abs(v - Math.round(v)) < 1e-9 ? ' = ' : ' ≈ ') + fmtNum(v, 4);
      });
      out.answer = shown.join(T('ans.or')) + (nr.roots.length > 12 ? ' ' + T('ans.more', nr.roots.length) : '');
    }
    plot.points = nr.roots.slice(0, 40).map(function (v) { fe[x] = v; return { x: v, y: rhsF(fe) }; });
    return result(out);
  }

  // f(x) analysis: roots, intercept, extrema, inflection points
  function analyze(node, x, env) {
    var res = { roots: [], extrema: [], inflections: [], yint: null };
    var f = compile(node), fe = toFloatEnv(env), fx = function (t) { fe[x] = t; return f(fe); };
    var e0 = Object.assign({}, env); e0[x] = Q(0);
    var y0 = evalExact(node, e0);
    res.yint = isFinite(F(y0)) ? y0 : null;
    res.roots = realRoots(node, x, env).roots;
    var d1 = derivative(node, x), d2 = derivative(d1.node, x);
    res.d1 = d1.str; res.d2 = d2.str;
    var f2 = compile(d2.node);
    var crit = realRoots(subst(d1.node, toFloatEnvQ(env)), x, {}).roots;
    var isQuad = (function () { var p = toPoly(node, x, env); return p && pTrim(p).length === 3; })();
    crit.forEach(function (c) {
      fe[x] = c.v;
      var s = f2(fe), y = f(fe);
      if (!isFinite(y)) return;
      var kind = null;
      if (s < -1e-9) kind = 'max'; else if (s > 1e-9) kind = 'min';
      else { // first-derivative test
        var d1f = compile(d1.node), h = 1e-4;
        fe[x] = c.v - h; var l = d1f(fe); fe[x] = c.v + h; var r = d1f(fe);
        if (l > 0 && r < 0) kind = 'max'; else if (l < 0 && r > 0) kind = 'min';
      }
      if (!kind) return;
      var ex = Object.assign({}, env); ex[x] = c.s ? approxRational(c.v, 10000) || c.v : c.v;
      var yv = c.s && isQ(ex[x]) ? evalExact(node, ex) : y;
      res.extrema.push({ x: c.v, xs: c.s, y: F(yv), ys: isQ(yv) ? fmtV(yv) : null, kind: kind, vertex: isQuad });
    });
    var infl = realRoots(subst(d2.node, toFloatEnvQ(env)), x, {}).roots;
    infl.forEach(function (c) {
      var h = 1e-4 * Math.max(1, Math.abs(c.v));
      fe[x] = c.v - h; var l = f2(fe); fe[x] = c.v + h; var r = f2(fe);
      if (!(l * r < 0)) return;
      fe[x] = c.v;
      res.inflections.push({ x: c.v, xs: c.s, y: f(fe) });
    });
    res.fx = fx;
    return res;
  }
  function ptStr(xv, xs, yv, ys) {
    return '(' + (xs || fmtNum(xv, 4)) + ', ' + (ys || fmtNum(yv, 4)) + ')';
  }

  function solveFunction(node, x, params, label) {
    var names = lettersOf([node]).filter(function (v) { return v !== x; });
    var env = paramEnv(names, params);
    var a = analyze(node, x, env);
    var steps = [paramStep(names, env)];
    steps.push(a.yint !== null ? T('fa.yint', fmtV(a.yint)) : T('fa.yintNone'));
    steps.push(a.roots.length ? T('fa.roots', a.roots.slice(0, 12).map(function (r) { return x + ' = ' + pretty(rootStrApprox(r)); }).join(', ')) : T('fa.rootsNone'));
    steps.push(T('fa.deriv1', pretty(a.d1)));
    steps.push(a.extrema.length ? T('fa.extrema', a.extrema.slice(0, 12).map(function (e) {
      return (e.vertex ? T('fa.vertex') + ' ' : '') + T('fa.' + e.kind) + ' ' + pretty(ptStr(e.x, e.xs, e.y, e.ys));
    }).join(', ')) : T('fa.extremaNone'));
    steps.push(T('fa.deriv2', pretty(a.d2)));
    steps.push(a.inflections.length ? T('fa.inflection', a.inflections.slice(0, 12).map(function (e) { return pretty(ptStr(e.x, e.xs, e.y, null)); }).join(', ')) : T('fa.inflectionNone'));
    var ans = [];
    ans.push((label || 'f') + '(' + x + ') = ' + toStr(simplify(subst(node, env))));
    var pts = [];
    a.roots.slice(0, 40).forEach(function (r) { pts.push({ x: r.v, y: 0 }); });
    if (a.yint !== null) pts.push({ x: 0, y: F(a.yint) });
    a.extrema.forEach(function (e) { pts.push({ x: e.x, y: e.y }); });
    a.inflections.forEach(function (e) { pts.push({ x: e.x, y: e.y, hollow: true }); });
    return result({ type: 'function', steps: steps, answer: ans.join(''), params: names,
      roots: a.roots.map(function (r) { return r.v; }), extrema: a.extrema, inflections: a.inflections, yint: a.yint === null ? null : F(a.yint),
      values: a.roots.map(function (r) { return r.v; }),
      summary: [
        a.roots.length ? T('fa.roots', a.roots.slice(0, 8).map(function (r) { return pretty(rootStrApprox(r)); }).join(', ')) : T('fa.rootsNone'),
        a.extrema.length ? T('fa.extrema', a.extrema.slice(0, 8).map(function (e) { return T('fa.' + e.kind) + ' ' + pretty(ptStr(e.x, e.xs, e.y, e.ys)); }).join(', ')) : T('fa.extremaNone')
      ],
      plot: { fns: [{ f: a.fx }], points: pts } });
  }

  function solveArithmetic(node, params) {
    var names = lettersOf([node]);
    var env = paramEnv(names, params);
    var v = evalExact(node, env);
    if (!isFinite(F(v))) throw new MathError('err.undefined');
    var steps = [paramStep(names, env), T('step.arith')];
    var answer;
    if (isQ(v)) {
      answer = fmtV(v) + (v.d !== 1 ? ' ≈ ' + fmtNum(F(v)) : '');
    } else {
      steps.push(T('step.arithDec'));
      answer = '≈ ' + fmtNum(v, 10);
    }
    steps.push(pretty(toStr(node)) + ' = ' + pretty(answer));
    return result({ type: 'arithmetic', steps: steps, answer: answer, exact: isQ(v) ? fmtV(v) : null, values: [F(v)], params: names });
  }

  function splitTop(s) { // split on , ; newline outside parentheses
    var parts = [], depth = 0, cur = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c === '(' || c === '[') depth++;
      if (c === ')' || c === ']') depth--;
      if (depth === 0 && (c === ',' || c === ';' || c === '\n')) { parts.push(cur); cur = ''; }
      else cur += c;
    }
    parts.push(cur);
    return parts.map(function (p) { return p.trim(); }).filter(Boolean);
  }

  function solve(input, params) {
    try {
      return solveInner(String(input || ''), params || {});
    } catch (e) {
      if (e instanceof MathError) return { ok: false, error: e.message, key: e.key };
      return { ok: false, error: T('err.nothing') + (e && e.message ? ' (' + e.message + ')' : '') };
    }
  }
  function solveInner(raw, params) {
    var s = normalize(raw).trim().replace(/[?.!]+$/, '').replace(/^(solve|giải|resuelve|resolver|calculate|compute|tính|calcula|find|evaluate)\s*:?\s*/i, '');
    if (!s) throw new MathError('err.empty');
    var m;
    // derivative
    if ((m = /^d\s*\/\s*d([a-z])\s*(.+)$/i.exec(s)) || (m = /^(?:the\s+)?(?:derivative|differentiate|đạo hàm|derivada|deriva)(?:\s+(?:of|của|de))?\s*(.+)$/i.exec(s))) {
      var v = m.length === 3 ? m[1] : null, body = m.length === 3 ? m[2] : m[1];
      var wrt = /^(.*?)\s+(?:with respect to|wrt|theo|respecto (?:a|de))\s+([a-z])(.*)$/i.exec(body);
      if (wrt) { body = wrt[1] + wrt[3]; v = wrt[2]; }
      return solveDerivative({ v: v, body: body.trim() }, params);
    }
    // integral
    var im = /^(?:∫|(?:the\s+)?(?:definite\s+)?(?:integral|integrate|tích phân|integra(?:l)?)(?:\s+(?:of|của|de))?)\s*(.+)$/i.exec(s);
    if (im) {
      var rest = im[1].trim();
      var lim = /^_\s*\{?([^\s{}^]+)\}?\s*\^\s*\{?([^\s{}]+)\}?\s+(.+)$/.exec(rest);
      if (lim) return solveIntegral({ body: lim[3], a: lim[1], b: lim[2] }, params);
      var ft = /^(.+?)\s*(?:,|\bfrom\b|\btừ\b|\bdesde\b|\bde\b)\s*(\S+)\s*(?:\bto\b|\bđến\b|\btới\b|\bhasta\b|\ba\b|,|\.\.)\s*(\S+)$/i.exec(rest);
      if (ft) return solveIntegral({ body: ft[1], a: cleanNum(ft[2]), b: ft[3] }, params);
      if (/\b(from|to|từ|đến|desde|hasta)\b/i.test(rest)) throw new MathError('err.integralForm');
      return solveIntegral({ body: rest }, params);
    }
    // system
    var parts = splitTop(s);
    if (parts.length >= 2) {
      if (parts.every(function (p) { return /=/.test(p) && !/[<>!]/.test(p); })) return solveSystem(parts, params);
      throw new MathError('err.unexpected', ',');
    }
    // function definition
    var fm = /^([a-zA-Z])\s*\(\s*([a-z])\s*\)\s*=\s*(.+)$/.exec(s);
    if (fm) return solveFunction(parse(fm[3]), fm[2], params, fm[1]);
    var rel = parseRelation(s);
    if (rel.expr) {
      var vs = lettersOf([rel.expr]);
      if (vs.indexOf('x') >= 0) return solveFunction(rel.expr, 'x', params, 'f');
      return solveArithmetic(rel.expr, params);
    }
    if (rel.op === '=') {
      if (rel.lhs.t === 'var' && rel.lhs.n === 'y' && hasVar(rel.rhs, 'x') && !hasVar(rel.rhs, 'y')) return solveFunction(rel.rhs, 'x', params, 'y');
      return solveEquation(rel, params);
    }
    return solveInequality(rel, params);
  }

  // which letters a problem would turn into sliders (for the UI)
  function problemParams(input) {
    var r = solve(input, {});
    return r.ok ? r.params : [];
  }

  /* ===================================================================
   * Public core
   * =================================================================== */
  var VizMath = {
    lex: lex, parse: parse, parseRelation: parseRelation, compile: compile, evalExact: evalExact,
    simplify: simplify, toStr: toStr, pretty: pretty, derivative: derivative, toPoly: toPoly,
    polyRoots: polyRoots, numericRoots: numericRoots, solve: solve, analyze: analyze,
    problemParams: problemParams, fmtV: fmtV, fmtNum: fmtNum, Q: Q, F: F, T: T, freeVars: freeVars,
    MathError: MathError, realRoots: realRoots, STR: STR
  };
  global.VizMath = VizMath;

  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  /* ===================================================================
   * UI
   * =================================================================== */
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var PALETTE = ['#5B4CF0', '#E2557A', '#0E9E6E', '#E08A00', '#2A8BD8', '#9B3FD1'];
  function css(el, name, fallback) {
    var v = getComputedStyle(el).getPropertyValue(name).trim();
    return v || fallback;
  }
  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function niceStep(raw) {
    var p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }
  function tickLabel(v, step) {
    if (Math.abs(v) < step * 1e-6) return '0';
    var d = Math.max(0, -Math.floor(Math.log10(step)) + (niceStep(step) / Math.pow(10, Math.floor(Math.log10(step))) === 5 ? 0 : 0));
    var s = Math.abs(v) >= 1e5 || Math.abs(v) < 1e-4 ? v.toExponential(1) : v.toFixed(Math.min(8, d));
    return s.replace('-', '−');
  }

  /* ---------------- 2D plot ---------------- */
  function Plot2D(canvas, opts) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.opts = opts || {};
    this.view = { cx: 0, cy: 0, scale: 40, yscale: 40 };
    this.items = { fns: [], implicit: [], regions: [], points: [] };
    this.pointers = {};
    this.raf = 0;
    var self = this;
    this.resize();
    if (window.ResizeObserver) new ResizeObserver(function () {
      self.resize();
      if (self.home && !self.touched) self.fit(self.home);
      self.draw();
    }).observe(canvas);
    canvas.addEventListener('pointerdown', function (e) {
      self.touched = true;
      canvas.setPointerCapture(e.pointerId);
      self.pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('pointermove', function (e) {
      var p = self.pointers[e.pointerId];
      if (!p) return;
      var ids = Object.keys(self.pointers);
      if (ids.length === 1) {
        self.view.cx -= (e.clientX - p.x) / self.view.scale;
        self.view.cy += (e.clientY - p.y) / self.view.yscale;
      } else if (ids.length === 2) {
        var other = self.pointers[ids[0] == e.pointerId ? ids[1] : ids[0]];
        var d0 = Math.hypot(p.x - other.x, p.y - other.y), d1 = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        if (d0 > 0) {
          var r = canvas.getBoundingClientRect();
          self.zoomAt((e.clientX + other.x) / 2 - r.left, (e.clientY + other.y) / 2 - r.top, d1 / d0);
        }
      }
      p.x = e.clientX; p.y = e.clientY;
      self.schedule(true);
    });
    function up(e) { delete self.pointers[e.pointerId]; self.schedule(); }
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      self.touched = true;
      var r = canvas.getBoundingClientRect();
      self.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015)));
      self.schedule();
    }, { passive: false });
    canvas.addEventListener('keydown', function (e) {
      var k = e.key, s = 40 / self.view.scale, used = true;
      var sy2 = 40 / self.view.yscale;
      if (k === 'ArrowLeft') self.view.cx -= s; else if (k === 'ArrowRight') self.view.cx += s;
      else if (k === 'ArrowUp') self.view.cy += sy2; else if (k === 'ArrowDown') self.view.cy -= sy2;
      else if (k === '+' || k === '=') self.zoomAt(self.w / 2, self.h / 2, 1.25);
      else if (k === '-' || k === '_') self.zoomAt(self.w / 2, self.h / 2, 0.8);
      else if (k === '0') self.reset();
      else used = false;
      if (used) { self.touched = true; e.preventDefault(); self.schedule(); }
    });
  }
  Plot2D.prototype.resize = function () {
    var r = this.c.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(10, r.width); this.h = Math.max(10, r.height);
    this.c.width = Math.round(this.w * dpr); this.c.height = Math.round(this.h * dpr);
    this.dpr = dpr;
  };
  Plot2D.prototype.zoomAt = function (px, py, f) {
    var v = this.view, wx = this.sx(px), wy = this.sy(py);
    var g = Math.min(1e6 / Math.max(v.scale, v.yscale), Math.max(1e-3 / Math.min(v.scale, v.yscale), f));
    v.scale *= g; v.yscale *= g;
    v.cx = wx - (px - this.w / 2) / v.scale;
    v.cy = wy + (py - this.h / 2) / v.yscale;
  };
  Plot2D.prototype.reset = function () { this.view = { cx: 0, cy: 0, scale: 40, yscale: 40 }; if (this.home) this.fit(this.home); };
  Plot2D.prototype.fit = function (b) {
    this.home = b;
    var sx = this.w / (b.x1 - b.x0), sy = this.h / (b.y1 - b.y0);
    if (b.free) { this.view.scale = Math.max(1e-3, sx); this.view.yscale = Math.max(1e-3, sy); }
    else this.view.scale = this.view.yscale = Math.max(1e-3, Math.min(sx, sy));
    this.view.cx = (b.x0 + b.x1) / 2; this.view.cy = (b.y0 + b.y1) / 2;
  };
  Plot2D.prototype.px = function (x) { return this.w / 2 + (x - this.view.cx) * this.view.scale; };
  Plot2D.prototype.py = function (y) { return this.h / 2 - (y - this.view.cy) * this.view.yscale; };
  Plot2D.prototype.sx = function (px) { return this.view.cx + (px - this.w / 2) / this.view.scale; };
  Plot2D.prototype.sy = function (py) { return this.view.cy - (py - this.h / 2) / this.view.yscale; };
  Plot2D.prototype.schedule = function (fast) {
    var self = this;
    this.fast = !!fast;
    if (this.raf) return;
    this.raf = requestAnimationFrame(function () { self.raf = 0; self.draw(); if (self.onview) self.onview(); });
  };
  Plot2D.prototype.set = function (items) {
    this.items = { fns: items.fns || [], implicit: items.implicit || [], regions: items.regions || [], points: items.points || [], shade: items.shade || null, xIntervals: items.xIntervals || null };
    this.draw();
  };
  Plot2D.prototype.draw = function () {
    try { this.drawInner(); } catch (e) { /* drawing must never throw */ }
  };
  Plot2D.prototype.drawInner = function () {
    var ctx = this.ctx, w = this.w, h = this.h, c = this.c;
    if (!w || !h) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    var bg = css(c, '--vz-plot-bg', '#fff'), grid = css(c, '--vz-grid', '#e8e6f5'), grid2 = css(c, '--vz-grid-strong', '#d2cfe8'),
      axis = css(c, '--vz-axis', '#3a3650'), text = css(c, '--vz-tick', '#6b6785');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    var x0 = this.sx(0), x1 = this.sx(w), y0 = this.sy(h), y1 = this.sy(0);
    function minorOf(st) { return st / (Math.round(st / Math.pow(10, Math.floor(Math.log10(st) + 1e-9))) === 2 ? 4 : 5); }
    var step = niceStep(80 / this.view.scale), ystep = niceStep(70 / this.view.yscale);
    var minor = minorOf(step), yminor = minorOf(ystep);
    ctx.lineWidth = 1;
    ctx.strokeStyle = grid;
    ctx.beginPath();
    var i, v, p;
    if (minor * this.view.scale > 6) for (v = Math.ceil(x0 / minor) * minor; v <= x1; v += minor) { p = Math.round(this.px(v)) + 0.5; ctx.moveTo(p, 0); ctx.lineTo(p, h); }
    if (yminor * this.view.yscale > 6) for (v = Math.ceil(y0 / yminor) * yminor; v <= y1; v += yminor) { p = Math.round(this.py(v)) + 0.5; ctx.moveTo(0, p); ctx.lineTo(w, p); }
    ctx.stroke();
    ctx.strokeStyle = grid2;
    ctx.beginPath();
    for (v = Math.ceil(x0 / step) * step; v <= x1; v += step) { p = Math.round(this.px(v)) + 0.5; ctx.moveTo(p, 0); ctx.lineTo(p, h); }
    for (v = Math.ceil(y0 / ystep) * ystep; v <= y1; v += ystep) { p = Math.round(this.py(v)) + 0.5; ctx.moveTo(0, p); ctx.lineTo(w, p); }
    ctx.stroke();
    // regions (inequalities) and implicit curves
    var self = this;
    this.items.regions.forEach(function (r) { self.drawRegion(r); });
    if (this.items.shade) this.drawShade(this.items.shade);
    // axes
    var ax = this.px(0), ay = this.py(0);
    ctx.strokeStyle = axis; ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (ay >= 0 && ay <= h) { ctx.moveTo(0, ay); ctx.lineTo(w, ay); }
    if (ax >= 0 && ax <= w) { ctx.moveTo(ax, 0); ctx.lineTo(ax, h); }
    ctx.stroke();
    // tick labels
    ctx.fillStyle = text; ctx.font = '11px system-ui, -apple-system, sans-serif';
    var lyX = Math.min(h - 4, Math.max(13, ay + 14));
    ctx.textAlign = 'center';
    for (v = Math.ceil(x0 / step) * step; v <= x1; v += step) {
      if (Math.abs(v) < step / 2) continue;
      p = this.px(v);
      if (p < 12 || p > w - 12) continue;
      ctx.fillText(tickLabel(v, step), p, lyX);
    }
    var lxY = Math.min(w - 4, Math.max(4, ax - 5));
    ctx.textAlign = ax - 5 < 30 ? 'left' : 'right';
    if (ax - 5 < 30) lxY = Math.max(4, ax + 5);
    for (v = Math.ceil(y0 / ystep) * ystep; v <= y1; v += ystep) {
      if (Math.abs(v) < ystep / 2) continue;
      p = this.py(v);
      if (p < 10 || p > h - 6) continue;
      ctx.fillText(tickLabel(v, ystep), lxY, p + 4);
    }
    if (ax > 0 && ax < w && ay > 0 && ay < h) { ctx.textAlign = 'right'; ctx.fillText('0', ax - 4, ay + 13); }
    if (this.items.xIntervals) this.drawIntervals(this.items.xIntervals);
    this.items.implicit.forEach(function (it) { self.drawImplicit(it); });
    this.items.fns.forEach(function (fn) { self.drawFn(fn); });
    this.items.points.forEach(function (pt) { self.drawPoint(pt); });
  };
  Plot2D.prototype.drawFn = function (fn) {
    var ctx = this.ctx, w = this.w, h = this.h, f = fn.f, step = this.fast ? 2 : 1;
    ctx.strokeStyle = fn.color || PALETTE[0]; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
    ctx.setLineDash(fn.dash ? [6, 5] : []);
    ctx.beginPath();
    var pen = false, prevY = NaN, prevX = NaN;
    for (var px = -step; px <= w + step; px += step) {
      var x = this.sx(px), y = f(x), py = this.py(y);
      if (!isFinite(y) || Math.abs(py) > 1e6) { pen = false; prevY = NaN; continue; }
      if (pen) {
        var jump = Math.abs(py - prevY) > h;
        if (jump) {
          var ym = f(this.sx(px - step / 2)), pm = this.py(ym);
          if (!isFinite(ym) || pm < Math.min(prevY, py) - 1 || pm > Math.max(prevY, py) + 1) pen = false;
        }
      }
      if (pen) ctx.lineTo(px, Math.max(-h, Math.min(2 * h, py)));
      else ctx.moveTo(px, Math.max(-h, Math.min(2 * h, py)));
      pen = true; prevY = py; prevX = px;
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };
  Plot2D.prototype.grid = function (F2, cell) {
    var w = this.w, h = this.h, nx = Math.ceil(w / cell) + 1, ny = Math.ceil(h / cell) + 1, g = new Float64Array(nx * ny);
    for (var j = 0; j < ny; j++) { var y = this.sy(j * cell); for (var i = 0; i < nx; i++) g[j * nx + i] = F2(this.sx(i * cell), y); }
    return { g: g, nx: nx, ny: ny, cell: cell };
  };
  Plot2D.prototype.drawImplicit = function (it) {
    var cell = this.fast ? 8 : 4, G = this.grid(it.f, cell), g = G.g, nx = G.nx, ny = G.ny, ctx = this.ctx;
    ctx.strokeStyle = it.color || PALETTE[0]; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.setLineDash(it.dash ? [6, 5] : []);
    ctx.beginPath();
    function lerp(a, b) { return a / (a - b); }
    for (var j = 0; j < ny - 1; j++) {
      for (var i = 0; i < nx - 1; i++) {
        var a = g[j * nx + i], b = g[j * nx + i + 1], c = g[(j + 1) * nx + i + 1], d = g[(j + 1) * nx + i];
        if (!(isFinite(a) && isFinite(b) && isFinite(c) && isFinite(d))) continue;
        var X = i * cell, Y = j * cell, pts = [];
        if ((a > 0) !== (b > 0)) pts.push([X + cell * lerp(a, b), Y]);
        if ((b > 0) !== (c > 0)) pts.push([X + cell, Y + cell * lerp(b, c)]);
        if ((d > 0) !== (c > 0)) pts.push([X + cell * lerp(d, c), Y + cell]);
        if ((a > 0) !== (d > 0)) pts.push([X, Y + cell * lerp(a, d)]);
        if (pts.length < 2) continue;
        // reject sign changes across poles (values blow up instead of crossing zero)
        var mx = Math.max(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d)), mn = Math.min(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d));
        if (mx > 1e3 * (mn + 1) && mx > 1e6) continue;
        ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]);
        if (pts.length === 4) { ctx.moveTo(pts[2][0], pts[2][1]); ctx.lineTo(pts[3][0], pts[3][1]); }
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };
  Plot2D.prototype.drawRegion = function (r) {
    var cell = this.fast ? 8 : 4, G = this.grid(r.f, cell), ctx = this.ctx;
    ctx.fillStyle = r.color || PALETTE[0];
    ctx.globalAlpha = 0.16;
    for (var j = 0; j < G.ny - 1; j++) for (var i = 0; i < G.nx - 1; i++) {
      var v = G.g[j * G.nx + i];
      if (r.test(v)) ctx.fillRect(i * cell, j * cell, cell, cell);
    }
    ctx.globalAlpha = 1;
    this.drawImplicit({ f: r.f, color: r.color, dash: r.strict });
  };
  Plot2D.prototype.drawShade = function (s) {
    var ctx = this.ctx, f = this.items.fns[0] && this.items.fns[0].f;
    if (!f) return;
    var a = Math.min(s.a, s.b), b = Math.max(s.a, s.b), y0 = this.py(0);
    ctx.fillStyle = css(this.c, '--accent', PALETTE[0]); ctx.globalAlpha = 0.2;
    ctx.beginPath(); ctx.moveTo(this.px(a), y0);
    var n = 200;
    for (var i = 0; i <= n; i++) { var x = a + (b - a) * i / n, y = f(x); if (isFinite(y)) ctx.lineTo(this.px(x), this.py(y)); }
    ctx.lineTo(this.px(b), y0); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  };
  Plot2D.prototype.drawIntervals = function (ivs) {
    var ctx = this.ctx, y = Math.max(4, Math.min(this.h - 4, this.py(0)));
    ctx.strokeStyle = css(this.c, '--vz-good', '#0E9E6E'); ctx.lineWidth = 6; ctx.globalAlpha = 0.55; ctx.lineCap = 'butt';
    ctx.beginPath();
    var self = this;
    ivs.forEach(function (iv) {
      var a = isFinite(iv.a) ? self.px(iv.a) : -10, b = isFinite(iv.b) ? self.px(iv.b) : self.w + 10;
      ctx.moveTo(Math.max(-10, a), y); ctx.lineTo(Math.min(self.w + 10, b), y);
    });
    ctx.stroke(); ctx.globalAlpha = 1;
  };
  Plot2D.prototype.drawPoint = function (pt) {
    if (!isFinite(pt.x) || !isFinite(pt.y)) return;
    var ctx = this.ctx, x = this.px(pt.x), y = this.py(pt.y);
    if (x < -10 || x > this.w + 10 || y < -10 || y > this.h + 10) return;
    ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = pt.hollow ? css(this.c, '--vz-plot-bg', '#fff') : (pt.color || css(this.c, '--vz-axis', '#222'));
    ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = pt.color || css(this.c, '--vz-axis', '#222'); ctx.stroke();
  };
  // a view that contains the given points and a sensible slice of the curves
  function autoBounds(plot, fallback) {
    var xs = [], ys = [];
    (plot.points || []).forEach(function (p) { if (isFinite(p.x) && isFinite(p.y) && Math.abs(p.x) < 1e4 && Math.abs(p.y) < 1e4) { xs.push(p.x); ys.push(p.y); } });
    if (plot.shade) { xs.push(plot.shade.a, plot.shade.b); }
    (plot.xIntervals || []).forEach(function (iv) { if (isFinite(iv.a)) xs.push(iv.a); if (isFinite(iv.b)) xs.push(iv.b); });
    var x0, x1;
    if (xs.length) {
      x0 = Math.min.apply(null, xs.concat([0])); x1 = Math.max.apply(null, xs.concat([0]));
      if (x1 - x0 < 4) { var mid = (x0 + x1) / 2; x0 = mid - 2; x1 = mid + 2; }
    } else { x0 = -5; x1 = 5; }
    var pad = (x1 - x0) * 0.2; x0 -= pad; x1 += pad;
    (plot.fns || []).forEach(function (fn) {
      for (var i = 0; i <= 80; i++) { var x = x0 + (x1 - x0) * i / 80, y = fn.f(x); if (isFinite(y)) ys.push(y); }
    });
    ys.sort(function (a, b) { return a - b; });
    var y0 = -5, y1 = 5;
    if (ys.length) {
      y0 = ys[Math.floor(ys.length * 0.1)]; y1 = ys[Math.ceil(ys.length * 0.9) - 1];
      (plot.points || []).forEach(function (p) { if (isFinite(p.y) && Math.abs(p.y) < 1e4) { y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); } });
      y0 = Math.min(y0, 0); y1 = Math.max(y1, 0);
      if (y1 - y0 < 1) { y0 -= 1; y1 += 1; }
      var py = (y1 - y0) * 0.15; y0 -= py; y1 += py;
    }
    if (fallback && !(plot.fns || []).length && !(plot.points || []).length) return fallback;
    return { x0: x0, x1: x1, y0: y0, y1: y1 };
  }

  /* ---------------- sliders ---------------- */
  function Sliders(container, onChange) {
    this.box = container; this.values = {}; this.names = []; this.onChange = onChange;
    this.uid = container.id || ('s' + Math.random().toString(36).slice(2));
  }
  Sliders.prototype.render = function (names) {
    names = names.slice().sort();
    if (names.join() === this.names.join()) { this.relabel(); return; }
    this.names = names;
    var self = this;
    this.box.innerHTML = '';
    this.box.hidden = !names.length;
    names.forEach(function (n) {
      if (self.values[n] === undefined) self.values[n] = PARAM_DEFAULT;
      var id = self.uid + '-' + n;
      var row = el('div', { class: 'vz-slider' });
      var lab = el('label', { for: id }, n);
      var input = el('input', { type: 'range', id: id, min: '-10', max: '10', step: '0.1', value: String(self.values[n]), 'aria-label': T('slider', n) });
      var out = el('output', { for: id }, fmtSlider(self.values[n]));
      input.addEventListener('input', function () {
        self.values[n] = parseFloat(input.value);
        out.textContent = fmtSlider(self.values[n]);
        self.onChange();
      });
      row.appendChild(lab); row.appendChild(input); row.appendChild(out);
      self.box.appendChild(row);
    });
  };
  Sliders.prototype.relabel = function () {
    var self = this;
    this.box.querySelectorAll('input[type=range]').forEach(function (inp, i) { inp.setAttribute('aria-label', T('slider', self.names[i])); });
  };
  function fmtSlider(v) { return (Math.round(v * 10) / 10).toFixed(1).replace('-', '−'); }

  /* ---------------- Graph tab ---------------- */
  function GraphTab(root) {
    var self = this;
    this.input = root.querySelector('#vz-graph-input');
    this.err = root.querySelector('#vz-graph-error');
    this.feat = root.querySelector('#vz-graph-features');
    this.plot = new Plot2D(root.querySelector('#vz-graph-canvas'), { scale: 40 });
    this.plot.fit({ x0: -8, x1: 8, y0: -6, y1: 6 });
    this.sliders = new Sliders(root.querySelector('#vz-graph-sliders'), function () { self.update(); });
    var t = 0;
    this.input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { self.update(true); }, 160); });
    root.querySelectorAll('[data-vz-graph-zoom]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-vz-graph-zoom');
        if (k === 'reset') { self.plot.touched = false; self.plot.fit({ x0: -8, x1: 8, y0: -6, y1: 6 }); }
        else self.plot.touched = true, self.plot.zoomAt(self.plot.w / 2, self.plot.h / 2, k === 'in' ? 1.25 : 0.8);
        self.plot.draw();
      });
    });
    root.querySelectorAll('[data-vz-graph-example]').forEach(function (b) {
      b.addEventListener('click', function () { self.input.value = b.getAttribute('data-vz-graph-example').replace(/\\n/g, '\n'); self.update(true); });
    });
    this.update(true);
  }
  GraphTab.prototype.parseLines = function () {
    var lines = this.input.value.split('\n'), items = [], errors = [], params = {};
    lines.forEach(function (line, idx) {
      var s = line.trim();
      if (!s || s[0] === '#') return;
      try {
        s = s.replace(/^[a-zA-Z]\s*\(\s*x\s*\)\s*=/, 'y =');
        var rel = parseRelation(s), item;
        if (rel.expr) {
          if (hasVar(rel.expr, 'y')) item = { kind: 'implicit', node: rel.expr };
          else item = { kind: 'explicit', node: rel.expr };
        } else if (rel.op === '=') {
          if (rel.lhs.t === 'var' && rel.lhs.n === 'y' && !hasVar(rel.rhs, 'y')) item = { kind: 'explicit', node: rel.rhs };
          else if (rel.rhs.t === 'var' && rel.rhs.n === 'y' && !hasVar(rel.lhs, 'y')) item = { kind: 'explicit', node: rel.lhs };
          else item = { kind: 'implicit', node: B('-', rel.lhs, rel.rhs) };
        } else {
          item = { kind: 'region', node: B('-', rel.lhs, rel.rhs), op: rel.op };
        }
        item.src = s; item.line = idx + 1;
        Object.keys(freeVars(item.node)).forEach(function (v) { if (v !== 'x' && v !== 'y') params[v] = true; });
        items.push(item);
      } catch (e) {
        errors.push(T('err.graphLine', idx + 1, e.message || e));
      }
    });
    return { items: items, errors: errors, params: Object.keys(params) };
  };
  GraphTab.prototype.update = function (reparse) {
    try {
      if (reparse || !this.parsed) {
        this.parsed = this.parseLines();
        this.sliders.render(this.parsed.params);
        this.err.textContent = this.parsed.errors.join(' ');
        this.err.hidden = !this.parsed.errors.length;
      }
      var env = {}, sv = this.sliders.values;
      this.parsed.params.forEach(function (n) { env[n] = sv[n]; });
      var fns = [], implicit = [], regions = [], points = [], feats = [];
      this.parsed.items.forEach(function (it, i) {
        var color = PALETTE[i % PALETTE.length], f = compile(it.node), e = Object.assign({}, env);
        if (it.kind === 'explicit') {
          var fx = function (x) { e.x = x; return f(e); };
          fns.push({ f: fx, color: color });
          var envQ = {}; for (var k in env) envQ[k] = paramValue(env, k);
          var a = analyze(it.node, 'x', envQ);
          a.roots.slice(0, 30).forEach(function (r) { points.push({ x: r.v, y: 0, color: color }); });
          if (a.yint !== null) points.push({ x: 0, y: F(a.yint), color: color });
          a.extrema.slice(0, 30).forEach(function (ex) { points.push({ x: ex.x, y: ex.y, color: color, hollow: true }); });
          feats.push({ color: color, src: it.src, a: a });
        } else if (it.kind === 'implicit') {
          var g = function (x, y) { e.x = x; e.y = y; return f(e); };
          implicit.push({ f: g, color: color });
          feats.push({ color: color, src: it.src, note: T('g.implicit') });
        } else {
          var op = it.op;
          var test = function (v) { return op === '<' ? v < 0 : op === '<=' ? v <= 0 : op === '>' ? v > 0 : op === '>=' ? v >= 0 : v !== 0; };
          regions.push({ f: function (x, y) { e.x = x; e.y = y; return f(e); }, color: color, test: test, strict: op === '<' || op === '>' });
          feats.push({ color: color, src: it.src, note: T('g.region') });
        }
      });
      this.plot.set({ fns: fns, implicit: implicit, regions: regions, points: points });
      this.renderFeatures(feats);
    } catch (e) {
      this.err.textContent = (e && e.message) || String(e); this.err.hidden = false;
    }
  };
  GraphTab.prototype.renderFeatures = function (feats) {
    var box = this.feat;
    box.innerHTML = '';
    if (!feats.length) { box.appendChild(el('p', { class: 'vz-muted' }, T('g.empty'))); return; }
    var list = el('ul', { class: 'vz-feat' });
    feats.forEach(function (ft) {
      var li = el('li');
      var sw = el('span', { class: 'vz-swatch', 'aria-hidden': 'true' }); sw.style.background = ft.color;
      li.appendChild(sw);
      li.appendChild(el('strong', null, pretty(ft.src)));
      var body;
      if (ft.a) {
        var a = ft.a, parts = [];
        parts.push(T('g.roots') + ': ' + (a.roots.length ? a.roots.slice(0, 8).map(function (r) { return fmtNum(r.v, 4).replace('-', '−'); }).join(', ') + (a.roots.length > 8 ? ' …' : '') : T('g.none')));
        parts.push(T('g.yint') + ': ' + (a.yint !== null ? fmtNum(F(a.yint), 4).replace('-', '−') : T('g.none')));
        parts.push(T('g.extrema') + ': ' + (a.extrema.length ? a.extrema.slice(0, 6).map(function (e) {
          return (e.vertex ? T('fa.vertex') : T('fa.' + e.kind)) + ' (' + fmtNum(e.x, 4) + ', ' + fmtNum(e.y, 4) + ')';
        }).join(', ').replace(/-/g, '−') + (a.extrema.length > 6 ? ' …' : '') : T('g.none')));
        body = parts.join(' · ');
      } else body = ft.note;
      li.appendChild(el('span', null, body));
      list.appendChild(li);
    });
    box.appendChild(list);
    if (feats.some(function (f) { return f.a; })) box.appendChild(el('p', { class: 'vz-muted' }, T('g.range')));
  };

  /* ---------------- 3D tab ---------------- */
  var VIRIDIS = [[68, 1, 84], [72, 40, 120], [62, 74, 137], [49, 104, 142], [38, 130, 142], [31, 158, 137], [53, 183, 121], [109, 205, 89], [180, 222, 44], [253, 231, 37]];
  function viridis(t) {
    t = Math.max(0, Math.min(1, t)) * (VIRIDIS.length - 1);
    var i = Math.min(VIRIDIS.length - 2, Math.floor(t)), f = t - i, a = VIRIDIS[i], b = VIRIDIS[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }
  function SurfaceTab(root) {
    var self = this;
    this.input = root.querySelector('#vz-3d-input');
    this.err = root.querySelector('#vz-3d-error');
    this.info = root.querySelector('#vz-3d-info');
    this.c = root.querySelector('#vz-3d-canvas');
    this.ctx = this.c.getContext('2d');
    this.rotBtn = root.querySelector('#vz-3d-rotate');
    this.yaw = -0.7; this.pitch = 0.55; this.zoom = 1; this.range = 5; this.N = 36;
    this.auto = !(reduceMotion && reduceMotion.matches);
    this.visible = true;
    this.sliders = new Sliders(root.querySelector('#vz-3d-sliders'), function () { self.compute(); self.draw(); });
    var t = 0;
    this.input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { self.reparse(); }, 160); });
    root.querySelectorAll('[data-vz-3d-example]').forEach(function (b) {
      b.addEventListener('click', function () { self.input.value = b.getAttribute('data-vz-3d-example'); self.reparse(); });
    });
    this.rotBtn.addEventListener('click', function () { self.setAuto(!self.auto); });
    var drag = null;
    this.c.addEventListener('pointerdown', function (e) { self.c.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY }; self.wasAuto = self.auto; self.auto = false; });
    this.c.addEventListener('pointermove', function (e) {
      if (!drag) return;
      self.yaw -= (e.clientX - drag.x) * 0.01;
      self.pitch = Math.max(-1.45, Math.min(1.45, self.pitch + (e.clientY - drag.y) * 0.01));
      drag = { x: e.clientX, y: e.clientY };
      self.schedule();
    });
    function up() { if (drag) { drag = null; self.auto = self.wasAuto; self.loop(); } }
    this.c.addEventListener('pointerup', up); this.c.addEventListener('pointercancel', up);
    this.c.addEventListener('wheel', function (e) {
      e.preventDefault();
      self.zoom = Math.max(0.4, Math.min(3, self.zoom * Math.exp(-e.deltaY * 0.0015)));
      self.schedule();
    }, { passive: false });
    this.c.addEventListener('keydown', function (e) {
      var used = true;
      if (e.key === 'ArrowLeft') self.yaw += 0.12; else if (e.key === 'ArrowRight') self.yaw -= 0.12;
      else if (e.key === 'ArrowUp') self.pitch = Math.min(1.45, self.pitch + 0.1); else if (e.key === 'ArrowDown') self.pitch = Math.max(-1.45, self.pitch - 0.1);
      else if (e.key === '+' || e.key === '=') self.zoom = Math.min(3, self.zoom * 1.15);
      else if (e.key === '-') self.zoom = Math.max(0.4, self.zoom / 1.15);
      else if (e.key === ' ') self.setAuto(!self.auto);
      else used = false;
      if (used) { e.preventDefault(); self.schedule(); }
    });
    if (reduceMotion && reduceMotion.addEventListener) reduceMotion.addEventListener('change', function () { self.setAuto(!reduceMotion.matches); });
    if (window.ResizeObserver) new ResizeObserver(function () { self.draw(); }).observe(this.c);
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { self.visible = es[0].isIntersecting; self.loop(); }).observe(this.c);
    this.setAuto(this.auto);
    this.reparse();
  }
  SurfaceTab.prototype.setAuto = function (on) {
    this.auto = on;
    this.rotBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    this.loop();
  };
  SurfaceTab.prototype.loop = function () {
    var self = this;
    if (this.running || !this.auto || !this.visible || this.c.offsetParent === null) return;
    this.running = true;
    var last = performance.now();
    function frame(now) {
      if (!self.auto || !self.visible || self.c.offsetParent === null) { self.running = false; return; }
      self.yaw += Math.min(50, now - last) * 0.00035; last = now;
      self.draw();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };
  SurfaceTab.prototype.schedule = function () {
    var self = this;
    if (this.raf) return;
    this.raf = requestAnimationFrame(function () { self.raf = 0; self.draw(); });
  };
  SurfaceTab.prototype.reparse = function () {
    try {
      var s = this.input.value.trim(), node;
      var rel = parseRelation(s);
      if (rel.expr) node = rel.expr;
      else if (rel.op === '=' && rel.lhs.t === 'var' && rel.lhs.n === 'z' && !hasVar(rel.rhs, 'z')) node = rel.rhs;
      else if (rel.op === '=' && rel.rhs.t === 'var' && rel.rhs.n === 'z' && !hasVar(rel.lhs, 'z')) node = rel.lhs;
      else throw new MathError('err.3dform');
      if (hasVar(node, 'z')) throw new MathError('err.3dform');
      this.node = node; this.f = compile(node);
      this.params = Object.keys(freeVars(node)).filter(function (v) { return v !== 'x' && v !== 'y'; });
      this.sliders.render(this.params);
      this.err.hidden = true; this.err.textContent = '';
      this.compute(); this.draw();
    } catch (e) {
      this.err.textContent = e.message || String(e); this.err.hidden = false;
    }
  };
  SurfaceTab.prototype.compute = function () {
    if (!this.f) return;
    var N = this.N, R = this.range, env = {}, sv = this.sliders.values, zs = [], zmin = Infinity, zmax = -Infinity;
    this.params.forEach(function (n) { env[n] = sv[n]; });
    for (var j = 0; j <= N; j++) for (var i = 0; i <= N; i++) {
      env.x = -R + 2 * R * i / N; env.y = -R + 2 * R * j / N;
      var z = this.f(env);
      if (!isFinite(z)) z = NaN;
      zs.push(z);
      if (isFinite(z)) { zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); }
    }
    if (!isFinite(zmin)) { zmin = -1; zmax = 1; }
    if (zmax - zmin < 1e-9) { zmin -= 1; zmax += 1; }
    this.zs = zs; this.zmin = zmin; this.zmax = zmax;
    this.info.textContent = T('g3.range', fmtNum(zmin, 3), fmtNum(zmax, 3), R).replace(/-/g, '−');
  };
  SurfaceTab.prototype.draw = function () { try { this.drawInner(); } catch (e) { /* never throw */ } };
  SurfaceTab.prototype.drawInner = function () {
    var c = this.c, r = c.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!r.width || !this.zs) return;
    if (c.width !== Math.round(r.width * dpr) || c.height !== Math.round(r.height * dpr)) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); }
    var ctx = this.ctx, w = r.width, h = r.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = css(c, '--vz-plot-bg', '#fff'); ctx.fillRect(0, 0, w, h);
    var cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    var f = Math.min(w, h) * 1.3 * this.zoom, dist = 4.2;
    var zmin = this.zmin, zmax = this.zmax, H = 0.75;
    function proj(x, y, z) { // world: x, y in [-1, 1], z up; yaw about z, then pitch
      var X = x * cy - y * sy, Y = x * sy + y * cy;
      var Zv = z * cp + Y * sp, Dv = Y * cp - z * sp, k = f / (dist + Dv);
      return { x: w / 2 + X * k, y: h / 2 - Zv * k, d: Dv };
    }
    var self = this;
    function zN(z) { return ((z - zmin) / (zmax - zmin) * 2 - 1) * H; }
    var axis = css(c, '--vz-axis', '#333'), text = css(c, '--vz-tick', '#666'), grid = css(c, '--vz-grid-strong', '#ccc');
    // floor grid
    ctx.strokeStyle = grid; ctx.lineWidth = 1;
    ctx.beginPath();
    for (var k = -4; k <= 4; k++) {
      var t = k / 4, a = proj(t, -1, -H), b = proj(t, 1, -H); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      a = proj(-1, t, -H); b = proj(1, t, -H); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
    // axes
    var axes = [
      { a: [-1.15, 0, 0], b: [1.25, 0, 0], col: '#E5484D', label: 'x' },
      { a: [0, -1.15, 0], b: [0, 1.25, 0], col: '#30A46C', label: 'y' },
      { a: [0, 0, -H - 0.1], b: [0, 0, H + 0.35], col: '#3E63DD', label: 'z' }
    ];
    var zeroZ = zmin <= 0 && zmax >= 0 ? zN(0) : -H;
    axes[0].a[2] = axes[0].b[2] = zeroZ; axes[1].a[2] = axes[1].b[2] = zeroZ;
    ctx.lineWidth = 1.6;
    axes.forEach(function (ax) {
      var p = proj(ax.a[0], ax.a[1], ax.a[2]), q = proj(ax.b[0], ax.b[1], ax.b[2]);
      ctx.strokeStyle = ax.col; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    });
    // quads
    var N = this.N, zs = this.zs, quads = [], L = [0.35, -0.45, 0.82], ln = Math.hypot(L[0], L[1], L[2]);
    L = [L[0] / ln, L[1] / ln, L[2] / ln];
    var P = [];
    for (var j = 0; j <= N; j++) for (var i = 0; i <= N; i++) {
      var z = zs[j * (N + 1) + i], xw = -1 + 2 * i / N, yw = -1 + 2 * j / N, zw = isFinite(z) ? Math.max(-H * 1.6, Math.min(H * 1.6, zN(z))) : NaN;
      P.push({ w: [xw, yw, zw], p: isFinite(zw) ? proj(xw, yw, zw) : null, z: z });
    }
    for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
      var A = P[j * (N + 1) + i], Bq = P[j * (N + 1) + i + 1], C = P[(j + 1) * (N + 1) + i + 1], Dq = P[(j + 1) * (N + 1) + i];
      if (!A.p || !Bq.p || !C.p || !Dq.p) continue;
      var ux = Bq.w[0] - A.w[0], uz = Bq.w[2] - A.w[2], vy = Dq.w[1] - A.w[1], vz = Dq.w[2] - A.w[2];
      var nx = -uz * vy, ny = -ux * vz, nz = ux * vy, nl = Math.hypot(nx, ny, nz) || 1;
      var lam = Math.abs((nx * L[0] + ny * L[1] + nz * L[2]) / nl);
      var zt = ((A.z + Bq.z + C.z + Dq.z) / 4 - zmin) / (zmax - zmin);
      quads.push({ pts: [A.p, Bq.p, C.p, Dq.p], d: (A.p.d + Bq.p.d + C.p.d + Dq.p.d) / 4, lam: lam, zt: zt });
    }
    quads.sort(function (a, b) { return b.d - a.d; });
    var wire = css(c, '--vz-wire', 'rgba(20,16,40,.28)');
    ctx.lineWidth = 0.6; ctx.strokeStyle = wire; ctx.lineJoin = 'round';
    quads.forEach(function (q) {
      var col = viridis(q.zt), s = 0.45 + 0.55 * q.lam;
      ctx.fillStyle = 'rgb(' + Math.round(col[0] * s) + ',' + Math.round(col[1] * s) + ',' + Math.round(col[2] * s) + ')';
      ctx.beginPath();
      ctx.moveTo(q.pts[0].x, q.pts[0].y); ctx.lineTo(q.pts[1].x, q.pts[1].y); ctx.lineTo(q.pts[2].x, q.pts[2].y); ctx.lineTo(q.pts[3].x, q.pts[3].y);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    // axis labels and end ticks on top
    ctx.font = '600 13px system-ui, -apple-system, sans-serif'; ctx.textAlign = 'center';
    axes.forEach(function (ax) {
      var q = proj(ax.b[0] * 1.06, ax.b[1] * 1.06, ax.b[2] + (ax.label === 'z' ? 0.06 : 0));
      ctx.fillStyle = ax.col; ctx.fillText(ax.label, q.x, q.y + 4);
    });
    ctx.font = '11px system-ui, -apple-system, sans-serif'; ctx.fillStyle = text;
    var R = this.range;
    [[1, 0, zeroZ, String(R)], [-1, 0, zeroZ, '−' + R], [0, 1, zeroZ, String(R)], [0, -1, zeroZ, '−' + R],
      [0, 0, H, fmtNum(zmax, 3).replace('-', '−')], [0, 0, -H, fmtNum(zmin, 3).replace('-', '−')]].forEach(function (tk) {
      var p = proj(tk[0], tk[1], tk[2]);
      ctx.fillText(tk[3], p.x + (tk[0] === 0 && tk[1] === 0 ? 18 : 0), p.y + 14);
    });
  };

  /* ---------------- Solve tab ---------------- */
  function SolveTab(root) {
    var self = this;
    this.input = root.querySelector('#vz-solve-input');
    this.out = root.querySelector('#vz-solve-output');
    this.sliders = new Sliders(root.querySelector('#vz-solve-sliders'), function () { self.run(false); });
    root.querySelector('#vz-solve-form').addEventListener('submit', function (e) { e.preventDefault(); self.run(true); });
    this.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); self.run(true); }
    });
    root.querySelectorAll('[data-vz-solve-example]').forEach(function (b) {
      b.addEventListener('click', function () { self.input.value = b.getAttribute('data-vz-solve-example').replace(/\\n/g, '\n'); self.run(true); });
    });
    this.run(true);
  }
  SolveTab.prototype.run = function (fresh) {
    var self = this;
    try {
      var text = this.input.value;
      if (fresh) {
        var probe = solve(text, this.sliders.values);
        this.sliders.render(probe.ok ? probe.params : []);
      }
      var r = solve(text, this.sliders.values);
      this.render(r);
    } catch (e) {
      this.render({ ok: false, error: (e && e.message) || String(e) });
    }
  };
  SolveTab.prototype.render = function (r) {
    var out = this.out;
    out.innerHTML = '';
    if (!r.ok) {
      out.appendChild(el('p', { class: 'vz-error' }, r.error));
      return;
    }
    var ans = el('div', { class: 'vz-answer' });
    ans.appendChild(el('span', { class: 'vz-answer-label' }, T('answer')));
    ans.appendChild(el('div', { class: 'vz-answer-math' }, pretty(r.answer)));
    if (r.notation) ans.appendChild(el('div', { class: 'vz-answer-sub' }, pretty(r.notation)));
    (r.summary || []).forEach(function (s) { ans.appendChild(el('div', { class: 'vz-answer-sub' }, s)); });
    var stepsBox = el('div', { class: 'vz-steps' });
    stepsBox.appendChild(el('h4', null, T('steps')));
    var ol = el('ol');
    r.steps.forEach(function (s) { ol.appendChild(el('li', null, pretty(s))); });
    stepsBox.appendChild(ol);
    var layout = el('div', { class: 'vz-solve-layout' }), left = el('div', { class: 'vz-out' });
    left.appendChild(stepsBox);
    left.appendChild(ans);
    layout.appendChild(left);
    out.appendChild(layout);
    if (r.plot) {
      var wrapDiv = el('div', { class: 'vz-mini' });
      var cv = el('canvas', { class: 'vz-canvas vz-canvas-mini', tabindex: '0', role: 'img', 'aria-label': T('plot.label') });
      wrapDiv.appendChild(cv);
      layout.appendChild(wrapDiv);
      var plot = new Plot2D(cv, {});
      var p = r.plot, items = { fns: [], implicit: [], points: [], shade: p.shade, xIntervals: p.xIntervals };
      (p.fns || []).forEach(function (fn, i) { items.fns.push({ f: safeFn(fn.f), color: PALETTE[i % PALETTE.length], dash: fn.dash }); });
      (p.implicit || []).forEach(function (fn, i) { items.implicit.push({ f: fn, color: PALETTE[i % PALETTE.length] }); });
      (p.points || []).forEach(function (pt) { items.points.push({ x: pt.x, y: pt.y, hollow: pt.hollow }); });
      var bounds = autoBounds({ fns: items.fns, points: items.points, shade: p.shade, xIntervals: p.xIntervals }, { x0: -6, x1: 6, y0: -6, y1: 6 });
      if (p.implicit && !p.fns) bounds = autoBounds({ fns: [], points: items.points }, null);
      else bounds.free = true;
      plot.fit(bounds);
      plot.set(items);
    }
  };
  function safeFn(f) { return function (x) { try { return f(x); } catch (e) { return NaN; } }; }

  /* ---------------- tabs and start ---------------- */
  function initTabs(root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role=tab]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
      root.dispatchEvent(new CustomEvent('vz-tab', { detail: tab.id }));
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var j = null;
        if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = tabs.length - 1;
        if (j !== null) { e.preventDefault(); select(tabs[j], true); }
      });
    });
  }

  function start() {
    var root = document.getElementById('vz-studio');
    if (!root) return;
    try {
      initTabs(root);
      var g = new GraphTab(root), s3 = new SurfaceTab(root), sv = new SolveTab(root);
      root.addEventListener('vz-tab', function () {
        g.plot.resize(); g.plot.draw(); s3.draw(); s3.loop();
        sv.out.querySelectorAll('canvas').forEach(function () { sv.run(false); });
      });
      // redraw when the theme or the page language changes
      var mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
      if (mq && mq.addEventListener) mq.addEventListener('change', function () { g.plot.draw(); s3.draw(); sv.run(false); });
      new MutationObserver(function () { g.update(true); s3.compute(); s3.draw(); s3.sliders.relabel(); sv.run(false); })
        .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    } catch (e) {
      if (window.console) console.warn('VizMath studio could not start:', e);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(typeof window !== 'undefined' ? window : this);
