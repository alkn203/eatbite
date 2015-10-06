phina.globalize();
// 定数
var BG_COLOR          = 'gray';
var FRIEND_COLOR      = 'lime'; 
var TARGET_COLOR      = 'white';
var TARGET_SIZE       = 128;
var TARGET_OFFSET_Y   = -4;
var NUMBER_SIZE       = TARGET_SIZE / 2;
var NUMBER_PER_LINE   = 5;
var NUMBER_OFFSET_Y   = 5;
var NUMBER_MOVE_SPEED = 200;
var HISTRY_SIZE       = NUMBER_SIZE * 2 / 3;
var LOCATE_X          = 160;
var PUSH_ANIM = {
  tweens: [
    ['to', {scaleX: 0.8, scaleY: 0.8}, 50],
    ['to', {scaleX: 1.0, scaleY: 1.0}, 50],
  ]
};
var APPEAR_ANIM = {
  tweens: [
      ['to', {scaleX: 2.0, scaleY: 2.0}, 150],
  ]
};
var DISAPPEAR_ANIM = {
  tweens: [
    ['by', {y: 100, alpha: -1}, 200],
  ]
};
// メインシーン
phina.define('MainScene', {
  superClass: 'CanvasScene',
    
  init: function() {
    this.superInit();

    this.backgroundColor = BG_COLOR;

    var historyBack = RectangleShape({
      cornerRadius: 8,
      width: this.gridX.span(12),
      height: this.gridY.span(5),
      fill: null,
      stroke: 'yellow',
    }).addChildTo(this);
    historyBack.x = this.gridX.center();
    historyBack.y = this.gridY.center(1);
    // 当てる数字
    this.targetGroup = CanvasElement().addChildTo(this);
    // プレイヤーの数字
    this.numberGroup = CanvasElement().addChildTo(this);
    // プレイヤーの数字（チェック中）
    this.judgeGroup = CanvasElement().addChildTo(this);
    // ヒストリー
    this.historyGroup = CanvasElement().addChildTo(this);
    // 配置用グリッド
    var gridWidth = this.gridX.span(12);
    this.targetGrid = Grid(gridWidth, 3);
    this.numberGrid = Grid(gridWidth, 5);
    // 残りステップ
    this.step = 100;
    this.stepLabel = Label({
      text: 'STEP： ' + this.step,
      fontSize: 64,
      fill: FRIEND_COLOR,
    }).addChildTo(this);
    this.stepLabel.x = this.gridX.center();
    this.stepLabel.y = this.gridY.span(1);
    // 候補外決定数字
    this.deadNumbers = [];
    // 数字セット
    this.setTagets();
    this.setNumbers();
  },
  // 当てる数字をセット
  setTagets: function() {
    this.targetGroup.children.clear();
    // 0～9の配列を作ってシャッフル
    var arr = Array.range(0, 10).shuffle();
    var self = this;
    // 後ろから3つを取り出して数字を作成
    (3).times(function(i) {
      var target = Target(arr.pop()).addChildTo(self.targetGroup);
      target.x = self.targetGrid.span(i) + LOCATE_X;
      target.y = self.gridY.center(TARGET_OFFSET_Y);
    });
  },
  // 当てる数字のフラグ初期化
  setTargetsEmpty: function() {
    this.targetGroup.children.each(function(target) {
      target.isEmpty = true;
    });
  },
  // プレイヤーの数字をセット
  setNumbers: function() {
    // 一旦クリア
    this.numberGroup.children.clear();
    this.judgeGroup.children.clear();
        
    var numbers = Array.range(0, 10);
    var self = this;
    // 数字をグリッド状に並べる
    numbers.each(function(number, i) {
      var xIndex = i % NUMBER_PER_LINE;
      var yIndex = Math.floor(i / NUMBER_PER_LINE);
            
      var num = Num(number).addChildTo(self.numberGroup);
      num.x = self.numberGrid.span(xIndex) + LOCATE_X - 32;
      num.y = self.numberGrid.span(yIndex) + self.gridY.center(NUMBER_OFFSET_Y);
      // タッチ時
      num.onpointend = function() {
        // 移動
        self.moveNumber(num);                            
      };
      // 候補外数字はタッチ不可に
      var result = self.deadNumbers.contains(number, 0);
      if (result) {
        num.setInteractive(false);
        num.alpha = 0.2;
      }
    });
    
  },
  // プレイヤーの数字を移動
  moveNumber: function(num) {
    var self = this;
    var hit = false;
    // 数字をタッチ出来ないようにする
    this.setNumberEnable(false);
    // 配置できるターゲット数字へ移動
    this.targetGroup.children.each(function(target) {
      if (!hit && target.isEmpty) {
        hit = true;
        // 移動アニメーション
        num.tweener.clear()
                   .fromJSON(PUSH_ANIM)
                   .set({x: target.x, y: target.y})
                   .fromJSON(APPEAR_ANIM)
                   .call(function() {
                     // 移動後処理
                     self.afterNumMove(num, target);
                   });
      }
    });
  },
  // 数字移動後の処理
  afterNumMove: function(num, target) {
    // 埋まったフラグ立て
    target.isEmpty = false;
    // 判定用グループに引っ越し
    num.addChildTo(this.judgeGroup);
    // 全て埋まったら
    if (this.judgeGroup.children.length === 3) {
      // 判定
      this.checkEatBite();
    }
    else {
      // タッチ復活
      this.setNumberEnable(true);
    }
  },
  // EAT BITE をチェック
  checkEatBite: function() {
    var eat = 0;
    var bite = 0;
    var self = this;
        
    this.targetGroup.children.each(function(target) {
      self.judgeGroup.children.each(function(judge) {
        if (target.num === judge.num) {
          // EAT
          if (target.x === judge.x && target.y === judge.y) {
            eat++;            
          }
          // BITE
          else {
            bite++;
          }
        }
      });    
    });
    // 判定数字を文字列に変換
    var str = '';
    this.judgeGroup.children.each(function(judge) {
      str += judge.num;    
    });
    // 判定結果追加
    var txt = '{0} ： {1} EAT - {2} BITE'.format(str, eat, bite);
    var history = History(txt).addChildTo(this.historyGroup);
    // 履歴個数オーバーなら先頭の要素を削除
    if (this.historyGroup.children.length > 5) {
      this.historyGroup.children.first.remove();    
    }
    // 判定履歴更新
    this.historyGroup.children.each(function(history, i) {
      history.x = self.gridX.center();
      history.y = self.gridY.center(3 - i);
    });
    // 判定後処理
    this.afterJudge(eat, bite);
  },
  // 判定結果に応じて処理
  afterJudge: function(eat, bite) {
    var self = this;
    // eatもbiteもなし
    if(eat === 0 && bite === 0) {
      this.judgeGroup.children.each(function(judge) {
        self.deadNumbers.push(judge.num);    
      });  
    }
    // 全て正解
    if (eat === 3) {
      var flow = phina.util.Flow(function(resolve, reject) {
        var counter = 3;
        self.judgeGroup.children.each(function(judge) {
          judge.fill = FRIEND_COLOR;
          judge.label.fill = 'white';
          judge.tweener.clear()
                       .to({scaleX: 2.2, scaleY: 2.2}, 400)
                       .to({scaleX: 2.0, scaleY: 2.0}, 400)
                       .call(function() {
                         counter--;
                         if (counter === 0) {
                           resolve('done');
                         }
                       });
        });
      });
      // リザルトシーンへ
      flow.then(function(mes) {
        self.tweener.clear().wait(1000).call(function() {
          self.exit({
            score: self.step,
            message: '<Eat And Bite> Made in phina.js.\nscore:{score}.',
            hashtags: 'phina_js,game,javascript',
          });
        });
      });
    }
    // リトライ
    else {
      var flow2 = phina.util.Flow(function(resolve, reject) {
        var counter = 3;
        self.judgeGroup.children.each(function(judge) {
          judge.tweener.clear()
                       .to({scaleX: 2.2, scaleY: 2.2}, 50)
                       .to({scaleX: 2.0, scaleY: 2.0}, 50)
                       .fromJSON(DISAPPEAR_ANIM)
                       .call(function() {
                         counter--;
                         if (counter === 0) {
                           resolve('done');
                         }
                       });
        });
      });
      // アニメーションが確実に終わってから
      flow2.then(function(message) {
        self.step--;
        if (self.step < 0) { self.step = 0; }
        self.stepLabel.text = 'STEP： ' + self.step;
        self.setNumbers();
        self.setTargetsEmpty();
      });
    }
  },
  // プレイヤー数字のタッチ切替え
  setNumberEnable: function(bool) {
    this.numberGroup.children.each(function(num) {
      num.setInteractive(bool);
    });
  },
});
// 当てる数字
phina.define('Target', {
  superClass: 'RectangleShape',

  init: function(num) {
    this.superInit({
      cornerRadius: 8,
      width: TARGET_SIZE,
      height: TARGET_SIZE,
      fill: null,
      stroke: TARGET_COLOR,
    });
    
    this.num = num;
    this.isEmpty = true;
    
    this.label = Label({
      text: '？',
      fontSize: TARGET_SIZE,
      fill: TARGET_COLOR,
    }).addChildTo(this);
  },
});
// プレイヤー側数字
phina.define('Num', {
  superClass: 'RectangleShape',

  init: function(num) {
    this.superInit({
      cornerRadius: 8,
      width: NUMBER_SIZE,
      height: NUMBER_SIZE,
      fill: BG_COLOR,
      stroke: FRIEND_COLOR,
    });
    
    this.num = num;

    this.label = Label({
      text: this.num + '',
      fontSize: NUMBER_SIZE,
      fill: FRIEND_COLOR,
    }).addChildTo(this);
    // タッチ有効
    this.setInteractive(true);
  },
});
// 判定結果履歴表示
phina.define('History', {
  superClass: 'Label',

  init: function(text) {
    this.superInit({
      text: text,
      fontSize: HISTRY_SIZE,
      fill: 'yellow',
    });
  },
});
// メイン
phina.main(function() {
  var app = GameApp({
    title: 'Eat And Bite',
    startLabel: 'title',
  });
  
  document.body.appendChild(app.domElement);
  app.run();
});