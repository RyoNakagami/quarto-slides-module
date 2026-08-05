class VuetifyTimeline {
  constructor(container) {
    this.container = container;
  }

  parseInput(text) {
    const objList = [];
    let current = null;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    let listMode = false;
    let listBuffer = [];

    for (let line of lines) {
      const keyValMatch = line.match(/^(\w+):\s*(.*)$/);
      const listMatch = line.match(/^\-\s+(.+)$/);

      if (listMatch) {
        listMode = true;
        listBuffer.push(listMatch[1].replace(/^['"]|['"]$/g, ''));
        continue;
      }

      if (listMode) {
        if (current) current.content = listBuffer;
        listBuffer = [];
        listMode = false;
      }

      if (keyValMatch) {
        const [_, k, vRaw] = keyValMatch;
        const v = vRaw.replace(/^['"]|['"]$/g, '').replace(/,$/, '');
        if (k === 'title') {
          current = { title: v };
          objList.push(current);
        } else if (current) {
          current[k] = v;
        }
      }
    }

    if (listBuffer.length && current) {
      current.content = listBuffer;
    }

    return objList;
  }

  mount() {
    const timelineItems = this.parseInput(this.container.textContent);

    const { createApp } = Vue;
    const { createVuetify } = Vuetify;
    const vuetify = createVuetify();

    const app = createApp({
      data() { return { timelineItems }; },
      template: `
        <v-app>
          <v-container>
            <v-timeline direction="horizontal">
              <v-timeline-item
                v-for="(item, index) in timelineItems"
                :key="index"
                :dot-color="item.color"
              >
                <template v-slot:opposite>
                  <div class="regmonkey-timeline-opposite">{{ item.opposite }}</div>
                </template>
                <div>
                  <div class="regmonkey-timeline-title" v-html="item.title"></div>
                  <div class="regmonkey-timeline-content-block">
                    <ul v-if="Array.isArray(item.content)">
                      <li v-for="(c, i) in item.content" :key="i" v-html="c"></li>
                    </ul>
                    <p v-else>{{ item.content }}</p>
                  </div>
                </div>
              </v-timeline-item>
            </v-timeline>
          </v-container>
        </v-app>
      `
    });

    app.use(vuetify);
    app.mount(this.container);
    // console.log(timelineItems); debugger
  }
}

window.addEventListener('load', () => {
  const containers = document.querySelectorAll('.vuetify-timeline-container');
  containers.forEach(container => new VuetifyTimeline(container).mount());
});
