(() => {
  const stage = document.getElementById('stage');
  const glitch = document.getElementById('glitch');

  const STATE = {
    lastSpeedMul: 1, // 이전 이동 배율 기억
    lastRotMul: 1,    // 이전 회전 배율 기억
  };

  function applySpeedMultiplier(newMul){
    const factor = newMul / (STATE.lastSpeedMul || 1);
    if (!isFinite(factor) || factor === 0) return;
    cubes.forEach(c => {
      c.vx *= factor;
      c.vy *= factor;
    });
    STATE.lastSpeedMul = newMul;
  }
  
  function applyRotMultiplier(newMul){
    const factor = newMul / (STATE.lastRotMul || 1);
    if (!isFinite(factor) || factor === 0) return;
    cubes.forEach(c => {
      c.rxSpeed *= factor;
      c.rySpeed *= factor;
    });
    STATE.lastRotMul = newMul;
  }

  // 텍스트 (한 면에 3줄)
  const LINES = ['붕 오 떡', '어 볶', '빵 뎅 이'];

  // ===== 기본 베이스 (배율/설정으로 보정됨) =====
  const BASE = {
    INITIAL_SIZE_RANGE: [250, 400],
    SPEED_RANGE: [300, 600],          // px/s
    ROT_SPEED_RANGE: [80, 200],       // deg/s
    SPLIT_DEFLECT: 220,               // 분열 반발 속도
    BOUNCE_DEFLECT: 40,               // 벽 튕김 틀기
    MAX_CUBES: 64
  };

  // ===== 사용자 설정 (패널) — 큐브-큐브 상호작용 관련 항목 제거됨 =====
  const CONFIG = {
    get sizeMin() { return clampNum(Number($('#sizeMin').value), 20, 2000); },
    get sizeMax() { return clampNum(Number($('#sizeMax').value), 20, 2400); },
    get speedMul(){ return round2(Number($('#speedMul').value)); },
    get rotMul(){ return round2(Number($('#rotMul').value)); },
    get splitDeflect(){ return Number($('#splitDeflect').value); },
    get bounceDeflect(){ return Number($('#bounceDeflect').value); },
    get cubeAlpha(){ return Number($('#cubeAlpha').value); },
    get glitchMs(){ return Math.floor(Number($('#glitchSec').value) * 1000); },
    get enableImpact(){ return $('#impactFx').checked; }
  };

  // 최소 크기: 1px 이 되면 글리치
  const MIN_SIZE = 1;

  let cubes = [];
  let rafId = null;
  let lastTs = 0;
  let glitching = false;

  // ===== 유틸 =====
  function $(sel){ return document.querySelector(sel); }
  const px = v => parseFloat(v || '0');
  const clampNum = (n, a, b) => Math.max(a, Math.min(b, n));
  const round2 = n => Math.round(n * 100) / 100;
  const randIn = ([a, b]) => a + Math.random() * (b - a);
  const randSign = () => (Math.random() < 0.5 ? -1 : 1);

  function updateCssAlpha(){
    document.documentElement.style.setProperty('--cube-alpha', String(CONFIG.cubeAlpha));
  }

  // ===== 충돌 임팩트 이펙트 =====
  function spawnImpact(x, y){
    if (!CONFIG.enableImpact) return;
    const dot = document.createElement('div');
    dot.className = 'impact';
    dot.style.left = `${x}px`;
    dot.style.top  = `${y}px`;
    stage.appendChild(dot);
    dot.addEventListener('animationend', () => dot.remove(), { once: true });
  }

  // ===== 큐브 클래스 =====
  class Cube {
    constructor(o) {
      this.size = o.size;
      this.x = o.x;
      this.y = o.y;
      this.vx = o.vx;
      this.vy = o.vy;
      this.rx = Math.random() * 360;
      this.ry = Math.random() * 360;
      this.rxSpeed = o.rxSpeed;
      this.rySpeed = o.rySpeed;

      this.justBouncedCooldown = 0; // ms

      // DOM
      this.entity = document.createElement('div');
      this.entity.className = 'cube-entity';
      this.entity.style.width = `${this.size}px`;
      this.entity.style.height = `${this.size}px`;

      this.cube = document.createElement('div');
      this.cube.className = 'cube';
      this.entity.appendChild(this.cube);

      // 6면 생성 (동일한 3줄)
      const faces = {};
      for (const key of ['front','back','right','left','top','bottom']) {
        const face = document.createElement('div');
        face.className = 'face';

        const linesWrap = document.createElement('div');
        linesWrap.className = 'lines';

        LINES.forEach(txt => {
          const line = document.createElement('span');
          line.className = 'line';
          line.textContent = txt;
          linesWrap.appendChild(line);
        });

        face.appendChild(linesWrap);
        faces[key] = face;
        this.cube.appendChild(face);
      }
      this.faces = faces;

      stage.appendChild(this.entity);

      this._updateFaceTransforms();
      this._fitTextAll();
      this._updateDom(0);
    }

    _updateFaceTransforms() {
      const tz = this.size / 2;
      this.faces.front.style.transform  = `rotateY(0deg) translateZ(${tz}px)`;
      this.faces.back.style.transform   = `rotateY(180deg) translateZ(${tz}px)`;
      this.faces.right.style.transform  = `rotateY(90deg) translateZ(${tz}px)`;
      this.faces.left.style.transform   = `rotateY(-90deg) translateZ(${tz}px)`;
      this.faces.top.style.transform    = `rotateX(90deg) translateZ(${tz}px)`;
      this.faces.bottom.style.transform = `rotateX(-90deg) translateZ(${tz}px)`;
    }

    _updateDom(dt) {
      this.rx = (this.rx + this.rxSpeed * dt) % 360;
      this.ry = (this.ry + this.rySpeed * dt) % 360;

      this.entity.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
      const rotStr = `rotateX(${this.rx}deg) rotateY(${this.ry}deg)`;
      this.cube.style.setProperty('--rot', rotStr);
      this.cube.style.transform = rotStr;
    }

    tick(dt, bounds) {
      this.justBouncedCooldown = Math.max(0, this.justBouncedCooldown - dt*1000);

      // 이동
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // 벽 충돌 (분열 방향은 "반대로": 가로벽→상하, 세로벽→좌우)
      let bouncedAtWall = false;
      let wallAxis = null; // 'x' = 좌/우 벽, 'y' = 상/하 벽

      if (this.x < 0) {
        this.x = 0;
        this.vx = Math.abs(this.vx) + Math.sign(this.vx || 1) * CONFIG.bounceDeflect * Math.random();
        bouncedAtWall = true; wallAxis = 'x';
      } else if (this.x + this.size > bounds.w) {
        this.x = bounds.w - this.size;
        this.vx = -Math.abs(this.vx) - Math.sign(this.vx || 1) * CONFIG.bounceDeflect * Math.random();
        bouncedAtWall = true; wallAxis = 'x';
      }
      if (this.y < 0) {
        this.y = 0;
        this.vy = Math.abs(this.vy) + Math.sign(this.vy || 1) * CONFIG.bounceDeflect * Math.random();
        bouncedAtWall = true; wallAxis = 'y';
      } else if (this.y + this.size > bounds.h) {
        this.y = bounds.h - this.size;
        this.vy = -Math.abs(this.vy) - Math.sign(this.vy || 1) * CONFIG.bounceDeflect * Math.random();
        bouncedAtWall = true; wallAxis = 'y';
      }

      if (bouncedAtWall && this.justBouncedCooldown <= 0) {
        this.cube.classList.remove('hit'); void this.cube.offsetWidth; this.cube.classList.add('hit');

        // 회전 틸트
        const tilt = 10 + Math.random()*30;
        if (wallAxis === 'x') this.rySpeed += (Math.random() > 0.5 ? 1 : -1) * tilt;
        else this.rxSpeed += (Math.random() > 0.5 ? 1 : -1) * tilt;

        this.justBouncedCooldown = 120;

        // 임팩트
        spawnImpact(this.x + this.size/2, this.y + this.size/2);

        // 벽에서만 분열 (반대 축으로 분열)
        this.splitOnWallBounce(wallAxis);
      }

      this._updateDom(dt);
    }

    // 벽 충돌 시 분열: (반대로) 가로 벽 → 상/하, 세로 벽 → 좌/우
    splitOnWallBounce(axis) {
      if (this.size <= MIN_SIZE) { triggerGlitchAndReset(); return; }
      const half = Math.floor(this.size / 2);
      if (half < MIN_SIZE || cubes.length >= BASE.MAX_CUBES) {
        triggerGlitchAndReset(); return;
      }

      const base = {
        size: half,
        x: this.x + (this.size - half)/2,
        y: this.y + (this.size - half)/2,
        rxSpeed: this.rxSpeed * (0.85 + Math.random()*0.5),
        rySpeed: this.rySpeed * (0.85 + Math.random()*0.5),
      };

      let a, b;
      if (axis === 'x') {
        // 좌/우(가로) 벽 → 상/하 분열
        const mag = Math.max(Math.abs(this.vy), CONFIG.splitDeflect);
        a = new Cube({ ...base, vx: this.vx, vy:  mag });
        b = new Cube({ ...base, vx: this.vx, vy: -mag });
      } else {
        // 상/하(세로) 벽 → 좌/우 분열
        const mag = Math.max(Math.abs(this.vx), CONFIG.splitDeflect);
        a = new Cube({ ...base, vx:  mag, vy: this.vy });
        b = new Cube({ ...base, vx: -mag, vy: this.vy });
      }

      // 원본 제거 + 교체
      const idx = cubes.indexOf(this);
      if (idx !== -1) cubes.splice(idx, 1);
      this.destroy();

      a._updateFaceTransforms();
      b._updateFaceTransforms();
      cubes.push(a, b);
    }

    resizeText() { this._fitTextAll(); }
    destroy() { this.entity.remove(); }

    // === 텍스트 맞춤 (면 너비 기준, 줄폭 동일화 + 세로 여백 분배) ===
    _fitTextAll() {
      const faceList = Object.values(this.faces);
      const cs = getComputedStyle(faceList[0]);
      const padX = px(cs.paddingLeft) + px(cs.paddingRight);
      const padY = px(cs.paddingTop) + px(cs.paddingBottom);
      const usableW = this.size - padX;
      const usableH = this.size - padY;

      // 1) 세로 맞춤
      let fontSize = Math.max(10, this.size * 0.20);
      const lineHeightFor = fs => fs * 1.05;
      while ((lineHeightFor(fontSize) * 3) > usableH && fontSize > 6) fontSize -= 1;

      // 2) 가로 초과 방지(레터스페이싱 0 기준 최장 줄)
      faceList.forEach(face => {
        const lineEls = [...face.querySelectorAll('.line')];
        lineEls.forEach(l => { l.style.fontSize = `${fontSize}px`; l.style.letterSpacing = '0px'; });
      });
      const measureMaxLineWidth = () => {
        let maxW = 0;
        faceList.forEach(face => {
          [...face.querySelectorAll('.line')].forEach(l => {
            const w = measureTextWidth(l);
            if (w > maxW) maxW = w;
          });
        });
        return maxW;
      };
      while (measureMaxLineWidth() > usableW && fontSize > 6) {
        fontSize -= 1;
        faceList.forEach(face => {
          [...face.querySelectorAll('.line')].forEach(l => { l.style.fontSize = `${fontSize}px`; });
        });
      }

      // 3) 줄별 spacing으로 면 폭 채우기 + 세로 여백 배분
      faceList.forEach(face => {
        const linesWrap = face.querySelector('.lines');
        const lineEls = [...linesWrap.querySelectorAll('.line')];

        lineEls.forEach(l => { l.style.fontSize = `${fontSize}px`; });

        const totalLinesHeight = lineHeightFor(fontSize) * 3;
        let leftover = usableH - totalLinesHeight;
        const minOuter = Math.max(4, this.size * 0.02);
        leftover = Math.max(0, leftover - minOuter * 2);
        const gap = leftover > 0 ? (leftover / 2) : 0;

        linesWrap.style.gap = `${gap}px`;
        linesWrap.style.paddingTop = `${minOuter}px`;
        linesWrap.style.paddingBottom = `${minOuter}px`;

        lineEls.forEach(l => {
          const text = l.textContent ?? '';
          const chars = [...text];
          const gaps = Math.max(1, chars.length - 1);
          const rawW = measureTextWidth(l);
          let spacing = (usableW - rawW) / gaps;
          if (!isFinite(spacing) || spacing < 0) spacing = 0;

          l.style.letterSpacing = `${spacing}px`;
          l.style.display = 'block';
          l.style.width = `${usableW}px`;
          l.style.textAlign = 'left';
        });
      });
    }
  }

  // ===== 텍스트 폭 측정 =====
  function measureTextWidth(lineEl) {
    const meas = document.createElement('span');
    meas.textContent = lineEl.textContent || '';
    const cs = getComputedStyle(lineEl);
    meas.style.position = 'absolute';
    meas.style.visibility = 'hidden';
    meas.style.whiteSpace = 'pre';
    meas.style.fontFamily = cs.fontFamily;
    meas.style.fontSize = cs.fontSize;
    meas.style.fontWeight = cs.fontWeight;
    document.body.appendChild(meas);
    const w = meas.getBoundingClientRect().width;
    meas.remove();
    return w;
  }

  // ===== 경계/생성 =====
  function getBounds(){ return { w: stage.clientWidth, h: stage.clientHeight }; }

  function makeRandomCube() {
    const bounds = getBounds();

    const sizeMin = Math.min(CONFIG.sizeMin, CONFIG.sizeMax);
    const sizeMax = Math.max(CONFIG.sizeMin, CONFIG.sizeMax);
    const size = Math.floor(randIn([sizeMin, sizeMax]));

    const x = Math.max(0, Math.min(bounds.w - size, Math.random() * (bounds.w - size)));
    const y = Math.max(0, Math.min(bounds.h - size, Math.random() * (bounds.h - size)));

    const speedRange = [BASE.SPEED_RANGE[0] * CONFIG.speedMul, BASE.SPEED_RANGE[1] * CONFIG.speedMul];
    const rotRange   = [BASE.ROT_SPEED_RANGE[0] * CONFIG.rotMul, BASE.ROT_SPEED_RANGE[1] * CONFIG.rotMul];

    const vx = randSign() * randIn(speedRange);
    const vy = randSign() * randIn(speedRange);
    const rx = randIn(rotRange) * randSign();
    const ry = randIn(rotRange) * randSign();

    return new Cube({ size, x, y, vx, vy, rxSpeed: rx, rySpeed: ry });
  }

  // ===== 글리치 & 리셋 =====
  function triggerGlitchAndReset() {
    if (glitching) return;
    glitching = true;

    // 루프 일시 중단
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

    // 글리치 ON
    glitch.classList.remove('active'); void glitch.offsetWidth; glitch.classList.add('active');

    // 제거
    cubes.forEach(c => c.destroy());
    cubes = [];

    // 유지 시간 후 재시작
    setTimeout(() => {
      glitch.classList.remove('active');
      cubes.push(makeRandomCube());
      glitching = false;
      if (!rafId) rafId = requestAnimationFrame(animate);
    }, CONFIG.glitchMs);
  }

  // ===== 메인 루프 =====
  function animate(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.032, (ts - lastTs) / 1000);
    lastTs = ts;

    const bounds = getBounds();

    // 스냅샷 순회
    const snapshot = cubes.slice();
    for (let i = 0; i < snapshot.length; i++) {
      const c = snapshot[i];
      if (!c) continue;
      c.tick(dt, bounds);
    }

    // 어느 큐브든 한 변이 1px가 되면 글리치
    if (!glitching && cubes.some(c => c.size <= MIN_SIZE)) {
      triggerGlitchAndReset();
      return;
    }

    rafId = requestAnimationFrame(animate);
  }

  // ===== 초기화/이벤트 =====
  function resetAll() {
    cubes.forEach(c => c.destroy());
    cubes = [ makeRandomCube() ];
    lastTs = 0;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(animate);
  }

  // 패널: 값 출력 반영 + 알파 변수 반영 + 슬라이드 토글
  function bindPanel(){
    const pairs = [
      ['speedMul', v => $('#speedMulOut').textContent = `${round2(v)}×`],
      ['rotMul', v => $('#rotMulOut').textContent = `${round2(v)}×`],
      ['splitDeflect', v => $('#splitDeflectOut').textContent = `${Math.round(v)}`],
      ['bounceDeflect', v => $('#bounceDeflectOut').textContent = `${Math.round(v)}`],
      ['cubeAlpha', v => $('#cubeAlphaOut').textContent = v.toFixed(2)],
      ['glitchSec', v => $('#glitchSecOut').textContent = `${round2(v)}s`],
    ];
    pairs.forEach(([id, fn]) => {
      const el = $(`#${id}`);
      const handler = () => fn(Number(el.value));
      el.addEventListener('input', handler);
      handler();
    });
    
    // 기존 pairs 처리 아래쪽에 추가 (또는 해당 항목 케이스에 결합)
    $('#speedMul').addEventListener('input', () => {
      const v = CONFIG.speedMul;            // 새 배율
      $('#speedMulOut').textContent = `${v.toFixed(2)}×`;
      applySpeedMultiplier(v);              // ← 실시간 적용
    });

    $('#rotMul').addEventListener('input', () => {
      const v = CONFIG.rotMul;
      $('#rotMulOut').textContent = `${v.toFixed(2)}×`;
      applyRotMultiplier(v);                // ← 실시간 적용
    });

    // 분열/튕김 강도는 즉시 변수만 바뀌면 다음 충돌부터 자동 반영
    $('#splitDeflect').addEventListener('input', () => {
      const v = CONFIG.splitDeflect;
      $('#splitDeflectOut').textContent = `${Math.round(v)}`;
    });
    $('#bounceDeflect').addEventListener('input', () => {
      const v = CONFIG.bounceDeflect;
      $('#bounceDeflectOut').textContent = `${Math.round(v)}`;
    });

    // 알파는 기존처럼 CSS 변수로 실시간 반영
    $('#cubeAlpha').addEventListener('input', () => {
      const v = CONFIG.cubeAlpha;
      $('#cubeAlphaOut').textContent = v.toFixed(2);
      updateCssAlpha();
    });

    // 글리치 지속 표시만 갱신(다음 글리치부터 반영)
    $('#glitchSec').addEventListener('input', () => {
      const v = CONFIG.glitchSec;
      $('#glitchSecOut').textContent = `${v.toFixed(1)}s`;
    });


    $('#cubeAlpha').addEventListener('input', updateCssAlpha);
    updateCssAlpha();

    // 재시작 버튼
    $('#btnReset').addEventListener('click', () => resetAll());

    // ▼ 슬라이드 토글 구현
    const toggleBtn = $('#panelToggle');
    const body = $('#panelBody');

    // 초기 높이 지정 (expanded 상태의 실제 높이)
    const setHeightToAuto = () => {
      body.style.height = 'auto';
      const h = body.scrollHeight;
      body.style.height = h + 'px';
    };
    setHeightToAuto();

    let expanded = true;
    toggleBtn.addEventListener('click', () => {
      expanded = !expanded;
      toggleBtn.setAttribute('aria-expanded', String(expanded));

      if (expanded) {
        // 펼치기: 현재 0 → content 높이로
        body.classList.remove('collapsed');
        body.classList.add('expanded');
        // height 애니메이션을 위해 먼저 0에서 시작
        body.style.height = '0px';
        // 다음 프레임에 실제 높이로
        requestAnimationFrame(() => {
          const target = body.scrollHeight;
          body.style.height = target + 'px';
        });
      } else {
        // 접기: 현재 content 높이 → 0
        body.classList.remove('expanded');
        body.classList.add('collapsed');
        const start = body.scrollHeight;
        body.style.height = start + 'px';
        requestAnimationFrame(() => {
          body.style.height = '0px';
        });
      }
    });

    // 트랜지션 종료 후 상태 정리(펼친 뒤에는 height:auto 유지)
    body.addEventListener('transitionend', (e) => {
      if (e.propertyName !== 'height') return;
      if (expanded) {
        body.style.height = 'auto'; // 컨텐츠 변화에도 자연스럽게
      }
    });

    // 시작 시 현재 슬라이더 값 기준으로 상태 초기화
    STATE.lastSpeedMul = CONFIG.speedMul;
    STATE.lastRotMul   = CONFIG.rotMul;

  }

  // 폰트 로드 후 정확한 측정
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { bindPanel(); resetAll(); });
  } else {
    bindPanel(); resetAll();
  }

  // 리사이즈 보정
  window.addEventListener('resize', () => {
    const b = getBounds();
    cubes.forEach(c => {
      c.x = Math.max(0, Math.min(b.w - c.size, c.x));
      c.y = Math.max(0, Math.min(b.h - c.size, c.y));
      c.resizeText();
    });
    // 패널 펼쳐진 상태면 높이 재계산
    const body = $('#panelBody');
    if (body && body.classList.contains('expanded')) {
      body.style.height = 'auto';
      const h = body.scrollHeight;
      body.style.height = h + 'px';
    }
  });
})();
