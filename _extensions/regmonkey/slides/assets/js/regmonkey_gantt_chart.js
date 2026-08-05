// gantt-chart.js
(function () {
  'use strict';

  // YAMLパーサー（簡易版）
  function parseYAML(yamlText) {
    const lines = yamlText.split('\n');
    const config = {};

    lines.forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          let value = valueParts.join(':').trim();

          // --- 追加: boolean 判定 ---
          if (value.toLowerCase() === 'true') {
            value = true;
          } else if (value.toLowerCase() === 'false') {
            value = false;
          }
          // 数値の変換
          else if (!isNaN(value) && value !== '') {
            value = Number(value);
          }
          // そのほかは文字列のまま
          config[key.trim()] = value;
        }
      }
    });

    return config;
  }

  function formatQuarter(date) {
    const q = Math.floor(date.getMonth() / 3) + 1; // 0-based → Q1〜Q4
    return `${date.getFullYear()} Q${q}`;
  }

  // ガントチャートの描画
  function drawGanttChart(container, tasks, config) {
    const chartStartX = config.nameWidth + (config.showPersonInCharge ? config.personInChargeWidth : 0);
    const chartWidth = config.svgWidth - chartStartX;
    const headerHeight = ((config.isShowWeek) ? 80 : 40);

    const dateToX = (date) => {
      const d = new Date(date);
      const timeMin = new Date(config.timeMin);
      const timeMax = new Date(config.timeMax);
      const totalDays = (timeMax - timeMin) / (1000 * 60 * 60 * 24);
      const daysPassed = (d - timeMin) / (1000 * 60 * 60 * 24);
      // daysPassedが負の値にならないように調整 (範囲外のタスクはグラフ外に配置)
      const normalizedDaysPassed = Math.max(0, daysPassed);
      return chartStartX + (normalizedDaysPassed / totalDays) * chartWidth;
    };

    const getTaskColor = (task) => {
      if (task.isFinished) return '#0E3666';
      if (task.isStarted) return '#1976d2';
      return '#B4D7FF';
    };

    const getDelayInfo = (task) => {
      const endDate = new Date(task.actualEnd);
      endDate.setHours(0, 0, 0, 0);
      const today = new Date(config.today || new Date());
      today.setHours(0, 0, 0, 0); // 時刻をリセット

      if (task.isFinished) {
        return { isDelayed: false, days: 0 };
      }

      if (endDate < today) {
        const diffTime = Math.abs(endDate - today);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { isDelayed: true, days: diffDays };
      }

      return { isDelayed: false, days: 0 };
    };

    const generateMonths = () => {
      const months = [];
      let current = new Date(config.timeMin);
      current.setDate(1);
      const timeMax = new Date(config.timeMax);

      while (current <= timeMax) {
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        const displayEnd = monthEnd > timeMax ? timeMax : monthEnd;
        const fmt = d3.timeFormat(config.dateFormat || "%Y年%m月");

        // "%y/%m";   // → "26/01"
        // "%Y/%m";   // → "2026/01"
        // "%Y年%m月"; // → "2026年01月"
        // "%b %Y";   // → "Jan 2026"

        let monthLabel;
        if (config.dateFormat === "quarter") {
          monthLabel = formatQuarter(current);
        } else {
          const fmt = d3.timeFormat(config.dateFormat || "%Y年%m月");
          monthLabel = fmt(current);
        }

        months.push({
          date: new Date(current),
          endDate: displayEnd,
          label: monthLabel
        });

        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      }

      return months;
    };

    const generateWeeks = () => {
      const weeks = [];
      let current = new Date(config.timeMin);
      const timeMax = new Date(config.timeMax);

      // 週の始まりを調整（ここでは日曜日を週の始まりとするロジックを想定）
      current.setDate(current.getDate() - current.getDay()); // 週の始まりの日曜日に設定

      while (current <= timeMax) {
        const weekEnd = new Date(current);
        weekEnd.setDate(current.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        const displayEnd = weekEnd > timeMax ? timeMax : weekEnd;

        weeks.push({
          date: new Date(current),
          endDate: displayEnd,
          label: `${current.getMonth() + 1}/${current.getDate()}`
        });

        current = new Date(current);
        current.setDate(current.getDate() + 7);
      }

      return weeks;
    };

    const flattenTasks = (taskList, depth = 0) => {
      let result = [];
      taskList.forEach(task => {
        result.push({ ...task, depth });
        if (task.children && task.children.length > 0) {
          result = result.concat(flattenTasks(task.children, depth + 1));
        }
      });
      return result;
    };

    const allTasks = flattenTasks(tasks);
    const months = generateMonths();
    const weeks = generateWeeks();
    const today = new Date(config.today || new Date());

    // --- 【修正ロジック】IDに基づいた描画行のインデックスを決定 ---
    // 複数のタスク/マイルストーンを同じ行にマッピングするために，IDをキーとして一意の行インデックスを割り当てる
    const taskIdMap = {};
    let rowIndex = 0;
    allTasks.forEach(task => {
      // idがない場合は配列のインデックスで一意キー生成し，別の行として扱う
      const key = task.id || `_no_id_${allTasks.findIndex(t => t === task)}`;

      if (!taskIdMap.hasOwnProperty(key)) {
        taskIdMap[key] = rowIndex;
        rowIndex++;
      }
    });

    const totalRows = rowIndex; // 描画する行の総数 (一意なIDの数)

    // SVG要素の作成
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', config.svgWidth);
    // SVGの高さを計算し直す
    svg.setAttribute('height', headerHeight + totalRows * config.rowHeight);
    svg.setAttribute('style', 'display: block;');
    // --- 【修正ロジック】ここまで ---

    // ヘッダー背景
    const headerBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    headerBg.setAttribute('x', 0);
    headerBg.setAttribute('y', 0);
    headerBg.setAttribute('width', config.svgWidth);
    headerBg.setAttribute('height', headerHeight);
    headerBg.setAttribute('fill', '#f5f5f5');
    svg.appendChild(headerBg);

    // 月ヘッダー (省略... 変更なし)
    months.forEach((month, i) => {
      const x = dateToX(month.date);
      const nextX = dateToX(new Date(month.endDate.getTime() + 1));
      const width = nextX - x;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', 0);
      rect.setAttribute('width', width);
      rect.setAttribute('height', 40);
      rect.setAttribute('fill', '#e0e0e0');
      rect.setAttribute('stroke', 'none');
      g.appendChild(rect);

      if (i < months.length - 1) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x + width);
        line.setAttribute('y1', 0);
        line.setAttribute('x2', x + width);
        line.setAttribute('y2', 40);
        line.setAttribute('stroke', '#999');
        line.setAttribute('stroke-width', 2);
        g.appendChild(line);
      }

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x + width / 2);
      text.setAttribute('y', 25);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', config.monthFontSize || config.fontSize);
      text.setAttribute('font-weight', config.fontWeight);
      text.setAttribute('fill', '#1a1a1a');
      text.textContent = month.label;
      g.appendChild(text);

      svg.appendChild(g);
    });

    // 週ヘッダー (省略... 変更なし)
    if (config.isShowWeek) {
      weeks.forEach((week, i) => {
        const x = dateToX(week.date);
        const nextX = dateToX(new Date(week.endDate.getTime() + 1));
        const width = nextX - x;

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', 40);
        rect.setAttribute('width', width);
        rect.setAttribute('height', 40);
        rect.setAttribute('fill', '#f5f5f5');
        rect.setAttribute('stroke', 'none');
        g.appendChild(rect);

        if (i < weeks.length - 1) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', x + width);
          line.setAttribute('y1', 40);
          line.setAttribute('x2', x + width);
          line.setAttribute('y2', 80);
          line.setAttribute('stroke', '#ccc');
          line.setAttribute('stroke-width', 1);
          g.appendChild(line);
        }

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x + width / 2);
        text.setAttribute('y', 65);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', config.dateFontSize);
        text.setAttribute('font-weight', config.fontWeight);
        text.setAttribute('fill', '#1a1a1a');
        // const options = {day: '2-digit' };
        // text.textContent = week.date.toLocaleDateString('ja-JP', options);
        text.textContent = week.date.getDate();
        g.appendChild(text);

        svg.appendChild(g);
      })
    };

    // 列ヘッダー（タスク名，担当） (省略... 変更なし)
    const nameHeaderRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    nameHeaderRect.setAttribute('x', 0);
    nameHeaderRect.setAttribute('y', 0);
    nameHeaderRect.setAttribute('width', config.nameWidth);
    nameHeaderRect.setAttribute('height', (config.isShowWeek) ? headerHeight : 40);
    nameHeaderRect.setAttribute('fill', '#f5f5f5');
    nameHeaderRect.setAttribute('stroke', '#999');
    nameHeaderRect.setAttribute('stroke-width', 1);
    svg.appendChild(nameHeaderRect);

    const nameHeaderText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    nameHeaderText.setAttribute('x', config.nameWidth / 2);
    nameHeaderText.setAttribute('y', (config.isShowWeek) ? 45 : 25);
    nameHeaderText.setAttribute('text-anchor', 'middle');
    nameHeaderText.setAttribute('font-size', config.fontSize);
    nameHeaderText.setAttribute('font-weight', config.fontWeight);
    nameHeaderText.setAttribute('fill', '#1a1a1a');
    nameHeaderText.textContent = 'タスク名';
    svg.appendChild(nameHeaderText);

    if (config.showPersonInCharge) {
      const chargeHeaderRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      chargeHeaderRect.setAttribute('x', config.nameWidth);
      chargeHeaderRect.setAttribute('y', 0);
      chargeHeaderRect.setAttribute('width', config.personInChargeWidth);
      chargeHeaderRect.setAttribute('height', headerHeight);
      chargeHeaderRect.setAttribute('fill', '#f5f5f5');
      chargeHeaderRect.setAttribute('stroke', '#999');
      chargeHeaderRect.setAttribute('stroke-width', 1);
      svg.appendChild(chargeHeaderRect);

      const chargeHeaderText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      chargeHeaderText.setAttribute('x', config.nameWidth + config.personInChargeWidth / 2);
      chargeHeaderText.setAttribute('y', (config.isShowWeek) ? 45 : 25);
      chargeHeaderText.setAttribute('text-anchor', 'middle');
      chargeHeaderText.setAttribute('font-size', config.fontSize);
      chargeHeaderText.setAttribute('font-weight', config.fontWeight);
      chargeHeaderText.setAttribute('fill', '#1a1a1a');
      chargeHeaderText.textContent = '担当';
      svg.appendChild(chargeHeaderText);
    }
    // タスク描画
    allTasks.forEach((task) => {
      // 【修正ロジック】IDをキーとしてインデックスを取得
      const key = task.id || `_no_id_${allTasks.findIndex(t => t === task)}`;
      const index = taskIdMap[key];
      if (index === undefined) return;

      // タスクバー・マイルストーンは重複して描画する

      const y = headerHeight + index * config.rowHeight;
      const taskY = y + (config.rowHeight - config.taskHeight) / 2;
      const startX = dateToX(task.actualStart);
      const endX = dateToX(task.actualEnd);
      const taskWidth = endX - startX;
      const delayInfo = getDelayInfo(task);

      const taskGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      // --- 【修正ロジック】行情報（背景，タスク名，担当者）は最初のタスクのみ描画 ---
      // 同じIDのタスクの中で，allTasks配列内で最初に出現したタスクであるかチェック
      const isFirstOccurrence = allTasks.findIndex(t => t.id === task.id) === allTasks.findIndex(t => t === task);

      if (isFirstOccurrence) {
        // 行背景
        const rowBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rowBg.setAttribute('x', 0);
        rowBg.setAttribute('y', y);
        rowBg.setAttribute('width', config.svgWidth);
        rowBg.setAttribute('height', config.rowHeight);
        rowBg.setAttribute('fill', index % 2 === 0 ? '#ffffff' : '#fafafa');
        rowBg.setAttribute('stroke', '#e0e0e0');
        rowBg.setAttribute('stroke-width', 0.5);
        taskGroup.appendChild(rowBg);

        // タスク名
        const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        nameText.setAttribute('x', 10 + task.depth * 20);
        nameText.setAttribute('y', y + config.rowHeight / 2 + 6);
        nameText.setAttribute('font-size', config.fontSize);
        nameText.setAttribute('fill', '#1a1a1a');
        nameText.textContent = task.name;
        taskGroup.appendChild(nameText);

        // 担当者
        if (config.showPersonInCharge) {
          const chargeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          chargeText.setAttribute('x', config.nameWidth + 10);
          chargeText.setAttribute('y', y + config.rowHeight / 2 + 6);
          chargeText.setAttribute('font-size', config.fontSize);
          chargeText.setAttribute('fill', '#1a1a1a');
          chargeText.textContent = task.personInCharge || '';
          taskGroup.appendChild(chargeText);
        }
      }
      // --- 【修正ロジック】ここまで ---

      // タスクバーまたはマイルストーン (全てのタスクに対して描画)
      if (task.isMilestone) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const cx = startX;
        const cy = y + config.rowHeight / 2;
        path.setAttribute('d', `M ${cx},${cy} L ${cx + 10},${cy - 10} L ${cx + 20},${cy} L ${cx + 10},${cy + 10} Z`);
        path.setAttribute('fill', task.isFinished ? '#0E3666' : '#1976d2');
        path.setAttribute('stroke', '#1a1a1a');
        path.setAttribute('stroke-width', 1);
        taskGroup.appendChild(path);

        const milestoneLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        milestoneLabel.setAttribute('x', cx + 25);
        milestoneLabel.setAttribute('y', cy + 5);
        milestoneLabel.setAttribute('font-size', config.labelFontSize);
        milestoneLabel.setAttribute('fill', '#1a1a1a');
        milestoneLabel.setAttribute('font-weight', 'bold');
        // マイルストーンラベルは，最初のものに限定せず，全て描画する
        milestoneLabel.textContent = task.note;
        taskGroup.appendChild(milestoneLabel);
      } else {
        const taskBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        taskBar.setAttribute('x', startX);
        taskBar.setAttribute('y', taskY);
        taskBar.setAttribute('width', taskWidth);
        taskBar.setAttribute('height', config.taskHeight);
        taskBar.setAttribute('fill', (task.isTrackingTime && delayInfo.isDelayed) ? '#D31804' : getTaskColor(task));
        taskBar.setAttribute('rx', 3);
        taskGroup.appendChild(taskBar);

        // タスクラベル
        if (task.note || delayInfo.isDelayed) {
          const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          label.setAttribute('x', endX + 5);
          label.setAttribute('y', taskY + config.taskHeight / 2 + 5);
          label.setAttribute('font-size', config.labelFontSize);
          label.setAttribute('fill', '#1a1a1a');
          label.setAttribute('font-weight', 'normal');

          if (task.isTrackingTime && delayInfo.isDelayed) {
            // 通常の note 部分
            const noteSpan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            noteSpan.textContent = task.note || '';

            // 赤い遅延部分
            const delaySpan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            delaySpan.textContent = `[${delayInfo.days}日遅延]`;
            delaySpan.setAttribute('fill', '#D31804');
            delaySpan.setAttribute('font-weight', 'bold');

            label.appendChild(noteSpan);
            label.appendChild(delaySpan);
          } else {
            // 遅延なし：通常 note 表示
            label.textContent = task.note || '';
          }

          taskGroup.appendChild(label);
        }
      }

      svg.appendChild(taskGroup);
    });

    // 本日ライン
    if (config.VerticalLine) {
      const todayLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      todayLine.setAttribute('x1', dateToX(today));
      todayLine.setAttribute('y1', headerHeight);
      todayLine.setAttribute('x2', dateToX(today));
      todayLine.setAttribute('y2', headerHeight + totalRows * config.rowHeight);
      todayLine.setAttribute('stroke', '#575757');
      todayLine.setAttribute('stroke-width', 2);
      todayLine.setAttribute('stroke-dasharray', '5 2');
      svg.appendChild(todayLine);
    }

    // 凡例 (省略... 変更なし)
    const legendDiv = document.createElement('div');
    legendDiv.style.cssText = 'display: flex; align-items: center; gap: 24px; padding: 12px; background: white; border-top: 1px solid #e0e0e0;';

    let legends = [];
    if (config.isDisplayLegend === false) {
      legends = [];
    } else {
      legends.push(
        { color: '#0E3666', text: '完了タスク' },
        { color: '#1976d2', text: '着手済みタスク' },
        { color: '#B4D7FF', text: '未着手タスク' },
        { color: '#D31804', text: '遅延タスク' }
      );
      if (config.VerticalLine) {
        legends.push({ color: '#575757', text: '本日', isLine: true });
      }
    }

    // --- 【修正ロジック】凡例の表示制御を追加 ---

    legends.forEach(legend => {
      const item = document.createElement('div');
      item.style.cssText = 'display: flex; align-items: center; gap: 8px;';

      const icon = document.createElement('div');
      if (legend.isLine) {
        icon.style.cssText = `width: 48px; height: 4px; background-color: ${legend.color};`;
      } else {
        icon.style.cssText = `width: 16px; height: 16px; background-color: ${legend.color};`;
      }

      const text = document.createElement('span');
      text.style.fontSize = '16px';
      text.textContent = legend.text;

      item.appendChild(icon);
      item.appendChild(text);
      legendDiv.appendChild(item);
    });

    // コンテナに追加
    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'width: 100%; heihgt: 100%; overflow: auto; background: white;';
    wrapper.appendChild(svg);
    wrapper.appendChild(legendDiv);
    container.appendChild(wrapper);
  }

  // 初期化 (省略... 変更なし)
  function initGanttCharts() {
    const containers = document.querySelectorAll('.gantt-chart-inject');

    containers.forEach(container => {
      const dataFile = container.getAttribute('data-json');
      const configFile = container.getAttribute('data-config');

      if (!dataFile || !configFile) {
        console.error('data-json and data-config attributes are required');
        return;
      }

      // 設定とデータを読み込み
      Promise.all([
        fetch(configFile).then(res => res.text()).then(parseYAML),
        fetch(dataFile).then(res => res.json())
      ])
        .then(([config, tasks]) => {
          // デフォルト設定
          const defaultConfig = {
            svgWidth: 1600,
            svgHeight: 480, // この値はdrawGanttChart内で上書きされる
            rowHeight: 40,
            fontSize: 20,
            dateFontSize: 12,
            labelFontSize: 16,
            fontWeight: 800,
            nameWidth: 300,
            personInChargeWidth: 150,
            taskHeight: 20,
            labelPadding: 8,
            timeMin: '2025-04-27',
            timeMax: '2025-07-20',
            today: new Date().toISOString().split('T')[0],
            isTrackingTime: false,
          };

          const finalConfig = { ...defaultConfig, ...config };
          drawGanttChart(container, tasks, finalConfig);
        })
        .catch(error => {
          console.error('Error loading Gantt chart:', error);
          container.innerHTML = `<div style="color: red; padding: 20px;">Error loading chart: ${error.message}</div>`;
        });
    });
  }

  // DOMContentLoaded後に実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGanttCharts);
  } else {
    initGanttCharts();
  }
})();
