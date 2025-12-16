class CityGame {
    constructor() {
        // Основные свойства игры
        this.currentLang = 'ru';
        this.player = null;
        this.leaderboard = null;
        this._isKeyboardOpen = false;
        
        // Игровое состояние
        this.cities = {};
        this.lives = 3;
        this.score = 0;
        this.timeLeft = 30;
        this.usedCities = [];
        this.currentCountry = null;
        this.currentLetter = null;
        this.isPaused = false;
        
        // Таймеры и обработчики
        this.timerInterval = null;
        this._resizeHandler = null;
        this._vv = null;
        this.lastLoginDate = null;
        
        this.initElements();
        this.loadGame();
        this.setupEventListeners();
        
    }

    initElements() {
        this.elements = {
            countryScreen: document.getElementById('country-screen'),
            gameScreen: document.getElementById('game-screen'),
            endScreen: document.getElementById('end-screen'),
            countriesContainer: document.getElementById('countries-container'),
            livesDisplay: document.getElementById('lives'),
            scoreDisplay: document.getElementById('score'),
            timerDisplay: document.getElementById('timer'),
            cityInput: document.getElementById('city-input'),
            submitBtn: document.getElementById('submit-btn'),
            lastCityDisplay: document.getElementById('last-city'),
            currentLetterDisplay: document.getElementById('current-letter'),
            countryFlag: document.getElementById('country-flag'),
            countryName: document.getElementById('country-name'),
            progressBar: document.getElementById('progress-bar'),
            notification: document.getElementById('notification'),
            menuBtn: document.getElementById('menu-btn'),
            langButtons: document.querySelectorAll('.lang-btn')
        };
    }
    
    async loadGame() {
        await this.loadCities();
        this.loadProgress();
        this.updateUI();
        this.showScreen('country');
    }
    
    async loadCities() {
        try {
            const response = await fetch('cities.json');
            this.cities = await response.json();
            this.renderCountryCards();
        } catch (error) {
            console.error("Ошибка загрузки городов:", error);
            this.showNotification("Ошибка загрузки данных");
        }
    }
    
    renderCountryCards() {
        this.elements.countriesContainer.innerHTML = '';
        
        Object.keys(this.cities).forEach(country => {
            const countryData = this.cities[country];
            const card = document.createElement('div');
            card.className = 'country-card';
            card.innerHTML = `
                <img src="flags/${countryData.flag}.svg" alt="${country}">
                <h3>${translations[this.currentLang]?.countries?.[country] || country}</h3>
                <small>${countryData.cities[this.currentLang]?.length || 0} ${translations[this.currentLang]?.cities || 'городов'}</small>
            `;
            
            card.addEventListener('click', () => {                
                this.selectCountry(country);
            });
            this.elements.countriesContainer.appendChild(card);
        });
    }
    
    selectCountry(country) {
        const nameInput = document.getElementById('name');
        const playerName = nameInput.value.trim();
        const playerNameElement = document.getElementById('player-name');
        const playerAvatarElement = document.getElementById('player-avatar');
    
        if (playerName === '') {
            playerNameElement.textContent = 'Игрок';
        } else {
            playerNameElement.textContent = playerName;
        }

        this.lives = 3;
        this.currentCountry = country;
        this.elements.countryName.textContent = translations[this.currentLang]?.countries?.[country] || country;
        this.elements.countryFlag.src = `flags/${this.cities[country].flag}.svg`;

        playerAvatarElement.src = 'avatar.png';
        document.getElementById('player-avatar').style.display = 'block';

        this.startGame();
        this.showScreen('game');
        this.loadLeaderboard(playerName);
    }
    
    startGame() {
        this.score = 0;
        this.usedCities = [];
        this.nextCity();
        this.updateUI();
    }
    
    nextCity() {
        this.clearTimer();
        
        const cities = this.getAvailableCities();
        if (cities.length === 0) {
            this.endGame(true);
            return;
        }
        
        if (this.usedCities.length === 0) {
            const city = cities[Math.floor(Math.random() * cities.length)];
            this.processComputerMove(city);
            return;
        }
        
        this.startTimer();
    }
    
    processComputerMove(city) {
        this.usedCities.push(city.toLowerCase());
        this.elements.lastCityDisplay.textContent = `${translations[this.currentLang]?.computer_named || "Компьютер назвал"}: ${city}`;
        this.currentLetter = this.getLastLetter(city);
        this.elements.currentLetterDisplay.textContent = this.currentLetter.toUpperCase();
        this.startTimer();
    }
    
    getLastLetter(city) {
        let lastLetter = city.slice(-1).toLowerCase();
        if (['ь', 'ъ', 'ы', 'й'].includes(lastLetter)) {
            lastLetter = city.slice(-2, -1).toLowerCase();
            if (['ь', 'ъ', 'ы', 'й'].includes(lastLetter)) {
                lastLetter = city.slice(-3, -2).toLowerCase();
            }
        }
        return lastLetter;
    }
    
    getAvailableCities() {
        const countryData = this.cities[this.currentCountry];
        if (!countryData) return [];
        
        const cities = countryData.cities[this.currentLang] || countryData.cities['ru'] || [];
        return cities.filter(city => {
            const lowerCity = city.toLowerCase();
            return !this.usedCities.includes(lowerCity) && 
                   (!this.currentLetter || lowerCity.startsWith(this.currentLetter));
        });
    }
    
    startTimer() {
        this.clearTimer();
        this.isPaused = false;
        this.timeLeft = 30;

        this.updateTimer();
        
        this.timerInterval = window.setInterval(() => {
            if (!this.isPaused) {
                this.timeLeft--;
                this.updateTimer();
                if (this.timeLeft <= 0) {
                    this.loseLife();
                }
            }
        }, 1000);
    }

    clearTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    updateTimer() {
        this.elements.timerDisplay.textContent = this.timeLeft;
        this.elements.progressBar.style.width = `${(this.timeLeft / 30) * 100}%`;
        
        if (this.timeLeft <= 5) {
            this.elements.timerDisplay.classList.add('warning');
        } else {
            this.elements.timerDisplay.classList.remove('warning');
        }
    }
    
    handleSubmit() {
        const city = this.elements.cityInput.value.trim();
        if (this.validateCity(city)) {
            this.processPlayerMove(city);
        } else {
            this.loseLife();
        }
    }
    
    validateCity(city) {
        if (!city) {
            this.showNotification(translations[this.currentLang]?.enter_city || "Введите город");
            return false;
        }
        
        const countryData = this.cities[this.currentCountry];
        if (!countryData) {
            this.showNotification("Ошибка данных страны");
            return false;
        }
        
        const cities = countryData.cities[this.currentLang] || countryData.cities['ru'] || [];
        const lowerCity = city.toLowerCase();
        
        if (!cities.some(c => c.toLowerCase() === lowerCity)) {
            this.showNotification(translations[this.currentLang]?.invalid_city || "Такого города нет в этой стране");
            return false;
        }
        
        if (this.usedCities.includes(lowerCity)) {
            this.showNotification(translations[this.currentLang]?.city_used || "Город уже был использован");
            return false;
        }
        
        if (this.currentLetter && !lowerCity.startsWith(this.currentLetter)) {
            this.showNotification(`${translations[this.currentLang]?.must_start_with || "Должен начинаться с"} "${this.currentLetter.toUpperCase()}"`);
            return false;
        }
        
        return true;
    }
    
    processPlayerMove(city) {
        this.usedCities.push(city.toLowerCase());
        this.elements.lastCityDisplay.textContent = `${translations[this.currentLang]?.you_named || "Вы назвали"}: ${city}`;
        this.currentLetter = this.getLastLetter(city);
        this.elements.currentLetterDisplay.textContent = this.currentLetter.toUpperCase();
        this.elements.cityInput.value = '';
        this.score += 10;
        
        setTimeout(() => {
            this.computerMove();
        }, 1500);
        
        this.updateUI();
        this.clearTimer();
    }
    
    computerMove() {
        const cities = this.getAvailableCities();
        if (cities.length > 0) {
            const city = cities[Math.floor(Math.random() * cities.length)];
            this.processComputerMove(city);
        } else {
            this.showNotification(translations[this.currentLang]?.computer_no_city || "У компьютера нет подходящих городов");
            this.endGame(true);
        }
        
        this.updateUI();
    }
    
    loseLife() {
        this.clearTimer();
        this.lives--;
        
        if (this.lives <= 0) {
            this.endGame(false);
        } else {
            this.showNotification(translations[this.currentLang]?.lost_life || "Потеряна жизнь");
            this.timeLeft = 30;
            this.startTimer();
        }
        
        this.updateUI();
        this.saveProgress();
    }
    
    async endGame(isWin) {
        this.clearTimer();
        this.showScreen('end');
        
        const resultTitle = document.getElementById('result-title');
        const finalScore = document.getElementById('final_score');
        
        if (resultTitle) {
            resultTitle.textContent = isWin 
                ? (translations[this.currentLang]?.you_win || "Вы выиграли!") 
                : (translations[this.currentLang]?.game_over || "Игра окончена");
        }
        
        if (finalScore) {
            finalScore.textContent = this.score;
        }
        
        if (this.score > 0) {
            await this.submitScore(this.score);
        }
        
        this.saveProgress();
        
        // Загружаем таблицу лидеров
        this.loadLeaderboard(playerName);
    }
    
    async submitScore(score) {
        // Заглушка для отправки счета
        console.log("Счет отправлен:", score);
        // Здесь будет реализация отправки на сервер
        return Promise.resolve();
    }
    
    async loadLeaderboard(player) {
        const leaderboardElement = document.getElementById('leaderboard');
        if (!leaderboardElement) return;
        
        // Заглушка для загрузки таблицы лидеров
        const leaderboardData = [
            { name: player, score: this.score },
            { name: 'Игрок 2', score: 150 },
            { name: 'Игрок 3', score: 120 },
            { name: 'Игрок 4', score: 90 },
            { name: 'Игрок 5', score: 75 }
        ];
        
        leaderboardElement.innerHTML = '';
        leaderboardData.forEach((player, index) => {
            const entry = document.createElement('div');
            entry.className = 'leaderboard-entry';
            entry.innerHTML = `
                <span class="leaderboard-position">${index + 1}</span>
                <span class="leaderboard-name">${player.name}</span>
                <span class="leaderboard-score">${player.score}</span>
            `;
            leaderboardElement.appendChild(entry);
        });
    }
    
    saveProgress() {
        const progress = {
            score: this.score,
            lives: this.lives,
            lastLogin: new Date().toISOString()
        };
        
        localStorage.setItem('cities_game_progress', JSON.stringify(progress));
    }
    
    loadProgress() {
        const progress = JSON.parse(localStorage.getItem('cities_game_progress'));
        if (progress) {
            this.score = progress.score || 0;
            this.lives = progress.lives || 3;
            this.lastLoginDate = progress.lastLogin ? new Date(progress.lastLogin) : null;
            this.checkDailyLifeReset();
        }
    }
    
    checkDailyLifeReset() {
        if (!this.lastLoginDate) {
            this.lives = 3;
            this.lastLoginDate = new Date();
            return;
        }
        
        const today = new Date();
        const lastLogin = new Date(this.lastLoginDate);
        
        // Сброс жизней, если прошло больше 24 часов
        if (today.getTime() - lastLogin.getTime() > 24 * 60 * 60 * 1000) {
            this.lives = 3;
            this.lastLoginDate = today;
        }
    }
    
    showScreen(screen) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const el = document.getElementById(`${screen}-screen`);
        if (!el) return;
        
        el.classList.add('active');
        
        // Удаляем старый обработчик
        if (this._resizeHandler && window.visualViewport) {
            window.visualViewport.removeEventListener('resize', this._resizeHandler);
        }
        
        // Настраиваем размеры экрана
        const updateSize = () => {
            const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
            el.style.height = `${viewportHeight}px`;
            
            // Для игрового экрана настраиваем layout
            if (screen === 'game') {
                this.layoutGameScreenToViewport();
            }
        };
        
        this._resizeHandler = updateSize;
        
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updateSize);
        }
        
        updateSize();
        
        if (screen === 'game') {
            this.bindViewportHandlers();
        } else {
            this.unbindViewportHandlers();
        }
    }
    
    layoutGameScreenToViewport() {
        const gameScreen = this.elements?.gameScreen;
        if (!gameScreen || !gameScreen.classList.contains('active')) return;
      
        const viewportH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        gameScreen.style.height = `${viewportH}px`;
      
        const header = gameScreen.querySelector('.game-header');
        const progress = gameScreen.querySelector('.progress-bar');
        const content = gameScreen.querySelector('.game-content');
      
        if (!header || !progress || !content) return;
      
        const headerH = header.getBoundingClientRect().height;
        const progressH = progress.getBoundingClientRect().height;
      
        const style = getComputedStyle(gameScreen);
        const padTop = parseFloat(style.paddingTop) || 0;
        const padBottom = parseFloat(style.paddingBottom) || 0;
      
        const available = viewportH - headerH - progressH - padTop - padBottom;
        const target = Math.max(available, 0);
        
        content.style.height = `${target}px`;
        content.style.overflow = 'hidden';
      
        const isKeyboard = viewportH < window.innerHeight * 0.85;
        if (isKeyboard !== this._isKeyboardOpen) {
            this._isKeyboardOpen = isKeyboard;
            document.body.classList.toggle('keyboard-open', isKeyboard);
        }
    }
    
    bindViewportHandlers() {
        const rerender = () => {
            this.layoutGameScreenToViewport();
        };
        
        rerender();
        
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', rerender);
            window.visualViewport.addEventListener('scroll', rerender);
        }
        
        window.addEventListener('resize', rerender);
        
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach((inp) => {
            inp.addEventListener('focus', rerender, { passive: true });
            inp.addEventListener('blur', rerender, { passive: true });
        });
        
        this._vv = { rerender };
    }
    
    unbindViewportHandlers() {
        if (this._vv?.rerender) {
            const rerender = this._vv.rerender;
            
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', rerender);
                window.visualViewport.removeEventListener('scroll', rerender);
            }
            
            window.removeEventListener('resize', rerender);
            
            const inputs = document.querySelectorAll('input, textarea');
            inputs.forEach((inp) => {
                inp.removeEventListener('focus', rerender);
                inp.removeEventListener('blur', rerender);
            });
        }
    }
    
    showNotification(message) {
        this.elements.notification.textContent = message;
        this.elements.notification.classList.add('show');
        
        setTimeout(() => {
            this.elements.notification.classList.remove('show');
        }, 3000);
    }
    
    updateUI() {
        this.elements.scoreDisplay.textContent = this.score;
        this.elements.livesDisplay.innerHTML = '❤️'.repeat(this.lives);
        
        if (this.elements.timerDisplay) {
            if (this.isPaused) {
                this.elements.timerDisplay.classList.add('timer-paused');
            } else {
                this.elements.timerDisplay.classList.remove('timer-paused');
            }
        }
    }
    
    setupEventListeners() {
        // Предотвращение двойного тапа
        let lastTouchTime = 0;
        document.addEventListener('touchend', function(event) {
            const now = new Date().getTime();
            if (now - lastTouchTime <= 300) {
                event.preventDefault();
            }
            lastTouchTime = now;
        }, { passive: false });
        
        // Предотвращение контекстного меню
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            return false;
        });
        
        // Предотвращение выделения текста (кроме инпутов)
        document.addEventListener('selectstart', function(e) {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                return false;
            }
        });
        
        // Обработчики игровых элементов
        this.elements.submitBtn.addEventListener('click', () => this.handleSubmit());
        this.elements.cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSubmit();
        });
        
        this.elements.menuBtn.addEventListener('click', () => {
            this.showScreen('country');
        });
        
        this.elements.langButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentLang = btn.dataset.lang;
                this.updateTranslations();
                this.renderCountryCards();
            });
        });
        
        this.elements.cityInput.addEventListener('focus', () => {
            setTimeout(() => window.scrollTo(0, 0), 0);
        });
        
        document.getElementById('back-to-country-btn').addEventListener('click', () => {
            this.pauseTimer();
            document.getElementById('confirm-modal').style.display = 'flex';
        });
        
        document.getElementById('cancel-leave').addEventListener('click', () => {
            document.getElementById('confirm-modal').style.display = 'none';
            this.resumeTimer();
        });
        
        document.getElementById('confirm-leave').addEventListener('click', () => {
            this.resetGame();
            document.getElementById('confirm-modal').style.display = 'none';
            this.showScreen('country');
        });
    }
    
    updateTranslations() {
        if (!translations || !translations[this.currentLang]) {
            console.warn("Переводы не найдены для языка:", this.currentLang);
            return;
        }
        
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[this.currentLang][key]) {
                el.textContent = translations[this.currentLang][key];
            }
        });
        
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (translations[this.currentLang][key]) {
                el.placeholder = translations[this.currentLang][key];
            }
        });
    }
    
    pauseTimer() {
        this.isPaused = true;
        this.updateUI();
    }
    
    resumeTimer() {
        this.isPaused = false;
        this.updateUI();
    }
    
    resetGame() {
        this.clearTimer();
        this.score = 0;
        this.isPaused = false;
        this.usedCities = [];
        this.currentLetter = null;
        this.currentCountry = null;
        this.elements.cityInput.value = '';
        this.updateUI();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new CityGame();
});