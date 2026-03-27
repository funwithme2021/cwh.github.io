(function () {
  if (window.RailStationQueryCommon) return;

  function parseTimeValue(timeText) {
    const match = String(timeText || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return hour * 60 + minute;
  }

  function getTrainNoSortValue(trainNo) {
    const digits = String(trainNo || "").match(/\d+/g);
    if (!digits || !digits.length) return Number.POSITIVE_INFINITY;
    const value = Number(digits.join(""));
    return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
  }

  function formatDateStr(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function addDays(dateStr, dayOffset) {
    const [year, month, day] = String(dateStr || "").split("-").map((value) => Number(value) || 0);
    const date = new Date(year, Math.max(0, month - 1), day || 1, 0, 0, 0, 0);
    date.setDate(date.getDate() + (Number(dayOffset) || 0));
    return formatDateStr(date);
  }

  function defaultSplitArrDep(stopRow) {
    const first = stopRow?.[1] || "";
    const second = stopRow?.[2] || "";
    if (!second) return { arr: first, dep: first };
    if (!first) return { arr: second, dep: second };
    const firstMinute = parseTimeValue(first);
    const secondMinute = parseTimeValue(second);
    if (firstMinute === null || secondMinute === null) return { arr: first, dep: second };
    if (secondMinute <= firstMinute) return { arr: second, dep: first };
    return { arr: first, dep: second };
  }

  function buildAbsoluteStopRows(stopRows, splitArrDep) {
    let previousAbsoluteMinute = null;
    return (stopRows || []).map((stopRow) => {
      const stop = Array.isArray(stopRow)
        ? { name: stopRow[0] || "", arr: stopRow[1] || "", dep: stopRow[2] || "" }
        : {
            name: stopRow?.name || "",
            arr: stopRow?.arr || stopRow?.arrival || "",
            dep: stopRow?.dep || stopRow?.departure || "",
          };
      const arrText = splitArrDep([stop.name, stop.arr, stop.dep]).arr || "";
      const depText = splitArrDep([stop.name, stop.arr, stop.dep]).dep || "";
      const resolveAbsoluteMinute = (timeText) => {
        const rawMinute = parseTimeValue(timeText);
        if (rawMinute === null) return null;
        let absoluteMinute = rawMinute;
        while (previousAbsoluteMinute !== null && absoluteMinute < previousAbsoluteMinute) {
          absoluteMinute += 1440;
        }
        previousAbsoluteMinute = absoluteMinute;
        return absoluteMinute;
      };
      return {
        name: stop.name,
        arrText,
        depText,
        arrAbsMin: resolveAbsoluteMinute(arrText),
        depAbsMin: resolveAbsoluteMinute(depText),
      };
    });
  }

  function getStopDateStr(originDateStr, absoluteMinute) {
    if (!originDateStr || !Number.isFinite(absoluteMinute)) return "";
    return addDays(originDateStr, Math.floor(absoluteMinute / 1440));
  }

  function buildTraStationRowsFromInstances(options) {
    const scheduleItems = Array.isArray(options?.scheduleItems) ? options.scheduleItems : [];
    const stationName = String(options?.stationName || "").trim();
    const directionValue = String(options?.directionValue || "").trim();
    const queryDateStr = String(options?.queryDateStr || "").trim();
    const splitArrDep = typeof options?.splitArrDep === "function" ? options.splitArrDep : defaultSplitArrDep;
    const buildAbsMinutes = typeof options?.buildAbsMinutes === "function"
      ? options.buildAbsMinutes
      : (stopRows) => buildAbsoluteStopRows(stopRows, splitArrDep).map((stop) => ({ abs: stop.depAbsMin ?? stop.arrAbsMin }));
    const isEvenTrainNo = typeof options?.isEvenTrainNo === "function" ? options.isEvenTrainNo : (() => null);
    const resolveStopDate = typeof options?.getStopDateStr === "function" ? options.getStopDateStr : getStopDateStr;
    const getTrainStatusLabel = typeof options?.getTrainStatusLabel === "function" ? options.getTrainStatusLabel : (() => "");
    const getAdjustedTime = typeof options?.getAdjustedTime === "function" ? options.getAdjustedTime : null;
    const renderTimeWithDelay = typeof options?.renderTimeWithDelay === "function" ? options.renderTimeWithDelay : null;
    const rows = [];

    scheduleItems.forEach((item) => {
      const trainNo = String(item?.trainNo || "").trim();
      const originDate = String(item?.originDate || "").trim();
      const data = item?.data || {};
      const type = data["車種"] || data.type || "列車";
      const stopRows = Array.isArray(data["車站時間"]) ? data["車站時間"] : [];
      if (!stopRows.length) return;

      const stopIndex = stopRows.findIndex((stopRow) => String(stopRow?.[0] || "").trim() === stationName);
      if (stopIndex < 0) return;

      const isEven = isEvenTrainNo(trainNo);
      if (directionValue === "even" && isEven !== true) return;
      if (directionValue === "odd" && isEven !== false) return;

      const absoluteMinutes = buildAbsMinutes(stopRows) || [];
      const stopAbsMinute = Number.isFinite(absoluteMinutes?.[stopIndex]?.abs) ? absoluteMinutes[stopIndex].abs : null;
      if (!Number.isFinite(stopAbsMinute)) return;

      const stopDateStr = resolveStopDate(originDate, stopAbsMinute);
      if (queryDateStr && stopDateStr !== queryDateStr) return;

      const absoluteStops = buildAbsoluteStopRows(stopRows, splitArrDep);
      const stop = absoluteStops[stopIndex] || {};
      const depText = stop.depText || stop.arrText || "--";
      const destination = String(stopRows[stopRows.length - 1]?.[0] || "").trim();
      const range = stopRows.length >= 2 ? `${stopRows[0][0]}➝${destination}` : "";
      const firstTime = stopRows[0]?.[2] || stopRows[0]?.[1] || "";
      const lastStop = stopRows[stopRows.length - 1] || [];
      const lastTime = lastStop[1] || lastStop[2] || "";
      const status = getTrainStatusLabel(trainNo, originDate, firstTime, lastTime, stopAbsMinute);
      const adjustedTime = getAdjustedTime ? (getAdjustedTime(trainNo, depText, queryDateStr, stopAbsMinute, originDate) || null) : null;
      const depHTML = renderTimeWithDelay
        ? renderTimeWithDelay(trainNo, depText, queryDateStr, { suppressStrike: status === "已過站" }, stopAbsMinute, originDate)
        : depText;
      const adjustedDepAbsMin = Number.isFinite(adjustedTime?.adjAbsMin) ? adjustedTime.adjAbsMin : stopAbsMinute;

      rows.push({
        trainNo,
        originDate,
        type,
        range,
        destination,
        dep: depText,
        depHTML,
        depAbsMin: stop.depAbsMin ?? stop.arrAbsMin ?? stopAbsMinute,
        arrAbsMin: stop.arrAbsMin ?? stop.depAbsMin ?? stopAbsMinute,
        depDateStr: stopDateStr,
        status,
        adjustedDepText: adjustedTime?.adj || depText,
        adjustedDepAbsMin,
        sortAbsMin: status === "已過站" ? stopAbsMinute : adjustedDepAbsMin,
        hasDelay: !!adjustedTime?.hasDelay,
        afterStops: absoluteStops.slice(stopIndex + 1).map((nextStop) => nextStop.name).filter(Boolean),
      });
    });

    return rows.sort(
      (a, b) =>
        a.sortAbsMin - b.sortAbsMin ||
        a.depAbsMin - b.depAbsMin ||
        getTrainNoSortValue(a.trainNo) - getTrainNoSortValue(b.trainNo) ||
        String(a.trainNo || "").localeCompare(String(b.trainNo || ""), "en")
    );
  }

  function buildTraStationRowsFromDatasets(options) {
    const sources = Array.isArray(options?.sources) ? options.sources : [];
    const scheduleItems = sources.flatMap((source) =>
      (source?.dataset || []).map((train) => ({
        trainNo: train?.trainNo || "",
        originDate: source?.originDate || "",
        data: {
          "車種": train?.type || "列車",
          "車站時間": (train?.stops || []).map((stop) => [stop?.name || "", stop?.arr || "", stop?.dep || ""]),
        },
      }))
    );
    return buildTraStationRowsFromInstances({ ...options, scheduleItems });
  }

  function resolveThsrDirection(firstStation, lastStation, thsrStationIndex) {
    const firstIndex = typeof thsrStationIndex === "function" ? thsrStationIndex(firstStation) : -1;
    const lastIndex = typeof thsrStationIndex === "function" ? thsrStationIndex(lastStation) : -1;
    if (firstIndex >= 0 && lastIndex >= 0 && firstIndex !== lastIndex) {
      return firstIndex < lastIndex ? "south" : "north";
    }
    if (firstStation && lastStation) {
      return firstStation.localeCompare(lastStation, "zh-Hant") < 0 ? "south" : "north";
    }
    return "";
  }

  function buildThsrStationRowsFromSources(options) {
    const sources = Array.isArray(options?.sources) ? options.sources : [];
    const stationName = String(options?.stationName || "").trim();
    const directionValue = String(options?.directionValue || "").trim();
    const queryDateStr = String(options?.queryDateStr || "").trim();
    const splitArrDep = typeof options?.splitArrDep === "function" ? options.splitArrDep : defaultSplitArrDep;
    const stopDisplayDate = typeof options?.stopDisplayDate === "function"
      ? options.stopDisplayDate
      : (originDateStr, stopRows, stopIndex) => getStopDateStr(originDateStr, buildAbsoluteStopRows(stopRows, splitArrDep)[stopIndex]?.depAbsMin ?? 0);
    const getStatusLabel = typeof options?.getStatusLabel === "function" ? options.getStatusLabel : (() => "");
    const thsrStationIndex = typeof options?.thsrStationIndex === "function" ? options.thsrStationIndex : (() => -1);
    const sameStation = typeof options?.sameStation === "function"
      ? options.sameStation
      : ((left, right) => String(left || "").trim() === String(right || "").trim());
    const rows = [];

    sources.forEach((source) => {
      const originDate = String(source?.origin || source?.originDate || "").trim();
      const scheduleMap = source?.map || source?.scheduleMap || {};
      Object.keys(scheduleMap || {}).forEach((trainNo) => {
        const data = scheduleMap[trainNo] || {};
        const stopRows = Array.isArray(data["車站時間"]) ? data["車站時間"] : [];
        if (!stopRows.length) return;

        const stopIndex = stopRows.findIndex((stopRow) => sameStation(stopRow?.[0], stationName));
        if (stopIndex < 0) return;

        const stopDateStr = stopDisplayDate(originDate, stopRows, stopIndex);
        if (queryDateStr && stopDateStr !== queryDateStr) return;

        const firstStation = String(stopRows[0]?.[0] || "").trim();
        const lastStation = String(stopRows[stopRows.length - 1]?.[0] || "").trim();
        const directionKey = resolveThsrDirection(firstStation, lastStation, thsrStationIndex);
        if (directionValue === "south" && directionKey !== "south") return;
        if (directionValue === "north" && directionKey !== "north") return;

        const absoluteStops = buildAbsoluteStopRows(stopRows, splitArrDep);
        const stop = absoluteStops[stopIndex] || {};
        const depText = stop.depText || stop.arrText || "";
        const lastStopTimes = splitArrDep(stopRows[stopRows.length - 1] || []);
        const firstStopTimes = splitArrDep(stopRows[0] || []);
        rows.push({
          trainNo: String(trainNo || "").trim(),
          originDate,
          type: data["車種"] || data.type || "高鐵",
          range: firstStation && lastStation ? `${firstStation}➝${lastStation}` : "",
          destination: lastStation,
          dep: depText,
          depHTML: depText || "--",
          depAbsMin: stop.depAbsMin ?? stop.arrAbsMin ?? null,
          arrAbsMin: stop.arrAbsMin ?? stop.depAbsMin ?? null,
          depDateStr: stopDateStr,
          directionKey,
          status: getStatusLabel(originDate, depText, lastStopTimes.arr || lastStopTimes.dep || "", firstStopTimes.dep || "", "list"),
          sortAbsMin: stop.depAbsMin ?? stop.arrAbsMin ?? Number.POSITIVE_INFINITY,
          afterStops: absoluteStops.slice(stopIndex + 1).map((nextStop) => nextStop.name).filter(Boolean),
        });
      });
    });

    return rows.sort(
      (a, b) =>
        a.sortAbsMin - b.sortAbsMin ||
        getTrainNoSortValue(a.trainNo) - getTrainNoSortValue(b.trainNo) ||
        String(a.trainNo || "").localeCompare(String(b.trainNo || ""), "en")
    );
  }

  function buildThsrStationRowsFromDatasets(options) {
    const sources = Array.isArray(options?.sources) ? options.sources : [];
    const mappedSources = sources.map((source) => {
      const scheduleMap = {};
      (source?.dataset || []).forEach((train) => {
        scheduleMap[String(train?.trainNo || "").trim()] = {
          "車種": train?.type || "高鐵",
          "車站時間": (train?.stops || []).map((stop) => [stop?.name || "", stop?.arr || "", stop?.dep || ""]),
        };
      });
      return {
        origin: source?.originDate || source?.origin || "",
        map: scheduleMap,
      };
    });
    return buildThsrStationRowsFromSources({ ...options, sources: mappedSources });
  }

  window.RailStationQueryCommon = {
    buildTraStationRowsFromInstances,
    buildTraStationRowsFromDatasets,
    buildThsrStationRowsFromSources,
    buildThsrStationRowsFromDatasets,
    getTrainNoSortValue,
    parseTimeValue,
  };
})();
