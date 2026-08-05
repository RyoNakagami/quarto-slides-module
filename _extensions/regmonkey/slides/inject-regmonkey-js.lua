-- Injects the regmonkey slide JS library as an HTML dependency.
-- Paths resolve relative to this Lua file, so the extension is fully portable.
--
-- deck frontmatter で `export-buttons: true` を宣言したデッキにのみ
-- marker meta タグを埋め込む．右上の HTML/PDF 出力ボタン（regmonkey_export_buttons.js）
-- と export-artifacts.sh の対象検出は，この marker の有無で判定される．
function Pandoc(doc)
  if quarto.doc.is_format("revealjs") then
    quarto.doc.add_html_dependency({
      name = "regmonkey-slides-js",
      version = "1.0.0",
      scripts = {
        "assets/js/horizontal_tree.js",
        "assets/js/resize_keypoints_block.js",
        "assets/js/yaml2table.js",
        "assets/js/regmonkey_vuetify_timeline.js",
        "assets/js/regmonkey_waterfall.js",
        "assets/js/regmonkey_gantt_chart.js",
        "assets/js/regmonkey_yaml2grouptable.js",
        "assets/js/regmonkey_abstract_summary.js",
        "assets/js/regmonkey_index_summary.js",
        "assets/js/regmonkey_export_buttons.js",
      },
    })

    if doc.meta["export-buttons"] == true then
      quarto.doc.include_text(
        "in-header",
        '<meta name="regmonkey-export-buttons" content="true">'
      )
    end
  end
  return doc
end
