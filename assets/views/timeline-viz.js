// 墨述 · 时间线可视化 v2
// ═══════════════════════════════════════════════════════════════════════
// 纵向时间轴 + 事件卡片，纯 HTML/CSS，无外部依赖
// 替代原 Canvas 甘特图

var _timelineVizData = null;

function renderTimelineViz(projectId, data, chapters) {
  var container = document.getElementById('timelineVizContainer');
  if (!container) return;

  var parsed = parseTimelineData(data, chapters);
  if (!parsed.events.length && !parsed.fuzzyEvents.length) {
    container.innerHTML = '<div class="empty-state" style="height:300px"><div class="title" style="font-size:14px">暂无时间线事件</div><div class="desc" style="font-size:12px;color:var(--text-muted)">请在结构管理中添加时间线事件</div></div>';
    return;
  }

  _timelineVizData = parsed;

  // 按日期排序（最近在前）
  var events = parsed.events.slice().sort(function(a, b) {
    return b.dateObj.getTime() - a.dateObj.getTime();
  });

  // 模糊事件附在末尾
  if (parsed.fuzzyEvents.length > 0) {
    parsed.fuzzyEvents.forEach(function(e) { events.push(e); });
  }

  var typeColors = { core: 'var(--accent)', background: 'var(--text-muted)', branch: 'var(--warm)' };
  var typeLabels = { core: '核心', background: '背景', branch: '分支' };

  var h = '<div class="tl-viz">';
  // 图例
  h += '<div class="tl-legend">';
  Object.keys(typeLabels).forEach(function(t) {
    h += '<span class="tl-leg-item"><span class="tl-leg-dot" style="background:' + typeColors[t] + '"></span>' + typeLabels[t] + '</span>';
  });
  h += '</div>';

  // 时间轴
  h += '<div class="tl-track">';
  events.forEach(function(evt, i) {
    var isFuzzy = !evt.dateObj;
    var type = evt.eventType || 'background';
    var color = typeColors[type] || typeColors.background;
    var dateLabel = evt.date || (isFuzzy ? '时间未知' : '');

    h += '<div class="tl-event' + (evt.flashback ? ' tl-flashback' : '') + '" onclick="toggleTimelineDetail(this)">';
    // 轴上的点
    h += '<div class="tl-node">';
    h += '<span class="tl-dot" style="background:' + color + '"></span>';
    if (evt.flashback) h += '<span class="tl-flashback-mark" title="倒叙">↺</span>';
    h += '</div>';
    // 卡片
    h += '<div class="tl-card">';
    h += '<div class="tl-card-head">';
    h += '<span class="tl-card-date">' + esc(dateLabel) + '</span>';
    h += '<span class="tl-card-type" style="color:' + color + '">' + (typeLabels[type] || type) + '</span>';
    h += '</div>';
    h += '<div class="tl-card-label">' + esc(evt.label) + '</div>';
    if (evt.description) {
      h += '<div class="tl-card-desc">' + esc(evt.description).replace(/\n/g, '<br>') + '</div>';
    }
    if (evt.chapters && evt.chapters.length > 0) {
      h += '<div class="tl-card-ch"><span style="color:var(--text-muted)">关联章节：</span>';
      h += evt.chapters.map(function(c) { return '<span class="tag" style="font-size:10px">' + esc(c.title) + '</span>'; }).join(' ');
      h += '</div>';
    }
    h += '</div>';
    h += '</div>';
  });
  h += '</div>';
  h += '</div>';

  container.innerHTML = h;
}

function toggleTimelineDetail(el) {
  var card = el.querySelector('.tl-card');
  if (!card) return;
  // Toggle expanded state
  var isExpanded = card.classList.contains('expanded');
  // Collapse all
  document.querySelectorAll('.tl-card.expanded').forEach(function(c) { c.classList.remove('expanded'); });
  if (!isExpanded) card.classList.add('expanded');
}

// ── 数据解析（保留原有逻辑） ──

function parseTimelineData(timelineEvents, chapters) {
  var chapterMap = {};
  (chapters || []).forEach(function(ch, i) {
    chapterMap[ch.id] = { title: ch.title || ch.name, order: i, wordCount: ch.wordCount || 0 };
  });

  var events = (timelineEvents || []).map(function(evt) {
    var dateObj = parseDate(evt.date);
    return {
      id: evt.id,
      label: evt.label || '未命名事件',
      date: evt.date || '',
      dateObj: dateObj,
      eventType: evt.eventType || 'background',
      chapters: (evt.chapters || []).map(function(chId) {
        return chapterMap[chId] || { id: chId, title: chId, wordCount: 0 };
      }),
      chapterOrder: (evt.chapters || []).reduce(function(max, chId) {
        var ch = chapterMap[chId];
        return ch && ch.order > max ? ch.order : max;
      }, -Infinity),
      flashback: evt.flashback || false,
      description: evt.description || '',
      fuzzy: evt.fuzzy || false,
    };
  });

  var concrete = events.filter(function(e) { return e.dateObj !== null; });
  var fuzzyEvents = events.filter(function(e) { return e.dateObj === null && e.label; });

  return {
    events: concrete,
    fuzzyEvents: fuzzyEvents,
    allEvents: events,
    minDate: concrete.length ? new Date(Math.min.apply(null, concrete.map(function(e) { return e.dateObj.getTime(); }))) : new Date(),
    maxDate: concrete.length ? new Date(Math.max.apply(null, concrete.map(function(e) { return e.dateObj.getTime(); }))) : new Date(),
    chapterCount: Object.keys(chapterMap).length,
  };
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  var match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  match = dateStr.match(/^(\d{4})$/);
  if (match) return new Date(parseInt(match[1]), 0, 1);
  return null;
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
