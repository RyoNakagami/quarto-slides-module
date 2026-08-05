function renderAbstractSummary(el) {
  const codeBlock = el.querySelector("pre code");
  if (!codeBlock) return;

  // textContent (not innerText): innerText returns "" before layout is computed,
  // which happens for code blocks at DOMContentLoaded under Reveal's ?print-pdf mode.
  const rawYaml = codeBlock.textContent.trim();
  const parsedData = jsyaml.load(rawYaml);
  if (!parsedData) return;
  const data = parsedData.regmonkey_abstract_summary;
  if (!data || !data.children) return;

  let html = "";

  data.children.forEach((child, idx) => {
    const widths = child.width.map(w => w + "%");
    const wLeft = widths[0];
    const wMid = widths[1];
    const wRight = widths[2] || "0%";

    const left = `<div class="flex flex-col justify-center" style="width:${wLeft};">
<div class="title" style="font-size:${data.title_fontsize}; color: #0e3666; font-weight: bold !important;">${child.title}</div>
</div>`;

    const bullets = child.description.map(li => `<li>${li}</li>`).join("\n");
    const middle = `<div class="flex flex-col justify-center" style="width:${wMid};">
<ul class="bullet-points content-text" style="font-size:${data.bullet_fontsize};">
${bullets}
</ul>
</div>`;
    let right = "";
    if (child.keystat !== undefined || child.keystat_header !== undefined) {
      right = `<div class="flex flex-col justify-center" style="width:${wRight};">
${child.keystat_header ? `<p class="content-text text-center px-4" style="font-size:${data.keystat_fontsize}; margin-bottom: 10px;margin-top:10px">${child.keystat_header}</p>` : ""}
${child.keystat !== undefined ? `<div class="stat-number text-center">${child.keystat}</div>` : ""}
</div>`;
    }

    html += `<div class="slide-container flex flex-col" id="slide${idx + 1}">
<div class="flex flex-row justify-between h-full px-12 pt-1 pb-1">
${left}
${middle}
${right}
</div>
</div>`;

    if (idx < data.children.length - 1) {
      html += `<hr class="slide-divider my-1 border-gray-300">`;
    }
  });

  // 元の code block を HTML に置き換え
  el.innerHTML = html;

  // --- MathJax typeset immediately after DOM insertion ---
  if (window.MathJax) {
    MathJax.typesetPromise([el]).catch(console.error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".regmonkey_abstract_summary").forEach(renderAbstractSummary);

  // Reveal.js slide change math rendering
  if (window.Reveal && window.MathJax) {
    Reveal.on("slidechanged", function (event) {
      MathJax.typesetPromise([event.currentSlide]).catch(console.error);
    });
  }
});
