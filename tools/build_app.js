// JXA（osascript -l JavaScript）で public/js/app.js を事前コンパイルして public/js/app.compiled.js を作る。
// 使い方は tools/build_app.sh 経由。引数: <app.js> <出力先> <app.jsのSHA-256>
ObjC.import('Foundation');
function run(argv) {
  var rd = function(p) { return ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, null)); };
  console.error = function() {}; console.warn = function() {};
  eval(rd(argv[0].replace(/app\.js$/, '../vendor/babel.min.js')));
  var B = (typeof Babel !== 'undefined') ? Babel : this.Babel;
  // index.html の compileAndRun と同じオプション
  var out = B.transform(rd(argv[0]), {
    presets: [['react', { runtime: 'classic' }]],
    sourceType: 'script',
  }).code;
  var text = '/*APP_SRC_SHA256:' + argv[2] + '*/\n' + out;
  $(text).writeToFileAtomicallyEncodingError(argv[1], true, $.NSUTF8StringEncoding, null);
  return 'OK ' + out.length;
}
