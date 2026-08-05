// Convert Pandoc-style math delimiters ($...$ / $$...$$) into MathJax-default
// delimiters (\(...\) / \[...\]) so runtime-injected content typesets correctly.
// Pandoc rewrites $-math at compile time, but YAML inside .regmonkey_index is
// parsed by JS at runtime, so we must do the conversion here.
function convertMathDelimiters(text) {
  if (typeof text !== "string") return text;
  // Display math first to avoid being captured by the inline pattern.
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, "\\[$1\\]");
  // Inline math: avoid spanning newlines and avoid empty matches.
  text = text.replace(/\$([^\$\n]+?)\$/g, "\\($1\\)");
  return text;
}

// Convert Pandoc-style bracketed spans ([text]{.cls #id key="val"}) into
// <span class="cls" id="id" style="...">text</span>. YAML inline strings are
// parsed at runtime, so Pandoc never sees them — handle the common attributes
// (class, id, style, plus any key="value" or key='value' pairs) here.
function convertPandocSpans(text) {
  if (typeof text !== "string") return text;
  return text.replace(/\[([^\[\]\n]+?)\]\{([^{}\n]+?)\}/g, (_, inner, attrs) => {
    const classes = [];
    let id = "";
    const styles = [];
    const others = [];
    const tokenRe = /(?:[#.][\w-]+)|(?:[\w-]+=(?:"[^"]*"|'[^']*'))/g;
    let m;
    while ((m = tokenRe.exec(attrs)) !== null) {
      const tok = m[0];
      if (tok.startsWith(".")) {
        classes.push(tok.slice(1));
      } else if (tok.startsWith("#")) {
        id = tok.slice(1);
      } else {
        const eq = tok.indexOf("=");
        const key = tok.slice(0, eq);
        const val = tok.slice(eq + 2, -1);
        if (key === "style") styles.push(val);
        else if (key === "class") classes.push(...val.split(/\s+/).filter(Boolean));
        else if (key === "id") id = val;
        else others.push(`${key}="${val.replace(/"/g, "&quot;")}"`);
      }
    }
    const attrParts = [];
    if (classes.length) attrParts.push(`class="${classes.join(" ")}"`);
    if (id) attrParts.push(`id="${id}"`);
    if (styles.length) attrParts.push(`style="${styles.join("; ")}"`);
    attrParts.push(...others);
    return `<span ${attrParts.join(" ")}>${inner}</span>`;
  });
}

function renderInline(text) {
  return convertPandocSpans(convertMathDelimiters(text));
}

function renderRegmonkeyIndex(el) {
  const codeBlock = el.querySelector("pre code");
  if (!codeBlock) return;

  const rawYaml = codeBlock.textContent.trim();
  let parsedData;
  try {
    parsedData = jsyaml.load(rawYaml);
  } catch(e) {
    console.error("YAML parse error:", e);
    return;
  }

  const data = parsedData.regmonkey_index;
  if (!data || !data.children) return;

  // numbering: true で各 title の先頭に "1." 〜 "N." を自動付与．
  // 折返し2行目以降は番号分の左余白で hanging-indent して
  // タイトル本文の左端に揃える（left-aligned）．既定は false．
  const numbering = data.numbering === true;

  let html = "";

  data.children.forEach((child, idx) => {
    if (!child.title) {
      // Simple numbered-section layout
      html += `<div class="numbered-section">
  <div class="number" style="font-size:${data.title_fontsize || '1.5em'};">${idx + 1}</div>
  <div class="section-text">`;

      if (child.description) {
        if (Array.isArray(child.description)) {
          html += "<ul>";
          child.description.forEach(d => html += `<li>${renderInline(d)}</li>`);
          html += "</ul>";
        } else {
          html += `<p>${renderInline(child.description)}</p>`;
        }
      }

      html += "</div><div class='divider'></div></div>";

    } else {
      // Fancy slide-container layout
      const widths = child.width.map(w => w + "%");
      const wLeft = widths[0];
      const wMid = widths[1];
      const wRight = widths[2] || "0%";

      // numbering: true のときは number を固定幅スロット，title を flex:1 で
      // 並べる．title 側は text-align:left + 折返し時もタイトル本文の左端に揃う．
      const titleInner = numbering
        ? `<div style="display:flex; align-items:baseline; gap:0.3em;">
<span style="flex:0 0 auto; min-width:1.4em;">${idx + 1}.</span>
<span style="flex:1; text-align:left;">${renderInline(child.title)}</span>
</div>`
        : renderInline(child.title);
      const left = `<div class="flex flex-col justify-center" style="width:${wLeft};">
<div class="title" style="font-size:${data.title_fontsize}; margin-left:${data.title_position || '0em'}!important; color: #0e3666; font-weight: bold !important;">${titleInner}</div>
</div>`;

      const bullets = child.description
        .map(li => `<li>${renderInline(li)}</li>`)
        .join("\n");
      const middle = `<div class="flex flex-col justify-center" style="width:${wMid};">
<ul class="bullet-points content-text" style="font-size:${data.bullet_fontsize}; margin-left:${data.bullet_position || '1em'}!important;">
${bullets}
</ul>
</div>`;

      let right = "";

      html += `<div class="slide-container flex flex-col" id="slide${idx + 1}">
<div class="flex flex-row justify-between h-full px-5 pt-1 pb-1">
${left}
${middle}
${right}
</div>
</div>`;

      if (idx < data.children.length - 1) {
        html += `<hr class="slide-divider my-1 border-gray-300">`;
      }
    }
  });

  // Replace original code block with generated HTML
  el.innerHTML = html;

  // MathJax 3 may not be fully loaded at DOMContentLoaded. Wait for the startup
  // promise before calling typesetPromise, then fall back to a direct call.
  if (window.MathJax) {
    if (MathJax.startup && MathJax.startup.promise) {
      MathJax.startup.promise
        .then(() => MathJax.typesetPromise([el]))
        .catch(console.error);
    } else if (typeof MathJax.typesetPromise === "function") {
      MathJax.typesetPromise([el]).catch(console.error);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".regmonkey_index").forEach(renderRegmonkeyIndex);

  if (window.Reveal && window.MathJax) {
    Reveal.on("slidechanged", function (event) {
      if (typeof MathJax.typesetPromise === "function") {
        MathJax.typesetPromise([event.currentSlide]).catch(console.error);
      }
    });
  }
});
