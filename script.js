// ============================================================
// SETUP & STATE
// ============================================================
const scenes = Array.from(document.querySelectorAll('.scene'));
const dots = Array.from(document.querySelectorAll('.dot'));
let currentScene = 0;

function goToScene(index){
  index = Math.max(0, Math.min(scenes.length - 1, index));
  scenes[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Update active dot + currentScene based on what's in view
const sceneObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && entry.intersectionRatio > 0.5){
      const idx = scenes.indexOf(entry.target);
      if (idx !== -1){
        currentScene = idx;
        dots.forEach((d, i) => d.classList.toggle('active', i === idx));
      }
    }
  });
}, { threshold: [0.5] });

scenes.forEach(s => sceneObserver.observe(s));

dots.forEach(dot => {
  dot.addEventListener('click', () => goToScene(parseInt(dot.dataset.go, 10)));
});

document.getElementById('btnStart').addEventListener('click', () => goToScene(1));
document.getElementById('next-candle').addEventListener('click', () => goToScene(2));
document.getElementById('next-gift').addEventListener('click', () => goToScene(3));
document.getElementById('next-gallery').addEventListener('click', () => goToScene(4));
document.getElementById('btnReplay').addEventListener('click', () => {
  // reset candle + gifts state for replay
  resetCandle();
  resetGifts();
  goToScene(0);
});

// Prevent literal newline pasted weirdness in editable name
const nameEl = document.getElementById('partnerName');
nameEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') e.preventDefault();
});
nameEl.addEventListener('blur', () => {
  if (!nameEl.textContent.trim()) nameEl.textContent = 'Sayangku';
});

// ============================================================
// FLOATING PETALS (ambient background)
// ============================================================
function spawnPetals(){
  const field = document.getElementById('petalsField');
  const symbols = ['✦', '❀', '✿', '・'];
  const count = window.innerWidth < 600 ? 10 : 18;
  for (let i = 0; i < count; i++){
    const span = document.createElement('span');
    span.className = 'petal';
    span.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    const left = Math.random() * 100;
    const duration = 10 + Math.random() * 14;
    const delay = Math.random() * 14;
    const drift = (Math.random() - 0.5) * 120;
    const size = 10 + Math.random() * 10;
    span.style.left = left + 'vw';
    span.style.fontSize = size + 'px';
    span.style.setProperty('--drift', drift + 'px');
    span.style.animationDuration = duration + 's';
    span.style.animationDelay = '-' + delay + 's';
    field.appendChild(span);
  }
}
spawnPetals();

// ============================================================
// CANDLE — hold-to-blow + optional microphone blow detection
// ============================================================
const candleHolder = document.getElementById('candleHolder');
const btnBlow = document.getElementById('btnBlow');
const btnBlowLabel = document.getElementById('btnBlowLabel');
const smokeEl = document.getElementById('smoke');
const micStatus = document.getElementById('micStatus');
const nextCandleBtn = document.getElementById('next-candle');
const candleDesc = document.getElementById('candleDesc');

let holdTimer = null;
let holdProgress = 0;
let candleBlownOut = false;
let audioContext, analyser, micStream, micRafId;

function blowOutCandle(){
  if (candleBlownOut) return;
  candleBlownOut = true;
  candleHolder.classList.add('blown');
  smokeEl.hidden = false;
  btnBlow.disabled = true;
  btnBlowLabel.textContent = 'Padam ✨ — permintaanmu terkirim';
  nextCandleBtn.disabled = false;
  stopMic();
  launchConfetti(1800);
}

function resetCandle(){
  candleBlownOut = false;
  candleHolder.classList.remove('blown');
  smokeEl.hidden = true;
  btnBlow.disabled = false;
  btnBlow.classList.remove('charging');
  btnBlowLabel.textContent = 'Tahan untuk Meniup';
  nextCandleBtn.disabled = true;
  micStatus.textContent = '';
}

// -- Hold-to-blow (works everywhere, no permissions needed) --
function startHold(){
  if (candleBlownOut) return;
  btnBlow.classList.add('charging');
  clearTimeout(holdTimer);
  holdTimer = setTimeout(() => {
    blowOutCandle();
  }, 1100);
}
function cancelHold(){
  clearTimeout(holdTimer);
  if (!candleBlownOut) btnBlow.classList.remove('charging');
}

btnBlow.addEventListener('pointerdown', startHold);
btnBlow.addEventListener('pointerup', cancelHold);
btnBlow.addEventListener('pointerleave', cancelHold);
btnBlow.addEventListener('pointercancel', cancelHold);

// -- Optional: real microphone blow detection --
async function tryMic(){
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    return;
  }
  try{
    micStatus.textContent = 'Mikrofon aktif — kamu juga bisa tiup langsung 🎤';
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(micStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    function checkVolume(){
      if (candleBlownOut){ return; }
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const avg = sum / data.length;
      if (avg > 42){ // threshold tuned for a "blow" puff
        blowOutCandle();
        return;
      }
      micRafId = requestAnimationFrame(checkVolume);
    }
    checkVolume();
  } catch(err){
    micStatus.textContent = '';
  }
}
function stopMic(){
  if (micRafId) cancelAnimationFrame(micRafId);
  if (micStream) micStream.getTracks().forEach(t => t.stop());
  if (audioContext) audioContext.close();
}

// Only request mic once the candle scene actually comes into view
const candleSceneObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && entry.intersectionRatio > 0.5 && !audioContext){
      tryMic();
    }
  });
}, { threshold: [0.5] });
candleSceneObserver.observe(document.getElementById('scene-candle'));

// ============================================================
// GIFTS
// ============================================================
const giftMessages = {
  '1': 'Aku berterima kasih untuk setiap pagi yang jadi lebih baik karena ada kabar darimu duluan.',
  '2': 'Janji kecil: aku akan selalu jadi tempat paling aman untuk kamu jadi diri sendiri.',
  '3': 'Satu permintaan dariku — tetaplah jadi orang yang sama hangatnya, di hari baik maupun yang berat.'
};

let giftsOpened = new Set();
const giftButtons = Array.from(document.querySelectorAll('.gift-box'));
const giftReveal = document.getElementById('giftReveal');
const giftRevealText = document.getElementById('giftRevealText');
const nextGiftBtn = document.getElementById('next-gift');

giftButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.gift;
    btn.classList.add('opened');
    btn.disabled = true;
    giftsOpened.add(id);

    giftReveal.hidden = false;
    giftRevealText.textContent = giftMessages[id];
    // re-trigger reveal animation
    giftReveal.style.animation = 'none';
    requestAnimationFrame(() => { giftReveal.style.animation = ''; });

    if (giftsOpened.size >= 1){
      nextGiftBtn.disabled = false;
    }
  });
});

function resetGifts(){
  giftsOpened.clear();
  giftButtons.forEach(b => { b.classList.remove('opened'); b.disabled = false; });
  giftReveal.hidden = true;
  nextGiftBtn.disabled = true;
}

// ============================================================
// GALLERY (placeholder cards — easy to swap for real photos)
// ============================================================
const galleryData = [
  { tag: 'Pertemuan', icon: '☕', img: 'images/foto1.jpg', note: 'Hari pertama kita ngobrol lama, dan waktu terasa lompat begitu saja.' },
  { tag: 'Tertawa', icon: '😂', img: 'images/foto2.jpg', note: 'Foto random yang bikin ketawa setiap kali dilihat ulang.' },
  { tag: 'Hari biasa', icon: '🍜', img: 'images/foto3.jpg', note: 'Bukan momen besar, tapi justru ini yang paling sering aku kangenin.' },
  { tag: 'Manis', icon: '🤍', img: 'images/foto4.jpg', note: 'Senyum yang selalu bikin harinya jadi lebih baik.' },
  { tag: 'Jalan-jalan', icon: '🗺️', img: 'images/foto5.jpg', note: 'Tempat random yang akhirnya jadi kenangan favorit.' },
  { tag: 'Sekarang', icon: '🎈', img: 'images/foto6.jpg', note: 'Dan ini — hari ini, ulang tahunmu. Selamat ulang tahun, sayang.' },
];

const galleryGrid = document.getElementById('galleryGrid');
const tilts = [-3, 2, -2, 3, -1.5, 2.5];

galleryData.forEach((item, i) => {
  const card = document.createElement('button');
  card.className = 'gallery-card';
  card.style.setProperty('--tilt', tilts[i % tilts.length] + 'deg');
  card.innerHTML = `
    <span class="ph-tag">${item.tag}</span>
    ${item.img ? `<img src="${item.img}" alt="${item.tag}" class="gallery-photo">` : `<span class="ph-icon">${item.icon}</span>`}
    <span class="ph-num">0${i + 1}</span>
  `;
  card.addEventListener('click', () => showGalleryNote(item, card));
  galleryGrid.appendChild(card);
});

let activeNote = null;
function showGalleryNote(item, card){
  if (activeNote) activeNote.remove();
  const note = document.createElement('div');
  note.className = 'gallery-note';
  note.textContent = item.note;
  card.insertAdjacentElement('afterend', note);
  // ensure it appears after the grid visually by appending to scene-inner if grid is multi-row
  galleryGrid.parentElement.insertBefore(note, galleryGrid.nextSibling);
  activeNote = note;
}

// ============================================================
// CONFETTI (canvas-based, lightweight)
// ============================================================
const canvas = document.getElementById('confettiCanvas');
const ctx = canvas.getContext('2d');
let confettiPieces = [];
let confettiRafId = null;

function resizeCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const confettiColors = ['#ffd9a0', '#f4a8c0', '#e07ba0', '#fff8f0', '#c95686'];

function launchConfetti(durationMs = 3200){
  const count = 140;
  confettiPieces = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.3,
    r: 4 + Math.random() * 5,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    vy: 2 + Math.random() * 3,
    vx: (Math.random() - 0.5) * 2,
    rotation: Math.random() * 360,
    vRot: (Math.random() - 0.5) * 8,
    shape: Math.random() > 0.5 ? 'rect' : 'circle'
  }));

  const startTime = performance.now();

  function frame(now){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let stillActive = false;
    const elapsed = now - startTime;

    confettiPieces.forEach(p => {
      p.y += p.vy;
      p.x += p.vx;
      p.rotation += p.vRot;
      if (p.y < canvas.height + 20) stillActive = true;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect'){
        ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    if (stillActive && elapsed < durationMs + 4000){
      confettiRafId = requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  cancelAnimationFrame(confettiRafId);
  confettiRafId = requestAnimationFrame(frame);
}

document.getElementById('btnCelebrate').addEventListener('click', () => {
  launchConfetti();
});
