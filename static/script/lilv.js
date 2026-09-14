(function () {
  var data = [
    { date: "2019-08", y1: 4.25, y5: 4.85 },
    { date: "2020-02", y1: 4.05, y5: 4.75 },
    { date: "2020-04", y1: 3.85, y5: 4.65 },
    { date: "2021-12", y1: 3.80, y5: 4.65 },
    { date: "2022-01", y1: 3.70, y5: 4.60 },
    { date: "2022-05", y1: 3.70, y5: 4.45 },
    { date: "2022-08", y1: 3.65, y5: 4.30 },
    { date: "2023-06", y1: 3.55, y5: 4.20 },
    { date: "2023-08", y1: 3.45, y5: 4.20 },
    { date: "2024-02", y1: 3.45, y5: 3.95 },
    { date: "2024-07", y1: 3.35, y5: 3.85 },
    { date: "2024-10", y1: 3.10, y5: 3.60 },
    { date: "2025-05", y1: 3.00, y5: 3.50 },
    { date: "2026-08", y1: 3.00, y5: 3.50 }
  ];

  function draw() {
    var box = document.getElementById("myChart");
    if (!box) return;
    box.innerHTML = "";
    var canvas = document.createElement("canvas");
    var width = Math.max(box.clientWidth || 640, 320);
    var height = 360;
    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.style.width = "100%";
    canvas.style.height = height + "px";
    box.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    ctx.scale(2, 2);
    var pad = { l: 48, r: 18, t: 28, b: 46 };
    var w = width - pad.l - pad.r;
    var h = height - pad.t - pad.b;
    var min = 2.8;
    var max = 5.0;
    function x(i) { return pad.l + w * i / (data.length - 1); }
    function y(v) { return pad.t + h * (1 - (v - min) / (max - min)); }

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#e8eef4";
    ctx.lineWidth = 1;
    ctx.font = "12px Microsoft Yahei, Arial";
    ctx.fillStyle = "#8a96a3";
    for (var g = 0; g <= 4; g++) {
      var gv = min + (max - min) * g / 4;
      var gy = y(gv);
      ctx.beginPath();
      ctx.moveTo(pad.l, gy);
      ctx.lineTo(width - pad.r, gy);
      ctx.stroke();
      ctx.fillText(gv.toFixed(2) + "%", 8, gy + 4);
    }
    data.forEach(function (d, i) {
      if (i % 2 === 0 || i === data.length - 1) {
        ctx.save();
        ctx.translate(x(i), height - 16);
        ctx.rotate(-Math.PI / 6);
        ctx.fillText(d.date, -18, 0);
        ctx.restore();
      }
    });

    function line(key, color) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      data.forEach(function (d, i) {
        var px = x(i);
        var py = y(d[key]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      data.forEach(function (d, i) {
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(x(i), y(d[key]), 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    line("y1", "#2095f2");
    line("y5", "#f56954");

    ctx.font = "13px Microsoft Yahei, Arial";
    ctx.fillStyle = "#2095f2";
    ctx.fillRect(width - 168, 12, 10, 10);
    ctx.fillStyle = "#546d7e";
    ctx.fillText("1年期 LPR", width - 152, 21);
    ctx.fillStyle = "#f56954";
    ctx.fillRect(width - 80, 12, 10, 10);
    ctx.fillStyle = "#546d7e";
    ctx.fillText("5年期以上", width - 64, 21);
  }

  var bar = document.querySelector(".mod-fixedbar");
  var goback = document.querySelector(".goback");
  if (goback) {
    goback.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  window.addEventListener("scroll", function () {
    if (bar) bar.style.display = window.scrollY > 300 ? "block" : "none";
  });
  draw();
  window.addEventListener("resize", draw);
})();
