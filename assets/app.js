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
  const advicePanel = $("advicePanel");
  const versionDate = $("versionDate");
  const resultStage = $("resultStage");
  const calcLoading = $("calcLoading");
  const stepFill = $("stepFill");
  const stepCalc = $("stepCalc");
  const stepResult = $("stepResult");
  const detailModal = $("detailModal");
  const detailTitle = $("detailTitle");
  const detailBody = $("detailBody");
  const modalClose = $("modalClose");
  const selectedPack = $("selectedPack");
  const payScript = $("payScript");
  const btnCopyScript = $("btnCopyScript");
  const copyScriptStatus = $("copyScriptStatus");
  const wechat = "Cr9x0819";
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

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }

  function getOrderId() {
    let id = localStorage.getItem(orderKey);
    if (!id) {
      id = makeOrderId();
      setOrderId(id);
    }
    return id;
  }

  /** 将数值限制在合理区间，避免极端输入导致后续计算失真 */
  function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
  }

  let calcBusy = false;
  let calcTimer = null;

  function buildPlan() {
    if (calcBusy) return;
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
    if (a < 10 || a > 120 || h < 100 || h > 250 || w < 25 || w > 300) {
      alert("请检查输入是否在合理范围：年龄 10–120 岁，身高 100–250 cm，体重 25–300 kg。");
      return;
    }

    calcBusy = true;
    if (calcTimer) window.clearTimeout(calcTimer);

    // 1) BMI（身体质量指数 Body Mass Index）：体重(kg) / 身高(m)²，用于粗略判断体重区间。
    const bmi = w / Math.pow(h / 100, 2);
    const bmiLevel = bmi < 18.5 ? "偏瘦" : bmi < 24 ? "正常" : bmi < 28 ? "超重" : "肥胖";

    // 2) BMR（基础代谢率 Basal Metabolic Rate）+ TDEE（每日总消耗 Total Daily Energy Expenditure）：采用 Mifflin-St Jeor 公式估算静息代谢，再乘以活动系数得到维持热量。
    const bmr = sex === "男"
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161;
    const tdee = bmr * af;

    // 3) 目标热量：在 TDEE 基础上按目标微调（减脂 -400 kcal / 增肌 +300 kcal），为常见可执行区间，非医疗处方。
    const k = g === "增肌" ? tdee + 300 : g === "减脂" ? tdee - 400 : tdee;

    // 4) 三大营养素（简化模型）：蛋白质/脂肪按体重系数，碳水由剩余热量推算（1g 蛋白质≈4 kcal，1g 碳水≈4 kcal，1g 脂肪≈9 kcal）。
    const p = (g === "增肌" ? 2.0 : 1.8) * w;
    const f = (g === "减脂" ? 0.8 : 0.9) * w;
    const c = Math.max(0, (k - p * 4 - f * 9) / 4);

    // 5) 体脂率估算：围度足够且 Navy 公式结果在合理范围时用 Navy（美国海军围度法）；否则用经验回归（仅作趋势参考，不能替代体脂秤或医学检测）。
    const bfByBmi = 1.2 * bmi + 0.23 * a - 10.8 * (sex === "男" ? 1 : 0) - 5.4;
    let bfNavy = null;
    if (sex === "男" && wc > nc && nc > 0 && h > 0) {
      const logWn = Math.log10(wc - nc);
      const logH = Math.log10(h);
      if (Number.isFinite(logWn) && Number.isFinite(logH)) {
        bfNavy = 495 / (1.0324 - 0.19077 * logWn + 0.15456 * logH) - 450;
      }
    } else if (sex === "女" && wc > 0 && hc > 0 && nc > 0 && wc + hc > nc && h > 0) {
      const logSum = Math.log10(wc + hc - nc);
      const logH = Math.log10(h);
      if (Number.isFinite(logSum) && Number.isFinite(logH)) {
        bfNavy = 495 / (1.29579 - 0.35004 * logSum + 0.221 * logH) - 450;
      }
    }
    const navyOk = bfNavy !== null && Number.isFinite(bfNavy) && bfNavy > 3 && bfNavy < 55;
    const bodyFat = clamp(navyOk ? bfNavy : bfByBmi, 5, 50);

    // 6) LBM（去脂体重 Lean Body Mass）与 FFMI（去脂体重指数 Fat-Free Mass Index）：用于粗略衡量肌肉量相对身高的水平。
    const lbm = w * (1 - bodyFat / 100);
    const ffmi = lbm / Math.pow(h / 100, 2);

    // 7) 目标体重区间：给用户清晰阶段目标（减脂到哪、增肌到哪）。
    const targetMin = 18.5 * Math.pow(h / 100, 2);
    const targetMax = 23.9 * Math.pow(h / 100, 2);

    // 8) 1RM（单次最大重复重量估算 One-Rep Max estimate）：Epley 经验公式 w×(1+r/30)；次数 r>30 时按 r=30 封顶，避免高次数外推失真。
    const oneRm = lw > 0 && lr > 0 ? lw * (1 + Math.min(lr, 30) / 30) : 0;

    // 9) 饮水建议：按体重估算基础量，再按目标略加上训练补水（非精确医学饮水量）。
    const waterBase = w * 35;
    const waterTrain = g === "增肌" ? 600 : 400;
    const waterMl = waterBase + waterTrain;

    // 10) 配速：总用时(分钟) / 距离(km) = 每公里分钟数，再换算成分秒展示。
    const paceMin = rd > 0 && rm > 0 ? rm / rd : 0;
    let paceText = "-";
    if (paceMin > 0) {
      const whole = Math.floor(paceMin);
      let sec = Math.round((paceMin - whole) * 60);
      if (sec === 60) {
        sec = 0;
      }
      paceText = `${whole}分${sec}秒/公里`;
    }

    if (calcLoading) calcLoading.hidden = false;
    if (resultStage) resultStage.hidden = true;
    setActiveStep("calc");

    const bfNote = navyOk ? "Navy（美国海军围度法）" : "经验回归（参考）";
    calcResult.innerHTML = `
      <div class="metric"><b>BMI（身体质量指数）</b><span>${bmi.toFixed(1)}（${bmiLevel}）</span></div>
      <div class="metric"><b>BMR（基础代谢率）</b><span>${bmr.toFixed(0)} kcal（千卡）</span></div>
      <div class="metric"><b>TDEE（每日总消耗）</b><span>${tdee.toFixed(0)} kcal（千卡）</span></div>
      <div class="metric"><b>目标热量</b><span>${k.toFixed(0)} kcal（千卡）</span></div>
      <div class="metric"><b>蛋白质</b><span>${p.toFixed(1)} g（克）</span></div>
      <div class="metric"><b>脂肪</b><span>${f.toFixed(1)} g（克）</span></div>
      <div class="metric"><b>碳水</b><span>${c.toFixed(1)} g（克）</span></div>
      <div class="metric"><b>体脂率估算</b><span>${bodyFat.toFixed(1)}%（${bfNote}）</span></div>
      <div class="metric"><b>LBM（去脂体重）</b><span>${lbm.toFixed(1)} kg（千克）</span></div>
      <div class="metric"><b>FFMI（去脂体重指数）</b><span>${ffmi.toFixed(1)}</span></div>
      <div class="metric"><b>健康体重区间（BMI 18.5–23.9）</b><span>${targetMin.toFixed(1)} - ${targetMax.toFixed(1)} kg（千克）</span></div>
      <div class="metric"><b>1RM（单次最大重量估算）</b><span>${oneRm ? oneRm.toFixed(1) + " kg（千克）" : "-"}</span></div>
      <div class="metric"><b>饮水建议</b><span>${(waterMl / 1000).toFixed(2)} L（升）/天</span></div>
      <div class="metric"><b>pace（配速）</b><span>${paceText}</span></div>
      <div class="metric metric-full"><b>说明</b><span>本页为通用估算，不能替代医学诊断。BMR/TDEE 使用 Mifflin-St Jeor（米夫林–圣乔尔）公式；体脂优先 Navy（美国海军围度法，测量单位 cm），否则为经验回归；营养目标为简化模型；1RM 为 Epley（埃普利）估算，高次数时偏差更大。</span></div>
    `;
    planCards.innerHTML = `
      <div class="plan-card">
        <h3>基础代谢与热量</h3>
        <p>BMR（基础代谢率）：${bmr.toFixed(0)} kcal（千卡）</p>
        <p>TDEE（每日总消耗）：${tdee.toFixed(0)} kcal（千卡）</p>
        <p>目标热量：${k.toFixed(0)} kcal（千卡）</p>
      </div>
      <div class="plan-card">
        <h3>营养分配</h3>
        <p>蛋白质：${p.toFixed(1)} g（克）</p>
        <p>脂肪：${f.toFixed(1)} g（克）</p>
        <p>碳水：${c.toFixed(1)} g（克）</p>
      </div>
      <div class="plan-card">
        <h3>体成分与力量</h3>
        <p>体脂率：${bodyFat.toFixed(1)}%（${bfNote}）</p>
        <p>LBM（去脂体重）：${lbm.toFixed(1)} kg（千克）</p>
        <p>1RM（单次最大重量估算）：${oneRm ? oneRm.toFixed(1) + " kg（千克）" : "-"}</p>
      </div>
      <div class="plan-card">
        <h3>执行建议</h3>
        <p>饮水：${(waterMl / 1000).toFixed(2)} L（升）/天</p>
        <p>pace（配速）：${paceText}</p>
        <p>睡眠：7-8 小时</p>
      </div>
    `;

    const trainFreq = g === "增肌" ? "每周 4 次力量 + 2 次轻有氧" : g === "减脂" ? "每周 3 次力量 + 3 次中低强度有氧" : "每周 3-4 次力量 + 2 次有氧";
    const progressRule = g === "增肌" ? "每周给主动作多做 1-2 次，或增加 1-2.5kg" : "先把动作做到更标准，再逐步增加训练量";
    const goalText = g === "增肌" ? "增肌" : g === "减脂" ? "减脂" : "体型维持";
    const tip = `${n}，你现在已经拿到了专属数据，接下来就是把结果做出来。\n\n【训练建议】\n- 你的目标：${goalText}\n- 节奏：${trainFreq}\n- 力量训练保持 3 组 × 8-12 次，组间休息 90-180 秒\n- 有氧每次 20-35 分钟，优先快走/骑行/慢跑\n\n【执行提示】\n- ${progressRule}\n- 每周固定同一天晨起空腹称重，用周均值看趋势\n- 睡眠保持 7-8 小时，饮水约 ${(waterMl / 1000).toFixed(2)} L/天\n\n坚持 14 天，你会先感觉状态更好；坚持 30 天，身体变化会开始变得明显。`;
    advicePanel.textContent = tip;

    calcTimer = window.setTimeout(() => {
      if (calcLoading) calcLoading.hidden = true;
      if (resultStage) resultStage.hidden = false;
      setActiveStep("result");
      if (resultStage) resultStage.scrollIntoView({ behavior: "smooth", block: "start" });
      calcBusy = false;
      calcTimer = null;
    }, 450);
  }

  function setActiveStep(step) {
    if (!stepFill || !stepCalc || !stepResult) return;
    stepFill.classList.remove("active");
    stepCalc.classList.remove("active");
    stepResult.classList.remove("active");
    if (step === "fill") stepFill.classList.add("active");
    if (step === "calc") stepCalc.classList.add("active");
    if (step === "result") stepResult.classList.add("active");
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

  $("btnGenerate").addEventListener("click", buildPlan);

  function initDetailModal() {
    const detailButtons = Array.from(document.querySelectorAll(".open-detail"));
    detailButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const card = btn.closest(".info-card");
        if (!card || !detailModal || !detailTitle || !detailBody) return;
        const titleEl = card.querySelector("h3");
        const source = card.querySelector(".detail-source");
        detailTitle.textContent = titleEl ? titleEl.textContent : "详情";
        detailBody.innerHTML = source ? source.innerHTML : "<p>暂无内容</p>";
        detailModal.hidden = false;
      });
    });
    if (modalClose && detailModal) {
      modalClose.addEventListener("click", () => {
        detailModal.hidden = true;
      });
      detailModal.addEventListener("click", (e) => {
        if (e.target === detailModal) detailModal.hidden = true;
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && detailModal && !detailModal.hidden) detailModal.hidden = true;
      });
    }
  }

  function setTodayForVersion() {
    if (!versionDate) return;
    const d = new Date();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    versionDate.textContent = `${d.getFullYear()}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // 支付方式切换（微信 / 支付宝）
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
    alert(`订单号：${id}\n请用当前方式扫码支付 ¥9.9。支付后点击「我已支付」生成发给客服的文案。`);
  });
  $("btnPaid").addEventListener("click", () => {
    const id = getOrderId();
    const packText = selectedPack && selectedPack.textContent.trim()
      ? selectedPack.textContent.trim()
      : "¥9.9 定制咨询服务";
    const script = `你好吃人陈，我已支付【${packText}】。\n订单号：${id}\n昵称：${nickname.value || "未填写"}\n已附支付截图，请安排咨询对接，谢谢。`;
    if (payScript) payScript.textContent = script;
    alert(`请加微信并发送截图与订单信息。\n微信：${wechat}\n内容：订单号 ${id} + 昵称。`);
  });

  $("btnCopyOrder").addEventListener("click", async () => {
    const id = getOrderId();
    try {
      await copyText(id);
      alert("订单号已复制：" + id);
    } catch (e) {
      alert("复制失败，请手动记录订单号：" + id);
    }
  });

  if (btnCopyScript) {
    btnCopyScript.addEventListener("click", async () => {
      const script = (payScript ? payScript.textContent : "").trim();
      if (!script || script.includes("支付完成后点击")) {
        alert("请先点击「我已支付」生成发给客服的文案。");
        return;
      }
      try {
        await copyText(script);
        if (copyScriptStatus) {
          copyScriptStatus.textContent = "已复制，可直接粘贴发给客服";
          window.setTimeout(() => {
            if (copyScriptStatus) copyScriptStatus.textContent = "";
          }, 2200);
        }
      } catch (e) {
        alert("复制失败，请手动复制话术。");
      }
    });
  }

  // 初始化显示历史订单号
  setOrderId(getOrderId());
  initChecklist();
  initDetailModal();
  setTodayForVersion();
  setActiveStep("fill");
})();

