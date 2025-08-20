(() => {
    const stage = document.getElementById('stage');
    const glitch = document.getElementById('glitch');
  
    // 한 면에 3줄 표시
    const LINES = ['붕 오 떡', '어 볶', '빵 뎅 이'];
  
    // ===== Config =====
    const INITIAL_SIZE_RANGE = [180, 260];   // 초기 큐브 변 길이(px)
    const MIN_SIZE = 1;                      // 한 변 길이가 1px가 되는 순간 글리치
    const SPEED_RANGE = [280, 520];          // 이동 속도 2배
    const ROT_SPEED_RANGE = [50, 120];       // 회전 속도 2배
    const SPLIT_DEFLECT = 140;               // 분열 시 서로 반대로 튀는 추가 속도(px/s)
    const BOUNCE_DEFLECT = 40;               // 벽 튕김 시 약간 방향 틀기(px/s)
    const MAX_CUBES = 64;                    // 안전 한도
  
    /** @type {Cube[]} */
    let cubes = [];
    let rafId = null;
    let lastTs = 0;
    let glitching = false;
  
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
  
        // DOM 구성
        this.entity = document.createElement('div');
        this.entity.className = 'cube-entity';
        this.entity.style.width = `${this.size}px`;
        this.entity.style.height = `${this.size}px`;
  
        this.cube = document.createElement('div');
        this.cube.className = 'cube';
        this.entity.appendChild(this.cube);
  
        // 6면 동일한 3줄 텍스트
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
        this._fitTextAll();   // 글자 크기/간격/세로 여백 맞춤
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
  
      /**
       * 이동 + 화면 경계 충돌만 처리(큐브끼리 상호작용 없음)
       * @param {number} dt
       * @param {{w:number,h:number}} bounds
       */
      tick(dt, bounds) {
        this.justBouncedCooldown = Math.max(0, this.justBouncedCooldown - dt*1000);
  
        // 이동
        this.x += this.vx * dt;
        this.y += this.vy * dt;
  
        let bouncedAtWall = false;
        let bouncedAxis = null; // 'x'면 좌/우 벽, 'y'면 상/하 벽
  
        // 경계 체크 (x)
        if (this.x < 0) {
          this.x = 0;
          this.vx = Math.abs(this.vx) + Math.sign(this.vx || 1) * BOUNCE_DEFLECT * Math.random();
          bouncedAtWall = true; bouncedAxis = 'x';
        } else if (this.x + this.size > bounds.w) {
          this.x = bounds.w - this.size;
          this.vx = -Math.abs(this.vx) - Math.sign(this.vx || 1) * BOUNCE_DEFLECT * Math.random();
          bouncedAtWall = true; bouncedAxis = 'x';
        }
  
        // 경계 체크 (y)
        if (this.y < 0) {
          this.y = 0;
          this.vy = Math.abs(this.vy) + Math.sign(this.vy || 1) * BOUNCE_DEFLECT * Math.random();
          bouncedAtWall = true; bouncedAxis = 'y';
        } else if (this.y + this.size > bounds.h) {
          this.y = bounds.h - this.size;
          this.vy = -Math.abs(this.vy) - Math.sign(this.vy || 1) * BOUNCE_DEFLECT * Math.random();
          bouncedAtWall = true; bouncedAxis = 'y';
        }
  
        // 화면 가장자리에서만 상호작용(연출+분열)
        if (bouncedAtWall && this.justBouncedCooldown <= 0) {
          // 튕김 연출(스쿼시)
          this.cube.classList.remove('hit'); void this.cube.offsetWidth; this.cube.classList.add('hit');
  
          // 약간 방향 틀기(회전 속도 변경)
          const tilt = 10 + Math.random()*30;
          if (bouncedAxis === 'x') this.rySpeed += (Math.random() > 0.5 ? 1 : -1) * tilt;
          else this.rxSpeed += (Math.random() > 0.5 ? 1 : -1) * tilt;
  
          this.justBouncedCooldown = 120;
  
          // 벽에서만 분열
          this.splitOnWallBounce(bouncedAxis);
        }
  
        this._updateDom(dt);
      }
  
      /**
       * 벽 충돌 시 분열:
       * - 가로(좌/우) 벽 → 좌/우로 정반대 분열
       * - 세로(상/하) 벽 → 상/하로 정반대 분열
       */
      splitOnWallBounce(axis) {
        // 한 변이 1px이면 즉시 글리치
        if (this.size <= MIN_SIZE) {
          triggerGlitchAndReset();
          return;
        }
      
        const half = Math.floor(this.size / 2);
        if (half < MIN_SIZE || cubes.length >= MAX_CUBES) {
          triggerGlitchAndReset();
          return;
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
          // X축(좌/우) 벽 → 상/하 분열
          const mag = Math.max(Math.abs(this.vy), SPLIT_DEFLECT);
          a = new Cube({ ...base, vx: this.vx, vy:  mag });
          b = new Cube({ ...base, vx: this.vx, vy: -mag });
        } else {
          // Y축(상/하) 벽 → 좌/우 분열
          const mag = Math.max(Math.abs(this.vx), SPLIT_DEFLECT);
          a = new Cube({ ...base, vx:  mag, vy: this.vy });
          b = new Cube({ ...base, vx: -mag, vy: this.vy });
        }
      
        const idx = cubes.indexOf(this);
        if (idx !== -1) cubes.splice(idx, 1);
        this.destroy();
      
        a._updateFaceTransforms();
        b._updateFaceTransforms();
        cubes.push(a, b);
      }
      
  
      resizeText() { this._fitTextAll(); }
      destroy() { this.entity.remove(); }
  
      // === 텍스트 맞춤(면 너비 기준, 줄폭 동일화 + 세로 여백 분배) ===
      _fitTextAll() {
        const faceList = Object.values(this.faces);
        const cs = getComputedStyle(faceList[0]);
        const padX = px(cs.paddingLeft) + px(cs.paddingRight);
        const padY = px(cs.paddingTop) + px(cs.paddingBottom);
        const usableW = this.size - padX;
        const usableH = this.size - padY;
  
        // 폰트 크기: 면 너비 기준으로 시작, 세로 3줄이 넘치면 줄이기
        let fontSize = Math.max(10, this.size * 0.20);
        const lineHeightFor = fs => fs * 1.05;
  
        // 1) 세로에 맞추기
        while ((lineHeightFor(fontSize) * 3) > usableH && fontSize > 6) fontSize -= 1;
  
        // 2) 가로 초과 방지(레터스페이싱 0 기준 최장 줄이 usableW를 넘지 않게)
        faceList.forEach(face => {
          const lineEls = [...face.querySelectorAll('.line')];
          lineEls.forEach(l => { l.style.fontSize = `${fontSize}px`; l.style.letterSpacing = '0px'; });
        });
        const measureMaxLineWidth = () => {
          let maxW = 0;
          faceList.forEach(face => {
            const lineEls = [...face.querySelectorAll('.line')];
            lineEls.forEach(l => {
              const w = measureTextWidth(l);
              if (w > maxW) maxW = w;
            });
          });
          return maxW;
        };
        while (measureMaxLineWidth() > usableW && fontSize > 6) {
          fontSize -= 1;
          faceList.forEach(face => {
            const lineEls = [...face.querySelectorAll('.line')];
            lineEls.forEach(l => { l.style.fontSize = `${fontSize}px`; });
          });
        }
  
        // 3) 줄별 spacing으로 면 폭을 정확히 채움 + 세로 여백 분배
        faceList.forEach(face => {
          const linesWrap = face.querySelector('.lines');
          const lineEls = [...linesWrap.querySelectorAll('.line')];
  
          // 최종 폰트 크기
          lineEls.forEach(l => { l.style.fontSize = `${fontSize}px`; });
  
          // 세로 여백 분배
          const totalLinesHeight = lineHeightFor(fontSize) * 3;
          let leftover = usableH - totalLinesHeight;
          const minOuter = Math.max(4, this.size * 0.02); // 위/아래 기본 여백
          leftover = Math.max(0, leftover - minOuter * 2);
          const gap = leftover > 0 ? (leftover / 2) : 0; // 3줄 → 사이 2곳
  
          linesWrap.style.gap = `${gap}px`;
          linesWrap.style.paddingTop = `${minOuter}px`;
          linesWrap.style.paddingBottom = `${minOuter}px`;
  
          // 줄별 letter-spacing 계산
          lineEls.forEach(l => {
            const text = l.textContent ?? '';
            const chars = [...text];
            const gaps = Math.max(1, chars.length - 1);
  
            // letter-spacing 0 기준 실제 텍스트 폭
            const rawW = measureTextWidth(l);
  
            // 면 폭(usableW) - 텍스트 폭을 간격 개수로 나눠 정확히 채움
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
  
    // ===== 유틸 =====
    const px = v => parseFloat(v || '0');
  
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
  
    function randIn([a, b]) { return a + Math.random() * (b - a); }
    function randSign() { return Math.random() < 0.5 ? -1 : 1; }
    function getBounds() { return { w: stage.clientWidth, h: stage.clientHeight }; }
  
    function makeRandomCube() {
      const bounds = getBounds();
      const size = Math.floor(randIn(INITIAL_SIZE_RANGE));
      const x = Math.max(0, Math.min(bounds.w - size, Math.random() * (bounds.w - size)));
      const y = Math.max(0, Math.min(bounds.h - size, Math.random() * (bounds.h - size)));
      const vx = randSign() * randIn(SPEED_RANGE);
      const vy = randSign() * randIn(SPEED_RANGE);
      const rx = randIn(ROT_SPEED_RANGE) * randSign();
      const ry = randIn(ROT_SPEED_RANGE) * randSign();
  
      return new Cube({ size, x, y, vx, vy, rxSpeed: rx, rySpeed: ry });
    }
  
    // ===== 글리치 & 리셋 =====
    function triggerGlitchAndReset() {
      if (glitching) return;
      glitching = true;
  
      // 루프 잠시 중단
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  
      // 글리치
      glitch.classList.remove('active'); void glitch.offsetWidth; glitch.classList.add('active');
  
      // 기존 큐브 제거
      cubes.forEach(c => c.destroy());
      cubes = [];
  
      // 글리치 종료 후 재시작
      setTimeout(() => {
        glitch.classList.remove('active');
        cubes.push(makeRandomCube());
        glitching = false;
        if (!rafId) rafId = requestAnimationFrame(animate);
      }, 2500);
    }
  
    // ===== 메인 루프 =====
    function animate(ts) {
      if (!lastTs) lastTs = ts;
      const dt = Math.min(0.032, (ts - lastTs) / 1000);
      lastTs = ts;
  
      const bounds = getBounds();
  
      // 스냅샷 순회(중간 배열 변경에 안전)
      const snapshot = cubes.slice();
      for (let i = 0; i < snapshot.length; i++) {
        const c = snapshot[i];
        if (!c) continue;
        c.tick(dt, bounds);  // 오직 벽과만 상호작용
      }
  
      // 전역 감시: 어느 큐브든 한 변이 1px가 되면 즉시 글리치
      if (!glitching && cubes.some(c => c.size <= MIN_SIZE)) {
        triggerGlitchAndReset();
        return; // 글리치 전환 중에는 루프를 다시 걸지 않음
      }
  
      rafId = requestAnimationFrame(animate);
    }
  
    // ===== 초기화 =====
    function resetAll() {
      cubes.forEach(c => c.destroy());
      cubes = [ makeRandomCube() ];
      lastTs = 0;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(animate);
    }
  
    // 폰트 로드 후 정확한 측정
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(resetAll);
    } else {
      resetAll();
    }
  
    // 리사이즈 시 텍스트·위치 보정
    window.addEventListener('resize', () => {
      const b = getBounds();
      cubes.forEach(c => {
        c.x = Math.max(0, Math.min(b.w - c.size, c.x));
        c.y = Math.max(0, Math.min(b.h - c.size, c.y));
        c.resizeText();
      });
    });
  })();
  