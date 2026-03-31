(function () {
  const $ = (id) => document.getElementById(id);
  const nickname = $("nickname");
  const height = $("height");
  const weight = $("weight");
  const goal = $("goal");
  const output = $("planOutput");
  const wechat = "Cr9x0819";
  let latestPlanText = "";
  const orderKey = "chirenchen_current_order_v1";

  function makeOrderId() {
    // 订单号格式：CRC + 年月日时分秒 + 4位随机数，纯前端占位用于人工对单
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const ts = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
    const rnd = Math.floor(1000 + Math.random() * 9000);
    return `CRC${ts}${rnd}`;
  }

  function setOrderId(id) {
    localStorage.setItem(orderKey, id);
    const el = $("orderId");
    if (el) el.textContent = id;
  }

  function getOrderId() {
    let id = localStorage.getItem(orderKey);
    if (!id) {
      id = makeOrderId();
      setOrderId(id);
    }
    return id;
  }

  function buildPlan() {
    const n = (nickname.value || "你").trim();
    const h = Number(height.value);
    const w = Number(weight.value);
    const g = goal.value;
    if (!h || !w) {
      alert("请先填写身高和体重。");
      return;
    }

    const bmi = w / Math.pow(h / 100, 2);
    const p = (g === "增肌" ? 2.0 : 1.8) * w;
    const f = (g === "减脂" ? 0.8 : 0.9) * w;

    latestPlanText =
`【吃人陈｜个人执行方案】
昵称：${n}
身高：${h} cm
体重：${w} kg
目标：${g}
BMI：${bmi.toFixed(1)}

一、每日营养建议（基础）
- 蛋白质：${p.toFixed(1)} g
- 脂肪：${f.toFixed(1)} g
- 碳水：按训练日与体重趋势微调

二、训练建议
- 每周 3-4 次力量训练（每动作 3 组 × 8-12 次）
- 每周 2-4 次有氧（20-40 分钟）
- 每 2-3 周复盘一次并微调

三、执行提示
- 睡眠目标：7-8 小时
- 饮水：2-3L/天（视出汗量调整）
- 优先保证连续性，不求单次极限

四、进阶交付
如需 7 天详细饮食+训练逐日版，请联系微信：${wechat}
`;
    output.textContent = latestPlanText;
  }

  function exportPlan() {
    if (!latestPlanText) {
      alert("请先生成方案。");
      return;
    }
    const blob = new Blob([latestPlanText], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "吃人陈-个人方案.txt";
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    document.body.removeChild(a);
  }

  $("btnGenerate").addEventListener("click", buildPlan);
  $("btnExport").addEventListener("click", exportPlan);

  // 支付方式切换
  const tabs = Array.from(document.querySelectorAll(".tab"));
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".pay-panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      const mode = tab.dataset.pay;
      const panel = document.getElementById(mode === "wx" ? "pay-wx" : "pay-ali");
      if (panel) panel.classList.add("active");
    });
  });

  $("btnPayNow").addEventListener("click", () => {
    const id = makeOrderId();
    setOrderId(id);
    alert(`订单已创建：${id}\n请使用当前显示的收款码完成支付。支付后点击“我已支付”。`);
  });
  $("btnPaid").addEventListener("click", () => {
    const id = getOrderId();
    alert(`已支付后加微信并发截图。\n微信：${wechat}\n请同时发送：订单号 ${id} + 昵称。`);
  });

  $("btnCopyOrder").addEventListener("click", async () => {
    const id = getOrderId();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(id);
      } else {
        const ta = document.createElement("textarea");
        ta.value = id;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      alert("订单号已复制：" + id);
    } catch (e) {
      alert("复制失败，请手动记录订单号：" + id);
    }
  });

  // 初始化显示历史订单号
  setOrderId(getOrderId());
})();

