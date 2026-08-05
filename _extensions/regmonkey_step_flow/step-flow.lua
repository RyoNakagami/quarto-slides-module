-- step-flow.lua
-- regmonkey_step_flow 拡張のフィルタ．
--
-- 役割:
--   data-step-flow を持つスライドが存在するとき，step-flow.css と step-flow.js を
--   HTML 依存として自動注入する．これにより post 側は
--       filters:
--         - regmonkey_step_flow
--   を書くだけでよく，手動の include-after-body / css 指定が不要になる．
--
-- 描画ロジック本体は step-flow.js（クライアントサイド）が担う．
-- このフィルタは「アセットを差し込む」ことだけを行う．

local needs_step_flow = false

-- data-step-flow 属性を持つ Div / 任意のブロックを検出する．
-- Quarto では section 見出しの { data-step-flow } 属性は当該ヘッダに付与され，
-- Div の場合は el.attributes に入る．両方を見る．
local function has_step_flow_attr(el)
  if el.attributes then
    for k, _ in pairs(el.attributes) do
      if k == "data-step-flow" then
        return true
      end
    end
  end
  return false
end

function Header(el)
  if has_step_flow_attr(el) then
    needs_step_flow = true
  end
  return nil
end

function Div(el)
  if has_step_flow_attr(el) or el.classes:includes("step-flow-data") then
    needs_step_flow = true
  end
  return nil
end

-- HTML（revealjs を含む）出力時のみ，必要なら依存を注入する．
function Pandoc(doc)
  if not quarto.doc.is_format("html:js") then
    return doc
  end
  if not needs_step_flow then
    return doc
  end

  quarto.doc.add_html_dependency({
    name = "regmonkey-step-flow",
    version = "1.0.0",
    scripts = {
      { path = "step-flow.js", afterBody = true },
    },
    stylesheets = {
      "step-flow.css",
    },
  })

  return doc
end
