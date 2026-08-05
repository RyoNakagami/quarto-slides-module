
local stringify = pandoc.utils.stringify

-- sections: one entry per top-level H1: { title = Inlines, subs = List<Inlines> }
-- flat_pos: one entry per agenda-generating H1 (top-level or nested), in document
--           order: { top = <section index>, sub = <sub index or nil> }
local sections = pandoc.List()
local flat_pos = pandoc.List()

local options_bullets = "bullet"
local options_heading = nil
local options_font_size = nil
local options_item_spacing = nil
local options_item_padding = nil
local options_line_height = nil
local options_heading_font_size = nil
local options_sub_font_size = nil
local options_sub_display = "all"

-- permitted options include:
-- auto-agenda:
--   bullets: none | bullet | numbered
--   heading: none | heading
--   font-size: <css length>          (agenda items, default 26pt)
--   item-spacing: <css length>       (vertical margin between items, default 0.3em)
--   item-padding: <css length>       (vertical padding inside each item, default 0.4em)
--   line-height: <number>            (default 1.4)
--   heading-font-size: <css length>  ("Agenda" heading, default 40pt)
--   sub-font-size: <css length>      (nested items, default 0.8em)
--   sub-display: all | active        (show nested items always, or only for the
--                                     active section; default all)
--
-- headers:
--   # Section                        top-level agenda item
--   # Subsection {.nested}           nested under the preceding top-level H1
--                                    (alias: {.agenda-nested})
--   # Hidden {.no-auto-agenda}       excluded from the agenda
--   attribute agenda-text="..."      short label shown in the agenda instead of
--                                    the full header text
local function read_meta(meta)
  local options = meta["auto-agenda"]
  if options ~= nil then
    if options.bullets ~= nil then
      options_bullets = stringify(options.bullets)
    else
      options_bullets = "bullet"
    end
    if options.heading ~= nil then
      options_heading = options.heading
    end
    if options["font-size"] ~= nil then
      options_font_size = stringify(options["font-size"])
    end
    if options["item-spacing"] ~= nil then
      options_item_spacing = stringify(options["item-spacing"])
    end
    if options["item-padding"] ~= nil then
      options_item_padding = stringify(options["item-padding"])
    end
    if options["line-height"] ~= nil then
      options_line_height = stringify(options["line-height"])
    end
    if options["heading-font-size"] ~= nil then
      options_heading_font_size = stringify(options["heading-font-size"])
    end
    if options["sub-font-size"] ~= nil then
      options_sub_font_size = stringify(options["sub-font-size"])
    end
    if options["sub-display"] ~= nil then
      options_sub_display = stringify(options["sub-display"])
    end
  end
end

-- build an inline style string that sets the CSS custom properties
-- consumed by reveal-auto-agenda.css / the site theme
local function agenda_style()
  local parts = pandoc.List()
  if options_font_size ~= nil then
    parts:insert("--agenda-font-size: " .. options_font_size)
  end
  if options_item_spacing ~= nil then
    parts:insert("--agenda-item-spacing: " .. options_item_spacing)
  end
  if options_item_padding ~= nil then
    parts:insert("--agenda-item-padding: " .. options_item_padding)
  end
  if options_line_height ~= nil then
    parts:insert("--agenda-line-height: " .. options_line_height)
  end
  if options_heading_font_size ~= nil then
    parts:insert("--agenda-heading-font-size: " .. options_heading_font_size)
  end
  if options_sub_font_size ~= nil then
    parts:insert("--agenda-sub-font-size: " .. options_sub_font_size)
  end
  if #parts == 0 then
    return nil
  end
  return table.concat(parts, "; ") .. ";"
end

-- agenda label for a header: agenda-text attribute wins over the header text
local function header_label(el)
  local txt = el.attr.attributes["agenda-text"]
  if txt ~= nil then
    return pandoc.List({pandoc.Str(txt)})
  end
  return el.content
end

local function is_nested(el)
  return el.attr.classes:includes("nested")
    or el.attr.classes:includes("agenda-nested")
end

local function scan_headers(el)
  if el.level == 1 and not el.attr.classes:includes("no-auto-agenda") then
    if is_nested(el) and #sections > 0 then
      local parent = sections[#sections]
      parent.subs:insert(header_label(el))
      flat_pos:insert({top = #sections, sub = #parent.subs})
    else
      sections:insert({title = header_label(el), subs = pandoc.List()})
      flat_pos:insert({top = #sections, sub = nil})
    end
  end
end

--@param el pandoc.Header
--@return pandoc.Header
local function change_header_class(el)
  el.attr.classes = {"agenda-slide"}
  return el
end

-- wrap agenda items (each a list of blocks) according to the bullets option
local function make_list(items)
  if options_bullets == "none" then
    local flat = pandoc.List()
    for _, item in ipairs(items) do
      flat:extend(item)
    end
    return flat
  elseif options_bullets == "numbered" then
    return pandoc.OrderedList(items)
  end
  return pandoc.BulletList(items)
end

local function scan_blocks(blocks)
  local newBlocks = pandoc.List()
  local header_n = 0

  for _, block in pairs(blocks) do
    if (block ~= nil and
      block.t == "Header" and
      block.level == 1 and
      not block.attr.classes:includes("no-auto-agenda")
    ) then
      header_n = header_n + 1
      local pos = flat_pos[header_n] or {top = header_n, sub = nil}
      change_header_class(block)
      newBlocks:insert(block)

      local style = agenda_style()
      local style_attr = {}
      if style ~= nil then
        style_attr = {style = style}
      end

      -- if defined in options, insert a heading
      if (options_heading ~= nil) then
        newBlocks:insert(
          pandoc.Div(
            pandoc.Para(options_heading),
            pandoc.Attr("", {"agenda-heading"}, style_attr)
          )
        )
      end

      -- build the agenda items, marking the active section / subsection
      local mod_items = pandoc.List()
      for i = 1, #sections do
        local agenda_class
        if i < pos.top then
          agenda_class = {"agenda-inactive", "agenda-pre-active"}
        elseif i > pos.top then
          agenda_class = {"agenda-inactive", "agenda-post-active"}
        elseif pos.sub == nil then
          agenda_class = {"agenda-active"}
        else
          -- we are inside a nested subsection: highlight goes to the sub item
          agenda_class = {"agenda-inactive", "agenda-parent-active"}
        end

        local item = pandoc.List()
        item:insert(
          pandoc.Div(pandoc.Para(sections[i].title), pandoc.Attr("", agenda_class))
        )

        local subs = sections[i].subs
        if #subs > 0 and (options_sub_display ~= "active" or i == pos.top) then
          local sub_items = pandoc.List()
          for j = 1, #subs do
            local sub_class
            if i == pos.top and j == pos.sub then
              sub_class = {"agenda-sub-active"}
            else
              sub_class = {"agenda-sub-inactive"}
            end
            sub_items:insert(pandoc.List({
              pandoc.Div(pandoc.Para(subs[j]), pandoc.Attr("", sub_class))
            }))
          end
          item:insert(
            pandoc.Div(make_list(sub_items), pandoc.Attr("", {"agenda-subs"}))
          )
        end

        mod_items:insert(item)
      end

      -- insert the agenda items
      newBlocks:insert(
        pandoc.Div(
          make_list(mod_items),
          pandoc.Attr("", {"agenda"}, style_attr)
        )
      )
    else
      newBlocks:insert(block)
    end
  end

  -- inject the CSS dependency
  quarto.doc.addHtmlDependency({
    name = "reveal-auto-agenda",
    version = "0.0.3",
    stylesheets = {"reveal-auto-agenda.css"}
  })

  return newBlocks
end

if (quarto.doc.isFormat("revealjs")) then
  return {
    {Meta = read_meta},
    {Header = scan_headers},
    {Blocks = scan_blocks}
  }
end
