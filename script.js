const root = document.documentElement;
const colorScheme = matchMedia('(prefers-color-scheme: dark)');

const themeIsDark = () =>
  root.dataset.theme ? root.dataset.theme === 'dark' : colorScheme.matches;
const themeToggle = document.querySelector('.theme-toggle');
const phones = [...document.querySelectorAll('.hero-phones .phone[data-cycle]')];
const labels = {
  'line-detail': 'Line map', 'lines': 'All lines', 'nearby-stops': 'Nearby stops',
  'arrivals': 'Live arrivals', 'timetable': 'Timetable', 'settings': 'Settings',
};

function updateThemeControl() {
  const dark = themeIsDark();
  root.style.colorScheme = dark ? 'dark' : 'light';
  themeToggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  themeToggle.setAttribute('aria-pressed', String(dark));
  themeToggle.title = `Switch to ${dark ? 'light' : 'dark'} theme`;
}

function toggleTheme() {
  const current = themeIsDark() ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('astiko-theme', next); } catch (_) {}
  updateThemeControl();
  applyThemeToPhones();
}

function setPhoneMeta(phone, name) {
  const label = labels[name] ?? name;
  phone.parentElement.querySelector('.phone-label').textContent = label;
  phone.setAttribute('aria-label', `${label}. Tap to show the next screen.`);
}

function loadImage(image, src) {
  return new Promise(resolve => {
    let settled = false;
    const done = () => {
      if (!settled) { settled = true; resolve(); }
    };
    image.onload = done;
    image.onerror = done;
    image.src = src;
    if (image.complete) done();
    else if (image.decode) image.decode().then(done, done);
  });
}

function switchPhone(phone, name) {
  const theme = themeIsDark() ? 'dark' : 'light';
  const imgs = phone.querySelectorAll(`img[data-theme="${theme}"]`);
  const front = phone._front ?? 0;
  const backIndex = 1 - front;
  const shown = imgs[front];
  const buffer = imgs[backIndex];
  const request = (phone._request ?? 0) + 1;
  phone._request = request;
  buffer.alt = labels[name] ?? name;
  setPhoneMeta(phone, name);

  return loadImage(buffer, `screenshots/${theme}/${name}.webp`).then(() => {
    if (request !== phone._request) return;
    buffer.classList.add('shown');
    shown.classList.remove('shown');
    phone._front = backIndex;
  });
}

function applyThemeToPhones() {
  phones.forEach(phone => {
    const shots = phone.dataset.cycle.split(',');
    switchPhone(phone, shots[phone._index ?? 0]);
  });
}

function advancePhone(phone) {
  if (phone._busy) return;
  const shots = phone.dataset.cycle.split(',');
  const next = ((phone._index ?? 0) + 1) % shots.length;
  phone._index = next;
  phone._busy = true;
  switchPhone(phone, shots[next]).finally(() => { phone._busy = false; });
}

themeToggle.addEventListener('click', toggleTheme);
phones.forEach(phone => {
  phone._index = 0;
  setPhoneMeta(phone, phone.dataset.cycle.split(',')[0]);
  phone.addEventListener('click', () => advancePhone(phone));
  phone.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      advancePhone(phone);
    }
  });
});

updateThemeControl();
applyThemeToPhones();
colorScheme.addEventListener('change', () => {
  if (!root.dataset.theme) {
    updateThemeControl();
    applyThemeToPhones();
  }
});
