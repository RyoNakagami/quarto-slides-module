-- Inject the CSS dependency for revealjs
local function scan_blocks(blocks)
    if quarto.doc.isFormat("revealjs") then
        quarto.doc.addHtmlDependency({
            name = "reveal_horizontal_line",
            version = "1.0.0",
            stylesheets = {"reveal_horizontal_line.css"}
        })
    end
    return blocks
end

function reveal_horizontal_line(args)
  -- 第一引数で高さ（線の太さ）を指定，デフォルト 1px
  local height = args[1] or "1px"
  -- 第二引数でカラー指定，デフォルトはグレー
  local color = args[2] or "#d1d5db" -- Tailwind gray-300

  -- CSS dependency を追加
  scan_blocks(quarto.doc.blocks)

  -- HTML を返す
  return pandoc.RawBlock("html",
    '<hr class="reveal_horizontal_line" ' ..
    'style="height: ' .. height .. '; background-color: ' .. color .. '; border: none; margin: 1em 0;">')
end


function reveal_horizontal_line_with_tailwind(args)
    -- args[1] で Tailwind クラスを受け取る
    -- デフォルトは my-1（上下マージン） + border-gray-300（色）
    local classes = args[1] or "my-1 border-gray-300"

    -- CSS dependency を追加（既存 vspace CSS で OK）
    scan_blocks(quarto.doc.blocks)

    -- HTML を返す
    return pandoc.RawBlock("html",
        '<hr class="reveal_horizontal_line ' .. classes .. '">')
end
