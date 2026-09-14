(function (global) {
  function round2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  }

  function monthRate(annualRate) {
    return Number(annualRate) / 100 / 12;
  }

  function addMonths(dateStr, offset) {
    if (!dateStr) return "";
    var parts = String(dateStr).split("-");
    var y = Number(parts[0]);
    var m = Number(parts[1]) - 1 + offset;
    var d = new Date(y, m, 1);
    var mm = String(d.getMonth() + 1);
    if (mm.length < 2) mm = "0" + mm;
    return d.getFullYear() + "-" + mm;
  }

  function monthDiff(fromStr, toStr) {
    if (!fromStr || !toStr) return 0;
    var a = String(fromStr).split("-");
    var b = String(toStr).split("-");
    return (Number(b[0]) - Number(a[0])) * 12 + (Number(b[1]) - Number(a[1]));
  }

  function annuityPayment(principal, annualRate, months) {
    var r = monthRate(annualRate);
    if (!months || months <= 0) return 0;
    if (r === 0) return principal / months;
    return principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
  }

  function linearFirstPay(principal, annualRate, months) {
    var r = monthRate(annualRate);
    return principal / months + principal * r;
  }

  function linearDecrease(principal, annualRate, months) {
    return (principal / months) * monthRate(annualRate);
  }

  function linearTotalInterest(principal, annualRate, months) {
    return principal * monthRate(annualRate) * (months + 1) / 2;
  }

  function buildLinearSchedule(principal, annualRate, months, startDate) {
    var r = monthRate(annualRate);
    var base = principal / months;
    var remain = principal;
    var rows = [];
    for (var i = 1; i <= months; i++) {
      var interest = remain * r;
      var cost = i === months ? remain : base;
      var pay = cost + interest;
      remain = Math.max(0, remain - cost);
      rows.push({
        index: i,
        date: addMonths(startDate, i - 1),
        pay: pay,
        cost: cost,
        interest: interest,
        remain: remain
      });
    }
    return rows;
  }

  function buildAnnuitySchedule(principal, annualRate, months, startDate) {
    var r = monthRate(annualRate);
    var pmt = annuityPayment(principal, annualRate, months);
    var remain = principal;
    var rows = [];
    for (var i = 1; i <= months; i++) {
      var interest = remain * r;
      var cost = i === months ? remain : pmt - interest;
      if (cost > remain) cost = remain;
      var pay = i === months ? remain + interest : pmt;
      remain = Math.max(0, remain - cost);
      rows.push({
        index: i,
        date: addMonths(startDate, i - 1),
        pay: pay,
        cost: cost,
        interest: interest,
        remain: remain
      });
    }
    return rows;
  }

  function summarize(type, principal, annualRate, months, startDate) {
    var schedule = type === "annuity"
      ? buildAnnuitySchedule(principal, annualRate, months, startDate)
      : buildLinearSchedule(principal, annualRate, months, startDate);
    var totalInterest = type === "annuity"
      ? annuityPayment(principal, annualRate, months) * months - principal
      : linearTotalInterest(principal, annualRate, months);
    var totalPay = principal + totalInterest;
    var first = schedule[0] || { pay: 0 };
    var last = schedule[schedule.length - 1] || { pay: 0 };
    return {
      type: type,
      principal: principal,
      annualRate: annualRate,
      months: months,
      startDate: startDate,
      currentPay: first.pay,
      lastPay: last.pay,
      periodDecrease: type === "linear" ? linearDecrease(principal, annualRate, months) : 0,
      totalInterest: totalInterest,
      totalPay: totalPay,
      schedule: schedule
    };
  }

  function slicePaid(summary, paidMonths) {
    var paid = Math.max(0, Math.min(paidMonths, summary.months));
    var alreadyCost = 0;
    var alreadyInterest = 0;
    var remainCost = summary.principal;
    if (paid > 0) {
      for (var i = 0; i < paid; i++) {
        alreadyCost += summary.schedule[i].cost;
        alreadyInterest += summary.schedule[i].interest;
      }
      remainCost = summary.schedule[paid - 1].remain;
    }
    return {
      paid: paid,
      alreadyCost: alreadyCost,
      alreadyInterest: alreadyInterest,
      alreadyPay: alreadyCost + alreadyInterest,
      remainCost: remainCost,
      remainMonths: summary.months - paid
    };
  }

  function reverseAnnuityPrincipal(pmt, annualRate, months) {
    var r = monthRate(annualRate);
    if (!months || !pmt) return 0;
    if (r === 0) return pmt * months;
    return pmt * (1 - Math.pow(1 + r, -months)) / r;
  }

  function reverseLinearPrincipal(firstPay, annualRate, months) {
    var r = monthRate(annualRate);
    return firstPay / (1 / months + r);
  }

  function reverseLinearRate(firstPay, principal, months) {
    if (!principal) return 0;
    var monthly = (firstPay - principal / months) / principal;
    return monthly * 12 * 100;
  }

  function reverseAnnuityRate(pmt, principal, months) {
    if (pmt * months <= principal) return 0;
    var low = 0;
    var high = 1;
    for (var i = 0; i < 80; i++) {
      var mid = (low + high) / 2;
      var guess = mid === 0 ? principal / months : principal * mid * Math.pow(1 + mid, months) / (Math.pow(1 + mid, months) - 1);
      if (guess > pmt) high = mid;
      else low = mid;
    }
    return ((low + high) / 2) * 12 * 100;
  }

  function findAnnuityMonths(principal, annualRate, pmt) {
    var r = monthRate(annualRate);
    if (pmt <= principal * r) return 0;
    if (r === 0) return Math.ceil(principal / pmt);
    var n = Math.log(pmt / (pmt - principal * r)) / Math.log(1 + r);
    return Math.max(1, Math.ceil(n - 1e-8));
  }

  function findLinearMonthsByFirstPay(principal, annualRate, firstPay) {
    var r = monthRate(annualRate);
    var months = principal / (firstPay - principal * r);
    return Math.max(1, Math.round(months));
  }

  global.LoanCalc = {
    round2: round2,
    monthRate: monthRate,
    addMonths: addMonths,
    monthDiff: monthDiff,
    annuityPayment: annuityPayment,
    linearFirstPay: linearFirstPay,
    linearDecrease: linearDecrease,
    linearTotalInterest: linearTotalInterest,
    buildLinearSchedule: buildLinearSchedule,
    buildAnnuitySchedule: buildAnnuitySchedule,
    summarize: summarize,
    slicePaid: slicePaid,
    reverseAnnuityPrincipal: reverseAnnuityPrincipal,
    reverseLinearPrincipal: reverseLinearPrincipal,
    reverseLinearRate: reverseLinearRate,
    reverseAnnuityRate: reverseAnnuityRate,
    findAnnuityMonths: findAnnuityMonths,
    findLinearMonthsByFirstPay: findLinearMonthsByFirstPay
  };
})(window);
