(function () {
  var C = window.LoanCalc;
  var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (!page || page === "/") page = "index.html";

  var RATES = {
    lpr1: 3.0,
    lpr5: 3.5,
    old1: 4.35,
    old5: 4.75,
    oldLong: 4.9,
    pfl1Short: 2.1,
    pfl1Long: 2.6,
    pfl2Short: 2.525,
    pfl2Long: 3.075,
    firstPay: 15,
    renovate: 4.5
  };

  var store = {};

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function val(name, root) {
    var el = $(inputName(name), root);
    return el ? el.value : "";
  }
  function inputName(name) {
    return '[name="' + name + '"]';
  }
  function num(name, root) {
    var n = parseFloat(val(name, root));
    return isFinite(n) ? n : 0;
  }
  function checked(name, root) {
    var el = $(inputName(name) + ":checked", root) || $$(inputName(name), root).filter(function (n) { return n.checked; })[0];
    return el ? el.value : "";
  }
  function setVal(name, value, root) {
    $$(inputName(name), root).forEach(function (el) {
      if (el.type === "radio" || el.type === "checkbox") return;
      el.value = value;
    });
  }
  function money(n) {
    if (!isFinite(n)) return "";
    return C.round2(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function wan(n) {
    var v = n / 10000;
    if (Math.abs(v - Math.round(v)) < 0.005) return Math.round(v) + "万";
    return v.toFixed(2) + "万";
  }
  function yearText(months) {
    var y = months / 12;
    if (Math.abs(y - Math.round(y)) < 1e-6) return Math.round(y) + "年";
    return y.toFixed(1) + "年";
  }
  function methodName(type) {
    return type === "annuity" ? "等额本息" : "等额本金";
  }
  function nowMonth() {
    var d = new Date();
    var m = String(d.getMonth() + 1);
    if (m.length < 2) m = "0" + m;
    return d.getFullYear() + "-" + m;
  }
  function toast(msg) {
    var el = $(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove("show"); }, 2200);
  }
  function markError(el, on) {
    if (!el) return;
    el.classList.toggle("js-error", !!on);
  }
  function requireNum(name, label) {
    var el = $(inputName(name));
    var n = num(name);
    if (!el || !el.value || n <= 0) {
      markError(el, true);
      toast("请输入" + (label || "有效数值"));
      return null;
    }
    markError(el, false);
    return n;
  }
  function getPeriod(selectName, customName, silent) {
    var months = parseInt(val(selectName), 10);
    if (!isFinite(months)) months = 360;
    if (months === 0) {
      months = parseInt(val(customName), 10);
      if (!months || months < 1) {
        if (!silent) {
          markError($(inputName(customName)), true);
          toast("请输入自定义贷款期限");
        }
        return 0;
      }
    }
    return months;
  }
  function showModes(groupSel, key) {
    $$(groupSel).forEach(function (box) {
      box.style.display = box.getAttribute("data-mode") === key ? "block" : "none";
    });
  }
  function bindRadios(name, groupSel, cb) {
    $$(inputName(name)).forEach(function (el) {
      el.addEventListener("change", function () {
        if (groupSel) showModes(groupSel, el.value);
        if (cb) cb(el.value);
      });
    });
    var cur = checked(name);
    if (cur && groupSel) showModes(groupSel, cur);
  }
  function bindPeriod(selectName, customName) {
    var sel = $(inputName(selectName));
    var custom = $(inputName(customName));
    if (!sel) return;
    function sync() {
      var on = sel.value === "0";
      if (custom) custom.style.display = on ? "inline-block" : "none";
    }
    sel.addEventListener("change", sync);
    sync();
  }
  function moneyTip(input) {
    var tip = input.parentElement && input.parentElement.querySelector(".field-tip");
    if (!tip) {
      var wrap = input.closest(".field-wrapper, .input-content, .field-row");
      tip = wrap && wrap.parentElement && wrap.parentElement.querySelector(".field-tip");
    }
    if (!tip) return;
    var n = parseFloat(input.value);
    tip.textContent = n > 0 ? wan(n) : "";
  }
  function fillBox(box, summary, extra) {
    extra = extra || {};
    if (!box || !summary) return;
    var map = {
      result_loanAmount: money(summary.principal),
      result_loanPeriod: String(summary.months),
      result_loanRate: String(C.round2(summary.annualRate)),
      result_currentPay: money(summary.currentPay),
      result_periodDecrease: money(summary.periodDecrease),
      result_lastPay: money(summary.lastPay),
      result_totalInterest: money(summary.totalInterest),
      result_totalPay: money(summary.totalPay),
      result_diffInterest: extra.diffInterest != null ? money(extra.diffInterest) : "",
      result_loanMethod: extra.method || methodName(summary.type)
    };
    Object.keys(map).forEach(function (k) {
      var el = $(inputName(k), box);
      if (el && map[k] !== "") el.value = map[k];
    });
    var tp = $(".totalPay", box);
    var tc = $(".totalCost", box);
    var ti = $(".totalInterest", box);
    var ly = $(".loanPeriod", box);
    if (tp) tp.textContent = wan(summary.totalPay);
    if (tc) tc.textContent = wan(summary.principal);
    if (ti) ti.textContent = wan(summary.totalInterest);
    if (ly) ly.textContent = yearText(summary.months);
    var costBar = $(".bar-cost", box);
    var intBar = $(".bar-interest", box);
    if (costBar && summary.totalPay) {
      costBar.style.width = Math.max(8, summary.principal / summary.totalPay * 100) + "%";
    }
    if (intBar && summary.totalPay) {
      intBar.style.width = Math.max(8, summary.totalInterest / summary.totalPay * 100) + "%";
    }
  }
  function clearResults() {
    $$('.result input[readonly]').forEach(function (el) { el.value = ""; });
    $$(".summary-box .value").forEach(function (el) {
      el.textContent = el.classList.contains("loanPeriod") ? "?年" : "?万";
    });
    $$(".bar-cost, .bar-interest").forEach(function (el) { el.style.width = "50%"; });
    store = {};
  }
  function openDetail(title, summary) {
    if (!summary || !summary.schedule) {
      toast("请先计算后再查看月供明细");
      return;
    }
    var mask = $(".detail-mask");
    if (!mask) {
      mask = document.createElement("div");
      mask.className = "detail-mask";
      mask.innerHTML = '<div class="detail-dialog"><div class="d-hd"><h3></h3><button type="button">关闭</button></div><div class="d-bd"></div></div>';
      document.body.appendChild(mask);
      mask.addEventListener("click", function (e) {
        if (e.target === mask) mask.classList.remove("show");
      });
      $("button", mask).addEventListener("click", function () { mask.classList.remove("show"); });
    }
    $("h3", mask).textContent = title || "月供明细";
    var rows = summary.schedule.map(function (row) {
      return "<tr><td>" + row.index + "</td><td>" + (row.date || "-") + "</td><td>" + money(row.pay) + "</td><td>" + money(row.cost) + "</td><td>" + money(row.interest) + "</td><td>" + money(row.remain) + "</td></tr>";
    }).join("");
    $(".d-bd", mask).innerHTML =
      '<p class="d-sum">贷款' + money(summary.principal) + "元，利率" + C.round2(summary.annualRate) + "%，共" + summary.months + "期，还款总额" + money(summary.totalPay) + "元，利息" + money(summary.totalInterest) + "元。</p>" +
      "<table><thead><tr><th>期数</th><th>还款月份</th><th>月供（元）</th><th>本金（元）</th><th>利息（元）</th><th>剩余本金（元）</th></tr></thead><tbody>" + rows + "</tbody></table>";
    mask.classList.add("show");
  }

  function lprBase(months) { return months > 60 ? RATES.lpr5 : RATES.lpr1; }
  function oldBase(months) {
    if (months <= 12) return RATES.old1;
    if (months <= 60) return RATES.old5;
    return RATES.oldLong;
  }
  function pflRate(kind, months) {
    if (kind === "pfl2") return months <= 60 ? RATES.pfl2Short : RATES.pfl2Long;
    return months <= 60 ? RATES.pfl1Short : RATES.pfl1Long;
  }

  function commercialAmount() {
    var mode = checked("computeMode") || "loan";
    if (mode === "price") {
      var area = requireNum("price_houseAcreage", "房屋面积");
      var price = requireNum("price_housePrice", "房屋单价");
      if (area == null || price == null) return null;
      var rate = num("price_firstPayRate") || RATES.firstPay;
      return area * price * (1 - rate / 100);
    }
    if (mode === "ratio") {
      var total = requireNum("ratio_houseAmount", "房屋总价");
      if (total == null) return null;
      var ratio = num("ratio_firstPayRate") || RATES.firstPay;
      return total * (1 - ratio / 100);
    }
    return requireNum("loan_loanAmount", "贷款金额");
  }

  function syncCommercialRates() {
    var months = getPeriod("loanPeriod", "customPeriod", true) || 360;
    var mode = checked("rateMode") || "lpr";
    if (mode === "lpr") {
      var baseEl = $('[name="lpr_baseRate"]');
      if (baseEl && !baseEl.dataset.locked) setVal("lpr_baseRate", lprBase(months).toFixed(2));
      var base = num("lpr_baseRate") || lprBase(months);
      var bp = Number(val("lpr_changeBP") || 0);
      setVal("lpr_loanRate", C.round2(base + bp / 100).toString());
    } else {
      var oldEl = $('[name="old_baseRate"]');
      if (oldEl && !oldEl.dataset.locked) setVal("old_baseRate", oldBase(months).toFixed(2));
      var times = parseFloat(val("old_changeTimes") || "1");
      setVal("old_loanRate", C.round2((num("old_baseRate") || oldBase(months)) * times).toString());
    }
  }

  function initCommon() {
    var bar = $(".mod-fixedbar");
    var goback = $(".goback");
    if (goback) {
      goback.addEventListener("click", function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
    function toggleBar() {
      if (bar) bar.style.display = window.scrollY > 300 ? "block" : "none";
    }
    window.addEventListener("scroll", toggleBar);
    toggleBar();

    $$(".J_formatMoney").forEach(function (el) {
      el.addEventListener("input", function () { moneyTip(el); markError(el, false); });
      el.addEventListener("blur", function () { moneyTip(el); });
    });
    $$('input[type="number"]').forEach(function (el) {
      el.addEventListener("input", function () { markError(el, false); });
    });
    $$(".J_resetPanel").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        $$('#input input[type="number"], #input input[type="text"]').forEach(function (el) {
          if (!el.readOnly) el.value = "";
        });
        $$(".field-tip").forEach(function (el) { el.textContent = ""; });
        applyDefaults();
        clearResults();
      });
    });
    $$(".J_viewDetail").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var type = btn.getAttribute("data-type");
        var item = store[type];
        var title = "月供明细";
        if (type === "linear") title = "等额本金月供明细";
        if (type === "annuity") title = "等额本息月供明细";
        if (type === "lpr") title = "商业贷款月供明细";
        if (type === "pfl") title = "公积金贷款月供明细";
        if (type === "old") title = "原合同月供明细";
        if (type === "new") title = "新合同月供明细";
        if (type === "detail") title = "综合还款明细";
        openDetail(title, item);
      });
    });
  }

  function applyDefaults() {
    $$('input[type="month"]').forEach(function (el) {
      if (!el.value) el.value = nowMonth();
    });
    if ($('[name="ratio_firstPayRate"]') && !$('[name="ratio_firstPayRate"]').value) {
      setVal("ratio_firstPayRate", String(RATES.firstPay));
    }
    if ($('[name="price_firstPayRate"]') && !$('[name="price_firstPayRate"]').value) {
      setVal("price_firstPayRate", String(RATES.firstPay));
    }
    if (page === "index.html" || page === "") {
      if ($('[name="lpr_changeBP"]') && $('[name="lpr_changeBP"]').value === "") setVal("lpr_changeBP", "0");
      syncCommercialRates();
    }
    if (page === "gongjijin.html") {
      var months = getPeriod("loanPeriod", "customPeriod", true) || 360;
      setVal("pfl_loanRate", String(pflRate(checked("rateMode") || "pfl1", months)));
    }
    if (page === "zuhedai.html") {
      var m = getPeriod("loanPeriod", "customPeriod", true) || 360;
      if (!$('[name="lpr_loanRate"]').value) setVal("lpr_loanRate", String(lprBase(m)));
      if (!$('[name="pfl_loanRate"]').value) setVal("pfl_loanRate", String(pflRate("pfl1", m)));
    }
    if (page === "zhuangxiu.html" && $('[name="loanRate"]') && !$('[name="loanRate"]').value) {
      setVal("loanRate", String(RATES.renovate));
    }
    if ((page === "huankuan.html" || page === "tiaoxi.html") && $('[name="old_loanRate"]') && !$('[name="old_loanRate"]').value) {
      setVal("old_loanRate", String(RATES.lpr5));
    }
    if (page === "tiaoxi.html" && $('[name="new_loanRate"]') && !$('[name="new_loanRate"]').value) {
      setVal("new_loanRate", "3.2");
    }
    if (page === "huankuan.html" && $('[name="new_loanRate"]') && !$('[name="new_loanRate"]').value) {
      setVal("new_loanRate", val("old_loanRate") || String(RATES.lpr5));
    }
    if (page === "fansuan.html" && $('[name="amount_loanRate"]') && !$('[name="amount_loanRate"]').value) {
      setVal("amount_loanRate", String(RATES.lpr5));
    }
    if (page === "daikuanedu.html") {
      if ($('[name="personPayRatio"]') && !$('[name="personPayRatio"]').value) setVal("personPayRatio", "12");
      if ($('[name="matePayRatio"]') && !$('[name="matePayRatio"]').value) setVal("matePayRatio", "12");
    }
  }

  function initIndex() {
    bindRadios("computeMode", ".J_computeMode");
    bindRadios("rateMode", ".J_rateMode", syncCommercialRates);
    bindPeriod("loanPeriod", "customPeriod");
    $('[name="loanPeriod"]').addEventListener("change", syncCommercialRates);
    $('[name="customPeriod"]').addEventListener("input", syncCommercialRates);
    $('[name="lpr_baseRate"]').addEventListener("input", function () {
      this.dataset.locked = "1";
      syncCommercialRates();
    });
    $('[name="lpr_changeBP"]').addEventListener("input", syncCommercialRates);
    $('[name="lpr_loanRate"]').addEventListener("input", function () {
      var base = num("lpr_baseRate");
      if (this.value !== "") setVal("lpr_changeBP", String(Math.round((num("lpr_loanRate") - base) * 100)));
    });
    $('[name="old_changeTimes"]').addEventListener("change", syncCommercialRates);
    $('[name="old_baseRate"]').addEventListener("input", function () {
      this.dataset.locked = "1";
      syncCommercialRates();
    });
    $(".J_computeLoan").addEventListener("click", function (e) {
      e.preventDefault();
      var amount = commercialAmount();
      var months = getPeriod("loanPeriod", "customPeriod");
      if (amount == null || !months) return;
      var rate = checked("rateMode") === "old" ? num("old_loanRate") : num("lpr_loanRate");
      if (rate <= 0) { toast("请输入贷款利率"); return; }
      var start = val("loanDate") || nowMonth();
      var linear = C.summarize("linear", amount, rate, months, start);
      var annuity = C.summarize("annuity", amount, rate, months, start);
      store.linear = linear;
      store.annuity = annuity;
      fillBox($('.box[data-type="linear"]'), linear, { diffInterest: annuity.totalInterest - linear.totalInterest });
      fillBox($('.box[data-type="annuity"]'), annuity, { diffInterest: 0 });
    });
  }

  function initGongjijin() {
    bindRadios("computeMode", ".J_computeMode");
    bindPeriod("loanPeriod", "customPeriod");
    function syncPfl() {
      var months = getPeriod("loanPeriod", "customPeriod") || 360;
      setVal("pfl_loanRate", String(pflRate(checked("rateMode") || "pfl1", months)));
    }
    $$(inputName("rateMode")).forEach(function (el) { el.addEventListener("change", syncPfl); });
    $('[name="loanPeriod"]').addEventListener("change", syncPfl);
    $(".J_computeLoan").addEventListener("click", function (e) {
      e.preventDefault();
      var amount = commercialAmount();
      var months = getPeriod("loanPeriod", "customPeriod");
      if (amount == null || !months) return;
      var rate = num("pfl_loanRate");
      var start = val("loanDate") || nowMonth();
      var linear = C.summarize("linear", amount, rate, months, start);
      var annuity = C.summarize("annuity", amount, rate, months, start);
      store.linear = linear;
      store.annuity = annuity;
      fillBox($('.box[data-type="linear"]'), linear, { diffInterest: annuity.totalInterest - linear.totalInterest });
      fillBox($('.box[data-type="annuity"]'), annuity, { diffInterest: 0 });
    });
  }

  function initZuhedai() {
    bindPeriod("loanPeriod", "customPeriod");
    $(".J_computeLoan").addEventListener("click", function (e) {
      e.preventDefault();
      var months = getPeriod("loanPeriod", "customPeriod");
      var lprAmt = requireNum("lpr_loanAmount", "商业贷款金额");
      var pflAmt = requireNum("pfl_loanAmount", "公积金贷款金额");
      if (!months || lprAmt == null || pflAmt == null) return;
      var start = val("loanDate") || nowMonth();
      var lpr = C.summarize(checked("lpr_loanMethod") || "linear", lprAmt, num("lpr_loanRate"), months, start);
      var pfl = C.summarize(checked("pfl_loanMethod") || "linear", pflAmt, num("pfl_loanRate"), months, start);
      store.lpr = lpr;
      store.pfl = pfl;
      fillBox($('.box[data-type="lpr"]'), lpr);
      fillBox($('.box[data-type="pfl"]'), pfl);
    });
  }

  function initZhuangxiu() {
    bindPeriod("loanPeriod", "customPeriod");
    $(".J_computeLoan").addEventListener("click", function (e) {
      e.preventDefault();
      var amount = requireNum("loanAmount", "贷款金额");
      var months = getPeriod("loanPeriod", "customPeriod");
      var rate = num("loanRate");
      if (amount == null || !months || rate <= 0) { if (rate <= 0) toast("请输入贷款利率"); return; }
      var start = val("loanDate") || nowMonth();
      var linear = C.summarize("linear", amount, rate, months, start);
      var annuity = C.summarize("annuity", amount, rate, months, start);
      store.linear = linear;
      store.annuity = annuity;
      fillBox($('.box[data-type="linear"]'), linear, { diffInterest: annuity.totalInterest - linear.totalInterest });
      fillBox($('.box[data-type="annuity"]'), annuity, { diffInterest: 0 });
    });
  }

  function mergeSchedules(paidRows, newSummary, startIndex) {
    var rows = paidRows.slice();
    newSummary.schedule.forEach(function (row, i) {
      rows.push({
        index: startIndex + i + 1,
        date: row.date,
        pay: row.pay,
        cost: row.cost,
        interest: row.interest,
        remain: row.remain
      });
    });
    return {
      type: newSummary.type,
      principal: newSummary.principal,
      annualRate: newSummary.annualRate,
      months: rows.length,
      startDate: rows[0] && rows[0].date,
      currentPay: rows[0] ? rows[0].pay : 0,
      lastPay: rows.length ? rows[rows.length - 1].pay : 0,
      periodDecrease: newSummary.periodDecrease,
      totalInterest: paidRows.reduce(function (s, r) { return s + r.interest; }, 0) + newSummary.totalInterest,
      totalPay: paidRows.reduce(function (s, r) { return s + r.pay; }, 0) + newSummary.totalPay,
      schedule: rows
    };
  }

  function initHuankuan() {
    bindPeriod("old_loanPeriod", "old_customPeriod");
    bindRadios("repay_payMethod", ".J_payMode");
    bindRadios("repay_adjustMethod", ".J_adjustMode");
    showModes(".J_adjustMode", checked("repay_adjustMethod") || "samePay");
    $('[name="old_loanRate"]').addEventListener("input", function () {
      if (!$('[name="new_loanRate"]').dataset.locked) setVal("new_loanRate", this.value);
    });
    $('[name="new_loanRate"]').addEventListener("input", function () { this.dataset.locked = "1"; });
    $(".J_computeLoan").addEventListener("click", function (e) {
      e.preventDefault();
      var amount = requireNum("old_loanAmount", "贷款金额");
      var months = getPeriod("old_loanPeriod", "old_customPeriod");
      var rate = num("old_loanRate");
      if (amount == null || !months || rate <= 0) { if (rate <= 0) toast("请输入贷款利率"); return; }
      var method = checked("old_loanMethod") || "linear";
      var start = val("old_loanDate") || nowMonth();
      var payDate = val("repay_payDate") || nowMonth();
      var oldSum = C.summarize(method, amount, rate, months, start);
      var paidMonths = Math.max(0, Math.min(months, C.monthDiff(start, payDate)));
      var sliced = C.slicePaid(oldSum, paidMonths);
      var payMethod = checked("repay_payMethod") || "part";
      var payAmount = payMethod === "all" ? sliced.remainCost : num("repay_payAmount");
      if (payMethod === "part" && payAmount <= 0) {
        toast("请输入提前还款金额");
        return;
      }
      if (payAmount > sliced.remainCost + 0.01) {
        toast("提前还款金额不能大于剩余本金");
        return;
      }
      var remainAfter = Math.max(0, sliced.remainCost - payAmount);
      var newRate = num("new_loanRate") || rate;
      var newMethod = checked("new_loanMethod") || method;
      var newMonths = sliced.remainMonths;
      var newSum;
      if (payMethod === "all" || remainAfter <= 1) {
        newSum = C.summarize(newMethod, 0.01, newRate, 1, payDate);
        newSum.principal = 0;
        newSum.currentPay = 0;
        newSum.lastPay = 0;
        newSum.totalInterest = 0;
        newSum.totalPay = 0;
        newSum.months = 0;
        newSum.schedule = [];
      } else {
        var adjust = checked("repay_adjustMethod") || "samePay";
        if (adjust === "changePeriod") {
          newMonths = parseInt(val("new_loanPeriod"), 10) || newMonths;
        } else if (adjust === "samePeriod") {
          newMonths = sliced.remainMonths;
        } else if (adjust === "changePay") {
          var targetPay = num("new_loanPay");
          if (targetPay <= 0) { toast("请输入月供金额"); return; }
          newMonths = newMethod === "annuity"
            ? C.findAnnuityMonths(remainAfter, newRate, targetPay)
            : C.findLinearMonthsByFirstPay(remainAfter, newRate, targetPay);
        } else {
          var oldRemainPay = oldSum.schedule[paidMonths] ? oldSum.schedule[paidMonths].pay : oldSum.currentPay;
          newMonths = newMethod === "annuity"
            ? C.findAnnuityMonths(remainAfter, newRate, oldRemainPay)
            : C.findLinearMonthsByFirstPay(remainAfter, newRate, oldRemainPay);
        }
        newMonths = Math.max(1, newMonths || 1);
        newSum = C.summarize(newMethod, remainAfter, newRate, newMonths, payDate);
      }
      var saved = sliced.remainCost + (oldSum.totalInterest - sliced.alreadyInterest) - payAmount - newSum.totalInterest - newSum.principal;
      var detailBox = $('.box[data-type="detail"]');
      setVal("result_loanIndex", String(sliced.paid), detailBox);
      setVal("result_alreadyPay", money(sliced.alreadyPay), detailBox);
      setVal("result_alreadyCost", money(sliced.alreadyCost), detailBox);
      setVal("result_alreadyInterest", money(sliced.alreadyInterest), detailBox);
      setVal("result_remainPay", money(remainAfter + newSum.totalInterest), detailBox);
      setVal("result_remainCost", money(remainAfter), detailBox);
      setVal("result_remainInterest", money(newSum.totalInterest), detailBox);
      setVal("result_payAmount", money(payAmount), detailBox);
      setVal("result_diffInterest", money(Math.max(0, saved)), detailBox);
      fillBox($('.box[data-type="old"]'), oldSum);
      fillBox($('.box[data-type="new"]'), newSum);
      var paidRows = oldSum.schedule.slice(0, sliced.paid);
      store.old = oldSum;
      store.new = newSum;
      store.detail = mergeSchedules(paidRows.concat([{
        index: sliced.paid + 1,
        date: payDate,
        pay: payAmount,
        cost: payAmount,
        interest: 0,
        remain: remainAfter
      }]), newSum.principal ? newSum : { schedule: [], totalInterest: 0, totalPay: 0, periodDecrease: 0, type: newMethod, principal: 0, annualRate: newRate }, sliced.paid + 1);
    });
  }

  function initTiaoxi() {
    bindPeriod("old_loanPeriod", "old_customPeriod");
    $(".J_computeLoan").addEventListener("click", function (e) {
      e.preventDefault();
      var amount = requireNum("old_loanAmount", "贷款金额");
      var months = getPeriod("old_loanPeriod", "old_customPeriod");
      var rate = num("old_loanRate");
      var newRate = num("new_loanRate");
      if (amount == null || !months || rate <= 0 || newRate <= 0) {
        if (rate <= 0 || newRate <= 0) toast("请输入变动前后利率");
        return;
      }
      var method = checked("old_loanMethod") || "linear";
      var start = val("old_loanDate") || nowMonth();
      var changeDate = val("repay_payDate") || nowMonth();
      var oldSum = C.summarize(method, amount, rate, months, start);
      var paidMonths = Math.max(0, Math.min(months, C.monthDiff(start, changeDate)));
      var sliced = C.slicePaid(oldSum, paidMonths);
      var remainMonths = Math.max(1, sliced.remainMonths);
      var newSum = C.summarize(method, sliced.remainCost, newRate, remainMonths, changeDate);
      var oldRemainInterest = oldSum.totalInterest - sliced.alreadyInterest;
      var saved = oldRemainInterest - newSum.totalInterest;
      var detailBox = $('.box[data-type="detail"]');
      setVal("result_loanIndex", String(sliced.paid), detailBox);
      setVal("result_alreadyPay", money(sliced.alreadyPay), detailBox);
      setVal("result_alreadyCost", money(sliced.alreadyCost), detailBox);
      setVal("result_alreadyInterest", money(sliced.alreadyInterest), detailBox);
      setVal("result_remainPay", money(sliced.remainCost + newSum.totalInterest), detailBox);
      setVal("result_remainCost", money(sliced.remainCost), detailBox);
      setVal("result_remainInterest", money(newSum.totalInterest), detailBox);
      setVal("result_diffInterest", money(saved), detailBox);
      fillBox($('.box[data-type="old"]'), oldSum);
      fillBox($('.box[data-type="new"]'), newSum);
      store.old = oldSum;
      store.new = newSum;
      store.detail = mergeSchedules(oldSum.schedule.slice(0, sliced.paid), newSum, sliced.paid);
    });
  }

  function initFansuan() {
    bindRadios("computeMode", ".J_computeMode");
    bindPeriod("loanPeriod", "customPeriod");
    $(".J_computeLoan").addEventListener("click", function (e) {
      e.preventDefault();
      var mode = checked("computeMode") || "amount";
      var months = getPeriod("loanPeriod", "customPeriod");
      var pmt = requireNum("monthPay", "每月还款额");
      if (!months || pmt == null) return;
      var start = val("loanDate") || nowMonth();
      var linear;
      var annuity;
      if (mode === "amount") {
        var rate = num("amount_loanRate");
        if (rate <= 0) { toast("请输入贷款利率"); return; }
        linear = C.summarize("linear", C.reverseLinearPrincipal(pmt, rate, months), rate, months, start);
        annuity = C.summarize("annuity", C.reverseAnnuityPrincipal(pmt, rate, months), rate, months, start);
      } else {
        var amount = requireNum("rate_loanAmount", "贷款金额");
        if (amount == null) return;
        linear = C.summarize("linear", amount, C.reverseLinearRate(pmt, amount, months), months, start);
        annuity = C.summarize("annuity", amount, C.reverseAnnuityRate(pmt, amount, months), months, start);
      }
      store.linear = linear;
      store.annuity = annuity;
      fillBox($('.box[data-type="linear"]'), linear, { diffInterest: Math.max(0, annuity.totalInterest - linear.totalInterest) });
      fillBox($('.box[data-type="annuity"]'), annuity, { diffInterest: 0 });
    });
  }

  function deedTax(amount, acreage, count) {
    var large = acreage > 140;
    if (count >= 3) return amount * 0.03;
    if (count === 2) return amount * (large ? 0.02 : 0.01);
    return amount * (large ? 0.015 : 0.01);
  }
  function stampTax(amount) { return amount * 0.0005; }
  function fixFund(acreage, houseType) {
    var unit = 50;
    if (houseType === "2") unit = 70;
    if (houseType === "3") unit = 85;
    return acreage * unit;
  }
  function vatTax(amount, origin, period, ordinary) {
    if (period === "1") return amount / 1.05 * 0.05 * 1.12;
    if (ordinary) return 0;
    var base = Math.max(0, amount - origin);
    return base / 1.05 * 0.05 * 1.12;
  }
  function incomeTax(amount, origin, only, period, mode) {
    if (only === "1" && period === "3") return 0;
    if (mode === "diff") return Math.max(0, amount - origin) * 0.2;
    return amount * 0.01;
  }

  function initShuifei() {
    bindRadios("houseMode", ".J_houseMode");
    $(".J_computeFee").addEventListener("click", function (e) {
      e.preventDefault();
      var mode = checked("houseMode") || "new";
      var box = $(".box");
      if (mode === "new") {
        var area = requireNum("new_houseAcreage", "房屋面积");
        var amount = requireNum("new_houseAmount", "房屋总价");
        if (area == null || amount == null) return;
        var count = parseInt(checked("new_houseCount") || "1", 10);
        var type = checked("new_houseType") || "1";
        var deed = deedTax(amount, area, count);
        var stamp = stampTax(amount);
        var fix = fixFund(area, type);
        setVal("result_deedTax", money(deed), box);
        setVal("result_valueTax", money(0), box);
        setVal("result_incomeTax", money(0), box);
        setVal("result_stampTax", money(stamp), box);
        setVal("result_fixTax", money(fix), box);
        setVal("result_totalPay", money(deed + stamp + fix), box);
      } else {
        var area2 = requireNum("old_houseAcreage", "房屋面积");
        var amount2 = requireNum("old_houseAmount", "房屋总价");
        if (area2 == null || amount2 == null) return;
        var origin = num("old_houseSell");
        var count2 = parseInt(checked("old_houseCount") || "1", 10);
        var ordinary = checked("old_houseType") === "1";
        var only = checked("old_houseOnly") || "0";
        var period = checked("old_housePeriod") || "1";
        var taxMode = checked("old_taxMode") || "total";
        var deed2 = deedTax(amount2, area2, count2);
        var stamp2 = stampTax(amount2);
        var vat = vatTax(amount2, origin, period, ordinary);
        var income = incomeTax(amount2, origin, only, period, taxMode);
        setVal("result_deedTax", money(deed2), box);
        setVal("result_valueTax", money(vat), box);
        setVal("result_incomeTax", money(income), box);
        setVal("result_stampTax", money(stamp2), box);
        setVal("result_fixTax", money(0), box);
        setVal("result_totalPay", money(deed2 + stamp2 + vat + income), box);
      }
    });
  }

  function initPinggu() {
    bindPeriod("loanPeriod", "customPeriod");
    $(".J_computeFee").addEventListener("click", function (e) {
      e.preventDefault();
      var first = requireNum("firstPay", "现有购房资金");
      var monthPay = requireNum("monthPay", "每月购房支出");
      var months = getPeriod("loanPeriod", "customPeriod");
      var area = requireNum("houseAcreage", "计划购房面积");
      if (first == null || monthPay == null || !months || area == null) return;
      var loan = C.reverseAnnuityPrincipal(monthPay, RATES.lpr5, months);
      var amount = first + loan;
      var box = $(".box");
      setVal("result_houseAmount", money(amount), box);
      setVal("result_housePrice", money(amount / area), box);
      setVal("result_deedTax", money(deedTax(amount, area, 1)), box);
      setVal("result_stampTax", money(stampTax(amount)), box);
      setVal("result_fixTax", money(fixFund(area, "2")), box);
    });
  }

  function initDaikuanedu() {
    bindPeriod("loanPeriod", "customPeriod");
    $(".J_computeFee").addEventListener("click", function (e) {
      e.preventDefault();
      var personPay = requireNum("personPayAmount", "个人月缴存金额");
      var personRatio = num("personPayRatio");
      if (personPay == null) return;
      if (personRatio <= 0) { toast("请输入月缴存比例"); return; }
      var matePay = num("matePayAmount");
      var mateRatio = num("matePayRatio") || 12;
      var house = num("houseAmount");
      var months = getPeriod("loanPeriod", "customPeriod") || 360;
      var credit = checked("creditRate") || "other";
      var mul = credit === "aaa" ? 1.3 : credit === "aa" ? 1.15 : 1;
      var personIncome = personPay / (personRatio / 100);
      var mateIncome = matePay > 0 ? matePay / (mateRatio / 100) : 0;
      var familyIncome = personIncome + mateIncome;
      var perWan = C.annuityPayment(10000, months <= 60 ? RATES.pfl1Short : RATES.pfl1Long, months);
      var quotaA = perWan > 0 ? Math.min(800000, (familyIncome - 400) / perWan * 10000) : 0;
      if (quotaA < 0) quotaA = 0;
      var quotaB = quotaA * mul;
      var quota = quotaB;
      if (house > 0) {
        var cap = house * (checked("houseType") === "policy" ? 0.9 : 0.95);
        quota = Math.min(quotaB, cap);
      }
      setVal("result_maxPayAmount", money(quota));
    });
  }

  initCommon();
  applyDefaults();
  if (page === "index.html" || page === "") initIndex();
  else if (page === "gongjijin.html") initGongjijin();
  else if (page === "zuhedai.html") initZuhedai();
  else if (page === "zhuangxiu.html") initZhuangxiu();
  else if (page === "huankuan.html") initHuankuan();
  else if (page === "tiaoxi.html") initTiaoxi();
  else if (page === "fansuan.html") initFansuan();
  else if (page === "shuifei.html") initShuifei();
  else if (page === "pinggu.html") initPinggu();
  else if (page === "daikuanedu.html") initDaikuanedu();
})();
