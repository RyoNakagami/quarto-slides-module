function scaleFontAndVerticalPaddingToFit() {
  const containers = document.querySelectorAll(".keypoints-container");

  containers.forEach((container) => {
    const content = container.querySelector(".vertical-keypoints-block");
    if (!content) return;

    // Reset font size and vertical padding
    content.style.fontSize = "1em";
    content.style.paddingTop = "1em";
    content.style.paddingBottom = "1em";

    const containerHeight = container.clientHeight;
    const contentHeight = content.scrollHeight;

    // Only scale if content overflows
    if (contentHeight > containerHeight) {
      const scaleRatio = containerHeight / contentHeight;

      // Apply scaled font size and vertical padding
      content.style.fontSize = `${scaleRatio}em`;
      content.style.paddingTop = `${scaleRatio}em`;
      content.style.paddingBottom = `${scaleRatio}em`;
    }
  });
}

function removeBottomBorderFromLastBlock() {
  const blocks = document.querySelectorAll(
    ".keypoints-container .block"
  );
  if (blocks.length > 0) {
    blocks.forEach((block, index) => {
      block.classList.remove("last-block", "first-block"); // reset
      if (index === 0) block.classList.add("first-block");
      if (index === blocks.length - 1) block.classList.add("last-block");
    });
  }
}

// Run on load and resize
window.addEventListener("load", () => {
  scaleFontAndVerticalPaddingToFit();
  removeBottomBorderFromLastBlock();
});

window.addEventListener("resize", () => {
  scaleFontAndVerticalPaddingToFit();
  removeBottomBorderFromLastBlock();
});

// If using Reveal.js, make sure to handle slide changes dynamically
if (typeof Reveal !== "undefined") {
  Reveal.addEventListener("slidechanged", () => {
    scaleFontAndVerticalPaddingToFit();
    removeBottomBorderFromLastBlock();
  });
}
