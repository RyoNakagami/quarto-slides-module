window.addEventListener('load', () => {
  // AnyChart CDN はロードしない方針になったため，ライブラリ不在時は静かにスキップする
  // （このウィジェットを使う場合は deck 側の header-includes で AnyChart をロードすること）
  if (typeof anychart === 'undefined') {
    if (document.querySelector('.regmonkey-waterfall-container')) {
      console.warn('regmonkey_waterfall: anychart library not loaded; waterfall containers skipped');
    }
    return;
  }
  document.querySelectorAll('.regmonkey-waterfall-container').forEach(container => {
    const rawYaml = container.textContent.trim();
    if (!rawYaml) return;
    const parsedYaml = jsyaml.load(rawYaml);

    // AnyChart用データ配列に変換
    const data = [];
    const colors = [];

    Object.keys(parsedYaml).forEach(key => {
      const item = parsedYaml[key];
      data.push({
        x: key,
        value: item.value,
        custom_field: item.custom_field || "",
        isTotal: item.is_total || false,
        label_name: item.label_name || ""
      });
      colors.push(item.color || null);
    });

    container.innerHTML = '';

    // ウォーターフォールチャート生成
    const chart = anychart.waterfall();
    const series = chart.waterfall(data);

    // バーの色を配列で指定
    series.normal().fill((i) => colors[i] || "#1E90FF");
    series.normal().risingFill((i) => colors[i] || "#1E90FF");
    series.normal().fallingFill((i) => colors[i] || "#808080");

    // ラベル
    series.labels()
      .format("{%Value}")
      .fontColor("#1a1a1a")
      .fontSize(20);

    // 軸
    chart.xAxis().stroke({ color: "black", thickness: 1 });
    chart.yAxis().stroke({ color: "black", thickness: 1 });

    chart.xAxis().labels()
      .useHtml(true)
      .fontColor("#1a1a1a")
      .fontSize(18);

    // data-width / data-height からスタイル設定
    //Quarto は data- プレフィックスを要求する
    const width = container.getAttribute('data-width') || "100%";
    const height = container.getAttribute('data-height') || "80%";
    container.style.width = width;
    container.style.height = height;

    chart.container(container);

    const legendAttr = container.getAttribute('data-legend');
    if (legendAttr === "false" || legendAttr === "0") {
      chart.legend(false);
    } else {
      chart.legend(true);
    }
    console.log("legendAttr:", legendAttr);

    chart.draw();
  });
});
