// PointCast project page: clips play while on screen, every clip has a
// frame scrubber, cards can swap episodes, and the BibTeX block copies.
// No external dependencies.
(function () {
  function frameOf(v) {
    var fps = parseFloat(v.dataset.fps) || 1, n = parseInt(v.dataset.frames, 10) || 1;
    return Math.max(0, Math.min(n - 1, Math.floor(v.currentTime * fps + 1e-4)));
  }
  function seekTo(v, k) {
    var fps = parseFloat(v.dataset.fps) || 1, n = parseInt(v.dataset.frames, 10) || 1;
    k = ((k % n) + n) % n;
    v.currentTime = (k + 0.5) / fps;  // the middle of frame k
  }
  function attachScrubber(v) {
    if (v.dataset.scrub) { return; }
    v.dataset.scrub = '1';
    var box = document.createElement('div'); box.className = 'scrub';
    var play = document.createElement('button'); play.type = 'button'; play.title = 'Play or pause'; play.textContent = 'Pause';
    var prev = document.createElement('button'); prev.type = 'button'; prev.title = 'Previous frame'; prev.textContent = '◀';
    var next = document.createElement('button'); next.type = 'button'; next.title = 'Next frame'; next.textContent = '▶';
    var range = document.createElement('input'); range.type = 'range'; range.min = 0; range.step = 1;
    var out = document.createElement('span'); out.className = 'scrub-readout';
    function n() { return parseInt(v.dataset.frames, 10) || 1; }
    function refresh() {
      var k = frameOf(v); range.max = n() - 1; range.value = k;
      out.textContent = 'frame ' + k + ' / ' + (n() - 1);
      play.textContent = v.paused ? 'Play' : 'Pause';
    }
    function pauseByUser() { v.pause(); v.dataset.userPaused = '1'; refresh(); }
    play.addEventListener('click', function () {
      if (v.paused) { v.dataset.userPaused = ''; var p = v.play(); if (p && p.catch) { p.catch(function () {}); } }
      else { pauseByUser(); }
      refresh();
    });
    prev.addEventListener('click', function () { v.pause(); v.dataset.userPaused = '1'; seekTo(v, frameOf(v) - 1); });
    next.addEventListener('click', function () { v.pause(); v.dataset.userPaused = '1'; seekTo(v, frameOf(v) + 1); });
    range.addEventListener('input', function () { v.pause(); v.dataset.userPaused = '1'; seekTo(v, parseInt(range.value, 10)); });
    v.addEventListener('timeupdate', refresh);
    v.addEventListener('seeked', refresh);
    v.addEventListener('play', refresh);
    v.addEventListener('pause', refresh);
    v.addEventListener('loadedmetadata', refresh);
    box.appendChild(play); box.appendChild(prev); box.appendChild(next); box.appendChild(range); box.appendChild(out);
    v.parentNode.insertBefore(box, v.nextSibling);
    refresh();
  }
  var all = document.querySelectorAll('video[data-fps]');
  all.forEach(attachScrubber);

  // play while on screen, unless the viewer paused it
  var lazy = document.querySelectorAll('video[data-autoplay]');
  if ('IntersectionObserver' in window && lazy.length) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          if (v.dataset.userPaused !== '1') { var p = v.play(); if (p && p.catch) { p.catch(function () {}); } }
        } else { v.pause(); }
      });
    }, { threshold: 0.35 });
    lazy.forEach(function (v) { obs.observe(v); });
  }

  // Freeze each swappable card at its tallest variant's aspect ratio. The
  // clips in one card are crops of different windows and differ in height by
  // up to 60%, so writing each variant's size onto the element made the card --
  // and everything below it -- reflow on every click. The box is reserved once;
  // shorter clips letterbox inside it (object-fit: contain, white ground).
  function reserveBox(sel, video) {
    var w = parseInt(video.getAttribute('width'), 10) || 0;
    var h = parseInt(video.getAttribute('height'), 10) || 0;
    var ratio = w > 0 && h > 0 ? h / w : 0;
    sel.querySelectorAll('.ep-btn').forEach(function (b) {
      var bw = parseInt(b.getAttribute('data-w'), 10) || 0;
      var bh = parseInt(b.getAttribute('data-h'), 10) || 0;
      if (bw > 0 && bh > 0 && bh / bw > ratio) { ratio = bh / bw; w = bw; h = bh; }
    });
    if (w > 0 && ratio > 0) {
      video.setAttribute('width', w);
      video.setAttribute('height', Math.round(w * ratio));
      video.classList.add('ep-fixed');
    }
  }

  // Carry the frame on screen across the swap. `video.load()` tears the element
  // down and paints its poster while the next clip buffers, which read as a
  // flash; painting the current frame into the poster first means the still the
  // browser shows is the frame the viewer was already looking at.
  function holdCurrentFrame(video, fallback) {
    try {
      if (!video.videoWidth) { video.setAttribute('poster', fallback); return; }
      var cw = Math.min(video.videoWidth, video.clientWidth || video.videoWidth);
      var c = document.createElement('canvas');
      c.width = cw;
      c.height = Math.round(cw * video.videoHeight / video.videoWidth);
      c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
      video.setAttribute('poster', c.toDataURL('image/jpeg', 0.8));
    } catch (e) {
      video.setAttribute('poster', fallback);  // tainted or unsupported
    }
  }

  // episode selector: swap the card's clip and its frame data, keep playing
  document.querySelectorAll('.ep-select').forEach(function (sel) {
    var card = sel.parentElement;
    var video = card.querySelector('video');
    var source = video.querySelector('source');
    reserveBox(sel, video);
    sel.querySelectorAll('.ep-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.disabled || b.classList.contains('is-active')) { return; }
        sel.querySelectorAll('.ep-btn').forEach(function (x) { x.classList.remove('is-active'); });
        b.classList.add('is-active');
        holdCurrentFrame(video, b.getAttribute('data-poster'));
        source.setAttribute('src', b.getAttribute('data-src'));
        // width/height are deliberately NOT rewritten: the box is reserved above.
        if (b.getAttribute('data-fps')) { video.dataset.fps = b.getAttribute('data-fps'); video.dataset.frames = b.getAttribute('data-frames'); }
        video.dataset.userPaused = '';
        video.load();
        var p = video.play(); if (p && p.catch) { p.catch(function () {}); }
      });
    });
  });

  var btn = document.getElementById('copy-bibtex');
  var code = document.getElementById('bibtex-code');
  if (btn && code) {
    btn.addEventListener('click', function () {
      var text = code.textContent;
      var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy'; }, 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, done); }
      else {
        var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (err) {}
        document.body.removeChild(ta); done();
      }
    });
  }
})();
