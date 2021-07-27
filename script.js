function knmi_setup() {
  function hour(date) {
    let hour = date.getUTCHours();
    return (hour < 10 ? "0" : "") + hour;
  }
  function day(date) {
    let day = date.getUTCDate();
    return (day < 10 ? "0" : "") + day;
  }
  function month(date) {
    let month = date.getUTCMonth();
    return (month < 10 ? "0" : "") + month;
  }

  var knmi = document.getElementById("knmi");
  var img_animation = document.getElementById("animation");

  var interval,
    frameids = [],
    loaded = true,
    paused = true;

  let d = new Date();
  d.setUTCMinutes(0);
  d.setUTCSeconds(0);
  d.setUTCMilliseconds(0);
  if (d.getUTCHours() >= 14) {
    d.setUTCHours(12);
  } else if (d.getUTCHours() >= 2) {
    d.setUTCHours(0);
  } else {
    d.setUTCDate(d.getUTCDate() - 1);
    d.setUTCHours(12);
  }

  frameids.push("AL" + day(d) + hour(d) + "_large.gif");

  let offset = 0;
  for (let i = 0; i < 2; i++) {
    offset += 12;
    if (d.getUTCHours() == 0) {
      d.setUTCHours(12);
    } else if (d.getUTCHours() == 12) {
      d.setUTCDate(d.getUTCDate() + 1);
      d.setUTCHours(0);
    } else {
      throw "wrong format for hours";
    }
    frameids.push("PL" + day(d) + hour(d) + "_large.gif");
  }

  var index = frameids.length - 1;

  function nextframe() {
    if (loaded) {
      if (index == frameids.length - 1) {
        index = 0;
      } else {
        index += 1;
      }

      loaded = false;
      img_animation.src = knmi_baseurl + frameids[index];
    }
    if (img_animation.complete) {
      loaded = true;
    }
  }

  img_animation.addEventListener("load", () => {
    loaded = true;
  });
  nextframe(); //show first frame

  knmi.addEventListener("click", () => {
    if (paused) interval = setInterval(nextframe, 1500);
    else clearInterval(interval);

    paused = !paused;
  });
}

window.addEventListener("load", function () {
  let asyncIframes = document.getElementsByClassName("asyncIframe");
  Array.from(asyncIframes).map((item) => {
    item.src = item.getAttribute("data-src");
  });
});

warnWetter = {};
warnWetter.loadWarnings = function (dwd_json) {
  var dwd_warn = document.getElementById("dwd-warn");

  let alerts = dwd_json.warnings[dwd_warncellid] || [];
  let prealerts = dwd_json.vorabInformation[dwd_warncellid] || [];

  alerts = alerts
    .filter((x) => x !== undefined)
    .sort((a, b) => b.level - a.level);
  prealerts = prealerts
    .filter((x) => x !== undefined)
    .sort((a, b) => b.level - a.level);

  alerts = alerts.concat(prealerts);

  alerts.forEach((alert) => {
    let alert_div = document.createElement("div");
    alert_div.classList.add("level-" + alert.level);
    alert_div.classList.add("dwd-warn-element");

    let alert_headline = document.createElement("h3");
    alert_headline.innerText = alert.headline;
    alert_headline.classList.add("dwd-warn-headline");
    alert_div.appendChild(alert_headline);

    alert_div.appendChild(document.createElement("br"));
    let alert_date = document.createElement("strong");
    alert_date.innerText = new Date(alert.start).toLocaleString("de-DE", {
      weekday: "short",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    if (alert.end) {
      alert_date.innerText += " - ";

      if (new Date(alert.start).getDate() == new Date(alert.end).getDate()) {
        alert_date.innerText += new Date(alert.end).toLocaleString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        });
      } else {
        alert_date.innerText += new Date(alert.end).toLocaleString("de-DE", {
          weekday: "short",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }
    alert_headline.classList.add("dwd-warn-start");
    alert_div.appendChild(alert_date);

    let alert_description = document.createElement("p");
    alert_description.innerText = alert.description;
    alert_headline.classList.add("dwd-warn-description");
    alert_div.appendChild(alert_description);

    let alert_instruction = document.createElement("div");
    alert_instruction.classList.add("dwd-warn-instruction");
    let alert_instruction_id =
      "dwd-warn-instruction-" + Math.floor(Math.random() * 10000);

    let alert_instruction_input = document.createElement("input");
    alert_instruction_input.id = alert_instruction_id;
    alert_instruction_input.type = "checkbox";
    alert_instruction.appendChild(alert_instruction_input);

    let alert_instruction_label = document.createElement("label");
    alert_instruction_label.htmlFor = alert_instruction_id;
    alert_instruction.appendChild(alert_instruction_label);

    let alert_instruction_a = document.createElement("a");
    alert_instruction_a.tabindex = "0";
    alert_instruction_a.innerText = "Mögliche Gefahren anzeigen";
    alert_instruction_label.appendChild(alert_instruction_a);

    let alert_instruction_content = document.createElement("div");
    alert_instruction_content.classList.add("dwd-warn-instruction-content");

    let alert_instruction_p = document.createElement("p");
    alert_instruction_p.innerText = alert.instruction;
    alert_instruction_content.appendChild(alert_instruction_p);
    alert_instruction.appendChild(alert_instruction_content);

    alert_div.appendChild(alert_instruction);
    dwd_warn.appendChild(alert_div);
  });
};
