const PRAYER_NAMES = {
    Fajr: 'الفجر',
    Sunrise: 'الشروق',
    Dhuhr: 'الظهر',
    Asr: 'العصر',
    Maghrib: 'المغرب',
    Isha: 'العشاء'
};

const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_ICONS = {
    Fajr: '🌙',
    Sunrise: '☀️',
    Dhuhr: '☀️',
    Asr: '🌤️',
    Maghrib: '🌙',
    Isha: '🌙'
};

const FALLBACK_TIMES = {
    'Jeddah': { Fajr: '05:15', Sunrise: '06:35', Dhuhr: '12:20', Asr: '15:45', Maghrib: '18:05', Isha: '19:35' },
    'Makkah': { Fajr: '05:10', Sunrise: '06:30', Dhuhr: '12:18', Asr: '15:43', Maghrib: '18:03', Isha: '19:33' },
    'Riyadh': { Fajr: '05:00', Sunrise: '06:20', Dhuhr: '12:10', Asr: '15:35', Maghrib: '17:55', Isha: '19:25' },
    'Madinah': { Fajr: '05:20', Sunrise: '06:40', Dhuhr: '12:25', Asr: '15:50', Maghrib: '18:10', Isha: '19:40' },
    'Dammam': { Fajr: '04:55', Sunrise: '06:15', Dhuhr: '12:05', Asr: '15:30', Maghrib: '17:50', Isha: '19:20' },
    'Cairo': { Fajr: '04:50', Sunrise: '06:10', Dhuhr: '12:00', Asr: '15:25', Maghrib: '17:45', Isha: '19:15' },
    'Dubai': { Fajr: '05:10', Sunrise: '06:30', Dhuhr: '12:20', Asr: '15:45', Maghrib: '18:05', Isha: '19:35' }
};

let prayerData = null;
let settings = {
    city: 'Jeddah',
    iqamahDurations: { Fajr: 25, Dhuhr: 20, Asr: 20, Maghrib: 10, Isha: 20 }
};
let mainInterval = null;

const dom = {
    syncStatusBar: document.getElementById('syncStatusBar'),
    syncStatus: document.getElementById('syncStatus'),
    lastSync: document.getElementById('lastSync'),
    syncBtn: document.getElementById('syncBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    currentTime: document.getElementById('currentTime'),
    currentDate: document.getElementById('currentDate'),
    nextPrayerCard: document.getElementById('nextPrayerCard'),
    currentCity: document.getElementById('currentCity'),
    nextPrayerName: document.getElementById('nextPrayerName'),
    nextPrayerTime: document.getElementById('nextPrayerTime'),
    hoursUntil: document.getElementById('hoursUntil'),
    minutesUntil: document.getElementById('minutesUntil'),
    prayersList: document.getElementById('prayersList'),
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    citySelect: document.getElementById('citySelect')
};

function formatTime12Hour(date) {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function calculatePrayerTimes() {
    const today = new Date();
    const cityTimes = FALLBACK_TIMES[settings.city] || FALLBACK_TIMES['Jeddah'];
    const adjustedData = {};

    for (const [key, timeStr] of Object.entries(cityTimes)) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const prayerDate = new Date(today);
        prayerDate.setHours(hours, minutes, 0, 0);

        adjustedData[key] = {
            time: prayerDate,
            formatted: formatTime12Hour(prayerDate)
        };
    }

    return adjustedData;
}

function renderPrayersList(currentPrayerName = null) {
    if (!prayerData) return;
    dom.prayersList.innerHTML = '';
    const displayOrder = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

    displayOrder.forEach(name => {
        const prayer = prayerData[name];
        if (!prayer) return;

        const iqamahDuration = settings.iqamahDurations[name] || 0;
        const iqamahTime = new Date(prayer.time.getTime() + iqamahDuration * 60 * 1000);

        const item = document.createElement('div');
        item.className = `prayer-item ${name === currentPrayerName ? 'active' : ''}`;
        item.innerHTML = `
            <div class="prayer-icon">${PRAYER_ICONS[name] || '🕌'}</div>
            <div class="prayer-info">
                <div class="prayer-item-name">${PRAYER_NAMES[name]}</div>
                <div class="prayer-times">
                    <span>الأذان: ${prayer.formatted}</span>
                    ${PRAYER_ORDER.includes(name) ? `<span>الإقامة: ${formatTime12Hour(iqamahTime)}</span>` : ''}
                </div>
            </div>
        `;
        dom.prayersList.appendChild(item);
    });
}

function updateMainClock(now) {
    dom.currentTime.textContent = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    dom.currentDate.textContent = now.toLocaleDateString('ar-SA-u-nu-latn', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function showNextPrayerCard(nextPrayer) {
    const now = new Date();
    const diff = nextPrayer.time.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    dom.nextPrayerName.textContent = PRAYER_NAMES[nextPrayer.name];
    dom.nextPrayerTime.textContent = nextPrayer.formatted;
    dom.hoursUntil.textContent = String(hours).padStart(2, '0');
    dom.minutesUntil.textContent = String(minutes).padStart(2, '0');
}

function tick() {
    const now = new Date();
    updateMainClock(now);

    if (!prayerData) return;

    let nextPrayer = null;
    const prayerTimesArray = Object.entries(prayerData)
        .filter(([name, data]) => PRAYER_ORDER.includes(name) && data && typeof data === 'object')
        .map(([name, data]) => ({ name, time: data.time, formatted: data.formatted }))
        .sort((a, b) => a.time.getTime() - b.time.getTime());

    for (const prayer of prayerTimesArray) {
        if (prayer.time > now && !nextPrayer) {
            nextPrayer = prayer;
            break;
        }
    }

    if (!nextPrayer && prayerTimesArray.length > 0) {
        const fajrTomorrowTime = new Date(prayerTimesArray[0].time);
        fajrTomorrowTime.setDate(fajrTomorrowTime.getDate() + 1);
        nextPrayer = {
            name: prayerTimesArray[0].name,
            time: fajrTomorrowTime,
            formatted: prayerTimesArray[0].formatted
        };
    }

    if (nextPrayer) {
        showNextPrayerCard(nextPrayer);
        renderPrayersList();
    }
}

async function syncPrayerTimes() {
    const selectedCityText = dom.citySelect.options[dom.citySelect.selectedIndex].text;
    dom.syncStatus.innerHTML = `<div class="loading-spinner"></div> <span>جاري التحميل...</span>`;

    try {
        const cityInfo = {
            'Jeddah': { city: 'Jeddah', country: 'Saudi Arabia', method: 4 },
            'Makkah': { city: 'Makkah', country: 'Saudi Arabia', method: 4 },
            'Riyadh': { city: 'Riyadh', country: 'Saudi Arabia', method: 4 },
            'Madinah': { city: 'Medina', country: 'Saudi Arabia', method: 4 },
            'Dammam': { city: 'Dammam', country: 'Saudi Arabia', method: 4 },
            'Cairo': { city: 'Cairo', country: 'Egypt', method: 5 },
            'Dubai': { city: 'Dubai', country: 'United Arab Emirates', method: 3 }
        }[settings.city];

        const now = new Date();
        const url = `https://api.aladhan.com/v1/timingsByCity/${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}?city=${cityInfo.city}&country=${encodeURIComponent(cityInfo.country)}&method=${cityInfo.method}`;

        const response = await fetch(url);
        const json = await response.json();

        if (json.code === 200 && json.data && json.data.timings) {
            const adjustedData = {};
            const gregorianDate = json.data.date.gregorian.date.split('-').reverse().join('-');

            for (const key of Object.keys(PRAYER_NAMES)) {
                if (json.data.timings[key]) {
                    const time = json.data.timings[key].split(' ')[0];
                    const dateStr = `${gregorianDate}T${time}:00`;
                    const baseDate = new Date(dateStr);
                    adjustedData[key] = { time: baseDate, formatted: formatTime12Hour(baseDate) };
                }
            }

            prayerData = adjustedData;
            dom.syncStatus.innerHTML = `<span>✓</span> <span>تم التحديث من الإنترنت</span>`;
        } else {
            throw new Error('API response invalid');
        }
    } catch (e) {
        console.log('Using fallback times:', e);
        prayerData = calculatePrayerTimes();
        dom.syncStatusBar.classList.add('error');
        dom.syncStatus.innerHTML = `<span>!</span> <span>أوقات تقريبية</span>`;
        setTimeout(() => {
            dom.syncStatusBar.classList.remove('error');
            dom.syncStatus.innerHTML = `<span>✓</span> <span>وضع محلي</span>`;
        }, 3000);
    }

    if (dom.currentCity) dom.currentCity.textContent = selectedCityText;
    dom.lastSync.textContent = formatTime12Hour(new Date());
    tick();
}

function openSettings() {
    dom.citySelect.value = settings.city;
    dom.settingsModal.classList.add('active');
}

function closeSettings() {
    dom.settingsModal.classList.remove('active');
}

function saveSettings() {
    const oldCity = settings.city;
    settings.city = dom.citySelect.value;
    localStorage.setItem('settings', JSON.stringify(settings));
    closeSettings();
    if (settings.city !== oldCity) syncPrayerTimes();
}

async function init() {
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        settings.city = parsed.city || 'Jeddah';
    }

    dom.citySelect.value = settings.city;
    if (dom.currentCity) {
        const currentCityName = dom.citySelect.options[dom.citySelect.selectedIndex].text;
        dom.currentCity.textContent = currentCityName;
    }

    await syncPrayerTimes();

    renderPrayersList();
    tick();
    mainInterval = setInterval(tick, 1000);

    dom.syncBtn.addEventListener('click', syncPrayerTimes);
    dom.settingsBtn.addEventListener('click', openSettings);
    dom.closeSettingsBtn.addEventListener('click', closeSettings);
    dom.saveSettingsBtn.addEventListener('click', saveSettings);
}

document.addEventListener('DOMContentLoaded', init);
