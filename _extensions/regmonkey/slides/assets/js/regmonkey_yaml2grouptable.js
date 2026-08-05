function formatValue(value) {
  // Array
  if (Array.isArray(value)) {
    return `<ul>${value.map(item => {
      // Single-key object → treat key as <li> parent
      if (typeof item === "object" && item !== null && Object.keys(item).length === 1) {
        const key = Object.keys(item)[0];
        return `<li>${key}${formatValue(item[key])}</li>`;
      }
      // Object with multiple keys → recurse as normal
      else if (typeof item === "object" && item !== null) {
        return `<li>${formatValue(item)}</li>`;
      }
      // Primitive
      else {
        return `<li>${item}</li>`;
      }
    }).join('')}</ul>`;
  }

  // Object
  if (typeof value === "object" && value !== null) {
    return Object.entries(value)
      .map(([k, v]) => `<li>${k}${formatValue(v)}</li>`)
      .join('');
  }

  // Primitive
  return value ?? '';
}

function getHeaders(data) {
  const taskFields = new Set();
  const childFields = new Set();
  Object.values(data).forEach(task => {
    Object.keys(task).forEach(key => {
      if (key !== 'children') taskFields.add(key);
    });
    (task.children || []).forEach(child => {
      Object.keys(child).forEach(key => childFields.add(key));
    });
  });
  return { taskFields: Array.from(taskFields), childFields: Array.from(childFields) };
}

function generateGroupTable(data, columnWidths = null) {
  const { taskFields, childFields } = getHeaders(data);
  const headers = [...taskFields, ...childFields];

  let html = `<table style="border-collapse: collapse; width: 100%;">
    <thead>
      <tr>${headers.map((h, i) => `<th${columnWidths && columnWidths[i] ? ` style="width:${columnWidths[i]}%"` : ''}>${h}</th>`).join('')}</tr>
    </thead>
    <tbody>`;

  for (const task of Object.values(data)) {
    const children = task.children || [{}];
    children.forEach((child, idx) => {
      html += '<tr>';

      taskFields.forEach(field => {
        if (idx === 0) html += `<td rowspan="${children.length}">${formatValue(task[field])}</td>`;
      });

      childFields.forEach(field => {
        html += `<td>${formatValue(child[field])}</td>`;
      });

      html += '</tr>';
    });
  }

  html += '</tbody></table>';
  return html;
}

document.addEventListener("DOMContentLoaded", () => {
  // Quarto の YAML codeblock 内を処理
  document.querySelectorAll(".yaml2grouptable").forEach((el) => {
    const codeBlock = el.querySelector("pre code"); // code 要素を取得
    if (!codeBlock) return;

    const rawYaml = codeBlock.textContent.trim();
    const columnWidthsAttr = el.getAttribute("data-col-widths");
    const columnWidths = columnWidthsAttr ? JSON.parse(columnWidthsAttr) : null;

    const parsedData = jsyaml.load(rawYaml);
    const htmlTable = generateGroupTable(parsedData, columnWidths);

    // code block を table に置き換え
    el.innerHTML = htmlTable;
  });
});
