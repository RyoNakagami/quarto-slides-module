// スライド右上に HTML / PDF 出力ボタンを表示する．
//
// - 対象デッキ限定   : frontmatter で `export-buttons: true` を宣言したデッキのみ
//   （inject-regmonkey-js.lua が埋め込む marker meta タグの有無で判定）
// - PDF ボタン       : decktape で事前生成された <base>.pdf へのリンク
// - HTML ボタン      : embed-resources で事前生成された <base>-embed.html へのリンク
// - 各アーティファクトは HEAD リクエストで存在確認し，無ければボタンを出さない
//   （ローカル preview 等，未生成環境では何も表示されない）
// - decktape / Playwright などの自動キャプチャ（navigator.webdriver）と
//   ?print-pdf ビューでは表示しない（PDF/PPTX にボタンが写り込むのを防ぐ）
(function () {
  "use strict";

  function artifactBase() {
    // ".../posts/<slug>/"            -> ".../posts/<slug>/index"
    // ".../posts/<slug>/index.html"  -> ".../posts/<slug>/index"
    // ".../notebook/foo.html"        -> ".../notebook/foo"
    var p = window.location.pathname;
    if (p.endsWith("/")) return p + "index";
    if (p.endsWith(".html")) return p.slice(0, -".html".length);
    return p + "/index";
  }

  function makeButton(href, label, iconClass, downloadName) {
    var a = document.createElement("a");
    a.className = "regmonkey-export-btn";
    a.href = href;
    a.title = label;
    a.setAttribute("aria-label", label);
    a.setAttribute("download", downloadName);
    a.innerHTML = '<i class="' + iconClass + '"></i><span>' + label + "</span>";
    return a;
  }

  function injectStyle() {
    var css = [
      ".regmonkey-export-toolbar{position:fixed;top:10px;right:14px;z-index:60;",
      "display:flex;gap:6px;opacity:.55;transition:opacity .2s;}",
      ".regmonkey-export-toolbar:hover{opacity:1;}",
      ".regmonkey-export-btn{display:inline-flex;align-items:center;gap:4px;",
      "padding:3px 9px;border:1px solid #0E3666;border-radius:4px;",
      "background:#fff;color:#0E3666;font-size:13px;line-height:1.4;",
      "font-family:Meiryo,sans-serif;text-decoration:none;}",
      ".regmonkey-export-btn:hover{background:#0E3666;color:#fff;}",
      "@media print{.regmonkey-export-toolbar{display:none !important;}}",
      ".reveal.print-pdf ~ .regmonkey-export-toolbar,",
      "html.print-pdf .regmonkey-export-toolbar{display:none !important;}",
    ].join("");
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  function headExists(url) {
    return fetch(url, { method: "HEAD" })
      .then(function (res) { return res.ok; })
      .catch(function () { return false; });
  }

  window.addEventListener("load", function () {
    // export-buttons: true を宣言したデッキ以外では何もしない
    if (!document.querySelector('meta[name="regmonkey-export-buttons"][content="true"]')) return;
    // 自動キャプチャ（decktape / Playwright）・print-pdf ビューでは表示しない
    if (navigator.webdriver) return;
    if (/(\?|&)print-pdf/.test(window.location.search)) return;

    var base = artifactBase();
    var slug = (function () {
      var parts = base.split("/").filter(Boolean);
      // ".../<slug>/index" -> "<slug>", ".../foo" -> "foo"
      var last = parts[parts.length - 1];
      return last === "index" && parts.length >= 2 ? parts[parts.length - 2] : last;
    })();

    var targets = [
      { url: base + "-embed.html", label: "HTML", icon: "fas fa-file-code", name: slug + ".html" },
      { url: base + ".pdf",        label: "PDF",  icon: "fas fa-file-pdf",  name: slug + ".pdf" },
    ];

    Promise.all(
      targets.map(function (t) {
        return headExists(t.url).then(function (ok) { return ok ? t : null; });
      })
    ).then(function (found) {
      var available = found.filter(Boolean);
      if (available.length === 0) return;
      injectStyle();
      var bar = document.createElement("div");
      bar.className = "regmonkey-export-toolbar";
      available.forEach(function (t) {
        bar.appendChild(makeButton(t.url, t.label, t.icon, t.name));
      });
      document.body.appendChild(bar);
    });
  });
})();
