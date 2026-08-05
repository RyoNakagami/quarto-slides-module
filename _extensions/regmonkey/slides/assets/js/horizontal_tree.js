class HorizontalTree {
  constructor(input) {
    this.input = input;
  }

  parseInput(text) {
    const lines = text.split('\n');
    const root = { children: [] };
    const stack = [{ node: root, level: -1 }];

    for (let line of lines) {
      if (line.trim() === '') continue;
      if (line.trim().startsWith('horizontal_tree:')) continue;

      const level = line.search(/\S|$/);
      const name = line.trim().replace(/^-\s*/, '');

      while (stack.length > 1 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      const newNode = { name: name, children: [] };
      stack[stack.length - 1].node.children.push(newNode);
      stack.push({ node: newNode, level: level });
    }

    return root.children[0];
  }

  generateHTML(node) {
    if (!node) return '';
    
    let html = '<!-- We will create a family tree using just CSS(3)\nThe markup will be simple nested lists -->\n';
    html += '<div class="tree">\n';
    html += '\t<ul>\n';
    html += '\t\t<li>\n';
    html += `\t\t\t<a href="#">${node.name}</a>\n`;
    
    if (node.children && node.children.length > 0) {
      html += '\t\t\t<ul id="parent_root">\n';
      html += this.generateChildren(node.children, 4);
      html += '\t\t\t</ul>\n';
    }
    
    html += '\t\t</li>\n';
    html += '\t</ul>\n';
    html += '</div>';
    return html;
  }

  generateChildren(children, indent) {
    let html = '';
    const tabs = '\t'.repeat(indent);
    
    for (let child of children) {
      html += `${tabs}<li>\n`;
      html += `${tabs}\t<a>${child.name}</a>\n`;
      
      if (child.children && child.children.length > 0) {
        html += `${tabs}\t<ul>\n`;
        html += this.generateChildren(child.children, indent + 2);
        html += `${tabs}\t</ul>\n`;
      }
      
      html += `${tabs}</li>\n`;
    }
    
    return html;
  }

  convert(yamlText) {
    const tree = this.parseInput(yamlText);
    return this.generateHTML(tree);
  }
}

// For use in Reveal.js
window.addEventListener('load', () => {
  const trees = document.querySelectorAll('.horizontal-tree-container');
  trees.forEach(container => {
    const yamlContent = container.textContent.trim();
    const tree = new HorizontalTree();
    const html = tree.convert(yamlContent);
    container.innerHTML = html;
  });
});