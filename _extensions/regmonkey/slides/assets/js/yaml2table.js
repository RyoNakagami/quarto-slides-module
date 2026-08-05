// Convert Pandoc-style math delimiters ($...$ / $$...$$) into MathJax-default
// delimiters (\(...\) / \[...\]) so runtime-injected content typesets correctly.
// Pandoc rewrites $-math at compile time, but YAML inside .yaml2table is parsed
// by JS at runtime, so we must do the conversion here.
function convertMathDelimiters(text) {
  if (typeof text !== "string") return text;
  // Display math first to avoid being captured by the inline pattern.
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, "\\[$1\\]");
  // Inline math: avoid spanning newlines and avoid empty matches.
  text = text.replace(/\$([^\$\n]+?)\$/g, "\\($1\\)");
  return text;
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".yaml2table").forEach((el) => {
    const rawYaml = el.textContent.trim();
    const columnWidthsAttr = el.getAttribute("data-col-widths");
    const columnWidths = columnWidthsAttr ? JSON.parse(columnWidthsAttr) : null;
    // data-centered-cols="[1]" などで 0-indexed の列番号を渡すと，
    // 対応する <th>/<td> に vertical-align: middle を適用する（水平は左寄せのまま）．
    const centeredColsAttr = el.getAttribute("data-centered-cols");
    const centeredCols = centeredColsAttr ? JSON.parse(centeredColsAttr) : [];

    // Parse YAML string into a JavaScript object
    const parsedData = jsyaml.load(rawYaml);

    // Generate HTML table from parsed data
    const htmlTable = generateTable(parsedData, columnWidths, centeredCols);

    // Inject the generated table into the HTML
    el.innerHTML = htmlTable;

    // MathJax 3 may not be fully loaded at DOMContentLoaded. Wait for the
    // startup promise before calling typesetPromise, then fall back to a
    // direct call if startup is not exposed.
    if (window.MathJax) {
      if (MathJax.startup && MathJax.startup.promise) {
        MathJax.startup.promise
          .then(() => MathJax.typesetPromise([el]))
          .catch(console.error);
      } else if (typeof MathJax.typesetPromise === "function") {
        MathJax.typesetPromise([el]).catch(console.error);
      }
    }
  });
});

function generateTable(data, columnWidths, centeredCols = []) {
  const centeredSet = new Set(centeredCols);
  const cellStyleFor = (idx) => {
    const widthPart =
      columnWidths && columnWidths[idx] != null
        ? `width: ${columnWidths[idx]}%;`
        : "";
    const alignPart = centeredSet.has(idx) ? "vertical-align: middle !important;" : "";
    const combined = [widthPart, alignPart].filter(Boolean).join(" ");
    return combined ? ` style="${combined}"` : "";
  };

  const grouped = {};

  // Group components by the first key in each record as the 'record_index'
  for (const key in data) {
    const comp = data[key];
    const recordIndex = Object.keys(comp)[0]; // Use the first key as record_index
    const groupKey = comp[recordIndex] || "undefined"; // Use the value of the record_index field
    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push(comp);
  }

  const allHeaders = new Set();
  let firstKey = "";

  // Collect all headers excluding the first field used as 'record_index'
  Object.values(data).forEach((comp) => {
    Object.keys(comp).forEach((k, idx) => {
      if (idx !== 0) allHeaders.add(k); // Skip the first key (used as record_index)
    });
    if (!firstKey) firstKey = Object.keys(comp)[0]; // Capture the very first key
  });

  // Create the table HTML, using the first field as the record_index column header
  let table = `<table style="width: 100%; height: 100%; border-collapse: collapse;">
                    <thead>
                      <tr>
                        <th${cellStyleFor(0)}>${convertMathDelimiters(firstKey)}</th>`; // Use the first key as column name

  let headerIndex = 1;
  allHeaders.forEach((h) => {
    table += `<th${cellStyleFor(headerIndex)}>${convertMathDelimiters(h)}</th>`;
    headerIndex++;
  });
  table += "</tr></thead><tbody>";

  // Iterate over grouped components and generate rows
  for (const group in grouped) {
    const rows = grouped[group];
    rows.forEach((component, idx) => {
      table += "<tr>";
      if (idx === 0) {
        const recordIndex = Object.keys(component)[0];
        table += `<td rowspan="${rows.length}"${cellStyleFor(0)}>${convertMathDelimiters(component[recordIndex])}</td>`;
      }

      let cellIndex = 1;
      const headersArray = Array.from(allHeaders);

      headersArray.forEach((header) => {
        const value = component[header];
        const cellStyle = cellStyleFor(cellIndex);

        if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
          table += `<td${cellStyle}>${generateNestedList(value)}</td>`;
        } else if (value === null) {
          table += `<td${cellStyle}><p style="vertical-align: middle;">-</p></td>`;
        } else {
          table += `<td${cellStyle}>${convertMathDelimiters(value)}</td>`;
        }
        cellIndex++;
      });

      table += "</tr>";
    });
  }

  table += "</tbody></table>";
  return table;
}

// 再帰的にネストされた配列やオブジェクトを <ul><li> で展開
function generateNestedList(data) {
  if (Array.isArray(data)) {
    return `<ul>${data.map(item => {
      if (typeof item === "object" && item !== null) {
        return `<li>${generateNestedList(item)}</li>`;
      } else {
        return `<li>${convertMathDelimiters(item)}</li>`;
      }
    }).join("")}</ul>`;
  }

  if (typeof data === "object" && data !== null) {
    let listItems = "";
    for (const key in data) {
      listItems += `<li>${convertMathDelimiters(key)}${generateNestedList(data[key])}</li>`;
    }
    return `<ul>${listItems}</ul>`;
  }

  return `<ul><li>${convertMathDelimiters(data)}</li></ul>`;
}
