// step-flow.js
// Reveal.js + Quarto 用ステップフロー図ジェネレータ（regmonkey_step_flow 拡張）
//
// 使い方（拡張として）:
//   1. post の frontmatter に filters: [regmonkey_step_flow] を追加
//   2. スライドの section（または div）に data-step-flow 属性を付ける
//   3. その中に YAML を置く
//        :::{.step-flow-data}
//        ```yaml
//        record:
//          - step: 回路選定・作成
//            description1: ...
//        ```
//        :::
//   JS・CSS の読み込みは拡張の Lua フィルタが自動で行うので手動 include は不要．
//
//   description1, description2, ... description{N} を順に箇条書きとして拾う．
//
// 配色・サイズは regmonkey-presentation のハウススタイルに揃える:
//   - チップ（ステップ名）: brand-primary #0e3666 背景 + 白太字（active-phase と同系）
//   - ステップ名右端のシェブロン矢印: #0e3666
//   - ステップ間の縦コネクタ: #0e3666（ハウスSVG規約：構造線は brand-primary）
//   - 箇条書きマーカー: 四角 #0e3666（.squaredmark と同系）
//   - 本文テキスト: #1a1a1a
//   - フォントスケール: 1600×900 キャンバスの本文密度に合わせ 0.62em 基準

(function () {
  "use strict";

  // ハウスカラー（style/scss/_variables.scss の $brand-primary 等と一致させる）
  const COLOR = {
    primary: "#0e3666", // brand-primary：チップ・矢印・マーカー
    accent: "#206f83", // regmonkey-bold のティール（強調が要るとき用）
    text: "#1a1a1a", // 本文
    chipText: "#ffffff", // チップ内テキスト
  };

  const STYLE_ID = "step-flow-injected-style";

  // ペンタゴン下部の尖り（point）の高さ．
  // step-flow__row_height は「上側の四角形」の高さを指す．
  // ペンタゴン全体の高さ = row_height + POINT_HEIGHT．
  const POINT_HEIGHT = "0.9em";

  // ------------------------------------------------------------------
  // 0. スコープ付きスタイルを 1 回だけ注入（CSS が読めなくても色・サイズが揃う）
  // ------------------------------------------------------------------
  function injectStyleOnce() {
    if (document.getElementById(STYLE_ID)) return;
    const css = `
.step-flow {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  font-size: 0.62em;
  line-height: 1.45;
  width: 100%;
  color: ${COLOR.text};
  font-family: inherit;   /* revealjs 本体のフォント（Meiryo 等）に揃える */
}
/* ヘッダー行（key 名ラベル）．列幅は JS が grid-template-columns を直書き */
.step-flow__header {
  display: grid;
  column-gap: 1.2em;
  font-weight: 700;
  color: ${COLOR.text};
  border-bottom: 2px solid ${COLOR.primary};
  padding-bottom: 0.3em;
  margin-bottom: 0.2em;
}
.step-flow__header-cell {
  text-align: center;   /* ヘッダーは中央揃え */
}
.step-flow__row {
  display: grid;
  column-gap: 1.2em;
  align-items: start;   /* セル上端を揃える（四角形の上端で揃う） */
}
/* 1 列目：下向き五角形のステップチップ（次のステップを下に指す） */
.step-flow__step {
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
.step-flow__chip {
  position: relative;
  background: ${COLOR.primary};
  color: ${COLOR.chipText};
  font-weight: 700;
  /* 下の頂点ぶんを padding-bottom に足し，文字は四角形部に収める */
  padding: 0.4em 1em calc(0.4em + ${POINT_HEIGHT}) 1em;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  /* 下辺中央が尖る五角形．上側四角形 = (高さ - POINT_HEIGHT) */
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - ${POINT_HEIGHT}),
    50% 100%,
    0 calc(100% - ${POINT_HEIGHT})
  );
}
/* 2 列目以降：description カラム．文字は左揃え・縦位置は中央．
   高さは四角形（row_height）に揃える */
.step-flow__desc-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start; /* 横は左から開始 */
  justify-content: center; /* 縦は中央（既定） */
  text-align: left;
}
/* top-aligned: true のとき description 等を上揃え */
.step-flow--top-aligned .step-flow__desc-cell {
  justify-content: flex-start;
}
.step-flow__desc-cell ul {
  margin: 0;
  padding-left: 1.2em;
  list-style: square;
  text-align: left;
}
.step-flow__desc-cell ul > li::marker {
  color: ${COLOR.primary};
  font-size: 1.2em;
}
.step-flow__desc-cell li {
  margin: 0.12em 0;
  color: ${COLOR.text};
}
`;
    const styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  // ------------------------------------------------------------------
  // 1. YAML パース：グローバルの js-yaml（_slide.yml で読込済）を優先，
  //    無ければ record/step/descriptionN だけ拾う最小パーサにフォールバック
  //    戻り値: { records: [...], options: { height } }
  //    トップレベル height キーで全チップ共通の高さを指定できる（例: height: 3em）
  // ------------------------------------------------------------------
  function parseYaml(text) {
    if (window.jsyaml && typeof window.jsyaml.load === "function") {
      try {
        const obj = window.jsyaml.load(text);
        if (obj && Array.isArray(obj.record)) {
          return {
            records: obj.record,
            options: {
              // step-flow__row_height: 全行の高さを揃える（例: 3em）
              rowHeight:
                obj["step-flow__row_height"] != null
                  ? String(obj["step-flow__row_height"])
                  : null,
              // col_width: [30, 30, 40] のように列幅比率を指定（step列含む全列）
              colWidth: Array.isArray(obj.col_width)
                ? obj.col_width.map(Number)
                : null,
              // header:
              //   false        -> ヘッダー行を非表示
              //   {key: label} -> その key 列のラベルを上書き（未指定列は key 名）
              //   未指定/true   -> 表示．ラベルは全列 key 名
              headerShow: obj.header !== false,
              headerLabels:
                obj.header && typeof obj.header === "object" ? obj.header : {},
              // header_font: ヘッダーの文字サイズ（例: 2em）
              headerFont:
                obj.header_font != null ? String(obj.header_font) : null,
              // font: カラムごとの文字サイズ（例: {step: 1.2em, risk: 0.8em}）
              colFont:
                obj.font && typeof obj.font === "object" ? obj.font : {},
              // line_height: 行間．スカラー（全列共通）or {key: 値}（カラムごと）
              lineHeight:
                obj.line_height != null ? obj.line_height : null,
              // top-aligned: true で description 等を上揃え（既定は縦中央）
              topAligned: obj["top-aligned"] === true,
            },
          };
        }
      } catch (e) {
        // フォールバックへ
      }
    }
    return parseStepYamlFallback(text);
  }

  // 簡易フォールバックパーサ（js-yaml が無い環境用）．
  // 対応：トップレベル scalar / 入れ子 header ラベル / record の scalar・配列値．
  function parseStepYamlFallback(text) {
    const lines = text.replace(/\t/g, "  ").split(/\r?\n/);
    const records = [];
    const options = {
      rowHeight: null,
      colWidth: null,
      headerShow: true,
      headerLabels: {},
      headerFont: null,
      colFont: {},
      lineHeight: null,
      topAligned: false,
    };
    let current = null; // 現在の record
    let lastArrayKey = null; // record 内で配列を蓄積中のキー
    let mode = "top"; // top | header | font | record

    const stripQuotes = (s) => {
      s = s.trim();
      if (
        (s.startsWith('"') && s.endsWith('"')) ||
        (s.startsWith("'") && s.endsWith("'"))
      ) {
        return s.slice(1, -1);
      }
      return s;
    };

    for (let raw of lines) {
      const line = raw.replace(/\s+$/, "");
      if (!line.trim() || line.trim().startsWith("#")) continue;
      const indent = raw.match(/^\s*/)[0].length;

      // --- record セクション内 ---
      if (mode === "record") {
        // 新しい record の開始 "- step: xxx"
        const itemMatch = line.match(/^\s*-\s+(.*)$/);
        if (itemMatch) {
          current = {};
          records.push(current);
          lastArrayKey = null;
          const kv = itemMatch[1].match(/^([^:]+):\s*(.*)$/);
          if (kv) current[kv[1].trim()] = stripQuotes(kv[2]);
          continue;
        }
        // record 内の配列要素 "    - 値"
        const arrItem = line.match(/^\s+-\s+(.*)$/);
        if (arrItem && current && lastArrayKey) {
          if (!Array.isArray(current[lastArrayKey])) current[lastArrayKey] = [];
          current[lastArrayKey].push(stripQuotes(arrItem[1]));
          continue;
        }
        // record 内のキー "  key: val" or "  key:"（配列開始）
        const kvMatch = line.match(/^\s+([^:]+):\s*(.*)$/);
        if (kvMatch && current) {
          const key = kvMatch[1].trim();
          const val = kvMatch[2];
          if (val === "") {
            // 値が空 → 次行から配列
            current[key] = [];
            lastArrayKey = key;
          } else {
            current[key] = stripQuotes(val);
            lastArrayKey = null;
          }
          continue;
        }
        continue;
      }

      // record 開始
      if (/^record\s*:/.test(line.trim())) {
        mode = "record";
        continue;
      }

      // --- header ラベルブロック内 ---
      if (mode === "header" && indent > 0) {
        const lab = line.match(/^\s+([^:]+):\s*(.*)$/);
        if (lab) {
          options.headerLabels[lab[1].trim()] = stripQuotes(lab[2]);
          continue;
        }
      }

      // --- font（カラムごとの文字サイズ）ブロック内 ---
      if (mode === "font" && indent > 0) {
        const fl = line.match(/^\s+([^:]+):\s*(.*)$/);
        if (fl) {
          options.colFont[fl[1].trim()] = stripQuotes(fl[2]);
          continue;
        }
      }

      // --- line_height（カラムごと）ブロック内 ---
      if (mode === "lineheight" && indent > 0) {
        const ll = line.match(/^\s+([^:]+):\s*(.*)$/);
        if (ll && options.lineHeight && typeof options.lineHeight === "object") {
          options.lineHeight[ll[1].trim()] = stripQuotes(ll[2]);
          continue;
        }
      }

      // --- トップレベル ---
      const hMatch = line.match(/^step-flow__row_height\s*:\s*(.*)$/);
      if (hMatch) {
        options.rowHeight = stripQuotes(hMatch[1]);
        mode = "top";
        continue;
      }
      const cwMatch = line.match(/^col_width\s*:\s*\[(.*)\]\s*$/);
      if (cwMatch) {
        options.colWidth = cwMatch[1]
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => !isNaN(n));
        mode = "top";
        continue;
      }
      const hfMatch = line.match(/^header_font\s*:\s*(.*)$/);
      if (hfMatch) {
        options.headerFont = stripQuotes(hfMatch[1]);
        mode = "top";
        continue;
      }
      // line_height: スカラー（全列共通）．値があればそれを採用．
      // 値が空ならネスト（カラムごと）ブロックとして lineheight モードへ．
      const lhMatch = line.match(/^line_height\s*:\s*(.*)$/);
      if (lhMatch) {
        const val = lhMatch[1].trim();
        if (val === "") {
          options.lineHeight = {};
          mode = "lineheight";
        } else {
          options.lineHeight = stripQuotes(val);
          mode = "top";
        }
        continue;
      }
      const headMatch = line.match(/^header\s*:\s*(.*)$/);
      if (headMatch) {
        const val = headMatch[1].trim();
        if (val === "false") {
          options.headerShow = false;
          mode = "top";
        } else {
          // ネストでラベル指定
          options.headerShow = true;
          mode = "header";
        }
        continue;
      }
      const fontMatch = line.match(/^font\s*:\s*(.*)$/);
      if (fontMatch) {
        // ネストでカラムごとの font-size 指定
        mode = "font";
        continue;
      }
      const taMatch = line.match(/^top-aligned\s*:\s*(.*)$/);
      if (taMatch) {
        options.topAligned = taMatch[1].trim() === "true";
        mode = "top";
        continue;
      }
    }
    return { records: records, options: options };
  }

  // ------------------------------------------------------------------
  // 2. データ列を決定する
  //    step を除く全キーを，record 内の出現順で列にする．
  //    （description / description1 / risk など任意のキー名に対応）
  //    複数 record にまたがる場合は最初に出現した順序を保持する．
  // ------------------------------------------------------------------
  function dataColumns(records) {
    const cols = [];
    const seen = {};
    records.forEach((rec) => {
      Object.keys(rec).forEach((k) => {
        if (k === "step") return;
        if (!seen[k]) {
          seen[k] = true;
          cols.push(k);
        }
      });
    });
    return cols;
  }

  // ------------------------------------------------------------------
  // 3. DOM 生成
  //    レイアウト: step（下向き五角形チップ）+ descriptionN を各カラムに並べる．
  //    ヘッダー行のラベルは key 名（step / description1 / ...）をそのまま使う．
  //    下向き五角形チップが次ステップへの向きを示すため，行間の矢印は不要．
  // ------------------------------------------------------------------
  function buildFlow(records, options) {
    const opts = options || {};
    const dataCols = dataColumns(records); // step 以外の全キー（出現順）
    const allCols = ["step"].concat(dataCols); // 表示する全列（step が先頭）
    const totalCols = allCols.length;
    const labels = opts.headerLabels || {};
    const labelFor = (key) => (labels[key] != null ? labels[key] : key);
    const fonts = opts.colFont || {};
    const fontFor = (key) => (fonts[key] != null ? String(fonts[key]) : null);
    // line_height: スカラーなら全体共通，object ならカラムごと
    const lhOpt = opts.lineHeight;
    const lhIsMap = lhOpt != null && typeof lhOpt === "object";
    const lineHeightFor = (key) =>
      lhIsMap && lhOpt[key] != null ? String(lhOpt[key]) : null;

    // grid-template-columns の決定:
    //   col_width: [...] が列数と一致すれば比率(fr)で指定．
    //   未指定 or 長さ不一致なら既定（step 列 230px + 残り列 1fr 等分）．
    let gridTemplate;
    if (
      Array.isArray(opts.colWidth) &&
      opts.colWidth.length === totalCols &&
      opts.colWidth.every((n) => typeof n === "number" && !isNaN(n))
    ) {
      gridTemplate = opts.colWidth.map((n) => n + "fr").join(" ");
    } else {
      gridTemplate = "230px " + dataCols.map(() => "1fr").join(" ");
    }

    const wrap = document.createElement("div");
    wrap.className = "step-flow";
    if (opts.topAligned) {
      wrap.classList.add("step-flow--top-aligned");
    }
    // line_height がスカラーなら全体の行間に適用
    if (lhOpt != null && !lhIsMap) {
      wrap.style.lineHeight = String(lhOpt);
    }

    const applyRowLayout = (row) => {
      row.style.gridTemplateColumns = gridTemplate;
    };

    // ヘッダー行（headerShow が false でない場合のみ）
    if (opts.headerShow !== false) {
      const head = document.createElement("div");
      head.className = "step-flow__header";
      head.style.gridTemplateColumns = gridTemplate;
      if (opts.headerFont) {
        head.style.fontSize = opts.headerFont;
      }

      allCols.forEach((key) => {
        const cell = document.createElement("div");
        cell.className = "step-flow__header-cell";
        cell.textContent = labelFor(key); // header ラベル or key 名
        head.appendChild(cell);
      });
      wrap.appendChild(head);
    }

    records.forEach((rec) => {
      const row = document.createElement("div");
      row.className = "step-flow__row";
      applyRowLayout(row);

      // 1 列目: ステップ名（下向き五角形チップ）
      const stepCell = document.createElement("div");
      stepCell.className = "step-flow__step";
      const chip = document.createElement("div");
      chip.className = "step-flow__chip";
      // row_height は「上側の四角形」の高さ．
      // チップ全体 = 四角形 + 下の頂点(POINT_HEIGHT) なので height に足す．
      // height/padding は em なのでチップ自身の font-size に依存する．
      // 文字サイズ変更で高さが変わらないよう，font-size はテキスト用の
      // 内側 span にだけ当て，チップの em 基準は固定のままにする．
      if (opts.rowHeight) {
        chip.style.height = "calc(" + opts.rowHeight + " + " + POINT_HEIGHT + ")";
      }
      const chipText = document.createElement("span");
      chipText.textContent = rec.step != null ? rec.step : "";
      if (fontFor("step")) {
        chipText.style.fontSize = fontFor("step"); // font サイズのみ
      }
      if (lineHeightFor("step")) {
        chipText.style.lineHeight = lineHeightFor("step");
      }
      chip.appendChild(chipText);
      stepCell.appendChild(chip);
      row.appendChild(stepCell);

      // 2 列目以降: step 以外の各キーを 1 つずつ別カラムに．
      // 値がスカラーなら 1 行テキスト，配列なら箇条書きで描画する．
      // セル高さは四角形（row_height）に揃え，その中で縦中央に置く．
      dataCols.forEach((key) => {
        const cell = document.createElement("div");
        cell.className = "step-flow__desc-cell";
        // セル高さ（em）は font-size 非依存にしたいので，cell には
        // font-size を当てず，内側 inner にだけ当てる．
        if (opts.rowHeight) {
          cell.style.height = opts.rowHeight;
        }
        const inner = document.createElement("div");
        inner.className = "step-flow__desc-inner";
        if (fontFor(key)) {
          inner.style.fontSize = fontFor(key); // font サイズのみ
        }
        if (lineHeightFor(key)) {
          inner.style.lineHeight = lineHeightFor(key);
        }
        const v = rec[key];
        if (Array.isArray(v)) {
          const ul = document.createElement("ul");
          v.forEach((item) => {
            if (item == null || String(item).trim() === "") return;
            const li = document.createElement("li");
            li.textContent = String(item);
            ul.appendChild(li);
          });
          inner.appendChild(ul);
        } else {
          inner.textContent = v != null ? String(v) : "";
        }
        cell.appendChild(inner);
        row.appendChild(cell);
      });

      wrap.appendChild(row);
    });

    return wrap;
  }

  // ------------------------------------------------------------------
  // 5. YAML の取得元を探す
  //    - data-step-flow 属性に直接 YAML
  //    - 子要素 .step-flow-data / <script type="text/yaml">
  // ------------------------------------------------------------------
  function getYamlText(host) {
    // 子要素の YAML（.step-flow-data / <script type="text/yaml">）を最優先．
    // data-step-flow 属性は「マーカー」（値は "1" 等）として使うことが多いので，
    // 子要素が見つからない場合に限り属性値を YAML として解釈する．
    const sc = host.querySelector(
      '.step-flow-data, script[type="text/yaml"]'
    );
    if (sc && sc.textContent && sc.textContent.trim()) {
      return sc.textContent;
    }

    // 属性に直接 YAML を書く運用（record: を含むときだけ採用）
    const attr = host.getAttribute("data-step-flow");
    if (attr && /record\s*:/.test(attr)) {
      return attr;
    }

    return null;
  }

  // ------------------------------------------------------------------
  // 6. レンダリング本体
  // ------------------------------------------------------------------
  function render() {
    const hosts = document.querySelectorAll("[data-step-flow]");
    hosts.forEach((host) => {
      if (host.dataset.stepFlowDone === "1") return;
      const text = getYamlText(host);
      if (!text) return;
      const parsed = parseYaml(text);
      if (!parsed || !parsed.records || !parsed.records.length) return;

      injectStyleOnce();

      // YAML を保持していた元要素は隠す（コードブロックの素の表示を消す）
      const src = host.querySelector(
        '.step-flow-data, script[type="text/yaml"]'
      );
      if (src) src.style.display = "none";

      const target = host.querySelector(".step-flow-target") || host;
      target.appendChild(buildFlow(parsed.records, parsed.options));
      host.dataset.stepFlowDone = "1";
    });
  }

  // ------------------------------------------------------------------
  // 7. Reveal.js のライフサイクルに合わせて実行
  // ------------------------------------------------------------------
  function init() {
    render();
    if (window.Reveal && typeof window.Reveal.layout === "function") {
      window.Reveal.layout();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  document.addEventListener("ready", init);
})();
