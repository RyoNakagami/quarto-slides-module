function Div(el)
  if el.classes:includes("section-header") then
    -- Flatten block content into inline content
    local inlines = {}
    for _, block in ipairs(el.content) do
      if block.t == "Para" then
        for _, inline in ipairs(block.c) do
          table.insert(inlines, inline)
        end
      end
    end
    return pandoc.Span(inlines, pandoc.Attr("", {"section-header"}))
  end
end
