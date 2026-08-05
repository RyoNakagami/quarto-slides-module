-- Inject the glossary CSS/JS only into pages that contain a
-- `.glossary-container` div. The JS parses the code block inside the
-- container at load time and replaces it with a <dl> definition list.

local dependency_added = false

local function add_dependency()
  if dependency_added then
    return
  end
  dependency_added = true
  quarto.doc.add_html_dependency({
    name = "regmonkey_glossary_generator",
    version = "1.0.0",
    scripts = { "regmonkey_glossary_generator.js" },
    stylesheets = { "regmonkey_glossary_generator.css" },
  })
end

function Div(el)
  if not quarto.doc.is_format("html:js") then
    return nil
  end
  if el.classes:includes("glossary-container") then
    add_dependency()
  end
  return nil
end
