(function () {
  const $ = (id) => document.getElementById(id);
  const nickname = $("nickname");
  const age = $("age");
  const gender = $("gender");
  const height = $("height");
  const weight = $("weight");
  const activity = $("activity");
  const goal = $("goal");
  const waist = $("waist");
  const neck = $("neck");
  const hip = $("hip");
  const liftWeight = $("liftWeight");
  const liftReps = $("liftReps");
  const runDistance = $("runDistance");
  const runMinutes = $("runMinutes");
  const calcResult = $("calcResult");
  const planCards = $("planCards");
  const output = $("planOutput");
  const wechat = "Cr9x0819";
  let latestPlanText = "";
  const orderKey = "chirenchen_current_order_v1";
  const checklistKey = "chirenchen_free_checklist_v2";

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
    const a = Number(age.value);
    const sex = gender.value;
    const h = Number(height.value);
    const w = Number(weight.value);
    const af = Number(activity.value || 1.55);
    const g = goal.value;
    const wc = Number(waist.value || 0);
    const nc = Number(neck.value || 0);
    const hc = Number(hip.value || 0);
    const lw = Number(liftWeight.value || 0);
    const lr = Number(liftReps.value || 0);
    const rd = Number(runDistance.value || 0);
    const rm = Number(runMinutes.value || 0);
    if (!h || !w || !a) {
      alert("请先填写年龄、身高和体重。");
      return;
    }

    // 1) BMI：最基础体重状态指标，帮助新手先判断自己是偏瘦、正常还是偏高。
    const bmi = w / Math.pow(h / 100, 2);
    const bmiLevel = bmi < 18.5 ? "偏瘦" : bmi < 24 ? "正常" : bmi < 28 ? "超重" : "肥胖";

    // 2) BMR + TDEE：借鉴主流健身站做法，先算静息代谢，再乘活动系数得到维持热量。
    const bmr = sex === "男"
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161;
    const tdee = bmr * af;

    // 3) 目标热量：减脂 -400，增肌 +300，维持不变，便于直接执行。
    const k = g === "增肌" ? tdee + 300 : g === "减脂" ? tdee - 400 : tdee;

    // 4) 三大营养素：延续你前面设定的核心策略。
    const p = (g === "增肌" ? 2.0 : 1.8) * w;
    const f = (g === "减脂" ? 0.8 : 0.9) * w;
    const c = Math.max(0, (k - p * 4 - f * 9) / 4);

    // 5) 体脂估算：给没有体脂秤的用户一个“方向值”，用于长期对比趋势。
    const bfByBmi = 1.2 * bmi + 0.23 * a - 10.8 * (sex === "男" ? 1 : 0) - 5.4;
    let bfNavy = null;
    if (sex === "男" && wc > 0 && nc > 0 && wc > nc) {
      bfNavy = 495 / (1.0324 - 0.19077 * Math.log10(wc - nc) + 0.15456 * Math.log10(h)) - 450;
    } else if (sex === "女" && wc > 0 && hc > 0 && nc > 0 && wc + hc > nc) {
      bfNavy = 495 / (1.29579 - 0.35004 * Math.log10(wc + hc - nc) + 0.221 * Math.log10(h)) - 450;
    }
    const bodyFat = bfNavy && Number.isFinite(bfNavy) ? bfNavy : bfByBmi;

    // 6) 去脂体重与FFMI：帮助用户理解“体重变化里有多少是肌肉潜力相关”。
    const lbm = w * (1 - bodyFat / 100);
    const ffmi = lbm / Math.pow(h / 100, 2);

    // 7) 目标体重区间：给用户清晰阶段目标（减脂到哪、增肌到哪）。
    const targetMin = 18.5 * Math.pow(h / 100, 2);
    const targetMax = 23.9 * Math.pow(h / 100, 2);

    // 8) 1RM（Epley）：力量训练常用指标，估算极限力量以安排训练强度。
    const oneRm = lw > 0 && lr > 0 ? lw * (1 + lr / 30) : 0;

    // 9) 饮水建议：按体重估算，再加训练额外补水，实操价值高。
    const waterBase = w * 35;
    const waterTrain = g === "增肌" ? 600 : 400;
    const waterMl = waterBase + waterTrain;

    // 10) 跑步配速：距离 + 用时直接算配速，适合有氧用户。
    const paceMin = rd > 0 && rm > 0 ? rm / rd : 0;
    const paceText = paceMin > 0 ? `${Math.floor(paceMin)}分${Math.round((paceMin % 1) * 60)}秒/公里` : "-";

    calcResult.innerHTML = `
      <div class="metric"><b>BMI</b><span>${bmi.toFixed(1)}（${bmiLevel}）</span></div>
      <div class="metric"><b>BMR</b><span>${bmr.toFixed(0)} kcal</span></div>
      <div class="metric"><b>TDEE</b><span>${tdee.toFixed(0)} kcal</span></div>
      <div class="metric"><b>目标热量</b><span>${k.toFixed(0)} kcal</span></div>
      <div class="metric"><b>蛋白质</b><span>${p.toFixed(1)} g</span></div>
      <div class="metric"><b>脂肪</b><span>${f.toFixed(1)} g</span></div>
      <div class="metric"><b>碳水</b><span>${c.toFixed(1)} g</span></div>
      <div class="metric"><b>体脂率估算</b><span>${bodyFat.toFixed(1)}%</span></div>
      <div class="metric"><b>去脂体重</b><span>${lbm.toFixed(1)} kg</span></div>
      <div class="metric"><b>FFMI</b><span>${ffmi.toFixed(1)}</span></div>
      <div class="metric"><b>健康体重区间</b><span>${targetMin.toFixed(1)} - ${targetMax.toFixed(1)} kg</span></div>
      <div class="metric"><b>1RM 估算</b><span>${oneRm ? oneRm.toFixed(1) + " kg" : "-"}</span></div>
      <div class="metric"><b>饮水建议</b><span>${(waterMl / 1000).toFixed(2)} L/天</span></div>
      <div class="metric"><b>跑步配速</b><span>${paceText}</span></div>
    `;
    planCards.innerHTML = `
      <div class="plan-card">
        <h3>基础代谢与热量</h3>
        <p>BMR：${bmr.toFixed(0)} kcal</p>
        <p>TDEE：${tdee.toFixed(0)} kcal</p>
        <p>目标热量：${k.toFixed(0)} kcal</p>
      </div>
      <div class="plan-card">
        <h3>营养分配</h3>
        <p>蛋白质：${p.toFixed(1)} g</p>
        <p>脂肪：${f.toFixed(1)} g</p>
        <p>碳水：${c.toFixed(1)} g</p>
      </div>
      <div class="plan-card">
        <h3>体成分与力量</h3>
        <p>体脂率：${bodyFat.toFixed(1)}%</p>
        <p>去脂体重：${lbm.toFixed(1)} kg</p>
        <p>1RM：${oneRm ? oneRm.toFixed(1) + " kg" : "-"}</p>
      </div>
      <div class="plan-card">
        <h3>执行建议</h3>
        <p>饮水：${(waterMl / 1000).toFixed(2)} L/天</p>
        <p>有氧配速：${paceText}</p>
        <p>睡眠：7-8 小时</p>
      </div>
    `;

    latestPlanText =
`【吃人陈｜个人执行方案】
昵称：${n}
年龄：${a}
性别：${sex}
身高：${h} cm
体重：${w} kg
目标：${g}
BMI：${bmi.toFixed(1)}

一、核心计算结果（免费版）
- BMR：${bmr.toFixed(0)} kcal
- TDEE：${tdee.toFixed(0)} kcal
- 热量：${k.toFixed(0)} kcal
- 蛋白质：${p.toFixed(1)} g
- 脂肪：${f.toFixed(1)} g
- 碳水：${c.toFixed(1)} g
- 体脂率估算：${bodyFat.toFixed(1)}%
- 1RM估算：${oneRm ? oneRm.toFixed(1) + " kg" : "未填写重量和次数"}
- 饮水建议：${(waterMl / 1000).toFixed(2)} L/天
- 跑步配速：${paceText}

二、训练建议
- 每周 3-4 次力量训练（每动作 3 组 × 8-12 次）
- 每周 2-4 次有氧（20-40 分钟）
- 每 2-3 周复盘一次并微调

三、执行提示
- 睡眠目标：7-8 小时
- 饮水：2-3L/天（视出汗量调整）
- 优先保证连续性，不求单次极限

四、核心付费内容（解锁后交付）
- 7天逐日克数饮食表（按你的作息与目标定制）
- 7天逐日训练安排（动作/组次/强度进阶）
- 平台期调整策略（热量与训练量动态修正）
- 微信跟进答疑与复盘模板
联系微信：${wechat}
`;
    output.textContent = latestPlanText;
  }

  function initChecklist() {
    const wrap = $("freeChecklist");
    if (!wrap) return;
    let checkedMap = {};
    try {
      checkedMap = JSON.parse(localStorage.getItem(checklistKey) || "{}");
    } catch (e) {
      checkedMap = {};
    }
    const boxes = Array.from(wrap.querySelectorAll("input[type='checkbox']"));
    boxes.forEach((box) => {
      box.checked = Boolean(checkedMap[box.value]);
      box.addEventListener("change", () => {
        checkedMap[box.value] = box.checked;
        localStorage.setItem(checklistKey, JSON.stringify(checkedMap));
      });
    });
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

  function initRecipeFilter() {
    const buttons = Array.from(document.querySelectorAll(".tag-btn"));
    if (!buttons.length) return;
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const filter = btn.dataset.filter || "all";
        if (filter === "all") return;
        const id = makeOrderId();
        setOrderId(id);
        alert(`你点击了“${filter}”专题。\n该专题的完整食谱库为付费内容，请先完成支付解锁。\n订单号：${id}`);
        const pay = document.getElementById("paySection");
        if (pay) pay.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

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
  initChecklist();
  initRecipeFilter();
})();

