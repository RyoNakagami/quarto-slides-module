-- Debug logging function
local function log_debug(msg)
  io.stderr:write("fasicons.lua: " .. msg .. "\n")
end

local function parse_classes(args)
  local icon = ""
  local additional_classes = {}
  
  for i, arg in ipairs(args) do
    local str_arg = pandoc.utils.stringify(arg)
    log_debug("Processing arg " .. i .. ": " .. str_arg)
    
    if i == 1 then
      icon = str_arg  -- First argument is always the icon
    else
      table.insert(additional_classes, str_arg)  -- Additional arguments are classes
    end
  end
  
  return icon, additional_classes
end

return {
  ["fas"] = function(args)
    if #args < 1 then
      log_debug("Error - No arguments provided")
      return pandoc.Null()
    end
    
    local icon, classes = parse_classes(args)
    log_debug("Icon: " .. icon)
    log_debug("Additional classes: " .. table.concat(classes, ", "))
    
    -- Generate HTML
    if quarto.doc.isFormat("html:js") then
      local class_str = ""
      if #classes > 0 then
        class_str = " " .. table.concat(classes, " ")
      end
      
      local result = "<i class=\"fas " .. icon .. class_str .. "\"></i>"
      log_debug("Generated HTML: " .. result)
      return pandoc.RawInline('html', result)
    end
    
    return pandoc.Null()
  end
}
